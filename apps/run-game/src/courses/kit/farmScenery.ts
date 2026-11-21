import { letterArt, paintedArt } from './pixelArt'

/**
 * Hungry Hungry Goose's farm (see `minigames/hungryGoose`): the giant goose
 * sat on the mound in the middle of the field, laying; its eggs, and the
 * golden ones; and round the field, a wooden fence and round hay bales.
 * The barn, its silo and the windmill are the tulip farm's.
 */

/** The field: lumpy grass, its path worn paler, and the field in front. */
export const FARM_GRASS = '#6aa84a'
export const FARM_GRASS_SHADE = '#568f3c'
export const FARM_PATH = '#a3cb68'
export const FARM_PATH_SHADE = '#88b354'
export const FARM_SKY_TOP = '#78c4ee'
export const FARM_SKY_BOTTOM = '#d6efff'

// --- The goose -----------------------------------------------------------------
/**
 * The giant goose: a Canada goose, as Haga's are, but drawn for her size,
 * in fine cells of 5 px: her black head and long black neck with a sheen
 * down it, the white strap under her chin, an eye with a glint; a pale
 * breast, brown flanks barred with darker brown, her wing folded over them
 * in rows of feathers, each edged pale, the long dark flight feathers
 * crossing over her black tail, and white under it; her grey legs and
 * webbed feet. Lit from above, shaded under.
 */
export const GOOSE_CELL = 5
const GOOSE_COLS = 72
const GOOSE_ROWS = 64
export const GOOSE_WIDTH = GOOSE_COLS * GOOSE_CELL
export const GOOSE_HEIGHT = GOOSE_ROWS * GOOSE_CELL
/** Where her rear is, across her picture (facing left), and how high up: under her tail, where eggs come out. */
export const GOOSE_REAR = { x: 62 * GOOSE_CELL, y: 47 * GOOSE_CELL }

const INK = '#1d1c1f'
const INK_SHEEN = '#34333a'
const INK_HI = '#4c4b54'
const WHITE = '#f6f3ec'
const WHITE_SHADE = '#d6d0c3'
const BREAST_LIT = '#e3d8c3'
const BREAST = '#cfc1a7'
const BREAST_SHADE = '#b3a489'
const BODY_LIT = '#9c8b74'
const BODY = '#8b7b67'
const BODY_SHADE = '#6f6252'
const BAR = '#7a6b58'
const WING = '#6a5c4c'
const WING_EDGE = '#a7957b'
const WING_DARK = '#54483b'
const PRIMARY = '#3f362e'
const PRIMARY_EDGE = '#5d5246'
const LEG = '#2f2f33'
const LEG_LIT = '#4a4a50'
const EYE = '#3a2414'
const MOUTH = '#b8433f'

/** Inside an ellipse round (`cx`, `cy`), `rx` by `ry`, turned `turn` radians; and how far in, 0 its middle, 1 its edge. */
function ellipse(
	x: number,
	y: number,
	cx: number,
	cy: number,
	rx: number,
	ry: number,
	turn = 0,
) {
	const c = Math.cos(turn)
	const s = Math.sin(turn)
	const dx = x - cx
	const dy = y - cy
	const u = (dx * c + dy * s) / rx
	const v = (-dx * s + dy * c) / ry
	return { d: Math.hypot(u, v), u, v }
}

