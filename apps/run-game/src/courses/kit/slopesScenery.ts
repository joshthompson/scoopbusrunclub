import type { CourseLook } from '../types'
import {
	type PixelRect,
	paintedArt,
	pixelArt,
	pixelCircle,
	pixelPolygon,
	pixelText,
	pixelTextWidth,
	svgUrl,
} from './pixelArt'
import { seeded } from './seeded'

/**
 * The Slopes, drawn in code: what's on the horizon going down, three times
 * over, each fading in as the descent gets to it (see `CourseLook['voyage']`);
 * what stands along the piste; and the snow itself, under it.
 *
 * At the top, the fells, rounded and white, over the forest, ski runs cut
 * down through it. In the forest, the afternoon going gold, the runs and a
 * lift across the hill opposite. And at the foot, dusk: the village's
 * windows lit in the valley, its church, the fells gone dark blue, and the
 * northern lights over them.
 */

const W = 960
const H = 160
const TAU = Math.PI * 2

/** A wavy line along a band, `base` down it, `amp` either way, the same at either end, so the band goes round. */
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

/** The land under a wavy line, `top`, on down to `bottom`, in `fill`. */
function under(top: (x: number) => number, fill: string, bottom = H) {
	let out = ''
	for (let x = 0; x < W; x += 2) {
		const y = Math.max(0, Math.round(top(x + 1) / 2) * 2)
		if (y < bottom)
			out += `<rect x="${x}" y="${y}" width="2" height="${bottom - y}" fill="${fill}"/>`
	}
	return out
}

/**
 * Rounded fells under `top`, lit from the left: where the line climbs to
 * the right, its face to the sun, `lit`; falling away, in `shade`.
 */
function fells(
	top: (x: number) => number,
	lit: string,
	shade: string,
	bottom = H,
) {
	let out = ''
	for (let x = 0; x < W; x += 2) {
		const y = Math.max(0, Math.round(top(x + 1) / 2) * 2)
		const rising = top(x + 3) < top(x - 1)
		if (y < bottom)
			out += `<rect x="${x}" y="${y}" width="2" height="${bottom - y}" fill="${rising ? lit : shade}"/>`
	}
	return out
}

/** Forest, its edge `top`, spiky with pines, `count` of them standing up out of it, on down to `bottom`. */
function forest(
	top: (x: number) => number,
	fill: string,
	count: number,
	seed: number,
	bottom = H,
	snow?: string,
) {
	const random = seeded(seed)
	let out = under(top, fill, bottom)
	for (let i = 0; i < count; i++) {
		const x = Math.round((random() * W) / 2) * 2
		const h = 6 + Math.round(random() * 5) * 2
		const y = Math.round(top(x) / 2) * 2 + 2
		for (const shift of [-W, 0, W]) {
			out += pixelPolygon(
				[
					[x + shift, y - h],
					[x + shift - 4, y],
					[x + shift + 4, y],
				],
				fill,
			)
			if (snow)
				out += `<rect x="${x + shift - 1}" y="${y - h + 2}" width="2" height="2" fill="${snow}"/>`
		}
	}
	return out
}

/**
 * Ski runs cut down through the forest on a hill opposite: bands of white,
 * from `top`, slanting down, `count` of them.
 */
function runs(
	top: (x: number) => number,
	colour: string,
	count: number,
	seed: number,
	bottom = H,
) {
	const random = seeded(seed)
	let out = ''
	for (let i = 0; i < count; i++) {
		// Evenly along it, give or take, all down the same way: never crossing.
		const x = Math.round(((i + 0.2 + random() * 0.6) * W) / count)
		const lean = -0.45 - random() * 0.2
		const width = 6 + Math.round(random() * 3) * 2
		for (let y = Math.round(top(x) / 2) * 2; y < bottom; y += 2) {
			const at = Math.round((x + (y - top(x)) * lean) / 2) * 2
			for (const shift of [-W, 0, W])
				out += `<rect x="${at + shift}" y="${y}" width="${width}" height="2" fill="${colour}"/>`
		}
	}
	return out
}

/** A chairlift's line up a hill: its cable, and its pylons and chairs, dots along it. */
function liftLine(from: [number, number], to: [number, number], ink: string) {
	let out = ''
	const steps = Math.round(Math.abs(to[0] - from[0]) / 2)
	for (let i = 0; i <= steps; i++) {
		const t = i / steps
		const x = Math.round((from[0] + (to[0] - from[0]) * t) / 2) * 2
		const y = Math.round((from[1] + (to[1] - from[1]) * t) / 2) * 2
		out += `<rect x="${x}" y="${y}" width="2" height="1" fill="${ink}"/>`
		if (i % 14 === 0)
			out += `<rect x="${x}" y="${y}" width="2" height="8" fill="${ink}"/>`
		if (i % 7 === 3)
			out += `<rect x="${x - 2}" y="${y + 2}" width="4" height="2" fill="${ink}"/>`
	}
	return out
}

/** Stars, `count` of them, scattered over the sky down to `low`. */
function stars(count: number, low: number, seed: number) {
	const random = seeded(seed)
	let out = ''
	for (let i = 0; i < count; i++) {
		const x = Math.round(random() * W)
		const y = Math.round(random() * low)
		const bright = random() < 0.25
		out += `<rect x="${x}" y="${y}" width="${bright ? 2 : 1}" height="${bright ? 2 : 1}" fill="rgba(255,255,255,${bright ? 0.9 : 0.6})"/>`
	}
	return out
}

