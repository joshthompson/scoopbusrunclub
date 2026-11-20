import { paintedArt } from '../../courses/kit/pixelArt'

/**
 * Red Light, Green Light's doll (see `minigames/redLightGreenLight`): a
 * giant rag doll, head far too big for her, in a teal polka-dot dress, red
 * and white striped tights and purple shoes, a bow on her crown, yellow
 * wool pigtails with a bow each. Drawn in four poses, all 64 by 90 cells
 * and standing on their last row: her back turned, singing; half turned
 * (the warning); facing, glaring (her pupils are drawn over it, to look
 * where they're told); and firing, her mouth a round hole the ball comes
 * out of, arms flung out. Her ball's drawn here too: a red dodgeball.
 * Lit from above and to the left, as everything is.
 */

const CELL = 2

export const DOLL_WIDTH_CELLS = 64
export const DOLL_HEIGHT_CELLS = 90
export const DOLL_WIDTH = DOLL_WIDTH_CELLS * CELL
export const DOLL_HEIGHT = DOLL_HEIGHT_CELLS * CELL

/** Her skin, lit and shaded; her cheeks. */
const SKIN = '#f6c9a0'
const SKIN_LIT = '#ffdfbf'
const SKIN_SHADE = '#d9a47c'
const CHEEK = '#f27a8a'
/** Her yellow wool: lit, base and shade. */
const WOOL = '#f2b32a'
const WOOL_LIT = '#ffd24f'
const WOOL_SHADE = '#c98a14'
/** Her dress, its dots, its patch and collar. */
const DRESS = '#2fb5b0'
const DRESS_LIT = '#5fd3cb'
const DRESS_SHADE = '#1f8f8c'
const WHITE = '#fffaf0'
const WHITE_SHADE = '#d8d2c4'
const PATCH = '#f4c92a'
const PATCH_SHADE = '#d09a1c'
/** Bows: red, lit and shaded. */
const BOW = '#e8423f'
const BOW_LIT = '#ff7a6a'
const BOW_SHADE = '#a82430'
/** Her tights' stripes, and her shoes. */
const TIGHTS = '#e8423f'
const SHOE = '#6a46a8'
const SHOE_LIT = '#8a6ad0'
const SHOE_SHADE = '#47307a'
const INK = '#2b2722'
/** Her eyes' whites and her mouth's inside. */
const EYE = '#ffffff'
const MOUTH = '#4a1620'
const TONGUE = '#e8566a'

/** Her ball: red, lit and shaded, with a white band. */
const BALL_RED = '#e8423f'
const BALL_LIT = '#ff7a6a'
const BALL_SHADE = '#a82430'

/** A grid of cells being painted on, later shapes over earlier. */
function grid(width: number, height: number) {
	const cells = new Map<number, string>()
	const set = (x: number, y: number, fill: string) => {
		if (x < 0 || y < 0 || x >= width || y >= height) return
		cells.set(y * width + x, fill)
	}
	const p = {
		set,
		get: (x: number, y: number) => cells.get(y * width + x),
		rect(x: number, y: number, w: number, h: number, fill: string) {
			for (let j = 0; j < h; j++)
				for (let i = 0; i < w; i++) set(x + i, y + j, fill)
		},
		/** An oval, its middle at `cx`, `cy`, `rx` and `ry` across: coloured by `fill(x, y)`, or flat. */
		oval(
			cx: number,
			cy: number,
			rx: number,
			ry: number,
			fill: string | ((x: number, y: number, dx: number, dy: number) => string),
		) {
			for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
				for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
					const dx = (x + 0.5 - cx) / rx
					const dy = (y + 0.5 - cy) / ry
					if (dx * dx + dy * dy <= 1)
						set(x, y, typeof fill === 'string' ? fill : fill(x, y, dx, dy))
				}
		},
		url: () =>
			paintedArt(width, height, (x, y) =>
				cells.get(Math.floor(y) * width + Math.floor(x)),
			),
	}
	return p
}
export type Grid = ReturnType<typeof grid>
export { grid }

/** A shaded oval: lit at its top left, shaded at its bottom right. */
const lit =
	(base: string, light: string, shade: string) =>
	(_x: number, _y: number, dx: number, dy: number) => {
		const l = -(dx * 0.6 + dy * 0.8)
		return l > 0.55 ? light : l < -0.45 ? shade : base
	}

type View = 'back' | 'side' | 'front' | 'fire'

