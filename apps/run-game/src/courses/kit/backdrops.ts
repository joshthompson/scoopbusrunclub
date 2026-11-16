import { pixelCircle, svgUrl } from './pixelArt'
import { seeded } from './seeded'

/**
 * Bands of the backdrop, drawn in code: each a picture repeated along it,
 * tiling (whatever's cut off at one edge carries on over the other), in
 * 2-px steps, paler and bluer the further off. Furby Fields' crystal peaks
 * and candy ridge behind its candy mountains, and its candy forest nearer;
 * Huddinge's ridges of pines; the hills and Västerbron far off behind
 * Kristinebergs IP; and dunes nearer than the pyramids.
 */

const rect = (x: number, y: number, w: number, h: number, fill: string) =>
	`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`
const even = (n: number) => Math.round(n / 2) * 2

/** Drawn at `x`, and again a band's `width` either side of it, so it tiles. */
const tiled = (width: number, x: number, draw: (x: number) => string) =>
	[-width, 0, width].map((shift) => draw(x + shift)).join('')

interface MountainColours {
	lit: string
	shade: string
	snow?: string
	snowShade?: string
	/** How far down it the snow comes, as a share of its height. */
	snowLine?: number
}

/**
 * A mountain, its peak at `peak`, `height` tall up from `base`, `wide`
 * across its foot: lit down its left face and in shadow down its right,
 * its edges and the ridge between its faces wandering a step at a time as
 * real ones do; its top snowed, if it has snow, the snow's edge ragged.
 */
function mountain(
	random: () => number,
	peak: number,
	base: number,
	height: number,
	wide: number,
	colours: MountainColours,
) {
	let left = 0
	let right = 0
	let ridge = 0
	const rows: [y: number, l: number, r: number, mid: number][] = []
	for (let y = base - height; y < base; y += 2) {
		const t = (y - (base - height)) / height
		left = Math.max(-6, Math.min(6, left + (random() < 0.5 ? -2 : 2)))
		right = Math.max(-6, Math.min(6, right + (random() < 0.5 ? -2 : 2)))
		ridge = Math.max(
			-4,
			Math.min(4, ridge + (random() < 0.4 ? -2 : random() < 0.66 ? 2 : 0)),
		)
		const half = (wide / 2) * t
		const l = even(peak - half + left * t)
		const r = even(peak + half + right * t)
		rows.push([y, l, Math.max(l + 2, r), even(peak + ridge * t)])
	}
	const snowLine = colours.snowLine ?? 0.22
	let body = ''
	for (const [y, l, r, mid] of rows) {
		const t = (y - (base - height)) / height
		const m = Math.max(l, Math.min(r, mid))
		body += rect(l, y, m - l, 2, colours.lit)
		body += rect(m, y, r - m, 2, colours.shade)
		if (!colours.snow) continue
		if (t < snowLine) {
			body += rect(l, y, m - l, 2, colours.snow)
			body += rect(m, y, r - m, 2, colours.snowShade ?? colours.snow)
		} else if (t < snowLine + 0.14) {
			// Its ragged edge: snow left in streaks down the gullies.
			for (let x = l; x < r; x += 2)
				if (random() < 0.32 * (1 - (t - snowLine) / 0.14))
					body += rect(
						x,
						y,
						2,
						2,
						x < m ? colours.snow : (colours.snowShade ?? colours.snow),
					)
		}
	}
	return body
}

/** A range of mountains along a band `width` across, their feet at `base`. */
function range(options: {
	seed: number
	width: number
	height: number
	base: number
	count: number
	tall: [number, number]
	wide: [number, number]
	colours: MountainColours[]
	extra?: (peak: number, height: number, random: () => number) => string
}) {
	const { width, height, base, count, tall, wide } = options
	const random = seeded(options.seed)
	const peaks = Array.from({ length: count }, (_, i) => ({
		peak: even((i + random() * 0.6) * (width / count)),
		height: even(tall[0] + random() * (tall[1] - tall[0])),
		wide: even(wide[0] + random() * (wide[1] - wide[0])),
		colours: options.colours[i % options.colours.length],
		seed: random() * 1e6,
	}))
	// The smaller ones in front, over the bigger behind.
	peaks.sort((a, b) => b.height - a.height)
	let body = ''
	for (const p of peaks)
		body += tiled(width, p.peak, (x) => {
			const own = seeded(Math.floor(p.seed))
			return (
				mountain(own, x, base, p.height, p.wide, p.colours) +
				(options.extra?.(x, p.height, own) ?? '')
			)
		})
	return svgUrl(width, height, body)
}

