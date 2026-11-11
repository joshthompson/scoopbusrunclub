import { type PixelRect, pixelArt, svgUrl } from './pixelArt'

/**
 * The Sewers' scenery, drawn in code: roadworks on the street, and under
 * it, the folk who live down there, their shacks and stalls and fires, and
 * the pipes and crates of a building site gone underground.
 */

// --- On the street ------------------------------------------------------------

/** A traffic cone: 8 by 11. */
export const cone = pixelArt(8, 11, [
	[3, 0, 2, 2, '#f26b1d'],
	[2, 2, 4, 2, '#f4f4f4'],
	[2, 4, 4, 3, '#f26b1d'],
	[1, 7, 6, 2, '#f4f4f4'],
	[0, 9, 8, 2, '#3a3a3a'],
])

/** A roadworks sign on its stand: 18 by 30. */
export const roadworksSign = pixelArt(18, 30, [
	[8, 16, 2, 14, '#5a5a5a'],
	[3, 28, 12, 2, '#3a3a3a'],
	// A red triangle, a digger in it.
	[8, 0, 2, 2, '#d22b2b'],
	[6, 2, 6, 2, '#d22b2b'],
	[4, 4, 10, 2, '#d22b2b'],
	[2, 6, 14, 2, '#d22b2b'],
	[0, 8, 18, 8, '#d22b2b'],
	[3, 8, 12, 6, '#f4f4f4'],
	[7, 6, 4, 2, '#f4f4f4'],
	[5, 10, 6, 3, '#1d1d1d'],
	[11, 9, 2, 2, '#1d1d1d'],
	[6, 13, 2, 1, '#1d1d1d'],
	[9, 13, 2, 1, '#1d1d1d'],
])

/** The road block across the street past the manhole, ROAD CLOSED on it: 80 by 40, as drawn. */
export const ROAD_BLOCK_WIDTH = 80
export const ROAD_BLOCK_HEIGHT = 40
export const roadBlock = (() => {
	const stripes = Array.from(
		{ length: 10 },
		(_, i) =>
			`<polygon points="${i * 10 - 6},0 ${i * 10},0 ${i * 10 - 8},12 ${i * 10 - 14},12" fill="#d22b2b"/>`,
	).join('')
	return svgUrl(
		ROAD_BLOCK_WIDTH,
		ROAD_BLOCK_HEIGHT,
		[
			// Its legs.
			'<rect x="6" y="12" width="4" height="28" fill="#5a5a5a"/>',
			'<rect x="70" y="12" width="4" height="28" fill="#5a5a5a"/>',
			// Its board, striped red and white.
			'<svg x="0" y="2" width="80" height="12"><rect width="80" height="12" fill="#f4f4f4"/>',
			stripes,
			'</svg>',
			// ROAD CLOSED, on a panel.
			'<rect x="14" y="16" width="52" height="14" fill="#f4f4f4"/>',
			'<rect x="14" y="16" width="52" height="2" fill="#d22b2b"/>',
			'<text x="40" y="28" font-family="monospace" font-weight="bold" font-size="9" text-anchor="middle" fill="#1d1d1d">ROAD CLOSED</text>',
			// Its lamps, lit.
			'<rect x="4" y="0" width="6" height="4" fill="#ffb02e"/>',
			'<rect x="70" y="0" width="6" height="4" fill="#ffb02e"/>',
		].join(''),
	)
})()

// --- Down the manhole and out of the Giant Vent ----------------------------

/** Brick, dark and wet: a sewer's walls. */
const brick = (id: string, light: string, dark: string, mortar: string) =>
	`<defs><pattern id="${id}" patternUnits="userSpaceOnUse" width="24" height="16"><rect width="24" height="16" fill="${mortar}"/><rect x="0" y="0" width="11" height="7" fill="${light}"/><rect x="12" y="0" width="12" height="7" fill="${dark}"/><rect x="-6" y="8" width="11" height="7" fill="${dark}"/><rect x="6" y="8" width="11" height="7" fill="${light}"/><rect x="18" y="8" width="11" height="7" fill="${dark}"/></pattern></defs>`