/** A bow, its middle at `cx`, `y` its top: two loops and a knot, 14 wide, 7 tall. */
function bow(p: Grid, cx: number, y: number) {
	p.oval(cx - 4, y + 3, 4, 3.4, lit(BOW, BOW_LIT, BOW_SHADE))
	p.oval(cx + 4, y + 3, 4, 3.4, lit(BOW, BOW_LIT, BOW_SHADE))
	p.rect(cx - 1, y + 2, 2, 3, BOW_SHADE)
	// A white polka dot on each loop.
	p.set(cx - 5, y + 2, WHITE)
	p.set(cx + 4, y + 3, WHITE)
}

/** One wool pigtail, hanging from `x`, `y` to `y + len`, a sausage `w` wide, striped across with shade. */
function pigtail(p: Grid, x: number, y: number, w: number, len: number) {
	for (let j = 0; j < len; j++) {
		const half = w / 2 - (j > len - 4 ? (j - (len - 4)) * 0.8 : 0)
		const cx = x + w / 2
		for (let i = Math.round(cx - half); i < Math.round(cx + half); i++)
			p.set(
				i,
				y + j,
				j % 4 === 3 ? WOOL_SHADE : i < cx - half + 1.2 ? WOOL_LIT : WOOL,
			)
	}
}

/** Her dress, its middle at 32, from her collar at `top` to her hem. */
function dress(p: Grid, view: View, top: number, bottom: number, mid = 32) {
	for (let y = top; y < bottom; y++) {
		const half = 9 + Math.round((y - top) * 0.34)
		for (let x = mid - half; x < mid + half; x++) {
			const edge = x - (mid - half)
			p.set(
				x,
				y,
				edge < 2 ? DRESS_LIT : x >= mid + half - 3 ? DRESS_SHADE : DRESS,
			)
		}
	}
	// A scalloped white hem.
	for (let x = mid - 18; x < mid + 18; x++) {
		const half = 9 + Math.round((bottom - 1 - top) * 0.34)
		if (x < mid - half || x >= mid + half) continue
		p.set(x, bottom - 2, WHITE)
		p.set(x, bottom - 1, (x >> 1) % 2 === 0 ? WHITE : WHITE_SHADE)
	}
	// Polka dots.
	for (const [dx, dy] of [
		[-8, 4],
		[-2, 2],
		[5, 5],
		[-5, 11],
		[2, 10],
		[9, 13],
		[-10, 17],
		[-1, 17],
		[6, 20],
	]) {
		const x = mid + dx
		const y = top + dy
		if (y < bottom - 4) {
			p.rect(x, y, 2, 2, WHITE)
		}
	}
	if (view === 'back') {
		// A big sash bow across her back.
		p.rect(mid - 9, top + 8, 18, 3, BOW_SHADE)
		bow(p, mid, top + 4)
		p.rect(mid - 3, top + 11, 2, 7, BOW)
		p.rect(mid + 2, top + 11, 2, 7, BOW_SHADE)
	} else {
		// A yellow patch, stitched on.
		p.rect(mid + 3, top + 14, 7, 7, PATCH)
		p.rect(mid + 3, top + 20, 7, 1, PATCH_SHADE)
		for (let i = 0; i < 7; i += 2) {
			p.set(mid + 3 + i, top + 14, PATCH_SHADE)
			p.set(mid + 3 + i, top + 20, INK)
		}
	}
}

/** Her ruffled collar, round her neck at `top`. */
function collar(p: Grid, mid: number, top: number, half: number) {
	p.rect(mid - half, top, half * 2, 3, WHITE)
	for (let x = mid - half; x < mid + half; x += 2)
		p.set(x, top + 3, WHITE_SHADE)
	p.rect(mid - half, top + 2, half * 2, 1, WHITE_SHADE)
}

/** A leg in striped tights, `x` across, from `top` down to the shoe. */
function leg(p: Grid, x: number, top: number, bottom: number, w = 8) {
	for (let y = top; y < bottom; y++)
		for (let i = 0; i < w; i++)
			p.set(
				x + i,
				y,
				((y - top) >> 1) % 2 === 0 ? TIGHTS : i === 0 ? WHITE : WHITE_SHADE,
			)
}

/** A purple shoe, its toe at `toe` going `dir`, on the ground row `ground`. */
function shoe(p: Grid, x: number, ground: number, w: number, dir: 1 | -1) {
	p.rect(x, ground - 5, w, 5, SHOE)
	p.rect(x, ground - 5, w, 1, SHOE_LIT)
	p.rect(x, ground - 1, w, 1, SHOE_SHADE)
	// Its strap, white, across the top of her foot.
	const strap = dir === 1 ? x + 2 : x + w - 4
	p.rect(strap, ground - 5, 2, 3, WHITE)
}

