import { pixelCircle, pixelPolygon, svgUrl } from './pixelArt'
import { seeded } from './seeded'

/**
 * What goes by on the voyage from Stockholm to Turku, drawn in code, a
 * horizon's two bands each (see `CourseLook['horizon']`), 160 tall: out
 * through Stockholm's archipelago, its islands' pines and red cottages;
 * across the open sea to Åland, a lighthouse on a skerry; and into Turku,
 * up the river Aura, its cathedral over the roofs.
 */

const rect = (x: number, y: number, w: number, h: number, fill: string) =>
	`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`

/** The sea, far off, nearer, and the river Aura. */
export const SEA_FAR = '#5b97c2'
export const SEA = '#3f7fa8'
export const RIVER = '#3d6f86'

/** Light on water, along a band of it from `top` down, `width` across. */
function glints(width: number, top: number, bottom: number, seed: number) {
	const random = seeded(seed)
	let out = ''
	for (let i = 0; i < width / 14; i++) {
		const y = Math.round((top + 4 + random() * (bottom - top - 6)) / 2) * 2
		out += rect(
			Math.round((random() * width) / 2) * 2,
			y,
			6 + Math.round(random() * 4) * 2,
			2,
			random() < 0.6 ? 'rgba(255,255,255,0.28)' : 'rgba(0,30,60,0.18)',
		)
	}
	return out
}

/** A pine, its foot at `x`, `y`: dark, in tiers, `h` tall. */
function pine(x: number, y: number, h: number, fill: string) {
	const tiers = Math.max(2, Math.round(h / 8))
	let out = rect(x - 1, y - 4, 2, 4, '#4a3524')
	for (let t = 0; t < tiers; t++) {
		const w = Math.max(2, Math.round(((tiers - t) / tiers) * (h * 0.5)) * 2)
		out += rect(
			x - w / 2,
			y - 4 - (t + 1) * (h / tiers),
			w,
			Math.ceil(h / tiers),
			fill,
		)
	}
	return out
}

/** A red cottage, Falu red, white at its corners, its roof dark: its foot at `x`, `y`. */
function cottage(x: number, y: number) {
	return [
		rect(x, y - 14, 20, 14, '#a5322b'),
		rect(x, y - 14, 2, 14, '#f3f1ea'),
		rect(x + 18, y - 14, 2, 14, '#f3f1ea'),
		`${pixelPolygon(
			[
				[x - 2, y - 14],
				[x + 10, y - 22],
				[x + 22, y - 14],
			],
			'#3b3a3a',
		)}`,
		rect(x + 8, y - 10, 4, 4, '#f3f1ea'),
		rect(x + 14, y - 26, 2, 6, '#3b3a3a'),
	].join('')
}

/** An island of granite, low and rounded, `width` across, its foot at `y`. */
function rocks(
	x: number,
	y: number,
	width: number,
	height: number,
	fill: string,
	shade: string,
) {
	const step = 8
	let out = ''
	for (let i = 0; i < width; i += step) {
		const t = (i + step / 2) / width
		const h = Math.round((Math.sin(t * Math.PI) ** 0.7 * height) / 2) * 2
		out += rect(x + i, y - h, step, h, fill)
		if (i % 24 === 8) out += rect(x + i + 2, y - h + 4, 4, 2, shade)
	}
	return out + rect(x, y - 2, width, 2, shade)
}

// --- Out through the archipelago ------------------------------------------------

/** Far off: islands, low, hazy, wooded, on the sea from 124 down. 640 by 160. */
export const archipelagoFar = (() => {
	const random = seeded(4101)
	let islands = ''
	for (let x = 0; x < 640; ) {
		const width = 60 + Math.round(random() * 100)
		const height = 8 + Math.round(random() * 10)
		islands += rocks(x, 124, width, height, '#8daabb', '#7d9aab')
		for (let p = x + 10; p < x + width - 10; p += 6 + Math.round(random() * 8))
			islands += pine(
				p,
				124 - height * 0.6,
				8 + Math.round(random() * 8),
				'#7d9aab',
			)
		x += width + 20 + Math.round(random() * 60)
	}
	return svgUrl(
		640,
		160,
		[rect(0, 124, 640, 36, SEA_FAR), islands, glints(640, 126, 160, 4102)].join(
			'',
		),
	)
})()

/**
 * Nearer: islands of pink-grey granite, pines on them, red cottages, a
 * jetty and a boat, a lighthouse; on the sea from 118 down. 960 by 160.
 */
