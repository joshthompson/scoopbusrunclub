import { type PixelRect, paintedArt, pixelArt, svgUrl, tile } from './pixelArt'
import { seeded } from './seeded'

/**
 * Rocket Launch's alien planet: its horizon under a green sky, the rocket
 * that crashed here long ago, its plants and crystals, a friendly alien,
 * its rocks, and its geysers' size (they're painted in `draw/space.tsx`).
 * Horizons are in screen pixels, 2-px steps; the rest is drawn at a cell a
 * pixel, so its `Scenery` takes `scale: 2`.
 */

const W = 960
const H = 160
const even = (n: number) => Math.round(n / 2) * 2
const TAU = Math.PI * 2

type Rect = (x: number, y: number, w: number, h: number, fill: string) => void

/**
 * A band being drawn: its rects, each again a band's width along wherever
 * it runs off either edge, so the band wraps.
 */
function band() {
	let out = ''
	const rect: Rect = (x, y, w, h, fill) => {
		if (w <= 0 || h <= 0) return
		for (const at of [x, x - W, x + W])
			if (at + w > 0 && at < W)
				out += `<rect x="${at}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`
	}
	return { rect, url: () => svgUrl(W, H, out) }
}

/** A rolling ridge's height at `x`: whole cycles across the band, so it wraps. */
const ridge = (
	x: number,
	base: number,
	waves: [cycles: number, height: number, phase: number][],
) =>
	even(
		base +
			waves.reduce(
				(sum, [n, h, p]) => sum + h * Math.sin((TAU * n * x) / W + p),
				0,
			),
	)

/** Something round, its middle at `cx`, `cy`, stepped: a moon. */
function blob(rect: Rect, cx: number, cy: number, r: number, fill: string) {
	for (let dy = -r; dy < r; dy += 2) {
		const half = even(Math.sqrt(Math.max(0, r * r - (dy + 1) ** 2)))
		rect(cx - half, cy + dy, half * 2, 2, fill)
	}
}

/** A dome, its foot at `base`, `r` across each way from `cx`: lit along its top. */
function dome(
	rect: Rect,
	cx: number,
	base: number,
	r: number,
	fill: string,
	lit: string,
	flat = 1,
) {
	for (let up = 0; up < r / flat; up += 2) {
		const half = even(Math.sqrt(Math.max(0, r * r - (up * flat + 1) ** 2)))
		rect(cx - half, base - up - 2, half * 2, 2, up >= r / flat - 4 ? lit : fill)
	}
}

/** A spire, tapering in 2-px steps from `w` wide at `base` to a point at `top`: its left side lit. */
function spire(
	rect: Rect,
	cx: number,
	base: number,
	top: number,
	w: number,
	fill: string,
	lit?: string,
) {
	const rows = (base - top) / 2
	for (let i = 0; i < rows; i++) {
		const half = Math.max(2, even((w / 2) * (1 - i / rows)))
		const y = base - 2 * (i + 1)
		rect(cx - half, y, half * 2, 2, fill)
		if (lit) rect(cx - half, y, Math.min(2, half), 2, lit)
	}
}

/** A mesa: flat topped, its sides stepping out in tiers as they come down, its top lit. */
function mesa(
	rect: Rect,
	x: number,
	base: number,
	w: number,
	top: number,
	fill: string,
	lit: string,
	shade?: string,
) {
	const tiers = Math.max(1, Math.floor((base - top) / 14))
	const tierH = (base - top) / tiers
	for (let t = 0; t < tiers; t++) {
		const y = even(top + t * tierH)
		const out = (tiers - 1 - t) * -2 + t * 4
		const left = x - out
		const width = w + out * 2
		rect(left, y, width, base - y, fill)
		rect(left, y, width, 2, lit)
		if (shade) rect(left + width - 4, y + 2, 4, base - y - 2, shade)
	}
}

/** A giant mushroom: a stalk and a wide cap, `glow` studding its underside. */
function mushroom(
	rect: Rect,
	cx: number,
	base: number,
	h: number,
	capR: number,
	fill: string,
	lit: string,
	under: string,
	spot?: string,
) {
	const stalk = capR >= 20 ? 8 : 6
	rect(cx - stalk / 2, base - h, stalk, h, under)
	rect(cx - stalk / 2, base - h, 2, h, fill)
	dome(rect, cx, base - h + 4, capR, fill, lit, 2)
	rect(cx - capR + 2, base - h + 2, capR * 2 - 4, 2, under)
	if (spot) {
		rect(cx - 6, base - h - 6, 4, 2, spot)
		rect(cx + 4, base - h - 4, 2, 2, spot)
	}
}

/** A crystal tower: a tall prism with a pointed head, a short one leaning beside it. */
function crystalTower(
	rect: Rect,
	cx: number,
	base: number,
	h: number,
	w: number,
	fill: string,
	lit: string,
) {
	rect(cx - w / 2, base - h + 10, w, h - 10, fill)
	rect(cx - w / 2, base - h + 10, 2, h - 10, lit)
	spire(rect, cx, base - h + 10, base - h, w, fill, lit)
	const w2 = Math.max(4, w - 4)
	const h2 = Math.floor(h * 0.55)
	rect(cx + w / 2 + 2, base - h2 + 8, w2, h2 - 8, fill)
	spire(rect, cx + w / 2 + 2 + w2 / 2, base - h2 + 8, base - h2, w2, fill, lit)
}

// --- The horizon -----------------------------------------------------------------

/**
 * Far off, hazy and blue-lilac: mesas, thin spires, giant mushrooms and a
 * few crystal towers along a low ridge; in the sky above them a big pale
 * moon and a small orange one, a few stars, and two shooting stars.
 */
