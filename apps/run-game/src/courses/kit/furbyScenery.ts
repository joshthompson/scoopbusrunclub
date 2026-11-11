import { type PixelRect, pixelArt, svgUrl } from './pixelArt'
import { seeded } from './seeded'

/**
 * Furby Fields' scenery, drawn in code: candy mountains far off and sweet
 * hills nearer, lollipop and candyfloss trees, toadstools, candy canes and
 * rainbow flowers; and the Giant Furby's ears, its tail, and the machine
 * inside it, gears and circuit boards and its speaker.
 */

const rect = (x: number, y: number, w: number, h: number, fill: string) =>
	`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`

// --- The horizon -----------------------------------------------------------------

/** The field, on down under the hills: the palette's grass. */
export const FIELD = '#9be8c8'
const MOUNTAINS = ['#f0b6e8', '#d6b4ff', '#ffc4d8']
const ICING = '#fff6fb'

/**
 * The far band: candy mountains, pink and lilac, icing down their tops,
 * one behind another. 480 by 160, their feet in its fill.
 */
export const candyMountains = (() => {
	const parts: string[] = []
	const random = seeded(808)
	for (let x = -40, i = 0; x < 520; i++) {
		const width = 90 + Math.floor(random() * 6) * 10
		const height = 60 + Math.floor(random() * 6) * 10
		const peak = x + width / 2
		const colour = MOUNTAINS[i % MOUNTAINS.length]
		for (let y = 160 - height; y < 160; y += 4) {
			const half = ((y - (160 - height)) / height) * (width / 2)
			parts.push(rect(peak - half, y, half * 2, 4, colour))
			// Icing, down from the top, dripping.
			if (y < 160 - height + 22 + ((peak * 7) % 3) * 4)
				parts.push(rect(peak - half, y, half * 2, 4, ICING))
		}
		x += width * 0.7
	}
	return svgUrl(480, 160, parts.join(''))
})()
export const MOUNTAIN_FILL = '#e8b4ec'

/**
 * The near band: rolling sweet hills, mint and lemon, gumdrops and
 * lollipops along their tops. 400 by 160, the field from 120 down.
 */
export const sweetHills = (() => {
	const parts: string[] = []
	const random = seeded(909)
	for (let x = 0; x < 400; x += 4) {
		const top = 108 + Math.round(Math.sin(x / 40) * 10 + Math.sin(x / 17) * 4)
		parts.push(rect(x, top, 4, 160 - top, x % 160 < 80 ? '#a8f0d0' : '#b8f4dc'))
		parts.push(rect(x, top, 4, 4, '#d8ffee'))
	}
	for (let x = 14; x < 390; x += 40 + Math.floor(random() * 30)) {
		const top = 108 + Math.round(Math.sin(x / 40) * 10 + Math.sin(x / 17) * 4)
		if (random() < 0.5) {
			// A gumdrop.
			const c = ['#ff6fa8', '#ffe66b', '#6bc4ff', '#b48bff'][
				Math.floor(random() * 4)
			]
			parts.push(rect(x + 2, top - 10, 8, 2, c))
			parts.push(rect(x, top - 8, 12, 8, c))
			parts.push(rect(x + 2, top - 8, 3, 2, '#ffffff'))
		} else {
			// A lollipop.
			parts.push(rect(x + 5, top - 16, 2, 16, '#f3ead8'))
			parts.push(rect(x, top - 26, 12, 10, '#ff8fc2'))
			parts.push(rect(x + 2, top - 28, 8, 2, '#ff8fc2'))
			parts.push(rect(x + 3, top - 23, 6, 2, '#fff6fb'))
		}
	}
	return svgUrl(400, 160, parts.join(''))
})()

// --- On the field ----------------------------------------------------------------

/** A lollipop tree: a great swirl on a striped stick, 16 by 34. */
export const lollipopTree = (colour: string) =>
	pixelArt(16, 34, [
		[2, 0, 12, 1, colour],
		[1, 1, 14, 1, colour],
		[0, 2, 16, 10, colour],
		[1, 12, 14, 1, colour],
		[2, 13, 12, 1, colour],
		// Its swirl.
		[3, 2, 8, 2, '#fff6fb'],
		[11, 4, 2, 5, '#fff6fb'],
		[4, 9, 7, 2, '#fff6fb'],
		[2, 5, 2, 4, '#fff6fb'],
		[5, 5, 4, 2, '#fff6fb'],
		[7, 7, 2, 1, '#fff6fb'],
		// Its stick, striped.
		...Array.from(
			{ length: 10 },
			(_, i): PixelRect => [7, 14 + i * 2, 2, 2, i % 2 ? '#ff6fa8' : '#fff6fb'],
		),
	])