// --- Furby Fields ------------------------------------------------------------------

/**
 * Furthest off: crystal peaks, tall and jagged, pale lavender in the haze,
 * snowed, their faces lit and shaded. 960 by 170.
 */
export const crystalPeaks = range({
	seed: 6100,
	width: 960,
	height: 170,
	base: 170,
	count: 7,
	tall: [110, 160],
	wide: [150, 230],
	colours: [
		{
			lit: '#e7d9fb',
			shade: '#cfbcef',
			snow: '#fdf9ff',
			snowShade: '#e8def8',
			snowLine: 0.24,
		},
		{
			lit: '#ead6f6',
			shade: '#d4bbe8',
			snow: '#fdf9ff',
			snowShade: '#ecdff5',
			snowLine: 0.2,
		},
	],
})

/**
 * Nearer than those, behind the candy mountains: a ridge of iced candy
 * mountains, raspberry and grape, their icing dripping, sprinkles on
 * their faces. 960 by 150.
 */
export const candyRidge = range({
	seed: 6200,
	width: 960,
	height: 150,
	base: 150,
	count: 9,
	tall: [70, 120],
	wide: [120, 180],
	colours: [
		{
			lit: '#dcb0ec',
			shade: '#c08fdc',
			snow: '#fff4fb',
			snowShade: '#f4dcf0',
			snowLine: 0.18,
		},
		{
			lit: '#f2b4d8',
			shade: '#dc92c0',
			snow: '#fff4fb',
			snowShade: '#f6dcec',
			snowLine: 0.2,
		},
	],
	extra: (peak, height, random) => {
		let dots = ''
		const colours = ['#ff6fa8', '#ffe66b', '#6bc4ff', '#ffffff']
		for (let n = 0; n < 6; n++) {
			const y = even(150 - height * (0.15 + random() * 0.55))
			const spread = (150 - y) * 0.55
			const x = even(peak + (random() - 0.5) * spread)
			dots += rect(x, y, 2, 2, colours[n % colours.length])
		}
		return dots
	},
})

const CANDY = {
	pink: ['#ff9bd2', '#ffc4e6', '#e277b4'],
	blue: ['#9fd8ff', '#cbeaff', '#6fb4e6'],
	yellow: ['#fff08a', '#fff8c4', '#e8cf52'],
	lilac: ['#d3a6ff', '#e8d0ff', '#ad7ce6'],
	mint: ['#8ff0c8', '#c4fae2', '#5cc79f'],
	peach: ['#ffc08a', '#ffdcb8', '#e8955a'],
}
type Candy = keyof typeof CANDY
const STICK = '#f6efe2'
const STICK_SHADE = '#d8ccb8'
const TRUNK = '#b06c96'
const TRUNK_SHADE = '#8a4e76'

/** A candyfloss tree: a curly trunk, and a cloud of floss, lit on top. */
function flossTree(x: number, base: number, tall: number, candy: Candy) {
	const [c, lit, shade] = CANDY[candy]
	let body = ''
	for (let y = base - tall + 18; y < base; y += 2) {
		const sway = even(Math.sin(y / 9) * 3)
		body += rect(x + sway, y, 4, 2, TRUNK)
		body += rect(x + sway + 2, y, 2, 2, TRUNK_SHADE)
	}
	const top = base - tall + 14
	for (const [dx, dy, r] of [
		[-10, 4, 10],
		[10, 4, 10],
		[0, -4, 13],
		[0, 8, 9],
	])
		body += pixelCircle(x + 2 + dx, top + dy + 2, r, shade)
	for (const [dx, dy, r] of [
		[-10, 2, 10],
		[10, 2, 10],
		[0, -6, 13],
	])
		body += pixelCircle(x + 2 + dx, top + dy, r, c)
	body += pixelCircle(x - 2, top - 10, 5, lit)
	body += pixelCircle(x + 10, top - 2, 3, lit)
	return body
}

