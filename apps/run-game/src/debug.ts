import { createSignal } from 'solid-js'
import { COURSES } from './courses'
import { cheats } from './game/cheats'
import { lockAll, unlockUpTo } from './saved/progress'

/**
 * Debug tools, run from the browser's console:
 *
 * - `unlockAll()`: every course unlocked for practice
 * - `lockAll()`: courses locked in this browser, back to only the first,
 *   each opened by finishing the one before
 * - `busOff()`: no bus, to take a course slowly, till `busOn()` or a reload
 * - `busOn()`: the bus back, a little way behind
 * - `testPodium()`: straight to a Podium on Haga, 4 to 8 made-up Players,
 *   you on the arrows (WASD for someone else), the rest running about
 */
declare global {
	interface Window {
		unlockAll: () => string
		lockAll: () => string
		busOff: () => string
		busOn: () => string
		testPodium: () => string
	}
}

/** Each time `testPodium()` is called, one more: the App shows a test Podium for it (see `TestPodium`). */
export const [podiumTests, setPodiumTests] = createSignal(0)

window.unlockAll = () => {
	unlockUpTo(COURSES.length - 1)
	return `All ${COURSES.length} courses unlocked`
}
window.lockAll = () => {
	lockAll()
	return 'Every course locked but the first'
}
window.busOff = () => {
	cheats.busOff = true
	return 'Bus off: take your time (busOn() to bring it back)'
}
window.busOn = () => {
	cheats.busOff = false
	return 'Bus on: it’s coming'
}
window.testPodium = () => {
	setPodiumTests((n) => n + 1)
	return 'On the podium: arrows to run, up to jump, down to sit (WASD for a second player)'
}
