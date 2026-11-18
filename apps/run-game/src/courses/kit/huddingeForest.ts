import { type PixelRect, pixelArt } from './pixelArt'
import { seeded } from './seeded'

/**
 * Huddinge's own forest, in place of Haga's park trees: Swedish spruce and
 * Scots pine, granite boulders the ice left, grown over with moss, and the
 * forest floor's blueberry bushes, ferns and an anthill. Drawn at scale 2.
 */

const NEEDLES = '#2f5a3a'
const NEEDLES_LIT = '#44774a'
const NEEDLES_DARK = '#1f3f2a'
const BARK = '#5a4030'
const PINE_BARK = '#b86a3e'
const PINE_BARK_LIT = '#d88a52'

/** Keeps a piece's rects inside its picture. */
const inside = (w: number, h: number, rects: PixelRect[]) =>
	rects.filter(([x, y]) => x >= 0 && x < w && y >= 0 && y < h)

/**
 * A Norway spruce: a narrow dark spire, tier on tier of drooping
 * branches, ragged at their tips, down nearly to the ground. 28 by 58.
 */
function spruce(seed: number) {
	const random = seeded(seed)
	const W = 28
	const H = 58
	const rects: PixelRect[] = [[13, 50, 2, 8, BARK]]
	for (let y = 0; y < 52; y++) {
		// Wider going down, in tiers: each tier's bottom wider than its top.
		const tier = (y % 7) / 7
		const half = Math.round(1 + (y / 52) * 10 + tier * 3)
		const from = 14 - half
		rects.push([from, y, half * 2, 1, NEEDLES])
		rects.push([from, y, Math.max(1, Math.round(half * 0.6)), 1, NEEDLES_LIT])
		rects.push([14 + half - 2, y, 2, 1, NEEDLES_DARK])
		// Ragged tips, drooping at the bottom of each tier.
		if (tier > 0.7) {
			if (random() < 0.7) rects.push([from - 1, y + 1, 1, 1, NEEDLES_DARK])
			if (random() < 0.7) rects.push([14 + half, y + 1, 1, 1, NEEDLES_DARK])
		}
		if (random() < 0.15)
			rects.push([
				from + Math.floor(random() * half * 2),
				y,
				1,
				1,
				NEEDLES_DARK,
			])
	}
	return pixelArt(W, H, inside(W, H, rects))
}

export const spruceA = spruce(4101)
export const spruceB = spruce(4177)

/**
 * A Scots pine: a tall straight trunk, orange-red bark high up, grey-brown
 * low down, and a flat-topped umbrella of dark clumps right at the top.
 * 30 by 64.
 */
export const scotsPine = (() => {
	const random = seeded(4211)
	const W = 30
	const H = 64
	const rects: PixelRect[] = [
		[14, 14, 3, 50, PINE_BARK],
		[14, 14, 1, 50, PINE_BARK_LIT],
		[14, 44, 3, 20, '#7a5a44'],
		[13, 60, 5, 4, '#5e4636'],
		// Branches up to its clumps.
		[9, 12, 5, 1, PINE_BARK],
		[17, 9, 6, 1, PINE_BARK],
		[11, 18, 3, 1, PINE_BARK],
	]
	for (const [cx, cy, rx, ry] of [
		[8, 7, 7, 4],
		[17, 5, 9, 5],
		[23, 12, 6, 4],
		[9, 15, 7, 4],
		[20, 19, 6, 3],
		[12, 24, 6, 3],
		[17, 30, 4, 2],
	])
		for (let y = -ry; y <= ry; y++)
			for (let x = -rx; x <= rx; x++) {
				const d = (x / rx) ** 2 + (y / ry) ** 2
				if (d > 1 || (d > 0.6 && random() < 0.4)) continue
				rects.push([
					cx + x,
					cy + y,
					1,
					1,
					y < 0 && x < 0 ? NEEDLES_LIT : y > 0 ? NEEDLES_DARK : NEEDLES,
				])
			}
	return pixelArt(W, H, inside(W, H, rects))
})()

