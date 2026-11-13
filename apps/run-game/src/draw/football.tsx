import { createController, createObjectSignal } from 'scoopjs'
import type { JSX } from 'solid-js'
import { paintedArt } from '../courses/kit/pixelArt'
import { FOOTBALL_RADIUS } from '../game/football'
import type { World } from '../game/world'
import { PixelArt } from './PixelArt'

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
	return [
		createController({
			init: () => ({
				id: 'football',
				type: 'football',
				...createObjectSignal(ball.x - FOOTBALL_RADIUS, 'x'),
				...createObjectSignal(ball.y - FOOTBALL_RADIUS, 'y'),
				...createObjectSignal(0, 'rotation'),
				...createObjectSignal({} as JSX.CSSProperties, 'style'),
				width: () => size,
				height: () => size,
				children: () => <PixelArt src={BALL} width={size} height={size} />,
			}),
			onEnterFrame({ $ }) {
				$.setX(ball.x - FOOTBALL_RADIUS)
				$.setY(ball.y - FOOTBALL_RADIUS)
				// In quarter turns, to keep its pixels square and sharp.
				$.setRotation(Math.round(ball.spin / 90) * 90)
			},
		}),
	]
}
