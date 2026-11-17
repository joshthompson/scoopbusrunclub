import { createSignal } from 'solid-js'
import { COURSES } from './courses'
import { cheats } from './game/cheats'
import { UNLOCKABLES } from './runners/bonus'
import { lockAll, unlockUpTo } from './saved/progress'
import { unlockRunner } from './saved/unlocked'

/**
 * Debug tools, run from the browser's console:
 *
 * - `unlockAll()`: every course unlocked for practice, and everyone there
 *   is to run as
 * - `lockAll()`: courses locked in this browser, back to only the first,
 *   each opened by finishing the one before
 * - `busOff()`: no bus, to take a course slowly, till `busOn()` or a reload
 * - `busOn()`: the bus back, a little way behind
 * - `toFinish()`: everyone just short of the course's finish, running at it,
 *   to see what comes after one (Endless's next course, a summary)
 * - `testPodium()`: straight to a Podium on Haga, 4 to 8 made-up Players,
 *   you on the arrows (WASD for someone else), the rest running about;
 *   `testPodium(2)`, say, for that many (1 to 8)
 */
declare global {
	interface Window {
		unlockAll: () => string
		lockAll: () => string
		busOff: () => string
		busOn: () => string
		toFinish: () => string
		testPodium: (players?: number) => string
	}
}

/** Each time `testPodium()` is called, one more: the App shows a test Podium for it (see `TestPodium`). */
export const [podiumTests, setPodiumTests] = createSignal(0)
/** How many Players the test Podium has, if `testPodium` was told: 4 to 8 if not. */
export let podiumPlayers: number | undefined

window.unlockAll = () => {
	unlockUpTo(COURSES.length - 1)
	for (const runner of UNLOCKABLES) unlockRunner(runner.id)
	return `All ${COURSES.length} courses and ${UNLOCKABLES.length} characters unlocked`
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
window.toFinish = () => {
	cheats.toFinish = true
	return 'Off to the finish: just short of it, running'
}
window.testPodium = (players?: number) => {
	podiumPlayers =
		players === undefined
			? undefined
			: Math.max(1, Math.min(8, Math.round(players)))
	setPodiumTests((n) => n + 1)
	return 'On the podium: arrows to run, up to jump, down to slide or drop off a step (WASD for a second player)'
}