/**
 * The manhole's shaft, from the street down to the sewer: its back wall,
 * brick, a ladder down it, `width` by `height`.
 */
export function manholeShaft(width: number, height: number) {
	const rungs = Array.from(
		{ length: Math.floor(height / 18) },
		(_, i) =>
			`<rect x="${width / 2 - 14}" y="${8 + i * 18}" width="28" height="3" fill="#8a8f94"/>`,
	).join('')
	return svgUrl(
		width,
		height,
		`${brick('b', '#3b3f37', '#30342d', '#1f221c')}<rect width="${width}" height="${height}" fill="url(#b)"/><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></linearGradient><rect width="${width}" height="${height}" fill="url(#g)"/><rect x="${width / 2 - 16}" y="0" width="3" height="${height}" fill="#6f747a"/><rect x="${width / 2 + 13}" y="0" width="3" height="${height}" fill="#6f747a"/>${rungs}`,
	)
}

/**
 * The Giant Vent's shaft, up from the sewer to the street: riveted steel
 * panels, a great duct, `width` by `height`.
 */
export function ventShaft(width: number, height: number) {
	const panels = Array.from({ length: Math.ceil(height / 40) }, (_, i) =>
		[
			`<rect x="0" y="${i * 40}" width="${width}" height="3" fill="#2b3036"/>`,
			...Array.from(
				{ length: Math.ceil(width / 40) },
				(_, j) =>
					`<rect x="${j * 40 + 6}" y="${i * 40 + 8}" width="3" height="3" fill="#7d868f"/>`,
			),
		].join(''),
	).join('')
	return svgUrl(
		width,
		height,
		`<rect width="${width}" height="${height}" fill="#454c54"/><rect x="0" y="0" width="12" height="${height}" fill="#373d44"/><rect x="${width - 12}" y="0" width="12" height="${height}" fill="#373d44"/>${panels}<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.45"/></linearGradient><rect width="${width}" height="${height}" fill="url(#g)"/>${[
			0.3, 0.55,
		]
			.map(
				(t) =>
					`<polygon points="${width / 2},${height * t} ${width / 2 + 22},${height * t + 26} ${width / 2 + 8},${height * t + 26} ${width / 2 + 8},${height * t + 50} ${width / 2 - 8},${height * t + 50} ${width / 2 - 8},${height * t + 26} ${width / 2 - 22},${height * t + 26}" fill="#f0b52a" opacity="0.8"/>`,
			)
			.join('')}`,
	)
}

// --- Under the street -----------------------------------------------------------

/** A shack of corrugated tin, a lamp lit in its window: 40 by 32. */
export const shack = pixelArt(40, 32, [
	// Its roof, sloping, and a stovepipe through it.
	[30, 0, 3, 8, '#4a4a4a'],
	[0, 6, 40, 4, '#7a5c3a'],
	[2, 4, 36, 2, '#8f6d46'],
	// Its walls, corrugated.
	[2, 10, 36, 22, '#6b7a80'],
	...Array.from(
		{ length: 9 },
		(_, i): PixelRect => [3 + i * 4, 10, 1, 22, '#55626a'],
	),
	// A patch nailed on.
	[22, 22, 10, 7, '#8c5a3c'],
	// Its door, and its window, lit.
	[6, 16, 9, 16, '#3b2a1c'],
	[13, 24, 1, 2, '#c9a24a'],
	[20, 13, 10, 7, '#2b2116'],
	[21, 14, 8, 5, '#ffc95c'],
	[24, 14, 1, 5, '#2b2116'],
])