export const PLANET_FAR = (() => {
	const random = seeded(9047)
	const { rect, url } = band()
	const ROCK = '#8a97c9'
	const LIT = '#a6b3dc'
	const SHADE = '#7a86b8'
	const CAP = '#9aa5d6'

	// The moons, behind everything.
	blob(rect, 716, 52, 30, '#e8f0f8')
	for (const [x, y, w, h] of [
		[696, 42, 8, 6],
		[722, 58, 10, 6],
		[708, 66, 4, 4],
		[728, 38, 4, 4],
	])
		rect(x, y, w, h, '#c5d2e4')
	rect(694, 50, 2, 8, '#f8fcff')
	blob(rect, 226, 60, 12, '#f0cfa8')
	rect(220, 56, 4, 4, '#d8ae88')
	rect(222, 50, 6, 2, '#fae6cc')

	// Stars and shooting stars, in the dark top of the sky.
	for (const [x, y] of [
		[40, 8],
		[120, 22],
		[330, 10],
		[420, 28],
		[560, 14],
		[880, 26],
		[620, 34],
		[790, 6],
		[500, 40],
	])
		rect(x, y, 2, 2, '#e6f2ee')
	for (const [x, y] of [
		[470, 18],
		[130, 46],
	]) {
		for (let i = 0; i < 6; i++)
			rect(
				x - i * 4,
				y - i * 2,
				4,
				2,
				i === 0 ? '#ffffff' : i < 3 ? '#cdeedd' : '#8fc4b4',
			)
	}

	// The low ridge all along.
	for (let x = 0; x < W; x += 4) {
		const top = ridge(x, 124, [
			[4, 5, 0.4],
			[9, 3, 2],
		])
		rect(x, top, 4, H - top, ROCK)
		rect(x, top, 4, 2, LIT)
	}

	// What stands on it.
	const kinds = ['mesa', 'spire', 'mushroom', 'crystal', 'mesa', 'spire']
	for (let x = 14, i = 0; x < W - 50; i++) {
		const kind = kinds[i % kinds.length]
		const base = 132
		if (kind === 'mesa') {
			const w = even(26 + random() * 26)
			mesa(rect, x, base, w, base - even(44 + random() * 30), ROCK, LIT, SHADE)
			x += w + even(34 + random() * 40)
		} else if (kind === 'spire') {
			const h = even(66 + random() * 40)
			spire(rect, x + 8, base, base - h, 18, ROCK, LIT)
			if (random() < 0.6)
				spire(rect, x + 22, base, base - h * 0.6, 10, ROCK, LIT)
			x += even(48 + random() * 30)
		} else if (kind === 'mushroom') {
			const r = even(20 + random() * 10)
			mushroom(rect, x + r, base, even(44 + random() * 20), r, CAP, LIT, ROCK)
			x += r * 2 + even(30 + random() * 34)
		} else {
			crystalTower(
				rect,
				x + 6,
				base,
				even(48 + random() * 24),
				10,
				'#9aa0d8',
				'#bcc2ee',
			)
			x += even(46 + random() * 26)
		}
	}
	return url()
})()

export const PLANET_FILL = '#5d3f86'

/**
 * Nearer, a darker purple: a ridge with big craters worn into it, a stone
 * arch, balanced rocks, pitted spires and great mushrooms, their caps
 * glowing teal underneath here and there.
 */
export const PLANET_NEAR = (() => {
	const random = seeded(3311)
	const { rect, url } = band()
	const ROCK = PLANET_FILL
	const LIT = '#7a5aa8'
	const SHADE = '#4a3270'
	const GLOW = '#6cf0c0'

	// Its ridge.
	const top = (x: number) =>
		ridge(x, 118, [
			[3, 6, 1],
			[8, 4, 0.2],
			[13, 2, 3],
		])
	for (let x = 0; x < W; x += 2) {
		const t = top(x)
		rect(x, t, 2, H - t, ROCK)
		rect(x, t, 2, 2, LIT)
		if (top(x + 2) > t + 1) rect(x, t + 2, 2, 4, SHADE)
	}

	// Craters, worn into the ridge: a dark bowl and a lit rim.
	for (const [cx, w] of [
		[110, 40],
		[470, 56],
		[800, 34],
	]) {
		const t = top(cx)
		rect(cx - w / 2, t, w, 2, LIT)
		rect(cx - w / 2 + 4, t + 2, w - 8, 6, SHADE)
		rect(cx - w / 2 + 8, t + 8, w - 16, 2, SHADE)
		rect(cx - w / 2 + 6, t + 2, 4, 2, ROCK)
	}

	// A stone arch.
	{
		const x = 300
		const b = top(x) + 6
		rect(x, b - 38, 10, 38, ROCK)
		rect(x, b - 38, 2, 38, LIT)
		rect(x + 34, b - 30, 10, 30, ROCK)
		rect(x + 34, b - 30, 2, 30, LIT)
		rect(x - 4, b - 46, 54, 12, ROCK)
		rect(x - 4, b - 46, 54, 2, LIT)
		rect(x + 10, b - 34, 24, 4, ROCK)
		rect(x + 10, b - 34, 24, 2, SHADE)
		rect(x + 40, b - 36, 6, 6, ROCK)
	}

	// A balanced rock: a stalk of stone under a wide, flat boulder.
	for (const x of [620, 900]) {
		const b = top(x) + 4
		rect(x - 5, b - 26, 10, 26, ROCK)
		rect(x - 5, b - 26, 2, 26, LIT)
		rect(x - 18, b - 38, 36, 12, ROCK)
		rect(x - 18, b - 38, 36, 2, LIT)
		rect(x + 12, b - 36, 6, 10, SHADE)
	}

	// Pitted spires and great mushrooms.
	for (const [x, kind] of [
		[40, 'mushroom'],
		[190, 'spire'],
		[400, 'mushroom'],
		[540, 'spire'],
		[700, 'mushroom'],
		[780, 'spire'],
	] as const) {
		const b = top(x) + 6
		if (kind === 'spire') {
			const h = even(40 + random() * 24)
			spire(rect, x, b, b - h, 16, ROCK, LIT)
			rect(x + 2, b - h * 0.5, 4, 4, SHADE)
			rect(x - 4, b - h * 0.3, 2, 4, SHADE)
		} else {
			const r = even(20 + random() * 8)
			const h = even(34 + random() * 12)
			mushroom(rect, x, b, h, r, ROCK, LIT, SHADE, '#8a68b8')
			rect(x - r + 6, b - h + 4, 2, 2, GLOW)
			rect(x + 2, b - h + 4, 2, 2, GLOW)
			rect(x + r - 8, b - h + 4, 2, 2, GLOW)
		}
	}
	return url()
})()

/**
 * The nearest, the planet's own dust, dune after dune, their crests lit and
 * the slopes away from the light shaded; shallow craters, stones, and
 * little crystals coming up here and there. Its colour goes on down.
 */
