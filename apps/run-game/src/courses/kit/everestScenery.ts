import type { CourseLook } from '../types'
import {
	type PixelRect,
	pixelArt,
	pixelCircle,
	pixelPolygon,
	pixelText,
	pixelTextWidth,
	svgUrl,
} from './pixelArt'
import { seeded } from './seeded'

/**
 * Everest, drawn in code: what's on the horizon on the way up, three times
 * over, each fading in as the climb gets to it (see `CourseLook['voyage']`);
 * what stands along the path; and the mountain's own rock and snow, under it.
 *
 * On the trek in, green ridges and pines, the Himalaya white over them. Up
 * the moraine, bare rock, the glacier, and the peaks nearer, Ama Dablam's
 * spike among them. And high up, over the clouds, only the tops of the
 * highest peaks out of them, the sky gone a deep blue.
 */

/** A horizon band's size: as wide as the screen, so it goes round and round. */
const W = 960
const H = 160

const TAU = Math.PI * 2

/**
 * A wavy line along a band, `base` down it, `amp` up and down either way,
 * the same at either end, so the band goes round: waves of whole numbers of
 * them across it.
 */
function wave(seed: number, base: number, amp: number, waves: number[]) {
	const random = seeded(seed)
	const parts = waves.map((k) => ({
		k,
		phase: random() * TAU,
		size: 0.4 + random() * 0.6,
	}))
	const total = parts.reduce((sum, p) => sum + p.size, 0)
	return (x: number) =>
		base +
		(amp / total) *
			parts.reduce(
				(sum, p) => sum + p.size * Math.sin((TAU * p.k * x) / W + p.phase),
				0,
			)
}

/** The land under a wavy line, `top`, on down to the bottom of the band, in `fill`. */
function under(top: (x: number) => number, fill: string, bottom = H) {
	let out = ''
	// A column 2 px wide at a time: pixel art, and quick to work out.
	for (let x = 0; x < W; x += 2) {
		const y = Math.max(0, Math.round(top(x + 1) / 2) * 2)
		if (y < bottom)
			out += `<rect x="${x}" y="${y}" width="2" height="${bottom - y}" fill="${fill}"/>`
	}
	return out
}

/** A mountain, its peak at `x`, `top`, its feet `half` either side, on down to `foot`. */
interface Peak {
	x: number
	top: number
	half: number
	/** How far down it the snow comes, out of 1. */
	snow: number
	/** How much further its right side goes out than its left. */
	lean?: number
}

/**
 * Snow-capped mountains, lit from the left: each in two halves, lit and in
 * shadow, and its snow, lit and in shadow too, its lower edge ragged.
 * Drawn again either side of the band, so one off its edge comes in on the
 * other side.
 */
function mountains(
	peaks: Peak[],
	foot: number,
	colours: { rock: string; shade: string; snow: string; snowShade: string },
	seed: number,
) {
	const random = seeded(seed)
	let out = ''
	for (const peak of peaks) {
		for (const shift of [-W, 0, W]) {
			const x = peak.x + shift
			if (x + peak.half * 1.6 < 0 || x - peak.half * 1.6 > W) continue
			const left = x - peak.half
			const right = x + peak.half * (1 + (peak.lean ?? 0))
			const ridge = x + peak.half * 0.18
			const apex: [number, number] = [x, peak.top]
			out += pixelPolygon([apex, [left, foot], [ridge, foot]], colours.rock)
			out += pixelPolygon([apex, [ridge, foot], [right, foot]], colours.shade)
			// The snow, down to `snow` of the way, ragged along its bottom.
			const depth = (foot - peak.top) * peak.snow
			const at = (towards: number, f: number): [number, number] => [
				x + (towards - x) * f,
				peak.top + depth * f,
			]
			const snowLeft = at(left, 1)
			const snowRidge = at(ridge, 1.1)
			const snowRight = at(right, 0.9)
			const ragged = (
				from: [number, number],
				to: [number, number],
			): [number, number][] => {
				const points: [number, number][] = []
				const steps = Math.max(2, Math.round(Math.abs(to[0] - from[0]) / 7))
				for (let i = 1; i < steps; i++) {
					const t = i / steps
					points.push([
						from[0] + (to[0] - from[0]) * t,
						from[1] + (to[1] - from[1]) * t + (i % 2 ? 4 + random() * 6 : -2),
					])
				}
				return points
			}
			out += pixelPolygon(
				[apex, snowLeft, ...ragged(snowLeft, snowRidge), snowRidge],
				colours.snow,
			)
			out += pixelPolygon(
				[apex, snowRidge, ...ragged(snowRidge, snowRight), snowRight],
				colours.snowShade,
			)
		}
	}
	return out
}

