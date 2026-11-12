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
 * Machu Picchu, drawn in code: what's on the horizon, three times over,
 * each fading in as the course gets to it (see `CourseLook['voyage']`);
 * the Incas' stonework, along the trail and in the citadel; and the
 * mountain under the path.
 *
 * Up the Inca Trail: the Andes, ridge after ridge of cloud forest, mist
 * lying in the valleys between, and Salkantay's snow far off. Through the
 * Sun Gate: Huayna Picchu, the peak over the citadel in every picture of
 * it, and the mountains round it, standing up out of a sea of cloud, the
 * valley lost under it. And down in the valley: the Urubamba, roaring
 * along at the foot of mountains that go straight up into the clouds.
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
	for (let x = 0; x < W; x += 2) {
		const y = Math.max(0, Math.round(top(x + 1) / 2) * 2)
		if (y < bottom)
			out += `<rect x="${x}" y="${y}" width="2" height="${bottom - y}" fill="${fill}"/>`
	}
	return out
}

/**
 * A steep green peak, as the Andes are round Machu Picchu: sugarloaves,
 * sheer, forest up to their tops. Its top at `x`, `top`, its sides falling
 * away steeply then flaring out at its foot, lit from the left.
 */
interface Peak {
	x: number
	top: number
	/** How wide it is at its foot, either side. */
	half: number
	/** How round its top is, out of 1: a sugarloaf's rounded, a ridge's sharp. */
	round?: number
}

function peaks(
	list: Peak[],
	foot: number,
	colours: { lit: string; shade: string; rock?: string },
	seed: number,
) {
	const random = seeded(seed)
	let out = ''
	for (const peak of list) {
		for (const shift of [-W, 0, W]) {
			const cx = peak.x + shift
			if (cx + peak.half < 0 || cx - peak.half > W) continue
			const round = peak.round ?? 0.4
			// Its outline: a dome at the top, steep flanks, flaring at the foot.
			const side = (dir: -1 | 1): [number, number][] => {
				const points: [number, number][] = []
				for (let i = 0; i <= 14; i++) {
					const t = i / 14
					const dome = t ** 0.45 * round + t ** 0.8 * (1 - round)
					const flare = 0.7 + 0.3 * t ** 3
					const dx = peak.half * dome * flare
					const dy = (foot - peak.top) * t
					points.push([
						cx + dir * dx * (1 + (random() - 0.5) * 0.05),
						peak.top + dy,
					])
				}
				return points
			}
			const left = side(-1)
			const right = side(1)
			out += pixelPolygon(
				[...left, [cx + peak.half * 0.15, foot], [cx, peak.top]],
				colours.lit,
			)
			out += pixelPolygon(
				[[cx, peak.top], [cx + peak.half * 0.15, foot], ...right.reverse()],
				colours.shade,
			)
			// Bare rock showing through on its steepest, in streaks.
			if (colours.rock)
				for (let i = 0; i < 3; i++) {
					const y = peak.top + 6 + random() * (foot - peak.top) * 0.4
					const dx = (random() - 0.3) * peak.half * 0.25
					out += pixelPolygon(
						[
							[cx + dx, y],
							[cx + dx + 4, y],
							[cx + dx + 2, y + 10 + random() * 14],
						],
						colours.rock,
					)
				}
		}
	}
	return out
}

/** Treetops along a ridge, `top` its line: bumps of canopy, darker. */
function canopy(
	top: (x: number) => number,
	count: number,
	fill: string,
	seed: number,
	size = 5,
) {
	const random = seeded(seed)
	let out = ''
	for (let i = 0; i < count; i++) {
		const x = Math.round((random() * W) / 2) * 2
		const r = size + Math.round(random() * size * 0.6)
		const y = Math.round(top(x) / 2) * 2 + r - 2
		for (const shift of [-W, 0, W]) {
			if (x + shift < -r || x + shift > W + r) continue
			out += pixelCircle(x + shift, y, r, fill)
		}
	}
	return out
}

/**
 * Mist lying along a band, `y` down it: long low wisps, see-through, so
 * what's behind still shows through them.
 */
