import { svgUrl } from './pixelArt'
import { seeded } from './seeded'

/**
 * Midnattsloppet's horizons, at night, one after another along it (see
 * `voyage`): Södermalm's rooftops along Ringvägen; across the water from
 * Hammarby kaj, Hammarby Sjöstad's lights and the Globe; the trees and
 * roofs of Vita bergen; and Södermalm's roofs again, to Hornsgatan. Each
 * band 1200 by 160, wrapping, its colour on down under it. Dark
 * silhouettes against the night, the far ones hazier and bluer, a lit
 * window here and there.
 */

const W = 1200
const H = 160
const even = (n: number) => Math.round(n / 2) * 2

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

/** A pitched roof, `w` wide over its eaves at `base`, in 2-px steps `s` in from each side: its ridge lit. */
function gable(
	rect: Rect,
	x: number,
	base: number,
	w: number,
	s: number,
	fill: string,
	lit: string,
) {
	const rows = Math.ceil(w / (2 * s))
	for (let i = 0; i < rows; i++)
		rect(
			x + i * s,
			base - 2 * (i + 1),
			w - 2 * i * s,
			2,
			i === rows - 1 ? lit : fill,
		)
	return rows * 2
}

/** How far up a pitched roof is `o` along it. */
const gableRise = (o: number, w: number, s: number) =>
	2 * Math.max(0, Math.floor(Math.min(o, w - o) / s))

/** Something round, its middle at `cx`, `cy`, stepped: a tree's canopy. */
function blob(rect: Rect, cx: number, cy: number, r: number, fill: string) {
	for (let dy = -r; dy < r; dy += 2) {
		const half = even(Math.sqrt(Math.max(0, r * r - (dy + 1) ** 2)))
		rect(cx - half, cy + dy, half * 2, 2, fill)
	}
}

/** A dome, its foot `base`, `r` across each way from `cx`: lit along its top. */
function dome(
	rect: Rect,
	cx: number,
	base: number,
	r: number,
	fill: string,
	lit: string,
) {
	for (let up = 0; up < r; up += 2) {
		const half = even(Math.sqrt(Math.max(0, r * r - (up + 1) ** 2)))
		rect(cx - half, base - up - 2, half * 2, 2, up >= r - 4 ? lit : fill)
	}
}

/** A spire, tapering in 2-px steps from `w` wide at `base` to a point at `top`. */
function spire(
	rect: Rect,
	cx: number,
	base: number,
	top: number,
	w: number,
	fill: string,
) {
	const rows = (base - top) / 2
	for (let i = 0; i < rows; i++) {
		const half = Math.max(1, even((w / 2) * (1 - i / rows)))
		rect(cx - half, base - 2 * (i + 1), half * 2, 2, fill)
	}
}

// --- Södermalm --------------------------------------------------------------

/**
 * Far off: Södermalm's roofs, hazy, tiled and tin, chimneys on them;
 * Katarina kyrka's dome and its lantern over them, Maria Magdalena's
 * spire, and Högalid's twin towers away west. A window lit here and there.
 */
