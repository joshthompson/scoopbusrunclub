/**
 * The one AudioContext the game's sound effects and music share. Made the
 * first time either needs it, which is after a key or a tap: browsers won't
 * play anything before.
 */
let context: AudioContext | undefined

export function audioContext() {
	context ??= new AudioContext()
	return context
}
