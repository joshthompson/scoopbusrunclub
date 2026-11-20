import { glyphRows } from '../../courses/kit/pixelArt'

/**
 * Memory Dunk's art, as cells for a draw hook to paint: the four shapes,
 * each platform's colours, and lettering for the board. Everything's
 * worked out in cells and painted 2 px a cell.
 */

export const SHAPE_NAMES = ['square', 'circle', 'triangle', 'diamond'] as const
export type ShapeName = (typeof SHAPE_NAMES)[number]

/** A platform's colours: its deck, the shade of its body, and its shape on the board. */
export interface PlatformColours {
	name: string
	lit: string
	base: string
	shade: string
}

/** Red, blue, yellow and green, one to a shape, in the shapes' order. */
export const PLATFORM_COLOURS: PlatformColours[] = [
	{ name: 'red', lit: '#f27a66', base: '#e24a3b', shade: '#a82e27' },
	{ name: 'blue', lit: '#6aa3ee', base: '#3f7fd8', shade: '#2a5599' },
	{ name: 'yellow', lit: '#fadf6a', base: '#f2c230', shade: '#b8861a' },
	{ name: 'green', lit: '#7ccf6c', base: '#4aa84a', shade: '#2f7436' },
]

/** The cream a shape's painted in on its platform's face, and the board's dark. */
export const CREAM = '#fff4d6'
export const BOARD_DARK = '#14263a'
export const BOARD_FRAME = '#4a3322'
export const BOARD_FRAME_LIT = '#6e4d33'
export const WOOD_DARK = '#5c4129'
export const WOOD_LIT = '#8a6440'
export const INK = '#1d1d1d'

/** A run of lit cells in a row of a shape: [x, y, width], in cells. */
export type Run = [number, number, number]

const cache = new Map<string, Run[]>()

/**
 * `shape`, `size` cells across and down, as runs of cells: a square, a
 * circle, a triangle (point up) or a diamond, edge to edge in its box.
 */
export function shapeRuns(shape: ShapeName, size: number): Run[] {
	const key = `${shape}:${size}`
	const hit = cache.get(key)
	if (hit) return hit
	const r = size / 2
	const runs: Run[] = []
	for (let y = 0; y < size; y++) {
		let from = -1
		for (let x = 0; x <= size; x++) {
			const dx = x + 0.5 - r
			const dy = y + 0.5 - r
			const lit =
				x < size &&
				(shape === 'square'
					? Math.abs(dx) < r - 0.5 && Math.abs(dy) < r - 0.5
					: shape === 'circle'
						? dx * dx + dy * dy <= r * r - 1
						: shape === 'triangle'
							? Math.abs(dx) <= (dy + r) / 2 && dy < r - 0.5
							: Math.abs(dx) + Math.abs(dy) <= r - 0.25)
			if (lit && from < 0) from = x
			if (!lit && from >= 0) {
				runs.push([from, y, x - from])
				from = -1
			}
		}
	}
	cache.set(key, runs)
	return runs
}

/** A question mark, 5 by 7 cells, for the board while you're remembering. */
const QUESTION = ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..']

/** `text`'s lit cells, as runs per letter, for the board's lettering: 5 by 7 cells a letter. */
export function textRuns(text: string): Run[] {
	const runs: Run[] = []
	;[...text.toUpperCase()].forEach((char, i) => {
		const rows = char === '?' ? QUESTION : glyphRows(char)
		rows.forEach((row, y) => {
			let from = -1
			for (let x = 0; x <= row.length; x++) {
				const lit = row[x] === '#'
				if (lit && from < 0) from = x
				if (!lit && from >= 0) {
					runs.push([i * 6 + from, y, x - from])
					from = -1
				}
			}
		})
	})
	return runs
}

/** How wide `text` is in cells. */
export const textCells = (text: string) => Math.max(0, [...text].length * 6 - 1)
