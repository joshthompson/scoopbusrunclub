/**
 * The fika on the course, which speeds you up: pixel art drawn in cells
 * twice the size of a screen pixel, the same as the runners.
 */
export type FikaItem = 'coffee' | 'kanelbulle' | 'chokladboll' | 'prinsesstarta'

export const FIKA_ITEMS: FikaItem[] = [
	'coffee',
	'kanelbulle',
	'chokladboll',
	'prinsesstarta',
]

/** A cell's size, in screen pixels. */
const CELL = 2

const INK = '#0f1f29'

/** [x, y, width, height, colour], in cells. */
type Cells = [number, number, number, number, string][]

const CUP = '#f6f1e7'
const CUP_SHADE = '#d9d0c0'
const COFFEE = '#6b4226'
const STEAM = 'rgba(255, 255, 255, 0.85)'

const coffee: Cells = [
	// Two wisps of steam, wavering the same way
	[3, 0, 1, 1, STEAM],
	[4, 1, 1, 1, STEAM],
	[3, 2, 1, 1, STEAM],
	[6, 0, 1, 1, STEAM],
	[7, 1, 1, 1, STEAM],
	[6, 2, 1, 1, STEAM],
	// Cup, with the coffee showing at the top
	[1, 3, 9, 6, INK],
	[2, 4, 7, 4, CUP],
	[2, 4, 7, 1, COFFEE],
	[8, 5, 1, 3, CUP_SHADE],
	// Handle
	[10, 4, 1, 1, INK],
	[11, 5, 1, 2, INK],
	[10, 7, 1, 1, INK],
	// Saucer
	[0, 9, 12, 2, INK],
	[1, 9, 10, 1, CUP_SHADE],
]

const BUN = '#c98a3d'
const BUN_DARK = '#8a5524'
const BUN_LIGHT = '#e0a95a'
const SUGAR = '#ffffff'

const kanelbulle: Cells = [
	// Outline, then the bun inside it
	[3, 0, 6, 1, INK],
	[2, 1, 8, 1, INK],
	[1, 2, 10, 1, INK],
	[0, 3, 12, 4, INK],
	[1, 7, 10, 1, INK],
	[2, 8, 8, 1, INK],
	[3, 1, 6, 1, BUN],
	[2, 2, 8, 1, BUN],
	[1, 3, 10, 4, BUN],
	[2, 7, 8, 1, BUN],
	[3, 2, 4, 1, BUN_LIGHT],
	// The cinnamon swirl
	[3, 3, 5, 1, BUN_DARK],
	[8, 4, 1, 2, BUN_DARK],
	[4, 6, 4, 1, BUN_DARK],
	[3, 4, 1, 2, BUN_DARK],
	[5, 5, 2, 1, BUN_DARK],
	// Pearl sugar
	[4, 2, 1, 1, SUGAR],
	[7, 2, 1, 1, SUGAR],
	[2, 4, 1, 1, SUGAR],
	[6, 4, 1, 1, SUGAR],
	[9, 6, 1, 1, SUGAR],
	[5, 7, 1, 1, SUGAR],
]

const CHOC = '#5b3420'
const CHOC_LIGHT = '#7a4a2e'
const COCONUT = '#fffaf0'

const chokladboll: Cells = [
	[2, 0, 5, 1, INK],
	[1, 1, 7, 1, INK],
	[0, 2, 9, 5, INK],
	[1, 7, 7, 1, INK],
	[2, 8, 5, 1, INK],
	[2, 1, 5, 1, CHOC],
	[1, 2, 7, 5, CHOC],
	[2, 7, 5, 1, CHOC],
	[2, 2, 2, 1, CHOC_LIGHT],
	[2, 3, 1, 1, CHOC_LIGHT],
	// Coconut
	[4, 1, 1, 1, COCONUT],
	[6, 2, 1, 1, COCONUT],
	[2, 5, 1, 1, COCONUT],
	[5, 4, 1, 1, COCONUT],
	[7, 5, 1, 1, COCONUT],
	[4, 6, 1, 1, COCONUT],
	[3, 3, 1, 1, COCONUT],
]

const MARZIPAN = '#9fd18b'
const MARZIPAN_DARK = '#7fb56b'
const SPONGE = '#f2d27a'
const CREAM = '#fff8e6'
const JAM = '#d23c5a'
const ROSE = '#f08cb4'
const ROSE_DARK = '#d0628f'
const LEAF = '#5f9a4a'

const prinsesstarta: Cells = [
	// The rose on top
	[6, 0, 1, 1, ROSE],
	[5, 1, 3, 2, ROSE],
	[5, 1, 1, 1, ROSE_DARK],
	[7, 2, 1, 1, ROSE_DARK],
	[8, 2, 1, 1, LEAF],
	// The slice: green marzipan over sponge, cream and jam
	[0, 3, 12, 8, INK],
	[1, 4, 10, 1, MARZIPAN],
	[10, 4, 1, 6, MARZIPAN_DARK],
	[1, 5, 9, 1, SPONGE],
	[1, 6, 9, 1, CREAM],
	[1, 7, 9, 1, JAM],
	[1, 8, 9, 1, CREAM],
	[1, 9, 9, 1, SPONGE],
]

function art(cells: Cells) {
	const width = Math.max(...cells.map(([x, , w]) => x + w)) * CELL
	const height = Math.max(...cells.map(([, y, , h]) => y + h)) * CELL
	return {
		width,
		height,
		rects: cells.map(
			([x, y, w, h, colour]) =>
				[x * CELL, y * CELL, w * CELL, h * CELL, colour] as Cells[number],
		),
	}
}

/** Each item's art, in screen pixels, and its size. */
export const FIKA_ART: Record<
	FikaItem,
	{ width: number; height: number; rects: Cells }
> = {
	coffee: art(coffee),
	kanelbulle: art(kanelbulle),
	chokladboll: art(chokladboll),
	prinsesstarta: art(prinsesstarta),
}