/** How far (`x`, `y`) is from a curve through `points`, and how far along it, 0 to 1. */
function nearCurve(x: number, y: number, points: [number, number][]) {
	let best = Number.POSITIVE_INFINITY
	let along = 0
	const steps = 40
	for (let k = 0; k <= steps; k++) {
		const t = k / steps
		// A quadratic curve through its three points.
		const [a, b, c] = points
		const px = (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * b[0] + t * t * c[0]
		const py = (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * b[1] + t * t * c[1]
		const d = Math.hypot(x - px, y - py)
		if (d < best) {
			best = d
			along = t
		}
	}
	return { d: best, along }
}

/**
 * The giant goose, facing left: `honk`, her beak open; `flap`, a wing up
 * over her back, laying; `peck`, her head down at the grass.
 */
function bigGoose({
	honk = false,
	flap = false,
	peck = false,
}: { honk?: boolean; flap?: boolean; peck?: boolean }) {
	// Her neck, from her breast up to her head, or down to the grass.
	const neck: [number, number][] = peck
		? [
				[26, 34],
				[12, 36],
				[9, 50],
			]
		: [
				[25, 34],
				[13, 26],
				[14, 11],
			]
	const head: [number, number] = peck ? [8, 53] : [13, 9]
	const turn = peck ? 1.25 : 0
	/** A point on her head, `dx` ahead of it and `dy` down, turned with it. */
	const onHead = (dx: number, dy: number): [number, number] => [
		head[0] + dx * Math.cos(turn) - dy * Math.sin(turn),
		head[1] + dx * Math.sin(turn) + dy * Math.cos(turn),
	]
	return paintedArt(GOOSE_COLS, GOOSE_ROWS, (x, y) => {
		// Her wing, up over her back, laying: its coverts, then its long
		// flight feathers fanning up to its tip.
		if (flap) {
			const w = ellipse(x, y, 49, 19, 9, 17, 0.55)
			if (w.d < 1 && y < 34) {
				if (w.v < -0.2) {
					// Flight feathers, in long strips.
					const strip = Math.floor((w.u + 1) * 4)
					return Math.floor(w.v * 10) % 3 === 0 && strip % 2
						? PRIMARY_EDGE
						: strip % 2
							? PRIMARY
							: WING_DARK
				}
				if (Math.floor((w.v + 1) * 6) !== Math.floor((w.v + 1.08) * 6))
					return WING_EDGE
				return w.u < -0.5 ? WING_EDGE : WING
			}
		}
		// Her head: its black, a sheen across the top; the eye, a glint in it;
		// the white strap under her chin.
		const h = ellipse(x, y, head[0], head[1], 7.2, 5.6, turn)
		const eye = onHead(-2.8, -1.4)
		const strap = ellipse(x, y, ...onHead(2, 2.8), 2.8, 4.6, turn - 0.3)
		const beak = ellipse(x, y, ...onHead(-8.2, 1.4), 3.6, 2.3, turn + 0.08)
		if (beak.d < 1 && h.d > 0.85) {
			if (honk && Math.abs(beak.v) < 0.25) return MOUTH
			if (honk && beak.v > 0.25) return INK
			return beak.v < -0.3 && beak.u < 0.2 ? INK_SHEEN : INK
		}
		if (honk && !peck) {
			const lower = ellipse(x, y, ...onHead(-7.8, 4), 3.2, 1.4, 0.25)
			if (lower.d < 1) return INK
		}
		if (h.d < 1) {
			if (Math.hypot(x - eye[0], y - eye[1]) < 1.1)
				return Math.hypot(x - eye[0] + 0.4, y - eye[1] + 0.4) < 0.6
					? WHITE
					: EYE
			if (strap.d < 1) return strap.v > 0.4 ? WHITE_SHADE : WHITE
			return h.v < -0.55 ? INK_HI : h.v < -0.2 ? INK_SHEEN : INK
		}
		if (strap.d < 1) return strap.v > 0.4 ? WHITE_SHADE : WHITE
		// Her neck: black, thicker at its foot, a sheen down its near side.
		const n = nearCurve(x, y, neck)
		const thick = 3.4 + n.along * -0.8 + (1 - n.along) * 1.4
		if (n.d < thick && n.along > 0.02) {
			return n.d > thick - 1.3 && (peck ? y < 40 : x < 18 + n.along * -4)
				? INK_SHEEN
				: INK
		}
		// Her tail, black, tipped up a little, and the white under it.
		const tail = ellipse(x, y, 66, 34, 6.5, 3.4, -0.25)
		if (tail.d < 1) return tail.v < -0.4 ? INK_SHEEN : INK
		const under = ellipse(x, y, 61, 44, 6.5, 4, -0.2)
		if (under.d < 1) return under.v > 0.3 ? WHITE_SHADE : WHITE
		// Her body: one long egg of it, and her breast swelling out in front.
		const body = ellipse(x, y, 43, 40, 23, 13, -0.1)
		const breast = ellipse(x, y, 27, 41, 11, 11.5)
		if (body.d < 1 || breast.d < 1) {
			// The folded wing over her flank: rows of feathers, each edged
			// pale along its bottom, and the long flight feathers out over
			// her tail.
			if (!flap) {
				const wing = ellipse(x, y, 47, 36, 18, 8.2, -0.12)
				const tip = ellipse(x, y, 59, 34, 9, 3.2, -0.2)
				if (tip.d < 1 && x > 52) return tip.v > 0.45 ? PRIMARY_EDGE : PRIMARY
				if (wing.d < 1) {
					const row = Math.floor((wing.v + 1) * 3.5)
					const feather = Math.floor((wing.u + 1) * 7 + row * 0.5)
					const inFeather = ((wing.u + 1) * 7 + row * 0.5) % 1
					const lowIn = ((wing.v + 1) * 3.5) % 1
					if (wing.v < -0.75) return WING_EDGE
					if (lowIn > 0.72 && inFeather > 0.15) return WING_EDGE
					return feather % 2 ? WING : WING_DARK
				}
			}
			// The breast: pale, lit along its top, shaded under.
			if (x < 32 && breast.d < 1) {
				if (breast.v < -0.55) return BREAST_LIT
				return breast.v > 0.5 ? BREAST_SHADE : BREAST
			}
			// The flanks: barred, lit above, shaded below.
			if (body.v < -0.6) return BODY_LIT
			if (body.v > 0.55) return BODY_SHADE
			return Math.floor(y) % 3 === 0 && x > 32 && x < 58 ? BAR : BODY
		}
		// Her legs, and her webbed feet, toes forward.
		for (const [lx, back] of [
			[38, 0],
			[47, 1],
		]) {
			if (y >= 50 && y < 61 && x >= lx - back && x < lx + 2 - back)
				return x < lx + 0.6 - back ? LEG_LIT : LEG
			if (y >= 61 && y < 64) {
				const spread = (y - 61) * 1.6
				if (x >= lx - 4 - spread && x < lx + 2) return LEG
			}
		}
		return undefined
	})
}

/** The goose's poses: stood; pecking at the grass; honking; laying, a wing up, honking. */
export const GOOSE = {
	stand: bigGoose({}),
	peck: bigGoose({ peck: true }),
	honk: bigGoose({ honk: true }),
	lay: bigGoose({ flap: true, honk: true }),
}

// --- Eggs ----------------------------------------------------------------------
const EGG_ROWS = [
	'..EE..',
	'.EeEE.',
	'EeEEEE',
	'EEEEEE',
	'EEEEEE',
	'EEEEEs',
	'.EEEs.',
	'..ss..',
]
/** An egg, in cells of 2 px: how wide and tall. */
export const EGG_WIDTH = EGG_ROWS[0].length * 2
export const EGG_HEIGHT = EGG_ROWS.length * 2
/** A goose egg, cream; and a golden one, worth three. */
export const EGG = letterArt(EGG_ROWS, {
	E: '#f4ecd8',
	e: '#ffffff',
	s: '#d3c4a0',
})
export const GOLDEN_EGG = letterArt(EGG_ROWS, {
	E: '#f2c230',
	e: '#fff3a0',
	s: '#c08f12',
})

// --- The fence and the bales ---------------------------------------------------------
export const FENCE = '#9a6a3a'
export const FENCE_LIT = '#c08a52'
export const FENCE_SHADE = '#6e4a28'

const BALE_COLS = 22
const BALE_ROWS = 20
export const BALE_WIDTH = BALE_COLS * 2
export const BALE_HEIGHT = BALE_ROWS * 2
/**
 * A round hay bale, seen end on: a disc of straw, rolled round, lit along
 * its top, shaded under, the swirl of it in darker straw.
 */
export const BALE = paintedArt(BALE_COLS, BALE_ROWS, (x, y) => {
	const cx = 11
	const cy = 10
	const d = Math.hypot((x - cx) / 11, (y - cy) / 10)
	if (d > 1) return undefined
	if (d > 0.88) return y < cy ? '#e8c870' : '#a07a30'
	// The roll of it, in rings, the middle of it darkest.
	if (d < 0.15) return '#a07a30'
	if (Math.floor(d * 5) % 2 === 1) return y < cy ? '#d6ae54' : '#c09440'
	return y < cy ? '#e6c56a' : '#d0a850'
})

// --- Sheep ---------------------------------------------------------------------
const SHEEP_COLS = 22
const SHEEP_ROWS = 16
export const SHEEP_WIDTH = SHEEP_COLS * 2
export const SHEEP_HEIGHT = SHEEP_ROWS * 2
const WOOL_LIT = '#ffffff'
const WOOL = '#f0ece2'
const WOOL_SHADE = '#d4cdbd'
const FACE = '#2b2a2c'
const FACE_LIT = '#48474c'

/**
 * A sheep, facing left: a fluffy white fleece in bumps, lit on top and
 * shaded under; its black face and ears, an eye; its four black legs, a
 * step one way or the other as it walks (`step`), or its head down,
 * grazing.
 */
function sheep(step: 0 | 1, grazing: boolean) {
	const bumps: [number, number, number][] = [
		[9, 5.5, 3.2],
		[12.5, 4.6, 3.4],
		[16, 5.6, 3.1],
		[18, 8, 2.8],
		[8, 8.4, 3],
		[12.5, 9, 3.6],
		[16.2, 9.4, 3],
	]
	return paintedArt(SHEEP_COLS, SHEEP_ROWS, (x, y) => {
		// Its face, and ear.
		const [hx, hy] = grazing ? [4.2, 11] : [4.4, 6.4]
		const face = ((x - hx) / 2.3) ** 2 + ((y - hy) / 2.8) ** 2 <= 1
		if (face) {
			if (
				Math.floor(x) === Math.floor(hx - 1) &&
				Math.floor(y) === Math.floor(hy - 0.6)
			)
				return WOOL_LIT
			return x > hx + 0.6 && y < hy ? FACE_LIT : FACE
		}
		if (Math.abs(x - (hx + 2.4)) < 1 && Math.abs(y - (hy - 2)) < 0.7)
			return FACE
		// Its fleece.
		if (bumps.some(([cx, cy, r]) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r)) {
			if (y < 3.6) return WOOL_LIT
			return y > 10.6 ? WOOL_SHADE : WOOL
		}
		// Its legs, stepping.
		if (y >= 11 && y < 16) {
			const legs = step ? [7.5, 11, 13.5, 17] : [8, 10.5, 14, 16.5]
			if (legs.some((lx) => x >= lx && x < lx + 1)) return FACE
		}
		return undefined
	})
}
/** A sheep walking, a step each way, and grazing. */
export const SHEEP = {
	walk: [sheep(0, false), sheep(1, false)],
	graze: sheep(0, true),
}

// --- A stack of square hay bales --------------------------------------------------
const BALE_W = 16
const BALE_H = 10
const STACK_COLS = BALE_W * 3
const STACK_ROWS = BALE_H * 3
export const HAY_STACK_WIDTH = STACK_COLS * 2
export const HAY_STACK_HEIGHT = STACK_ROWS * 2
/**
 * Square hay bales stacked up, three, two and one: each straw, lit along
 * its top, shaded down its side, tied round twice with twine, a few
 * strands sticking out.
 */
export const HAY_STACK = paintedArt(STACK_COLS, STACK_ROWS, (x, y) => {
	const row = Math.floor(y / BALE_H)
	const count = row === 2 ? 3 : row === 1 ? 2 : 1
	const left = ((3 - count) * BALE_W) / 2
	// Three on the bottom, then two, then one.
	if (x < left || x >= left + count * BALE_W) return undefined
	const bx = (x - left) % BALE_W
	const by = y % BALE_H
	if (by < 1) return '#ecd27a'
	if (bx >= BALE_W - 1.5) return '#a8843a'
	if (by >= BALE_H - 1) return '#b8923f'
	if (Math.floor(bx) === 5 || Math.floor(bx) === 10) return '#8a6a2a'
	return (Math.floor(x) * 7 + Math.floor(y) * 3) % 11 === 0
		? '#c49f48'
		: '#d9b858'
})
