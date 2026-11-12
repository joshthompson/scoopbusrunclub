import { play } from '../sfx'
import { STAND_HEIGHT } from './constants'
import type { Body, Racer, World } from './world'

/**
 * A long jump pit across the track, near the finish (see `Course['longJump']`):
 * jump off the take-off board and land in the sand, and how far it was, from
 * the board, is measured, for points. Taken off past the board, it's a
 * foul. Run through it without jumping, the sand slows you down. One go
 * each, a course.
 */

/**
 * Pixels to a metre of long jump: far more than the course's own, or a
 * jump would be 70 m. A full jump at top speed, right off the board, is about 9 m.
 */
export const LONG_JUMP_PX_PER_M = 36
/** How far past the board the sand starts. */
export const PIT_FROM = LONG_JUMP_PX_PER_M
/** How long the sand is: to 11 m from the board. */
export const PIT_LENGTH = 10 * LONG_JUMP_PX_PER_M
/** How far before the board a jump still counts as a long jump. */
const TAKEOFF_ZONE = 110
/** Points a metre jumped, and the most a jump gets. */
const LONG_JUMP_POINTS_M = 100
const LONG_JUMP_POINTS_MAX = 1200
/** Where it's said, coming up to it, for everyone who's not there yet. */
const CALL_OUT = 320
/** In the sand, no faster than this: what's over it is lost a bit a tick. */
const SAND_TOP_SPEED = 4.5
const SAND_DRAG = 0.9

/** Where the sand is, from and to, if the course has a pit. */
export function pitSpan(world: Pick<World, 'course'>) {
	const jump = world.course.longJump
	if (!jump) return undefined
	const from = jump.board + PIT_FROM
	return { board: jump.board, from, to: from + PIT_LENGTH }
}

/** Whether `x` is in the sand. */
export function inSand(world: Pick<World, 'course'>, x: number) {
	const pit = pitSpan(world)
	return !!pit && x >= pit.from && x <= pit.to
}

/** Slowed by the sand, on foot in it. */
export function sandDrag(world: World, b: Body) {
	if (inSand(world, b.x) && Math.abs(b.vx) > SAND_TOP_SPEED) b.vx *= SAND_DRAG
}

/**
 * Off the ground, of their own accord: from near enough the board, the
 * long jump, its take-off kept to measure it from on landing. Their first
 * go only.
 */
export function longJumpTakeOff(world: World, b: Body) {
	const jump = world.course.longJump
	if (!jump || b.longJumped || b.mount > 0) return
	if (b.x >= jump.board - TAKEOFF_ZONE && b.x < jump.board + PIT_FROM)
		b.launchX = b.x
}

/** Coming up to the board: "Long jump!", once, over each of them. */
export function callOut(world: World, b: Body, from: number) {
	const jump = world.course.longJump
	if (!jump || b.longJumped) return
	const at = jump.board - CALL_OUT
	if (from < at && b.x >= at)
		world.popup('Long jump!', b.x, b.feetY - STAND_HEIGHT - 40)
}

/**
 * Down again, having taken off for the long jump: over the board, a foul;
 * otherwise, in the sand (or past it), how far from the board, a tenth of a
 * metre at a time, and points for it.
 */
export function landLongJump(world: World, racer: Racer) {
	const b = racer.body
	const jump = world.course.longJump
	const from = b.launchX
	if (!jump || from === undefined) return
	b.launchX = undefined
	b.longJumped = true
	const top = b.feetY - STAND_HEIGHT
	if (from > jump.board) {
		world.popup('Foul! Over the board', b.x, top - 60)
		play('stumble')
		return
	}
	// Short of the sand: a hop, not a jump. Their go's still had.
	if (b.x < jump.board + PIT_FROM) return
	const metres = Math.round(((b.x - jump.board) / LONG_JUMP_PX_PER_M) * 10) / 10
	b.longJumpMark = b.x
	const points = Math.min(
		LONG_JUMP_POINTS_MAX,
		Math.round(metres * LONG_JUMP_POINTS_M),
	)
	world.addBonus('jumps', points)
	world.popup(
		world.round
			? `Long jump ${metres.toFixed(1)} m!`
			: `Long jump ${metres.toFixed(1)} m +${points}`,
		b.x,
		top - 60,
	)
	play('cheer')
}
