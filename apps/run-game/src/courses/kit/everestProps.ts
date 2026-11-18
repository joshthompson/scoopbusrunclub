import { FLAG_COLOURS } from './everestScenery'
import { type PixelRect, pixelArt } from './pixelArt'

// --- Colours shared by the props --------------------------------------------------

const WOOD = '#6b4a2b'
const WOOD_LIT = '#8a6238'
const WOOD_SHADE = '#4a3320'
const INK = '#2b2b2b'
const GRANITE = '#7a7a7a'
const GRANITE_LIT = '#9b9b9b'
const GRANITE_SHADE = '#575757'
const GRANITE_DARK = '#3f3f3f'
const SNOW = '#f6f9fc'
const SNOW_SHADE = '#d4e0ee'
const STEEL = '#8a929b'

// --- Khumbu villages ------------------------------------------------------------------

const WALL = '#eee9de'
const WALL_SHADE = '#d2cbbb'
const WALL_BAND = '#c9c2b2'

interface Window {
	x: number
	y: number
	w: number
	frame: string
}

interface Roof {
	main: string
	lit: string
	shade: string
}

const BLUE_ROOF: Roof = { main: '#3f78c4', lit: '#6ea3e0', shade: '#2c5a9a' }
const GREEN_ROOF: Roof = { main: '#4a9a58', lit: '#7cc686', shade: '#33743f' }

const RED_FRAME = '#c8322b'
const GREEN_FRAME = '#2f8a46'

/** A lodge: two storeys, a low tin roof in `roof`, windows where `windows` and a door at `door` say. */
function lodge(roof: Roof, windows: Window[], door: number): string {
	const rects: PixelRect[] = [
		// Its whitewashed stone walls, shaded on the right, a band between the storeys and stones at its foot.
		[2, 7, 36, 23, WALL],
		[32, 7, 6, 23, WALL_SHADE],
		[2, 17, 36, 1, WALL_BAND],
		[2, 28, 36, 2, WALL_BAND],
		[4, 22, 3, 1, WALL_BAND],
		[30, 12, 3, 1, WALL_BAND],
		// Its tin roof, low, the top row lit, overhanging.
		[3, 3, 34, 1, roof.lit],
		[1, 4, 38, 2, roof.main],
		[30, 4, 9, 2, roof.shade],
		[0, 6, 40, 1, roof.shade],
		// Its door, in wood, a lintel over it.
		[door, 20, 6, 10, WOOD],
		[door + 1, 21, 2, 9, WOOD_LIT],
		[door + 5, 21, 1, 9, WOOD_SHADE],
		[door - 1, 19, 8, 1, WOOD_SHADE],
		[door + 4, 25, 1, 1, '#e8b830'],
	]
	// Its small windows, painted frames round dark glass.
	for (const { x, y, w, frame } of windows) {
		rects.push([x, y, w, 4, frame])
		rects.push([x + 1, y + 1, w - 2, 2, '#2a3a4c'])
		rects.push([x + 1, y + 1, 1, 1, '#5a7a96'])
	}
	// Prayer flags, strung off its roof corner from two poles.
	rects.push([1, 0, 1, 4, WOOD], [13, 0, 1, 4, WOOD])
	rects.push([2, 0, 11, 1, '#5a4a3a'])
	for (let i = 0; i < 5; i++)
		rects.push([2 + i * 2 + (i > 2 ? 1 : 0), 1, 2, 2, FLAG_COLOURS[i]])
	return pixelArt(40, 30, rects)
}

/** A Khumbu teahouse, as in Namche: two storeys of whitewashed stone, a blue tin roof, painted frames, a flag string off the roof. 40 by 30. */
export const teahouse = lodge(
	BLUE_ROOF,
	[
		{ x: 6, y: 10, w: 4, frame: GREEN_FRAME },
		{ x: 18, y: 10, w: 4, frame: GREEN_FRAME },
		{ x: 28, y: 10, w: 4, frame: GREEN_FRAME },
		{ x: 6, y: 21, w: 4, frame: GREEN_FRAME },
		{ x: 31, y: 21, w: 4, frame: GREEN_FRAME },
	],
	17,
)

/** The same lodge with a green roof, wider windows in red frames, its door to the left. 40 by 30. */
export const teahouseGreen = lodge(
	GREEN_ROOF,
	[
		{ x: 9, y: 10, w: 5, frame: RED_FRAME },
		{ x: 25, y: 10, w: 5, frame: RED_FRAME },
		{ x: 18, y: 21, w: 5, frame: RED_FRAME },
		{ x: 28, y: 21, w: 5, frame: RED_FRAME },
	],
	6,
)