/** Pines along a ridge, `top` its line: dark spikes, `count` of them. */
function pines(
	top: (x: number) => number,
	count: number,
	fill: string,
	seed: number,
) {
	const random = seeded(seed)
	let out = ''
	for (let i = 0; i < count; i++) {
		const x = Math.round((random() * W) / 2) * 2
		const h = 10 + Math.round(random() * 5) * 2
		const y = Math.round(top(x) / 2) * 2 + 4
		out += pixelPolygon(
			[
				[x, y - h],
				[x - 5, y],
				[x + 5, y],
			],
			fill,
		)
	}
	return out
}

/**
 * Clouds, a sea of them, their tops puffed up along `base`: lit on top, in
 * shadow underneath, on down to the bottom of the band.
 */
function cloudSea(
	base: number,
	seed: number,
	colours: { lit: string; cloud: string; shade: string },
) {
	const random = seeded(seed)
	let lit = ''
	let cloud = ''
	for (let x = 0; x < W; x += 26 + Math.round(random() * 20)) {
		const r = 14 + Math.round(random() * 14)
		const y = base + Math.round(random() * 10) - r / 3
		for (const shift of [-W, 0, W]) {
			lit += pixelCircle(x + shift, y, r, colours.lit)
			cloud += pixelCircle(x + shift + 4, y + 5, r - 2, colours.cloud)
		}
	}
	return [
		lit,
		cloud,
		`<rect x="0" y="${base + 6}" width="${W}" height="${H - base - 6}" fill="${colours.cloud}"/>`,
		`<rect x="0" y="${base + 26}" width="${W}" height="${H - base - 26}" fill="${colours.shade}"/>`,
	].join('')
}

// --- The trek in ---------------------------------------------------------

const TREK_FAR_FILL = '#8fa6c2'
const TREK_GREEN = '#5d8f45'
const TREK_GREEN_DARK = '#3f6e35'

const trekRidge = wave(31, 92, 22, [2, 3, 7])
const trekNear = wave(32, 70, 18, [3, 5, 11])

/** The trek in: green ridges, pines, and the Himalaya white over them. */
const TREK: NonNullable<CourseLook['horizon']> = {
	far: svgUrl(
		W,
		H,
		mountains(
			[
				{ x: 90, top: 22, half: 120, snow: 0.45 },
				{ x: 300, top: 6, half: 150, snow: 0.5, lean: 0.2 },
				{ x: 520, top: 34, half: 110, snow: 0.4 },
				{ x: 700, top: 12, half: 140, snow: 0.5 },
				{ x: 880, top: 30, half: 110, snow: 0.45, lean: 0.3 },
			],
			H,
			{
				rock: '#9cb0c9',
				shade: '#7f95b3',
				snow: '#f6f9fc',
				snowShade: '#c9d6e8',
			},
			33,
		) + under(trekRidge, TREK_FAR_FILL),
	),
	near: svgUrl(
		W,
		H,
		under(trekNear, TREK_GREEN) +
			pines(trekNear, 70, TREK_GREEN_DARK, 34) +
			under((x) => trekNear(x) + 34, TREK_GREEN_DARK),
	),
	fill: TREK_FAR_FILL,
	nearer: [
		{
			asset: svgUrl(
				W,
				120,
				under(wave(35, 50, 16, [2, 4, 9]), '#6fa04a', 120) +
					pines(wave(35, 50, 16, [2, 4, 9]), 40, '#4a7a3a', 36),
			),
			height: 120,
			fill: '#6fa04a',
		},
	],
}

// --- Up the moraine, onto the glacier ------------------------------------------

const MORAINE_FILL = '#8a8f99'
const moraineNear = wave(41, 74, 20, [3, 4, 9])