/**
 * The northern lights: curtains of green hanging in the sky, brighter along
 * their lower edges, pink at their tops, shimmering.
 */
function aurora() {
	const a = wave(71, 26, 22, [1, 2, 3])
	const b = wave(72, 40, 16, [2, 3, 5])
	let curtains = ''
	for (let x = 0; x < W; x += 2) {
		const top = Math.round(a(x) / 2) * 2
		const length =
			Math.round((26 + 18 * Math.sin((x / W) * TAU * 3 + 1)) / 2) * 2
		const glow = 0.18 + 0.14 * Math.sin((x / W) * TAU * 7)
		curtains += `<rect x="${x}" y="${Math.max(0, top - 10)}" width="2" height="10" fill="rgba(255,120,210,${(glow * 0.5).toFixed(2)})"/>`
		curtains += `<rect x="${x}" y="${top}" width="2" height="${length}" fill="rgba(90,240,170,${glow.toFixed(2)})"/>`
		curtains += `<rect x="${x}" y="${top + length - 4}" width="2" height="4" fill="rgba(170,255,210,${(glow + 0.25).toFixed(2)})"/>`
		// A second, fainter, behind.
		const second = Math.round(b(x) / 2) * 2
		curtains += `<rect x="${x}" y="${second}" width="2" height="18" fill="rgba(80,210,200,${(glow * 0.45).toFixed(2)})"/>`
	}
	return `<g>${curtains}<animate attributeName="opacity" values="0.75;1;0.85;1;0.75" dur="7s" repeatCount="indefinite"/></g>`
}

/**
 * A band of forest nearer still, below the horizon, its pines' snowy tops
 * along its top, and snow on down under it: what's down the hill, looking
 * down it, rather than nothing. Clear over its top, for what's behind.
 */
function nearerForest(trees: string, snow: string, seed: number, base = 64) {
	return {
		asset: svgUrl(
			W,
			100,
			`${
				forest(
					wave(seed, base, 8, [4, 9, 15]),
					trees,
					120,
					seed + 1,
					86,
					'#eef4fa',
				) +
				runs(
					(x) => wave(seed, base, 8, [4, 9, 15])(x) - 4,
					snow,
					3,
					seed + 2,
					86,
				)
			}<rect x="0" y="86" width="${W}" height="14" fill="${snow}"/>`,
		),
		height: 100,
		fill: snow,
	}
}

// --- At the top: the fells --------------------------------------------------------

const fellFar = wave(11, 70, 34, [1, 2, 5])
const fellMiddle = wave(12, 100, 24, [2, 3, 7])
const fellTreeline = wave(13, 134, 6, [3, 8])
const fellNear = wave(14, 50, 28, [1, 3, 4])
const fellForest = wave(15, 104, 12, [3, 5, 11])

const FELL: NonNullable<CourseLook['horizon']> = {
	far: svgUrl(
		W,
		H,
		fells(fellFar, '#e2ecf7', '#bccfe5') +
			fells(fellMiddle, '#f6f9fc', '#d2dfee') +
			forest(fellTreeline, '#4b6f6a', 60, 16),
	),
	near: svgUrl(
		W,
		H,
		`${
			fells(fellNear, '#ffffff', '#dbe6f2') +
			forest((x) => fellForest(x), '#2f5547', 90, 17, 140, '#e8f0f8') +
			runs(fellForest, '#f2f7fc', 4, 18, 140) +
			liftLine([140, 120], [420, 66], '#38404c')
		}<rect x="0" y="140" width="${W}" height="20" fill="#eef4fa"/>`,
	),
	fill: '#4b6f6a',
	nearer: [
		nearerForest('#2a4b40', '#e6eef7', 41),
		nearerForest('#22402f', '#dfe9f4', 43, 40),
	],
	sky: ['#2c7bd8', '#d4ebfc'],
}

// --- In the forest: the afternoon ---------------------------------------------------

const forestFar = wave(21, 64, 30, [1, 2, 4])
const forestFarTrees = wave(22, 108, 10, [3, 6])
const forestNearTop = wave(23, 70, 20, [4, 7, 13])

const FOREST: NonNullable<CourseLook['horizon']> = {
	far: svgUrl(
		W,
		H,
		fells(forestFar, '#fff1de', '#c9cfe6') +
			forest(forestFarTrees, '#3c5f58', 80, 24, H, '#f3e6d6') +
			runs(forestFarTrees, '#fbefe0', 5, 25) +
			liftLine([600, 150], [820, 74], '#3a3340'),
	),
	near: svgUrl(
		W,
		H,
		`${forest(forestNearTop, '#28483c', 160, 26, 138, '#eef4fa')}<rect x="0" y="138" width="${W}" height="22" fill="#eef4fa"/>`,
	),
	fill: '#3c5f58',
	nearer: [
		nearerForest('#22402f', '#e9eaf1', 42),
		nearerForest('#1c3628', '#dde3ee', 44, 40),
	],
	sky: ['#3b74c2', '#f8d6aa'],
}

// --- At the foot: dusk, and the northern lights ---------------------------------------

const duskFar = wave(31, 92, 26, [1, 2, 5])
const duskNear = wave(32, 92, 8, [3, 7])

