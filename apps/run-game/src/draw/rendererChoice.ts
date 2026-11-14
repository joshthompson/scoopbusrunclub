import type { Scene } from 'scoopjs'

/**
 * Which of ScoopJS's Renderers draws the race, picked in the page's address,
 * for comparing the two on a phone:
 *
 * - `?renderer=canvas`: the Canvas Renderer, every sprite painted onto one
 *   `<canvas>`. Without it, the DOM Renderer, as always.
 * - `?skipChildren=1`: nothing drawn inside a sprite (its `children`), under
 *   either Renderer. The Canvas Renderer never draws them, so this is the fair
 *   comparison between the two.
 * - `?fps=1`: the frame rate and frame time, over the race.
 *
 * Kept for the whole visit, so going from screen to screen doesn't lose it.
 */
const query = new URLSearchParams(location.search)
const kept = (key: string) => {
	const value = query.get(key)
	try {
		if (value !== null) sessionStorage.setItem(`renderer-choice:${key}`, value)
		return value ?? sessionStorage.getItem(`renderer-choice:${key}`)
	} catch {
		return value
	}
}

export const rendererChoice = {
	canvas: kept('renderer') === 'canvas',
	skipChildren: kept('skipChildren') === '1',
	fps: kept('fps') === '1',
}

declare global {
	interface Window {
		/** The race on the screen, for `raceScene.canvasIssues()` in the console. */
		raceScene?: Scene
	}
}