/** Up the moraine: the peaks nearer and whiter, Ama Dablam's spike, bare grey ridges, and the glacier. */
const MORAINE: NonNullable<CourseLook['horizon']> = {
	far: svgUrl(
		W,
		H,
		mountains(
			[
				{ x: 140, top: 18, half: 150, snow: 0.6 },
				// Ama Dablam: a spike, steep.
				{ x: 380, top: 0, half: 58, snow: 0.7 },
				{ x: 560, top: 30, half: 130, snow: 0.55, lean: 0.3 },
				{ x: 790, top: 8, half: 160, snow: 0.6 },
			],
			H,
			{
				rock: '#8f9fb6',
				shade: '#6f809a',
				snow: '#ffffff',
				snowShade: '#cbd8ea',
			},
			43,
		),
	),
	near: svgUrl(
		W,
		H,
		under(moraineNear, '#7d7a76') +
			under((x) => moraineNear(x) + 8 + 6 * Math.sin(x / 13), '#696662') +
			// Snow lying in its gullies.
			mountains(
				[
					{ x: 120, top: 70, half: 40, snow: 0.5 },
					{ x: 470, top: 62, half: 50, snow: 0.45 },
					{ x: 760, top: 66, half: 44, snow: 0.5 },
				],
				120,
				{
					rock: '#7d7a76',
					shade: '#64615d',
					snow: '#eef3f8',
					snowShade: '#c3cfdf',
				},
				44,
			),
	),
	fill: MORAINE_FILL,
	nearer: [
		{
			// The glacier: ice, broken into seracs, crevasses across it.
			asset: svgUrl(
				W,
				110,
				under(wave(45, 34, 12, [5, 8, 13]), '#dfe9f2', 110) +
					under(wave(46, 52, 8, [6, 11]), '#c8d8e8', 110) +
					Array.from({ length: 18 }, (_, i) =>
						pixelPolygon(
							[
								[i * 54 + 10, 60 + (i % 3) * 14],
								[i * 54 + 34, 62 + (i % 3) * 14],
								[i * 54 + 22, 68 + (i % 3) * 14],
							],
							'#7f9bb8',
						),
					).join(''),
			),
			height: 110,
			fill: '#c8d8e8',
		},
	],
	sky: ['#4f9ae0', '#d4ecfa'],
}

// --- Over the clouds ------------------------------------------------------------

const CLOUD = '#f4f8fc'
const CLOUD_LIT = '#ffffff'
const CLOUD_SHADE = '#d9e6f2'

/** High up: the clouds below, only the highest peaks out of them, and a deep blue sky. */
const SUMMITS: NonNullable<CourseLook['horizon']> = {
	far: svgUrl(
		W,
		H,
		mountains(
			[
				// Lhotse, Makalu, Cho Oyu: the next highest there are, level with you.
				{ x: 160, top: 40, half: 110, snow: 0.75, lean: 0.2 },
				{ x: 470, top: 56, half: 90, snow: 0.8 },
				{ x: 760, top: 30, half: 120, snow: 0.75 },
			],
			H,
			{
				rock: '#7d8ca6',
				shade: '#5d6c88',
				snow: '#ffffff',
				snowShade: '#c4d3ea',
			},
			53,
		) + cloudSea(120, 54, { lit: CLOUD_LIT, cloud: CLOUD, shade: CLOUD_SHADE }),
	),
	near: svgUrl(
		W,
		H,
		cloudSea(78, 55, { lit: CLOUD_LIT, cloud: CLOUD, shade: CLOUD_SHADE }),
	),
	fill: CLOUD,
	nearer: [
		{
			asset: svgUrl(
				W,
				100,
				cloudSea(30, 56, {
					lit: CLOUD_LIT,
					cloud: '#eaf1f8',
					shade: '#d2e0ee',
				}),
			),
			height: 100,
			fill: '#d2e0ee',
		},
	],
	sky: ['#123f8c', '#8ec6ee'],
}

export const EVEREST_HORIZONS = { TREK, MORAINE, SUMMITS }

// --- The mountain, under the path ----------------------------------------------

/**
 * The mountain's colours, along it, for its ground's layers: the path and
 * the ground either side of it, and its face under it. Dirt and grass on
 * the trek in, blending into gravel and bare rock past the trees, `rock`,
 * and that into snow past the snow line, `snow`, each over `BLEND`.
 */
export function everestStrips(at: { rock: number; snow: number }) {
	const strip = (id: string, green: string, bare: string, white: string) => ({
		id,
		blend: true,
		stops: [
			[0, green],
			[at.rock - BLEND / 2, green],
			[at.rock + BLEND / 2, bare],
			[at.snow - BLEND / 2, bare],
			[at.snow + BLEND / 2, white],
		] as [number, string][],
	})
	return [
		strip('everest-verge', '#6fa04a', '#8f8b80', '#eef3f8'),
		strip('everest-path-edge', '#86683f', '#6d675e', '#b9c8d8'),
		strip('everest-path', '#a8875a', '#8d877d', '#dce5ee'),
		strip('everest-edge', '#4f7d38', '#5a564f', '#a9bccf'),
		strip('everest-rock', '#5e8f3e', '#77736b', '#f2f6fa'),
	]
}
/** How far along one part of the mountain blends into the next. */
const BLEND = 900