/** The village in the valley: houses, their windows lit, its church, along `top`, in the dark of the forest. */
function village() {
	const random = seeded(33)
	let out = forest(duskNear, '#18233c', 110, 34, 136, '#4c5c88')
	for (let i = 0; i < 26; i++) {
		const x = Math.round((random() * W) / 2) * 2
		const w = 12 + Math.round(random() * 4) * 2
		const h = 8 + Math.round(random() * 2) * 2
		const base = 132
		const red = random() < 0.7
		for (const shift of [-W, 0, W]) {
			const left = x + shift
			// The house, its snowy roof, and a window or two lit.
			out += `<rect x="${left}" y="${base - h}" width="${w}" height="${h}" fill="${red ? '#5e2229' : '#3a3f5e'}"/>`
			out += pixelPolygon(
				[
					[left - 2, base - h],
					[left + w / 2, base - h - 6],
					[left + w + 2, base - h],
				],
				'#b8c4e2',
			)
			out += `<rect x="${left + 2}" y="${base - h + 3}" width="2" height="2" fill="#ffd36b"/>`
			if (w > 14)
				out += `<rect x="${left + w - 5}" y="${base - h + 3}" width="2" height="2" fill="#ffc04d"/>`
		}
	}
	// The church: white, its tower and spire, a light in it.
	for (const shift of [-W, 0, W]) {
		const x = 610 + shift
		out += `<rect x="${x}" y="108" width="26" height="24" fill="#c9cfe6"/>`
		out += `<rect x="${x + 4}" y="86" width="10" height="22" fill="#d9deef"/>`
		out += pixelPolygon(
			[
				[x + 2, 88],
				[x + 9, 66],
				[x + 16, 88],
			],
			'#2a3355',
		)
		out += `<rect x="${x + 8}" y="94" width="2" height="4" fill="#ffd36b"/>`
		out += `<rect x="${x + 16}" y="116" width="2" height="4" fill="#ffd36b"/>`
		out += `<rect x="${x + 20}" y="116" width="2" height="4" fill="#ffd36b"/>`
	}
	return `${out}<rect x="0" y="136" width="${W}" height="24" fill="#9eacd2"/>`
}

const DUSK: NonNullable<CourseLook['horizon']> = {
	far: svgUrl(
		W,
		H,
		stars(70, 70, 35) +
			aurora() +
			fells(duskFar, '#5b6ea8', '#3b4a80') +
			forest(wave(36, 128, 6, [4, 9]), '#22304f', 70, 37),
	),
	near: svgUrl(W, H, village()),
	fill: '#22304f',
	nearer: [
		{
			asset: svgUrl(
				W,
				100,
				`${forest(wave(38, 70, 6, [5, 11]), '#1a2440', 90, 39, 84, '#8b9bc8')}<rect x="0" y="84" width="${W}" height="16" fill="#a3b1d6"/>`,
			),
			height: 100,
			fill: '#a3b1d6',
		},
	],
	sky: ['#0a1230', '#e49aa6'],
}

export const SLOPES_HORIZONS = { FELL, FOREST, DUSK }

// --- The snow, under the piste -------------------------------------------------------

/** How far each change of light blends into the next. */
const BLEND = 1600

/**
 * The snow's colours, along the course, for its ground's layers: white in
 * the day, going pink and lavender as the sun goes, `dusk`, and blue by
 * the time it's dark, `night`.
 */
export function slopesStrips(at: { dusk: number; night: number }) {
	const strip = (id: string, day: string, dusk: string, night: string) => ({
		id,
		blend: true,
		stops: [
			[0, day],
			[at.dusk - BLEND / 2, day],
			[at.dusk + BLEND / 2, dusk],
			[at.night - BLEND / 2, dusk],
			[at.night + BLEND / 2, night],
		] as [number, string][],
	})
	return [
		strip('slopes-verge', '#f3f7fc', '#f1e3ea', '#b5c1e0'),
		strip('slopes-path-edge', '#d0deed', '#d4c4d8', '#8f9cc4'),
		strip('slopes-piste', '#e7eff8', '#eadbe4', '#a9b6da'),
		strip('slopes-edge', '#b3c6dc', '#b6a6c4', '#7a88b2'),
		strip('slopes-snow', '#f6f9fd', '#f3e5ec', '#b9c5e3'),
	]
}

/**
 * Patterns for the snow: glints all over the piste, and down the face of
 * the hill under it, drifts and a few rocks and little pines poking out.
 */
