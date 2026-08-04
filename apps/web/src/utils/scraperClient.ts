/**
 * The admin page's side of the results-scraper extension protocol.
 *
 * The extension is optional: with it absent, nothing here does anything and the
 * page falls back to explaining how to install it, with the advanced upload form
 * as the alternative.
 *
 * Messages go via window.postMessage, picked up by the extension's bridge
 * content script. That avoids the page needing to know the extension's ID, which
 * for an unpacked extension depends on where it was installed from.
 */
import { PARKRUN_EVENTS } from '@shared/parkrun-events'
import {
	LARGEST_CLUBS_URL,
	athletePageUrl,
	latestResultsUrl,
} from '@shared/parkrun-urls'
import {
	CLUBS_KEY,
	type CapturedFile,
	type ExtensionMessage,
	type RunRequest,
	type RunState,
	type WorkItem,
	readExtensionMessage,
	wrapForExtension,
} from '@shared/scraper-protocol'
import { TRACKED_ATHLETES } from '@shared/tracked-athletes'

/** How long to wait for the extension to answer a ping before deciding it's absent. */
const HANDSHAKE_TIMEOUT_MS = 1500

export interface ScraperEvents {
	onState: (state: RunState) => void
	onFile: (file: CapturedFile) => void
	onFinished: (state: RunState) => void
}

/**
 * Listen for extension messages. Returns a teardown function.
 *
 * `onHello` fires when the extension announces itself, which is what enables the
 * Scrape button — and it carries current run state, so reloading the page during
 * a run picks the progress panel straight back up.
 */
export function listenToScraper(
	events: ScraperEvents & { onHello: (state: RunState) => void },
): () => void {
	const handler = (event: MessageEvent) => {
		if (event.source !== window) return
		const message = readExtensionMessage(event.data)
		if (!message) return

		switch (message.type) {
			case 'hello':
				events.onHello(message.state)
				break
			case 'state':
				events.onState(message.state)
				break
			case 'file':
				events.onFile(message.file)
				break
			case 'finished':
				events.onFinished(message.state)
				break
		}
	}

	window.addEventListener('message', handler)
	return () => window.removeEventListener('message', handler)
}

/**
 * Ask whether the extension is installed.
 *
 * The bridge announces itself unprompted on page load, but that can land before
 * the page starts listening, so we also ping and wait briefly.
 */
export function pingScraper(): Promise<RunState | null> {
	return new Promise((resolve) => {
		let settled = false

		const handler = (event: MessageEvent) => {
			if (event.source !== window) return
			const message = readExtensionMessage(event.data)
			if (message?.type !== 'hello') return
			finish(message.state)
		}

		const finish = (state: RunState | null) => {
			if (settled) return
			settled = true
			window.removeEventListener('message', handler)
			clearTimeout(timer)
			resolve(state)
		}

		window.addEventListener('message', handler)
		const timer = setTimeout(() => finish(null), HANDSHAKE_TIMEOUT_MS)
		post({ type: 'ping' })
	})
}

export function startScrape(request: RunRequest): void {
	post({ type: 'start', request })
}

export function cancelScrape(): void {
	post({ type: 'cancel' })
}

/**
 * Pick an interrupted run back up. Pages already captured are kept — only the
 * ones that never landed get fetched again.
 */
export function resumeScrape(): void {
	post({ type: 'resume' })
}

/** Reload the page the run is stuck on. */
export function retryScrape(): void {
	post({ type: 'retry' })
}

/** Abandon the stuck page and carry on. */
export function skipScrapeItem(): void {
	post({ type: 'skip' })
}

/** Ask for every file captured so far — used after a page reload mid-run. */
export function resendScrapedFiles(): void {
	post({ type: 'resend' })
}

/** Throw the run away once its data has been uploaded. */
export function clearScrape(): void {
	post({ type: 'clear' })
}

function post(message: Parameters<typeof wrapForExtension>[0]): void {
	window.postMessage(wrapForExtension(message), window.location.origin)
}

// ── Building the work list ──────────────────────────────────────────

/**
 * Every page the extension should visit, in the order it should visit them.
 *
 * Athlete pages come first because they're what reveals which events exist, and
 * therefore which course maps are missing — the extension appends those to the
 * queue itself once it has parsed them.
 */
export function buildWorkList(options: {
	/** Slot keys the user has already ticked Skip on. */
	skipKeys: Set<string>
	/** Display names by eventId, for nicer labels. */
	eventNames: Map<string, string>
}): WorkItem[] {
	const items: WorkItem[] = []

	for (const athlete of TRACKED_ATHLETES) {
		if (options.skipKeys.has(athlete.parkrunId)) continue
		items.push({
			kind: 'athlete',
			key: athlete.parkrunId,
			label: athlete.name,
			url: athletePageUrl(athlete.parkrunId),
		})
	}

	for (const event of PARKRUN_EVENTS) {
		if (options.skipKeys.has(event.eventId)) continue
		const name = options.eventNames.get(event.eventId) ?? event.eventId
		items.push({
			kind: 'event',
			key: event.eventId,
			label: `${name} Full Results`,
			url: latestResultsUrl(event.baseUrl),
		})
	}

	if (!options.skipKeys.has(CLUBS_KEY)) {
		items.push({
			kind: 'clubs',
			key: CLUBS_KEY,
			label: 'Largest Clubs Page',
			url: LARGEST_CLUBS_URL,
		})
	}

	return items
}

/** Turn a delivered capture back into a File, so the form can treat it normally. */
export function capturedFileToFile(captured: CapturedFile): File {
	if (captured.base64 !== undefined) {
		const binary = atob(captured.base64)
		const bytes = new Uint8Array(binary.length)
		for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
		return new File([bytes], captured.name)
	}
	return new File([captured.text ?? ''], captured.name, { type: 'text/html' })
}
