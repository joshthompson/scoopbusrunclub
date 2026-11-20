import { createController, createObjectSignal } from 'scoopjs'
import type { JSX } from 'solid-js'
import {
	PATH_BACK,
	PATH_FRONT,
	VIEW_HEIGHT,
	VIEW_WIDTH,
} from '../game/constants'
import type { World } from '../game/world'
import { ARENA_LEFT } from '../minigames/arena'
import {
	NET_HIGH,
	NET_X,
	SCORED_PAUSE,
	TEAM_COLOURS,
	volleyOf,
} from '../minigames/beachVolleyball'
import {
	SCOREBOARD,
	SCOREBOARD_HEIGHT,
	SCOREBOARD_PANEL,
	SCOREBOARD_WIDTH,
	UMPIRE_HEIGHT,
	UMPIRE_LEFT,
	UMPIRE_REST,
	UMPIRE_RIGHT,
	UMPIRE_SEAT_Y,
	UMPIRE_STAND,
	UMPIRE_STAND_HEIGHT,
	UMPIRE_STAND_SEAT_Y,
	UMPIRE_STAND_WIDTH,
	UMPIRE_WIDTH,
} from './art/volleyball'
import { cellBatch, seeThrough } from './paint/cellBatch'
import { paintPicture } from './paint/picture'

/** A pixel, as everything's drawn: 2 px. */
const CELL = 2
/** How far the net leans across, from its back pole to its front one, so it's seen as a net and not a line. */
const NET_LEAN = 24
/** How deep the net's mesh is, under its tape. */
const MESH_DEEP = 44
/** How far behind the net, across, the umpire's stand is: by its back pole, not in it. */
const STAND_ACROSS = 44
/** The net's colours: its poles, lit and shaded, the snow on their tops, its tape and its mesh. */
const POLE = '#5d6b78'
const POLE_LIT = '#8494a2'
const POLE_SNOW = '#f6fbfe'
const TAPE = '#f4f4f0'
const MESH = 'rgba(32, 42, 54, 0.8)'
/** The ball's: a beach ball's red and white, in turns round it, lit and shaded. */
const PANELS = [
	['#e5393b', '#b8272b'],
	['#f8f6f1', '#d6d2cb'],
]
/** How many of them there are round it, and how big the white cap is in its middle, as a share of it. */
const SEGMENTS = 6
const CAP = 0.2
/**
 * The court's lines, dragged through the snow with a stick: the furrow in
 * shadow, and its far lip catching the light, both see-through over the
 * snow's own texture.
 */
const FURROW = seeThrough('#6f86a0', 0.62)
const LIP = seeThrough('#ffffff', 0.85)
/** How often a line wanders a cell, or breaks off for one, along it. */
const WANDERS = 0.12
const BREAKS = 0.04
/** How far out from the back and front of the path the court's lines are. */
const COURT_OUT = 8
/** How high the scoreboard's up, over the back of the sand, on its posts; where its legs are across it; and its posts' wood. */
const BOARD_UP = 190
const BOARD_LEGS = [8 * CELL, 52 * CELL]
const POST = '#9a6a2c'
const POST_SHADE = '#74501f'
/** Where the scoreboard stands, across the screen: off to the left, clear of the umpire. */
const SCOREBOARD_X = 236
/** How big each cell of the score's digits is. */
const DIGIT_CELL = 6
/** The digits, 3 by 5 cells each. */
const DIGITS = [
	'111101101101111',
	'010110010010111',
	'111001111100111',
	'111001111001111',
	'101101111001001',
	'111100111001111',
	'111100111101111',
	'111001001001001',
	'111101111101111',
	'111101111001111',
]

/**
 * Beach Volleyball, drawn: the court taped out on the snow; the net, across the middle, leaning a little so
 * it's seen as one, its poles snow-capped; the umpire up on his stand behind
 * it, an arm up for whichever team's just scored; the scoreboard; and the
 * ball, its panels turning as it goes, its shadow on the sand under it.
 * Nothing, if the world's not a game of it.
 */