export const archipelagoNear = (() => {
	const random = seeded(4201)
	let islands = ''
	let n = 0
	for (let x = 10; x < 940; ) {
		const width = 110 + Math.round(random() * 120)
		const height = 14 + Math.round(random() * 14)
		const end = Math.min(width, 950 - x)
		islands += rocks(x, 120, end, height, '#a99a8f', '#857469')
		const top = 120 - height * 0.7
		for (let p = x + 14; p < x + end - 14; p += 8 + Math.round(random() * 14))
			islands += pine(
				p,
				top + random() * 4,
				18 + Math.round(random() * 22),
				random() < 0.5 ? '#2f5a3a' : '#264a30',
			)
		if (n % 2 === 0)
			islands += cottage(x + Math.round(end / 2) - 10, Math.round(top + 2))
		if (n % 3 === 1) {
			// A jetty, a little boat tied up to it.
			islands += rect(x + end - 6, 116, 30, 4, '#8a6a46')
			islands += rect(x + end + 4, 110, 18, 6, '#f3f1ea')
			islands += rect(x + end + 6, 106, 6, 4, '#f3f1ea')
		}
		if (n === 2) {
			// A lighthouse, red and white.
			const lx = x + 20
			islands += rect(lx, Math.round(top) - 40, 10, 40, '#f3f1ea')
			islands += rect(lx, Math.round(top) - 30, 10, 8, '#c8312b')
			islands += rect(lx, Math.round(top) - 14, 10, 6, '#c8312b')
			islands += rect(lx - 2, Math.round(top) - 46, 14, 6, '#3b3a3a')
			islands += rect(lx + 2, Math.round(top) - 44, 6, 2, '#ffe066')
		}
		x += width + 40 + Math.round(random() * 80)
		n++
	}
	return svgUrl(
		960,
		160,
		[rect(0, 118, 960, 42, SEA), islands, glints(960, 122, 160, 4202)].join(''),
	)
})()

// --- The open sea, to Åland ---------------------------------------------------------

/** Far off: the open sea, a far island or two, a ship. 640 by 160. */
export const openSeaFar = svgUrl(
	640,
	160,
	[
		rect(0, 126, 640, 34, SEA_FAR),
		rocks(60, 126, 90, 6, '#9db6c6', '#8daabb'),
		rocks(420, 126, 50, 4, '#9db6c6', '#8daabb'),
		// A ship, hull down, a long way off.
		rect(280, 118, 44, 6, '#9db6c6'),
		rect(290, 112, 24, 6, '#adc3d1'),
		rect(300, 106, 6, 6, '#c8312b'),
		glints(640, 128, 160, 4301),
	].join(''),
)

/** Nearer: the sea, rolling, a skerry with a lighthouse on it, gulls. 1024 by 160. */
export const openSeaNear = svgUrl(
	1024,
	160,
	[
		rect(0, 112, 1024, 48, SEA),
		...Array.from({ length: 24 }, (_, i) =>
			rect(
				i * 44 + (i % 3) * 6,
				112 + (i % 4) * 10,
				22,
				2,
				'rgba(255,255,255,0.35)',
			),
		),
		rocks(700, 114, 80, 12, '#a99a8f', '#857469'),
		rect(730, 70, 10, 34, '#f3f1ea'),
		rect(730, 80, 10, 8, '#c8312b'),
		rect(728, 64, 14, 6, '#3b3a3a'),
		rect(732, 66, 6, 2, '#ffe066'),
		// Gulls, far off.
		...[
			[200, 60],
			[230, 48],
			[520, 74],
		].map(
			([x, y]) =>
				`${rect(x, y, 4, 2, '#f3f1ea')}${rect(x + 4, y + 2, 2, 2, '#f3f1ea')}${rect(x + 6, y, 4, 2, '#f3f1ea')}`,
		),
		glints(1024, 114, 160, 4302),
	].join(''),
)

// --- Into Turku ---------------------------------------------------------------------

/**
 * Over Turku's roofs: its cathedral, its brick tower and dark spire, its
 * castle, white, down at the river mouth, and the shipyard's crane.
 * 2000 by 300, standing on its bottom, behind the far band.
 */
export const turkuSpires = svgUrl(
	2000,
	300,
	[
		// The cathedral: its tower, red-brown brick, its spire, dark, on top.
		rect(100, 150, 64, 150, '#8a4a34'),
		rect(100, 150, 64, 4, '#a85c40'),
		...[0, 1, 2].map((i) => rect(116 + i * 14, 170, 6, 14, '#3b2a22')),
		rect(128, 210, 8, 8, '#f3f1ea'),
		`${pixelPolygon(
			[
				[100, 150],
				[132, 40],
				[164, 150],
			],
			'#3e4a4a',
		)}`,
		rect(130, 24, 4, 18, '#3e4a4a'),
		rect(126, 28, 12, 2, '#3e4a4a'),
		// Its nave, out from the tower.
		rect(164, 220, 140, 80, '#9a5a40'),
		`${pixelPolygon(
			[
				[164, 220],
				[234, 186],
				[304, 220],
			],
			'#5a3a2e',
		)}`,
		...[0, 1, 2, 3].map((i) => rect(180 + i * 30, 236, 8, 20, '#3b2a22')),
		// The castle, white, its roofs steep.
		rect(1450, 210, 120, 90, '#ece6d6'),
		rect(1490, 170, 50, 130, '#ece6d6'),
		`${pixelPolygon(
			[
				[1490, 170],
				[1515, 132],
				[1540, 170],
			],
			'#7a3b2e',
		)}`,
		`${pixelPolygon(
			[
				[1450, 210],
				[1510, 186],
				[1570, 210],
			],
			'#7a3b2e',
		)}`,
		...[0, 1, 2].map((i) => rect(1464 + i * 36, 240, 6, 10, '#3b3a3a')),
		// The shipyard's great crane, a cruise ship's hull under it.
		rect(650, 60, 8, 240, '#e0b23a'),
		rect(810, 60, 8, 240, '#e0b23a'),
		rect(630, 56, 210, 12, '#e0b23a'),
		rect(710, 68, 4, 60, '#3b3a3a'),
		rect(610, 230, 260, 70, '#e8ecef'),
		rect(610, 250, 260, 4, '#2d4b66'),
		rect(610, 264, 260, 4, '#2d4b66'),
	].join(''),
)