/** An arm, a sleeve's puff then a bare arm to a round hand: from `x`, `y`, to the hand at `hx`, `hy`. */
function arm(p: Grid, x: number, y: number, hx: number, hy: number) {
	const steps = Math.max(Math.abs(hx - x), Math.abs(hy - y))
	for (let i = 0; i <= steps; i++) {
		const t = steps ? i / steps : 0
		const ax = Math.round(x + (hx - x) * t)
		const ay = Math.round(y + (hy - y) * t)
		p.rect(ax - 2, ay - 1, 4, 3, i < 4 ? DRESS : SKIN)
		if (i >= 4) p.set(ax + 1, ay, SKIN_SHADE)
	}
	p.oval(hx, hy + 1, 3, 3, lit(SKIN, SKIN_LIT, SKIN_SHADE))
	p.oval(x, y, 4.5, 4, lit(DRESS, DRESS_LIT, DRESS_SHADE))
}

/** Her whole doll in `view`. */
function drawDoll(view: View) {
	const p = grid(DOLL_WIDTH_CELLS, DOLL_HEIGHT_CELLS)
	const side = view === 'side'
	/** Where her body's middle is: shifted a little as she turns. */
	const mid = side ? 31 : 32

	// Her legs and shoes.
	if (side) {
		leg(p, mid - 7, 70, 85)
		leg(p, mid + 1, 70, 85)
		shoe(p, mid - 11, 90, 12, -1)
		shoe(p, mid - 2, 90, 12, -1)
	} else {
		leg(p, 23, 70, 85)
		leg(p, 34, 70, 85)
		shoe(p, 20, 90, 13, -1)
		shoe(p, 32, 90, 13, 1)
	}

	// Her arms, hanging, or akimbo as she glares; or flung out as she fires.
	if (view === 'back') {
		arm(p, 14, 47, 11, 64)
		arm(p, 50, 47, 53, 64)
	} else if (view === 'front') {
		arm(p, 14, 47, 8, 57)
		arm(p, 50, 47, 56, 57)
		// Hands on her hips: fists in against the dress.
		p.oval(13, 61, 3, 3, lit(SKIN, SKIN_LIT, SKIN_SHADE))
		p.oval(51, 61, 3, 3, lit(SKIN, SKIN_LIT, SKIN_SHADE))
	} else if (view === 'fire') {
		arm(p, 14, 47, 5, 40)
		arm(p, 50, 47, 59, 40)
	} else {
		arm(p, 17, 47, 15, 64)
	}

	// Her dress.
	dress(p, view, 44, 71, mid)
	collar(p, mid, 42, side ? 8 : 10)

	// Her pigtails, behind her head and dangling past her cheeks.
	if (view === 'side') {
		pigtail(p, 44, 22, 8, 26)
	} else {
		pigtail(p, 4, 20, 9, 28)
		pigtail(p, 51, 20, 9, 28)
	}

	// Her head: skin at the front, wool all the way round at the back.
	const cx = side ? 29 : 32
	const rx = side ? 17 : 20
	if (view === 'back') {
		p.oval(cx, 22, rx, 18, lit(WOOL, WOOL_LIT, WOOL_SHADE))
		// Her parting, and a few strands.
		p.rect(31, 6, 2, 16, WOOL_SHADE)
		for (const [x, y] of [
			[20, 18],
			[24, 28],
			[38, 24],
			[43, 16],
			[34, 32],
			[27, 12],
		])
			p.rect(x, y, 4, 1, WOOL_SHADE)
	} else {
		p.oval(cx, 22, rx, 18, lit(SKIN, SKIN_LIT, SKIN_SHADE))
		// Her fringe: wool over her forehead, in scallops.
		for (let x = cx - rx + 1; x < cx + rx - 1; x++) {
			const dx = (x + 0.5 - cx) / rx
			const top = Math.round(22 - 18 * Math.sqrt(Math.max(0, 1 - dx * dx)))
			const drop =
				11 + ((x >> 1) % 2 === 0 ? 2 : 0) + Math.round(Math.abs(dx) * 3)
			for (let y = top; y < top + drop; y++)
				p.set(
					x,
					y,
					y > top + drop - 2 ? WOOL_SHADE : x < cx - rx / 2 ? WOOL_LIT : WOOL,
				)
		}
		if (side) {
			// The back of her head, wool, behind her ear.
			for (let y = 6; y < 36; y++)
				for (let x = cx + 3; x < cx + rx; x++) {
					const dx = (x + 0.5 - cx) / rx
					const dy = (y + 0.5 - 22) / 18
					if (dx * dx + dy * dy <= 1)
						p.set(x, y, x > cx + rx - 4 ? WOOL_SHADE : WOOL)
				}
		} else {
			// Wool down past her cheeks, either side, into the pigtails.
			p.rect(cx - rx, 16, 4, 14, WOOL)
			p.rect(cx + rx - 4, 16, 4, 14, WOOL_SHADE)
		}
	}
	// A bow on her crown, and one on each pigtail.
	bow(p, side ? 33 : 32, 0)
	if (view === 'side') bow(p, 48, 17)
	else {
		bow(p, 8, 17)
		bow(p, 56, 17)
	}

	// Her face.
	if (view === 'front' || view === 'fire') {
		// Eyes: whites (her pupils are drawn over them), her brows slanted in.
		p.oval(24, 25, 5, 5.5, EYE)
		p.oval(40, 25, 5, 5.5, EYE)
		for (let i = 0; i < 8; i++) {
			p.rect(19 + i, 17 + (i >> 1), 2, 2, INK)
			p.rect(44 - i, 17 + (i >> 1), 2, 2, INK)
		}
		// A little button nose, rosy cheeks.
		p.rect(31, 31, 3, 2, SKIN_SHADE)
		p.set(31, 31, SKIN)
		const puffed = view === 'fire' ? 1 : 0
		p.oval(18, 33, 4 + puffed, 3 + puffed, CHEEK)
		p.oval(46, 33, 4 + puffed, 3 + puffed, CHEEK)
		if (view === 'front') {
			// A flat, stitched mouth.
			p.rect(26, 37, 12, 1, INK)
			for (let x = 26; x < 38; x += 3) p.rect(x, 36, 1, 3, INK)
		} else {
			// A round hole, wide open.
			p.oval(32, 37, 5, 4.5, MOUTH)
			p.rect(29, 39, 6, 2, TONGUE)
		}
	} else if (side) {
		// Her face in profile, looking round at us: one eye, her nose out
		// in front, a cheek, a flat little mouth.
		p.oval(20, 25, 4, 5.5, EYE)
		for (let i = 0; i < 7; i++) p.rect(15 + i, 17 + (i >> 1), 2, 2, INK)
		p.oval(11, 30, 3, 2.5, lit(SKIN, SKIN_LIT, SKIN_SHADE))
		p.oval(18, 33, 4, 3, CHEEK)
		p.rect(15, 37, 8, 1, INK)
	}
	return p
}

