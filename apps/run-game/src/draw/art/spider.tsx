import { paintedArt } from '../../courses/kit/pixelArt'

/**
 * A huge spider, a hazard down on The Caves' floor: a great hairy
 * tarantula, side on and facing left, the way you come, scuttling back
 * and forth. Its front, low at its left, with the cluster of its eyes
 * glowing on top and its fangs hanging under; its huge round abdomen up
 * behind, striped; and eight legs, their knees up high over it all,
 * banded orange, the far four darker, behind it. A lit rim of hair along
 * its top, so it shows up against the dark of the cave's wall. Run into
 * its legs or its face and you're down; jump on its head or its back and
 * you bounce off. In cells twice the size of a screen pixel, as the
 * runners are.
 */

const CELL = 2
const COLUMNS = 60
const ROWS = 32

export const SPIDER_WIDTH = COLUMNS * CELL
export const SPIDER_HEIGHT = ROWS * CELL

/**
 * The top of its head, to land on: `from`/`to` across it from the
 * picture's left, `top` up from its feet. In screen pixels, in its walk's
 * frames; a cell lower as it bobs down.
 */
export const SPIDER_HEAD = { from: 20, to: 52, top: 36 }
/**
 * The top of its abdomen, to land on, as `SPIDER_HEAD` is: round, so a
 * few pixels lower out at its ends.
 */
export const SPIDER_BODY = { from: 68, to: 110, top: 58 }
/**
 * What knocks you down if you run into it: its front legs, its fangs and
 * its face, up to under its head's top. In screen pixels, as
 * `SPIDER_HEAD` is.
 */
export const SPIDER_BITE = { from: 0, to: 30, top: 30 }

const BODY = '#4a3852'
const BODY_LIT = '#6a5676'
const BODY_SHADE = '#35283c'
const HAIR = '#c9b4d2'
const FAR = '#3a2d3c'
const FAR_BAND = '#a24d26'
const BAND = '#ee8a36'
const BAND_LIT = '#ffbc6a'
const EYE = '#f9f06a'
const GLINT = '#ffffff'
const FANG = '#efe2c8'
const INK = '#1a1418'

type Point = [number, number]
type Colour = string | undefined

/** How far `p` is from the line `a` to `b`. */
function toSegment(p: Point, a: Point, b: Point) {
	const dx = b[0] - a[0]
	const dy = b[1] - a[1]
	const t = Math.max(
		0,
		Math.min(
			1,
			((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy),
		),
	)
	return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)
}

/** A leg: its hip, its knee up high, its ankle, and its foot. */
interface Leg {
	hip: Point
	knee: Point
	ankle: Point
	foot: Point
}

/**
 * Whether the cell at `x`, `y` is in `leg`, and if it is, which part:
 * its knee and ankle are banded; its top edge is lit, hairy.
 */
function legAt(leg: Leg, x: number, y: number) {
	const parts: [Point, Point, number][] = [
		[leg.hip, leg.knee, 1.5],
		[leg.knee, leg.ankle, 1.3],
		[leg.ankle, leg.foot, 0.9],
	]
	const inLeg = (px: number, py: number) =>
		parts.some(([a, b, w]) => toSegment([px, py], a, b) < w)
	if (!inLeg(x, y)) return undefined
	const nearKnee = Math.hypot(x - leg.knee[0], y - leg.knee[1]) < 2
	const nearAnkle = Math.hypot(x - leg.ankle[0], y - leg.ankle[1]) < 1.3
	const top = !inLeg(x, y - 1)
	const under = !inLeg(x, y + 1)
	return { band: nearKnee || nearAnkle, top, under }
}

/**
 * Its legs, near side, at rest: I and II reaching forward, III and IV
 * back. The far side's are the same, a little further back.
 */
const LEGS: Leg[] = [
	{ hip: [13, 22], knee: [7, 7], ankle: [3, 18], foot: [1.5, 31.5] },
	{ hip: [17, 21], knee: [15, 6], ankle: [11, 18], foot: [9.5, 31.5] },
	{ hip: [21, 21], knee: [26, 7], ankle: [31, 19], foot: [33.5, 31.5] },
	{ hip: [24, 21], knee: [32, 10], ankle: [40, 20], foot: [44.5, 31.5] },
]

/**
 * Its legs at `step` of its walk (0–3), stepping as a spider does, in
 * two sets of four (I and III on one side with II and IV on the other),
 * one set planted, pushing, while the other's lifted, swinging forward.
 * `far` is the far side's; `splay` spreads them out flat, squashed.
 */
function legsAt(step: number, far: boolean, bob: number, splay: number) {
	return LEGS.map((leg, i): Leg => {
		const set = (i + (far ? 1 : 0)) % 2
		const phase = (step + set * 2) % 4
		// Forward, mid-push, back, then lifted, swinging forward.
		const reach = [-2, 0, 2, 0][phase]
		const lift = phase === 3 ? 2 : 0
		const shift = far ? 2 : 0
		const out = i < 2 ? -splay : splay
		const move = ([x, y]: Point, along: number, up: number): Point => [
			x + shift + reach * along + out * along,
			y - up,
		]
		return {
			hip: move(leg.hip, 0, -bob),
			knee: move(leg.knee, 0.6, lift / 2 - bob - splay * 2.2),
			ankle: move(leg.ankle, 0.8, lift - splay * 0.4),
			foot: move(leg.foot, 1, lift),
		}
	})
}

/** A cell, `x` and `y` its middle, painted with `paint`, or left. */
type Paint = (x: number, y: number) => Colour

