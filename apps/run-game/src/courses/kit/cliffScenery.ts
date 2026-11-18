import { type PixelRect, pixelArt, svgUrl } from './pixelArt'

/**
 * The Cliff's scenery, drawn in code: the sea out to the horizon, islands
 * far off on it; a lighthouse and a windsock on the cliff top; and on the
 * island, a beach umbrella, a sandcastle and a deckchair.
 */

/** The sea far off, under the sky, and on down: a colour each. */
export const SEA_FAR = '#5aa6d6'
export const SEA_NEAR = '#3f93cf'

/**
 * The horizon's far band: islands, a long way off, on the sea, and the sea
 * under them. 320 by 160, its sea from 128 down.
 */
export const seaFar = svgUrl(
	320,
	160,
	[
		// Islands, hazy with distance.
		'<polygon points="18,128 34,118 52,114 70,120 84,128" fill="#8fb3c9"/>',
		'<polygon points="150,128 160,123 176,121 190,126 196,128" fill="#9dbdd0"/>',
		'<polygon points="236,128 252,112 266,108 280,116 298,128" fill="#87abc2"/>',
		'<rect x="262" y="104" width="4" height="6" fill="#87abc2"/>',
		`<rect y="128" width="320" height="32" fill="${SEA_FAR}"/>`,
		'<rect y="128" width="320" height="2" fill="#a9d4ee"/>',
		'<rect x="40" y="136" width="18" height="2" fill="#7dbbe2"/>',
		'<rect x="200" y="146" width="24" height="2" fill="#7dbbe2"/>',
	].join(''),
)

/**
 * The near band: the sea, nearer, whitecaps on it, darker coming in. 256 by
 * 160, its sea from 68 down, level with the far band's.
 */
export const seaNear = svgUrl(
	256,
	160,
	[
		`<rect y="68" width="256" height="92" fill="${SEA_NEAR}"/>`,
		`<rect y="68" width="256" height="10" fill="${SEA_FAR}"/>`,
		...[
			[12, 84, 10],
			[90, 90, 14],
			[170, 82, 8],
			[220, 98, 12],
			[40, 108, 16],
			[130, 116, 12],
			[200, 130, 18],
			[70, 140, 14],
			[10, 152, 20],
			[150, 150, 16],
		].map(
			([x, y, w]) =>
				`<rect x="${x}" y="${y}" width="${w}" height="2" fill="#e6f4ff" opacity="0.75"/>`,
		),
	].join(''),
)

/** A lighthouse, striped, its lamp lit: 14 by 44. */
export const lighthouse = pixelArt(14, 44, [
	// Its lamp room, roof and rail.
	[5, 0, 4, 2, '#3a3a3a'],
	[3, 2, 8, 2, '#3a3a3a'],
	[4, 4, 6, 4, '#ffe680'],
	[4, 4, 1, 4, '#3a3a3a'],
	[9, 4, 1, 4, '#3a3a3a'],
	[2, 8, 10, 2, '#3a3a3a'],
	// Its tower, widening down, red and white.
	...Array.from({ length: 6 }, (_, i): PixelRect => {
		const top = 10 + i * 5
		const inset = Math.max(0, 3 - Math.floor(i / 2))
		return [inset, top, 14 - inset * 2, 5, i % 2 ? '#f6f7f8' : '#d63a31']
	}),
	[6, 18, 2, 3, '#3a3a3a'],
	// Its door.
	[6, 37, 2, 3, '#3a3a3a'],
	[0, 40, 14, 4, '#9a8f80'],
])

/** A windsock on its pole, blowing out over the sea: 22 by 34. */
export const windsock = pixelArt(22, 34, [
	[2, 0, 2, 34, '#5a5a5a'],
	[4, 2, 4, 6, '#f26b1d'],
	[8, 3, 4, 5, '#f6f7f8'],
	[12, 4, 4, 4, '#f26b1d'],
	[16, 5, 4, 3, '#f6f7f8'],
	[0, 32, 6, 2, '#3a3a3a'],
])