export function createBeachVolleyball(world: World) {
	const show = volleyOf(world)
	if (!show) return []
	const { ball, ground } = show
	const back = ground - PATH_BACK
	const front = ground + PATH_FRONT
	const netTop = ground - NET_HIGH
	/** One picture over the whole arena: `type` says what it's in front of. */
	const layer = (
		id: string,
		type: string,
		paint: (
			ctx: CanvasRenderingContext2D,
			image: Parameters<typeof paintPicture>[1],
			now: number,
		) => void,
	) =>
		createController({
			init: () => ({
				id,
				type,
				...createObjectSignal(ARENA_LEFT, 'x'),
				...createObjectSignal(0, 'y'),
				...createObjectSignal({} as JSX.CSSProperties, 'style'),
				width: () => VIEW_WIDTH,
				height: () => VIEW_HEIGHT,
			}),
			draw({ ctx, image }) {
				// Read the tick, so it's painted again every one.
				paint(ctx, image, world.ticks())
			},
		})
	const middle = NET_X - ARENA_LEFT

	/** The umpire's stand, him on it, and the scoreboard: behind everyone. */
	const umpire = layer('volley-umpire', 'platform', (ctx, image, now) => {
		// The scoreboard, the score on it in each team's colour.
		// Up on tall posts, over everyone's name tags, even jumping: its own
		// legs on down to the sand.
		const boardTop = back - BOARD_UP - SCOREBOARD_HEIGHT
		const boardLeft = SCOREBOARD_X - SCOREBOARD_WIDTH / 2
		for (const leg of BOARD_LEGS) {
			const x = boardLeft + leg
			const from = boardTop + SCOREBOARD_HEIGHT - CELL * 4
			ctx.fillStyle = POST
			ctx.fillRect(x, from, CELL * 4, back - 6 - from)
			ctx.fillStyle = POST_SHADE
			ctx.fillRect(x + CELL * 3, from, CELL, back - 6 - from)
			ctx.fillStyle = POLE_SNOW
			ctx.fillRect(x - CELL, back - 8, CELL * 6, CELL * 2)
		}
		paintPicture(
			ctx,
			image,
			SCOREBOARD,
			SCOREBOARD_X - SCOREBOARD_WIDTH / 2,
			boardTop,
			SCOREBOARD_WIDTH,
			SCOREBOARD_HEIGHT,
		)
		const panel = SCOREBOARD_PANEL
		const digitsTop = boardTop + panel.y + (panel.height - 5 * DIGIT_CELL) / 2
		const panelMiddle =
			SCOREBOARD_X - SCOREBOARD_WIDTH / 2 + panel.x + panel.width / 2
		paintDigit(
			ctx,
			show.points[0],
			panelMiddle - 30 - 3 * DIGIT_CELL,
			digitsTop,
			TEAM_COLOURS[0],
		)
		paintDigit(
			ctx,
			show.points[1],
			panelMiddle + 30,
			digitsTop,
			TEAM_COLOURS[1],
		)
		ctx.fillStyle = '#f4f4f0'
		ctx.fillRect(
			panelMiddle - DIGIT_CELL,
			digitsTop + 2 * DIGIT_CELL,
			DIGIT_CELL * 2,
			DIGIT_CELL,
		)

		// The stand, its feet at the back of the sand, and him up on it.
		const standTop = back + 6 - UMPIRE_STAND_HEIGHT
		paintPicture(
			ctx,
			image,
			UMPIRE_STAND,
			middle + STAND_ACROSS - UMPIRE_STAND_WIDTH / 2,
			standTop,
			UMPIRE_STAND_WIDTH,
			UMPIRE_STAND_HEIGHT,
		)
		// An arm up for whoever's just scored, and the winners, once it's won.
		const scored = show.scored
		const order = world.order()
		const signalling =
			scored && (now - scored.at < SCORED_PAUSE || !!order)
				? scored.team
				: undefined
		paintPicture(
			ctx,
			image,
			signalling === 0
				? UMPIRE_LEFT
				: signalling === 1
					? UMPIRE_RIGHT
					: UMPIRE_REST,
			middle + STAND_ACROSS - UMPIRE_WIDTH / 2,
			standTop + UMPIRE_STAND_SEAT_Y - UMPIRE_SEAT_Y,
			UMPIRE_WIDTH,
			UMPIRE_HEIGHT,
		)
	})

	/** The net: its back pole, its mesh and tape across to its front pole; behind everyone, who never get to it. */
	const net = layer('volley-net', 'boost', (ctx) => {
		const backX = middle + NET_LEAN
		const frontX = middle - NET_LEAN
		const backTop = netTop - PATH_BACK
		const frontTop = netTop + PATH_FRONT
		// Its back pole.
		pole(ctx, backX, backTop, back)
		// The mesh, a grid of cords between the two, down from its tape.
		const cells = cellBatch(ctx)
		cells.fillStyle = MESH
		const steps = Math.round((frontX - backX) / -CELL)
		for (let i = 0; i <= steps; i++) {
			const x = backX - i * CELL
			const top = backTop + ((frontTop - backTop) * i) / steps
			for (let y = 0; y <= MESH_DEEP; y += CELL * 4)
				cells.fillRect(x, Math.round((top + y) / CELL) * CELL, CELL, CELL)
			if (i % 4 === 0)
				cells.fillRect(x, Math.round(top / CELL) * CELL, CELL, MESH_DEEP)
		}
		cells.flush()
		// Its tape along the top, white.
		ctx.fillStyle = TAPE
		for (let i = 0; i <= steps; i++) {
			const x = backX - i * CELL
			const top = backTop + ((frontTop - backTop) * i) / steps
			ctx.fillRect(x, Math.round(top / CELL) * CELL - CELL * 2, CELL, CELL * 3)
		}
		// Its front pole.
		pole(ctx, frontX, frontTop, front)
	})

	/** The ball's shadow on the sand, under it, darker and smaller the nearer it is: behind everyone. */
	const shadow = layer('volley-ball-shadow', 'boost', (ctx) => {
		const high = Math.max(0, ground - ball.y)
		const near = Math.max(0, 1 - high / 400)
		const across = Math.round((ball.r * (0.8 + 0.5 * near)) / CELL) * CELL
		ctx.fillStyle = `rgba(40, 60, 80, ${(0.12 + 0.3 * near).toFixed(3)})`
		const x = Math.round((ball.x - ARENA_LEFT) / CELL) * CELL
		ctx.fillRect(x - across, ground - CELL, across * 2, CELL * 2)
		ctx.fillRect(
			x - across + CELL * 2,
			ground - CELL * 2,
			across * 2 - CELL * 4,
			CELL * 4,
		)
	})

	/**
	 * The court, dragged out in the snow with a stick, behind everyone: its
	 * back and front lines, out from the path either side; its ends, at the
	 * walls; and its middle under the net. Its ends and middle leaning back
	 * just as the net does, so it lies flat on the beach with it.
	 */
	const court = layer('volley-court', 'boost', (ctx) => {
		const { left, right } = show.walls
		const far = Math.round((back - COURT_OUT) / CELL) * CELL
		const near = Math.round((front + COURT_OUT) / CELL) * CELL
		/** How far across a line going back leans, at `y` down the screen: as the net. */
		const lean = (y: number) => ((ground - y) * NET_LEAN) / ((front - back) / 2)
		const cells = cellBatch(ctx)
		/** A furrow along, from `x0` to `x1` at `y`, wandering a little: `seed` its own. */
		const along = (
			x0: number,
			x1: number,
			y: number,
			seed: number,
			deep = CELL,
		) => {
			let off = 0
			for (let x = x0; x <= x1; x += CELL) {
				const at = x / CELL + seed * 101
				if (noise(at) < WANDERS)
					off = off ? 0 : noise(at + 7) < 0.5 ? -CELL : CELL
				if (noise(at + 13) < BREAKS) continue
				cells.fillStyle = FURROW
				cells.fillRect(x, y + off, CELL, deep)
				cells.fillStyle = LIP
				cells.fillRect(x, y + off + deep, CELL, CELL)
			}
		}
		/** A furrow going back, through `x` at the path's middle, leaning as the net does. */
		const going = (x: number, seed: number) => {
			let off = 0
			for (let y = far; y <= near; y += CELL) {
				const at = y / CELL + seed * 211
				if (noise(at) < WANDERS)
					off = off ? 0 : noise(at + 5) < 0.5 ? -CELL : CELL
				if (noise(at + 17) < BREAKS) continue
				const across = Math.round((x + lean(y)) / CELL) * CELL + off
				cells.fillStyle = FURROW
				cells.fillRect(across, y, CELL * 2, CELL)
				cells.fillStyle = LIP
				cells.fillRect(across + CELL * 2, y, CELL, CELL)
			}
		}
		const x0 = left - ARENA_LEFT
		const x1 = right - ARENA_LEFT
		// Its back and front lines, corner to corner, a little past, as
		// a stick would go.
		along(
			Math.round((x0 + lean(far)) / CELL) * CELL - CELL * 2,
			Math.round((x1 + lean(far)) / CELL) * CELL + CELL * 2,
			far,
			1,
		)
		along(
			Math.round((x0 + lean(near)) / CELL) * CELL - CELL * 3,
			Math.round((x1 + lean(near)) / CELL) * CELL + CELL,
			near,
			2,
			// Deeper, nearer.
			CELL * 2,
		)
		going(x0, 3)
		going(x1, 4)
		going(middle, 5)
		cells.flush()
	})

	/** The ball, in front of everyone: a beach ball, round, in 2 px cells, its stripes turning. */
	const ballLayer = layer('volley-ball', 'furby', (ctx) => {
		const r = ball.r
		const cx = ball.x - ARENA_LEFT
		const cy = ball.y
		const turn = (ball.spin * Math.PI) / 180
		const cos = Math.cos(turn)
		const sin = Math.sin(turn)
		const left = Math.round((cx - r) / CELL) * CELL
		const top = Math.round((cy - r) / CELL) * CELL
		const cells = cellBatch(ctx)
		for (let y = top; y < cy + r; y += CELL)
			for (let x = left; x < cx + r; x += CELL) {
				const dx = x + CELL / 2 - cx
				const dy = y + CELL / 2 - cy
				const d = Math.hypot(dx, dy)
				if (d > r) continue
				// Turned with the ball: red and white in turns round its
				// middle, curving round it, a white cap where they meet.
				const u = dx * cos - dy * sin
				const v = dx * sin + dy * cos
				const angle = Math.atan2(v, u) + (d / r) * 0.6
				const panel =
					d < r * CAP
						? 1
						: ((Math.floor(((angle + Math.PI) / (Math.PI * 2)) * SEGMENTS) %
								2) +
								2) %
							2
				// Lit at the top left, shaded down its bottom right.
				const shaded = (dx + dy) / r > 0.55
				cells.fillStyle = PANELS[panel][shaded ? 1 : 0]
				cells.fillRect(x, y, CELL, CELL)
			}
		cells.flush()
	})
	return [umpire, court, net, shadow, ballLayer]
}