/**
 * Rock showing through the mountain's face, and stones, as a pattern laid
 * over its colour, whatever that is: grass, scree or snow. Mostly
 * see-through. Big, so it doesn't look tiled.
 */
export const EVEREST_FACE = (() => {
	const random = seeded(61)
	const width = 576
	const height = 432
	let body = ''
	const rect = (x: number, y: number, w: number, h: number, fill: string) => {
		// Wrapped round, so it tiles.
		for (const dx of [0, -width])
			for (const dy of [0, -height])
				body += `<rect x="${x + dx}" y="${y + dy}" width="${w}" height="${h}" fill="${fill}"/>`
	}
	const snap = (n: number) => Math.round(n / 4) * 4
	// Outcrops of rock: stepped, wider at the foot, lit along each ledge.
	for (let i = 0; i < 16; i++) {
		const x = snap(random() * width)
		const y = snap(random() * height)
		const w = snap(24 + random() * 60)
		const tiers = 2 + Math.floor(random() * 3)
		// Lopsided: each ledge in from either side by its own amount.
		let left = 0
		let right = 0
		for (let t = tiers - 1; t >= 0; t--) {
			const tw = Math.max(8, w - left - right)
			const ty = y + t * 6
			rect(x + left, ty, tw, 6, 'rgba(40,44,56,0.2)')
			rect(x + left + 2, ty, Math.max(4, tw - 8), 2, 'rgba(255,255,255,0.22)')
			left += snap(random() * w * 0.3)
			right += snap(random() * w * 0.15)
		}
		rect(x + 4, y + tiers * 6, Math.max(8, w - 8), 4, 'rgba(40,44,56,0.1)')
	}
	// Stones, scattered.
	for (let i = 0; i < 40; i++) {
		const x = snap(random() * width)
		const y = snap(random() * height)
		rect(x, y, random() < 0.5 ? 4 : 8, 4, 'rgba(40,44,56,0.16)')
	}
	return `<pattern id="everest-face" patternUnits="userSpaceOnUse" width="${width}" height="${height}">${body}</pattern>`
})()

// --- Along the path ----------------------------------------------------------------

/** Prayer flags' colours, in their order: sky, air, fire, water, earth. */
export const FLAG_COLOURS = [
	'#2d6fd0',
	'#f3f3f3',
	'#d8342c',
	'#2f9b4a',
	'#f5c518',
]

/** A string of prayer flags between two poles, sagging: 48 by 26. */
export const prayerFlags = (() => {
	const rects: PixelRect[] = [
		[1, 2, 1, 24, '#6b4a2b'],
		[46, 2, 1, 24, '#6b4a2b'],
		[0, 1, 3, 1, '#e7c25a'],
		[45, 1, 3, 1, '#e7c25a'],
	]
	let colour = 0
	for (let x = 2; x < 46; x++) {
		const t = (x - 24) / 22
		const y = 3 + Math.round(7 * (1 - t * t))
		rects.push([x, y, 1, 1, '#5a4a3a'])
		if (x % 4 === 3 && x < 44) {
			rects.push([x, y + 1, 3, 4, FLAG_COLOURS[colour % 5]])
			colour++
		}
	}
	return pixelArt(48, 26, rects)
})()

