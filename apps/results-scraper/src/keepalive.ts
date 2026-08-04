/**
 * Keeps the service worker alive for the duration of a run.
 *
 * Capture depends on `chrome.debugger` Network events, and those are only
 * delivered to a *running* worker — unlike tabs/alarms/messages, a debugger event
 * does not wake a worker Chrome has retired. Miss the `responseReceived` for a
 * page and there is no request ID left to fetch its body with, so the page loads
 * fine in the tab and the extension has nothing. That was the "no response, then
 * reloads after 30s" symptom.
 *
 * Calling into a chrome API resets the idle timer, so a slow self-ping holds the
 * worker open. This costs nothing and needs no extra permission — but it only
 * works while the worker is alive, so `background.ts` still recovers from a cold
 * start on its own.
 */

/** Comfortably inside Chrome's 30s idle timeout. */
const PING_INTERVAL_MS = 20_000

let timer: ReturnType<typeof setInterval> | null = null

export function startKeepalive(): void {
	if (timer) return
	timer = setInterval(() => {
		// The call itself is the point; the result is irrelevant.
		void chrome.runtime.getPlatformInfo().catch(() => undefined)
	}, PING_INTERVAL_MS)
}

export function stopKeepalive(): void {
	if (!timer) return
	clearInterval(timer)
	timer = null
}
