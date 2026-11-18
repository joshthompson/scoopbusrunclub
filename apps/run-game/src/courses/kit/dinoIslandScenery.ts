import { paintedArt, pixelArt, pixelText, svgUrl } from './pixelArt'

/**
 * Dino Island's art: the forest's dinosaurs, the diplodocus the path runs
 * up and over, the volcano, and the sea. `stub` is the placeholder
 * the rest were drawn over.
 */

/** A placeholder: a labelled box, `width` by `height` px, to be drawn properly. */
export function stub(
	width: number,
	height: number,
	label: string,
	fill: string,
) {
	const cell = width >= 120 ? 2 : 1
	return svgUrl(
		width,
		height,
		`<rect width="${width}" height="${height}" fill="${fill}"/><rect x="1" y="1" width="${width - 2}" height="${height - 2}" fill="none" stroke="#1d1d1d" stroke-width="2"/>${pixelText(
			label.slice(0, Math.floor(width / (6 * cell))),
			3,
			3,
			cell,
			'#1d1d1d',
		)}`,
	)
}

// --- The diplodocus -------------------------------------------------------------

/**
 * The diplodocus, side on, facing right, the way everyone's going: its tail
 * on the ground at its left, rising up its long back to its hips and on
 * along it to its shoulders, where its neck goes up (drawn on its own, see
 * `draw/diplodocus.ts`) to its head, a Platform. In cells of 4: it's huge.
 * Measured from its tail's tip, along, and up from the ground it stands on.
 */
const DIPLO_CELL = 4
export const DIPLODOCUS = {
	/** From its tail's tip to its chest. */
	width: 1180,
	/** From the ground to the top of its hips, and a little over. */
	height: 260,
	/** Where its shoulders are, along, and how high its back is there: its neck goes up from here. */
	shoulder: { x: 1080, y: 204 },
}

const ease = (t: number) => {
	const c = Math.max(0, Math.min(1, t))
	return c * c * (3 - 2 * c)
}

/**
 * How high its back is, `x` along from its tail's tip: up its tail, over
 * its hips, and gently down to its shoulders. The Ground, where the path
 * runs along it.
 */
export function diplodocusBack(x: number) {
	if (x <= 0) return 0
	if (x < 700) return Math.round(4 + 216 * ease(x / 700) ** 1.1)
	if (x < 780) return 220
	return Math.round(220 - 16 * ease((x - 780) / (DIPLODOCUS.shoulder.x - 780)))
}

const SKIN = '#7a8f5a'
const SKIN_LIT = '#9cb072'
const SKIN_SHADE = '#5a6b40'
const SKIN_DARK = '#46542f'
/** Its big markings: only a shade off its skin. */
const MARK = '#6d8350'
const NAIL = '#d6cfa4'

/** Its legs: from and to, along, the far ones darker and a little behind. */
const LEGS: [from: number, to: number, far: boolean][] = [
	[574, 648, true],
	[672, 748, false],
	[926, 996, true],
	[1016, 1090, false],
]
/** The big markings along it: how far along, how far down its back, how wide and tall. */
const MARKS: [x: number, down: number, rx: number, ry: number][] = [
	[330, 6, 22, 4],
	[450, 12, 26, 6],
	[560, 22, 30, 9],
	[700, 26, 46, 12],
	[832, 26, 42, 12],
	[958, 26, 38, 12],
	[780, 66, 16, 12],
	[910, 62, 18, 11],
]
/** Its chest, an ellipse at its front, round the base of its neck. */
const CHEST = { x: 1102, y: 128, rx: 78, ry: 80 }

/** How thick its tail is, `x` along: a whip at its tip. */
const tailThick = (x: number) => 4 + x * 0.06
/** How far up its belly is, `x` along: under its tail, nothing but its tail's thickness; then the tail thickens into the barrel. */
function bellyAt(x: number) {
	const back = diplodocusBack(x)
	if (x < 500) return Math.max(0, back - tailThick(x))
	const barrel =
		104 - 10 * Math.sin(Math.PI * Math.min(1, Math.max(0, (x - 660) / 440)))
	if (x >= 660) return barrel
	const u = ease((x - 500) / 160)
	return back - tailThick(500) + (barrel - (back - tailThick(500))) * u
}

/**
 * Its body's picture: tail, back, barrel, legs, toes and chest. Its top's
 * the back, line for line; its bottom rows, under its feet, clear, for the
 * ground there to be drawn as the path is either side of it.
 */
