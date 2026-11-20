import { onCleanup } from 'solid-js'

/**
 * Keeps the screen from going to sleep while the component calling it is
 * up: the big screen, with everyone playing on their phones and nobody
 * touching it, or a phone, which drops out of the Room if it locks. Asked
 * again whenever the page comes back into view, since the browser lets go
 * of it whenever it's hidden. Where it's not supported, or not allowed,
 * the screen sleeps on its own timer as usual.
 */
export function keepScreenAwake() {
	let wake: WakeLockSentinel | undefined
	let done = false
	const ask = async () => {
		if (done || document.visibilityState !== 'visible') return
		if (wake && !wake.released) return
		try {
			const next = await navigator.wakeLock?.request('screen')
			if (done) void next?.release()
			else wake = next
		} catch {
			// Not allowed, or not supported.
		}
	}
	void ask()
	document.addEventListener('visibilitychange', ask)
	onCleanup(() => {
		done = true
		document.removeEventListener('visibilitychange', ask)
		void wake?.release().catch(() => {})
	})
}
