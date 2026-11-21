import { createController, createObjectSignal } from 'scoopjs'
import type { JSX } from 'solid-js'
import { VIEW_HEIGHT } from '../game/constants'
import type { World } from '../game/world'
import { ropeDrop, ropeOf } from '../minigames/jumpRope'
import { createPlayer } from './sprites'

/** A pixel, as everything's drawn: 2 px. */
const CELL = 2
/** The rope: a skipping rope's red, and darker underneath. */
const ROPE = '#d8342c'
const ROPE_SHADE = '#8a1f1a'
/** Its wooden handles, in the holders' hands. */
const HANDLE = '#b07a3e'
/** The stands they're up on: wood, lit along its tops, shaded under. */
const WOOD = '#8a5a2a'
const WOOD_LIT = '#b07a3e'
const WOOD_SHADE = '#5a3a1a'
/** A stand's top board, wide enough to stand on, and how thick it and its legs are. */
const STAND_WIDTH = 40
const BOARD = 6
const LEG = 4
/**
 * How much further the rope's drawn swinging down at the bottom of a
 * turn, at its middle, than it reaches: so a little of it drags along the
 * deck, flat, rather than only just touching it. Only as drawn: jumping it
 * goes by where it reaches (see `ropeDrop`).
 */
const DRAGS = 8

/**
 * Jump Rope, drawn: its two holders, either end, up on wooden stands
 * turning it; and its rope, between their hands, behind everyone as it
 * swings away round the back, and in front of them as it comes round the
 * front, dragging a little along the bridge at the bottom of each turn. Nothing, if the
 * world's not a game of it.
 */
export function createJumpRope(world: World) {
	const show = ropeOf(world)
	if (!show) return []
	const { hands } = show
	/** One side of the rope's turn: `front`, nearer than everyone, or behind them. */
	const rope = (front: boolean) =>
		createController({
			init: () => ({
				id: front ? 'rope-front' : 'rope-back',
				type: front ? 'furby' : 'boost',
				...createObjectSignal(hands.left - CELL * 3, 'x'),
				...createObjectSignal(hands.y - 140, 'y'),
				...createObjectSignal({} as JSX.CSSProperties, 'style'),
				width: () => hands.right - hands.left + CELL * 6,
				height: () => VIEW_HEIGHT,
			}),
			draw({ ctx }) {
				// Read the tick, so it's painted again every one.
				world.ticks()
				const turn = show.turn
				const inFront = Math.sin(turn) > 0
				const left = hands.left - CELL * 3
				const top = hands.y - 140
				// Its handles, in their hands, always.
				if (front) {
					ctx.fillStyle = HANDLE
					for (const x of [hands.left - CELL * 2, hands.right - CELL])
						ctx.fillRect(x - left, hands.y - top - CELL, CELL * 3, CELL * 2)
				}
				if (inFront !== front) return
				let was: number | undefined
				const middle = (hands.left + hands.right) / 2
				const half = (hands.right - hands.left) / 2
				for (let x = hands.left; x <= hands.right; x += CELL) {
					// Down to the bridge's deck, and no further: dragging along
					// it a little, at the bottom of its turn.
					const u = (x - middle) / half
					const drag =
						DRAGS * Math.max(0, Math.cos(turn)) * Math.max(0, 1 - u * u)
					const y = Math.min(show.floor, hands.y + ropeDrop(x, turn) + drag)
					const at = Math.round((y - top) / CELL) * CELL
					// Joined up with the step before: no gaps where it's steep.
					const from = was === undefined ? at : Math.min(was, at)
					const to = was === undefined ? at : Math.max(was, at)
					ctx.fillStyle = ROPE
					ctx.fillRect(x - left, from, CELL, to - from + CELL)
					ctx.fillStyle = ROPE_SHADE
					ctx.fillRect(x - left, to + CELL, CELL, CELL)
					was = at
				}
			},
		})
	/**
	 * A stand: a board on top, two legs down to the ground under it,
	 * however far that is, braced across between them.
	 */
	const stand = (at: (typeof show.stands)[number], i: number) =>
		createController({
			init: () => ({
				id: `rope-stand-${i}`,
				type: 'boost',
				...createObjectSignal(at.x - STAND_WIDTH / 2, 'x'),
				...createObjectSignal(at.top, 'y'),
				...createObjectSignal({} as JSX.CSSProperties, 'style'),
				width: () => STAND_WIDTH,
				height: () => at.ground - at.top + CELL,
			}),
			draw({ ctx }) {
				const tall = at.ground - at.top + CELL
				// Its legs, in a little from either end, and a brace across.
				for (const x of [CELL * 2, STAND_WIDTH - CELL * 2 - LEG]) {
					ctx.fillStyle = WOOD
					ctx.fillRect(x, BOARD, LEG, tall - BOARD)
					ctx.fillStyle = WOOD_SHADE
					ctx.fillRect(x + LEG - CELL, BOARD, CELL, tall - BOARD)
				}
				ctx.fillStyle = WOOD_SHADE
				for (let y = BOARD + CELL * 2; y < tall - CELL * 2; y += CELL) {
					const across =
						((y - BOARD) / (tall - BOARD)) * (STAND_WIDTH - LEG * 3)
					const step = Math.round(across / CELL) * CELL
					ctx.fillRect(CELL * 2 + LEG + step, y, CELL * 2, CELL)
					ctx.fillRect(
						STAND_WIDTH - CELL * 2 - LEG * 2 - step,
						y,
						CELL * 2,
						CELL,
					)
				}
				// Its top board, lit along its top.
				ctx.fillStyle = WOOD
				ctx.fillRect(0, 0, STAND_WIDTH, BOARD)
				ctx.fillStyle = WOOD_LIT
				ctx.fillRect(0, 0, STAND_WIDTH, CELL)
				ctx.fillStyle = WOOD_SHADE
				ctx.fillRect(0, BOARD - CELL, STAND_WIDTH, CELL)
			},
		})
	return [
		...show.stands.map(stand),
		...show.holders.map((holder) => createPlayer(world, holder)),
		rope(false),
		rope(true),
	]
}