export const SODER_FAR = (() => {
	const random = seeded(52101)
	const { rect, url } = band()
	const ROOF = '#181d44'
	const LIT = '#232a5c'
	const WINDOW = '#a88f5c'
	for (let x = 0; x < W; ) {
		const w = even(28 + random() * 44)
		const eaves = even(88 + random() * 24)
		rect(x, eaves, w, H - eaves, ROOF)
		const kind = random()
		const s = random() < 0.5 ? 2 : 4
		let rise: (o: number) => number
		if (kind < 0.5) {
			// Tiled, pitched.
			gable(rect, x, eaves, w, s, ROOF, LIT)
			rise = (o) => gableRise(o, w, s)
		} else if (kind < 0.85) {
			// Tin, sloping in a little to a flat top.
			rect(x + 2, eaves - 6, w - 4, 6, ROOF)
			rect(x + 2, eaves - 6, w - 4, 2, LIT)
			rise = () => 6
		} else {
			rect(x, eaves, w, 2, LIT)
			rise = () => 0
		}
		for (let c = Math.floor(random() * 3); c > 0; c--) {
			const o = even(4 + random() * (w - 12))
			const top = eaves - Math.max(rise(o), rise(o + 4)) - 6
			rect(x + o, top, 4, eaves - top, ROOF)
		}
		for (let y = eaves + 6; y < 136; y += 8)
			for (let wx = x + 4; wx < x + w - 4; wx += 6)
				if (random() < 0.05) rect(wx, y, 2, 2, WINDOW)
		x += w
	}

	// Katarina kyrka: its body, its corner towers, the drum and the dome, the lantern.
	const k = 240
	rect(k - 44, 92, 88, 68, ROOF)
	rect(k - 44, 92, 88, 2, LIT)
	for (const t of [k - 46, k + 30]) {
		rect(t, 80, 16, 12, ROOF)
		dome(rect, t + 8, 80, 8, ROOF, LIT)
	}
	rect(k - 18, 62, 36, 30, ROOF)
	rect(k - 20, 62, 40, 2, LIT)
	dome(rect, k, 62, 22, ROOF, LIT)
	rect(k - 4, 32, 8, 10, ROOF)
	rect(k - 2, 26, 4, 6, LIT)
	rect(k - 1, 20, 2, 6, ROOF)
	for (const wy of [70, 80]) rect(k - 2, wy, 4, 4, WINDOW)

	// Maria Magdalena's tower, and its spire.
	const m = 640
	rect(m - 8, 64, 16, 96, ROOF)
	rect(m - 8, 64, 16, 2, LIT)
	rect(m - 6, 56, 12, 8, ROOF)
	spire(rect, m, 56, 22, 12, ROOF)
	rect(m - 1, 16, 2, 6, ROOF)
	rect(m - 2, 72, 4, 4, WINDOW)

	// Högalid kyrka's two towers, slim, a little cap on each.
	for (const h of [1000, 1028]) {
		rect(h - 5, 54, 10, 106, ROOF)
		rect(h - 5, 54, 10, 2, LIT)
		dome(rect, h, 54, 6, ROOF, LIT)
		rect(h - 1, 42, 2, 8, ROOF)
	}
	rect(990, 96, 48, 64, ROOF)
	return url()
})()

/**
 * Nearer: the blocks along Ringvägen, five storeys and their roofs over
 * them: tin, with dormers out of them, or tiled and pitched; chimneys in
 * twos and threes; and the odd window lit, someone still up.
 */
export const SODER_NEAR = (() => {
	const random = seeded(52202)
	const { rect, url } = band()
	const ROOF = '#0d1029'
	const LIT = '#1a1f47'
	const WINDOW = '#e9bd68'
	const LAMP = '#b98447'
	for (let x = 0; x < W; ) {
		const w = even(70 + random() * 80)
		const eaves = even(84 + random() * 26)
		rect(x, eaves, w, H - eaves, ROOF)
		let rise: (o: number) => number
		if (random() < 0.55) {
			// Tin, steep up from the gutter, flat on top, dormers out of it.
			const roof = even(12 + random() * 6)
			for (let i = 0; i * 2 < roof; i++) {
				const inset = Math.min(i * 2, 6)
				rect(x + inset, eaves - 2 * (i + 1), w - inset * 2, 2, ROOF)
			}
			rect(x + 6, eaves - roof, w - 12, 2, LIT)
			for (let d = x + 12; d < x + w - 16; d += even(24 + random() * 16)) {
				rect(d, eaves - 10, 8, 8, ROOF)
				gable(rect, d - 2, eaves - 10, 12, 2, ROOF, LIT)
				if (random() < 0.3) rect(d + 3, eaves - 7, 2, 4, WINDOW)
			}
			rise = () => roof
		} else {
			// Tiled, pitched.
			const s = 4
			gable(rect, x, eaves, w, s, ROOF, LIT)
			rise = (o) => gableRise(o, w, s)
		}
		// Chimneys, together, each a lit top.
		const c = x + even(10 + random() * (w - 30))
		for (let n = 1 + Math.floor(random() * 3), i = 0; i < n; i++) {
			const o = c - x + i * 6
			const top =
				eaves - Math.max(rise(o), rise(o + 4)) - even(6 + random() * 4)
			rect(c + i * 6, top, 4, eaves - top, ROOF)
			rect(c + i * 6, top, 4, 2, LIT)
		}
		// The facade's windows, a few of them lit.
		for (let y = eaves + 8; y < 152; y += 12)
			for (let wx = x + 6; wx < x + w - 6; wx += 10) {
				const on = random()
				if (on < 0.07) rect(wx, y, 2, 4, on < 0.05 ? WINDOW : LAMP)
			}
		// A gap occasionally, a lower roof in it.
		if (random() < 0.35) {
			const gap = even(10 + random() * 16)
			const low = even(118 + random() * 14)
			rect(x + w, low, gap, H - low, ROOF)
			rect(x + w, low, gap, 2, LIT)
			x += gap
		}
		x += w
	}
	return url()
})()
export const SODER_FILL = '#181d44'