/** A row of prayer wheels, copper drums with red bands, under a little wooden roof on posts. 26 by 18. */
export const prayerWheels = (() => {
	const rects: PixelRect[] = [
		// Its roof.
		[2, 0, 22, 2, WOOD_LIT],
		[1, 2, 24, 2, WOOD],
		[0, 4, 26, 1, WOOD_SHADE],
		// Its posts and the rail behind the wheels.
		[1, 5, 2, 11, WOOD],
		[23, 5, 2, 11, WOOD_SHADE],
		[3, 15, 20, 1, WOOD],
		// Its stone base.
		[0, 16, 26, 2, '#8a8780'],
		[0, 17, 26, 1, '#6c6962'],
	]
	// Its five wheels: gold cap, copper drum lit on the left, a red band.
	for (let i = 0; i < 5; i++) {
		const x = 4 + i * 4
		rects.push([x, 6, 3, 1, '#e8b830'])
		rects.push([x, 7, 3, 7, '#c27a3a'])
		rects.push([x, 7, 1, 7, '#e0a050'])
		rects.push([x + 2, 7, 1, 7, '#8f5428'])
		rects.push([x, 9, 3, 1, '#c8322b'])
		rects.push([x, 14, 3, 1, '#8f5428'])
	}
	return pixelArt(26, 18, rects)
})()

// --- Rocks ---------------------------------------------------------------------------

/** A big granite boulder, lopsided and cracked, lit on top, with a snow cap if `snowy`. 26 by 15. */
export const bigBoulder = (snowy: boolean) =>
	pixelArt(26, 15, [
		// Its body, shallower on the left, steeper on the right.
		[10, 0, 7, 1, GRANITE_LIT],
		[6, 1, 13, 1, GRANITE_LIT],
		[4, 2, 18, 2, GRANITE],
		[2, 4, 23, 2, GRANITE],
		[1, 6, 25, 3, GRANITE],
		[0, 9, 26, 5, '#6a6a6a'],
		// Its shaded side and its foot.
		[18, 3, 4, 1, GRANITE_SHADE],
		[18, 4, 7, 2, GRANITE_SHADE],
		[17, 6, 9, 3, GRANITE_SHADE],
		[16, 9, 10, 5, '#4f4f4f'],
		[0, 14, 26, 1, '#4a4a4a'],
		// Its cracks and a glint.
		[11, 3, 1, 3, GRANITE_DARK],
		[10, 6, 1, 2, GRANITE_DARK],
		[9, 8, 1, 2, GRANITE_DARK],
		[21, 9, 1, 3, GRANITE_DARK],
		[5, 3, 4, 1, '#a8a8a8'],
		...(snowy
			? ([
					[9, 0, 8, 1, SNOW],
					[6, 1, 13, 1, SNOW],
					[4, 2, 11, 2, SNOW],
					[3, 4, 6, 1, SNOW],
					[15, 2, 6, 1, SNOW_SHADE],
					[13, 4, 4, 1, SNOW_SHADE],
					[12, 3, 1, 1, SNOW],
				] as PixelRect[])
			: []),
	])

/** A low flat slab of rock, with a snow cap if `snowy`. 18 by 6. */
export const slab = (snowy: boolean) =>
	pixelArt(18, 6, [
		[2, 0, 13, 1, GRANITE_LIT],
		[1, 1, 16, 2, GRANITE],
		[0, 3, 18, 3, '#6a6a6a'],
		[11, 2, 7, 4, GRANITE_SHADE],
		[0, 5, 18, 1, '#4a4a4a'],
		[6, 3, 3, 1, GRANITE_DARK],
		...(snowy
			? ([
					[2, 0, 12, 1, SNOW],
					[1, 1, 10, 1, SNOW],
					[11, 1, 5, 1, SNOW_SHADE],
				] as PixelRect[])
			: []),
	])

// --- Left on the mountain ------------------------------------------------------------

/** A discarded climbing oxygen cylinder, on its side: an orange body, a grey valve at one end. 11 by 4. */
export const oxygenBottle = pixelArt(11, 4, [
	// Its body, lit on top, shaded underneath, a white band.
	[1, 0, 7, 4, '#e8742a'],
	[0, 1, 1, 2, '#e8742a'],
	[1, 0, 7, 1, '#f4a050'],
	[1, 3, 7, 1, '#b4501c'],
	[4, 0, 1, 4, '#f3f3f3'],
	// Its valve.
	[8, 1, 2, 2, STEEL],
	[8, 1, 2, 1, '#b4bcc4'],
	[10, 0, 1, 1, '#5a5f66'],
])

/** A route-marker wand: a thin bamboo stick, a little red flag at the top. 4 by 18. */
export const wand = pixelArt(4, 18, [
	[1, 0, 1, 18, '#c9a85a'],
	[1, 6, 1, 1, '#9a7a3a'],
	[1, 12, 1, 1, '#9a7a3a'],
	[2, 0, 2, 2, '#e8402a'],
	[2, 2, 1, 1, '#b82c1c'],
])

