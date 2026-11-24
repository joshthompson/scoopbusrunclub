import { type PixelRect, pixelArt } from '../../courses/kit/pixelArt'

/**
 * Mr Claws' Crab Hat, drawn in code: a crab on the wearer's head, facing
 * left like the runners, an orange-red shell lit on top and dark under
 * it, eyes on stalks, and two chunky pincers on arms, one forward (left)
 * and one back (right), as it's a side view. Five frames, all one canvas
 * size, painted a cell at a time: claws out to the sides and slightly open
 * (`rest`), raised and wide open (`open`), shot out on long arms and
 * shut (`snap1`, `snap2`, then right out, `snap`), pulled in across the face (`guard`), and raised
 * overhead gripping (`carry`). Each in `TIRED_STEPS` colourings, from its
 * own bright red to a washed-out grey: how much Guard it has left. Cells
 * are 2 px, as everywhere.
 */

const CELL = 2

/** The canvas, in cells: wide enough for a thrust claw, tall enough to hold a runner up, and low enough for a guard across the face. */
const COLUMNS = 84
const ROWS = 48
/** Where the middle of the top of the head goes, in cells. */
const HEAD_COLUMN = 42
/** How far across everything's drawn from where it's said to be: the art's laid out about column 32. */
const ACROSS = HEAD_COLUMN - 32
const HEAD_ROW = 34
/** How far over the head the carry claws grip, in cells. */
const GRIP_ROWS = 11

export const CRAB_HAT_WIDTH = COLUMNS * CELL
export const CRAB_HAT_HEIGHT = ROWS * CELL
export const CRAB_HAT_HEAD_X = HEAD_COLUMN * CELL
export const CRAB_HAT_HEAD_Y = HEAD_ROW * CELL
export const CRAB_HAT_GRIP_Y = GRIP_ROWS * CELL

/** The crab's shell and claws: lit on top, base, shaded underneath; the seam of a shut claw. */
const SHELL_LIT = '#ff8a52'
const SHELL = '#e8502e'
const SHELL_SHADE = '#a8302a'
const SEAM = '#6e1d24'
/** Out of Guard, worn out: the grey the shell and claws fade towards, and how far at each step. */
const TIRED = '#b3a7a2'
const TIRED_SHARES = [0, 0.35, 0.6, 0.85]
export const TIRED_STEPS = TIRED_SHARES.length

/** `hex` (`#rrggbb`) mixed `share` of the way to `toward`. */
function mix(hex: string, toward: string, share: number) {
	const channel = (h: string, i: number) =>
		Number.parseInt(h.slice(1 + i * 2, 3 + i * 2), 16)
	return `#${[0, 1, 2]
		.map((i) =>
			Math.round(
				channel(hex, i) + (channel(toward, i) - channel(hex, i)) * share,
			)
				.toString(16)
				.padStart(2, '0'),
		)
		.join('')}`
}

/** The eyestalks, an eye's white and its dark pupil. */
const STALK = '#c43c28'
const EYE = '#fff6ea'
const PUPIL = '#1d1d1d'

/** What a cell is made of while it's being drawn: the shell, the back claw, the front claw, and the bits with colours of their own. */
type Part = 'S' | 'B' | 'F' | 'T' | 'E' | 'P' | 'M'