// --- Hammarby sjö -----------------------------------------------------------

/**
 * Across the water: Hammarby Sjöstad's blocks, flat-topped, their top
 * floors set back, plenty of windows lit; the lamps along the quay over
 * there; and the Globe, Avicii Arena, white over it all.
 */
export const HAMMARBY_FAR = (() => {
	const random = seeded(52301)
	const { rect, url } = band()
	const BLOCK = '#1a2048'
	const LIT = '#262e62'
	const WINDOW = '#b89c62'
	const COOL = '#7e8cb8'
	const GLOBE = '#7f88aa'
	const GLOBE_LIT = '#98a0c0'
	const GLOBE_SHADE = '#6a7397'
	const SHORE = 118
	/** A block's windows, `top` down to the quay, plenty of them lit. */
	const windows = (x: number, top: number, w: number) => {
		for (let y = top + 6; y < SHORE - 4; y += 6)
			for (let wx = x + 4; wx < x + w - 4; wx += 6) {
				const on = random()
				if (on < 0.14) rect(wx, y, 2, 2, on < 0.1 ? WINDOW : COOL)
			}
	}

	// The Globe, rising over the blocks: its seams, its shaded side.
	const g = 780
	const r = 58
	for (let up = 0; up < r; up += 2) {
		const half = even(Math.sqrt(r * r - (up + 1) ** 2))
		rect(g - half, SHORE - up - 2, half * 2, 2, up >= r - 8 ? GLOBE_LIT : GLOBE)
		rect(g + half - 8, SHORE - up - 2, 8, 2, GLOBE_SHADE)
	}
	for (const seam of [24, 42]) {
		const half = even(Math.sqrt(r * r - (seam + 1) ** 2))
		rect(g - half + 2, SHORE - seam - 2, half * 2 - 10, 2, GLOBE_SHADE)
	}

	for (let x = 0; x < W; ) {
		const w = even(40 + random() * 50)
		const top = even(62 + random() * 30)
		// Clear of the Globe.
		if (x + w > g - r - 6 && x < g + r + 6) {
			x = g + r + 6
			continue
		}
		rect(x, top, w, H - top, BLOCK)
		rect(x, top, w, 2, LIT)
		if (random() < 0.5) {
			// Its top floor, set back.
			const pent = even(8 + random() * 10)
			rect(x + pent, top - 8, w - pent - 4, 8, BLOCK)
			rect(x + pent, top - 8, w - pent - 4, 2, LIT)
		}
		windows(x, top, w)
		x += w + even(4 + random() * 12)
	}
	// Low blocks along the water, in front of the Globe.
	rect(g - r - 12, 102, 2 * r + 24, H - 102, BLOCK)
	rect(g - r - 12, 102, 2 * r + 24, 2, LIT)
	windows(g - r - 12, 102, 2 * r + 24)
	// The quay over there, its lamps along it.
	rect(0, SHORE - 2, W, H - SHORE + 2, BLOCK)
	for (let x = 6; x < W; x += 24) rect(x, SHORE - 2, 2, 2, WINDOW)
	return url()
})()

/**
 * Nearer: Hammarby sjö, dark, rippling, the lights across it drawn out
 * in it in short streaks; a boat or two tied up. On down to the quay
 * (see `HAMMARBY_WATER`).
 */