export const DIPLODOCUS_BODY = (() => {
	const columns = DIPLODOCUS.width / DIPLO_CELL
	const rows = DIPLODOCUS.height / DIPLO_CELL
	const inChest = (x: number, up: number) =>
		((x - CHEST.x) / CHEST.rx) ** 2 + ((up - CHEST.y) / CHEST.ry) ** 2 <= 1
	const inBody = (x: number, up: number) => {
		if (up < bellyAt(Math.min(x, 1100))) return false
		if (x < 1080) return up <= diplodocusBack(x)
		return inChest(x, up)
	}
	const inLeg = (x: number, up: number, [from, to]: (typeof LEGS)[number]) => {
		const belly = bellyAt(x)
		if (up > belly + 20) return false
		// Its thigh swells into the barrel; its foot spreads at the bottom.
		const swell = Math.max(0, Math.min(14, (up - 24) / 2))
		const foot = up < 12 ? 6 : 0
		return x >= from - swell - foot && x < to + swell + (up < 12 ? 16 : 0)
	}
	return paintedArt(columns, rows + 6, (px, py) => {
		const x = px * DIPLO_CELL
		/** Up from the ground, in px. */
		const up = (rows - py) * DIPLO_CELL
		// The forest floor under it, a path's depth, and grass along its front.
		// Under its feet: nothing, the ground drawn there as the path is,
		// either side of it (see `draw/diplodocus.ts`).
		if (up < 0) return undefined
		const near = LEGS.find((l) => !l[2] && inLeg(x, up, l))
		if (near) {
			// Its toes: three to a foot, nails on the front one.
			if (up < DIPLO_CELL * 2 && x >= near[1] + 10) return NAIL
			if (up < DIPLO_CELL)
				return Math.floor(x / 12) % 2 ? SKIN_DARK : SKIN_SHADE
			if (up < DIPLO_CELL * 3) return SKIN_SHADE
			if (
				!inLeg(x + DIPLO_CELL, up, near) ||
				!inLeg(x + DIPLO_CELL * 2, up, near)
			)
				return SKIN_SHADE
			return SKIN
		}
		if (inBody(x, up)) {
			const thick = x < 500 ? tailThick(x) : 99
			if (!inBody(x, up + DIPLO_CELL)) return SKIN_LIT
			if (thick >= 24 && !inBody(x, up + DIPLO_CELL * 2)) return SKIN_LIT
			if (thick >= 12 && !inBody(x, up - DIPLO_CELL)) return SKIN_SHADE
			if (thick >= 24 && !inBody(x, up - DIPLO_CELL * 2)) return SKIN_SHADE
			if (x >= 560 && !inBody(x, up - DIPLO_CELL * 3)) return SKIN_SHADE
			const back = diplodocusBack(Math.min(x, 1080))
			for (const [mx, down, rx, ry] of MARKS)
				if (((x - mx) / rx) ** 2 + ((up - (back - down)) / ry) ** 2 <= 1)
					return MARK
			return SKIN
		}
		const far = LEGS.find((l) => l[2] && inLeg(x, up, l))
		if (far) return up < DIPLO_CELL * 3 ? SKIN_DARK : SKIN_SHADE
		return undefined
	})
})()
export const DIPLODOCUS_BODY_HEIGHT = DIPLODOCUS.height + 6 * DIPLO_CELL

/** Its neck's colours, for `draw/diplodocus.ts`: lit along its top, shaded under. */
export const NECK = {
	skin: SKIN,
	lit: SKIN_LIT,
	shade: SKIN_SHADE,
	cell: DIPLO_CELL,
}

/**
 * Its head, the Platform at the top of its neck: the neck's last stretch
 * at the left, as thick as the neck where it joins it, folds of skin
 * across it, its throat curving up under it into the jaw; and its head,
 * side on, facing right, as a diplodocus's is: long and low, its brow
 * domed, its nostrils up on top by its eye, its snout tapering long and
 * square-ended, its lower jaw under it and a row of peg teeth along the
 * front of it. Flat along its top, to run along, but for its snout,
 * dipping; its top the picture's. In the body's 4 px cells.
 */
