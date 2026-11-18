import { type PixelRect, pixelArt } from './pixelArt'

// Andean cloud forest and high puna plants for the Machu Picchu course, drawn
// at a cell a pixel and placed at `scale: 2`, like the rest of its scenery.

const BARK = '#5d4a35'
const BARK_LIT = '#77603f'
const BARK_DARK = '#4b3b2a'
const LEAF = '#2f6b33'
const LEAF_LIT = '#4a8a42'
const LEAF_DARK = '#255a2c'
const MOSS = '#9bb59a'
const MOSS_DARK = '#7f9a82'
const BROMELIAD_RED = '#d8443f'
const BROMELIAD_ORANGE = '#ee8a2a'
const BROMELIAD_LEAF = '#7fae48'
const ROCK = '#8d8f8c'
const ROCK_LIT = '#b3b5b0'
const ROCK_DARK = '#6a6d6b'
const BLUE_LEAF = '#2f5c55'
const BLUE_LEAF_LIT = '#47786a'
const BLUE_LEAF_DARK = '#244a45'
const BAMBOO = '#a8b84a'
const BAMBOO_LIT = '#c9d466'
const BAMBOO_DARK = '#7d9136'
const BAMBOO_LEAF = '#6f9a3c'
const STRAW = '#d6b04a'
const STRAW_LIT = '#ecd27a'
const STRAW_DARK = '#a8832e'

/** A flat-topped layer of foliage: top row lit, corners clipped, underside shaded. */
function layer(x: number, y: number, w: number, h: number): PixelRect[] {
	return [
		[x + 1, y, w - 2, 1, LEAF_LIT],
		[x, y + 1, w, h - 2, LEAF],
		[x + 1, y + h - 1, w - 2, 1, LEAF_DARK],
		[x + 3, y + 2, 2, 1, LEAF_LIT],
		[x + w - 6, y + 3, 3, 1, LEAF_DARK],
	]
}

/** Hanging strands of Spanish moss, one per [x, y, length] from a branch. */
function strands(list: [number, number, number][]): PixelRect[] {
	const rects: PixelRect[] = []
	for (const [x, y, length] of list) {
		rects.push([x, y, 1, length, MOSS])
		rects.push([x, y + length - 2, 1, 2, MOSS_DARK])
		if (length > 6) rects.push([x + 1, y, 1, length - 4, MOSS_DARK])
	}
	return rects
}

/** A bromeliad rosette, 4 cells wide: a green cup with a flower in it. */
function bromeliad(x: number, y: number, flower: string): PixelRect[] {
	return [
		[x, y + 1, 4, 2, BROMELIAD_LEAF],
		[x + 1, y, 2, 2, flower],
		[x + 1, y + 2, 2, 1, LEAF_DARK],
	]
}

/**
 * A tall cloud forest tree, slender and not a dome: a thin crooked trunk
 * most of its height, flat layers of foliage off to its sides, long strands
 * of grey-green Spanish moss hanging from the branches, and two bromeliads
 * sat in forks. 30 by 56.
 */
export const cloudForestTree = pixelArt(30, 56, [
	// Its trunk, crooked: a flare at the foot, then leaning left, then right.
	[11, 52, 9, 4, BARK_DARK],
	[13, 44, 3, 8, BARK],
	[12, 34, 3, 10, BARK],
	[14, 24, 3, 10, BARK],
	[13, 14, 3, 10, BARK],
	[14, 6, 2, 8, BARK],
	[13, 34, 1, 10, BARK_LIT],
	[15, 24, 1, 10, BARK_LIT],
	// Branches reaching out to each layer.
	[5, 30, 8, 2, BARK],
	[16, 20, 8, 2, BARK],
	[7, 16, 7, 2, BARK],
	[16, 10, 6, 2, BARK],
	[17, 38, 6, 2, BARK],
	// Its layers of foliage.
	...layer(2, 24, 12, 5),
	...layer(16, 15, 13, 5),
	...layer(2, 10, 12, 5),
	...layer(8, 1, 14, 5),
	...layer(18, 33, 11, 4),
	// Spanish moss, hanging.
	...strands([
		[3, 29, 8],
		[6, 29, 12],
		[9, 29, 6],
		[12, 29, 9],
		[17, 20, 10],
		[20, 20, 6],
		[24, 20, 13],
		[27, 20, 8],
		[4, 15, 9],
		[8, 15, 5],
		[11, 15, 11],
		[10, 6, 6],
		[15, 6, 9],
		[20, 6, 5],
		[19, 37, 6],
		[23, 37, 9],
		[27, 37, 5],
	]),
	// Bromeliads in the forks.
	...bromeliad(11, 29, BROMELIAD_RED),
	...bromeliad(15, 18, BROMELIAD_ORANGE),
	...bromeliad(22, 14, BROMELIAD_RED),
])

/**
 * A younger cloud forest tree, leaning the other way: a slim trunk, three
 * flat layers, thinner moss, one bromeliad. 22 by 40.
 */