/** A stall, its awning striped, wares on its counter: 36 by 30. */
export const stall = pixelArt(36, 30, [
	[2, 8, 2, 22, '#5a4632'],
	[32, 8, 2, 22, '#5a4632'],
	...Array.from(
		{ length: 6 },
		(_, i): PixelRect => [i * 6, 2, 6, 6, i % 2 ? '#f4efe0' : '#3f8f5a'],
	),
	[0, 8, 36, 2, '#2f6b43'],
	[4, 18, 28, 12, '#7a5c3a'],
	[4, 18, 28, 2, '#9a7650'],
	// Its wares: jars, a bunch of mushrooms, a fish.
	[7, 14, 3, 4, '#c96a3a'],
	[11, 15, 3, 3, '#d9c24a'],
	[17, 13, 6, 3, '#e8e0d0'],
	[18, 16, 4, 2, '#c8b89a'],
	[25, 15, 6, 2, '#7fa4b8'],
	[24, 14, 2, 4, '#7fa4b8'],
])

/** An oil drum with a fire in it, to warm your hands at: 14 by 24. */
export const drumFire = pixelArt(14, 24, [
	[5, 0, 3, 3, '#ffd65c'],
	[3, 3, 7, 4, '#ff9f2e'],
	[2, 6, 10, 3, '#e8552a'],
	[6, 4, 3, 4, '#ffe9a0'],
	[1, 9, 12, 15, '#5b6a4a'],
	[1, 9, 12, 2, '#3a4430'],
	[1, 15, 12, 1, '#3a4430'],
	[1, 20, 12, 1, '#3a4430'],
	[2, 11, 2, 9, '#7a8a62'],
])

/** Crates, stacked: 22 by 20. */
export const crates = pixelArt(22, 20, [
	[0, 8, 12, 12, '#a07440'],
	[12, 10, 10, 10, '#8a6234'],
	[3, 0, 11, 9, '#b3844c'],
	[0, 8, 12, 1, '#6e4c26'],
	[0, 13, 12, 1, '#6e4c26'],
	[5, 8, 1, 12, '#6e4c26'],
	[12, 14, 10, 1, '#5e4020'],
	[16, 10, 1, 10, '#5e4020'],
	[3, 4, 11, 1, '#7a5630'],
	[8, 0, 1, 9, '#7a5630'],
])

/** Pipes along the wall, a wheel valve on them: 34 by 26. */
export const pipes = pixelArt(34, 26, [
	[0, 4, 34, 6, '#6b7f6a'],
	[0, 4, 34, 2, '#8da38b'],
	[0, 16, 34, 6, '#7a5f45'],
	[0, 16, 34, 2, '#99795a'],
	[6, 10, 4, 6, '#6b7f6a'],
	[22, 2, 2, 22, '#4a4a4a'],
	[17, 1, 12, 2, '#c23a2a'],
	[17, 1, 2, 2, '#c23a2a'],
	[22, 0, 2, 4, '#c23a2a'],
	[4, 3, 2, 8, '#4f5f4e'],
	[28, 15, 2, 8, '#5e4834'],
	// A drip off it.
	[12, 22, 1, 2, '#8a9c3a'],
])

/** A lantern on a pole: 8 by 30. */
export const lanternPole = pixelArt(8, 30, [
	[3, 6, 2, 24, '#3a3a3a'],
	[1, 0, 6, 2, '#3a3a3a'],
	[1, 2, 6, 6, '#ffcf6a'],
	[2, 3, 4, 4, '#fff1b0'],
	[1, 8, 6, 1, '#3a3a3a'],
])

// --- Houses along the street ------------------------------------------------

/**
 * A townhouse along the street, Stockholm's colours: `width` by `height`
 * cells, a cornice and a roof, rows of windows, a door. Its front's colour,
 * its trim's, and its roof's.
 */