export const SLOPES_FACE = (() => {
	const random = seeded(77)
	let sparkle = ''
	for (let i = 0; i < 40; i++) {
		const x = Math.round((random() * 200) / 2) * 2
		const y = Math.round((random() * 120) / 2) * 2
		sparkle += `<rect x="${x}" y="${y}" width="2" height="2" fill="${random() < 0.5 ? 'rgba(255,255,255,0.9)' : 'rgba(150,180,220,0.35)'}"/>`
	}
	const width = 576
	const height = 432
	let face = ''
	const rect = (x: number, y: number, w: number, h: number, fill: string) => {
		for (const dx of [0, -width])
			for (const dy of [0, -height])
				face += `<rect x="${x + dx}" y="${y + dy}" width="${w}" height="${h}" fill="${fill}"/>`
	}
	const snap = (n: number) => Math.round(n / 4) * 4
	// Drifts: long low swells, shaded under.
	for (let i = 0; i < 14; i++) {
		const x = snap(random() * width)
		const y = snap(random() * height)
		const w = snap(60 + random() * 120)
		rect(x, y, w, 4, 'rgba(255,255,255,0.5)')
		rect(x + 8, y + 4, w - 16, 4, 'rgba(60,90,140,0.08)')
	}
	// Rocks poking out of the snow, snow on their tops.
	for (let i = 0; i < 7; i++) {
		const x = snap(random() * width)
		const y = snap(random() * height)
		const w = snap(12 + random() * 16)
		rect(x, y + 4, w, 8, 'rgba(70,78,96,0.35)')
		rect(x + 2, y, w - 4, 4, 'rgba(255,255,255,0.8)')
	}
	// Little pines, down the hill, in clumps, snow on their tiers.
	for (let i = 0; i < 6; i++) {
		const cx = snap(random() * width)
		const cy = snap(random() * height)
		for (let j = 0; j < 3; j++) {
			const x = cx + snap(j * 20 + random() * 8)
			const y = cy + snap(random() * 12)
			const tiers = 3 + Math.floor(random() * 2)
			for (let t = 0; t < tiers; t++) {
				const w = 4 + t * 4
				rect(x - w / 2 + 2, y + t * 6, w, 6, 'rgba(38,74,58,0.45)')
				rect(
					x - w / 2 + 2,
					y + t * 6,
					Math.max(4, w - 4),
					2,
					'rgba(255,255,255,0.7)',
				)
			}
			rect(x, y + tiers * 6, 4, 4, 'rgba(70,50,30,0.4)')
		}
	}
	return (
		`<pattern id="slopes-sparkle" patternUnits="userSpaceOnUse" width="200" height="120">${sparkle}</pattern>` +
		`<pattern id="slopes-face" patternUnits="userSpaceOnUse" width="${width}" height="${height}">${face}</pattern>`
	)
})()

// --- Along the piste ----------------------------------------------------------------

const SNOW = '#f6f9fc'
const SNOW_SHADE = '#cfdcec'
const INK = '#1d1d1d'
const LIT = '#ffd36b'

/** A pine, heavy with snow, in tiers: small, medium or tall. */
export const snowyPine = (size: 0 | 1 | 2) => {
	const tiers = [4, 5, 7][size]
	const width = [12, 14, 18][size]
	const height = tiers * 5 + 6
	const rects: PixelRect[] = [[width / 2 - 1, height - 5, 2, 5, '#5b3b22']]
	for (let tier = 0; tier < tiers; tier++) {
		const w = Math.min(width, 4 + tier * 2 + (size === 2 ? 2 : 0))
		const y = 2 + tier * 5
		const left = Math.round((width - w) / 2)
		rects.push([left, y, w, 5, tier % 2 ? '#26493a' : '#2c5444'])
		rects.push([left + 1, y + 4, w - 2, 1, '#1d3a2d'])
		// Snow along each tier's top, heavier on the left, where it's lit.
		rects.push([left, y, Math.ceil(w * 0.7), 1, SNOW])
		rects.push([left, y + 1, 2, 1, SNOW_SHADE])
	}
	rects.push([width / 2 - 1, 0, 2, 2, SNOW])
	return pixelArt(width, height, rects)
}

/** A birch, white, its black marks, bare in the snow: 10 by 34. */
export const birch = (() => {
	const rects: PixelRect[] = [
		[4, 6, 2, 28, '#eeeae2'],
		[5, 6, 1, 28, '#cfcac0'],
		[4, 10, 2, 1, INK],
		[5, 15, 1, 1, INK],
		[4, 20, 2, 1, INK],
		[4, 26, 1, 1, INK],
		[5, 30, 1, 1, INK],
		// Bare branches, a little snow on them.
		[2, 4, 1, 4, '#6b5b4b'],
		[1, 2, 1, 2, '#6b5b4b'],
		[7, 6, 1, 3, '#6b5b4b'],
		[8, 3, 1, 3, '#6b5b4b'],
		[6, 1, 1, 5, '#6b5b4b'],
		[3, 0, 1, 4, '#6b5b4b'],
		[1, 2, 1, 1, SNOW],
		[8, 3, 1, 1, SNOW],
		[6, 1, 1, 1, SNOW],
		[3, 0, 1, 1, SNOW],
	]
	return pixelArt(10, 34, rects)
})()

/** A wooden cabin, Falu red, its corners white, snow on its roof, a window lit: three roofs. */
export const cabin = (roof: 0 | 1 | 2) => {
	const red = ['#9b2b23', '#8a2c25', '#a33a2a'][roof]
	const rects: PixelRect[] = [
		// Its walls, boards across them.
		[2, 14, 32, 16, red],
		...[16, 19, 22, 25, 28].map(
			(y): PixelRect => [2, y, 32, 1, 'rgba(0,0,0,0.15)'],
		),
		// White corners and trim.
		[2, 14, 2, 16, SNOW],
		[32, 14, 2, 16, SNOW],
		// Its windows, lit, with white frames, crossed.
		[7, 18, 7, 7, SNOW],
		[8, 19, 5, 5, LIT],
		[10, 19, 1, 5, SNOW],
		[8, 21, 5, 1, SNOW],
		[23, 18, 6, 12, SNOW],
		[24, 19, 4, 11, '#5b3b22'],
		[27, 24, 1, 1, LIT],
		// Its roof, snow piled on it, and a chimney.
		[0, 10, 36, 4, '#3a2b25'],
		[1, 6, 34, 4, '#3a2b25'],
		[3, 2, 30, 4, '#3a2b25'],
		[0, 9, 36, 2, SNOW],
		[1, 5, 34, 2, SNOW],
		[3, 1, 30, 2, SNOW],
		[0, 11, 36, 1, SNOW_SHADE],
		[26, 0, 4, 4, '#6b6b6b'],
		[26, 0, 4, 1, SNOW],
	]
	// Icicles off the eaves.
	for (let x = 2; x < 34; x += 4 + (roof % 2))
		rects.push([x, 14, 1, 1 + (x % 3), '#cfe4f7'])
	return pixelArt(36, 30, rects)
}