/** A candyfloss tree: pink puffs on a stick, 18 by 32. */
export const candyflossTree = pixelArt(18, 32, [
	[4, 0, 10, 2, '#ffb3d6'],
	[2, 2, 14, 4, '#ffb3d6'],
	[0, 6, 18, 8, '#ffb3d6'],
	[2, 14, 14, 4, '#ffb3d6'],
	[5, 18, 8, 2, '#ffb3d6'],
	[4, 2, 4, 2, '#ffd8ec'],
	[2, 6, 4, 3, '#ffd8ec'],
	[12, 10, 4, 3, '#f28cc0'],
	[9, 15, 4, 2, '#f28cc0'],
	[8, 20, 2, 12, '#e8dccb'],
	[9, 20, 1, 12, '#c9bfa8'],
])

/** A toadstool: a spotted cap on a white stalk, 14 by 14. */
export const toadstool = (cap: string) =>
	pixelArt(14, 14, [
		[3, 0, 8, 1, cap],
		[1, 1, 12, 2, cap],
		[0, 3, 14, 3, cap],
		[3, 1, 2, 2, '#ffffff'],
		[8, 2, 3, 2, '#ffffff'],
		[11, 4, 2, 1, '#ffffff'],
		[2, 4, 2, 1, '#ffffff'],
		[0, 6, 14, 1, 'rgba(0,0,0,0.2)'],
		[5, 6, 4, 8, '#fff6e6'],
		[8, 7, 1, 7, '#e6d8c4'],
	])

/** A candy cane, stuck in the ground, 8 by 22. */
export const candyCane = pixelArt(8, 22, [
	[2, 0, 4, 2, '#ff4f6f'],
	[0, 2, 2, 4, '#fff6fb'],
	[6, 2, 2, 2, '#fff6fb'],
	[6, 4, 2, 2, '#ff4f6f'],
	...Array.from(
		{ length: 8 },
		(_, i): PixelRect => [0, 6 + i * 2, 2, 2, i % 2 ? '#ff4f6f' : '#fff6fb'],
	),
])

/** A rainbow flower: petals round in its colours, 9 by 13. */
export const rainbowFlower = pixelArt(9, 13, [
	[3, 0, 3, 1, '#ff6fa8'],
	[6, 1, 2, 2, '#ffb86b'],
	[6, 3, 2, 2, '#ffe66b'],
	[3, 5, 3, 1, '#7be0a0'],
	[1, 3, 2, 2, '#6bc4ff'],
	[1, 1, 2, 2, '#b48bff'],
	[3, 1, 3, 4, '#ffe66b'],
	[4, 2, 1, 2, '#f2a33a'],
	[4, 6, 1, 7, '#4fbf7a'],
	[5, 9, 2, 1, '#4fbf7a'],
	[2, 8, 2, 1, '#4fbf7a'],
])

// --- The Giant Furby ---------------------------------------------------------------

export const GIANT_FUR = '#9b59d0'
export const GIANT_FUR_DARK = '#7b3fb5'
export const GIANT_FUR_LIGHT = '#c48ef0'
const EAR_INSIDE = '#ff8fc2'

/** One of its ears, tufted, standing up off its head: 20 by 44 cells. */
export const giantEar = pixelArt(20, 44, [
	[6, 0, 4, 4, GIANT_FUR_DARK],
	[4, 4, 10, 6, GIANT_FUR],
	[2, 10, 14, 30, GIANT_FUR],
	[0, 38, 20, 6, GIANT_FUR],
	[6, 8, 6, 28, EAR_INSIDE],
	[8, 12, 2, 20, '#ffb3d6'],
	[2, 10, 2, 30, GIANT_FUR_DARK],
	// Its tuft, curling at the tip.
	[10, 0, 2, 2, GIANT_FUR_LIGHT],
	[12, 0, 2, 4, GIANT_FUR_LIGHT],
])

/** Its tail, a great tuft at the back of it: 24 by 20 cells. */
export const giantTail = pixelArt(24, 20, [
	[4, 4, 16, 12, GIANT_FUR],
	[0, 8, 6, 6, GIANT_FUR],
	[18, 2, 6, 8, GIANT_FUR],
	[8, 0, 8, 4, GIANT_FUR_LIGHT],
	[2, 14, 10, 6, GIANT_FUR_DARK],
	[14, 12, 8, 6, GIANT_FUR_DARK],
	[6, 6, 4, 2, GIANT_FUR_LIGHT],
])

