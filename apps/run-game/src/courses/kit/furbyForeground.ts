import { type PixelRect, pixelArt } from './pixelArt'

/**
 * Furby Fields' near field: the sweets lying about in the grass in front of
 * the path, so the bottom of the screen isn't a slab of plain mint. Big
 * gumdrops, wrapped sweets, a dropped lollipop, jelly beans, rock candy and
 * tufts of sugar grass. Everything's sitting or lying: nothing here should
 * move. Drawn at 2 pixels a cell.
 */

const ICING = '#fff6fb'
const MINT_SHADE = 'rgba(63, 160, 128, 0.35)'

/** A shadow under a sweet on the grass, `width` cells, at row `y`. */
const shadow = (x: number, y: number, width: number): PixelRect => [
	x,
	y,
	width,
	1,
	MINT_SHADE,
]

/** How a sweet's colour is shaded: its base, a lighter one and a darker one. */
export interface Sweet {
	base: string
	light: string
	dark: string
}

export const SWEETS: Sweet[] = [
	{ base: '#ff6fa8', light: '#ffa6c9', dark: '#d94a86' },
	{ base: '#ffd23f', light: '#ffec8a', dark: '#e0a91e' },
	{ base: '#6bc4ff', light: '#a8defc', dark: '#3f9ad9' },
	{ base: '#b48bff', light: '#d3bcff', dark: '#8a63d6' },
	{ base: '#ff9a4d', light: '#ffc08a', dark: '#dd7326' },
]

/** A big gumdrop, sugar crystals all over it: 18 by 12. */
export const gumdrop = ({ base, light, dark }: Sweet) =>
	pixelArt(18, 12, [
		// Its dome.
		[5, 0, 8, 1, light],
		[3, 1, 12, 1, base],
		[1, 2, 16, 1, base],
		[0, 3, 18, 6, base],
		[1, 9, 16, 1, base],
		// Lit from above, the shade under it and down its far side.
		[4, 1, 5, 1, light],
		[2, 2, 4, 1, light],
		[1, 3, 3, 1, light],
		[1, 8, 16, 1, dark],
		[0, 6, 2, 2, dark],
		[15, 4, 3, 5, dark],
		[14, 3, 1, 1, dark],
		// Sugar on it.
		[7, 3, 1, 1, ICING],
		[11, 2, 1, 1, ICING],
		[4, 5, 1, 1, ICING],
		[9, 6, 1, 1, ICING],
		[13, 5, 1, 1, ICING],
		[6, 8, 1, 1, ICING],
		[11, 7, 1, 1, ICING],
		// Sat in the grass.
		shadow(1, 10, 17),
		shadow(3, 11, 13),
	])

/** A wrapped sweet lying on its side, its wrapper twisted at both ends: 24 by 10. */
export const wrappedSweet = ({ base, light, dark }: Sweet) =>
	pixelArt(24, 10, [
		// Its twists, fanned out.
		[0, 2, 2, 5, light],
		[2, 3, 3, 3, light],
		[19, 3, 3, 3, light],
		[22, 2, 2, 5, light],
		[0, 3, 1, 3, ICING],
		[23, 3, 1, 3, ICING],
		// The sweet.
		[5, 1, 14, 1, light],
		[5, 2, 14, 6, base],
		[6, 8, 12, 1, base],
		// A stripe either side, dark along its belly.
		[10, 2, 2, 6, ICING],
		[14, 2, 2, 6, ICING],
		[6, 7, 12, 1, dark],
		[6, 8, 12, 1, dark],
		shadow(4, 9, 16),
	])

/** A lollipop dropped in the grass: its swirl, and its stick out to the side. 24 by 12. */
export const droppedLollipop = ({ base, light, dark }: Sweet) =>
	pixelArt(24, 12, [
		// Its head.
		[3, 0, 6, 1, base],
		[1, 1, 10, 1, base],
		[0, 2, 12, 6, base],
		[1, 8, 10, 1, dark],
		[3, 9, 6, 1, dark],
		[0, 6, 1, 2, dark],
		[11, 4, 1, 4, dark],
		// Its swirl.
		[3, 2, 5, 1, ICING],
		[8, 3, 1, 3, ICING],
		[4, 6, 4, 1, ICING],
		[2, 3, 1, 3, ICING],
		[4, 4, 2, 1, ICING],
		[2, 1, 2, 1, light],
		// Its stick, striped, lying out along the grass.
		...Array.from(
			{ length: 6 },
			(_, i): PixelRect => [12 + i * 2, 5, 2, 2, i % 2 ? base : ICING],
		),
		shadow(1, 10, 11),
		shadow(12, 7, 12),
	])

/** A jelly bean: 10 by 6. */
export const jellyBean = ({ base, light, dark }: Sweet) =>
	pixelArt(10, 6, [
		[2, 0, 6, 1, base],
		[1, 1, 8, 3, base],
		[0, 2, 10, 2, base],
		[2, 4, 6, 1, dark],
		[1, 3, 2, 1, dark],
		[3, 1, 3, 1, light],
		[2, 2, 1, 1, light],
		shadow(2, 5, 7),
	])

/** A cluster of rock candy crystals, pale and glassy: 16 by 14. */
export const rockCandy = (tint: string, shade: string) =>
	pixelArt(16, 14, [
		// The tall one in the middle, a point up.
		[7, 0, 2, 2, tint],
		[6, 2, 4, 4, tint],
		[5, 6, 6, 6, tint],
		[9, 4, 2, 8, shade],
		[7, 1, 1, 3, ICING],
		[6, 5, 1, 4, ICING],
		// One leaning each way.
		[2, 5, 2, 2, tint],
		[1, 7, 4, 5, tint],
		[4, 8, 1, 4, shade],
		[2, 7, 1, 2, ICING],
		[12, 7, 2, 2, tint],
		[11, 9, 4, 3, tint],
		[14, 9, 1, 3, shade],
		[12, 9, 1, 1, ICING],
		// On the grass.
		[1, 12, 14, 1, shade],
		shadow(0, 13, 16),
	])

/** A tuft of sugar grass: mint blades with sprinkled tips, 12 by 10. */
export const sugarGrass = pixelArt(12, 10, [
	[1, 5, 1, 5, '#5fc9a4'],
	[2, 3, 1, 7, '#7fdcb8'],
	[4, 1, 1, 9, '#5fc9a4'],
	[5, 4, 1, 6, '#7fdcb8'],
	[7, 2, 1, 8, '#5fc9a4'],
	[8, 5, 1, 5, '#7fdcb8'],
	[10, 4, 1, 6, '#5fc9a4'],
	// Their tips: sugar.
	[2, 3, 1, 1, ICING],
	[4, 1, 1, 1, '#ff9ec8'],
	[7, 2, 1, 1, ICING],
	[10, 4, 1, 1, '#ffd23f'],
	[1, 5, 1, 1, '#b48bff'],
	[0, 9, 12, 1, '#3fa080'],
])
