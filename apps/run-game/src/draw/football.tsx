import { createController, createObjectSignal } from 'scoopjs'
import type { JSX } from 'solid-js'
import {
	EGG_SIZE,
	EGG_TUMBLE,
	EGG_TURNS,
	eggBottom,
} from '../courses/kit/dinoForest'
import { paintedArt } from '../courses/kit/pixelArt'
import { FOOTBALL_RADIUS } from '../game/football'
import type { World } from '../game/world'

/**
 * A football, as pixel art: a black pentagon in the middle, seams out from
 * it to the patches round its edge, a shade on its underside, and a soft
 * ink outline. 11 cells across, drawn at twice that.
 */
const BALL_ROWS = [
	'...OOOOO...',
	'.OOWWGWWOO.',
	'.OKWWGWWKO.',
	'OKKWKKKWKKO',
	'OWWKKKKKWWO',
	'OWWKKKKKWWO',
	'OWWWKKKWWWO',
	'OWWGWWWGWSO',
	'.OKWWWWWKO.',
	'.OOKKSKKOO.',
	'...OOOOO...',
]
const BALL_COLOURS: Record<string, string> = {
	O: '#2b2f36',
	K: '#1d1d1d',
	W: '#ffffff',
	G: '#9aa3ad',
	S: '#c9d0d8',
}
const CELLS = BALL_ROWS.length
// It's asked about the middle of each cell.
export const BALL = paintedArt(
	CELLS,
	CELLS,
	(x, y) => BALL_COLOURS[BALL_ROWS[Math.floor(y)][Math.floor(x)]],
)

/** The course's football, if it has one: rolling, bouncing, turning as it goes. */
export function createFootballSprite(world: World) {
	const ball = world.ball
	if (!ball) return []
	const size = FOOTBALL_RADIUS * 2
	// An egg, in its place: taller than it's wide, cracking as it's kicked.
	const { width, height } = ball.egg ? EGG_SIZE : { width: size, height: size }
	/** An egg's way round, tumbling: an eighth for each eighth of a turn it's rolled. */
	const turn = () =>
		((Math.round(ball.spin / (360 / EGG_TURNS)) % EGG_TURNS) + EGG_TURNS) %
		EGG_TURNS
	const picture = () =>
		ball.egg
			? EGG_TUMBLE[Math.min(EGG_TUMBLE.length - 1, ball.stage)][turn()]
			: BALL
	/** How far down its middle is from the top of its picture, sat on the ground. */
	const sitsAt = () =>
		ball.egg
			? height / 2 - (FOOTBALL_RADIUS - eggBottom(turn()))
			: height - FOOTBALL_RADIUS
	return [
		createController({
			init: () => ({
				id: 'football',
				type: 'football',
				...createObjectSignal(ball.x - width / 2, 'x'),
				...createObjectSignal(ball.y - sitsAt(), 'y'),
				...createObjectSignal(0, 'rotation'),
				...createObjectSignal({} as JSX.CSSProperties, 'style'),
				width: () => width,
				height: () => height,
			}),
			draw({ ctx, image }) {
				// Hatched: gone, on its own two legs (see `createFollowers`).
				if (ball.out === 'hatched') return
				const art = image(picture())
				if (art) ctx.drawImage(art.image, 0, 0, width, height)
			},
			onEnterFrame({ $ }) {
				$.setX(ball.x - width / 2)
				$.setY(ball.y - sitsAt())
				// In quarter turns, to keep its pixels square and sharp. An egg's
				// drawn turned already, every eighth of the way round.
				$.setRotation(ball.egg ? 0 : Math.round(ball.spin / 90) * 90)
			},
		}),
	]
}