function mist(y: number, count: number, alpha: number, seed: number) {
	const random = seeded(seed)
	let out = ''
	for (let i = 0; i < count; i++) {
		const cx = random() * W
		const length = 60 + random() * 160
		const cy = Math.round((y + (random() - 0.5) * 16) / 2) * 2
		for (let x = -length / 2; x < length / 2; x += 2) {
			const t = 1 - Math.abs(x) / (length / 2)
			const h = Math.round((2 + t * 6) / 2) * 2
			for (const shift of [-W, 0, W]) {
				const at = Math.round((cx + x) / 2) * 2 + shift
				if (at < 0 || at >= W) continue
				out += `<rect x="${at}" y="${cy - h / 2}" width="2" height="${h}" fill="rgba(240,244,246,${(alpha * (0.4 + t * 0.6)).toFixed(3)})"/>`
			}
		}
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
	bottom = H,
) {
	const random = seeded(seed)
	let lit = ''
	let cloud = ''
	for (let x = 0; x < W; x += 22 + Math.round(random() * 22)) {
		const r = 10 + Math.round(random() * 14)
		const y = base + Math.round(random() * 10) - r / 3
		for (const shift of [-W, 0, W]) {
			if (x + shift + r + 4 < 0 || x + shift - r > W) continue
			lit += pixelCircle(x + shift, y, r, colours.lit)
			cloud += pixelCircle(x + shift + 4, y + 5, r - 2, colours.cloud)
		}
	}
	return [
		lit,
		cloud,
		`<rect x="0" y="${base + 6}" width="${W}" height="${bottom - base - 6}" fill="${colours.cloud}"/>`,
		`<rect x="0" y="${base + 26}" width="${W}" height="${bottom - base - 26}" fill="${colours.shade}"/>`,
	].join('')
}

// --- Up the Inca Trail -----------------------------------------------------------

const TRAIL_FAR_FILL = '#7f9db0'
const TRAIL_MID = '#5c8a6a'
const TRAIL_MID_SHADE = '#4a7458'
const TRAIL_NEAR = '#4f8445'
const TRAIL_NEAR_DARK = '#3b6936'

const trailRidge = wave(131, 104, 16, [3, 5, 9])
const trailNear = wave(132, 72, 22, [2, 4, 7])

/**
 * The Inca Trail: Salkantay's snow far off, then ridge after ridge of
 * cloud forest, steep, mist lying in the valleys between.
 */
const TRAIL: NonNullable<CourseLook['horizon']> = {
	far: svgUrl(
		W,
		H,
		// Salkantay, far off, white over the ridges, and its neighbours.
		pixelPolygon(
			[
				[230, 18],
				[150, 110],
				[330, 110],
			],
			'#c3d3e0',
		) +
			pixelPolygon(
				[
					[230, 18],
					[248, 50],
					[236, 62],
					[262, 110],
					[330, 110],
				],
				'#a6bbcc',
			) +
			pixelPolygon(
				[
					[230, 18],
					[212, 50],
					[226, 46],
					[238, 58],
					[248, 50],
				],
				'#f7fafc',
			) +
			pixelPolygon(
				[
					[700, 46],
					[640, 110],
					[770, 110],
				],
				'#b4c6d6',
			) +
			pixelPolygon(
				[
					[700, 46],
					[690, 62],
					[704, 60],
					[714, 64],
				],
				'#f3f7fa',
			) +
			peaks(
				[
					{ x: 60, top: 64, half: 80 },
					{ x: 420, top: 58, half: 90, round: 0.6 },
					{ x: 560, top: 74, half: 70 },
					{ x: 860, top: 60, half: 96, round: 0.5 },
				],
				H,
				{ lit: '#93adbd', shade: '#7f9aac' },
				133,
			) +
			under(trailRidge, TRAIL_FAR_FILL) +
			mist(108, 8, 0.5, 134),
	),
	near: svgUrl(
		W,
		H,
		peaks(
			[
				{ x: 120, top: 26, half: 110, round: 0.55 },
				{ x: 380, top: 44, half: 90 },
				{ x: 610, top: 18, half: 120, round: 0.7 },
				{ x: 860, top: 40, half: 100, round: 0.5 },
			],
			H,
			{ lit: TRAIL_MID, shade: TRAIL_MID_SHADE, rock: '#7c8a78' },
			135,
		) +
			mist(96, 10, 0.55, 138) +
			under(trailNear, TRAIL_NEAR) +
			canopy(trailNear, 90, TRAIL_NEAR_DARK, 139) +
			mist(132, 8, 0.4, 140),
	),
	fill: TRAIL_FAR_FILL,
	nearer: [
		{
			asset: svgUrl(
				W,
				120,
				under(wave(141, 46, 18, [2, 3, 8]), '#5d9a4c', 120) +
					canopy(wave(141, 46, 18, [2, 3, 8]), 70, '#457f3b', 142, 6) +
					canopy(wave(141, 46, 18, [2, 3, 8]), 30, '#6fae58', 143, 3),
			),
			height: 120,
			fill: '#5d9a4c',
		},
	],
	sky: ['#7fb6dc', '#e4f0ee'],
}

// --- Through the Sun Gate: the citadel, over the clouds ---------------------------

const CLOUD = '#eef2f4'
const CLOUD_LIT = '#ffffff'
const CLOUD_SHADE = '#d2dce3'

/**
 * Huayna Picchu, the sugarloaf over the citadel, its own terraces up its
 * side to the very top; the mountains round it; all of it standing up out
 * of a sea of cloud. Drawn in a band of its own, wider than the screen,
 * so it isn't round every corner.
 */
const HUAYNA_W = 1920
function huaynaPicchu() {
	const random = seeded(151)
	let out = ''
	/** A mountain through `outline`, lit on its left of `ridge`, shaded right of it. */
	const mountain = (
		outline: [number, number][],
		ridge: number,
		lit: string,
		shade: string,
	) => {
		out += pixelPolygon(outline, shade)
		out += pixelPolygon(
			outline.map(([x, y]) => [
				Math.min(x, ridge + (y - outline[0][1]) * 0.15),
				y,
			]),
			lit,
		)
	}
	const FOREST = '#4c7a57'
	const FOREST_SHADE = '#3a6147'
	// Far off, paler: the peaks round about.
	mountain(
		[
			[300, 46],
			[240, 62],
			[150, 110],
			[100, H],
			[500, H],
			[420, 100],
			[360, 60],
		],
		300,
		'#7c9c8a',
		'#6a8a79',
	)
	mountain(
		[
			[1500, 34],
			[1440, 50],
			[1340, 110],
			[1290, H],
			[1720, H],
			[1620, 96],
			[1560, 48],
		],
		1500,
		'#7c9c8a',
		'#6a8a79',
	)
	mountain(
		[
			[1150, 70],
			[1080, 104],
			[1020, H],
			[1260, H],
			[1220, 96],
		],
		1150,
		'#86a594',
		'#73927f',
	)
	// Huayna Picchu: a sheer sugarloaf, its top a rounded knob, a shoulder
	// below it to the right, Huchuy Picchu, and the ridge down to the citadel.
	mountain(
		[
			[772, 4],
			[756, 6],
			[744, 14],
			[736, 30],
			[730, 52],
			[716, 80],
			[690, 110],
			[640, H],
			[1000, H],
			[930, 112],
			[880, 86],
			[858, 66],
			[836, 58],
			[810, 54],
			[798, 34],
			[792, 16],
			[784, 6],
		],
		770,
		FOREST,
		FOREST_SHADE,
	)
	// Granite showing through its steepest faces, in streaks.
	for (let i = 0; i < 9; i++) {
		const y = 14 + random() * 60
		const x = 738 + random() * 52 + (y - 14) * -0.15
		out += pixelPolygon(
			[
				[x, y],
				[x + 4, y],
				[x + 2, y + 10 + random() * 16],
			],
			'#8b927f',
		)
	}
	// The saddle below it, and the citadel on it: terraces down its sides,
	// its houses, grey, in rows, the plaza green between them.
	out += pixelPolygon(
		[
			[470, 104],
			[560, 96],
			[700, 98],
			[760, 104],
			[800, 124],
			[430, 124],
		],
		'#5c8a55',
	)
	for (let i = 0; i < 5; i++)
		out += `<rect x="${478 + i * 6}" y="${104 + i * 4}" width="${60 - i * 4}" height="2" fill="#8f8a78"/>`
	for (let i = 0; i < 4; i++)
		out += `<rect x="${690 + i * 5}" y="${104 + i * 4}" width="${50 - i * 6}" height="2" fill="#8f8a78"/>`
	for (const [x, y, w] of [
		[560, 92, 10],
		[574, 90, 8],
		[586, 92, 12],
		[606, 90, 8],
		[640, 92, 14],
		[660, 90, 8],
		[674, 92, 10],
	] as const) {
		out += `<rect x="${x}" y="${y}" width="${w}" height="6" fill="#a39d8b"/>`
		out += `<rect x="${x}" y="${y}" width="${w}" height="2" fill="#c3bdab"/>`
	}
	out += `<rect x="612" y="96" width="26" height="4" fill="#79ad5a"/>`
	// Its terraces, clinging up its side, and the temple on its top.
	for (let i = 0; i < 6; i++) {
		const y = 18 + i * 8
		out += `<rect x="${750 - i * 2}" y="${y}" width="${14 + i * 3}" height="2" fill="#9a9583"/>`
	}
	out += `<rect x="760" y="2" width="12" height="4" fill="#a39d8b"/>`
	return out
}

/** The citadel's horizon: Huayna Picchu and the peaks round it, over a sea of cloud. */
const CITADEL: NonNullable<CourseLook['horizon']> = {
	far: (() => {
		const body =
			pixelPolygon(
				[
					[1400, 30],
					[1300, 100],
					[1520, 100],
				],
				'#c9d5de',
			) +
			pixelPolygon(
				[
					[1400, 30],
					[1384, 52],
					[1404, 48],
					[1418, 56],
				],
				'#f6f9fb',
			) +
			huaynaPicchu() +
			// The sea of cloud, up round their feet.
			cloudSea(118, 152, { lit: CLOUD_LIT, cloud: CLOUD, shade: CLOUD_SHADE })
		// Its own width: twice the screen's, so Huayna Picchu comes round less.
		return `data:image/svg+xml,${encodeURIComponent(
			`<svg xmlns="http://www.w3.org/2000/svg" width="${HUAYNA_W}" height="${H}" viewBox="0 0 ${HUAYNA_W} ${H}" shape-rendering="crispEdges">${body.replace(/<svg[^>]*>|<\/svg>/g, '')}${huaynaTail()}</svg>`,
		).replace(
			/[()'!*]/g,
			(c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
		)}`
	})(),
	near: svgUrl(
		W,
		H,
		cloudSea(70, 153, { lit: CLOUD_LIT, cloud: CLOUD, shade: CLOUD_SHADE }) +
			cloudSea(90, 155, {
				lit: CLOUD_LIT,
				cloud: '#e9eef2',
				shade: CLOUD_SHADE,
			}),
	),
	fill: CLOUD,
	nearer: [
		{
			asset: svgUrl(
				W,
				100,
				cloudSea(26, 156, {
					lit: CLOUD_LIT,
					cloud: '#e6ecf0',
					shade: '#d0dae2',
				}),
			),
			height: 100,
			fill: '#d0dae2',
		},
		{
			asset: svgUrl(
				W,
				120,
				cloudSea(
					46,
					159,
					{
						lit: CLOUD_LIT,
						cloud: '#e3e9ee',
						shade: '#cbd6df',
					},
					120,
				),
			),
			height: 120,
			fill: '#cbd6df',
		},
	],
	sky: ['#8fb4d4', '#eaf0f2'],
}

/**
 * The far band's second screen: the cloud's top, its peaks, that the
 * first screen's own pictures only cover the first half of.
 */
function huaynaTail() {
	return `<g transform="translate(${W} 0)">${cloudSea(118, 157, {
		lit: CLOUD_LIT,
		cloud: CLOUD,
		shade: CLOUD_SHADE,
	})}</g>`
}

// --- Down in the valley -----------------------------------------------------------

const valleyWall = wave(161, 40, 30, [2, 3, 5])

/**
 * Down in the valley: mountains straight up either side into the clouds,
 * forest all over them, and the Urubamba, white water, along their feet.
 */
const VALLEY: NonNullable<CourseLook['horizon']> = {
	far: svgUrl(
		W,
		H,
		peaks(
			[
				{ x: 80, top: 0, half: 130, round: 0.8 },
				{ x: 330, top: 10, half: 120, round: 0.7 },
				{ x: 600, top: 0, half: 150, round: 0.85 },
				{ x: 860, top: 6, half: 120, round: 0.75 },
			],
			H,
			{ lit: '#5d8564', shade: '#4b6f52', rock: '#7d8678' },
			162,
		) +
			// The cloud's underside, cut across their tops.
			cloudSea(
				-6,
				163,
				{ lit: CLOUD, cloud: CLOUD_SHADE, shade: '#c3cfd8' },
				20,
			) +
			mist(60, 8, 0.5, 164),
	),
	near: svgUrl(
		W,
		H,
		`${
			under(valleyWall, '#3f7a3c') +
			canopy(valleyWall, 110, '#336a32', 165, 6) +
			canopy(valleyWall, 50, '#4e8f45', 166, 3)
		}<rect x="0" y="128" width="${W}" height="32" fill="#7a8f86"/><rect x="0" y="132" width="${W}" height="28" fill="#5f7f7a"/>${(() => {
			const random = seeded(167)
			let out = ''
			for (let i = 0; i < 70; i++) {
				const x = Math.round((random() * W) / 2) * 2
				const y = 134 + Math.round(random() * 11) * 2
				out += `<rect x="${x}" y="${y}" width="${6 + Math.round(random() * 8) * 2}" height="2" fill="#e8f1ee"/>`
			}
			for (let i = 0; i < 16; i++) {
				const x = Math.round((random() * W) / 2) * 2
				out += pixelCircle(x, 140 + random() * 12, 3 + random() * 3, '#8b8577')
			}
			return out
		})()}`,
	),
	fill: '#4b6f52',
	nearer: [
		{
			asset: svgUrl(
				W,
				120,
				under(wave(168, 40, 14, [3, 5, 11]), '#4a8a3e', 120) +
					canopy(wave(168, 40, 14, [3, 5, 11]), 80, '#3a7433', 169, 7),
			),
			height: 120,
			fill: '#4a8a3e',
		},
	],
	sky: ['#9cbfd8', '#e6eef0'],
}

export const MACHU_PICCHU_HORIZONS = { TRAIL, CITADEL, VALLEY }

// --- The mountain, under the path ------------------------------------------------

/** How far along one part of the course blends into the next. */
const BLEND = 600

/**
 * The course's colours, along it, for its ground's layers: the trail's
 * stone path through the forest; the citadel's lawns and granite; and the
 * valley floor's dirt road by the river.
 */
export function machuPicchuStrips(at: { citadel: number; valley: number }) {
	const strip = (
		id: string,
		trail: string,
		citadel: string,
		valley: string,
	) => ({
		id,
		blend: true,
		stops: [
			[0, trail],
			[at.citadel - BLEND / 2, trail],
			[at.citadel + BLEND / 2, citadel],
			[at.valley - 2, citadel],
			[at.valley, valley],
		] as [number, string][],
	})
	return [
		strip('machu-verge', '#5f9a48', '#77ad55', '#5a9443'),
		strip('machu-path-edge', '#6b6657', '#77735f', '#6e5a3f'),
		strip('machu-path', '#a59f8c', '#b4ae98', '#a3875c'),
		strip('machu-edge', '#355f2a', '#4a7a35', '#355f2a'),
		strip('machu-face', '#3f7a38', '#5a9443', '#3f7633'),
	]
}

/**
 * The trail's paving, and the citadel's: Inca stones, each its own shape,
 * fitted together, their joints dark and the light on their tops, as a
 * pattern laid over the path's colour. Mostly see-through.
 */
export const MACHU_PAVING = (() => {
	const random = seeded(171)
	const width = 160
	const height = 36
	let body = ''
	for (let y = 0; y < height; y += 6) {
		let x = Math.round(random() * 8) * 2 - 16
		while (x < width) {
			const w = 8 + Math.round(random() * 7) * 2
			for (const dx of [0, width])
				body +=
					`<rect x="${x + dx - width}" y="${y}" width="2" height="6" fill="rgba(40,36,26,0.28)"/>` +
					`<rect x="${x + dx - width + 2}" y="${y}" width="${w - 2}" height="2" fill="rgba(255,255,240,0.16)"/>`
			x += w
		}
		body += `<rect x="0" y="${y + 4}" width="${width}" height="2" fill="rgba(40,36,26,0.14)"/>`
	}
	return `<pattern id="machu-paving" patternUnits="userSpaceOnUse" width="${width}" height="${height}">${body}</pattern>`
})()

/**
 * The mountain's face under the path: granite showing through the forest
 * in outcrops, ferns and bromeliads clinging on, and now and then an old
 * terrace wall, its stones in a row. As a pattern laid over its colour.
 */
export const MACHU_FACE = (() => {
	const random = seeded(173)
	const width = 640
	const height = 480
	let body = ''
	/** A rect, and again round the other side wherever it goes off the tile's edge, so it tiles. */
	const rect = (x: number, y: number, w: number, h: number, fill: string) => {
		for (const dx of x + w > width ? [0, -width] : [0])
			for (const dy of y + h > height ? [0, -height] : [0])
				body += `<rect x="${x + dx}" y="${y + dy}" width="${w}" height="${h}" fill="${fill}"/>`
	}
	const snap = (n: number) => Math.round(n / 4) * 4
	/** A clump of treetops: a dome of cells, lit on top, in shadow below. */
	const clump = (cx: number, cy: number, r: number) => {
		for (let y = -r; y <= r; y += 4) {
			const half = snap(Math.sqrt(Math.max(0, r * r - y * y)))
			if (half <= 0) continue
			rect(
				cx - half,
				cy + y,
				half * 2,
				4,
				y < -r / 3
					? 'rgba(150,210,110,0.1)'
					: y > r / 3
						? 'rgba(10,40,20,0.12)'
						: 'rgba(30,70,30,0.05)',
			)
		}
	}
	for (let i = 0; i < 260; i++)
		clump(
			snap(random() * width),
			snap(random() * height),
			snap(6 + random() * 8),
		)
	// Granite outcrops: stepped, lit along each ledge.
	for (let i = 0; i < 10; i++) {
		const x = snap(random() * width)
		const y = snap(random() * height)
		const w = snap(20 + random() * 48)
		const tiers = 2 + Math.floor(random() * 3)
		let left = 0
		let right = 0
		for (let t = tiers - 1; t >= 0; t--) {
			const tw = Math.max(8, w - left - right)
			const ty = y + t * 6
			rect(x + left, ty, tw, 6, 'rgba(120,118,104,0.55)')
			rect(x + left + 2, ty, Math.max(4, tw - 8), 2, 'rgba(255,255,240,0.25)')
			left += snap(random() * w * 0.3)
			right += snap(random() * w * 0.15)
		}
	}
	// Flowers: orchids, bromeliads, red and pink and yellow.
	for (let i = 0; i < 26; i++) {
		const colours = [
			'rgba(230,80,100,0.75)',
			'rgba(240,200,80,0.75)',
			'rgba(220,120,220,0.7)',
		]
		rect(snap(random() * width), snap(random() * height), 4, 4, colours[i % 3])
	}
	return `<pattern id="machu-face-pattern" patternUnits="userSpaceOnUse" width="${width}" height="${height}">${body}</pattern>`
})()
// --- The Incas' stonework ----------------------------------------------------------

/** Granite, as the Incas cut it: its stones, the light on them, their joints, and its shade. */
export interface Stone {
	stone: string
	stone2: string
	lit: string
	joint: string
	shade: string
	moss?: string
}

/** The citadel's granite, pale and clean. */
export const GRANITE: Stone = {
	stone: '#aaa392',
	stone2: '#9c9584',
	lit: '#cbc4b2',
	joint: '#615b4d',
	shade: '#837c6c',
}

/** The trail's ruins: the same granite, older, greener, moss over it. */
export const OLD_GRANITE: Stone = {
	stone: '#9a9583',
	stone2: '#8b8674',
	lit: '#bab4a0',
	joint: '#57533f',
	shade: '#76715f',
	moss: '#6f8f4a',
}

/**
 * Inca masonry, from `x`, `y`, `w` by `h` cells: courses of stones, each its
 * own width, fitted without mortar, the light along their tops and their
 * joints dark; finer and more even (`fine`) in a temple's walls. Moss on
 * the old ones, along the top.
 */
export function masonry(
	x: number,
	y: number,
	w: number,
	h: number,
	stone: Stone,
	seed: number,
	fine = false,
): PixelRect[] {
	const random = seeded(seed)
	const rects: PixelRect[] = [[x, y, w, h, stone.stone]]
	for (let row = 0; row < h; ) {
		const rh = Math.min(h - row, fine ? 3 : 3 + Math.floor(random() * 3))
		let at = -Math.floor(random() * 6)
		while (at < w) {
			const sw = (fine ? 6 : 4) + Math.floor(random() * (fine ? 5 : 7))
			const left = Math.max(0, at)
			const right = Math.min(w, at + sw)
			if (right > left) {
				if (random() < 0.45)
					rects.push([x + left, y + row, right - left, rh, stone.stone2])
				rects.push([x + left, y + row, right - left, 1, stone.lit])
				if (right < w) rects.push([x + right - 1, y + row, 1, rh, stone.joint])
			}
			at += sw
		}
		if (row + rh < h) rects.push([x, y + row + rh - 1, w, 1, stone.joint])
		row += rh
	}
	if (stone.moss)
		for (let i = 0; i < w; i += 1 + Math.floor(random() * 3))
			if (random() < 0.55)
				rects.push([
					x + i,
					y,
					1 + Math.floor(random() * 2),
					1 + Math.floor(random() * 2),
					stone.moss,
				])
	return rects
}

/**
 * A trapezoid, the Incas' shape for a door, a window or a niche: `top`
 * cells across at its top, `bottom` at its foot, `h` tall, its middle at
 * `cx`, its top at `y`.
 */
export function trapezoid(
	cx: number,
	y: number,
	top: number,
	bottom: number,
	h: number,
	fill: string,
): PixelRect[] {
	const rects: PixelRect[] = []
	for (let row = 0; row < h; row++) {
		const width = Math.round(top + ((bottom - top) * row) / Math.max(1, h - 1))
		rects.push([cx - Math.floor(width / 2), y + row, width, 1, fill])
	}
	return rects
}

/** Inside a niche or doorway: shadow. */
const DARK = '#3a352c'
const DARKER = '#26221c'

/** Thatch, as on the Incas' houses as they've been put back: ichu grass, golden, in rows. */
function thatch(
	x: number,
	y: number,
	w: number,
	h: number,
	seed: number,
): PixelRect[] {
	const random = seeded(seed)
	const rects: PixelRect[] = []
	for (let row = 0; row < h; row++) {
		// A pitched roof: narrower at the top.
		const inset = Math.round(((h - row) / h) * w * 0.32)
		rects.push([
			x + inset,
			y + row,
			w - inset * 2,
			1,
			row % 3 === 2 ? '#a07a2c' : '#c8a14a',
		])
	}
	for (let i = 0; i < w; i += 2)
		rects.push([x + i, y + h, 1, 1 + Math.floor(random() * 2), '#8c6a26'])
	rects.push([
		x + Math.round(w * 0.32),
		y,
		w - Math.round(w * 0.64),
		1,
		'#e0c06a',
	])
	return rects
}

/** Rects, as an SVG's markup. */
const markup = (rects: PixelRect[]) =>
	rects
		.map(
			([x, y, w, h, fill]) =>
				`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`,
		)
		.join('')

// --- Along the trail -----------------------------------------------------------

/** A tree fern, the cloud forest's: a thin trunk, fronds arching out of its top. 30 by 34. */
export const treeFern = (() => {
	const rects: PixelRect[] = [
		[14, 12, 3, 22, '#5a4632'],
		[15, 12, 1, 22, '#715a40'],
		[13, 30, 5, 4, '#4a3a28'],
	]
	const fronds: [number, number, number][] = [
		[-1, -0.35, 14],
		[1, -0.35, 14],
		[-1, 0.15, 13],
		[1, 0.15, 13],
		[-0.4, -1, 9],
		[0.5, -1, 9],
	]
	for (const [dx, dy, length] of fronds) {
		for (let t = 0; t < length; t++) {
			// Arching over: up, then drooping at the tip.
			const x = Math.round(15 + dx * t)
			const y = Math.round(12 + dy * t + (t * t) / (length * 1.4))
			rects.push([x, y, 1, 1, '#2f6a2f'])
			if (t % 2 === 0) {
				rects.push([x, y - 1, 1, 1, '#4d9440'])
				rects.push([x, y + 1, 1, 1, '#3a7a35'])
			}
		}
	}
	rects.push([14, 10, 3, 3, '#6aa850'])
	return pixelArt(30, 34, rects)
})()

/**
 * A cloud forest tree: a crooked trunk, moss all over it, bromeliads up in
 * its branches, a red one flowering, and its canopy dense. 40 by 48.
 */
export const mossTree = (() => {
	const trunk: PixelRect[] = [
		[18, 22, 4, 26, '#5d4a35'],
		[19, 22, 1, 26, '#77603f'],
		[14, 30, 5, 2, '#5d4a35'],
		[21, 26, 7, 2, '#5d4a35'],
		[16, 44, 8, 4, '#4b3b2a'],
		// Moss down its trunk.
		[18, 28, 2, 8, '#7fa64a'],
		[20, 36, 2, 6, '#7fa64a'],
	]
	const canopy =
		pixelCircle(20, 14, 13, '#2f6b33', 1) +
		pixelCircle(9, 20, 8, '#336f35', 1) +
		pixelCircle(31, 19, 9, '#2c6430', 1) +
		pixelCircle(16, 9, 7, '#4a8a42', 1) +
		pixelCircle(27, 11, 6, '#3f7d3c', 1) +
		pixelCircle(12, 15, 4, '#5a9a4a', 1)
	const bromeliads = markup([
		[13, 27, 3, 2, '#8dbb4c'],
		[25, 23, 3, 2, '#8dbb4c'],
		[26, 21, 1, 2, '#e04a5a'],
		[9, 22, 2, 2, '#e8c34a'],
	])
	return svgUrl(40, 48, markup(trunk) + canopy + bromeliads)
})()

/** A bush of orchids and bromeliads, by the path. 18 by 12. */
export const orchids = pixelArt(18, 12, [
	[2, 6, 14, 6, '#3f7a35'],
	[4, 3, 4, 4, '#4f8f40'],
	[10, 2, 5, 5, '#4a8a3c'],
	[0, 8, 4, 4, '#356c2e'],
	[14, 7, 4, 5, '#356c2e'],
	[5, 2, 2, 2, '#d9488e'],
	[11, 1, 2, 2, '#f2f2f2'],
	[12, 0, 1, 1, '#d9488e'],
	[15, 5, 2, 2, '#f08a2a'],
	[2, 5, 2, 2, '#e8c34a'],
	[8, 6, 2, 1, '#6faa50'],
])

/**
 * A ruined wall on the trail: old granite, its top worn level enough to
 * run along, crumbled away at either end, niches in it, moss over it. `w`
 * by `h` cells.
 */
export function ruinWall(w: number, h: number, seed: number) {
	const random = seeded(seed)
	const rects = masonry(0, 0, w, h, OLD_GRANITE, seed)
	for (let n = 0; n < Math.floor((w - 8) / 18); n++)
		rects.push(
			...trapezoid(
				10 + n * 18 + Math.floor(random() * 4),
				5,
				4,
				6,
				Math.min(8, h - 7),
				DARK,
			),
		)
	// Crumbled away at its ends, in steps: the sky through them.
	const cuts: PixelRect[] = []
	for (let y = 0; y < Math.min(h - 4, 8); y += 2) {
		const x = Math.max(0, 6 - y + Math.floor(random() * 2))
		if (x) cuts.push([0, y, x, 2, '#000'], [w - x, y, x, 2, '#000'])
	}
	return svgUrl(
		w,
		h,
		`<mask id="c"><rect width="${w}" height="${h}" fill="#fff"/>${markup(cuts)}</mask><g mask="url(#c)">${markup(rects)}</g>`,
	)
}

/**
 * How a ruined wall, as a Platform, is drawn: its top the Platform's, on
 * down to the back of the path, `height` px over the path's line.
 */
export function ruinWallArt(width: number, height: number, seed: number) {
	const h = Math.round((height - 14) / 2)
	return { asset: ruinWall(width / 2, h, seed), width, height: h * 2, top: 0 }
}

/**
 * Runkurakay: a round ruin on a ridge of the trail, its curved wall, a
 * doorway through it, niches inside showing over its broken top. 56 by 34.
 */
export const roundRuin = (() => {
	const inside = masonry(
		6,
		6,
		44,
		10,
		{ ...OLD_GRANITE, stone: '#7f7a68', stone2: '#757060' },
		181,
	)
	for (let i = 0; i < 4; i++)
		inside.push(...trapezoid(12 + i * 11, 8, 3, 5, 6, DARKER))
	const near = masonry(0, 12, 56, 22, OLD_GRANITE, 182)
	// Rounded at either end, as a curved wall seen side on: the sky through.
	const round: PixelRect[] = []
	for (let y = 12; y < 20; y++) {
		const cut = Math.round(((20 - y) / 8) ** 2 * 6)
		if (cut) round.push([0, y, cut, 1, '#fff'], [56 - cut, y, cut, 1, '#fff'])
	}
	const ends: PixelRect[] = [
		[0, 20, 3, 14, '#6e6958'],
		[53, 20, 3, 14, '#6e6958'],
		...trapezoid(28, 18, 7, 9, 16, DARKER),
		[23, 16, 11, 2, '#c2bca8'],
	]
	return svgUrl(
		56,
		34,
		`<mask id="r"><rect width="56" height="34" fill="#fff"/>${markup(round).replaceAll('#fff', '#000')}</mask>` +
			`<g mask="url(#r)">${markup(inside)}${markup(near)}${markup(ends)}</g>`,
	)
})()

/**
 * An Inca house on the trail, as they've been put back: stone walls,
 * gables, a trapezoid door, and its roof thatched. 40 by 38.
 */
export const thatchedHouse = pixelArt(40, 38, [
	...masonry(2, 18, 36, 20, OLD_GRANITE, 191),
	...trapezoid(20, 24, 6, 8, 14, DARKER),
	[15, 22, 10, 2, '#c2bca8'],
	...trapezoid(8, 24, 3, 4, 5, DARK),
	...trapezoid(32, 24, 3, 4, 5, DARK),
	...thatch(0, 2, 40, 16, 192),
])

/**
 * A sign on the trail, carved wood on two posts: `name` over `sub`, in
 * pixel letters, burnt in. Its width fits them.
 */
export function trailSign(name: string, sub = '') {
	const width = Math.max(pixelTextWidth(name, 1), pixelTextWidth(sub, 1)) + 8
	const board = sub ? 20 : 11
	const height = board + 10
	/** Where a line of lettering starts, to be in the middle of the board. */
	const centred = (text: string) =>
		Math.round((width - pixelTextWidth(text, 1)) / 2)
	const body = `<rect x="2" y="${board}" width="2" height="${height - board}" fill="#5a3f26"/><rect x="${width - 4}" y="${board}" width="2" height="${height - board}" fill="#5a3f26"/><rect x="0" y="0" width="${width}" height="${board}" fill="#8a5a32"/><rect x="0" y="0" width="${width}" height="1" fill="#a8743f"/><rect x="0" y="${board - 1}" width="${width}" height="1" fill="#5e3c20"/>${pixelText(name, centred(name), 2, 1, '#f3e3c0')}${
		sub ? pixelText(sub, centred(sub), 11, 1, '#e8c98f') : ''
	}`
	return svgUrl(width, height, body)
}

// --- Gateways --------------------------------------------------------------------

/** How far back across the path leans, in cells: `DEPTH_SLANT` along for the path's depth up. */
const SLANT = 28
const DEPTH = 18

/**
 * A gateway across the path, as the Incas built them: a doorway in a wall
 * that crosses it, its near jamb in front of the path, its far jamb behind
 * it, and a lintel, one great stone, across from one to the other over
 * whoever's going through. Drawn going back across the path at its slant,
 * so the lintel's top and side show. In two pictures, `front` (the near
 * jamb and the lintel, over the path) and `back` (the far jamb, behind it),
 * `jamb` cells tall, `thick` across, and the wall, `wall` cells on, going
 * back from the far jamb, higher up the slope.
 */
export function gateway(o: {
	jamb: number
	thick: number
	lintel: number
	stone: Stone
	seed: number
	wall?: number
}) {
	const { jamb, thick, lintel, stone, seed } = o
	const wall = o.wall ?? 0
	const shade: Stone = {
		...stone,
		stone: stone.shade,
		stone2: stone.joint,
		lit: stone.stone,
	}
	// The front: its near jamb, the lintel's end over it, the lintel's top
	// going back, and its side, to the far jamb's top.
	const fw = SLANT + thick + 2
	const fh = jamb + DEPTH
	const front: PixelRect[] = [
		...masonry(0, DEPTH + lintel, thick, jamb - lintel, stone, seed),
	]
	// Its side, going back a little, in shade.
	for (let y = DEPTH + lintel; y < fh; y++)
		front.push([thick, y - 2, 2, 1, stone.shade])
	// The lintel: its top, going back across the path, lit.
	for (let row = 0; row < DEPTH; row++) {
		const x = Math.round((SLANT * (DEPTH - row)) / DEPTH)
		front.push([x, row, thick, 1, row === 0 ? stone.lit : stone.stone2])
	}
	// Its side, under its top's far edge, in shade, down to its thickness.
	for (let row = 0; row < DEPTH; row++) {
		const x = Math.round((SLANT * (DEPTH - row)) / DEPTH) + thick - 1
		front.push([x, row + 1, 2, lintel, stone.shade])
	}
	front.push(...masonry(0, DEPTH, thick, lintel, stone, seed + 1, true))
	front.push([0, DEPTH, thick, 1, stone.lit])
	// The far jamb, behind the path, and the wall going on back from it.
	const bw = thick + 2 + wall
	const bh = jamb + (wall ? 10 : 0)
	const back: PixelRect[] = [
		...masonry(0, bh - jamb + lintel, thick, jamb - lintel, shade, seed + 2),
	]
	back.push([thick, bh - jamb + lintel, 2, jamb - lintel, stone.joint])
	if (wall) {
		back.push(...masonry(thick + 2, 0, wall, bh, stone, seed + 3))
		back.push(
			...trapezoid(thick + 2 + Math.round(wall / 2), 12, 4, 6, 10, DARK),
		)
	}
	return {
		front: pixelArt(fw, fh, front),
		back: pixelArt(bw, bh, back),
		frontWidth: fw * 2,
		backWidth: bw * 2,
		/** How far right the back's left is of the front's: across the path. */
		across: SLANT * 2,
	}
}

/** A doorway in the citadel, across the path between its houses. */
export const DOORWAY = gateway({
	jamb: 62,
	thick: 9,
	lintel: 6,
	stone: GRANITE,
	seed: 241,
})

/**
 * Inti Punku, the Sun Gate, at the top of the trail: a great gateway of
 * old stone, its walls going on up the ridge behind it; through it, the
 * first sight of the citadel.
 */
export const SUN_GATEWAY = gateway({
	jamb: 78,
	thick: 13,
	lintel: 9,
	stone: OLD_GRANITE,
	seed: 205,
	wall: 40,
})

/** The Sun Gate's walls either side of it, stepping up the ridge, behind the path. 64 by 64. */
export const sunGateWalls = pixelArt(64, 64, [
	...masonry(0, 24, 30, 40, OLD_GRANITE, 201),
	...masonry(4, 12, 22, 12, OLD_GRANITE, 202),
	...masonry(34, 34, 30, 30, OLD_GRANITE, 203),
	...trapezoid(15, 34, 4, 6, 10, DARK),
	...trapezoid(49, 42, 4, 6, 10, DARK),
])

// --- In the citadel --------------------------------------------------------------

/**
 * A house in the citadel, as it is now: roofless, its walls standing, its
 * gables up either end, trapezoid windows and niches in its long wall,
 * and its doorway. `w` cells long.
 */
export function citadelHouse(w: number, seed: number) {
	const random = seeded(seed)
	const h = 34
	const gable = 14
	const rects: PixelRect[] = []
	for (const end of [0, w - 12]) {
		for (let row = 0; row < gable; row++) {
			const half = Math.round(((row + 1) / gable) * 6)
			rects.push([
				end + 6 - half,
				row,
				half * 2,
				1,
				row === 0 ? GRANITE.lit : '#948d7c',
			])
		}
		rects.push([end + 5, 3, 2, 3, DARK])
	}
	rects.push(...masonry(0, gable, w, h - gable, GRANITE, seed))
	const door = 6 + Math.floor(random() * Math.max(1, w - 16))
	for (let x = 6; x < w - 4; x += 10) {
		if (Math.abs(x - door) < 8) continue
		rects.push(...trapezoid(x, gable + 4, 3, 4, 6, DARK))
	}
	rects.push(...trapezoid(door, gable + 4, 5, 7, h - gable - 4, DARKER))
	rects.push([door - 4, gable + 2, 9, 2, GRANITE.lit])
	return pixelArt(w, h, rects)
}

/**
 * Agricultural terraces, stepping up the hillside behind the path: grass
 * on each, a dry stone wall under it. 64 by 40.
 */
export const terraceSteps = (() => {
	const rects: PixelRect[] = []
	for (let i = 0; i < 4; i++) {
		const y = 4 + i * 9
		const x = Math.max(0, 12 - i * 4)
		rects.push(...masonry(x, y + 3, 64 - x, 6, GRANITE, 221 + i))
		rects.push([x, y, 64 - x, 3, '#6aa04a'])
		rects.push([x, y, 64 - x, 1, '#8cc060'])
	}
	return pixelArt(64, 40, rects)
})()

/**
 * The Intihuatana, the hitching post of the sun: a granite stone carved
 * in steps, a post up out of its top, on a little platform of its own. 30 by 26.
 */
export const intihuatana = pixelArt(30, 26, [
	...masonry(0, 18, 30, 8, GRANITE, 231, true),
	[3, 10, 24, 8, '#9c9584'],
	[3, 10, 24, 1, '#c9c2b0'],
	[6, 6, 10, 4, '#a7a090'],
	[6, 6, 10, 1, '#cfc8b6'],
	[18, 7, 7, 3, '#958e7e'],
	[11, 0, 4, 6, '#a7a090'],
	[11, 0, 4, 1, '#d4cdbb'],
	[14, 0, 1, 6, '#857e6e'],
	[3, 17, 24, 1, '#7a7363'],
	[25, 10, 2, 8, '#857e6e'],
])

/** A sign at the very edge, on a post: Aguas Calientes, down there. 46 by 30. */
export const edgeSign = svgUrl(
	46,
	30,
	`<rect x="21" y="12" width="3" height="18" fill="#5a3f26"/><rect x="0" y="0" width="46" height="13" fill="#8a5a32"/><rect x="0" y="0" width="46" height="1" fill="#a8743f"/><rect x="0" y="12" width="46" height="1" fill="#5e3c20"/>${pixelText('AGUAS', 2, 3, 1, '#f3e3c0')}${pixelText('↓', 38, 3, 1, '#ffd25a')}`,
)

// --- Down in the valley ------------------------------------------------------------

/**
 * A house in Aguas Calientes, at the foot of the mountain: brick and
 * plaster, painted, a balcony, a tin roof. `colour` its walls. 34 by 40.
 */
export function townHouse(colour: string, seed: number) {
	const random = seeded(seed)
	const rects: PixelRect[] = [
		[2, 8, 30, 32, colour],
		[26, 8, 6, 32, 'rgba(0,0,0,0.15)'],
		[0, 4, 34, 4, '#8a8f94'],
		[0, 4, 34, 1, '#b4b9be'],
		[0, 7, 34, 1, '#5f6468'],
		[6, 12, 6, 6, '#2e3a44'],
		[18, 12, 6, 6, '#2e3a44'],
		[5, 18, 20, 1, '#5a3f26'],
		[5, 19, 1, 3, '#5a3f26'],
		[24, 19, 1, 3, '#5a3f26'],
		[12, 28, 7, 12, '#5a3f26'],
		[6, 26, 4, 5, '#2e3a44'],
		[22, 26, 4, 5, '#2e3a44'],
	]
	if (random() < 0.6)
		rects.push([4, 22, 3, 2, '#e04a5a'], [23, 22, 3, 2, '#e8c34a'])
	return pixelArt(34, 40, rects)
}

/**
 * A carriage of the train up the valley to Aguas Calientes: blue, a gold
 * stripe, windows up into its roof to see the mountains. 92 by 30.
 */
export const carriage = pixelArt(92, 30, [
	[2, 4, 88, 20, '#1f3f7a'],
	[2, 4, 88, 2, '#2c5aa8'],
	[0, 2, 92, 3, '#c9d4e4'],
	[4, 0, 84, 3, '#9fb6d4'],
	...Array.from(
		{ length: 8 },
		(_, i): PixelRect => [6 + i * 10, 8, 8, 7, '#a9d2ec'],
	),
	...Array.from(
		{ length: 8 },
		(_, i): PixelRect => [6 + i * 10, 8, 8, 2, '#d9f0fb'],
	),
	[2, 17, 88, 2, '#e3b33a'],
	[2, 22, 88, 2, '#132a52'],
	[10, 24, 8, 6, '#2b2b2b'],
	[22, 24, 8, 6, '#2b2b2b'],
	[62, 24, 8, 6, '#2b2b2b'],
	[74, 24, 8, 6, '#2b2b2b'],
	[12, 26, 4, 2, '#777777'],
	[24, 26, 4, 2, '#777777'],
	[64, 26, 4, 2, '#777777'],
	[76, 26, 4, 2, '#777777'],
])

/** A banana plant, by the river. 24 by 30. */
export const bananaPlant = pixelArt(24, 30, [
	[11, 12, 3, 18, '#6e8a3a'],
	[12, 12, 1, 18, '#86a64a'],
	[2, 8, 10, 4, '#4f9a3a'],
	[0, 11, 6, 3, '#3f8430'],
	[13, 6, 10, 4, '#4f9a3a'],
	[18, 9, 6, 3, '#3f8430'],
	[8, 2, 4, 8, '#5aa844'],
	[13, 0, 4, 8, '#4a9638'],
	[4, 14, 7, 3, '#5aa844'],
	[14, 14, 7, 3, '#4a9638'],
	[15, 16, 3, 4, '#c9b83a'],
	[16, 20, 2, 2, '#7a3a5a'],
])

// --- Platforms --------------------------------------------------------------------

/**
 * A rope bridge across a gorge, as the Incas make them still, of plaited
 * grass: its floor as deep as the path, near enough, planks laid across
 * it going back at the path's own slant, the floor ropes under its front
 * edge; its handrail along the far side, sagging between posts on the
 * bank, strung down to the floor with cords. `width` px across the gorge; its
 * floor's middle the Platform's top, the path's line.
 */
export function ropeBridgeArt(width: number) {
	/** How far onto either bank its posts stand. */
	const bank = 6
	const span = width / 2
	const w = span + bank * 2
	/** Its floor: how deep, and how far down from the art's top its back edge is. */
	const deck = 14
	const back = 18
	const front = back + deck
	const h = front + 5
	const rope = '#b89b5a'
	const ropeDark = '#7d6634'
	const plank = ['#95693a', '#8f6436', '#9a6e3e']
	const rects: PixelRect[] = []
	const sag = (x: number, depth: number) =>
		Math.round(depth * (1 - ((2 * (x - bank)) / span - 1) ** 2))
	// The far handrail, behind, from post to post, its cords down to the floor's back edge.
	for (let x = bank; x < w - bank; x++) {
		const y = 2 + sag(x, 5)
		rects.push([x, y, 1, 1, ropeDark])
		if (x % 4 === 2)
			rects.push([x, y + 1, 1, back - y - 1, 'rgba(90,70,30,0.55)'])
	}
	for (const x of [bank - 3, w - bank + 1])
		rects.push([x, 0, 2, back + 1, '#5a3f26'])
	// The floor: planks across it, going back at the path's slant, a dark
	// crack between each, its back edge in shade and its front edge lit.
	const slant = 28 / 18
	for (let row = 0; row < deck; row++) {
		const shift = Math.round((deck - 1 - row) * slant)
		for (let x = bank; x < w - bank; x++) {
			const at = x - shift
			const k = Math.floor(at / 6)
			// Two wide, so it joins up row to row at the slant.
			const crack = at - k * 6 < 2
			rects.push([
				x,
				back + row,
				1,
				1,
				crack ? '#5a3f22' : plank[((k % 3) + 3) % 3],
			])
		}
	}
	rects.push([bank, back, span, 1, 'rgba(40,28,14,0.35)'])
	// Its near side, in front of whoever's on it: the floor's lit front
	// edge, the edge under it and the floor ropes along it, sagging a
	// little; its near posts; and its near handrail, sagging between them,
	// strung down to the floor's front edge with cords.
	const near: PixelRect[] = [[bank, front - 1, span, 1, '#b8915a']]
	near.push([bank, front, span, 2, '#5e4224'])
	for (let x = bank; x < w - bank; x++) {
		const y = front + 2 + Math.round(sag(x, 2) / 2)
		near.push([x, y, 1, 1, ropeDark], [x, y + 1, 1, 1, rope])
	}
	for (let x = bank; x < w - bank; x++) {
		const y = front - 20 + sag(x, 7)
		near.push([x, y, 1, 2, rope], [x, y + 2, 1, 1, ropeDark])
		if (x % 6 === 3)
			near.push([x, y + 3, 1, front - y - 4, 'rgba(184,155,90,0.8)'])
	}
	for (const x of [bank - 3, w - bank + 1]) {
		near.push([x, front - 23, 2, 25, '#6b4a2b'])
		near.push([x, front - 23, 2, 1, '#8a6338'])
		near.push([x, front - 19, 2, 1, rope])
	}
	return {
		asset: pixelArt(w, h, rects),
		width: w * 2,
		height: h * 2,
		// Its floor's middle on the path's line.
		top: (back + deck / 2) * 2,
		/** Its near side, the same size, to draw over whoever's on it. */
		front: pixelArt(w, h, near),
	}
}

/** A log across a gap, the Incas' drawbridge: bark, its rings at the ends, lashed. `width` px. */
export function logArt(width: number) {
	const w = width / 2
	const rects: PixelRect[] = [
		[1, 1, w - 2, 7, '#6b4a2b'],
		[1, 1, w - 2, 2, '#87613a'],
		[1, 7, w - 2, 1, '#4a321c'],
		[0, 1, 2, 7, '#c8a46a'],
		[0, 3, 1, 3, '#9c7a45'],
		[w - 2, 1, 2, 7, '#c8a46a'],
		[w - 1, 3, 1, 3, '#9c7a45'],
	]
	for (let x = 4; x < w - 4; x += 5)
		rects.push([x, 3 + (x % 3), 3, 1, '#4f3720'])
	for (const x of [6, w - 9])
		rects.push([x, 0, 3, 9, '#b89b5a'], [x, 4, 3, 1, '#7d6634'])
	return { asset: pixelArt(w, 9, rects), width, height: 18, top: 2 }
}

/**
 * A house in the citadel as a Platform: its long wall's top to run along,
 * its gables up over it at either end, on down to the back of the path,
 * `height` px over the path's line. `width` px long.
 */
export function houseArt(width: number, height: number, seed: number) {
	const w = width / 2
	const wall = Math.round((height - 14) / 2)
	const gable = 12
	const random = seeded(seed)
	const rects: PixelRect[] = []
	for (const end of [0, w - 12]) {
		for (let row = 0; row < gable; row++) {
			const half = Math.round(((row + 1) / gable) * 6)
			rects.push([
				end + 6 - half,
				row,
				half * 2,
				1,
				row === 0 ? GRANITE.lit : '#948d7c',
			])
		}
		rects.push([end + 5, 4, 2, 3, DARK])
	}
	rects.push(...masonry(0, gable, w, wall, GRANITE, seed))
	const door = 10 + Math.floor(random() * Math.max(1, w - 20))
	for (let x = 7; x < w - 5; x += 11) {
		if (Math.abs(x - door) < 9) continue
		rects.push(...trapezoid(x, gable + 4, 3, 4, Math.min(6, wall - 6), DARK))
	}
	rects.push(...trapezoid(door, gable + 3, 5, 7, wall - 3, DARKER))
	rects.push([door - 4, gable + 1, 9, 2, GRANITE.lit])
	return {
		asset: pixelArt(w, gable + wall, rects),
		width,
		height: (gable + wall) * 2,
		top: gable * 2,
	}
}

/**
 * The Temple of the Sun, the Torreón: its curved wall of the finest
 * stonework in the citadel, rounded round the rock it's built on, two
 * trapezoid windows, lined up on the solstice sunrise. Its top to run
 * along, on down to the back of the path, `height` px over the path's line.
 */
export function templeArt(width: number, height: number) {
	const w = width / 2
	const h = Math.round((height - 14) / 2)
	const wall = masonry(0, 0, w, h, GRANITE, 251, true)
	// Curved: the light on its left, shade round its right, its corners rounded off.
	for (let x = 0; x < w; x++) {
		const t = x / (w - 1)
		const light = Math.cos((t - 0.3) * Math.PI)
		if (light > 0.85) wall.push([x, 0, 1, h, 'rgba(255,255,240,0.16)'])
		if (light < 0.2)
			wall.push([
				x,
				0,
				1,
				h,
				`rgba(40,36,26,${(0.2 + (0.2 - light) * 0.5).toFixed(2)})`,
			])
	}
	// Courses curving with it: a darker line along each, bowed.
	for (let y = 6; y < h; y += 6)
		for (let x = 0; x < w; x++) {
			const bow = Math.round(Math.sin((x / (w - 1)) * Math.PI) * 1.5)
			wall.push([x, y + bow, 1, 1, 'rgba(60,54,42,0.35)'])
		}
	wall.push(...trapezoid(Math.round(w * 0.34), 8, 4, 5, 9, DARKER))
	wall.push(...trapezoid(Math.round(w * 0.66), 8, 4, 5, 9, DARKER))
	wall.push([Math.round(w * 0.34) - 3, 7, 7, 1, GRANITE.lit])
	wall.push([Math.round(w * 0.66) - 3, 7, 7, 1, GRANITE.lit])
	// Its top, lit, and its rounded ends: the sky through them.
	wall.push([0, 0, w, 1, '#ddd6c4'])
	const round: string[] = []
	for (let y = 0; y < 5; y++) {
		const cut = Math.round((5 - y) ** 2 / 5)
		if (cut)
			round.push(
				`<rect x="0" y="${y}" width="${cut}" height="1" fill="#000"/>`,
				`<rect x="${w - cut}" y="${y}" width="${cut}" height="1" fill="#000"/>`,
			)
	}
	return {
		asset: svgUrl(
			w,
			h,
			`<mask id="t"><rect width="${w}" height="${h}" fill="#fff"/>${round.join('')}</mask><g mask="url(#t)">${markup(wall)}</g>`,
		),
		width,
		height: h * 2,
		top: 0,
	}
}

/** The rock the temple's built on: bare granite, rounded, a cave under it. A Platform, like `templeArt`. */
export function sacredRockArt(width: number, height: number) {
	const w = width / 2
	const h = Math.round((height - 14) / 2)
	const rects: PixelRect[] = []
	for (let y = 0; y < h; y++) {
		const inset = Math.max(0, Math.round(3 - y * 0.8))
		rects.push([inset, y, w - inset * 2, 1, y < 2 ? '#c4bdab' : '#9a9483'])
		rects.push([w - inset - 4, y, 4, 1, '#7d7767'])
	}
	for (let i = 0; i < 5; i++)
		rects.push([4 + i * Math.floor(w / 5), 3 + (i % 3) * 3, 6, 1, '#7d7767'])
	rects.push(...trapezoid(Math.round(w / 2), h - 9, 6, 10, 9, DARKER))
	return { asset: pixelArt(w, h, rects), width, height: h * 2, top: 0 }
}

/**
 * Condors, far off, soaring round over the mountains: a sheet of two
 * frames, their wings flexing. 26 by 8 a frame.
 */
export const skyCondors = (() => {
	const frame = (dx: number, lift: number): PixelRect[] => [
		[dx + 1, 3 - lift, 11, 2, '#1d1b20'],
		[dx + 14, 3 - lift, 11, 2, '#1d1b20'],
		[dx, 2 - lift * 2, 2, 1, '#1d1b20'],
		[dx + 24, 2 - lift * 2, 2, 1, '#1d1b20'],
		[dx + 5, 4 - lift, 6, 1, '#d9d4c8'],
		[dx + 15, 4 - lift, 6, 1, '#d9d4c8'],
		[dx + 10, 4, 6, 3, '#1d1b20'],
		[dx + 15, 3, 2, 2, '#efebe2'],
		[dx + 17, 3, 2, 1, '#9a5d50'],
		[dx + 11, 7, 3, 1, '#1d1b20'],
	]
	return pixelArt(52, 8, [...frame(0, 0), ...frame(26, 1)])
})()

/**
 * A terrace, as a Platform: grass on top, hanging over its edge, flowers
 * in it, and its wall of dry stone under it, on down to the back of the
 * path, `height` px over the path's line. `width` px across.
 */
export function terraceArt(width: number, height: number, seed: number) {
	const random = seeded(seed)
	const w = width / 2
	const h = Math.round((height - 14) / 2) + 3
	const rects: PixelRect[] = [...masonry(0, 3, w, h - 3, GRANITE, seed)]
	// Shade under the lip of the grass.
	rects.push([0, 3, w, 1, 'rgba(30,40,20,0.35)'])
	rects.push([0, 0, w, 3, '#6aa04a'], [0, 0, w, 1, '#8cc060'])
	// Grass hanging over its edge, here and there; flowers in it.
	for (let x = 0; x < w; x += 2 + Math.floor(random() * 4)) {
		rects.push([
			x,
			3,
			1 + Math.floor(random() * 2),
			1 + Math.floor(random() * 3),
			'#5a9043',
		])
		if (random() < 0.12)
			rects.push([
				x,
				0,
				1,
				1,
				['#e8c34a', '#e04a5a', '#f2f2f2'][Math.floor(random() * 3)],
			])
	}
	// Darker towards its foot, the shadow of the terrace below; and its end,
	// in shade, so one in front of the next stands out from it.
	rects.push([0, h - 3, w, 3, 'rgba(30,30,20,0.18)'])
	rects.push(
		[0, 3, 2, h - 3, 'rgba(30,30,20,0.3)'],
		[2, 3, 1, h - 3, 'rgba(255,255,240,0.15)'],
	)
	return { asset: pixelArt(w, h, rects), width, height: h * 2, top: 0 }
}

/** How a broken bridge's end is drawn: its picture's height, in px, and how far down it its floor is. */
export const BROKEN_BRIDGE = { height: 120, deck: 28 }

/**
 * What's left of a rope bridge across a ravine, long since broken: at one
 * end, `near` or `far`, its post on the bank, a stub of its floor out over
 * the edge, and the rest of it hanging down the ravine's wall, its ropes
 * and the planks still on them, askew, some gone. 40 by 60.
 */
export function brokenBridge(side: 'near' | 'far') {
	const random = seeded(side === 'near' ? 301 : 302)
	const rope = '#b89b5a'
	const ropeDark = '#7d6634'
	const deck = BROKEN_BRIDGE.deck / 2
	const rects: PixelRect[] = [
		// Its post, on the bank, the handrail rope tied round it.
		[12, 2, 3, deck - 1, '#5a3f26'],
		[13, 2, 1, deck - 1, '#77562f'],
		[11, 1, 5, 2, '#4a321c'],
		[12, 6, 3, 1, rope],
		// The floor ropes, along the bank to the edge, and a stub of planks
		// out over it.
		[10, deck + 2, 10, 1, ropeDark],
	]
	for (let x = 20; x < 30; x += 3) {
		rects.push([x, deck - (x - 20) / 5, 2, 3, '#8a6338'])
		rects.push([x, deck - (x - 20) / 5, 2, 1, '#a87c4a'])
	}
	rects.push([20, deck + 2, 10, 1, ropeDark])
	// The handrail, slack, from the post down over the edge.
	for (let x = 14; x < 30; x++)
		rects.push([x, 6 + Math.round(((x - 14) / 16) ** 2 * 12), 1, 1, rope])
	// The rest, hanging down the ravine's wall: two ropes, planks on them.
	for (let y = deck + 2; y < 60; y++) {
		const sway = Math.round(Math.sin(y / 7) * 1.2)
		rects.push([30 + sway, y, 1, 1, ropeDark])
		rects.push([35 + sway, y, 1, 1, rope])
		if (y % 5 === 0 && random() < 0.75) {
			const tilt = random() < 0.5 ? 0 : 1
			rects.push([29 + sway, y, 8, 2, '#8a6338'])
			rects.push([29 + sway + tilt * 4, y, 4, 1, '#a87c4a'])
		}
	}
	// The handrail's end, frayed, hanging too.
	for (let y = 18; y < 40; y++)
		rects.push([32 + Math.round(Math.sin(y / 5)), y, 1, 1, rope])
	// The far end: the same, the other way round.
	return pixelArt(
		40,
		60,
		side === 'near'
			? rects
			: rects.map(
					([x, y, w, h, fill]): PixelRect => [40 - x - w, y, w, h, fill],
				),
	)
}
