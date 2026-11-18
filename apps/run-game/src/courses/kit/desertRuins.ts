import { type PixelRect, pixelArt } from './pixelArt'
import { seeded } from './seeded'

/**
 * What's left lying about the desert round the pyramids: an obelisk, lotus
 * columns standing and broken, tumbled sandstone blocks, and the scrub that
 * grows out of the sand between them. Drawn at scale 2.
 */

const STONE = '#d9b77a'
const STONE_LIT = '#ecd09a'
const STONE_SHADE = '#b48f58'
const STONE_DARK = '#8a6a3e'
const CUT = '#9c7a48'
const GOLD = '#e6c24a'

const inside = (w: number, h: number, rects: PixelRect[]) =>
	rects.filter(([x, y]) => x >= 0 && x < w && y >= 0 && y < h)

/** An obelisk: a tall tapering shaft, a gilt point, hieroglyphs down it. 14 by 76. */
export const obelisk = (() => {
	const rects: PixelRect[] = [
		// Its gilt pyramidion.
		[6, 0, 2, 1, GOLD],
		[5, 1, 4, 2, GOLD],
		[4, 3, 6, 2, GOLD],
		[4, 3, 2, 2, '#f6dc7a'],
	]
	for (let y = 5; y < 70; y++) {
		const half = Math.round(3 + ((y - 5) / 65) * 2)
		rects.push([7 - half, y, half * 2, 1, STONE])
		rects.push([7 - half, y, 2, 1, STONE_LIT])
		rects.push([7 + half - 2, y, 2, 1, STONE_SHADE])
	}
	// Hieroglyphs, cut down its face.
	const random = seeded(5101)
	for (let y = 9; y < 64; y += 3)
		rects.push([
			5 + Math.floor(random() * 2),
			y,
			1 + Math.floor(random() * 3),
			2,
			CUT,
		])
	// Its base.
	rects.push([1, 70, 12, 3, STONE_SHADE], [0, 73, 14, 3, STONE_DARK])
	rects.push([1, 70, 12, 1, STONE_LIT])
	return pixelArt(14, 76, inside(14, 76, rects))
})()

/** A column's lotus capital, `y` down, the shaft below it from there on to `bottom`. */
function column(top: number, bottom: number, broken: boolean): PixelRect[] {
	const rects: PixelRect[] = []
	if (!broken)
		rects.push(
			[1, top, 16, 2, STONE_SHADE],
			[2, top + 2, 14, 2, STONE],
			[3, top + 4, 12, 2, STONE],
			[4, top + 6, 10, 2, STONE_SHADE],
			[3, top + 2, 2, 4, STONE_LIT],
		)
	const from = broken ? top : top + 8
	for (let y = from; y < bottom; y++) {
		rects.push([4, y, 10, 1, STONE])
		rects.push([4, y, 2, 1, STONE_LIT])
		rects.push([12, y, 2, 1, STONE_SHADE])
	}
	// Its drums' joints, and a band of carving.
	for (let y = from + 7; y < bottom - 2; y += 9)
		rects.push([4, y, 10, 1, STONE_DARK])
	rects.push([4, from + 3, 10, 1, CUT], [4, from + 5, 10, 1, CUT])
	if (broken) {
		// Its top snapped off, jagged.
		rects.push([4, top, 3, 2, '#00000000'], [10, top, 4, 1, '#00000000'])
		rects.push([7, top - 2, 3, 2, STONE], [11, top - 1, 2, 1, STONE])
	}
	// Its plinth.
	rects.push([2, bottom, 14, 3, STONE_SHADE], [2, bottom, 14, 1, STONE_LIT])
	return rects
}

/** A lotus column, still standing, its capital on. 18 by 52. */
export const lotusColumn = pixelArt(18, 52, column(0, 49, false))

/** A column broken off halfway, its top in the sand. 18 by 30. */
export const brokenColumn = pixelArt(
	18,
	30,
	inside(18, 30, column(2, 27, true)),
)

/** Tumbled sandstone blocks, half in the sand, one atop another. 30 by 16. */
export const tumbledBlocks = pixelArt(30, 16, [
	// The big one, on its side.
	[0, 6, 16, 10, STONE],
	[0, 6, 16, 2, STONE_LIT],
	[13, 6, 3, 10, STONE_SHADE],
	[3, 10, 8, 1, CUT],
	// One tipped against it.
	[15, 9, 13, 7, STONE_SHADE],
	[15, 9, 13, 1, STONE],
	[26, 9, 2, 7, STONE_DARK],
	// And one on top.
	[5, 0, 10, 6, STONE],
	[5, 0, 10, 1, STONE_LIT],
	[13, 0, 2, 6, STONE_SHADE],
	// Sand drifted up round their feet.
	[0, 14, 30, 2, '#e3c486'],
])

/** A clump of desert scrub, dry and grey-green. 16 by 9. */
export const desertScrub = (() => {
	const random = seeded(5203)
	const rects: PixelRect[] = []
	for (let x = 1; x < 15; x++) {
		const h = 2 + Math.floor(random() * 6 * Math.sin((x / 15) * Math.PI))
		rects.push([x, 9 - h, 1, h, random() < 0.5 ? '#8a9a5a' : '#6f8048'])
		if (random() < 0.3) rects.push([x, 9 - h - 1, 1, 1, '#a8ae74'])
	}
	return pixelArt(16, 9, inside(16, 9, rects))
})()