function canvas() {
	const parts: (Part | undefined)[] = new Array(COLUMNS * ROWS)
	/** What's at column `x` of the grid itself, row `y`. */
	const atCell = (x: number, y: number) =>
		x >= 0 && x < COLUMNS && y >= 0 && y < ROWS
			? parts[y * COLUMNS + x]
			: undefined
	/** And where it's said to be, about column 32: see `ACROSS`. */
	const at = (x: number, y: number) => atCell(x + ACROSS, y)
	const put = (x: number, y: number, part: Part | undefined) => {
		const gx = x + ACROSS
		if (gx >= 0 && gx < COLUMNS && y >= 0 && y < ROWS)
			parts[y * COLUMNS + gx] = part
	}
	/** A disc, or an ellipse if `ry` is given. */
	const disc = (part: Part, cx: number, cy: number, rx: number, ry = rx) => {
		for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
			for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
				if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1)
					put(x, y, part)
	}
	/** A thick line, tapering from `r0` to `r1`, as discs along it. */
	const line = (
		part: Part,
		x0: number,
		y0: number,
		x1: number,
		y1: number,
		r0: number,
		r1: number,
	) => {
		const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2) + 1
		for (let i = 0; i <= steps; i++) {
			const t = i / steps
			disc(part, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r0 + (r1 - r0) * t)
		}
	}
	/**
	 * A pincer: a palm at `px`, `py` and two prongs fanned `spread` radians
	 * either side of `angle` (0 is right, π left, negative up), `length`
	 * cells long. Shut, it has a seam between its prongs.
	 */
	const claw = (
		part: 'B' | 'F',
		px: number,
		py: number,
		angle: number,
		spread: number,
		length: number,
		shut: boolean,
	) => {
		const palm = 3.9
		disc(part, px, py, palm)
		for (const s of [-1, 1]) {
			const a = angle + s * spread
			line(
				part,
				px,
				py,
				px + Math.cos(a) * length,
				py + Math.sin(a) * length,
				palm * 0.78,
				1.0,
			)
		}
		if (shut) {
			const from = palm * 0.55
			for (let d = from; d < length + 1; d += 0.5) {
				const x = Math.floor(px + Math.cos(angle) * d)
				const y = Math.floor(py + Math.sin(angle) * d)
				if (at(x, y) === part) put(x, y, 'M')
			}
		}
	}
	/** The arm from the shoulder to the wrist. */
	const arm = (
		part: 'B' | 'F',
		x0: number,
		y0: number,
		x1: number,
		y1: number,
	) => line(part, x0, y0, x1, y1, 1.7, 1.5)

	/** The shell, its legs and its eyes on stalks. */
	const body = () => {
		// Two stubby legs gripping the head.
		for (const x of [26, 27, 36, 37]) put(x, HEAD_ROW + 1, 'S')
		for (const x of [26, 27, 36, 37]) put(x, HEAD_ROW + 2, 'S')
		disc('S', 32, 30.4, 8.5, 5.2)
		// Eyes on stalks, leaning forward.
		for (const x of [27, 31]) for (let y = 21; y < 26; y++) put(x, y, 'T')
		for (const x of [26, 30]) {
			for (let j = 0; j < 3; j++)
				for (let i = 0; i < 3; i++) put(x + i, 18 + j, 'E')
			put(x, 19, 'P')
		}
	}

	/**
	 * Parts to colours: shaded top and bottom edges on the crab, the rest
	 * as they are; all but its eyes faded `tired` of the way to grey.
	 */
	const colours = (tired: number) => {
		const lit = mix(SHELL_LIT, TIRED, tired)
		const base = mix(SHELL, TIRED, tired)
		const shade = mix(SHELL_SHADE, TIRED, tired * 0.8)
		const seam = mix(SEAM, TIRED, tired * 0.6)
		const stalk = mix(STALK, TIRED, tired)
		const out: (string | undefined)[] = new Array(COLUMNS * ROWS)
		for (let y = 0; y < ROWS; y++)
			for (let x = 0; x < COLUMNS; x++) {
				const part = atCell(x, y)
				if (!part) continue
				let fill: string
				if (part === 'T') fill = stalk
				else if (part === 'E') fill = EYE
				else if (part === 'P') fill = PUPIL
				else if (part === 'M') fill = seam
				else if (atCell(x, y - 1) !== part) fill = lit
				else if (atCell(x, y + 1) !== part) fill = shade
				else if (part === 'S' && atCell(x, y + 2) !== part) fill = shade
				else fill = base
				out[y * COLUMNS + x] = fill
			}
		// A few lit bumps and dark pits on the shell.
		const mark = (x: number, y: number, fill: string) => {
			if (at(x, y) === 'S') out[y * COLUMNS + x + ACROSS] = fill
		}
		for (const [x, y] of [
			[26, 28],
			[27, 28],
			[26, 29],
			[34, 27],
		])
			mark(x, y, lit)
		for (const [x, y] of [
			[36, 29],
			[39, 30],
			[33, 31],
			[29, 32],
		])
			mark(x, y, shade)
		return out
	}

	/** Its picture: runs along a row, a run the same as the one above it growing down. */
	const url = (tired: number) => {
		const cells = colours(tired)
		const rects: PixelRect[] = []
		const open = new Map<string, PixelRect>()
		for (let y = 0; y < ROWS; y++) {
			let from = 0
			for (let x = 0; x <= COLUMNS; x++) {
				const here = x < COLUMNS ? cells[y * COLUMNS + x] : undefined
				const start = cells[y * COLUMNS + from]
				if (x === COLUMNS || here !== start) {
					if (start) {
						const key = `${from},${x - from},${start}`
						const above = open.get(key)
						if (above && above[1] + above[3] === y) above[3]++
						else {
							const rect: PixelRect = [from, y, x - from, 1, start]
							rects.push(rect)
							open.set(key, rect)
						}
					}
					from = x
				}
			}
		}
		return pixelArt(COLUMNS, ROWS, rects)
	}
	/** Its picture at each step of tiredness. */
	const urls = () => TIRED_SHARES.map(url)
	return { claw, arm, body, urls, disc }
}