/** The top station of the lift: concrete, its great wheel turning the cable, a sign. */
export const liftStation = (() => {
	let body = ''
	const rect = (x: number, y: number, w: number, h: number, fill: string) => {
		body += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`
	}
	// The cable, off to the left, down the hill.
	for (let x = 0; x < 30; x += 2)
		rect(x, 18 + Math.round(x * 0.1), 2, 1, '#38404c')
	// The bullwheel, its housing, and the station under it.
	rect(28, 12, 44, 10, '#8b939e')
	rect(28, 12, 44, 2, SNOW)
	body += pixelCircle(50, 18, 6, '#4a525d', 1)
	body += pixelCircle(50, 18, 3, '#c9ced4', 1)
	rect(34, 22, 32, 26, '#b9c0c9')
	rect(34, 22, 32, 1, '#8b939e')
	rect(38, 28, 10, 8, '#9fd0f0')
	rect(52, 28, 10, 8, '#9fd0f0')
	rect(39, 29, 2, 6, '#ffffff')
	rect(44, 38, 12, 10, '#5d646d')
	// Its sign: the top.
	rect(30, 2, 40, 9, '#d8342c')
	body += pixelText('TOPPEN', 33, 3, 1, '#ffffff')
	return svgUrl(72, 48, body)
})()

/** A pylon of the chairlift, its cross-arm and wheels, and a chair hanging off it, empty. */
export const liftPylon = (() => {
	const rects: PixelRect[] = [
		// Its tower, tapering, a ladder up it.
		[13, 10, 4, 86, '#8b939e'],
		[12, 60, 6, 36, '#8b939e'],
		[14, 12, 2, 84, '#6c747e'],
		// Its cross-arm, and the wheels along it.
		[2, 8, 26, 3, '#6c747e'],
		[3, 6, 4, 2, INK],
		[23, 6, 4, 2, INK],
		// The cable, either way.
		[0, 6, 30, 1, '#38404c'],
		// A chair, hanging off it, red, snow on its seat.
		[24, 7, 1, 16, '#38404c'],
		[18, 22, 8, 1, '#38404c'],
		[18, 23, 1, 7, '#38404c'],
		[18, 29, 9, 2, '#d8342c'],
		[18, 28, 8, 1, SNOW],
		[25, 24, 2, 5, '#d8342c'],
	]
	return pixelArt(30, 96, rects)
})()

/** A Swedish flag, on its pole. */
export const swedishFlag = pixelArt(20, 44, [
	[1, 2, 2, 42, '#c9ced4'],
	[1, 0, 2, 2, '#f5c518'],
	[3, 3, 16, 10, '#006aa7'],
	[3, 7, 16, 2, '#fecc00'],
	[8, 3, 2, 10, '#fecc00'],
])

/** A piste sign, at the top of a run: its colour's mark, and its name. */
export function pisteSign(
	colour: 'green' | 'blue' | 'red' | 'black',
	name: string,
) {
	const fill = {
		green: '#2f9b4a',
		blue: '#2d6fd0',
		red: '#d8342c',
		black: INK,
	}[colour]
	const width = Math.max(18, pixelTextWidth(name, 1) + 6)
	let body = ''
	const rect = (x: number, y: number, w: number, h: number, c: string) => {
		body += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`
	}
	rect(width / 2 - 1, 18, 2, 18, '#6b4a2b')
	rect(0, 0, width, 19, '#f6f7f8')
	rect(0, 18, width, 1, '#9aa3ad')
	// A circle for green, a square for blue and red, a diamond for black.
	if (colour === 'green') body += pixelCircle(width / 2, 5, 3.5, fill, 1)
	else if (colour === 'black')
		body += pixelPolygon(
			[
				[width / 2, 1],
				[width / 2 + 4, 5],
				[width / 2, 9],
				[width / 2 - 4, 5],
			],
			fill,
			1,
		)
	else rect(width / 2 - 3, 2, 6, 6, fill)
	body += pixelText(name, (width - pixelTextWidth(name, 1)) / 2, 10, 1, fill)
	rect(0, 0, width, 1, SNOW)
	return svgUrl(width, 36, body)
}

/**
 * A warning, before a creek to jump: a yellow triangle, an exclamation mark
 * in it, on a post, and a board under it, its `lines`.
 */
export function jumpSign(lines: string[]) {
	const width = Math.max(24, ...lines.map((l) => pixelTextWidth(l, 1) + 6))
	const board = lines.length * 9 + 3
	const middle = Math.round(width / 2)
	let body = ''
	const rect = (x: number, y: number, w: number, h: number, c: string) => {
		body += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`
	}
	// Its post, down into the snow.
	rect(middle - 1, 20, 2, board + 18, '#7d858f')
	// The triangle: black edged, yellow, the mark in it.
	body += pixelPolygon(
		[
			[middle, 0],
			[middle + 12, 20],
			[middle - 12, 20],
		],
		INK,
		1,
	)
	body += pixelPolygon(
		[
			[middle, 3],
			[middle + 9, 18],
			[middle - 9, 18],
		],
		'#f5c518',
		1,
	)
	rect(middle - 1, 7, 2, 6, INK)
	rect(middle - 1, 15, 2, 2, INK)
	// The board, under it.
	rect(0, 22, width, board, INK)
	rect(1, 23, width - 2, board - 2, '#f5c518')
	lines.forEach((line, i) => {
		body += pixelText(
			line,
			(width - pixelTextWidth(line, 1)) / 2,
			24 + i * 9,
			1,
			INK,
		)
	})
	return svgUrl(width, board + 38, body)
}

/** How to do tricks: a board by the start, its lines in pixel letters. */
export const trickSign = (() => {
	const lines = [
		'TRICKS IN THE AIR',
		'↑  FORWARD ROLL',
		'←  BACKFLIP',
		'→  360 SPIN',
		'↓  GRAB',
	]
	const width = Math.max(...lines.map((l) => pixelTextWidth(l, 1))) + 8
	const height = lines.length * 9 + 5
	let body = ''
	const rect = (x: number, y: number, w: number, h: number, c: string) => {
		body += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`
	}
	rect(6, height, 2, 16, '#6b4a2b')
	rect(width - 8, height, 2, 16, '#6b4a2b')
	rect(0, 0, width, height, '#1f57ad')
	rect(1, 1, width - 2, height - 2, '#2d6fd0')
	rect(0, 0, width, 1, SNOW)
	lines.forEach((line, i) => {
		body += pixelText(line, 4, 3 + i * 9, 1, i === 0 ? '#f5c518' : '#ffffff')
	})
	return svgUrl(width, height + 16, body)
})()