/** A chorten, a stupa: whitewashed steps and dome, a gold spire, eyes on its tower. 18 by 28. */
export const chorten = pixelArt(18, 28, [
	// Its spire, in tiers, and its crown.
	[8, 0, 2, 2, '#e8b830'],
	[7, 2, 4, 1, '#c99a22'],
	[7, 3, 4, 2, '#e8b830'],
	[6, 5, 6, 1, '#c99a22'],
	[6, 6, 6, 2, '#e8b830'],
	// Its tower, eyes on it.
	[5, 8, 8, 4, '#f2eee4'],
	[6, 9, 2, 1, '#2b2b2b'],
	[10, 9, 2, 1, '#2b2b2b'],
	[8, 10, 2, 1, '#3a6ad0'],
	// Its dome.
	[3, 12, 12, 1, '#f2eee4'],
	[2, 13, 14, 4, '#f6f2ea'],
	[3, 17, 12, 1, '#dcd6c8'],
	[11, 13, 5, 4, '#dcd6c8'],
	// Its steps.
	[1, 18, 16, 3, '#ece7dc'],
	[0, 21, 18, 3, '#e2dccf'],
	[0, 24, 18, 4, '#cfc8b8'],
	[12, 18, 5, 10, 'rgba(0,0,0,0.08)'],
	// Prayer flags off its spire.
	[11, 2, 1, 1, '#d8342c'],
	[12, 3, 1, 1, '#2f9b4a'],
	[13, 4, 1, 1, '#f5c518'],
	[6, 2, 1, 1, '#2d6fd0'],
	[5, 3, 1, 1, '#f3f3f3'],
])

/** A mani wall: stones carved with prayers, piled up. 22 by 9. */
export const maniWall = pixelArt(22, 9, [
	[0, 3, 22, 6, '#8a8780'],
	[1, 2, 20, 1, '#9d9a92'],
	[0, 8, 22, 1, '#6c6962'],
	[2, 4, 3, 2, '#e9e4d6'],
	[7, 5, 4, 1, '#e9e4d6'],
	[13, 4, 2, 2, '#e9e4d6'],
	[17, 5, 3, 1, '#e9e4d6'],
	[5, 0, 4, 3, '#a8a49b'],
	[14, 1, 5, 2, '#a8a49b'],
	[6, 1, 2, 1, '#e9e4d6'],
])

/** A rhododendron bush, Nepal's flower, in bloom: 16 by 12. */
export const rhododendron = pixelArt(16, 12, [
	[3, 2, 10, 1, '#3f7a3a'],
	[1, 3, 14, 6, '#4b8a42'],
	[2, 9, 12, 2, '#3a6a33'],
	[7, 11, 2, 1, '#5b3b22'],
	[3, 3, 2, 2, '#e23a5a'],
	[8, 2, 2, 2, '#e23a5a'],
	[12, 4, 2, 2, '#e23a5a'],
	[5, 6, 2, 2, '#f06a86'],
	[10, 7, 2, 2, '#e23a5a'],
	[2, 7, 2, 1, '#f06a86'],
	[9, 2, 1, 1, '#f9b8c8'],
])

/** A pine, tall and dark, in tiers: 10 by 26. */
export const pine = (() => {
	const rects: PixelRect[] = [[4, 22, 2, 4, '#5b3b22']]
	for (let tier = 0; tier < 5; tier++) {
		const w = 2 + tier * 2
		rects.push([5 - w / 2, 2 + tier * 4, w, 4, '#2f5a33'])
		rects.push([5 - w / 2, 5 + tier * 4, w, 1, '#24472a'])
	}
	rects.push([4, 0, 2, 2, '#2f5a33'])
	return pixelArt(10, 26, rects)
})()

/** A yak, shaggy and dark, its horns up, a bell round its neck: 22 by 15. */
export const yak = pixelArt(22, 15, [
	// Its horns.
	[17, 0, 1, 2, '#e9e1cc'],
	[21, 0, 1, 2, '#e9e1cc'],
	[18, 2, 3, 1, '#e9e1cc'],
	// Its head, low.
	[17, 3, 5, 4, '#3a2c22'],
	[20, 4, 1, 1, '#0f0f0f'],
	[21, 6, 1, 1, '#5a4636'],
	// Its body, a hump at its shoulders, its shag hanging long.
	[3, 3, 14, 7, '#3a2c22'],
	[12, 2, 5, 2, '#3a2c22'],
	[2, 4, 1, 4, '#2a1f18'],
	[0, 5, 2, 1, '#2a1f18'],
	[3, 10, 14, 2, '#2a1f18'],
	[4, 12, 1, 1, '#2a1f18'],
	[8, 12, 1, 1, '#2a1f18'],
	[13, 12, 1, 1, '#2a1f18'],
	// A saddle blanket, and its bell.
	[7, 3, 5, 3, '#c8322b'],
	[7, 5, 5, 1, '#f5c518'],
	[16, 8, 1, 2, '#e8b830'],
	// Its legs.
	[4, 12, 2, 3, '#2a1f18'],
	[8, 12, 2, 3, '#2a1f18'],
	[12, 12, 2, 3, '#2a1f18'],
	[15, 12, 2, 3, '#2a1f18'],
])