export const PLANET_DUST = '#8d6fb3'
export const PLANET_NEARER = (() => {
	const random = seeded(7788)
	const { rect, url } = band()
	const LIT = '#a283c4'
	const SHADE = '#7b5ca0'
	const STONE = '#6e5496'
	const top = (x: number) =>
		ridge(x, 124, [
			[3, 8, 0.5],
			[7, 5, 2.4],
			[12, 2, 1],
		])
	for (let x = 0; x < W; x += 2) {
		const t = top(x)
		rect(x, t, 2, H - t, PLANET_DUST)
		rect(x, t, 2, 2, LIT)
		if (top(x + 2) > t + 1) rect(x, t + 2, 2, 6, SHADE)
		else if (top(x + 2) < t - 1) rect(x, t + 2, 2, 2, LIT)
	}
	// Shallow craters in the dust, their far rim lit.
	for (const [cx, w] of [
		[150, 44],
		[520, 60],
		[860, 40],
	]) {
		const t = top(cx)
		rect(cx - w / 2, t + 6, w, 2, LIT)
		rect(cx - w / 2 + 4, t + 8, w - 8, 4, SHADE)
		rect(cx - w / 2 + 8, t + 12, w - 16, 2, SHADE)
	}
	// Stones.
	for (let i = 0; i < 14; i++) {
		const x = even(random() * W)
		const t = top(x)
		const w = even(6 + random() * 10)
		rect(x, t - 4, w, 6, STONE)
		rect(x, t - 6, w - 2, 2, '#8a6fb0')
		rect(x + w - 2, t - 2, 2, 4, '#5a4280')
	}
	// Little crystals, coming up out of it.
	for (const x of [70, 250, 420, 600, 760, 930]) {
		const t = top(x)
		spire(rect, x, t + 2, t - 14, 6, '#d070e0', '#f0a0f4')
		spire(rect, x + 8, t + 2, t - 8, 4, '#b050c8', '#d890ec')
	}
	return url()
})()

/** The sky: dark above, green down to the horizon. */
export const PLANET_SKY: [string, string] = ['#1b2d4a', '#6cc7a4']

// --- The crashed rocket -----------------------------------------------------------

const HULL = '#c9c3bb'
const HULL_LIT = '#e4ded4'
const HULL_SHADE = '#8f877f'
const RUST = '#a4572f'
const RUST_DARK = '#6e3a22'
const PORT = '#3b4a6b'

/** A small repeatable noise for a cell, 0 to 1. */
const noise = (x: number, y: number, seed = 0) => {
	const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453
	return n - Math.floor(n)
}

/**
 * A rocket that crashed here long ago, nose down in the dust and leaning
 * over, its tail in the air: its white hull gone dull, rusted through in
 * streaks and dented, one finned side up, a porthole, a banded ring or
 * two, its engine bell dark. Dust has drifted up round its nose, and a
 * panel and stones lie about. 110 by 70 cells.
 */
export const crashedRocket = (() => {
	const theta = 0.43
	const dx = Math.sin(theta)
	const dy = -Math.cos(theta)
	const nx = Math.cos(theta)
	const ny = Math.sin(theta)
	const NOSE = [34, 66]
	const LEN = 62
	const R = 9
	const mound = (x: number, y: number) =>
		((x - 36) / 26) ** 2 + ((y - 68) / 10) ** 2
	return paintedArt(110, 70, (x, y) => {
		const vx = x - NOSE[0]
		const vy = y - NOSE[1]
		const t = vx * dx + vy * dy
		const s = vx * nx + vy * ny
		let colour: string | undefined

		// The hull's width at `t` along it.
		let r = -1
		if (t >= 0 && t < 24) r = R * Math.sqrt(1 - (1 - t / 24) ** 2)
		else if (t >= 24 && t < LEN - 6) r = R
		else if (t >= LEN - 6 && t < LEN) r = 6
		// Fins, swept out from the tail.
		const fin =
			t >= 40 &&
			t < 60 &&
			Math.abs(s) > R - 1 &&
			Math.abs(s) < R + (t - 38) * 0.55 &&
			Math.abs(s) < R + 9 - (60 - t) * 0.0
		if (r >= 0 && Math.abs(s) < r) {
			if (t > LEN - 6)
				colour = Math.abs(s) < 3 && t > LEN - 3 ? '#1d1d1d' : '#4a3c34'
			else {
				colour = s < -4 ? HULL_LIT : s > 3 ? HULL_SHADE : HULL
				// The nose cone, painted rusty red where it's not been scoured.
				if (t < 12) colour = s < -3 ? '#c8683c' : s > 2 ? RUST_DARK : RUST
				// Banded rings.
				if ((t >= 26 && t < 28) || (t >= 52 && t < 54)) colour = RUST_DARK
				// Rust streaks running down from the rings, and patches.
				const n = noise(Math.floor(x / 3), Math.floor(y / 3))
				if (t >= 12 && n < 0.2 && s > -7) colour = s > 3 ? RUST_DARK : RUST
				if (t >= 28 && t < 36 && Math.abs(s - 3) < 1.5) colour = RUST
				// A porthole.
				const px = s + 1
				const py = t - 40
				if (px * px + py * py < 6.5) colour = PORT
				else if (px * px + py * py < 11) colour = HULL_SHADE
				if (px * px + py * py < 6.5 && px < 0 && py < 0) colour = '#6f86b4'
				// A dent, torn open to the dark inside.
				const hx = s - 4
				const hy = t - 49
				if (hx * hx * 1.6 + hy * hy < 6) colour = '#2b2236'
			}
		} else if (fin) {
			colour = s < 0 ? '#b0a89e' : '#7a7068'
			if (noise(Math.floor(x / 2), Math.floor(y / 2), 3) < 0.3) colour = RUST
		}

		// Dust drifted up round its nose, lit along its top.
		const m = mound(x, y)
		if (m < 1 && y >= 56 + noise(Math.floor(x / 2), 1) * 2) {
			colour = y < 60 ? '#b392c9' : m > 0.6 ? '#6c5499' : '#8d6fb3'
			if (y < 58 + noise(Math.floor(x / 2), 1) * 2) colour = '#d2b6e2'
		}
		// The dust spreading out beside it.
		if (y >= 66 && x > 6 && x < 104 && !colour) {
			const edge = 66 + noise(Math.floor(x / 2), 5) * 3
			if (y >= edge) colour = y === Math.floor(edge) ? '#b392c9' : '#8d6fb3'
		}
		// A torn panel lying on its side, and stones.
		if (y >= 62 && y < 66 && x >= 70 && x < 90 && y - 62 > (x - 70) * 0.05)
			colour = y === 62 ? HULL_LIT : HULL_SHADE
		if (y >= 64 && y < 66 && x >= 78 && x < 82) colour = RUST
		for (const [sx, sy, sw, sh] of [
			[48, 64, 6, 4],
			[96, 64, 6, 4],
			[10, 65, 4, 3],
		])
			if (x >= sx && x < sx + sw && y >= sy && y < sy + sh)
				colour = y === sy ? '#8a6fb0' : '#6e5496'
		return colour
	})
})()

// --- Plants, crystals, the alien, rocks ---------------------------------------------