const GRANITE = '#8d8a86'
const GRANITE_LIT = '#aeaba6'
const GRANITE_DARK = '#646260'
const MOSS = '#6e9a3c'
const MOSS_LIT = '#8fb84e'

/** A granite boulder, rounded by the ice, moss over its top and a fleck of lichen. 26 by 14. */
export const mossyBoulder = (() => {
	const random = seeded(4303)
	const rects: PixelRect[] = []
	for (let y = 0; y < 14; y++) {
		const half = Math.round(13 * Math.sqrt(1 - ((13 - y) / 14) ** 2))
		rects.push([13 - half, y, half * 2, 1, GRANITE])
		rects.push([13 - half, y, Math.round(half * 0.7), 1, GRANITE_LIT])
		rects.push([13 + half - 3, y, 3, 1, GRANITE_DARK])
		// Moss over its top, ragged where it gives out.
		if (y < 6) {
			const moss = Math.round(half * (1 - y / 8))
			rects.push([13 - moss, y, moss * 2, 1, y < 2 ? MOSS_LIT : MOSS])
		}
		if (random() < 0.3)
			rects.push([
				13 - half + Math.floor(random() * half * 2),
				y,
				1,
				1,
				GRANITE_DARK,
			])
	}
	rects.push([16, 8, 2, 1, '#c9c46a'], [8, 10, 1, 1, '#c9c46a'])
	return pixelArt(26, 14, inside(26, 14, rects))
})()

/** Blåbärsris: a low blueberry bush, berries in it. 16 by 8. */
export const blueberryBush = (() => {
	const random = seeded(4409)
	const rects: PixelRect[] = []
	for (let x = 0; x < 16; x++) {
		const h = 3 + Math.floor(random() * 5)
		rects.push([x, 8 - h, 1, h, random() < 0.5 ? '#4f7d34' : '#3e6a2a'])
		if (random() < 0.3) rects.push([x, 8 - h, 1, 1, '#6c9a40'])
		if (random() < 0.25) rects.push([x, 8 - h + 2, 1, 1, '#3a4a9a'])
	}
	return pixelArt(16, 8, rects)
})()

/** A fern, its fronds arching out either way. 18 by 10. */
export const fern = pixelArt(18, 10, [
	[8, 1, 2, 9, '#4a7a2e'],
	[2, 3, 6, 1, '#5e9238'],
	[0, 4, 3, 1, '#5e9238'],
	[10, 2, 6, 1, '#5e9238'],
	[15, 3, 3, 1, '#5e9238'],
	[3, 6, 5, 1, '#4a7a2e'],
	[1, 7, 2, 1, '#4a7a2e'],
	[10, 5, 5, 1, '#4a7a2e'],
	[14, 6, 3, 1, '#4a7a2e'],
	[4, 2, 1, 1, '#76aa48'],
	[12, 1, 1, 1, '#76aa48'],
])

/** A myrstack: a wood ants' anthill, a mound of needles, ants on it. 20 by 12. */
export const anthill = (() => {
	const random = seeded(4507)
	const rects: PixelRect[] = []
	for (let y = 0; y < 12; y++) {
		const half = Math.round(10 * Math.sqrt(1 - ((11 - y) / 12) ** 2))
		rects.push([10 - half, y, half * 2, 1, '#8a6a42'])
		rects.push([10 - half, y, Math.round(half * 0.6), 1, '#a5824f'])
		for (let i = 0; i < half; i++)
			if (random() < 0.3)
				rects.push([
					10 - half + Math.floor(random() * half * 2),
					y,
					1,
					1,
					random() < 0.5 ? '#6a4e30' : '#2a1e14',
				])
	}
	return pixelArt(20, 12, inside(20, 12, rects))
})()