function house(
	width: number,
	height: number,
	front: string,
	trim: string,
	roof: string,
): string {
	const rects: PixelRect[] = [
		// Its roof, and a chimney.
		[2, 0, width - 4, 6, roof],
		[0, 4, width, 3, roof],
		[width - 12, 0, 4, 4, '#6b4a3a'],
		// Its front, and its cornice.
		[0, 7, width, height - 7, front],
		[0, 7, width, 2, trim],
	]
	// Windows, row on row, lit by the day: glass, and a sill under each.
	const columns = Math.max(2, Math.floor((width - 6) / 10))
	const gap = (width - columns * 6) / (columns + 1)
	for (let y = 13; y + 9 < height - 16; y += 14)
		for (let i = 0; i < columns; i++) {
			const x = Math.round(gap + i * (6 + gap))
			rects.push([x, y, 6, 8, '#9fc7de'], [x, y, 6, 2, '#d9ecf5'])
			rects.push([x + 2, y, 1, 8, trim], [x - 1, y + 8, 8, 1, trim])
		}
	// Its door, at street level.
	const door = Math.round(width / 2) - 4
	rects.push(
		[door, height - 12, 8, 12, '#4a3326'],
		[door - 1, height - 13, 10, 1, trim],
	)
	return pixelArt(width, height, rects)
}

/** The street's houses, one after another: ochre, rust, butter, pink, as along Götgatan. Their widths in cells. */
export const houses = (
	[
		[54, 96, '#d9a441', '#f1e2bf', '#5f4b45'],
		[46, 84, '#b8553a', '#ecd9c4', '#4d3d39'],
		[60, 104, '#e8d27a', '#f7efd6', '#5f4b45'],
		[50, 90, '#d98b88', '#f5e3dc', '#4d3d39'],
		[56, 100, '#c9b79a', '#f2eadc', '#5f4b45'],
	] as const
).map(([width, height, front, trim, roof]) => ({
	asset: house(width, height, front, trim, roof),
	width,
}))

// --- More under the street -------------------------------------------------

/** An archway in the sewer's wall, a side tunnel off into the dark: 60 by 70. */
export const archway = (() => {
	const rects: PixelRect[] = []
	/** How far either side of its middle the arch reaches, `y` down, and its dark inside. */
	const across = (y: number, radius: number) =>
		y < radius
			? Math.round(Math.sqrt(Math.max(0, radius ** 2 - (radius - y) ** 2)))
			: radius
	// Its voussoirs round the arch, course by course; then the dark inside them.
	for (let y = 0; y < 70; y++) {
		const half = across(y, 30)
		if (half)
			rects.push([30 - half, y, half * 2, 1, y % 6 < 5 ? '#8a5a43' : '#5a3a2c'])
	}
	for (let y = 6; y < 70; y++) {
		const half = across(y - 6, 24)
		if (half) rects.push([30 - half, y, half * 2, 1, '#120c0a'])
	}
	// A trickle out of it, and a grille across its foot.
	rects.push([26, 62, 8, 8, '#4f6b26'], [6, 46, 48, 2, '#4a4a4a'])
	for (let x = 8; x < 54; x += 6) rects.push([x, 46, 2, 24, '#4a4a4a'])
	return pixelArt(60, 70, rects)
})()

/** A shack of two storeys, a ladder up to its top floor, its windows lit: 44 by 58. */
export const tallShack = pixelArt(44, 58, [
	// Its roof, tin, and a flag on a pole.
	[38, 0, 1, 10, '#3a3a3a'],
	[39, 0, 5, 4, '#d9534f'],
	[0, 8, 42, 4, '#7a5c3a'],
	// Its top floor, planks; its bottom one, tin.
	[2, 12, 38, 18, '#8c6a46'],
	...Array.from(
		{ length: 6 },
		(_, i): PixelRect => [2, 14 + i * 3, 38, 1, '#6e5236'],
	),
	[2, 30, 38, 2, '#4a3624'],
	[2, 32, 38, 26, '#6b7a80'],
	...Array.from(
		{ length: 9 },
		(_, i): PixelRect => [3 + i * 4, 32, 1, 26, '#55626a'],
	),
	// Its windows, lit, and its door.
	[8, 17, 8, 7, '#2b2116'],
	[9, 18, 6, 5, '#ffc95c'],
	[26, 17, 8, 7, '#2b2116'],
	[27, 18, 6, 5, '#ffc95c'],
	[22, 38, 8, 6, '#2b2116'],
	[23, 39, 6, 4, '#ffc95c'],
	[6, 40, 9, 18, '#3b2a1c'],
	// A ladder up its side.
	[40, 12, 1, 46, '#a07440'],
	[43, 12, 1, 46, '#a07440'],
	...Array.from(
		{ length: 11 },
		(_, i): PixelRect => [40, 14 + i * 4, 4, 1, '#a07440'],
	),
])