/** A gear, its teeth round it, `size` cells across, in `colour`. */
export const gear = (size: number, colour: string) => {
	const parts: PixelRect[] = []
	const r = size / 2
	for (let y = 0; y < size; y++)
		for (let x = 0; x < size; x++) {
			const dx = x + 0.5 - r
			const dy = y + 0.5 - r
			const d = Math.sqrt(dx * dx + dy * dy)
			const angle = Math.atan2(dy, dx)
			const tooth = Math.cos(angle * 8) > 0.3
			if (d < r * 0.28) continue
			if (d < r * 0.78 || (tooth && d < r))
				parts.push([x, y, 1, 1, d < r * 0.42 ? '#4a3a5c' : colour])
		}
	return pixelArt(size, size, parts)
}

/** A circuit board, chips on it and traces between: 40 by 26 cells. */
export const circuitBoard = (() => {
	const parts: PixelRect[] = [[0, 0, 40, 26, '#1f7a5a']]
	const random = seeded(77)
	// Traces.
	for (let i = 0; i < 10; i++) {
		const y = 2 + Math.floor(random() * 22)
		const x = Math.floor(random() * 20)
		parts.push([x, y, 6 + Math.floor(random() * 14), 1, '#7be0a0'])
		parts.push([x, y, 1, 3, '#7be0a0'])
	}
	// Chips.
	for (const [x, y, w, h] of [
		[4, 4, 10, 6],
		[22, 3, 8, 8],
		[16, 15, 12, 7],
		[3, 17, 6, 5],
	])
		parts.push(
			[x, y, w, h, '#1d1d1d'],
			[x + 1, y + 1, 2, 1, '#6b6b6b'],
			...Array.from(
				{ length: Math.floor(w / 2) },
				(_, i): PixelRect => [x + i * 2, y - 1, 1, 1, '#d9d9d9'],
			),
		)
	// A light on it, lit.
	parts.push([33, 20, 2, 2, '#ff4f6f'])
	return pixelArt(40, 26, parts)
})()

/** Its speaker, a grille over its cone: 22 by 22 cells. */
export const speaker = pixelArt(22, 22, [
	[0, 0, 22, 22, '#3a3442'],
	[2, 2, 18, 18, '#55505e'],
	...Array.from(
		{ length: 8 },
		(_, i): PixelRect => [3, 3 + i * 2, 16, 1, '#2a2530'],
	),
	[9, 9, 4, 4, '#8a8496'],
])

/** Its batteries, two of them, in their holder: 24 by 16 cells. */
export const batteries = pixelArt(24, 16, [
	[0, 0, 24, 16, '#2a2a2a'],
	[2, 2, 9, 12, '#e8c23a'],
	[2, 2, 9, 4, '#1d1d1d'],
	[13, 2, 9, 12, '#e8c23a'],
	[13, 2, 9, 4, '#1d1d1d'],
	[11, 6, 2, 4, '#9a9a9a'],
	[5, 10, 3, 1, '#1d1d1d'],
	[16, 10, 3, 1, '#1d1d1d'],
])

/** Wires, looping along, red and blue and yellow: 60 by 12 cells. */
export const wires = pixelArt(
	60,
	12,
	['#ff4f6f', '#6bc4ff', '#ffe66b'].flatMap((colour, k) =>
		Array.from(
			{ length: 30 },
			(_, i): PixelRect => [
				i * 2,
				Math.round(4 + k * 2 + Math.sin(i / 3 + k) * 3),
				2,
				1,
				colour,
			],
		),
	),
)

/** A bouncy toadstool, a Steam Vent's job: a great spotted cap on a short stalk, 22 by 16. */
export const bouncyToadstool = pixelArt(22, 16, [
	[5, 0, 12, 1, '#ff5fa2'],
	[2, 1, 18, 2, '#ff5fa2'],
	[0, 3, 22, 5, '#ff5fa2'],
	[1, 8, 20, 1, '#d93f84'],
	[5, 1, 3, 2, '#ffffff'],
	[12, 2, 4, 2, '#ffffff'],
	[17, 4, 3, 2, '#ffffff'],
	[2, 5, 3, 2, '#ffffff'],
	[9, 5, 2, 2, '#ffffff'],
	[7, 9, 8, 7, '#fff6e6'],
	[12, 9, 2, 7, '#e6d8c4'],
])
