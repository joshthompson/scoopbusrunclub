/**
 * Decides what we actually got back.
 *
 * Rather than pattern-matching bot-check pages (which change), the test is
 * whether the repo's own parsers can read the page. If they can, it's the real
 * thing; if they can't and the status looks like a block, the user needs to
 * solve something. That way a redesigned challenge page still lands in the right
 * state, and a redesigned *parkrun* page fails loudly instead of silently
 * ingesting nothing.
 */
import {
	parseEventPageMeta,
	parseLargestClubs,
	parseRunResults,
	parseRunnerData,
} from '@shared/parkrun-parsers'
import type { CaptureKind } from '@shared/scraper-protocol'

export type Verdict =
	/** The page parsed — capture it. */
	| { outcome: 'ok'; detail: string }
	/**
	 * A bot check or a wobble. Retryable, and retried automatically.
	 *
	 * `awaitUser` marks the ones with something on screen for a human to solve —
	 * those must never be reloaded from under them, and must never time out.
	 */
	| { outcome: 'blocked'; detail: string; awaitUser?: boolean }
	/** Loaded fine but isn't what we asked for, or parkrun changed shape. */
	| { outcome: 'unusable'; detail: string }

/**
 * Fingerprints of an interactive challenge — something a person has to click
 * through, as opposed to a transient error.
 *
 * parkrun's image captcha ("Let's confirm you are human — choose all the
 * clocks") arrives as HTTP 405, so the status alone tells you nothing useful.
 */
const CHALLENGE_MARKERS = [
	'/cdn-cgi/challenge-platform',
	'confirm you are human',
	'verify you are human',
	'are you a robot',
	'captcha',
	'turnstile',
	'cf_chl',
	'cf-challenge',
	'checking your browser',
	'just a moment',
]

function looksLikeChallenge(html: string): boolean {
	const haystack = html.slice(0, 200_000).toLowerCase()
	return CHALLENGE_MARKERS.some((marker) => haystack.includes(marker))
}

export function validate(
	kind: CaptureKind,
	key: string,
	status: number,
	html: string,
): Verdict {
	// Any error status is treated as retryable rather than fatal. Bot checks come
	// back with all sorts — 403, 405, 429, 503 — and failing an item outright on
	// one throws away a page the user could have unlocked in two clicks. The
	// attempt limit stops this looping forever, and Skip is always available.
	if (status >= 400) {
		const challenge = looksLikeChallenge(html)
		return {
			outcome: 'blocked',
			awaitUser: challenge,
			detail: challenge
				? `parkrun replied ${status} and is asking you to prove you're human — solve it in the scrape tab and the run carries on.`
				: `parkrun replied ${status} — retrying.`,
		}
	}

	// A 200 can still be a challenge page.
	if (looksLikeChallenge(html) && !parsesAsRealPage(kind, key, html)) {
		return {
			outcome: 'blocked',
			awaitUser: true,
			detail:
				"parkrun is asking you to prove you're human — solve it in the scrape tab and the run carries on.",
		}
	}

	switch (kind) {
		case 'athlete':
			return validateAthlete(key, html)
		case 'event':
			return validateEvent(key, html)
		case 'clubs':
			return validateClubs(html)
		case 'course':
			return validateCourse(html)
	}
}

/**
 * Whether the page is genuinely the one we asked for. Used to stop a challenge
 * marker in, say, an analytics snippet from rejecting a perfectly good page.
 */
function parsesAsRealPage(
	kind: CaptureKind,
	key: string,
	html: string,
): boolean {
	switch (kind) {
		case 'athlete':
			return parseRunResults(html).length > 0
		case 'event':
			return parseEventPageMeta(html).eventNumber > 0
		case 'clubs':
			return parseLargestClubs(html).length > 0
		case 'course':
			return extractMapMid(html) !== null
	}
}

function validateAthlete(parkrunId: string, html: string): Verdict {
	const runner = parseRunnerData(html)
	const results = parseRunResults(html)

	if (runner.name === 'Unknown' && results.length === 0) {
		return {
			outcome: 'blocked',
			detail: "Couldn't read the page — it may be a bot check. Retrying.",
		}
	}
	if (runner.parkrunId && runner.parkrunId !== parkrunId) {
		return {
			outcome: 'unusable',
			detail: `Page is for athlete ${runner.parkrunId}, expected ${parkrunId}.`,
		}
	}
	if (results.length === 0) {
		return { outcome: 'unusable', detail: 'No run results found on the page.' }
	}

	return {
		outcome: 'ok',
		detail: `${runner.name} · ${results.length} results`,
	}
}

function validateEvent(eventId: string, html: string): Verdict {
	const meta = parseEventPageMeta(html)

	if (!meta.eventNumber || !meta.date) {
		return {
			outcome: 'blocked',
			detail: "Couldn't read the event number or date — it may be a bot check.",
		}
	}
	if (meta.eventId && meta.eventId !== eventId) {
		return {
			outcome: 'unusable',
			detail: `Page is for "${meta.eventId}", expected "${eventId}".`,
		}
	}

	// Volunteer counts aren't checked: an event where nobody we track volunteered
	// is a perfectly good capture. The page decides what's in it.
	return { outcome: 'ok', detail: `#${meta.eventNumber} · ${meta.date}` }
}

function validateClubs(html: string): Verdict {
	const clubs = parseLargestClubs(html)
	if (clubs.length === 0) {
		return {
			outcome: 'blocked',
			detail: "Couldn't read the league table — it may be a bot check.",
		}
	}
	return { outcome: 'ok', detail: `${clubs.length} clubs` }
}

/**
 * Course pages are validated by finding the Google map, since that's the only
 * part we use. Same regex as apps/api/lib/map-scraper.ts.
 */
export function extractMapMid(html: string): string | null {
	const match = html.match(
		/src="https:\/\/www\.google\.com\/maps\/d\/[^"]*?[?&]mid=([^&"]+)/,
	)
	return match ? match[1] : null
}

function validateCourse(html: string): Verdict {
	if (extractMapMid(html)) {
		return { outcome: 'ok', detail: 'Found the embedded map' }
	}
	// A bot check has no map either — but neither does a course page without one,
	// which is a real and permanent condition. Distinguish on page shape.
	const looksLikeParkrun = /parkrun/i.test(html) && html.length > 20_000
	return looksLikeParkrun
		? {
				outcome: 'unusable',
				detail: 'No Google map embedded on this course page.',
			}
		: {
				outcome: 'blocked',
				detail: "Couldn't read the course page — it may be a bot check.",
			}
}