/** The spider at `step` of its walk, bobbing `bob` cells down; or squashed flat. */
function spider(step: number, bob: number, squashed = false) {
	const splay = squashed ? 3 : 0
	const down = squashed ? 3 : bob
	const nearLegs = legsAt(step, false, down, splay)
	const farLegs = legsAt(step, true, down, splay)

	// Its abdomen, round and huge, up behind; flatter, pressed down, squashed.
	const ax = 44
	const ay = 13 + down + (squashed ? 1 : 0)
	const arx = squashed ? 15.5 : 14
	const ary = squashed ? 8.5 : 10.4
	const inAbdomen = (x: number, y: number) =>
		((x - ax) / arx) ** 2 + ((y - ay) / ary) ** 2 < 1
	// Its head, its cephalothorax, low and out front.
	const hx = 18.5
	const hy = 19.5 + down
	const hry = squashed ? 4.4 : 5.2
	const inHead = (x: number, y: number) =>
		((x - hx) / 8.6) ** 2 + ((y - hy) / hry) ** 2 < 1
	// The bump at the front of its head that its eyes are on.
	const inTurret = (x: number, y: number) =>
		x > 10 && x < 15 && y > hy - hry - 2 && y < hy - 2

	const layers: Paint[] = [
		// The far legs, dark, behind it all.
		(x, y) => {
			for (const leg of farLegs) {
				const at = legAt(leg, x, y)
				if (at) return at.band ? FAR_BAND : FAR
			}
		},
		// Its abdomen: hairy, its rim lit, shadowed under, striped across.
		(x, y) => {
			const d = ((x - ax) / arx) ** 2 + ((y - ay) / ary) ** 2
			// Hairs, bristling up off its top.
			if (d >= 1 && d < 1.2 && y < ay - 2 && Math.floor(x) % 3 === 1)
				return HAIR
			if (d >= 1) return undefined
			if (!inAbdomen(x, y - 1)) return HAIR
			if (!inAbdomen(x, y - 2)) return BODY_LIT
			if (y > ay + ary - 3) return BODY_SHADE
			// Stripes, curving round it as if round a ball, orange.
			const yy = (y - ay) / ary
			const round = Math.asin(
				Math.max(-1, Math.min(1, (x - ax) / arx / Math.sqrt(1 - yy * yy))),
			)
			for (const at of [-0.85, -0.3, 0.25, 0.8])
				if (Math.abs(round - at) < 0.1) return yy < 0.1 ? BAND : FAR_BAND
			return y < ay - ary * 0.4 ? BODY_LIT : BODY
		},
		// Its waist, between them.
		(x, y) =>
			x > 26 && x < 31 && y > hy - 2 && y < hy + 1 ? BODY_SHADE : undefined,
		// The near legs, banded orange at the knee and ankle, lit along
		// their tops, coming out from under its head.
		(x, y) => {
			for (const leg of nearLegs) {
				const at = legAt(leg, x, y)
				if (at)
					return at.band
						? at.top
							? BAND_LIT
							: BAND
						: at.top
							? BODY_LIT
							: at.under
								? BODY_SHADE
								: BODY
			}
		},
		// Its head, its rim lit, shadowed under.
		(x, y) => {
			if (inTurret(x, y)) return !inTurret(x, y - 1) ? HAIR : BODY_LIT
			if (!inHead(x, y)) return undefined
			if (!inHead(x, y - 1) && !inTurret(x, y - 1)) return HAIR
			if (y > hy + hry - 2) return BODY_SHADE
			return y < hy + 0.5 ? BODY_LIT : BODY
		},
		// Its pedipalps, the little legs either side of its jaws, feeling ahead.
		(x, y) => {
			const palp: Leg = {
				hip: [11, hy + 1],
				knee: [6, hy - 1 + splay],
				ankle: [3, hy + 3 + splay / 2],
				foot: [2.5, hy + 6],
			}
			const at = legAt(palp, x, y)
			if (at) return at.top ? BODY_LIT : BODY
		},
		// Its jaws, two great hairy lumps under its front, and the fangs
		// curled under them.
		(x, y) => {
			const row = Math.floor(y) - Math.floor(hy) - 1
			const col = Math.floor(x) - 7
			const jaws = squashed
				? ['LBBBBB', 'LBBBSS', '.FF...', '..FF..']
				: ['LBBBBB', 'LBBBBB', 'LBBBSS', '.FF...', '.FF...', '..FF..']
			const cell = jaws[row]?.[col]
			return cell === 'L'
				? BODY_LIT
				: cell === 'B'
					? BODY
					: cell === 'S'
						? BODY_SHADE
						: cell === 'F'
							? FANG
							: undefined
		},
		// Its eyes, a cluster of them up on the bump, glowing; or screwed shut.
		(x, y) => {
			const row = Math.floor(y - (hy - hry - 2))
			const col = Math.floor(x) - 10
			const eyes = squashed ? ['.....', '.....', 'II.II'] : ['.E.E.', 'EWEWE']
			const cell = eyes[row]?.[col]
			return cell === 'E'
				? EYE
				: cell === 'W'
					? GLINT
					: cell === 'I'
						? INK
						: undefined
		},
	]

	return paintedArt(COLUMNS, ROWS, (x, y) => {
		let colour: Colour
		for (const layer of layers) colour = layer(x, y) ?? colour
		return colour
	})
}

/**
 * Its walk: four frames, a set of legs stepping forward and then the
 * other, its body bobbing down a cell as each set comes down.
 */
export const SPIDER_FRAMES: string[] = [0, 1, 2, 3].map((step) =>
	spider(step, step % 2),
)

/**
 * Bounced on: pressed down flat, its legs splayed out under it, its eyes
 * screwed shut. As big as its walk's frames.
 */
export const SPIDER_SQUASHED: string = spider(0, 0, true)