/** A snow cannon on its tower, blowing snow out over the piste. */
export const snowCannon = pixelArt(22, 30, [
	[9, 10, 2, 20, '#6c747e'],
	[6, 28, 8, 2, '#6c747e'],
	// Its barrel, tipped up, and the fan's grille.
	[6, 6, 10, 6, '#f5c518'],
	[7, 7, 8, 4, '#d9ab10'],
	[15, 5, 2, 8, INK],
	// Snow, blowing out of it.
	[18, 6, 2, 2, SNOW],
	[20, 3, 2, 2, SNOW],
	[19, 10, 2, 2, SNOW],
	[21, 8, 1, 1, SNOW],
	[17, 1, 2, 2, SNOW],
])

/** An igloo, of blocks of snow, its way in dark. */
export const igloo = paintedArt(24, 14, (x, y) => {
	const inDome = ((x - 12) / 12) ** 2 + ((y - 14) / 13) ** 2 <= 1
	if (!inDome) return undefined
	if (x > 15 && x < 21 && y > 8) return '#2a3b55'
	// Its blocks: courses, staggered joins.
	const row = Math.floor(y / 3)
	if (Math.floor(y) % 3 === 0) return SNOW_SHADE
	if (Math.floor(x + row * 3) % 6 === 0) return SNOW_SHADE
	return x < 10 ? '#ffffff' : SNOW
})

/** A moose, an älg, stood in the trees: dark brown, its antlers spread. */
export const moose = paintedArt(28, 24, (x, y) => {
	const BROWN = '#4f3324'
	const DARK = '#3a2418'
	// Antlers: broad palms, either side of its head.
	if (y < 5 && x > 15 && x < 27 && (x < 19 || x > 23) && y > (x < 19 ? 1 : 0))
		return '#c9b48a'
	if (y > 3 && y < 6 && x > 17 && x < 25) return '#c9b48a'
	// Its head, long, its muzzle, down to the left of its antlers.
	if (x > 18 && x < 25 && y >= 6 && y < 10) return BROWN
	if (x > 21 && x < 27 && y >= 9 && y < 13) return x > 25 ? INK : BROWN
	// Its bell, the dewlap.
	if (x > 21 && x < 23 && y >= 13 && y < 15) return DARK
	// Its neck and hump, its body.
	if (x > 15 && x < 21 && y >= 8 && y < 13) return BROWN
	if (x > 3 && x < 20 && y >= 9 && y < 16)
		return y < 10 && x > 13 ? DARK : BROWN
	// Its long legs, pale below.
	for (const leg of [5, 8, 15, 18])
		if (x > leg && x < leg + 2 && y >= 16) return y > 21 ? '#b9ab96' : DARK
	return undefined
})

/** A Dalarna horse, a small one, red, painted: stood in the snow by a cabin. */
export const dalaHorse = paintedArt(22, 22, (x, y) => dalaPaint(x, y, 22 / 40))

/**
 * A Dalarna horse, painted, in cells `scale` the size of a 40-cell one:
 * its carved shape, red, its harness and saddle in white, blue, yellow and
 * green, its mane and its eye. See `dalaHorse` for the big one, on fire.
 */