/** Scaffolding on the building site, braced, a plank at the top: 32 by 80. */
export const scaffolding = pixelArt(32, 80, [
	[2, 0, 2, 80, '#8a8f94'],
	[28, 0, 2, 80, '#8a8f94'],
	...[0, 20, 40, 60].map((y): PixelRect => [0, y, 32, 2, '#8a8f94']),
	...[2, 22, 42, 62].flatMap((y): PixelRect[] =>
		Array.from(
			{ length: 9 },
			(_, i): PixelRect => [4 + i * 3, y + i * 2, 3, 2, '#6f747a'],
		),
	),
	[0, 18, 32, 3, '#c79a52'],
	[0, 58, 32, 3, '#c79a52'],
	// Its foot plates.
	[0, 78, 6, 2, '#4a4a4a'],
	[26, 78, 6, 2, '#4a4a4a'],
])

// --- Into a Tunnel ----------------------------------------------------------

/** The sign over a Tunnel's way in, as drawn, and how far over the floor its way in is. */
export const DUCK_SIGN_WIDTH = 120
export const DUCK_SIGN_HEIGHT = 150
/**
 * Over a Tunnel's way in, too low to stand in: a lintel striped like a
 * low bridge, right over the gap, and a sign over that, DUCK! and an arrow
 * down. Its foot's the floor's near edge; `opening` up from that, the
 * lintel's underside, level with the Tunnel's roof.
 */
export function duckSign(opening: number) {
	const width = DUCK_SIGN_WIDTH
	const height = DUCK_SIGN_HEIGHT
	const lintel = height - opening
	const stripes = Array.from(
		{ length: Math.ceil(width / 12) + 2 },
		(_, i) =>
			`<polygon points="${i * 12 - 12},${lintel} ${i * 12 - 6},${lintel} ${i * 12 - 20},${lintel - 14} ${i * 12 - 26},${lintel - 14}" fill="#1d1d1d"/>`,
	).join('')
	return svgUrl(
		width,
		height,
		[
			// The lintel, striped yellow and black.
			`<rect x="0" y="${lintel - 14}" width="${width}" height="14" fill="#ffc21a"/>`,
			`<svg x="0" y="0" width="${width}" height="${height}">${stripes}</svg>`,
			`<rect x="0" y="${lintel}" width="${width}" height="2" fill="#1d1d1d"/>`,
			// The sign, bolted to the brick over it.
			`<rect x="${width / 2 - 36}" y="${lintel - 74}" width="72" height="54" fill="#1d1d1d"/>`,
			`<rect x="${width / 2 - 33}" y="${lintel - 71}" width="66" height="48" fill="#ffc21a"/>`,
			`<text x="${width / 2}" y="${lintel - 52}" font-family="monospace" font-weight="bold" font-size="15" text-anchor="middle" fill="#1d1d1d">DUCK!</text>`,
			// An arrow down, into it.
			`<rect x="${width / 2 - 4}" y="${lintel - 48}" width="8" height="12" fill="#1d1d1d"/>`,
			`<polygon points="${width / 2 - 13},${lintel - 37} ${width / 2 + 13},${lintel - 37} ${width / 2},${lintel - 26}" fill="#1d1d1d"/>`,
			`<rect x="${width / 2 - 30}" y="${lintel - 68}" width="3" height="3" fill="#8a6a10"/>`,
			`<rect x="${width / 2 + 27}" y="${lintel - 68}" width="3" height="3" fill="#8a6a10"/>`,
		].join(''),
	)
}
