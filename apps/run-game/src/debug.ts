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
 */
declare global {
	interface Window {
		unlockAll: () => string
		lockAll: () => string
		busOff: () => string
		busOn: () => string
	}
}

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