export const DIPLODOCUS_HEAD = (() => {
	const width = 300
	const height = 56
	const INK = '#2b2f1e'
	const PINK = '#b86a5a'
	/** Its top, `x` along: flat, then dipping down its snout. */
	const topAt = (x: number) => (x < 250 ? 0 : (x - 250) * 0.22)
	/** Its upper jaw's underside, and its lower jaw's, `x` along. */
	const upperJaw = (x: number) => (x < 196 ? 99 : 26 - (x - 196) * 0.05)
	const lowerJaw = (x: number) => (x < 196 ? 99 : 40 - (x - 196) * 0.12)
	/** The neck's underside, `x` along: as thick as the neck, curving up into the throat. */
	const throat = (x: number) =>
		x < 120 ? 44 : x < 200 ? 44 - 4 * ease((x - 120) / 80) : 99
	const art = paintedArt(width / 4, height / 4, (px, py) => {
		// Each cell's middle, in px.
		const x = px * 4
		const y = py * 4
		if (x > 296) return undefined
		if (y < topAt(x)) return undefined
		const head = x >= 196
		const bottom = head ? lowerJaw(x) : throat(x)
		if (y > bottom) return undefined
		// Its eye, under its brow; its nostrils, up on top, by it.
		if (x >= 220 && x < 228 && y >= 8 && y < 12) return INK
		if (x >= 216 && x < 232 && y >= 4 && y < 8) return SKIN_SHADE
		if (x >= 236 && x < 248 && y < 4) return SKIN_SHADE
		if (x >= 240 && x < 244 && y >= 4 && y < 8) return INK
		// Its mouth: a line along between its jaws, peg teeth along the front.
		if (head && x >= 220 && Math.abs(y - upperJaw(x)) < 2) {
			if (x >= 256 && (x - 256) % 8 < 4) return NAIL
			return INK
		}
		if (head && x >= 220 && y > upperJaw(x) + 2 && y < upperJaw(x) + 6)
			return PINK
		// Lit along its top; shaded under its jaw and its throat.
		if (y < topAt(x) + 4) return SKIN_LIT
		if (y > bottom - 5) return SKIN_SHADE
		// Its cheek, round, a shade darker; folds across its neck.
		if (head && ((x - 208) / 18) ** 2 + ((y - 22) / 10) ** 2 <= 1) return MARK
		if (!head && x > 20 && x % 40 < 4 && y > 8 && y < bottom - 8)
			return SKIN_SHADE
		return SKIN
	})
	return { asset: art, width, height, top: 0 }
})()

// --- The backdrops, and the diving board --------------------------------------------------------

/** Seeded, repeatable luck: 0 up to 1. */
const luck = (n: number) => {
	const h = Math.sin(n * 12.9898 + 78.233) * 43758.5453
	return h - Math.floor(h)
}

/**
 * A band's ground line, a whole number of waves across `width` so it tiles:
 * the height of its top, in px, 2-px steps, at `x`. Each wave is
 * `[cycles, amplitude, phase]`.
 */
const ridge = (
	x: number,
	width: number,
	base: number,
	waves: [number, number, number][],
) =>
	Math.round(
		(base +
			waves.reduce(
				(h, [n, a, p]) => h + a * Math.sin(((x / width) * n + p) * Math.PI * 2),
				0,
			)) /
			2,
	) * 2

/** The band under a ridge, in 2-px columns, `colour` from the ridge down to `to`. */
const under = (
	width: number,
	to: number,
	colour: string,
	top: (x: number) => number,
) => {
	const rects: string[] = []
	for (let x = 0; x < width; x += 2)
		rects.push(
			`<rect x="${x}" y="${top(x)}" width="2" height="${to - top(x)}" fill="${colour}"/>`,
		)
	return rects.join('')
}

/**
 * Things stood along a band, each drawn again a width to either side, so one
 * that crosses the seam is whole on both sides of it.
 */
const wrapped = (width: number, at: number, draw: (x: number) => string) =>
	[-width, 0, width].map((d) => draw(at + d)).join('')

/** A rect, in px, as markup. */
const box = (x: number, y: number, w: number, h: number, fill: string) =>
	`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`

/**
 * A tree-fern, in px: a trunk and a fan of fronds drooping off its crown.
 * `x` is its trunk's middle, `y` its foot, `h` its trunk's height.
 */
const treeFern = (x: number, y: number, h: number, fill: string, lit: string) =>
	[
		box(x - 2, y - h, 4, h, fill),
		// Its fronds: a flat fan, longest in the middle, drooping at the ends.
		box(x - 14, y - h - 2, 28, 4, fill),
		box(x - 22, y - h, 12, 4, fill),
		box(x + 10, y - h, 12, 4, fill),
		box(x - 26, y - h + 4, 6, 4, fill),
		box(x + 20, y - h + 4, 6, 4, fill),
		box(x - 8, y - h - 6, 16, 4, fill),
		box(x - 4, y - h - 6, 8, 2, lit),
	].join('')

