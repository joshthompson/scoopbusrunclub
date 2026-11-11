import { COURSES } from './courses'
import { lockAll, unlockUpTo } from './saved/progress'

/**
 * Debug tools, run from the browser's console:
 *
 * - `unlockAll()`: every course unlocked for practice
 * - `lockAll()`: back to only the first
 */
declare global {
	interface Window {
		unlockAll: () => string
		lockAll: () => string
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
