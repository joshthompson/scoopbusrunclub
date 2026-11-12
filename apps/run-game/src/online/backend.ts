/**
 * The website's backend, which the game only ever asks for extras: the
 * guests, and the online high score tables. None of it's needed to play, so
 * every call here comes back with nothing, rather than throwing or hanging,
 * however it goes wrong: no backend to ask (no `VITE_CONVEX_URL`, as when
 * developing), no connection, the backend down or slow, or an answer that
 * isn't what's expected. Its callers check what they've got is the shape
 * they need before using it.
 */

const CONVEX_URL = (import.meta.env.VITE_CONVEX_URL as string | undefined) ?? ''
export const ONLINE = !!CONVEX_URL

/** How long to wait for an answer before giving up on it. */
const TIMEOUT_MS = 10_000

/**
 * The backend's answer, as JSON: undefined if there isn't one. A refusal
 * (a 4xx) still has its answer, as its `error` says why.
 */
export async function ask(path: string, init?: RequestInit): Promise<unknown> {
	if (!ONLINE) return undefined
	try {
		const response = await fetch(`${CONVEX_URL}${path}`, {
			...init,
			signal: AbortSignal.timeout?.(TIMEOUT_MS),
		})
		if (response.status >= 500) return undefined
		return await response.json()
	} catch {
		// Offline, the backend's down or too slow, or it isn't JSON.
		return undefined
	}
}

/** Post to the backend, as plain text so there's no asking first (no CORS preflight). */
export const post = (path: string, body: unknown) =>
	ask(path, { method: 'POST', body: JSON.stringify(body) })

/** Whether it's a plain object, to look inside. */
export const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value)

/** A string in an answer, if that's what it is. */
export const stringIn = (value: unknown, key: string) =>
	isObject(value) && typeof value[key] === 'string'
		? (value[key] as string)
		: undefined

/** A number in an answer, if that's what it is. */
export const numberIn = (value: unknown, key: string) =>
	isObject(value) &&
	typeof value[key] === 'number' &&
	Number.isFinite(value[key])
		? (value[key] as number)
		: undefined