/**
 * A conifer of the age of dinosaurs, an araucaria: a tall bare trunk, and
 * its branches in a tuft, flat on top.
 */
const araucaria = (
	x: number,
	y: number,
	h: number,
	fill: string,
	lit: string,
) =>
	[
		box(x - 2, y - h, 4, h, fill),
		box(x - 12, y - h - 2, 24, 6, fill),
		box(x - 18, y - h + 4, 36, 4, fill),
		box(x - 8, y - h - 6, 16, 4, fill),
		box(x - 4, y - h - 10, 8, 4, fill),
		box(x - 8, y - h - 6, 12, 2, lit),
	].join('')

/**
 * The jungle's far band: hazy blue-green hills a long way off, tall
 * tree-ferns and araucarias standing up over their line. 960 by 160, its hills
 * from about 104 down, the line a whole number of waves across, so it tiles.
 */
const jungleFar = (() => {
	const width = 960
	const HILL = '#8db8b0'
	const TREE = '#79a79f'
	const LIT = '#9ec6bd'
	const top = (x: number) =>
		ridge(x, width, 112, [
			[2, 8, 0.1],
			[5, 5, 0.6],
			[9, 2.5, 0.3],
		])
	const trees = [
		[60, 'f', 34],
		[150, 'a', 46],
		[215, 'f', 28],
		[330, 'a', 52],
		[395, 'a', 38],
		[480, 'f', 36],
		[575, 'a', 48],
		[660, 'f', 30],
		[750, 'a', 42],
		[835, 'f', 38],
		[905, 'a', 34],
	] as const
	return svgUrl(
		width,
		160,
		[
			under(width, 160, HILL, top),
			// A lighter rim along the hills' tops.
			...Array.from({ length: width / 2 }, (_, i) =>
				box(i * 2, top(i * 2), 2, 2, LIT),
			),
			...trees.map(([x, kind, h]) =>
				wrapped(width, x, (at) =>
					kind === 'a'
						? araucaria(
								at,
								top(((at % width) + width) % width) + 4,
								h,
								TREE,
								LIT,
							)
						: treeFern(
								at,
								top(((at % width) + width) % width) + 4,
								h,
								TREE,
								LIT,
							),
				),
			),
		].join(''),
	)
})()

/**
 * The jungle's near band: a denser, darker canopy, rounded crowns in a
 * ragged line, the top of each lit, and tall tree-ferns standing up over
 * it. 960 by 160, its canopy from about 68, solid below.
 */
const jungleNear = (() => {
	const width = 960
	const CANOPY = '#2f6b45'
	const LIT = '#43875a'
	const DEEP = '#245a3a'
	/** Crowns along it, one every 24 px, each its own size and height. */
	const crowns = Array.from({ length: 40 }, (_, i) => ({
		x: i * 24 + 12,
		r: 22 + Math.floor(luck(i + 3) * 4) * 4,
		y: 68 + Math.floor(luck(i + 90) * 5) * 4,
	}))
	const rects: string[] = [box(0, 112, width, 48, CANOPY)]
	for (const c of crowns)
		for (const d of [-width, 0, width]) {
			// A crown: a stepped dome of canopy, its top row lit.
			for (let dy = 0; dy < c.r; dy += 4) {
				const half =
					Math.round(Math.sqrt(c.r * c.r - (c.r - dy - 2) ** 2) / 2) * 2
				rects.push(
					box(c.x + d - half, c.y + dy, half * 2, 4, dy < 4 ? LIT : CANOPY),
				)
			}
			rects.push(box(c.x + d - 14, c.y + c.r, 28, 112 - c.y - c.r, CANOPY))
		}
	const ferns = [
		[40, 64],
		[190, 76],
		[370, 60],
		[560, 78],
		[700, 62],
		[850, 72],
	] as const
	for (const [x, h] of ferns)
		rects.push(wrapped(width, x, (at) => treeFern(at, 92, h, DEEP, LIT)))
	// Shade down in the undergrowth.
	rects.push(box(0, 136, width, 24, DEEP))
	return svgUrl(width, 160, rects.join(''))
})()