/** A beach umbrella, striped, stuck in the sand: 30 by 34. */
export const umbrella = pixelArt(30, 34, [
	[14, 0, 2, 2, '#3a3a3a'],
	[8, 2, 14, 2, '#e8473c'],
	[4, 4, 22, 2, '#f6f7f8'],
	[1, 6, 28, 3, '#e8473c'],
	...[2, 8, 14, 20, 26].map((x): PixelRect => [x, 6, 2, 3, '#f6f7f8']),
	[0, 9, 30, 1, '#a8302a'],
	[14, 9, 2, 25, '#7a6a55'],
])

/** A sandcastle, a flag on its tower: 24 by 20. */
export const sandcastle = pixelArt(24, 20, [
	[11, 0, 1, 6, '#5a5a5a'],
	[12, 0, 4, 3, '#e8473c'],
	[8, 6, 8, 6, '#d9b46a'],
	[8, 5, 2, 1, '#d9b46a'],
	[11, 5, 2, 1, '#d9b46a'],
	[14, 5, 2, 1, '#d9b46a'],
	[2, 10, 4, 4, '#d9b46a'],
	[18, 10, 4, 4, '#d9b46a'],
	[0, 12, 24, 8, '#d9b46a'],
	[10, 15, 4, 5, '#a8823e'],
	[0, 18, 24, 2, '#c49d52'],
])

/**
 * The sandcastle, flattened: a heap of sand, its flag lying across it. As
 * big as the castle, so it's drawn in the same box, its heap along the
 * bottom.
 */
const flattened = pixelArt(24, 20, [
	[7, 13, 9, 1, '#d9b46a'],
	[3, 14, 17, 2, '#d9b46a'],
	[1, 16, 22, 2, '#d9b46a'],
	[0, 18, 24, 2, '#c49d52'],
	[9, 16, 5, 2, '#a8823e'],
	// Its flag, fallen.
	[13, 12, 7, 1, '#5a5a5a'],
	[19, 10, 4, 2, '#e8473c'],
])

/**
 * A sandcastle, out on the island's beach in the way, as The Cliff's in
 * place of a traffic cone: run into it and it's flattened, slowing you a
 * little. The beach's own, at the same size. World pixels.
 */
export const SANDCASTLE = {
	asset: sandcastle,
	width: 48,
	height: 40,
	name: 'Sandcastles',
	crumbled: flattened,
	word: 'Crumble!',
}

/** A deckchair, striped canvas on a wooden frame: 20 by 18. */
export const deckchair = pixelArt(20, 18, [
	[2, 16, 2, 2, '#7a5a35'],
	[14, 16, 2, 2, '#7a5a35'],
	[4, 2, 2, 14, '#7a5a35'],
	[6, 4, 2, 10, '#2f86c4'],
	[8, 6, 2, 8, '#f6f7f8'],
	[10, 8, 2, 6, '#2f86c4'],
	[12, 10, 2, 4, '#f6f7f8'],
	[4, 14, 12, 2, '#7a5a35'],
])

const GRANITE = '#9a8e88'
const GRANITE_LIT = '#bcb0a8'
const GRANITE_PINK = '#b8948a'
const GRANITE_DARK = '#6e6460'
const TUFT = '#7aa04a'

/** A granite hump, `w` wide and `h` high, rounded, lit from the left, at `x0`. */
function hump(x0: number, w: number, h: number, H: number): PixelRect[] {
	const rects: PixelRect[] = []
	for (let y = 0; y < h; y++) {
		const half = Math.round((w / 2) * Math.sqrt(1 - ((h - 1 - y) / h) ** 2))
		const cx = x0 + w / 2
		const top = H - h + y
		rects.push([Math.round(cx - half), top, half * 2, 1, GRANITE])
		rects.push([
			Math.round(cx - half),
			top,
			Math.round(half * 0.6),
			1,
			GRANITE_LIT,
		])
		rects.push([Math.round(cx + half - 3), top, 3, 1, GRANITE_DARK])
		if (y % 3 === 1)
			rects.push([Math.round(cx - half / 3), top, 2, 1, GRANITE_PINK])
	}
	return rects
}