export const HAMMARBY_NEAR = (() => {
	const random = seeded(52402)
	const { rect, url } = band()
	const WATER = '#0c1533'
	const RIPPLE = '#16224a'
	const DARK = '#080f26'
	const GLOW = '#6e5c3c'
	const BRIGHT = '#b08f55'
	const BOAT = '#070a1a'
	const BOAT_LIT = '#1a2148'
	const TOP = 58

	rect(0, TOP, W, H - TOP, WATER)
	// Ripples, longer and further apart the nearer they are.
	for (let i = 0; i < 90; i++) {
		const y = even(TOP + 4 + random() * (H - TOP - 14))
		const near = (y - TOP) / (H - TOP)
		rect(
			even(random() * W),
			y,
			even(6 + random() * 10 + near * 16),
			2,
			random() < 0.6 ? RIPPLE : DARK,
		)
	}
	// The lights across the water, each drawn down it in broken streaks.
	for (let i = 0; i < 26; i++) {
		const x = even(random() * W)
		const bright = random() < 0.35
		const length = even(20 + random() * 50)
		for (let y = TOP + 2; y < TOP + length; y += even(4 + random() * 4)) {
			const w = even(2 + random() * 6)
			const sway = even((random() - 0.5) * 6)
			rect(x + sway - w / 2, y, w, 2, bright && y < TOP + 20 ? BRIGHT : GLOW)
		}
	}
	// A sailing boat and a little motorboat, tied up by the quay.
	const sail = 340
	rect(sail, 140, 44, 6, BOAT)
	rect(sail + 4, 146, 36, 2, BOAT)
	rect(sail + 12, 134, 16, 6, BOAT)
	rect(sail + 12, 134, 16, 2, BOAT_LIT)
	rect(sail + 20, 78, 2, 56, BOAT)
	rect(sail + 20, 76, 2, 2, '#c84a4a')
	const motor = 880
	rect(motor, 142, 30, 6, BOAT)
	rect(motor + 6, 136, 12, 6, BOAT)
	rect(motor + 6, 136, 12, 2, BOAT_LIT)
	rect(motor + 8, 138, 2, 2, BRIGHT)
	return url()
})()
export const HAMMARBY_FILL = '#0c1533'

/**
 * Nearer still: the water on, right up to the quay under the road, going
 * by faster, nearer: bigger ripples, and the quay's lamps drawn down it.
 * Its top clear, over the near band's water; its colour on down below it.
 */
export const HAMMARBY_WATER = (() => {
	const random = seeded(52403)
	const { rect, url } = band()
	const WATER = '#0b1430'
	const RIPPLE = '#17244e'
	const DARK = '#070d22'
	const GLOW = '#7a6640'
	/** Where it starts, down the band: just over where the near band ends, so no seam shows. */
	const TOP = 88

	rect(0, TOP, W, H - TOP, WATER)
	for (let i = 0; i < 70; i++) {
		const y = even(TOP + 2 + random() * (H - TOP - 4))
		rect(
			even(random() * W),
			y,
			even(14 + random() * 26),
			2,
			random() < 0.6 ? RIPPLE : DARK,
		)
	}
	// The quay's lamps, drawn down the water towards you, wavering.
	for (let x = 60; x < W; x += 240) {
		for (let y = TOP + 40; y < H; y += 6) {
			const w = even(4 + random() * 8)
			rect(x + even((random() - 0.5) * 8) - w / 2, y, w, 2, GLOW)
		}
	}
	return url()
})()
export const HAMMARBY_WATER_FILL = '#0b1430'

// --- Vita bergen -------------------------------------------------------------

/** How high a band's hill is at `x`: whole waves across it, so it wraps. */
function hill(x: number, base: number, waves: [number, number, number][]) {
	return even(
		base -
			waves.reduce(
				(sum, [cycles, height, phase]) =>
					sum + height * Math.sin((x / W) * cycles * Math.PI * 2 + phase),
				0,
			),
	)
}

/**
 * Far off: Vita bergen, its rock wooded over, the treetops along its
 * top. Not Sofia kyrka on it: that's on the course itself, up close.
 */
export const VITA_BERGEN_FAR = (() => {
	const random = seeded(52501)
	const { rect, url } = band()
	const HILL = '#151d3c'
	const LIT = '#1e2850'
	const WINDOW = '#a88f5c'
	const waves: [number, number, number][] = [
		[1, 16, 0.6],
		[3, 8, 2.1],
		[7, 4, 4.0],
	]
	for (let x = 0; x < W; x += 2) {
		const top = hill(x, 104, waves)
		rect(x, top, 2, H - top, HILL)
	}
	// Treetops along it, round, lit on top.
	for (let x = 0; x < W; x += even(10 + random() * 14)) {
		const r = even(6 + random() * 6)
		const cy = hill(x, 104, waves) - even(r / 2)
		blob(rect, x, cy, r, HILL)
		rect(x - r / 2, cy - r, r, 2, LIT)
	}
	// A light on in a house or two, among the trees.
	for (let i = 0; i < 10; i++) {
		const x = even(random() * W)
		rect(x, hill(x, 104, waves) + even(8 + random() * 16), 2, 2, WINDOW)
	}
	return url()
})()