/**
 * The horizons, one fading into the next as the course goes (see
 * `CourseLook['voyage']`): a prehistoric jungle's, and the volcano's,
 * smoking.
 */
export const JUNGLE_HORIZON = {
	far: jungleFar,
	near: jungleNear,
	fill: '#245a3a',
}

/**
 * The volcano's far band: blue-grey peaks, one a great cone with a glowing
 * crater and its smoke going up, a thin column from a lesser peak off to its
 * left. 960 by 160, the range a whole number of waves across, the cone and its
 * smoke well inside the seam.
 */
const volcanoFar = (() => {
	const width = 960
	const ROCK = '#8c97ae'
	const LIT = '#a4aec2'
	const SMOKE = '#aeb0bf'
	const SMOKE_DARK = '#9a9cae'
	const range = (x: number) =>
		ridge(x, width, 118, [
			[2, 7, 0.4],
			[5, 6, 0.1],
			[11, 2.5, 0.7],
		])
	/** The cone: a steep-sided peak at 520, flat-topped, glowing in its crater. */
	const cone = (x: number) =>
		Math.abs(x - 520) < 230
			? Math.round((70 + Math.max(0, Math.abs(x - 520) - 22) * 0.4) / 2) * 2
			: 999
	/** A lesser peak off to its left. */
	const peak = (x: number) =>
		Math.abs(x - 150) < 70
			? Math.round((72 + Math.abs(x - 150) * 0.7) / 2) * 2
			: 999
	const top = (x: number) => Math.min(range(x), cone(x), peak(x))
	const rects: string[] = [under(width, 160, ROCK, top)]
	for (let x = 0; x < width; x += 2) {
		rects.push(box(x, top(x), 2, 2, LIT))
	}
	// Its crater, glowing, and a thread of lava down its side.
	rects.push(box(496, 68, 48, 4, '#e0652a'), box(504, 64, 32, 4, '#f08a36'))
	rects.push(
		box(534, 76, 4, 12, '#d4501f'),
		box(538, 88, 4, 14, '#d4501f'),
		box(542, 102, 4, 8, '#d4501f'),
	)
	// Its smoke, going up in a wavering column that widens and leans.
	for (let y = 60; y > 4; y -= 4) {
		const lift = 60 - y
		const w = 12 + Math.round(lift / 6) * 2
		const x =
			520 -
			w / 2 +
			Math.round(Math.sin(lift / 9) * 4) * 2 +
			Math.round(lift / 10) * 2
		rects.push(box(x, y, w, 4, SMOKE), box(x + w - 2, y, 2, 4, SMOKE_DARK))
	}
	// A thin column from the lesser peak.
	for (let y = 68; y > 24; y -= 4) {
		const lift = 68 - y
		rects.push(
			box(
				148 +
					Math.round(Math.sin(lift / 7) * 2) * 2 +
					Math.round(lift / 16) * 2,
				y,
				4 + (lift > 24 ? 2 : 0),
				4,
				SMOKE,
			),
		)
	}
	return svgUrl(width, 160, rects.join(''))
})()

/**
 * The volcano's near band: dark brown-grey slopes, jagged, a lit edge along
 * the ridge, a few dead trees, bare and crooked, and lava glowing in cracks
 * down it. 960 by 160, solid below 100.
 */
const volcanoNear = (() => {
	const width = 960
	const ROCK = '#5c4d49'
	const LIT = '#76645b'
	const SHADE = '#4a3d3a'
	const DEAD = '#2e2623'
	const top = (x: number) => {
		const base = ridge(x, width, 92, [
			[2, 12, 0.2],
			[3, 8, 0.5],
			[7, 5, 0.8],
		])
		// Jagged: a rough, repeating step from cell to cell.
		return base + Math.floor(luck(Math.floor(x / 6) % 160) * 3) * 2
	}
	const rects: string[] = [under(width, 160, ROCK, top)]
	for (let x = 0; x < width; x += 2) {
		rects.push(box(x, top(x), 2, 2, LIT))
		const shade = Math.max(top(x) + 20, 120)
		rects.push(box(x, shade, 2, 160 - shade, SHADE))
	}
	/** A dead tree: a crooked trunk, bare branches. */
	const dead = (x: number, y: number, h: number) =>
		[
			box(x - 2, y - h, 4, h, DEAD),
			box(x - 8, y - h + 8, 6, 2, DEAD),
			box(x - 8, y - h + 4, 2, 6, DEAD),
			box(x + 2, y - h + 16, 8, 2, DEAD),
			box(x + 8, y - h + 12, 2, 6, DEAD),
			box(x - 2, y - h - 4, 6, 4, DEAD),
		].join('')
	for (const [x, h] of [
		[90, 52],
		[330, 40],
		[580, 56],
		[815, 46],
	] as const)
		rects.push(
			wrapped(width, x, (at) =>
				dead(at, top(((at % width) + width) % width) + 4, h),
			),
		)
	// Lava glowing in cracks down the slopes.
	for (const [x, y] of [
		[200, 112],
		[440, 118],
		[700, 110],
		[900, 120],
	])
		rects.push(
			box(x, y, 2, 6, '#d4501f'),
			box(x + 2, y + 6, 2, 6, '#e0652a'),
			box(x, y + 12, 2, 4, '#d4501f'),
		)
	return svgUrl(width, 160, rects.join(''))
})()