/** A swirl lollipop tree: a striped stick, and a great disc, its swirl in rings. */
function swirlTree(
	x: number,
	base: number,
	tall: number,
	candy: Candy,
	other: Candy,
) {
	const r = 14
	let body = ''
	for (let y = base - tall + r * 2; y < base; y += 2)
		body += rect(x, y, 4, 2, Math.floor(y / 4) % 2 ? STICK : '#ff6fa8')
	const cy = base - tall + r
	for (let ring = r; ring > 0; ring -= 4)
		body += pixelCircle(
			x + 2,
			cy,
			ring,
			(r - ring) % 8 ? CANDY[other][0] : CANDY[candy][0],
		)
	body += pixelCircle(x - 3, cy - 5, 3, '#ffffff')
	return body
}

/** A spiral cone tree: tiers stacked up, alternating colours, a star on top. */
function coneTree(
	x: number,
	base: number,
	tall: number,
	candy: Candy,
	other: Candy,
) {
	let body = rect(x, base - 8, 4, 8, TRUNK_SHADE)
	const tiers = 4
	const tierTall = Math.floor((tall - 8) / tiers / 2) * 2
	for (let t = 0; t < tiers; t++) {
		const bottom = base - 8 - t * tierTall + 4
		const half = 20 - t * 4
		const [c, lit, shade] = CANDY[t % 2 ? other : candy]
		for (let y = bottom - tierTall - 6; y < bottom; y += 2) {
			const w = even((half * (y - (bottom - tierTall - 6))) / (tierTall + 6))
			body += rect(x + 2 - w, y, w, 2, lit)
			body += rect(x + 2, y, w, 2, c)
			body += rect(x + 2 + w - 2, y, 2, 2, shade)
		}
	}
	const top = base - tall
	body += rect(x, top, 4, 4, '#fff08a')
	body += rect(x - 2, top + 2, 8, 2, '#fff08a')
	return body
}

/** A toadstool tree: a tall pale stem, and a great domed cap, spotted. */
function toadstoolTree(x: number, base: number, tall: number, candy: Candy) {
	const [c, lit, shade] = CANDY[candy]
	let body = ''
	const capTall = 22
	for (let y = base - tall + capTall - 4; y < base; y += 2) {
		const w = y > base - 8 ? 10 : 8
		body += rect(x + 2 - w / 2, y, w, 2, STICK)
		body += rect(x + 2 + w / 2 - 2, y, 2, 2, STICK_SHADE)
	}
	const top = base - tall
	for (let y = top; y < top + capTall; y += 2) {
		const t = (y - top) / capTall
		const half = even(26 * Math.sqrt(Math.min(1, t * 1.6)))
		body += rect(x + 2 - half, y, half * 2, 2, t > 0.8 ? shade : c)
	}
	body += rect(x - 14, top + 4, 8, 2, lit)
	for (const [dx, dy] of [
		[-12, 10],
		[4, 4],
		[12, 12],
		[-2, 14],
	])
		body += rect(x + dx, top + dy, 4, 4, '#ffffff')
	return body
}

/** A drooping tree: a dark twisty trunk, branches arching over, gumdrops hanging off them. */
function droopTree(x: number, base: number, tall: number, candy: Candy) {
	let body = ''
	for (let y = base - tall + 6; y < base; y += 2)
		body += rect(x + even(Math.sin(y / 6) * 2), y, 4, 2, TRUNK_SHADE)
	const top = base - tall + 6
	const gumdrops = ['#ff6fa8', '#ffe66b', '#6bc4ff', '#b48bff']
	for (const side of [-1, 1])
		for (let arm = 0; arm < 2; arm++) {
			const reach = 18 + arm * 8
			const from = top + arm * 10
			for (let i = 0; i < reach; i += 2) {
				const y = even(
					from - Math.sin((i / reach) * Math.PI) * 10 + (i / reach) * 6,
				)
				body += rect(x + 2 + side * i, y, 2, 2, TRUNK)
				if (i > 4 && (i / 2) % 3 === 0) {
					const g = gumdrops[(i / 2 + arm) % gumdrops.length]
					body += rect(x + 2 + side * i, y + 2, 2, 4, '#e8dfd0')
					body += rect(x + side * i, y + 6, 6, 4, g)
					body += rect(x + side * i + 2, y + 6, 2, 2, '#ffffff')
				}
			}
		}
	body += pixelCircle(x + 2, top - 4, 7, CANDY[candy][0])
	body += pixelCircle(x, top - 6, 3, CANDY[candy][1])
	return body
}