/**
 * Nearer: up the hill, its granite showing through, the trees' dark
 * canopies, pines among them, and the little wooden houses in among
 * them, a roof, a chimney, a window lit.
 */
export const VITA_BERGEN_NEAR = (() => {
	const random = seeded(52602)
	const { rect, url } = band()
	const CANOPY = '#0a1222'
	const CANOPY_LIT = '#132038'
	const PINE = '#08101c'
	const ROCK = '#161b2e'
	const ROCK_LIT = '#252c46'
	const WALL = '#3a1e28'
	const CORNER = '#4a4e68'
	const ROOF = '#1b1a30'
	const ROOF_LIT = '#2c2d52'
	const WINDOW = '#e9bd68'
	const waves: [number, number, number][] = [
		[2, 10, 1.3],
		[5, 6, 0.2],
		[9, 2, 3.3],
	]
	const ground = (x: number) => hill(x, 128, waves)

	// The trees at the back, a hill of them.
	for (let x = 0; x < W; x += even(14 + random() * 16)) {
		const r = even(12 + random() * 10)
		const cy = ground(x) - even(16 + random() * 14)
		blob(rect, x, cy, r, CANOPY)
		blob(rect, x - 2, cy - 2, r - 6, CANOPY)
		rect(x - r / 2, cy - r, r - 2, 2, CANOPY_LIT)
	}
	// And the hillside under them, solid.
	for (let x = 0; x < W; x += 2)
		rect(x, ground(x) - 14, 2, H - ground(x) + 14, CANOPY)

	// The little houses, among them, each with its roof, a chimney, a window.
	for (const [hx, w] of [
		[90, 24],
		[310, 28],
		[520, 20],
		[700, 26],
		[960, 24],
		[1110, 22],
	]) {
		const foot = ground(hx + w / 2) - 4
		const top = foot - 16
		rect(hx, top, w, 16, WALL)
		rect(hx, top, 2, 16, CORNER)
		rect(hx + w - 2, top, 2, 16, CORNER)
		const rise = gable(rect, hx - 4, top, w + 8, 4, ROOF, ROOF_LIT)
		rect(hx + w - 8, top - rise + 2, 4, rise - 2, ROOF)
		if (random() < 0.75) rect(hx + even(w / 2) - 2, top + 6, 4, 4, WINDOW)
	}

	// Pines, here and there over the rest.
	for (let x = 40; x < W; x += even(90 + random() * 120)) {
		const foot = ground(x) + 10
		const h = even(40 + random() * 24)
		for (let i = 0; i * 2 < h; i++) {
			const half = Math.max(1, even(((i % 8) + 4) * (1 - i / (h / 2)) * 1.4))
			rect(x - half, foot - 2 * (i + 1), half * 2, 2, PINE)
		}
	}

	// Bushes, along the foot of it all.
	for (let x = 0; x < W; x += even(16 + random() * 20)) {
		const r = even(8 + random() * 6)
		blob(rect, x, H - 2, r, CANOPY)
		if (random() < 0.4) rect(x - r / 2, H - 2 - r, r - 2, 2, CANOPY_LIT)
	}
	// Granite, showing through at the foot of it, in low humps, lit along their tops.
	for (let x = 20; x < W; x += even(110 + random() * 120)) {
		const w = even(40 + random() * 36)
		const rows = 7
		const foot = H - 4
		for (let i = 0; i < rows; i++) {
			const half = even((w / 2) * Math.sqrt(1 - (i / rows) ** 2))
			const lit = i === rows - 1 || (i === rows - 2 && half > w / 4)
			rect(x + w / 2 - half, foot - 2 * (i + 1), half * 2, 2, ROCK)
			if (lit) rect(x + w / 2 - half, foot - 2 * (i + 1), half, 2, ROCK_LIT)
		}
		rect(x, foot, w, H - foot, ROCK)
		// A crack across it.
		rect(x + even(w / 2), foot - 6, even(w / 4), 2, CANOPY)
	}
	return url()
})()
export const VITA_BERGEN_FILL = '#151d3c'
