import { Key } from '@/engine'
import { createSignal } from 'solid-js'

export type Action = 'left' | 'right' | 'up' | 'down'

const KEYS: Record<Action, string[]> = {
	left: ['ArrowLeft', 'a', 'A'],
	right: ['ArrowRight', 'd', 'D'],
	up: ['ArrowUp', 'w', 'W', ' '],
	down: ['ArrowDown', 's', 'S'],
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

/** Whether `action` is held, on the keyboard (arrows or WASD) or the on-screen buttons. */
export function isHeld(action: Action) {
	return touched().has(action) || KEYS[action].some((key) => Key.isDown(key))
}

// The arrows and space would otherwise scroll the page. Not while typing,
// though: WASD and space are letters in a runner's name.
const GAME_KEYS = new Set(Object.values(KEYS).flat())
window.addEventListener('keydown', (event) => {
	const typing =
		event.target instanceof HTMLInputElement ||
		event.target instanceof HTMLTextAreaElement
	if (GAME_KEYS.has(event.key) && !typing) event.preventDefault()
})
