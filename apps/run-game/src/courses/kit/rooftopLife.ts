import {
	type PixelRect,
	pixelArt,
	pixelText,
	pixelTextWidth,
	rectsMarkup,
	svgUrl,
} from './pixelArt'

/**
 * Life up on the city's roofs, at dusk: washing hung out on a line,
 * planters of a roof garden with a deck chair, and a neon sign on a
 * steel frame, glowing pink. Drawn at scale 2.
 */

const POLE = '#4a4e58'
const LINE = '#8a8e98'

/** A washing line between two poles, shirts, a towel and socks pegged on it. 40 by 24. */
export const washingLine = pixelArt(40, 24, [
	[0, 2, 1, 22, POLE],
	[39, 2, 1, 22, POLE],
	[1, 3, 38, 1, LINE],
	// A shirt.
	[4, 4, 8, 2, '#e85a7a'],
	[5, 6, 6, 7, '#e85a7a'],
	[5, 6, 1, 7, '#f27f9a'],
	// A towel.
	[15, 4, 7, 12, '#5aa8d8'],
	[15, 13, 7, 1, '#f4f1ea'],
	// Socks.
	[24, 4, 2, 6, '#f4f1ea'],
	[26, 9, 1, 1, '#f4f1ea'],
	[28, 4, 2, 6, '#f4f1ea'],
	[30, 9, 1, 1, '#f4f1ea'],
	// A T-shirt.
	[32, 4, 6, 2, '#f0c832'],
	[33, 6, 4, 6, '#f0c832'],
])

/** A roof garden: planters of herbs and a tomato plant, and a striped deck chair. 36 by 16. */
export const roofGarden = pixelArt(36, 16, [
	// Planters, wood.
	[0, 10, 12, 6, '#7a5432'],
	[0, 10, 12, 1, '#9a6c42'],
	[14, 10, 10, 6, '#7a5432'],
	[14, 10, 10, 1, '#9a6c42'],
	// What's growing in them.
	[1, 6, 10, 4, '#4f8a3a'],
	[2, 4, 2, 2, '#5ea24a'],
	[7, 3, 2, 3, '#5ea24a'],
	[15, 2, 8, 8, '#3e7a30'],
	[16, 4, 2, 2, '#d8443a'],
	[20, 6, 2, 2, '#d8443a'],
	[18, 1, 1, 9, '#2e5a24'],
	// A deck chair, striped.
	[26, 6, 2, 10, '#5a4030'],
	[34, 10, 1, 6, '#5a4030'],
	[27, 6, 8, 1, '#f4f1ea'],
	[28, 7, 7, 1, '#3a7ad8'],
	[29, 8, 6, 1, '#f4f1ea'],
	[30, 9, 5, 1, '#3a7ad8'],
	[30, 10, 5, 1, '#f4f1ea'],
])

const NEON = '#ff5ab8'
const NEON_GLOW = 'rgba(255, 90, 184, 0.28)'
const STEEL = '#3a3e48'

/**
 * A neon sign, on a steel frame on the roof: SCOOP in pink neon, its glow
 * round it, and the frame's legs down to the roof. 66 by 36.
 */
export const neonSign = (() => {
	const W = 66
	const H = 36
	const cell = 2
	const text = 'SCOOP'
	const textW = pixelTextWidth(text, cell)
	const x0 = Math.round((W - textW) / 2)
	const rects: PixelRect[] = [
		// Its glow, behind.
		[2, 0, W - 4, 20, NEON_GLOW],
		[0, 2, W, 16, NEON_GLOW],
		// The frame: a rail along the bottom, legs and braces.
		[2, 20, W - 4, 2, STEEL],
		[6, 22, 2, 14, STEEL],
		[W - 8, 22, 2, 14, STEEL],
		[30, 22, 2, 14, STEEL],
		[8, 26, 22, 1, STEEL],
		[32, 26, 26, 1, STEEL],
	]
	return svgUrl(W, H, rectsMarkup(rects) + pixelText(text, x0, 3, cell, NEON))
})()
