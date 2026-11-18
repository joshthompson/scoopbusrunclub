import { type PixelRect, pixelArt } from './pixelArt'

/**
 * What's about along Midnattsloppet's roadside, in the dark: sailboats at
 * anchor out on the water, a bench and a lifebuoy on the quay; bikes
 * chained up, a café table with a candle out on the pavement, and a couple
 * of onlookers cheering the runners past. Drawn at scale 2.
 */

const INK = '#15161b'
const IRON = '#2a2d36'
const IRON_LIT = '#454956'
const WARM = '#ffd98a'
const WARM_HALO = '#ffd76a16'

// --- On the water -----------------------------------------------------------

const HULL = '#2f3a52'
const HULL_LIT = '#47587a'
const HULL_STRIPE = '#8e97ad'
const SAIL = '#7f89a2'
const SAIL_SHADE = '#5f6982'
const MAST = '#a4aab8'

/**
 * A sailboat at anchor, bow to the right: its sails furled to a dim
 * triangle each side of the mast, a masthead light, a cabin window lit.
 * 38 by 46.
 */
export const sailboat = (() => {
	const r: PixelRect[] = []
	// The mast, and the light at its head.
	r.push([18, 3, 1, 36, MAST])
	r.push([17, 1, 3, 2, WARM_HALO])
	r.push([18, 2, 1, 1, WARM])
	// The mainsail behind it, wider towards the boom.
	for (let y = 6; y < 34; y++) {
		const w = Math.round((y - 6) * 0.27) + 1
		r.push([18 - w, y, w, 1, y % 7 === 0 ? SAIL_SHADE : SAIL])
	}
	r.push([8, 34, 11, 1, MAST])
	// The jib, from the masthead down to the bow.
	for (let y = 9; y < 36; y++) {
		const w = Math.round((y - 9) * 0.5) + 1
		r.push([20, y, w, 1, y % 8 === 0 ? SAIL_SHADE : SAIL])
	}
	// The hull, a pale stripe along it, and a cabin window lit.
	r.push([3, 37, 34, 2, HULL_LIT])
	r.push([2, 39, 34, 3, HULL])
	r.push([4, 42, 29, 2, HULL])
	r.push([5, 44, 25, 1, INK])
	r.push([3, 39, 32, 1, HULL_STRIPE])
	r.push([14, 36, 8, 2, HULL_LIT])
	r.push([16, 36, 3, 1, WARM])
	return pixelArt(38, 46, r)
})()

// --- On the quay ------------------------------------------------------------

const SLAT = '#5b4733'
const SLAT_LIT = '#7a6048'

/** A bench along the quay, to look out over the water from. 24 by 12. */
export const quayBench = pixelArt(24, 12, [
	// Its back, two slats, and its seat.
	[1, 1, 22, 1, SLAT_LIT],
	[1, 2, 22, 2, SLAT],
	[1, 5, 22, 1, SLAT_LIT],
	[1, 6, 22, 2, SLAT],
	// Its iron ends: arm, and legs.
	[1, 1, 1, 10, IRON],
	[22, 1, 1, 10, IRON],
	[3, 8, 1, 3, IRON],
	[20, 8, 1, 3, IRON],
	[1, 11, 3, 1, IRON_LIT],
	[20, 11, 3, 1, IRON_LIT],
])

/** A lifebuoy on its post, for whoever goes in: red and white. 10 by 24. */
export const lifebuoy = pixelArt(10, 24, [
	[4, 8, 2, 16, IRON],
	[3, 22, 4, 2, IRON_LIT],
	// Its ring, an octagon, banded in quarters.
	[3, 0, 4, 1, '#c8c8d0'],
	[1, 1, 8, 1, '#d8443a'],
	[0, 2, 10, 2, '#d8443a'],
	[0, 4, 10, 2, '#d8d8e0'],
	[0, 6, 10, 2, '#d8443a'],
	[1, 8, 8, 1, '#a8322c'],
	// Its hole.
	[3, 3, 4, 4, '#1a1d2e'],
	[4, 2, 2, 6, '#1a1d2e'],
])

