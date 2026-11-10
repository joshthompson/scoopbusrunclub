/**
 * The one AudioContext the game's sound effects and music share. Made the
 * first time either needs it, which is after a key or a tap: browsers won't
 * play anything before. Silent while the game's tab is hidden: suspended
 * then, and running again when it's back.
 */
let context: AudioContext | undefined

export function audioContext() {
	if (!context) {
		context = new AudioContext()
		document.addEventListener('visibilitychange', () => {
			if (document.hidden) void context?.suspend()
			else void context?.resume()
		})
	}
	return context
}

/** Starts it going again, if it was waiting for a key or a tap: unless the tab's hidden. */
export function wake(context: AudioContext) {
	if (context.state === 'suspended' && !document.hidden) void context.resume()
}