/** Where the arms leave the shell: front (left) and back (right). */
const FRONT_SHOULDER = [25, 31] as const
const BACK_SHOULDER = [39, 31] as const

/** Claws out to the sides at head height, a little raised, slightly open. */
function rest() {
	const c = canvas()
	c.arm('B', ...BACK_SHOULDER, 47, 30)
	c.claw('B', 48, 29, -0.3, 0.45, 8, false)
	c.body()
	c.arm('F', ...FRONT_SHOULDER, 17, 30)
	c.claw('F', 16, 29, Math.PI + 0.3, 0.45, 8, false)
	return c.urls()
}

/** The wind-up: claws raised and wide open. */
function open() {
	const c = canvas()
	c.arm('B', ...BACK_SHOULDER, 48, 21)
	c.claw('B', 49, 19, -1.05, 0.6, 9, false)
	c.body()
	c.arm('F', ...FRONT_SHOULDER, 16, 21)
	c.claw('F', 15, 19, Math.PI + 1.05, 0.6, 9, false)
	return c.urls()
}

/**
 * Shot out sideways and shut, `out` of the way (0 just shut, 1 right out
 * on long arms): the tips 34 cells (68 px) either side of the head, fully
 * out, as far as a Pinch reaches. Its frames, one after another, are the
 * arms shooting out, and back in.
 */
function snap(out: number) {
	const c = canvas()
	const wrist = 15 + 10 * out
	c.arm('B', ...BACK_SHOULDER, 32 + wrist - 1, 31)
	c.claw('B', 32 + wrist + 1.5, 31, 0, 0.3, 7, true)
	c.body()
	c.arm('F', ...FRONT_SHOULDER, 32 - wrist + 1, 31)
	c.claw('F', 32 - wrist - 1.5, 31, Math.PI, 0.3, 7, true)
	return c.urls()
}

/** Pulled in, crossed in front of the face like a shield. */
function guard() {
	const c = canvas()
	c.body()
	// The back claw comes across, low to high, behind the front one.
	c.arm('B', ...BACK_SHOULDER, 37, 40)
	c.claw('B', 37, 40, Math.PI + 0.7, 0.25, 11, true)
	c.arm('F', ...FRONT_SHOULDER, 27, 40)
	c.claw('F', 27, 40, -0.7, 0.25, 11, true)
	return c.urls()
}

/** Both claws straight up overhead, shut on whoever's held. */
function carry() {
	const c = canvas()
	c.arm('B', ...BACK_SHOULDER, 39, 16)
	c.claw('B', 38.5, 14.5, Math.PI + 1.3, 0.2, 9, true)
	c.body()
	c.arm('F', ...FRONT_SHOULDER, 25, 16)
	c.claw('F', 25.5, 14.5, -1.3, 0.2, 9, true)
	return c.urls()
}

/**
 * Each pose's pictures, one for each step of tiredness, bright first. What
 * a picture is: the same as `paintPicture` takes.
 */
export const CRAB_HAT_FRAMES: Record<
	'rest' | 'open' | 'snap1' | 'snap2' | 'snap' | 'guard' | 'carry',
	string[]
> = {
	rest: rest(),
	open: open(),
	snap1: snap(0.25),
	snap2: snap(0.6),
	snap: snap(1),
	guard: guard(),
	carry: carry(),
}