/**
 * Nearer still, the volcano's ashy foot, right down to the path: grey-brown
 * ash, a few dark boulders on it, and a lava crack glowing here and there.
 * 960 by 48, in 2-px steps, wrapping.
 */
const volcanoNearer = (() => {
	const ASH = '#4a3f38'
	const ASH_LIT = '#5a4e46'
	const BOULDER = '#2e2624'
	const BOULDER_LIT = '#3e3532'
	const CRACK = '#ff7a1a'
	let body = `<rect y="8" width="960" height="40" fill="${ASH}"/>`
	// Its top, rolling, lit.
	for (let x = 0; x < 960; x += 4) {
		const lift =
			Math.round(
				(Math.sin((x / 960) * Math.PI * 6) * 3 +
					Math.sin((x / 960) * Math.PI * 14) * 2) /
					2,
			) * 2
		body += `<rect x="${x}" y="${6 + lift}" width="4" height="4" fill="${ASH_LIT}"/>`
		body += `<rect x="${x}" y="${10 + lift}" width="4" height="${Math.max(0, -lift)}" fill="${ASH}"/>`
	}
	for (const [x, y, w] of [
		[60, 20, 16],
		[300, 28, 10],
		[520, 18, 20],
		[790, 26, 12],
	])
		body += `<rect x="${x}" y="${y}" width="${w}" height="8" fill="${BOULDER}"/><rect x="${x + 2}" y="${y - 2}" width="${w - 4}" height="2" fill="${BOULDER_LIT}"/>`
	for (const [x, y] of [
		[180, 34],
		[650, 30],
		[880, 38],
	])
		body += `<rect x="${x}" y="${y}" width="6" height="2" fill="${CRACK}"/><rect x="${x + 4}" y="${y + 2}" width="4" height="2" fill="${CRACK}"/>`
	return svgUrl(960, 48, body)
})()

export const VOLCANO_HORIZON = {
	far: volcanoFar,
	near: volcanoNear,
	fill: '#4a3d3a',
	nearer: [{ asset: volcanoNearer, height: 48, fill: '#4a3f38' }],
}

/**
 * The diving board, out over the cliff's edge: a white board with a blue
 * non-slip top, its left end bolted to a little grey stand. A Platform's
 * picture, its top at the picture's. 100 by 20, in cells of 2.
 */
const BOARD = '#f2f1ea'
const BOARD_SHADE = '#c4c4bb'
const GRIP = '#2f78c4'
const GRIP_LIT = '#4a93dc'
const IRON = '#8a919a'
const IRON_DARK = '#5e656e'
export const DIVING_BOARD = {
	asset: pixelArt(50, 10, [
		// The board: its grip on top, white under it, shaded underneath, rounded at the tip.
		[0, 0, 49, 1, GRIP],
		[2, 0, 40, 1, GRIP_LIT],
		[0, 1, 50, 2, BOARD],
		[0, 3, 49, 1, BOARD_SHADE],
		[49, 0, 1, 1, GRIP],
		// Its stand, a grey post with a foot and a brace, bolted through the board.
		[3, 4, 7, 6, IRON],
		[3, 4, 2, 6, '#a4abb4'],
		[8, 4, 2, 6, IRON_DARK],
		[1, 9, 11, 1, IRON_DARK],
		[10, 4, 8, 1, IRON_DARK],
		[12, 5, 4, 1, IRON_DARK],
		// Its bolts.
		[4, 1, 1, 1, IRON_DARK],
		[8, 1, 1, 1, IRON_DARK],
	]),
	width: 100,
	height: 20,
	top: 0,
}