/** A shard of crystal: `w` wide (even), `h` tall, its left lit, its right shaded. */
function shard(
	x: number,
	base: number,
	w: number,
	h: number,
	fill: string,
	lit: string,
	shade: string,
): PixelRect[] {
	const rects: PixelRect[] = []
	const tip = w / 2
	const top = base - h
	rects.push([x, top + tip, w, h - tip, fill])
	rects.push([x, top + tip, 2, h - tip, lit])
	rects.push([x + w - 2, top + tip, 2, h - tip, shade])
	for (let i = 0; i < tip; i++) {
		const half = i + 1
		const cx = x + w / 2
		rects.push([cx - half, top + i, half * 2, 1, fill])
		rects.push([cx - half, top + i, 1, 1, lit])
		if (half > 1) rects.push([cx + half - 1, top + i, 1, 1, shade])
	}
	return rects
}

/**
 * A spiny cactus, blue-green and ribbed, two arms up, creamy spines in
 * rows and a pink flower on its crown. 20 by 34 cells.
 */
export const spineCactus = (() => {
	const BASE = '#3f9bb8'
	const LIT = '#6fd0e0'
	const SHADE = '#2a6e8f'
	const SPINE = '#f4efc0'
	const FLOWER = '#ff7ac8'
	return pixelArt(20, 34, [
		// Its left arm, out and up.
		[2, 10, 4, 12, BASE],
		[2, 10, 1, 12, LIT],
		[5, 10, 1, 12, SHADE],
		[3, 8, 2, 2, BASE],
		[3, 8, 1, 2, LIT],
		[5, 17, 3, 5, BASE],
		[7, 19, 1, 3, SHADE],
		// Its right arm.
		[15, 6, 4, 12, BASE],
		[15, 6, 1, 12, LIT],
		[18, 6, 1, 12, SHADE],
		[16, 4, 2, 2, BASE],
		[16, 4, 1, 2, LIT],
		[12, 13, 4, 5, BASE],
		[12, 13, 1, 1, LIT],
		[12, 17, 1, 1, SHADE],
		// Its trunk, rounded at the top.
		[8, 4, 4, 2, BASE],
		[7, 6, 6, 28, BASE],
		[7, 6, 2, 28, LIT],
		[11, 6, 2, 28, SHADE],
		[9, 6, 1, 28, BASE],
		[7, 32, 6, 2, SHADE],
		// Its spines.
		...[10, 14, 18, 22, 26, 30].map((y): PixelRect => [8, y, 1, 1, SPINE]),
		...[12, 16, 20, 24, 28].map((y): PixelRect => [12, y, 1, 1, SPINE]),
		[3, 14, 1, 1, SPINE],
		[3, 18, 1, 1, SPINE],
		[17, 10, 1, 1, SPINE],
		[17, 14, 1, 1, SPINE],
		// Its flower.
		[8, 1, 4, 3, FLOWER],
		[9, 0, 2, 1, FLOWER],
		[10, 2, 1, 1, '#ffd0ec'],
	])
})()

/**
 * A cluster of crystals growing out of the dust, five shards leaning
 * together, magenta, lit on the left and glinting. 26 by 22 cells.
 */
export const crystals = (() => {
	const BASE = '#c04ccc'
	const LIT = '#f09af4'
	const SHADE = '#7e2a96'
	const DEEP = '#a43cb8'
	return pixelArt(26, 22, [
		...shard(2, 22, 6, 12, DEEP, LIT, SHADE),
		...shard(18, 22, 6, 10, DEEP, LIT, SHADE),
		...shard(12, 22, 8, 18, BASE, LIT, SHADE),
		...shard(6, 22, 8, 22, BASE, LIT, SHADE),
		...shard(14, 22, 4, 12, BASE, LIT, SHADE),
		// Glints.
		[9, 6, 1, 3, '#fbe0fc'],
		[9, 5, 1, 1, '#fbe0fc'],
		[15, 7, 1, 2, '#fbe0fc'],
		[3, 15, 1, 2, '#fbe0fc'],
		// Dust round their feet.
		[0, 21, 26, 1, '#8d6fb3'],
		[2, 20, 4, 1, '#b392c9'],
		[20, 20, 4, 1, '#b392c9'],
	])
})()

/**
 * A bulb plant: a curved green stalk with two leaves, and a big bulb that
 * glows lime on top, freckled with yellow. 18 by 30 cells.
 */
export const bulbPlant = (() => {
	const STALK = '#5fa83a'
	const STALK_SHADE = '#4a8a30'
	const BULB = '#9be35a'
	const LIT = '#d4f78a'
	const SHADE = '#6fb842'
	const SPOT = '#f6e45a'
	const inBulb = (x: number, y: number) =>
		((x - 9) / 8) ** 2 + ((y - 8) / 8) ** 2 < 1
	return paintedArt(18, 30, (x, y) => {
		let colour: string | undefined
		// Its stalk, curving a little, and its leaves.
		if (y >= 14 && y < 30) {
			const bend = Math.round(Math.sin((y - 14) / 5) * 1.2)
			if (x >= 8 + bend && x < 11 + bend)
				colour = x < 9 + bend ? STALK : STALK_SHADE
		}
		// Left leaf, long and drooping; right leaf, short.
		if (
			y >= 22 &&
			y < 26 &&
			x >= 2 + (y - 22) &&
			x < 8 &&
			y - 22 <= (8 - x) * 0.7
		)
			colour = STALK
		if (y >= 21 && y < 25 && x >= 12 && x < 17 - (y - 21)) colour = STALK_SHADE
		if (y >= 28 && x >= 5 && x < 14) colour = '#8d6fb3'
		// Its bulb.
		if (inBulb(x, y)) {
			colour = BULB
			if (!inBulb(x - 2, y - 2)) colour = LIT
			else if (!inBulb(x + 2, y + 2)) colour = SHADE
			if (!inBulb(x + 1, y + 3)) colour = SHADE
		}
		// Its freckles and a glint.
		for (const [sx, sy] of [
			[11, 6],
			[7, 10],
			[12, 11],
		])
			if (x >= sx && x < sx + 2 && y >= sy && y < sy + 2) colour = SPOT
		if (x >= 6 && x < 8 && y >= 4 && y < 5) colour = '#f4ffd0'
		// Its bulb's collar.
		if (y >= 14 && y < 16 && x >= 7 && x < 12) colour = STALK_SHADE
		return colour
	})
})()

/**
 * A friendly little alien, waving: a big green head with two big dark eyes,
 * a smile and an antenna with a pink bulb; a blue tunic, one arm raised.
 * 18 by 26 cells.
 */