// --- On the pavement --------------------------------------------------------

const WHEEL = '#1d1f27'
const FRAMES = ['#a8323c', '#2f6aa8', '#3f7a4a']

/** A bike rack, three bikes chained to it, each its own colour. 40 by 14. */
export const bikeRack = (() => {
	const r: PixelRect[] = []
	FRAMES.forEach((frame, i) => {
		const ox = i * 13
		// Two wheels, rings of tyre, close together.
		for (const cx of [4, 10])
			for (let a = 0; a < 20; a++) {
				const t = (a / 20) * Math.PI * 2
				r.push([
					Math.round(ox + cx + Math.cos(t) * 3.6),
					Math.round(8 + Math.sin(t) * 3.6),
					1,
					1,
					WHEEL,
				])
			}
		r.push(
			[ox + 4, 7, 6, 1, frame],
			[ox + 8, 3, 1, 5, frame],
			[ox + 5, 4, 4, 1, frame],
			[ox + 7, 1, 3, 1, WHEEL],
			[ox + 10, 2, 1, 3, WHEEL],
		)
	})
	// The rail they're chained to, its feet.
	r.push([0, 12, 40, 1, IRON_LIT], [0, 12, 1, 2, IRON], [39, 12, 1, 2, IRON])
	return pixelArt(
		40,
		14,
		r.filter(([x, y]) => x >= 0 && x < 40 && y >= 0 && y < 14),
	)
})()

const TABLE = '#3a3e4c'

/**
 * A café table out on the pavement, a candle lit on it in a glass, a
 * chair either side, the light of it faint over the table. 26 by 18.
 */
export const candleTable = pixelArt(26, 18, [
	// The glow, and its flame.
	[7, 0, 12, 7, WARM_HALO],
	[9, 1, 8, 5, WARM_HALO],
	[12, 2, 2, 2, WARM],
	[12, 4, 2, 2, '#7a6038'],
	// The top, and its lit rim.
	[8, 6, 10, 1, '#5a5f70'],
	[8, 7, 10, 1, TABLE],
	// Its foot.
	[12, 8, 2, 8, IRON],
	[9, 16, 8, 1, IRON_LIT],
	// Chairs: a back, a seat, legs.
	[1, 4, 1, 13, IRON],
	[1, 10, 5, 1, IRON_LIT],
	[5, 11, 1, 6, IRON],
	[24, 4, 1, 13, IRON],
	[20, 10, 5, 1, IRON_LIT],
	[20, 11, 1, 6, IRON],
])

const SKIN = '#c89a78'
const SKIN_SHADE = '#a07a5c'
const TROUSERS = '#23252f'

/**
 * Onlookers on the kerb, cheering, arms up: one in a yellow rain jacket,
 * one in a grey hoodie. 22 by 26.
 */
export const onlookers = (() => {
	const r: PixelRect[] = []
	const person = (
		x: number,
		top: string,
		topShade: string,
		hair: string,
		up: number,
	) => {
		// Arms up, either side of the head, hands open.
		r.push([x, up, 2, 9, topShade], [x + 8, up, 2, 9, topShade])
		r.push([x, up - 2, 2, 2, SKIN], [x + 8, up - 2, 2, 2, SKIN])
		// Head, its hair over the top.
		r.push([x + 3, 6, 4, 5, SKIN], [x + 6, 6, 1, 5, SKIN_SHADE])
		r.push([x + 3, 5, 4, 2, hair])
		// Jacket, shaded down its far side, then trousers and shoes.
		r.push([x + 2, 11, 6, 9, top], [x + 6, 11, 2, 9, topShade])
		r.push([x + 2, 20, 6, 5, TROUSERS])
		r.push([x + 5, 20, 1, 5, INK])
		r.push([x + 2, 25, 3, 1, INK], [x + 5, 25, 3, 1, INK])
	}
	person(1, '#d8b83a', '#a88a28', '#3a2c20', 2)
	person(11, '#6b7080', '#4b4f5e', '#b89a58', 4)
	return pixelArt(22, 26, r)
})()
