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
