import { paintedArt } from '../../courses/kit/pixelArt'

/**
 * An Andean condor, flying, facing right: the biggest wings of any bird of
 * prey, black, with the white band across them a condor has, its fingers
 * of primaries splayed at their tips; a white ruff round its neck, and its
 * bald head over it, its comb and its hooked beak. Its far wing's up over
 * its back, its near wing down under it, as a bird's are seen from just
 * above. It hardly ever flaps: it soars, its wings flexing a little, but
 * swooping in, it beats them, big and slow.
 *
 * Drawn 2 px a cell, or bigger: the giant one carrying the bus, its talons
 * down round the roof.
 */

/** Its size, in cells. */
const COLUMNS = 92
const ROWS = 60
/** How far down the art its body's middle is, in cells: room over it for its far wing raised. */
const BODY_Y = 38

const BLACK = '#1b191e'
const SHEEN = '#34303a'
const FAR = '#121014'
const WHITE = '#efebe2'
const WHITE_SHADE = '#c9c3b6'
const FAR_WHITE = '#b9b3a7'
const SKIN = '#9a5d50'
const SKIN_DARK = '#6e3a33'
const COMB = '#5b2a26'
const BEAK = '#e6d9bc'
const BEAK_DARK = '#7c6a55'
const EYE = '#f3c64a'
const TALON = '#8f8a84'
const TALON_DARK = '#4a4744'

type Point = [number, number]

/** Whether `x`, `y` is inside the polygon through `points`. */
function inside(points: Point[], x: number, y: number) {
	let hit = false
	for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
		const [xi, yi] = points[i]
		const [xj, yj] = points[j]
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
			hit = !hit
	}
	return hit
}

const inEllipse = (
	x: number,
	y: number,
	cx: number,
	cy: number,
	rx: number,
	ry: number,
) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1

/**
 * A wing, from its shoulder `root` out to its tip, `span` cells, at `angle`
 * (radians, 0 straight back, up negative): its arm broad, its hand
 * narrower, and its fingers splayed off the end. Its band of white along
 * its trailing edge, near the body. Which cells are what.
 */
function wing(root: Point, span: number, angle: number) {
	const along: Point = [-Math.cos(angle), Math.sin(angle)]
	// Its chord: across it, towards its trailing edge (down and back of the
	// leading edge as it goes out).
	const across: Point = [along[1] * 0.9 - 0.25, -along[0] * 0.9 + 0.2]
	const at = (u: number, v: number): Point => [
		root[0] + along[0] * u + across[0] * v,
		root[1] + along[1] * u + across[1] * v,
	]
	const chord = (u: number) =>
		u < span * 0.55 ? 13 : 13 - (u - span * 0.55) * 0.2
	const hand = span * 0.86
	const outline: Point[] = [
		at(0, -2),
		at(span * 0.5, -1),
		at(hand, 0),
		at(hand, chord(hand)),
		at(span * 0.5, chord(span * 0.5)),
		at(0, 14),
	]
	const band: Point[] = [
		at(3, 8.5),
		at(span * 0.66, 7.5),
		at(span * 0.66, chord(span * 0.66) - 1.5),
		at(3, 12.5),
	]
	// Five fingers, splayed, longest in the middle.
	const fingers: Point[][] = [0, 1, 2, 3, 4].map((k) => {
		const v = 1.5 + k * ((chord(hand) - 3) / 4)
		const length = 8 + (k === 1 || k === 2 ? 4 : k === 3 ? 2 : 0)
		const spread = (k - 2) * 0.16
		const tipU = hand + length * Math.cos(spread)
		const tipV = v + length * Math.sin(spread) * 1.6
		return [
			at(hand - 2, v - 1.1),
			at(tipU, tipV - 0.9),
			at(tipU + 0.6, tipV + 0.4),
			at(hand - 2, v + 1.1),
		]
	})
	return {
		wing: (x: number, y: number) =>
			inside(outline, x, y) || fingers.some((f) => inside(f, x, y)),
		band: (x: number, y: number) => inside(band, x, y),
	}
}

/**
 * A frame of it, its wings at `beat`, 0 to 1 round a wingbeat (0 and 1
 * soaring, 0.5 right down), and its talons down if it's `gripping`.
 */
