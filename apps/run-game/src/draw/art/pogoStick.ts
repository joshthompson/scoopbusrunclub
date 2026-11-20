import { letterArt } from '../../courses/kit/pixelArt'

/**
 * A pogo stick, stood up on its own, as Pogo Sticks' are drawn (see
 * `draw/pogoSticks`): a red tube, lit down one side, a handlebar with black
 * grips across its top, black footrests, a steel spring coiled under them,
 * and a rubber foot. For the Collectables screen. 11 by 34 cells.
 */
export const POGO_STICK = letterArt(
	[
		'GGRRRRRRRGG',
		...Array.from({ length: 17 }, () => '....LR.....'),
		'..KKKKKKK..',
		...Array.from({ length: 10 }, (_, i) =>
			i % 2 ? '....ddd....' : '...SSSSS...',
		),
		'....FF.....',
		'....FF.....',
		'...FFFF....',
		'...FFFF....',
	],
	{
		G: '#2b2b2b',
		R: '#d8342c',
		L: '#f47a70',
		K: '#2b2b2b',
		S: '#c8d0d8',
		d: '#6a737d',
		F: '#1d1d1d',
	},
)
export const POGO_STICK_WIDTH = 11
export const POGO_STICK_HEIGHT = 34