/** An ice axe planted in the snow: shaft upright, the head across the top, a red leash. 7 by 14. */
export const iceAxe = pixelArt(7, 14, [
	// Its head: a pick curving down on the left, an adze on the right.
	[1, 1, 5, 2, '#aab4bf'],
	[1, 1, 5, 1, '#d6dde4'],
	[0, 2, 1, 2, '#aab4bf'],
	[6, 0, 1, 3, '#aab4bf'],
	// Its shaft and leash.
	[3, 3, 1, 9, '#4a7ab8'],
	[4, 3, 1, 4, '#d8342c'],
	// The snow it is planted in.
	[1, 11, 5, 1, SNOW],
	[0, 12, 7, 2, SNOW],
	[4, 13, 3, 1, SNOW_SHADE],
])

// --- Landmarks ---------------------------------------------------------------------------

/** Everest's summit, as in the photos: a small snow dome heaped with prayer flags of every colour, white khata scarves, a metal survey pole out of its top. 56 by 28. */
export const summitMound = (() => {
	const rects: PixelRect[] = []
	const centre = 28
	const top = 8
	const bottom = 28
	// Its dome, lit on top, shaded on the right and underneath.
	for (let y = top; y < bottom; y++) {
		const t = (y - top + 1) / (bottom - top)
		const half = Math.max(3, Math.round(28 * Math.sqrt(1 - (1 - t) ** 2)))
		rects.push([centre - half, y, half * 2, 1, y < top + 3 ? '#ffffff' : SNOW])
		const shadeFrom = centre + Math.round(half * 0.45)
		rects.push([shadeFrom, y, centre + half - shadeFrom, 1, SNOW_SHADE])
		if (y >= bottom - 2) rects.push([centre - half, y, half * 2, 1, '#dbe6f2'])
	}
	// Its survey pole, and a cross-piece.
	rects.push([28, 0, 1, 10, STEEL])
	rects.push([27, 0, 3, 1, '#c8cdd2'])
	rects.push([27, 3, 3, 1, '#c8cdd2'])
	// Strings of flags draped from the top down over the dome.
	const colours = [
		FLAG_COLOURS[0],
		FLAG_COLOURS[2],
		FLAG_COLOURS[3],
		FLAG_COLOURS[4],
	]
	const strings: [number, number][] = [
		[3, 25],
		[11, 26],
		[45, 26],
		[53, 25],
		[19, 27],
		[37, 27],
	]
	strings.forEach(([endX, endY], s) => {
		const [startX, startY] = [28, 8]
		const span = endX - startX
		const steps = Math.abs(span)
		for (let i = 1; i <= steps; i++) {
			const t = i / steps
			const x = startX + Math.round(span * t)
			const y =
				startY +
				Math.round((endY - startY) * t) -
				Math.round(3 * Math.sin(Math.PI * t))
			rects.push([x, y, 1, 1, '#5a4a3a'])
			if (i % 3 === 2)
				rects.push([x, y + 1, 2, 2, colours[((i / 3 + s) % 4) | 0]])
		}
	})
	// Flags piled at the top, in a jumble of every colour, round the pole.
	for (let y = 5; y < 10; y++) {
		const half = 3 + Math.round((y - 5) * 1.5)
		for (let x = centre - half; x < centre + half; x += 2)
			if ((x + y) % 5 !== 0)
				rects.push([
					x,
					y,
					2,
					1,
					FLAG_COLOURS[
						(x * 3 + y * 5) % 5 === 1
							? 4
							: ((x + y * 2) >> 1) % 5 === 1
								? 2
								: ((x + y * 2) >> 1) % 5
					],
				])
	}
	// Flags streaming off the pole into the sky.
	rects.push(
		[29, 0, 5, 1, FLAG_COLOURS[2]],
		[29, 1, 4, 1, FLAG_COLOURS[0]],
		[29, 2, 6, 1, FLAG_COLOURS[4]],
	)
	// White khata scarves hanging off the pile.
	for (const [x, y, h] of [
		[22, 9, 5],
		[26, 10, 4],
		[32, 10, 6],
		[36, 9, 4],
	]) {
		rects.push([x, y, 1, h, '#fffbe8'], [x + 1, y + 1, 1, h - 2, '#d9cfae'])
	}
	return pixelArt(56, 28, rects)
})()

/** A tattered, wind-flattened tent at the South Col, half buried in the snow, one pole poking up. 20 by 8. */
export const southColTent = pixelArt(20, 8, [
	// Its collapsed fly, faded orange, shaded on the right.
	[6, 2, 8, 1, '#c8612a'],
	[3, 3, 14, 2, '#c8612a'],
	[1, 5, 18, 2, '#c8612a'],
	[11, 3, 6, 4, '#9a4a20'],
	// Its tears, and a flap blowing loose.
	[7, 3, 1, 2, INK],
	[13, 5, 2, 1, INK],
	[17, 2, 3, 1, '#c8612a'],
	[19, 3, 1, 2, '#9a4a20'],
	// A pole snapped and sticking up.
	[9, 0, 1, 3, INK],
	// The snow drifted over it.
	[0, 6, 20, 2, SNOW],
	[3, 5, 5, 1, SNOW],
	[14, 5, 3, 1, SNOW_SHADE],
	[10, 7, 10, 1, SNOW_SHADE],
])