export const wavingAlien = (() => {
	const SKIN = '#8fe07a'
	const LIT = '#b8f2a0'
	const SHADE = '#5fb85a'
	const EYE = '#1d1d1d'
	const TUNIC = '#6a8fe0'
	const TUNIC_LIT = '#8fb0f0'
	const TUNIC_SHADE = '#4a69b8'
	return pixelArt(18, 26, [
		// Its antenna.
		[8, 3, 1, 3, SHADE],
		[7, 0, 3, 3, '#ff7ac8'],
		[7, 0, 1, 1, '#ffd0ec'],
		// Its head, wide at the cheeks.
		[4, 5, 10, 1, SKIN],
		[3, 6, 12, 7, SKIN],
		[4, 13, 10, 1, SHADE],
		[5, 14, 8, 1, SHADE],
		[4, 5, 5, 1, LIT],
		[3, 6, 1, 3, LIT],
		[14, 7, 1, 5, SHADE],
		// Its eyes, big and dark, each with a glint.
		[4, 8, 4, 4, EYE],
		[10, 8, 4, 4, EYE],
		[5, 8, 1, 1, '#ffffff'],
		[11, 8, 1, 1, '#ffffff'],
		// Its smile.
		[6, 13, 1, 1, '#2f6b3a'],
		[7, 14, 4, 1, '#2f6b3a'],
		[11, 13, 1, 1, '#2f6b3a'],
		// Its tunic and its belt.
		[5, 15, 8, 7, TUNIC],
		[5, 15, 2, 7, TUNIC_LIT],
		[11, 15, 2, 7, TUNIC_SHADE],
		[5, 19, 8, 1, '#f6e45a'],
		// Its arm raised, waving, a hand of three fingers.
		[3, 15, 2, 2, SKIN],
		[2, 12, 2, 4, SKIN],
		[1, 8, 1, 3, LIT],
		[2, 9, 1, 3, SKIN],
		[3, 8, 1, 4, SKIN],
		[1, 11, 3, 1, SKIN],
		// Its other arm, down at its side.
		[13, 16, 2, 5, SKIN],
		[14, 16, 1, 5, SHADE],
		// Its legs and feet.
		[6, 22, 2, 2, SKIN],
		[10, 22, 2, 2, SHADE],
		[5, 24, 4, 2, SKIN],
		[9, 24, 4, 2, SHADE],
	])
})()

/**
 * A planet rock, to jump: a squat boulder of purple stone, lit on its top,
 * pitted with little craters, a lump on its right side. 22 by 15 cells.
 */