/** A corkscrew tree: a tall thin trunk, a ribbon wound up it, a pom-pom on top. */
function corkscrewTree(x: number, base: number, tall: number, candy: Candy) {
	const [c, lit] = CANDY[candy]
	let body = ''
	for (let y = base - tall + 8; y < base; y += 2) {
		body += rect(x, y, 6, 2, STICK)
		if (Math.floor((y + x) / 4) % 3 === 0) body += rect(x, y, 6, 2, c)
	}
	body += pixelCircle(x + 3, base - tall + 6, 8, c)
	body += pixelCircle(x + 1, base - tall + 3, 3, lit)
	return body
}

/** `hex` mixed `share` of the way to `to`: further off, hazier. */
function mix(hex: string, to: string, share: number) {
	const parse = (h: string) =>
		[1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16))
	const a = parse(hex)
	const b = parse(to)
	return `#${a
		.map((v, i) =>
			Math.round(v + (b[i] - v) * share)
				.toString(16)
				.padStart(2, '0'),
		)
		.join('')}`
}

/** Every colour in some markup, hazier: a row of things further off. */
const hazy = (markup: string, to: string, share: number) =>
	markup.replace(
		/fill="(#[0-9a-fA-F]{6})"/g,
		(_, c) => `fill="${mix(c, to, share)}"`,
	)

/**
 * Nearer: a forest of candy trees on a mint hillside, three rows of them
 * packed in, the further rows hazier: candyfloss trees, swirl lollipops,
 * spiral cones, toadstools, drooping gumdrop trees and corkscrews, every
 * colour. 1200 by 180, the hillside from 130 down.
 */
export const candyForest = (() => {
	const width = 1200
	const height = 180
	const random = seeded(6300)
	const kinds: Candy[] = ['pink', 'blue', 'yellow', 'lilac', 'mint', 'peach']
	const pick = () => kinds[Math.floor(random() * kinds.length)]
	const grow = (x: number, base: number, scale: number) => {
		const kind = Math.floor(random() * 6)
		const tall = even((58 + random() * 52) * scale)
		const a = pick()
		const b = pick()
		return tiled(width, x, (at) =>
			kind === 0
				? flossTree(at, base, tall, a)
				: kind === 1
					? swirlTree(at, base, tall, a, b)
					: kind === 2
						? coneTree(at, base, tall, a, b)
						: kind === 3
							? toadstoolTree(at, base, tall, a)
							: kind === 4
								? droopTree(at, base, tall, a)
								: corkscrewTree(at, base, tall, a),
		)
	}
	const row = (
		from: number,
		gap: [number, number],
		base: number,
		scale: number,
	) => {
		let out = ''
		for (
			let x = from;
			x < width;
			x += gap[0] + even(random() * (gap[1] - gap[0]))
		)
			out += grow(even(x), base + even(random() * 6), scale)
		return out
	}
	const SKY = '#efd8ff'
	const furthest = hazy(row(0, [26, 44], 118, 0.75), SKY, 0.45)
	const back = hazy(row(14, [34, 56], 128, 0.9), SKY, 0.22)
	const front = row(30, [52, 90], 150, 1)
	// The hillside: a mint hump here and there under the trees, lit on top.
	let hill = ''
	for (let x = 0; x < width; x += 2) {
		const top = even(
			126 +
				Math.sin((x / width) * Math.PI * 6) * 4 +
				Math.sin((x / width) * Math.PI * 14) * 2,
		)
		hill += rect(x, top, 2, height - top, '#a9eccf')
		hill += rect(x, top, 2, 2, '#d4fbe9')
	}
	return svgUrl(
		width,
		height,
		`${furthest}${back}${hill}${front}${rect(0, 160, width, 20, '#9be8c8')}`,
	)
})()

