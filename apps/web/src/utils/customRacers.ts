import type { CharacterSpriteProps } from './createRunnerFrames'

const CONVEX_URL = (import.meta.env.VITE_CONVEX_URL as string) || ''

/** Kept in step with `MAX_NAME_LENGTH` in the Convex module, which re-checks it. */
export const MAX_RACER_NAME_LENGTH = 20

/** Kept in step with `MAX_RACERS_PER_WINDOW` in the Convex module. */
export const MAX_RACERS_PER_WEEK = 5

export const RACER_LIFETIME_DAYS = 7

/**
 * Kept in step with `MAX_ACTIVE_RACERS` in the Convex module, which enforces it.
 * Once this many are running, new submissions are refused until one finishes its
 * week — nobody gets bumped out of the header early.
 */
export const MAX_ACTIVE_RACERS = 50

/**
 * Identifies the browser that made a racer, so we can show someone their own
 * submissions — including shadow-banned ones — and link submissions together in
 * the admin page. Not a credential: it grants nothing beyond seeing your own
 * racers, so a wiped one just means a fresh allowance from this browser (the IP
 * limit is what actually holds the line).
 */
const SECRET_KEY = 'sbrc:racer-secret'

/** Set once someone has made a racer, so the site can greet them as a returning maker. */
const MADE_KEY = 'sbrc:made-racer'

export interface CustomRacer {
	_id: string
	name: string
	avatar: CharacterSpriteProps
	/** 0 = slowest, 1 = fastest — mapped onto the header's real speeds at render. */
	speed: number
	createdAt: number
	expiresAt: number
	/** Only ever set on your own racers, when they're waiting to be approved. */
	pending?: boolean
}

function randomId(): string {
	const bytes = new Uint8Array(16)
	crypto.getRandomValues(bytes)
	return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** The secret id for this browser, generated on first use. */
export function getRacerSecretId(): string {
	try {
		const existing = localStorage.getItem(SECRET_KEY)
		if (existing) return existing
		const created = randomId()
		localStorage.setItem(SECRET_KEY, created)
		return created
	} catch {
		// Private mode or storage disabled — a per-session id still lets the
		// submission through; only the "your racers" list won't survive a reload.
		return randomId()
	}
}

export function hasMadeRacer(): boolean {
	try {
		return localStorage.getItem(MADE_KEY) === 'true'
	} catch {
		return false
	}
}

function rememberMadeRacer(): void {
	try {
		localStorage.setItem(MADE_KEY, 'true')
	} catch {
		// Storage unavailable — the server still knows, this is only a nicety
	}
}

// ── API ─────────────────────────────────────────────────────────────

/**
 * Deliberately uncached: racers expire on a seven-day clock, and a stale cache
 * would keep them running in the header past their week.
 */
export async function fetchCustomRacers(): Promise<CustomRacer[]> {
	try {
		const response = await fetch(`${CONVEX_URL}/api/custom-racers`)
		if (!response.ok) return []
		return await response.json()
	} catch {
		return []
	}
}

export interface MyRacers {
	racers: CustomRacer[]
	/** How many more this browser may create in the current window. */
	remaining: number
	/** True when the header is at capacity, so the form can say so up front. */
	headerFull: boolean
}

export async function fetchMyRacers(secretId: string): Promise<MyRacers> {
	try {
		const response = await fetch(
			`${CONVEX_URL}/api/custom-racers/mine?secretId=${encodeURIComponent(secretId)}`,
		)
		if (!response.ok) {
			return { racers: [], remaining: MAX_RACERS_PER_WEEK, headerFull: false }
		}
		return await response.json()
	} catch {
		return { racers: [], remaining: MAX_RACERS_PER_WEEK, headerFull: false }
	}
}

export type CreateRacerResult =
	| { ok: true; pending: boolean }
	| { ok: false; error: string }

export async function createCustomRacer(input: {
	name: string
	avatar: CharacterSpriteProps
	speed: number
}): Promise<CreateRacerResult> {
	const secretId = getRacerSecretId()
	try {
		const response = await fetch(`${CONVEX_URL}/api/custom-racers`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ...input, secretId }),
		})
		const data = await response.json()
		if (!response.ok || data.error) {
			if (data.error === 'limit') {
				return {
					ok: false,
					error: `You've added ${MAX_RACERS_PER_WEEK} racers already — you can add more once your earliest one finishes its week.`,
				}
			}
			if (data.error === 'full') {
				return {
					ok: false,
					error: `The header is full — ${MAX_ACTIVE_RACERS} racers are already out there. Try again once one of them finishes its week.`,
				}
			}
			return { ok: false, error: data.error ?? 'Something went wrong' }
		}
		rememberMadeRacer()
		return { ok: true, pending: Boolean(data.pending) }
	} catch {
		return { ok: false, error: 'Could not reach the server — try again' }
	}
}

/**
 * What the header should run: everyone's live racers, plus any of your own the
 * public list held back. A shadow-banned racer is invisible to everyone else but
 * still runs for whoever made it — that's the whole point of a shadow ban, and
 * it's why this can't just use the public list.
 *
 * Racers still waiting on approval are left out even for their maker, since the
 * page tells them it's waiting and seeing it already running would contradict that.
 */
export async function fetchHeaderRacers(): Promise<CustomRacer[]> {
	// Only ask for your own if this browser has made one — no reason to mint a
	// secret id for a passer-by, or to spend a request finding nothing.
	const wantsOwn = hasMadeRacer()
	const [everyone, mine] = await Promise.all([
		fetchCustomRacers(),
		wantsOwn ? fetchMyRacers(getRacerSecretId()) : null,
	])

	if (!mine) return everyone

	const shown = new Set(everyone.map((r) => r._id))
	const held = mine.racers.filter((r) => !shown.has(r._id) && !r.pending)
	return [...everyone, ...held]
}

// ── Speed ───────────────────────────────────────────────────────────

/**
 * Turn a 0–1 slider value into a header speed. The band runs from 10% below the
 * slowest club runner to 10% above the fastest, so a custom racer always has
 * someone to chase or be chased by rather than sitting on top of a real runner.
 */
export function racerSpeedToHeaderSpeed(
	value: number,
	slowest: number,
	fastest: number,
): number {
	const min = slowest * 0.9
	const max = fastest * 1.1
	const clamped = Math.min(1, Math.max(0, value))
	return min + (max - min) * clamped
}

/** Days left before a racer drops out of the header, never below zero. */
export function daysRemaining(expiresAt: number): number {
	return Math.max(0, Math.ceil((expiresAt - Date.now()) / 86_400_000))
}