export const DOLL_BACK = drawDoll('back').url()
export const DOLL_SIDE = drawDoll('side').url()
export const DOLL_FRONT = drawDoll('front').url()
export const DOLL_FIRE = drawDoll('fire').url()

/**
 * Where her eyes and mouth are in her front and firing poses, in cells
 * from her top left: the middle of each eye, how far a pupil can roam from
 * it, and the middle of her mouth, where the ball comes out.
 */
export const DOLL_EYES = [
	[24, 25],
	[40, 25],
] as const
export const DOLL_EYE_ROAM = [2, 2] as const
/** Her side view's one eye, and her pupil there. */
export const DOLL_SIDE_EYE = [19, 25] as const
export const DOLL_MOUTH = [32, 37] as const

/** Her ball, 10 by 10 cells: a red dodgeball with a white band round it. */
export const BALL_CELLS = 10
export const BALL_SIZE = BALL_CELLS * CELL
export const DOLL_BALL = (() => {
	const p = grid(BALL_CELLS, BALL_CELLS)
	p.oval(5, 5, 5, 5, lit(BALL_RED, BALL_LIT, BALL_SHADE))
	// A white band round its middle, bowed, and a glint.
	for (let x = 0; x < BALL_CELLS; x++) {
		const dx = (x + 0.5 - 5) / 5
		const bend = Math.round(dx * dx * 1.5)
		const y = 4 + bend
		if (p.get(x, y) && p.get(x, y + 1)) {
			p.set(x, y, WHITE)
			p.set(x, y + 1, WHITE_SHADE)
		}
	}
	p.rect(2, 2, 2, 1, WHITE)
	p.set(1, 3, WHITE)
	return p.url()
})()
