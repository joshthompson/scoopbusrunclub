import { type PixelRect, pixelArt } from './pixelArt'

/**
 * What stands about in Gamla Stan's streets, in front of the houses:
 * Stortorgsbrunnen, the well on Stortorget; café tables out on the
 * cobbles; tubs of flowers by the doors; and a bike left leaning. Drawn at
 * scale 2.
 */

const SANDSTONE = '#d9c49a'
const SANDSTONE_LIT = '#ecdcb6'
const SANDSTONE_SHADE = '#b49c70'
const SANDSTONE_DARK = '#8a7552'
const IRON = '#2e2b29'
const WATER = '#4f8fb0'

/**
 * Stortorgsbrunnen: an octagonal well of pale sandstone, arches round its
 * sides, a cornice, an urn on top, and a basin at its foot. 34 by 40.
 */
export const stortorgetWell = (() => {
	const rects: PixelRect[] = [
		// The urn on top, and its finial.
		[16, 0, 2, 2, SANDSTONE_DARK],
		[14, 2, 6, 2, SANDSTONE],
		[13, 4, 8, 4, SANDSTONE],
		[13, 4, 2, 4, SANDSTONE_LIT],
		[19, 4, 2, 4, SANDSTONE_SHADE],
		[15, 8, 4, 2, SANDSTONE_SHADE],
		// Its roof, stepped in.
		[10, 10, 14, 2, SANDSTONE_SHADE],
		[7, 12, 20, 2, SANDSTONE],
		[5, 14, 24, 2, SANDSTONE_LIT],
		[5, 16, 24, 1, SANDSTONE_DARK],
		// Its body.
		[6, 17, 22, 15, SANDSTONE],
		[6, 17, 3, 15, SANDSTONE_LIT],
		[25, 17, 3, 15, SANDSTONE_SHADE],
	]
	// Arches round its sides, dark inside: three faces of eight in view.
	for (const [x, w] of [
		[9, 4],
		[15, 4],
		[21, 4],
	]) {
		rects.push([x + 1, 19, w - 2, 1, SANDSTONE_DARK])
		rects.push([x, 20, w, 9, SANDSTONE_DARK])
		rects.push([x + 1, 21, w - 2, 8, '#5d4f38'])
	}
	// A spout, the basin and its water, and the steps under it all.
	rects.push(
		[16, 29, 2, 2, IRON],
		[2, 31, 30, 1, SANDSTONE_LIT],
		[2, 32, 30, 4, SANDSTONE],
		[3, 32, 28, 1, WATER],
		[2, 35, 30, 1, SANDSTONE_SHADE],
		[0, 36, 34, 2, SANDSTONE_SHADE],
		[0, 38, 34, 2, SANDSTONE_DARK],
	)
	return pixelArt(34, 40, rects)
})()

const CLOTH = '#f3efe6'
const CLOTH_CHECK = '#c8463c'
const CHAIR = '#3f5a4a'

/**
 * A café table out on the cobbles: a check cloth, a cup and a bun on it,
 * a bistro chair either side. 26 by 14.
 */
export const cafeTable = pixelArt(26, 14, [
	// Chairs: a back, a seat, legs.
	[1, 2, 1, 12, CHAIR],
	[1, 7, 5, 1, CHAIR],
	[5, 8, 1, 6, CHAIR],
	[24, 2, 1, 12, CHAIR],
	[20, 7, 5, 1, CHAIR],
	[20, 8, 1, 6, CHAIR],
	// The cloth, red and white check along its hem.
	[7, 5, 12, 1, CLOTH],
	[7, 6, 12, 3, CLOTH],
	[7, 8, 2, 1, CLOTH_CHECK],
	[11, 8, 2, 1, CLOTH_CHECK],
	[15, 8, 2, 1, CLOTH_CHECK],
	// Its foot.
	[12, 9, 2, 4, IRON],
	[10, 13, 6, 1, IRON],
	// A cup of coffee and a kanelbulle.
	[9, 3, 2, 2, '#ffffff'],
	[11, 4, 1, 1, '#ffffff'],
	[14, 3, 3, 2, '#c8843c'],
	[15, 3, 1, 1, '#8a5424'],
])

const TUB = '#5a6b78'
const TUB_LIT = '#73879a'

/** A tub of flowers by a door: red geraniums, a few white. 12 by 14. */
export const flowerTub = pixelArt(12, 14, [
	[2, 3, 8, 4, '#4f7d3a'],
	[1, 5, 10, 3, '#3f6a2e'],
	[3, 1, 2, 2, '#d8443a'],
	[6, 0, 2, 2, '#e85a48'],
	[8, 2, 2, 2, '#d8443a'],
	[2, 5, 2, 1, '#f4f1ea'],
	[7, 4, 2, 1, '#f4f1ea'],
	[5, 3, 1, 1, '#d8443a'],
	// The tub.
	[1, 8, 10, 1, TUB_LIT],
	[2, 9, 8, 5, TUB],
	[2, 9, 2, 5, TUB_LIT],
])

const FRAME = '#2f6aa8'

/** A bike left leaning on its stand: blue frame, a basket on the front. 24 by 15. */
export const leaningBike = (() => {
	const rects: PixelRect[] = []
	// Its two wheels, rings of tyre.
	for (const cx of [5, 18])
		for (let a = 0; a < 24; a++) {
			const t = (a / 24) * Math.PI * 2
			rects.push([
				Math.round(cx + Math.cos(t) * 4.5),
				Math.round(10 + Math.sin(t) * 4.5),
				1,
				1,
				IRON,
			])
		}
	rects.push(
		// The frame.
		[5, 9, 7, 1, FRAME],
		[11, 5, 1, 5, FRAME],
		[11, 5, 7, 1, FRAME],
		[17, 5, 1, 5, FRAME],
		[7, 7, 4, 1, FRAME],
		// The saddle, handlebars and a basket.
		[9, 3, 4, 1, IRON],
		[17, 2, 1, 3, IRON],
		[16, 2, 3, 1, IRON],
		[19, 3, 4, 3, '#a8763e'],
		[19, 3, 4, 1, '#c8955a'],
	)
	return pixelArt(
		24,
		15,
		rects.filter(([x, y]) => x >= 0 && x < 24 && y >= 0 && y < 15),
	)
})()
