import { Key } from 'scoopjs'
import { createSignal } from 'solid-js'

export type Action = 'left' | 'right' | 'up' | 'down'

/** What a racer's holding: each of the four actions, held or not. */
export type Controls = Record<Action, boolean>

export const NOTHING_HELD: Controls = {
	left: false,
	right: false,
	up: false,
	down: false,
}

/**
 * The keyboard, whole for single player, or split in two for two Local
 * Players: WASD and space on the left, the arrows on the right.
 */
export type KeyboardHalf = 'all' | 'wasd' | 'arrows'

const WASD: Record<Action, string[]> = {
	left: ['a', 'A'],
	right: ['d', 'D'],
	up: ['w', 'W', ' '],
	down: ['s', 'S'],
}
const ARROWS: Record<Action, string[]> = {
	left: ['ArrowLeft'],
	right: ['ArrowRight'],
	up: ['ArrowUp'],
	down: ['ArrowDown'],
}
const KEYS: Record<KeyboardHalf, Record<Action, string[]>> = {
	wasd: WASD,
	arrows: ARROWS,
	all: {
		left: [...ARROWS.left, ...WASD.left],
		right: [...ARROWS.right, ...WASD.right],
		up: [...ARROWS.up, ...WASD.up],
		down: [...ARROWS.down, ...WASD.down],
	},
}

/** The on-screen buttons' presses, for touch screens. */
const [touched, setTouched] = createSignal<Set<Action>>(new Set())

export function setTouch(action: Action, down: boolean) {
	setTouched((held) => {
		const next = new Set(held)
		if (down) next.add(action)
		else next.delete(action)
		return next
	})
}

const keyHeld = (half: KeyboardHalf, action: Action) =>
	KEYS[half][action].some((key) => Key.isDown(key))

/** Whether `action` is held, on the keyboard (arrows or WASD) or the on-screen buttons. */
export function isHeld(action: Action) {
	return touched().has(action) || keyHeld('all', action)
}

/** Everything single player's runner can be steered with at once. */
export const anyControls = (): Controls => ({
	left: isHeld('left'),
	right: isHeld('right'),
	up: isHeld('up'),
	down: isHeld('down'),
})

/** One half of the keyboard. */
export const keyboardControls = (half: KeyboardHalf) => (): Controls => ({
	left: keyHeld(half, 'left'),
	right: keyHeld(half, 'right'),
	up: keyHeld(half, 'up'),
	down: keyHeld(half, 'down'),
})

/** The on-screen buttons on their own: a phone hosting a Room, playing on it too. */
export const touchControls = (): Controls => {
	const held = touched()
	return {
		left: held.has('left'),
		right: held.has('right'),
		up: held.has('up'),
		down: held.has('down'),
	}
}

/** A stick has to be pushed this far before it counts. */
const STICK_DEAD = 0.45

/**
 * The gamepad plugged in at `index`, in the standard layout: the d-pad or
 * the left stick to run, A (or up) to jump, B (or down) to duck.
 */
export const gamepadControls = (index: number) => (): Controls => {
	const pad = navigator.getGamepads?.()[index]
	if (!pad) return NOTHING_HELD
	const button = (i: number) => !!pad.buttons[i]?.pressed
	const x = pad.axes[0] ?? 0
	const y = pad.axes[1] ?? 0
	return {
		left: button(14) || x < -STICK_DEAD,
		right: button(15) || x > STICK_DEAD,
		up: button(0) || button(12),
		down: button(1) || button(13) || y > STICK_DEAD,
	}
}

/** Start, on a gamepad. */
export const gamepadStart = (index: number) =>
	!!navigator.getGamepads?.()[index]?.buttons[9]?.pressed

/** Select (or Back, or View), on a gamepad. */
export const gamepadSelect = (index: number) =>
	!!navigator.getGamepads?.()[index]?.buttons[8]?.pressed

/** Which gamepads are plugged in, by index. */
export function connectedGamepads() {
	return [...(navigator.getGamepads?.() ?? [])]
		.filter((pad): pad is Gamepad => !!pad && pad.connected)
		.map((pad) => pad.index)
}

/** Whether a key's held, for what isn't one of the four actions: Enter, say. */
export const keyDown = (key: string) => Key.isDown(key)

/** Controls packed into a number, for sending: a bit an action. */
export function packControls(controls: Controls) {
	return (
		(controls.left ? 1 : 0) |
		(controls.right ? 2 : 0) |
		(controls.up ? 4 : 0) |
		(controls.down ? 8 : 0)
	)
}

export function unpackControls(bits: number): Controls {
	return {
		left: (bits & 1) !== 0,
		right: (bits & 2) !== 0,
		up: (bits & 4) !== 0,
		down: (bits & 8) !== 0,
	}
}

/** Which action a key is, on the whole keyboard (arrows or WASD), if any. */
export const actionOfKey = (key: string): Action | undefined =>
	(Object.keys(KEYS.all) as Action[]).find((action) =>
		KEYS.all[action].includes(key),
	)

// The arrows and space would otherwise scroll the page. Not while typing,
// though: WASD and space are letters in a runner's name.
const GAME_KEYS = new Set(Object.values(KEYS.all).flat())
window.addEventListener('keydown', (event) => {
	const typing =
		event.target instanceof HTMLInputElement ||
		event.target instanceof HTMLTextAreaElement
	if (GAME_KEYS.has(event.key) && !typing) event.preventDefault()
})

/** Two taps closer together than this, in ms, would zoom in on a phone. */
const DOUBLE_TAP_MS = 350
let lastTap = Number.NEGATIVE_INFINITY
// A phone's Safari zooms in on two quick taps whatever `touch-action` says,
// and on a pinch: two thumbs on the buttons at once. Neither, then. The
// second tap's click is stopped with it, so a button tapped quickly after
// another is clicked here instead, and doesn't go missing.
document.addEventListener(
	'touchend',
	(event) => {
		const target = event.target as Element | null
		if (target?.closest('input, textarea, select')) return
		if (event.timeStamp - lastTap < DOUBLE_TAP_MS && event.cancelable) {
			event.preventDefault()
			target?.closest<HTMLElement>('button, a, label')?.click()
		}
		lastTap = event.timeStamp
	},
	{ passive: false },
)
for (const gesture of ['gesturestart', 'gesturechange'])
	document.addEventListener(gesture, (event) => event.preventDefault())

/** Played on a touch screen, with no keys: on-screen buttons, and a pause button. */
export const touchScreen = () => window.matchMedia('(pointer: coarse)').matches