export const cloudForestTreeSmall = pixelArt(22, 40, [
	// Its trunk, leaning right as it goes up.
	[6, 37, 8, 3, BARK_DARK],
	[8, 30, 3, 7, BARK],
	[9, 22, 3, 8, BARK],
	[10, 14, 2, 8, BARK],
	[11, 8, 2, 6, BARK],
	[8, 30, 1, 7, BARK_LIT],
	[10, 22, 1, 8, BARK_LIT],
	// Branches.
	[11, 24, 7, 2, BARK],
	[4, 17, 7, 2, BARK],
	// Its layers.
	...layer(12, 19, 10, 4),
	...layer(1, 12, 10, 4),
	...layer(8, 2, 12, 5),
	// Moss.
	...strands([
		[13, 23, 7],
		[17, 23, 10],
		[20, 23, 5],
		[3, 16, 8],
		[7, 16, 5],
		[10, 7, 6],
		[15, 7, 8],
		[18, 7, 4],
	]),
	// A bromeliad in the fork.
	...bromeliad(9, 21, BROMELIAD_RED),
])

/**
 * A queñua (Polylepis), the high Andes' tree: a gnarled, twisting,
 * many-stemmed trunk of peeling red-brown paper bark, with flecks of lighter
 * peel and small dense clumps of dark blue-green leaves. 32 by 30.
 */
export const polylepis = (() => {
	const BARK_RED = '#a4522e'
	const BARK_RED_DARK = '#7a3a22'
	const PEEL = '#d28a5a'
	const rects: PixelRect[] = [
		// Its stems, twisting up from one root.
		[13, 24, 7, 6, BARK_RED_DARK],
		[13, 20, 3, 5, BARK_RED],
		[11, 16, 3, 5, BARK_RED],
		[8, 12, 3, 5, BARK_RED],
		[18, 20, 3, 5, BARK_RED],
		[20, 15, 3, 6, BARK_RED],
		[23, 11, 3, 5, BARK_RED],
		[15, 15, 2, 6, BARK_RED_DARK],
		[16, 10, 3, 6, BARK_RED],
		[5, 9, 4, 2, BARK_RED],
		// Peeling bark, in flecks.
		[13, 21, 1, 2, PEEL],
		[11, 17, 1, 2, PEEL],
		[9, 13, 1, 2, PEEL],
		[19, 22, 1, 2, PEEL],
		[21, 16, 1, 3, PEEL],
		[24, 12, 1, 2, PEEL],
		[17, 12, 1, 2, PEEL],
		[15, 26, 2, 1, PEEL],
	]
	// Clumps of small dark leaves.
	const clump = (x: number, y: number, w: number, h: number) => {
		rects.push(
			[x + 1, y, w - 2, 1, BLUE_LEAF_LIT],
			[x, y + 1, w, h - 2, BLUE_LEAF],
			[x + 1, y + h - 1, w - 2, 1, BLUE_LEAF_DARK],
			[x + 2, y + 2, 2, 1, BLUE_LEAF_LIT],
			[x + w - 4, y + h - 2, 2, 1, BLUE_LEAF_DARK],
		)
	}
	clump(1, 4, 11, 6)
	clump(9, 0, 10, 6)
	clump(18, 3, 11, 6)
	clump(22, 8, 10, 5)
	clump(13, 8, 7, 4)
	clump(3, 10, 6, 4)
	return pixelArt(32, 30, rects)
})()

/**
 * A clump of Andean bamboo (chusquea): thin, jointed canes arching out
 * from one root, fine leaves feathering along them, yellow-green. 24 by 34.
 */
export const bamboo = (() => {
	const rects: PixelRect[] = [[10, 31, 5, 3, BAMBOO_DARK]]
	/** [height, drift]: each cane rises from the root and arches out `drift` cells. */
	const canes: [number, number][] = [
		[26, -11],
		[30, -7],
		[33, -3],
		[33, 3],
		[30, 7],
		[26, 11],
	]
	for (const [height, drift] of canes) {
		for (let t = 0; t < height; t++) {
			const f = t / height
			const x = Math.round(12 + drift * f ** 1.8)
			const y = 31 - t
			rects.push([x, y, 1, 1, t % 6 === 5 ? BAMBOO_DARK : BAMBOO])
			if (t % 6 !== 5 && t % 2 === 0) rects.push([x + 1, y, 1, 1, BAMBOO_LIT])
			// Fine leaves feathering off the upper cane, outward.
			if (t > height * 0.4 && t % 3 === 0) {
				const side = drift < 0 ? -1 : 1
				rects.push([x + (side < 0 ? -2 : 1), y, 2, 1, BAMBOO_LEAF])
				rects.push([x + (side < 0 ? 1 : -2), y - 1, 1, 1, BAMBOO_LEAF])
			}
		}
	}
	return pixelArt(24, 34, rects)
})()