// --- Huddinge: deep in the forest --------------------------------------------------

interface PineColours {
	ground: string
	leaves: string
	lit: string
	shade: string
}

/** A pine: tiers of boughs, lit on the left, in shadow on the right, a stub of trunk under. */
function pine(x: number, base: number, tall: number, c: PineColours) {
	let body = rect(x - 1, base - 4, 2, 4, c.shade)
	const tiers = Math.max(3, Math.round(tall / 10))
	const tierTall = (tall - 4) / tiers
	for (let t = 0; t < tiers; t++) {
		const bottom = base - 4 - t * tierTall
		const half = (tall / 4) * (1 - t / tiers) + 2
		for (let y = even(bottom - tierTall * 1.4); y < bottom; y += 2) {
			const w = even(
				(half * (y - (bottom - tierTall * 1.4))) / (tierTall * 1.4),
			)
			if (w <= 0) continue
			body += rect(x - w, y, w, 2, c.lit)
			body += rect(x, y, w, 2, c.leaves)
			body += rect(x + w - 2, y, 2, 2, c.shade)
		}
	}
	body += rect(x - 1, base - tall - 2, 2, 4, c.lit)
	return body
}

/** A ridge of pines along a band, packed in, over the hillside they stand on. */
function pineRidge(options: {
	seed: number
	width: number
	height: number
	line: number
	tall: [number, number]
	gap: [number, number]
	colours: PineColours
}) {
	const { width, height, line, tall, gap, colours } = options
	const random = seeded(options.seed)
	const phases = [random(), random()].map((p) => p * Math.PI * 2)
	const top = (x: number) =>
		even(
			line +
				8 * Math.sin((Math.PI * 2 * 2 * x) / width + phases[0]) +
				4 * Math.sin((Math.PI * 2 * 5 * x) / width + phases[1]),
		)
	let ground = ''
	for (let x = 0; x < width; x += 2)
		ground += rect(x, top(x), 2, height - top(x), colours.ground)
	const trees: { x: number; tall: number; base: number }[] = []
	for (let x = 0; x < width; x += even(gap[0] + random() * (gap[1] - gap[0]))) {
		const t = even(tall[0] + random() * (tall[1] - tall[0]))
		trees.push({ x, tall: t, base: top(x) + 4 + even(random() * 6) })
	}
	// The ones further up the slope first, the nearer over them.
	trees.sort((a, b) => a.base - b.base)
	let body = ''
	for (const t of trees)
		body += tiled(width, t.x, (x) => pine(x, t.base, t.tall, colours))
	return svgUrl(width, height, ground + body)
}

/** A far ridge of pines over Huddinge's far hills: small, packed, blue-green in the haze. 960 by 100. */
export const pinesFar = pineRidge({
	seed: 6400,
	width: 960,
	height: 100,
	line: 62,
	tall: [16, 30],
	gap: [6, 12],
	colours: {
		ground: '#6f8f86',
		leaves: '#728f87',
		lit: '#86a39a',
		shade: '#5d7b72',
	},
})

/** A nearer wall of pines, dark and deep, over the middle hills. 960 by 120. */
export const pinesNear = pineRidge({
	seed: 6401,
	width: 960,
	height: 120,
	line: 76,
	tall: [34, 62],
	gap: [10, 20],
	colours: {
		ground: '#2f5233',
		leaves: '#365c3b',
		lit: '#4d7a4c',
		shade: '#24432a',
	},
})

// --- Kristineberg: far off behind the stadium ----------------------------------------

/**
 * Far off behind Kristinebergs IP, in the haze: wooded hills, and
 * Västerbron going over between them, its two great steel arches under its
 * deck, up over the flats' roofs. 1200 by 200, pale blue, its foot behind
 * the flats.
 */