export function dalaPaint(x: number, y: number, scale: number) {
	const u = x / scale
	const v = y / scale
	const RED = '#c8222c'
	const DARK = '#8e1820'
	const inBody = dalaShape(u, v)
	if (!inBody) return undefined
	// An outline, dark.
	if (
		!dalaShape(u - 1.2, v) ||
		!dalaShape(u + 1.2, v) ||
		!dalaShape(u, v - 1.2) ||
		!dalaShape(u, v + 1.2)
	)
		return DARK
	// Its eye, and its mane, black, and its bridle.
	if ((u - 31) ** 2 + (v - 7) ** 2 < 1.6) return '#1d1d1d'
	if (u > 26 && u < 29 && v > 2 && v < 11) return '#1d1d1d'
	if (u > 29 && u < 36 && v > 9.5 && v < 11) return '#f6f7f8'
	// Its saddle cloth: white edged, blue, green, yellow, a flower on it.
	if (u > 10 && u < 24 && v > 13 && v < 22) {
		if (v < 14.5 || v > 20.5 || u < 11.5 || u > 22.5) return '#f6f7f8'
		if ((u - 17) ** 2 + (v - 17.5) ** 2 < 5) return '#f5c518'
		if ((u - 17) ** 2 + (v - 17.5) ** 2 < 9) return '#2f9b4a'
		return '#2457b8'
	}
	// Its harness, round its chest.
	if (u > 24 && u < 26 && v > 13 && v < 24) return '#f6f7f8'
	// Its painted swirls, the kurbits, down its legs.
	if (v > 25 && Math.round(u + v) % 7 === 0 && u > 8) return '#f5c518'
	return RED
}

/**
 * Whether a point is inside a Dalarna horse's carved shape, 40 cells
 * across, facing right: a block of a body, a curved neck, its head, and
 * its legs carved as one block, front and back, a notch between.
 */
export function dalaShape(u: number, v: number) {
	// Its head, and the curve of its neck up into it.
	if (u > 25 && u < 37 && v > 2 && v < 12) {
		// Its muzzle, cut square, its chin under.
		if (u > 34 && v < 5) return false
		return true
	}
	if (u > 23 && u < 31 && v > 9 && v < 16) return true
	// Its ear.
	if (u > 27 && u < 30 && v > 0 && v <= 2) return true
	// Its body, and its tail, sloping off its rump.
	if (u > 6 && u < 31 && v >= 13 && v < 26) return true
	if (u > 3 && u <= 6 && v > 14 && v < 22) return true
	// Its legs: a block, front and back, the notch between them.
	if (u > 8 && u < 30 && v >= 26 && v < 38) {
		if (u > 15 && u < 23 && v > 28) return false
		return true
	}
	return false
}

/** A distance board, beside the ski jump's landing hill: its metres, and the K-point red. */
export function distanceBoard(metres: number, k: boolean) {
	const text = k ? `K${metres}` : `${metres}`
	const width = pixelTextWidth(text, 1) + 6
	let body = ''
	body += `<rect x="${width / 2 - 1}" y="9" width="2" height="8" fill="#6b4a2b"/>`
	body += `<rect x="0" y="0" width="${width}" height="10" fill="${k ? '#d8342c' : '#f6f7f8'}"/>`
	body += `<rect x="0" y="9" width="${width}" height="1" fill="#9aa3ad"/>`
	body += pixelText(text, 3, 1, 1, k ? '#ffffff' : INK)
	return svgUrl(width, 17, body)
}

/** The judges' tower, by the ski jump's landing hill: tall, its windows in a row near the top. */
export const judgesTower = pixelArt(28, 74, [
	[6, 14, 16, 60, '#c9ced4'],
	[6, 14, 2, 60, '#e5e9ee'],
	[18, 14, 4, 60, '#a3abb5'],
	// Its glass box, on top, the judges in it.
	[2, 4, 24, 12, '#8b939e'],
	[3, 6, 22, 7, '#9fd0f0'],
	...[5, 10, 15, 20].map((x): PixelRect => [x, 9, 3, 4, '#3a3f46']),
	[0, 1, 28, 3, '#3a3f46'],
	[0, 0, 28, 1, SNOW],
	// Its flagpole, and the flag.
	[24, 0, 1, 1, '#c9ced4'],
	// A ladder up its side.
	...Array.from(
		{ length: 14 },
		(_, i): PixelRect => [9, 20 + i * 4, 6, 1, '#7d858f'],
	),
])

/**
 * A crowd, behind a fence, in bobble hats and scarves, flags waving: seven
 * of them. On a slope, `slope` cells down for every cell along, each stands
 * upright a step lower than the last, and the fence steps down with them.
 */