/**
 * A puya, the puna's agave-like rosette: stiff grey-green spiked leaves
 * round its foot, a tall flower spike up out of it set with
 * greenish-cream flowers. 14 by 36.
 */
export const puya = (() => {
	const PUYA = '#6f8a6a'
	const PUYA_LIT = '#8fa88a'
	const PUYA_DARK = '#51694e'
	const SPIKE = '#7d8a5a'
	const FLOWER = '#dfe2a8'
	const FLOWER_DARK = '#b9c27c'
	return pixelArt(14, 36, [
		// Its flower spike, set with flowers.
		[6, 12, 2, 16, SPIKE],
		[6, 4, 2, 8, SPIKE],
		[5, 2, 4, 3, FLOWER],
		[4, 6, 2, 2, FLOWER],
		[8, 6, 2, 2, FLOWER],
		[8, 10, 2, 2, FLOWER],
		[4, 11, 2, 2, FLOWER],
		[8, 15, 2, 2, FLOWER],
		[4, 17, 2, 2, FLOWER_DARK],
		[6, 0, 2, 3, FLOWER_DARK],
		// Its rosette: stiff blades fanning out and up from the foot.
		[0, 27, 3, 2, PUYA_LIT],
		[11, 27, 3, 2, PUYA_LIT],
		[1, 28, 4, 2, PUYA],
		[9, 28, 4, 2, PUYA],
		[2, 24, 2, 3, PUYA],
		[10, 24, 2, 3, PUYA],
		[3, 25, 2, 4, PUYA_LIT],
		[9, 25, 2, 4, PUYA_LIT],
		[4, 22, 2, 8, PUYA],
		[8, 22, 2, 8, PUYA],
		[6, 21, 2, 10, PUYA_LIT],
		[0, 30, 14, 2, PUYA],
		[1, 32, 12, 2, PUYA_DARK],
		[3, 34, 8, 2, PUYA_DARK],
		[5, 29, 4, 3, PUYA_DARK],
		// Pale spines at the blade tips.
		[0, 26, 1, 1, FLOWER],
		[13, 26, 1, 1, FLOWER],
		[2, 23, 1, 1, FLOWER],
		[11, 23, 1, 1, FLOWER],
		[4, 21, 1, 1, FLOWER],
		[9, 21, 1, 1, FLOWER],
		[6, 20, 2, 1, FLOWER],
	])
})()

/**
 * A mossy granite boulder with bromeliads, red and orange, and small ferns
 * growing on it. 22 by 14.
 */
export const bromeliadRock = pixelArt(22, 14, [
	// The boulder, lit on top.
	[2, 7, 18, 7, ROCK],
	[4, 5, 14, 3, ROCK],
	[6, 4, 9, 2, ROCK_LIT],
	[4, 6, 3, 1, ROCK_LIT],
	[2, 12, 18, 2, ROCK_DARK],
	[14, 9, 5, 3, ROCK_DARK],
	// Moss across its shoulder.
	[5, 6, 5, 2, LEAF_LIT],
	[14, 6, 4, 2, LEAF],
	[2, 10, 3, 2, LEAF],
	// Bromeliads.
	...bromeliad(6, 1, BROMELIAD_RED),
	...bromeliad(15, 3, BROMELIAD_ORANGE),
	...bromeliad(1, 6, BROMELIAD_ORANGE),
	// Small ferns.
	[11, 2, 1, 3, LEAF],
	[10, 1, 1, 2, LEAF_LIT],
	[12, 1, 1, 2, LEAF_LIT],
	[9, 4, 2, 1, LEAF],
	[19, 5, 1, 3, LEAF],
	[18, 4, 1, 2, LEAF_LIT],
	[20, 4, 1, 2, LEAF_LIT],
])

/**
 * A tussock of ichu, the puna's golden bunchgrass: fine stiff blades
 * fanning up and out, straw gold, green at the base. 14 by 10.
 */
export const ichuGrass = pixelArt(14, 10, [
	// Blades, fanning.
	[1, 3, 1, 5, STRAW],
	[3, 1, 1, 7, STRAW_LIT],
	[5, 0, 1, 8, STRAW],
	[7, 0, 1, 8, STRAW_LIT],
	[9, 1, 1, 7, STRAW],
	[11, 2, 1, 6, STRAW_LIT],
	[13, 4, 1, 4, STRAW],
	[2, 4, 1, 4, STRAW_DARK],
	[4, 3, 1, 5, STRAW_DARK],
	[6, 2, 1, 6, STRAW_DARK],
	[8, 3, 1, 5, STRAW_DARK],
	[10, 4, 1, 4, STRAW_DARK],
	[12, 5, 1, 3, STRAW_DARK],
	[0, 5, 1, 3, STRAW_DARK],
	// Its green base.
	[1, 7, 12, 2, '#6f9440'],
	[2, 9, 10, 1, '#4f7a32'],
])
