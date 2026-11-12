/**
 * The Slopes' rack of skis and snowboards: what each is, and its colours.
 * On its own, with nothing to import, so the art and the physics can both
 * have it.
 */

/** A pair of skis, or a snowboard: its colour, and a stripe along it. */
export interface Board {
	kind: 'skis' | 'snowboard'
	colour: string
	stripe: string
}

/** The rack's, in order along it, each its own colour. Anyone's `board` is one of these, from 1. */
export const BOARDS: Board[] = [
	{ kind: 'skis', colour: '#d8342c', stripe: '#f6f7f8' },
	{ kind: 'snowboard', colour: '#1fb5a8', stripe: '#f5c518' },
	{ kind: 'skis', colour: '#f5c518', stripe: '#1d1d1d' },
	{ kind: 'skis', colour: '#2d6fd0', stripe: '#f6f7f8' },
	{ kind: 'snowboard', colour: '#ef5fa7', stripe: '#7b3fb5' },
	{ kind: 'skis', colour: '#2f9b4a', stripe: '#f6f7f8' },
	{ kind: 'snowboard', colour: '#f2862e', stripe: '#1d1d1d' },
	{ kind: 'skis', colour: '#7b3fb5', stripe: '#f5c518' },
]

/** Whose board `board` is: 1 the rack's first. */
export const boardOf = (board: number) =>
	BOARDS[(board - 1 + BOARDS.length) % BOARDS.length]