/**
 * A skerry: a low granite islet, smoothed by the ice, a red fishing hut
 * on it with a white trim, a flagpole and tufts of grass, and the sea
 * lapping its foot. 70 by 30.
 */
export const skerry = pixelArt(70, 30, [
	...hump(0, 70, 14, 28),
	...hump(10, 34, 18, 28),
	// Grass in its hollows.
	[16, 11, 6, 1, TUFT],
	[44, 16, 8, 1, TUFT],
	// The hut, Falu red, white corners and a black roof.
	[20, 2, 14, 2, '#2a2420'],
	[18, 4, 18, 1, '#2a2420'],
	[20, 5, 14, 8, '#a8322a'],
	[20, 5, 1, 8, '#f4f1ea'],
	[33, 5, 1, 8, '#f4f1ea'],
	[25, 8, 4, 5, '#5a1e18'],
	[30, 7, 2, 2, '#f4f1ea'],
	// A flagpole, the flag out.
	[40, 0, 1, 12, '#f4f1ea'],
	[41, 0, 5, 3, '#3a6fd8'],
	[41, 1, 5, 1, '#f0c832'],
	[43, 0, 1, 3, '#f0c832'],
	// The sea at its foot, a line of foam.
	[0, 28, 70, 2, 'rgba(255, 255, 255, 0.55)'],
])

/** A bare little skerry, two grey seals hauled out on it. 36 by 16. */
export const sealRock = pixelArt(36, 16, [
	...hump(0, 36, 8, 14),
	// A seal, lying along it, head up.
	[4, 3, 12, 3, '#5e6066'],
	[4, 3, 12, 1, '#7e8086'],
	[15, 1, 4, 3, '#5e6066'],
	[18, 2, 1, 1, '#1c1c1c'],
	[2, 4, 3, 1, '#4a4c52'],
	// Another, flat out.
	[21, 5, 11, 2, '#6a6c72'],
	[21, 5, 11, 1, '#8a8c92'],
	[31, 4, 3, 2, '#6a6c72'],
	[19, 6, 2, 1, '#4a4c52'],
	[0, 14, 36, 2, 'rgba(255, 255, 255, 0.55)'],
])

/** A channel marker buoy, red, a cone on top. 6 by 18. */
export const buoy = pixelArt(6, 18, [
	[2, 0, 2, 2, '#c8302a'],
	[1, 2, 4, 2, '#c8302a'],
	[2, 4, 2, 6, '#2a2420'],
	[1, 10, 4, 6, '#d8443a'],
	[1, 10, 1, 6, '#f06a5a'],
	[0, 16, 6, 2, 'rgba(255, 255, 255, 0.6)'],
])

/** Thrift, sea pinks, a cushion of them on the cliff top. 12 by 8. */
export const thrift = pixelArt(12, 8, [
	[1, 4, 10, 4, '#5e8a3a'],
	[2, 1, 2, 2, '#e88ab8'],
	[5, 0, 2, 2, '#f0a0c8'],
	[8, 1, 2, 2, '#e88ab8'],
	[3, 3, 1, 1, '#4a7a2e'],
	[6, 2, 1, 2, '#4a7a2e'],
	[9, 3, 1, 1, '#4a7a2e'],
])

/** Lyme grass, blue-green, leaning in the wind off the sea. 12 by 12. */
export const lymeGrass = pixelArt(12, 12, [
	[2, 4, 1, 8, '#7aa8a0'],
	[3, 2, 1, 3, '#7aa8a0'],
	[5, 3, 1, 9, '#8ab8ae'],
	[6, 1, 1, 3, '#8ab8ae'],
	[8, 5, 1, 7, '#6a9890'],
	[9, 3, 1, 3, '#6a9890'],
	[1, 11, 10, 1, '#5e8a80'],
])