export const PLANET_ROCK = (() => {
	const BASE = '#6e5496'
	const LIT = '#9a7cc4'
	const SHADE = '#4a3670'
	const PIT = '#3d2b5e'
	const inside = (x: number, y: number) =>
		((x - 10) / 10.5) ** 2 + ((y - 15) / 14) ** 2 < 1 ||
		((x - 17) / 5.5) ** 2 + ((y - 15) / 8) ** 2 < 1
	const pits: [number, number, number, number][] = [
		[7, 7, 3, 2],
		[13, 5, 2, 2],
		[16, 10, 3, 2],
		[5, 11, 2, 1],
	]
	const inPit = (x: number, y: number, [cx, cy, rx, ry]: number[]) =>
		((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1
	return {
		asset: paintedArt(22, 15, (x, y) => {
			if (!inside(x, y)) return undefined
			let colour = BASE
			if (!inside(x, y - 2) || !inside(x - 2, y - 1)) colour = LIT
			else if (!inside(x + 2, y) || y >= 13) colour = SHADE
			for (const pit of pits) {
				if (inPit(x, y, pit)) colour = PIT
				else if (inPit(x, y - 1.2, pit)) colour = SHADE
				else if (inPit(x, y + 1.2, pit) && colour === BASE) colour = LIT
			}
			return colour
		}),
		width: 44,
		height: 30,
	}
})()

/** A geyser: a vent in the crust, steaming, occasionally blasting up. */
export const GEYSER = { width: 48, height: 18 }

// --- The ground ---------------------------------------------------------------------

/**
 * The dust under the path, over `#5d4580`: strata, faint bands of darker and
 * paler sediment running along it, the odd pit with a lit lip, pebbles
 * each with a shadow, and occasionally a glint of crystal set in it.
 * See-through, so its colour shows. 96 by 64 px.
 */
export const PLANET_UNDER = (() => {
	const W = 96
	const H = 64
	const t = tile(W, H)
	const random = seeded(5521)
	const DARK = 'rgba(32, 16, 64, 0.2)'
	const PALE = 'rgba(190, 150, 230, 0.12)'
	const PEBBLE = 'rgba(190, 150, 230, 0.22)'
	const SHADOW = 'rgba(32, 16, 64, 0.26)'
	const GLINT = 'rgba(240, 150, 244, 0.5)'
	// Strata: a band's dark line, a pale one below it, broken here and there.
	for (const y of [8, 26, 44]) {
		for (let x = 0; x < W; x += 2) {
			const wobble = Math.round(Math.sin((x / W) * Math.PI * 2 + y) * 1) * 2
			if (random() < 0.8) t.rect(x, y + wobble, 2, 2, DARK)
			if (random() < 0.55) t.rect(x, y + wobble + 2, 2, 2, PALE)
		}
	}
	// Pits: a dark hollow under a lit lip.
	for (const [x, y, w] of [
		[14, 34, 8],
		[66, 14, 6],
		[48, 54, 6],
	]) {
		t.rect(x, y, w, 2, PEBBLE)
		t.rect(x + 2, y + 2, w - 2, 2, SHADOW)
	}
	// Pebbles, a pale top and a shadow beneath.
	for (const [x, y, w] of [
		[30, 4, 4],
		[78, 36, 4],
		[6, 16, 2],
		[58, 30, 4],
		[84, 58, 2],
		[26, 58, 4],
		[88, 2, 2],
	]) {
		t.rect(x, y, w, 2, PEBBLE)
		t.rect(x + 2, y + 2, w, 2, SHADOW)
	}
	// Crystal set in the dust.
	for (const [x, y] of [
		[40, 18],
		[8, 50],
	]) {
		t.rect(x, y, 2, 2, GLINT)
		t.rect(x + 2, y - 2, 2, 2, 'rgba(255, 255, 255, 0.4)')
	}
	return t.pattern('rl-dust-under')
})()

/**
 * The path itself, over `#b392c9`: pocks where feet and wheels have come
 * down, a soft shadow each side, stray pebbles and the faintest ripples
 * where the dust has blown. See-through. 96 by 48 px.
 */
export const PLANET_PATH = (() => {
	const W = 96
	const H = 48
	const t = tile(W, H)
	const SHADOW = 'rgba(93, 69, 128, 0.2)'
	const LIT = 'rgba(255, 255, 255, 0.18)'
	const PEBBLE = 'rgba(93, 69, 128, 0.3)'
	// Footprint-ish pocks: a dent with its far lip lit.
	for (const [x, y] of [
		[8, 10],
		[50, 6],
		[30, 34],
		[74, 28],
	]) {
		t.rect(x, y, 6, 2, LIT)
		t.rect(x, y + 2, 6, 2, SHADOW)
		t.rect(x + 2, y + 4, 2, 2, SHADOW)
	}
	// Ripples in the blown dust.
	for (const [x, y, w] of [
		[40, 20, 12],
		[4, 40, 10],
		[66, 44, 10],
		[78, 4, 8],
	]) {
		t.rect(x, y, w, 2, LIT)
		t.rect(x + 2, y + 2, w - 4, 2, SHADOW)
	}
	// Pebbles.
	for (const [x, y] of [
		[20, 22],
		[60, 16],
		[88, 36],
		[36, 2],
	]) {
		t.rect(x, y, 2, 2, PEBBLE)
		t.rect(x, y - 2, 2, 2, LIT)
	}
	return t.pattern('rl-dust-path')
})()

// --- More scenery -----------------------------------------------------------------

/** `paintedArt`, asked about whole cells: x and y are the cell's column and row. */
const cellArt = (
	w: number,
	h: number,
	paint: (x: number, y: number) => string | undefined,
) => paintedArt(w, h, (x, y) => paint(Math.floor(x), Math.floor(y)))

type Shape = (x: number, y: number) => boolean
const ellipse =
	(cx: number, cy: number, rx: number, ry: number): Shape =>
	(x, y) =>
		((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 < 1

const DUST = '#8d6fb3'
const DUST_LIT = '#b392c9'

/**
 * The ribcage and skull of some huge beast, half buried in the dust: eight
 * ribs standing up like arches, a run of vertebrae trailing off to the left,
 * and a long skull with a horn, an empty eye and a row of teeth. Bone-pale,
 * dusted purple where it's sunk. 90 by 40 cells.
 */
export const giantBones = (() => {
	const BONE = '#e6dcc2'
	const LIT = '#f6efdc'
	const SHADE = '#b3a687'
	const DEEP = '#7d7058'
	const skull = ellipse(74, 27, 14, 9)
	const socket = ellipse(70, 23, 3.2, 3)
	const ribs = [8, 17, 26, 35, 44, 53].map((cx, i) => ({
		cx,
		ry: [14, 22, 28, 28, 23, 15][i],
		rx: 6,
	}))
	return cellArt(90, 40, (x, y) => {
		let colour: string | undefined
		// Its ribs: a ring of bone, the outer edge lit, the inner shaded.
		for (const { cx, ry, rx } of ribs) {
			const outer = ellipse(cx, 36, rx, ry)
			const inner = ellipse(cx, 36, rx - 3, ry - 3)
			if (outer(x, y) && !inner(x, y) && y < 36) {
				colour = BONE
				if (!outer(x - 1, y - 1)) colour = LIT
				else if (x > cx) colour = SHADE
			}
		}
		// Its vertebrae along the ground, to the left and beneath the ribs.
		if (y >= 33 && y < 36 && x >= 0 && x < 60 && x % 5 < 3) {
			colour = y === 33 ? LIT : y === 35 ? SHADE : BONE
		}
		// Its skull.
		if (
			skull(x, y) ||
			(x >= 80 && x < 90 && y >= 26 && y < 34 + (x > 86 ? -1 : 0))
		)
			colour = !skull(x, y - 2) && y < 26 ? LIT : y >= 31 ? SHADE : BONE
		// Its horn, curving up and back.
		for (const [hx, hy, hw] of [
			[64, 17, 4],
			[62, 13, 3],
			[60, 9, 2],
			[59, 6, 2],
		])
			if (x >= hx && x < hx + hw && y >= hy && y < hy + 4)
				colour = x === hx ? LIT : BONE
		// Its eye socket, its nostril, a crack.
		if (socket(x, y)) colour = DEEP
		if (x >= 86 && x < 88 && y >= 28 && y < 30) colour = DEEP
		if (x >= 74 && x < 75 && y >= 19 && y < 24) colour = SHADE
		// Its teeth, a row along the jaw.
		if (y >= 34 && y < 36 && x >= 70 && x < 90 && x % 3 !== 2) colour = LIT
		// The dust sunk round all of it.
		const edge = 35 + Math.round(noise(Math.floor(x / 2), 9) * 2)
		if (y >= edge && !(y >= 34 && y < 36 && x >= 70 && x < 90 && x % 3 !== 2))
			colour = y === edge ? DUST_LIT : DUST
		if (x >= 62 && x < 90 && y >= 33 && y < 36 && colour === SHADE && y > 34)
			colour = DUST
		return colour
	})
})()

/**
 * A flying saucer, parked on three legs: a grey disc with a row of coloured
 * lights round its rim, a teal glass dome, an aerial, and a hatch open
 * underneath, warm light spilling out and down a ramp onto the dust.
 * 80 by 40 cells.
 */
export const landedSaucer = (() => {
	const METAL = '#aab4c8'
	const LIT = '#d4dcec'
	const SHADE = '#6f7a96'
	const DEEP = '#454e6c'
	const GLASS = '#5fcfc0'
	const GLASS_LIT = '#c8fff0'
	const disc = ellipse(40, 23, 37, 7.5)
	const dome = ellipse(40, 17, 13, 11)
	return cellArt(80, 40, (x, y) => {
		let colour: string | undefined
		// Its legs and their feet.
		for (const lx of [14, 38, 64]) {
			if (x >= lx && x < lx + 3 && y >= 28 && y < 37)
				colour = x === lx ? METAL : SHADE
			if (x >= lx - 2 && x < lx + 5 && y >= 37 && y < 39)
				colour = y === 37 ? METAL : DEEP
		}
		// Its dome, its glass lit at the top left.
		if (dome(x, y) && y < 19) {
			colour = GLASS
			if (!dome(x - 2, y - 2)) colour = GLASS_LIT
			else if (!dome(x + 2, y + 1)) colour = '#3a9a98'
		}
		if (x >= 34 && x < 36 && y >= 10 && y < 13) colour = '#ffffff'
		// Its aerial.
		if (x === 40 && y >= 1 && y < 7) colour = DEEP
		if (x >= 39 && x < 42 && y >= 0 && y < 2) colour = '#ff7ac8'
		// Its disc, lit on top, shaded underneath.
		if (disc(x, y)) {
			colour = METAL
			if (!disc(x, y - 2)) colour = LIT
			else if (!disc(x, y + 2)) colour = SHADE
			else if (y >= 26) colour = SHADE
		}
		// Its rim lights, alternating.
		if (disc(x, y) && y >= 22 && y < 24 && x % 6 === 2 && x > 8 && x < 72)
			colour = (x / 6) % 2 < 1 ? '#ffd24a' : '#ff7ac8'
		// Its hatch, open, light spilling out and down the ramp.
		if (x >= 33 && x < 47 && y >= 27 && y < 31) colour = '#fff3b0'
		if (x >= 35 && x < 45 && y >= 27 && y < 31 && y > 27) colour = '#ffe070'
		for (let i = 0; i < 9; i++)
			if (y === 31 + i && x >= 30 - i && x < 38 - i + 2 && i < 8)
				colour = i % 2 ? '#e8c060' : '#f6dc80'
		// A bit of dust piled round its feet.
		for (const lx of [14, 38, 64])
			if (y >= 38 && x >= lx - 5 && x < lx + 8)
				colour = y === 38 ? DUST_LIT : DUST
		return colour
	})
})()

/**
 * A monolith: a tall, dark stone, a touch wider at the foot, its top cut
 * slantwise, carved with glyphs that glow teal in lines down its face.
 * 16 by 44 cells.
 */
export const monolith = (() => {
	const STONE = '#2f2b52'
	const LIT = '#4d4878'
	const SHADE = '#1c1a36'
	const GLOW = '#6cf0c0'
	const GLOW_DIM = '#3ba88a'
	return pixelArt(16, 44, [
		// Its body, widening towards the foot.
		[3, 3, 10, 38, STONE],
		[2, 24, 12, 17, STONE],
		// Its slanted top.
		[3, 1, 6, 2, STONE],
		[3, 2, 10, 1, STONE],
		[3, 1, 6, 1, LIT],
		// Lit along its left, shaded down its right.
		[3, 3, 1, 38, LIT],
		[2, 24, 1, 17, LIT],
		[12, 3, 1, 38, SHADE],
		[13, 24, 1, 17, SHADE],
		// Its glyphs, in a column: bars, rings, crosses.
		[6, 6, 4, 1, GLOW],
		[6, 7, 1, 2, GLOW],
		[9, 7, 1, 2, GLOW],
		[6, 11, 4, 1, GLOW_DIM],
		[7, 13, 2, 4, GLOW],
		[5, 15, 6, 1, GLOW],
		[6, 19, 1, 3, GLOW],
		[9, 19, 1, 3, GLOW],
		[7, 22, 2, 1, GLOW],
		[6, 25, 4, 1, GLOW_DIM],
		[5, 27, 2, 2, GLOW],
		[9, 27, 2, 2, GLOW],
		[7, 30, 2, 3, GLOW],
		[6, 34, 4, 1, GLOW],
		[6, 35, 1, 2, GLOW_DIM],
		[9, 35, 1, 2, GLOW_DIM],
		// A crack, and its foot sunk in dust.
		[10, 20, 1, 4, SHADE],
		[0, 41, 16, 3, DUST],
		[1, 41, 14, 1, DUST_LIT],
		[3, 40, 3, 1, DUST_LIT],
	])
})()

/**
 * A natural rock arch: two thick legs of purple stone and a span between,
 * lit on its top, shaded down its right, pitted here and there, and dust
 * drifted at its feet. 60 by 40 cells.
 */
export const rockArch = (() => {
	const BASE = '#6e5496'
	const LIT = '#9a7cc4'
	const SHADE = '#4a3670'
	const PIT = '#3d2b5e'
	const outer = ellipse(30, 40, 29.5, 37)
	const inner = ellipse(30, 40, 16, 25)
	const solid: Shape = (x, y) => outer(x, y) && !inner(x, y)
	return cellArt(60, 40, (x, y) => {
		let colour: string | undefined
		if (solid(x, y)) {
			colour = BASE
			if (!solid(x, y - 2) || !solid(x - 1, y - 1)) colour = LIT
			else if (
				!solid(x + 2, y) ||
				(x > 30 && !inner(x - 3, y) && inner(x + 2, y))
			)
				colour = SHADE
			else if (x > 44 || y >= 34) colour = SHADE
			// Pits and a lump of stone on its shoulder.
			if (noise(Math.floor(x / 2), Math.floor(y / 2), 5) < 0.07) colour = PIT
		}
		if (x >= 42 && x < 50 && y >= 7 && y < 10 && !solid(x, y - 1)) colour = LIT
		if (ellipse(47, 9, 5, 3)(x, y)) colour = y < 8 ? LIT : BASE
		// Dust at its feet.
		const edge = 37 + Math.round(noise(Math.floor(x / 2), 7) * 2)
		if (y >= edge && !(inner(x, y) && y < 39))
			colour = y === edge ? DUST_LIT : DUST
		if (inner(x, y) && y >= 38 && y < 40) colour = y === 38 ? DUST_LIT : DUST
		return colour
	})
})()

/**
 * Strange flowers: three stalks, each topped with a star of pink and
 * orange petals round a yellow heart, a curling leaf beside. 16 by 12 cells.
 */
export const alienFlowers = (() => {
	const STEM = '#4a9a3a'
	const STEM_LIT = '#7ad060'
	const PINK = '#ff6ab8'
	const ORANGE = '#ff9a4a'
	const HEART = '#ffe86a'
	return pixelArt(16, 12, [
		// Stems and leaves.
		[3, 5, 1, 7, STEM],
		[8, 3, 1, 9, STEM],
		[13, 6, 1, 6, STEM],
		[4, 8, 2, 1, STEM_LIT],
		[5, 7, 1, 1, STEM_LIT],
		[9, 7, 2, 1, STEM],
		[10, 6, 1, 1, STEM_LIT],
		[11, 9, 2, 1, STEM_LIT],
		// Left bloom, small, pink.
		[2, 3, 3, 3, PINK],
		[3, 2, 1, 5, PINK],
		[1, 4, 5, 1, PINK],
		[3, 4, 1, 1, HEART],
		// Middle bloom, big, orange with a pink tip each way.
		[6, 0, 5, 5, ORANGE],
		[7, 0, 3, 1, PINK],
		[5, 1, 7, 3, ORANGE],
		[5, 2, 1, 1, PINK],
		[11, 2, 1, 1, PINK],
		[8, 2, 1, 1, HEART],
		[7, 2, 1, 1, '#ffe0a0'],
		// Right bloom, small, pink.
		[12, 4, 3, 3, PINK],
		[13, 3, 1, 5, PINK],
		[13, 5, 1, 1, HEART],
		// Dust.
		[0, 11, 16, 1, DUST],
		[2, 10, 4, 1, DUST_LIT],
		[10, 10, 5, 1, DUST_LIT],
	])
})()

/**
 * A second clump: bell-shaped flowers, nodding on bent stems, glowing blue
 * and white-tipped, with a bud or two. 16 by 12 cells.
 */
export const alienFlowers2 = (() => {
	const STEM = '#3f8f6a'
	const BELL = '#5aa8ff'
	const LIT = '#a0d0ff'
	const SHADE = '#3a70c8'
	const TIP = '#f4fbff'
	return pixelArt(16, 12, [
		// Stems, bent over at the top.
		[3, 5, 1, 7, STEM],
		[3, 4, 3, 1, STEM],
		[9, 4, 1, 8, STEM],
		[9, 3, 3, 1, STEM],
		[14, 7, 1, 5, STEM],
		[13, 6, 2, 1, STEM],
		// Bells, hanging.
		[4, 5, 4, 4, BELL],
		[4, 5, 1, 4, LIT],
		[7, 5, 1, 4, SHADE],
		[4, 9, 4, 1, TIP],
		[10, 4, 4, 4, BELL],
		[10, 4, 1, 4, LIT],
		[13, 4, 1, 4, SHADE],
		[10, 8, 4, 1, TIP],
		// A bud on the third, and a leaf.
		[12, 7, 2, 2, BELL],
		[12, 7, 1, 1, LIT],
		[0, 8, 3, 1, STEM],
		[1, 7, 1, 1, STEM],
		[6, 9, 3, 1, STEM],
		// Dust.
		[0, 11, 16, 1, DUST],
		[1, 10, 4, 1, DUST_LIT],
		[11, 10, 4, 1, DUST_LIT],
	])
})()

/**
 * A few small crystals in a fan, pale blue-violet, lit on their left and
 * glinting, standing in a little dust. 14 by 12 cells.
 */
export const smallCrystals = (() => {
	const BASE = '#7a8cf0'
	const LIT = '#b4c0ff'
	const SHADE = '#4c58b8'
	const DEEP = '#6674d8'
	return pixelArt(14, 12, [
		...shard(0, 12, 4, 6, DEEP, LIT, SHADE),
		...shard(9, 12, 4, 7, DEEP, LIT, SHADE),
		...shard(5, 12, 4, 12, BASE, LIT, SHADE),
		...shard(3, 12, 4, 8, BASE, LIT, SHADE),
		[6, 4, 1, 2, '#ffffff'],
		[1, 8, 1, 1, '#ffffff'],
		[0, 11, 14, 1, DUST],
		[1, 10, 3, 1, DUST_LIT],
		[10, 10, 3, 1, DUST_LIT],
	])
})()

/**
 * Another friendly alien, waving both arms: a round orange body, two eyes on
 * stalks, a wide smile, a little lilac belly and two stubby feet.
 * 18 by 26 cells.
 */
export const wavingAlien2 = (() => {
	const SKIN = '#ff9a4a'
	const LIT = '#ffc080'
	const SHADE = '#d06a30'
	const BELLY = '#ffe0a8'
	const EYE = '#1d1d1d'
	return pixelArt(18, 26, [
		// Its eye stalks and eyes.
		[5, 2, 1, 5, SHADE],
		[12, 2, 1, 5, SHADE],
		[3, 0, 5, 4, '#ffffff'],
		[10, 0, 5, 4, '#ffffff'],
		[5, 1, 2, 3, EYE],
		[12, 1, 2, 3, EYE],
		[3, 0, 1, 1, '#d8f0ff'],
		// Its round body.
		[4, 7, 10, 1, SKIN],
		[3, 8, 12, 11, SKIN],
		[4, 19, 10, 1, SKIN],
		[5, 20, 8, 1, SHADE],
		[4, 7, 6, 1, LIT],
		[3, 8, 2, 6, LIT],
		[13, 10, 2, 9, SHADE],
		[4, 18, 9, 2, SHADE],
		// Its belly.
		[6, 13, 6, 5, BELLY],
		[6, 17, 6, 1, LIT],
		// Its smile.
		[6, 10, 1, 1, '#7a2e1a'],
		[7, 11, 4, 1, '#7a2e1a'],
		[11, 10, 1, 1, '#7a2e1a'],
		// Its arms, both up.
		[1, 6, 2, 5, SKIN],
		[0, 4, 2, 3, SKIN],
		[0, 3, 1, 1, LIT],
		[15, 6, 2, 5, SHADE],
		[16, 4, 2, 3, SKIN],
		[17, 3, 1, 1, LIT],
		// Its feet.
		[4, 21, 4, 4, SKIN],
		[10, 21, 4, 4, SHADE],
		[3, 24, 6, 2, SKIN],
		[9, 24, 6, 2, SHADE],
	])
})()

/**
 * A little alien flag on a pole: a grey staff with a glowing tip, a teal
 * pennant flying from it, a ring and a dot on the cloth, and a heap of
 * stones at its foot. 12 by 30 cells.
 */
export const alienFlag = (() => {
	const POLE = '#b8b2c8'
	const POLE_SHADE = '#7a7290'
	const CLOTH = '#2fbfa8'
	const CLOTH_LIT = '#6cf0d0'
	const CLOTH_SHADE = '#1f8a7c'
	return pixelArt(12, 30, [
		// Its pole and glowing tip.
		[2, 3, 1, 26, POLE],
		[3, 3, 1, 26, POLE_SHADE],
		[1, 0, 3, 3, '#ffe86a'],
		[2, 0, 1, 1, '#ffffff'],
		// Its pennant, tapering to a swallow tail.
		[4, 3, 7, 2, CLOTH_LIT],
		[4, 5, 8, 5, CLOTH],
		[4, 10, 6, 2, CLOTH_SHADE],
		[4, 12, 3, 1, CLOTH_SHADE],
		[10, 9, 1, 3, CLOTH_SHADE],
		[10, 12, 1, 1, CLOTH_SHADE],
		// Its emblem: a ring and a dot.
		[6, 5, 3, 1, '#f4fffa'],
		[6, 7, 3, 1, '#f4fffa'],
		[6, 6, 1, 1, '#f4fffa'],
		[8, 6, 1, 1, '#f4fffa'],
		// A heap of stones at its foot.
		[0, 27, 7, 3, '#6e5496'],
		[1, 26, 4, 1, '#9a7cc4'],
		[4, 28, 6, 2, '#4a3670'],
		[5, 27, 4, 1, '#6e5496'],
		[0, 29, 12, 1, DUST],
	])
})()