/** A pole of the net, from `top` down to `foot`, `x` its middle: lit on its left, snow on top. */
function pole(
	ctx: CanvasRenderingContext2D,
	x: number,
	top: number,
	foot: number,
) {
	const left = Math.round(x / CELL) * CELL - CELL * 2
	const from = Math.round(top / CELL) * CELL
	ctx.fillStyle = POLE
	ctx.fillRect(left, from, CELL * 4, foot - from)
	ctx.fillStyle = POLE_LIT
	ctx.fillRect(left, from, CELL, foot - from)
	ctx.fillStyle = POLE_SNOW
	ctx.fillRect(left - CELL, from - CELL * 2, CELL * 6, CELL * 2)
}

/** Digit `n` of the score, its top left at `x`, `y`, in `colour`. */
function paintDigit(
	ctx: CanvasRenderingContext2D,
	n: number,
	x: number,
	y: number,
	colour: string,
) {
	const cells = DIGITS[Math.max(0, Math.min(9, n))]
	ctx.fillStyle = colour
	for (let i = 0; i < 15; i++)
		if (cells[i] === '1')
			ctx.fillRect(
				x + (i % 3) * DIGIT_CELL,
				y + Math.floor(i / 3) * DIGIT_CELL,
				DIGIT_CELL,
				DIGIT_CELL,
			)
}

/** A number from 0 to 1 for `n`, the same every time: a stick's wobble along a line. */
function noise(n: number) {
	const x = Math.sin(n * 12.9898) * 43758.5453
	return x - Math.floor(x)
}