export const kristinebergFar = (() => {
	const width = 1200
	const height = 200
	const random = seeded(6500)
	const hill = '#b4d0dc'
	const hillLit = '#c3dbe5'
	const steel = '#97b6c6'
	const top = (x: number) =>
		even(
			92 +
				10 * Math.sin((Math.PI * 2 * 3 * x) / width) +
				5 * Math.sin((Math.PI * 2 * 7 * x) / width + 1),
		)
	let body = ''
	for (let x = 0; x < width; x += 2) {
		// Treetops, bumpy along the hills' tops.
		const bump = even(Math.abs(Math.sin(x / 7 + random() * 0.2)) * 4)
		body += rect(x, top(x) - bump, 2, height - top(x) + bump, hill)
		body += rect(x, top(x) - bump, 2, 2, hillLit)
	}
	// Västerbron, over the water between two hills: its deck, its two
	// arches under it, and the uprights between.
	const from = 300
	const span = 520
	const deck = 70
	body += rect(from, deck, span, 4, steel)
	for (const [a, b] of [
		[from + 20, from + 260],
		[from + 260, from + span - 20],
	]) {
		const mid = (a + b) / 2
		const half = (b - a) / 2
		for (let x = a; x < b; x += 2) {
			const y = even(deck + 4 + 34 * ((x - mid) / half) ** 2)
			body += rect(x, y, 2, 4, steel)
			if ((x - a) % 24 === 0) body += rect(x, deck + 4, 2, y - deck - 4, steel)
		}
	}
	return svgUrl(width, height, body)
})()

// --- The Pyramids: dunes nearer -----------------------------------------------------

/**
 * Nearer than the pyramids: dunes, one ridge behind another, lit along
 * their crests and shaded down their lee sides, a palm here and there, and
 * the odd rock. 960 by 100; under the dunes, the field's sand.
 */
export const nearDunes = (() => {
	const width = 960
	const height = 100
	const random = seeded(6600)
	const ridges = [
		{
			line: 40,
			size: 14,
			cycles: 3,
			phase: 0.6,
			sand: '#ecc985',
			crest: '#f6dca5',
			lee: '#d9b06a',
		},
		{
			line: 62,
			size: 12,
			cycles: 4,
			phase: 2.1,
			sand: '#e6bd70',
			crest: '#f4d699',
			lee: '#d3a35a',
		},
	]
	let body = ''
	for (const r of ridges) {
		const at = (x: number) =>
			r.line +
			r.size * Math.sin((Math.PI * 2 * r.cycles * x) / width + r.phase) +
			(r.size / 3) * Math.sin((Math.PI * 2 * r.cycles * 3 * x) / width)
		for (let x = 0; x < width; x += 2) {
			const top = even(at(x))
			// Going down, past a crest: the lee side, in shadow.
			const lee = at(x + 2) > at(x)
			body += rect(x, top, 2, height - top, r.sand)
			body += rect(x, top, 2, 2, lee ? r.lee : r.crest)
			if (lee) body += rect(x, top + 2, 2, 4, r.lee)
		}
	}
	// A palm or two, far off on the dunes, and rocks.
	for (let n = 0; n < 4; n++) {
		const x = even(60 + random() * (width - 120))
		const base = 66 + even(random() * 10)
		body += tiled(width, x, (at) => {
			let palm = rect(at, base - 22, 2, 22, '#8a6a3a')
			palm += rect(at - 8, base - 24, 18, 2, '#4f9a3a')
			palm += rect(at - 6, base - 26, 14, 2, '#6fbf4f')
			palm += rect(at - 10, base - 22, 4, 2, '#4f9a3a')
			palm += rect(at + 8, base - 22, 4, 2, '#4f9a3a')
			return palm
		})
	}
	for (let n = 0; n < 6; n++) {
		const x = even(random() * width)
		const y = 72 + even(random() * 20)
		body += tiled(
			width,
			x,
			(at) => rect(at, y, 6, 4, '#c08a4a') + rect(at, y, 4, 2, '#e0b070'),
		)
	}
	return svgUrl(width, height, body)
})()