/** Turku, a way off: its roofs, hazy, trees between them. 1000 by 160. */
export const turkuFar = (() => {
	const random = seeded(4401)
	let roofs = ''
	for (let x = 0; x < 1000; ) {
		const w = 30 + Math.round(random() * 30) * 2
		const h = 70 + Math.round(random() * 14) * 2
		const fill = ['#c9b79a', '#bfae95', '#d2c3a8', '#b8a68b'][
			Math.floor(random() * 4)
		]
		roofs += rect(x, 160 - h, w, h, fill)
		roofs += rect(x, 160 - h, w, 4, '#a08a6e')
		// Its windows, hazy with distance.
		for (let wy = 160 - h + 10; wy < 150; wy += 14)
			for (let wx = x + 6; wx < x + w - 6; wx += 12)
				roofs += rect(wx, wy, 4, 6, '#9a8d7c')
		if (random() < 0.4)
			roofs += `${pixelCircle(x + w - 10 + 22 / 2, 160 - h - 14 + 22 / 2, 11, '#8da48a')}`
		x += w
	}
	return svgUrl(1000, 160, roofs)
})()

/**
 * Across the river Aura: its quay, lindens along it, the houses along the
 * far bank, yellow and white and pink, and the old boats moored along it,
 * restaurants now. The river from 136 down. 1200 by 160.
 */
export const turkuNear = (() => {
	const random = seeded(4501)
	const houses = ['#e8cf7a', '#f1ebdc', '#e8b8a8', '#d9c08f', '#c9d6c2']
	let bank = ''
	for (let x = 0; x < 1200; ) {
		const w = 60 + Math.round(random() * 20) * 2
		const h = 50 + Math.round(random() * 16) * 2
		const fill = houses[Math.floor(random() * houses.length)]
		bank += rect(x, 128 - h, w, h, fill)
		bank += rect(x, 128 - h, w, 4, 'rgba(0,0,0,0.12)')
		bank += `${pixelPolygon(
			[
				[x, 128 - h],
				[x + w / 2, 128 - h - 12],
				[x + w, 128 - h],
			],
			'#7a5048',
		)}`
		for (let fy = 128 - h + 10; fy < 120; fy += 16)
			for (let fx = x + 8; fx < x + w - 8; fx += 14)
				bank += rect(fx, fy, 6, 8, '#4f6470')
		x += w + 2
	}
	// Lindens along the quay.
	for (let x = 20; x < 1200; x += 70 + Math.round(random() * 20)) {
		bank += rect(x + 10, 108, 4, 20, '#4a3524')
		bank += `${pixelCircle(x + 26 / 2, 82 + 30 / 2, 13, random() < 0.5 ? '#4f8a4a' : '#5f9a52')}`
	}
	// The boats moored along it, a funnel each.
	let boats = ''
	for (const [x, hull] of [
		[120, '#1e2328'],
		[520, '#a5322b'],
		[860, '#1e2328'],
	] as const) {
		boats += rect(x, 128, 120, 12, hull)
		boats += rect(x + 6, 124, 108, 4, '#f3f1ea')
		boats += rect(x + 20, 112, 70, 12, '#f3f1ea')
		boats += rect(x + 24, 115, 60, 4, '#4f6470')
		boats += rect(x + 54, 98, 10, 14, '#c8312b')
		boats += rect(x + 54, 98, 10, 4, '#1e2328')
	}
	return svgUrl(
		1200,
		160,
		[
			bank,
			// The quay along the far bank, its granite.
			rect(0, 128, 1200, 8, '#9a958d'),
			rect(0, 128, 1200, 2, '#b8b2a8'),
			rect(0, 136, 1200, 24, RIVER),
			boats,
			glints(1200, 140, 160, 4502),
		].join(''),
	)
})()