function frame(beat: number, gripping: boolean) {
	const flap = Math.sin(beat * Math.PI * 2)
	// The far wing up over its back, the near one down under it; beating, up
	// together, then down.
	const farAngle = -0.62 - flap * 0.42
	const nearAngle = 0.34 - flap * 0.48
	const far = wing([50, BODY_Y - 4], 40, farAngle)
	const near = wing([52, BODY_Y - 1], 44, nearAngle)
	const tail: Point[] = [
		[30, BODY_Y - 3],
		[14, BODY_Y - 2],
		[13, BODY_Y + 3],
		[30, BODY_Y + 4],
	]
	return paintedArt(COLUMNS, ROWS, (x, y) => {
		let cell: string | undefined
		// The far wing, behind it all, in shadow, its band greyer.
		const f = far.wing(x, y)
		if (f) cell = far.band(x, y) ? FAR_WHITE : FAR
		if (inside(tail, x, y)) cell = y < BODY_Y - 1 ? SHEEN : BLACK
		// Its body, the light catching its back.
		if (inEllipse(x, y, 46, BODY_Y, 19, 6.5))
			cell = y < BODY_Y - 3 ? SHEEN : BLACK
		// Its talons: tucked up under it; or down, gripping.
		if (gripping) {
			for (const lx of [40, 50]) {
				if (x > lx && x < lx + 3 && y > BODY_Y + 4 && y < BODY_Y + 16)
					cell = TALON
				if (x > lx - 2 && x < lx + 6 && y > BODY_Y + 15 && y < BODY_Y + 18)
					cell = TALON_DARK
				if ((x > lx - 2 && x < lx) || (x > lx + 4 && x < lx + 6))
					if (y > BODY_Y + 17 && y < BODY_Y + 20) cell = TALON_DARK
			}
		} else if (x > 52 && x < 58 && y > BODY_Y + 4 && y < BODY_Y + 7)
			cell = TALON
		// Its ruff, white and fluffed out, round the bottom of its neck.
		if (inEllipse(x, y, 64, BODY_Y - 3, 5, 5))
			cell = y > BODY_Y && x < 64 ? WHITE_SHADE : WHITE
		// Its bare neck, and its head, its comb on top.
		if (inEllipse(x, y, 70, BODY_Y - 8, 3, 3.5)) cell = SKIN_DARK
		if (inEllipse(x, y, 74, BODY_Y - 10, 4.5, 3.2)) cell = SKIN
		if (inEllipse(x, y, 73, BODY_Y - 13.5, 3, 1.6)) cell = COMB
		if (x > 72 && x < 75 && y > BODY_Y - 9 && y < BODY_Y - 7) cell = SKIN_DARK
		// Its eye.
		if (x > 74 && x < 76 && y > BODY_Y - 12 && y < BODY_Y - 10) cell = EYE
		// Its beak, hooked over at the tip.
		if (x > 77 && x < 82 && y > BODY_Y - 11 && y < BODY_Y - 8) cell = BEAK
		if (x > 81 && x < 83 && y > BODY_Y - 10 && y < BODY_Y - 6) cell = BEAK_DARK
		// The near wing, over its body, its band bright.
		const n = near.wing(x, y)
		if (n) cell = near.band(x, y) ? WHITE : BLACK
		// The leading edge of the near wing, catching the light.
		if (n && !near.wing(x, y - 1.2)) cell = SHEEN
		return cell
	})
}

/** How many frames round a wingbeat. */
const BEATS = 12
/**
 * Each frame round a wingbeat, soaring at 0, its talons down if
 * `gripping`: painted the first time they're wanted, not on every course.
 */
const painted: Partial<Record<'soaring' | 'gripping', string[]>> = {}
export function condorFrames(gripping: boolean) {
	const key = gripping ? 'gripping' : 'soaring'
	painted[key] ??= Array.from({ length: BEATS }, (_, i) =>
		frame(i / BEATS, gripping),
	)
	return painted[key]
}

/** How big it's drawn, a cell 2 px: and where whoever's riding sits. */
export const CONDOR_WIDTH = COLUMNS * 2
export const CONDOR_HEIGHT = ROWS * 2
/** Its back, between its wings, where whoever's riding sits: from its art's left, and up from its bottom. */
export const CONDOR_SEAT_X = 57 * 2
export const CONDOR_SEAT_Y = (ROWS - (BODY_Y - 5)) * 2

/** How slowly it beats its wings, a frame each this many ticks: big, slow wings. */
const BEAT_TICKS = 4

/**
 * Which of its frames it's on, `now` ticks in: soaring, its wings flexing
 * a little; or `beating` them, round and round.
 */
export function condorFrame(now: number, beating: boolean) {
	if (beating) return Math.floor(now / BEAT_TICKS) % BEATS
	// Soaring, just a little flex either side of level.
	const flex = Math.sin(now / 24)
	return flex > 0.6 ? 1 : flex < -0.6 ? BEATS - 1 : 0
}

/** Its art, `now` ticks in, at `scale` px a cell. */
export function CondorArt(props: {
	now: number
	carrying?: boolean
	beating?: boolean
	gripping?: boolean
	scale?: number
}) {
	const scale = () => props.scale ?? 2
	const src = () =>
		condorFrames(!!props.gripping)[condorFrame(props.now, !!props.beating)]
	return (
		<img
			src={src()}
			alt=""
			class="pixelated"
			width={COLUMNS * scale()}
			height={ROWS * scale()}
			style={{ display: 'block', 'max-width': 'none' }}
		/>
	)
}

/** Its size in cells, for drawing it bigger. */
export const CONDOR_CELLS = { width: COLUMNS, height: ROWS, body: BODY_Y }