export function crowd(seed: number, slope = 0) {
	const random = seeded(500 + seed)
	const hats = [
		'#d8342c',
		'#2d6fd0',
		'#f5c518',
		'#2f9b4a',
		'#ef5fa7',
		'#f2862e',
	]
	const coats = [
		'#3a3f5e',
		'#7b3fb5',
		'#1f57ad',
		'#9b2b23',
		'#2f6f5a',
		'#5d646d',
	]
	const skins = ['#f2c7a5', '#d9a07a', '#a8714a', '#f5d6bd']
	const count = 7
	const width = count * 8 + 4
	/** How far down the slope is at `x`, from its highest, in whole cells. */
	const lowest = Math.min(0, slope * width)
	const down = (x: number) => Math.round(slope * x - lowest)
	const rects: PixelRect[] = []
	for (let i = 0; i < count; i++) {
		const x = 2 + i * 8 + Math.round(random() * 2)
		const tall = Math.round(random() * 3)
		const top = 6 - tall + down(x + 3)
		const hat = hats[Math.floor(random() * hats.length)]
		rects.push([
			x,
			top + 6,
			6,
			12 + tall,
			coats[Math.floor(random() * coats.length)],
		])
		rects.push([
			x + 1,
			top + 2,
			4,
			4,
			skins[Math.floor(random() * skins.length)],
		])
		rects.push([x + 1, top, 4, 2, hat])
		rects.push([x + 2, top - 1, 2, 1, '#ffffff'])
		rects.push([x, top + 6, 6, 1, hat])
		// Now and then a flag, waved over their head.
		if (random() < 0.4) {
			const swede = random() < 0.6
			rects.push([x + 5, top - 8, 1, 10, '#6b4a2b'])
			rects.push([x + 6, top - 8, 6, 4, swede ? '#006aa7' : '#d8342c'])
			rects.push([x + 6, top - 6, 6, 1, swede ? '#fecc00' : '#ffffff'])
			rects.push([x + 8, top - 8, 1, 4, swede ? '#fecc00' : '#ffffff'])
		}
	}
	// The fence in front of them, a post every so often, its rails stepping
	// down from one to the next.
	for (let x = 0; x < width; x += 2) {
		rects.push([x, 18 + down(x + 1), 2, 2, '#d8342c'])
		rects.push([x, 22 + down(x + 1), 2, 2, '#d8342c'])
	}
	for (let x = 0; x < width; x += 10)
		rects.push([x, 16 + down(x + 1), 2, 10, '#f6f7f8'])
	return pixelArt(width, 26 + Math.ceil(Math.abs(slope * width)), rects)
}

/**
 * A marschall: a candle in a can, a lantern of the Swedish winter, along
 * the piste in the dark, its flame flickering.
 */
export const marschall = (() => {
	let body = ''
	body += '<rect x="1" y="7" width="6" height="7" fill="#3a3f46"/>'
	body += '<rect x="1" y="7" width="6" height="1" fill="#6c747e"/>'
	body += '<rect x="3" y="6" width="2" height="1" fill="#1d1d1d"/>'
	// Its glow, and its flame, flickering between two shapes.
	body +=
		'<rect x="0" y="0" width="8" height="8" fill="rgba(255,200,90,0.18)"/>'
	body += `<g><rect x="3" y="2" width="2" height="4" fill="#ffb02e"/><rect x="3" y="3" width="2" height="2" fill="#fff1a8"/><animate attributeName="opacity" values="1;0;1" keyTimes="0;0.5;1" calcMode="discrete" dur="0.5s" repeatCount="indefinite"/></g>`
	body += `<g><rect x="3" y="1" width="2" height="5" fill="#ff9420"/><rect x="2" y="3" width="1" height="2" fill="#ffb02e"/><rect x="3" y="3" width="2" height="2" fill="#fff1a8"/><animate attributeName="opacity" values="0;1;0" keyTimes="0;0.5;1" calcMode="discrete" dur="0.5s" repeatCount="indefinite"/></g>`
	return svgUrl(8, 14, body)
})()

/** The afterski: a log bar, its sign, lights strung along its roof, coloured, blinking. */
export const afterski = (() => {
	let body = ''
	const rect = (x: number, y: number, w: number, h: number, fill: string) => {
		body += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`
	}
	rect(4, 18, 66, 24, '#6b4022')
	for (let y = 20; y < 42; y += 3) rect(4, y, 66, 1, '#4f2c14')
	// Its bar, open, warm light inside, and someone dancing.
	rect(12, 24, 50, 12, '#ffcf7a')
	rect(12, 34, 50, 8, '#8a5a2b')
	rect(12, 33, 50, 1, '#c08a4e')
	rect(22, 26, 3, 3, '#f2c7a5')
	rect(21, 29, 5, 4, '#d8342c')
	rect(40, 25, 3, 3, '#d9a07a')
	rect(39, 28, 5, 5, '#2d6fd0')
	rect(44, 26, 1, 2, '#d9a07a')
	// Its roof, snow on it.
	rect(0, 12, 74, 6, '#3a2b25')
	rect(0, 10, 74, 3, SNOW)
	// Its sign.
	rect(14, 0, 46, 10, '#1d1d1d')
	body += pixelText(
		'AFTERSKI',
		13 + (48 - pixelTextWidth('AFTERSKI', 1)) / 2,
		2,
		1,
		'#ff5fa2',
	)
	// Lights along the eaves, blinking in turn.
	const colours = ['#ff5f5f', '#ffd36b', '#5fd3ff', '#7dff8a']
	for (let i = 0; i < 18; i++) {
		const colour = colours[i % colours.length]
		body += `<rect x="${2 + i * 4}" y="${18 + (i % 2)}" width="2" height="2" fill="${colour}"><animate attributeName="opacity" values="1;0.25;1" dur="${0.8 + (i % 3) * 0.3}s" repeatCount="indefinite"/></rect>`
	}
	return svgUrl(74, 42, body)
})()