/** A climbers' tent, a dome, guyed down: 20 by 12, in `fly`'s colour. */
export const tent = (fly: string, shade: string) =>
	pixelArt(20, 12, [
		[6, 1, 8, 1, fly],
		[4, 2, 12, 1, fly],
		[3, 3, 14, 2, fly],
		[2, 5, 16, 5, fly],
		[1, 10, 18, 2, fly],
		[11, 2, 5, 10, shade],
		// Its door, zipped, and its poles.
		[6, 6, 4, 6, '#2b2b2b'],
		[7, 7, 2, 5, '#4a4a4a'],
		[9, 0, 1, 2, '#2b2b2b'],
		[3, 3, 1, 1, '#2b2b2b'],
		[16, 3, 1, 1, '#2b2b2b'],
		// Guy lines.
		[0, 11, 1, 1, '#d8d8d8'],
		[19, 11, 1, 1, '#d8d8d8'],
	])

/** A boulder, grey, or with snow on it: 14 by 9. */
export const boulder = (snowy: boolean) =>
	pixelArt(14, 9, [
		[3, 1, 8, 1, '#8a8a8a'],
		[1, 2, 12, 5, '#7a7a7a'],
		[0, 4, 14, 5, '#6a6a6a'],
		[8, 2, 5, 7, '#575757'],
		[3, 3, 3, 1, '#9b9b9b'],
		...(snowy
			? ([
					[2, 0, 9, 2, '#f6f9fc'],
					[1, 2, 4, 1, '#f6f9fc'],
					[9, 2, 3, 1, '#d4e0ee'],
				] as PixelRect[])
			: []),
	])

/** A serac: a tower of ice, broken off the glacier, blue in its cracks. 16 by 24. */
export const serac = pixelArt(16, 24, [
	[3, 0, 6, 2, '#f4f9ff'],
	[2, 2, 10, 4, '#e6f1fb'],
	[1, 6, 13, 10, '#d6e7f6'],
	[0, 16, 16, 8, '#c8dcef'],
	[9, 2, 3, 22, '#a9c6e2'],
	[12, 6, 2, 18, '#94b6d8'],
	[5, 4, 1, 8, '#7fa6cf'],
	[4, 12, 2, 1, '#7fa6cf'],
	[7, 16, 1, 6, '#7fa6cf'],
	[2, 2, 2, 1, '#ffffff'],
	[1, 6, 2, 1, '#ffffff'],
])

/** A cairn: stones piled up, a flag on top. 8 by 16. */
export const cairn = pixelArt(8, 16, [
	[4, 0, 1, 6, '#6b4a2b'],
	[5, 0, 3, 2, FLAG_COLOURS[2]],
	[5, 2, 3, 1, FLAG_COLOURS[4]],
	[3, 6, 3, 2, '#8c8a85'],
	[2, 8, 5, 2, '#7a7873'],
	[1, 10, 6, 3, '#8c8a85'],
	[0, 13, 8, 3, '#6c6a65'],
	[5, 10, 2, 3, '#6c6a65'],
])

/**
 * A camp's signpost: its name, and how high up it is, on a board on a
 * post, prayer flags tied to it.
 */
export function campSign(name: string, height: string) {
	const cell = 1
	const width =
		Math.max(pixelTextWidth(name, cell), pixelTextWidth(height, cell)) + 8
	const board = 22
	const total = board + 22
	const middle = Math.round(width / 2)
	return svgUrl(
		width,
		total,
		[
			`<rect x="${middle - 1}" y="${board}" width="3" height="${total - board}" fill="#6b4a2b"/>`,
			`<rect x="0" y="0" width="${width}" height="${board}" fill="#5a3b1e"/>`,
			`<rect x="1" y="1" width="${width - 2}" height="${board - 2}" fill="#b07a42"/>`,
			pixelText(
				name,
				Math.round((width - pixelTextWidth(name, cell)) / 2),
				3,
				cell,
				'#fff6e0',
			),
			pixelText(
				height,
				Math.round((width - pixelTextWidth(height, cell)) / 2),
				12,
				cell,
				'#2b1a0c',
			),
			...FLAG_COLOURS.map(
				(c, i) =>
					`<rect x="${middle + 2 + i * 3}" y="${board + 1 + i}" width="3" height="3" fill="${c}"/>`,
			),
		].join(''),
	)
}
