import type { Obstacle } from '../courses/types'
import { STALACTITE_HEIGHT } from '../draw/art/stalactite'
import { play } from '../sfx'
import { GRAVITY } from './constants'
import type { ObstacleState, World } from './world'

/**
 * The Caves' stalactites that fall (see `Obstacle`'s `stalactite`): hung
 * from the Cave's roof till anyone racing comes near, then shaking, a
 * crack, and down they come, whistling, to smash on the floor. When it was
 * set off goes in its `flown`, by the race's clock, so a Remote Player's
 * screen has it falling the same, and everything else follows from that.
 */

type Stalactite = Extract<Obstacle, { kind: 'stalactite' }>

/** How long one shakes before it drops. */
export const SHAKE = 30
/**
 * How fast someone has to be going to be past one before it comes down on
 * them: a little under running speed. Set off when they're as far off as
 * that gets them by the time it's down to their head, it misses anyone
 * going flat out, and catches anyone going slower.
 */
const OUTRUN = 5.5
/** How tall a runner is, to the top of their head, and how far past it they have to be, clear. */
const HEAD = 58
const CLEAR = 18
/** How far up into the roof its top is, hanging: so it's grown out of it, not stuck on. */
const ROOTED = 4

/**
 * How near anyone racing gets to one before it's set off: as far as
 * `OUTRUN` gets you, from then till it's come down to head height, less
 * the room to be clear of it.
 */
function nearOf(world: Pick<World, 'terrain' | 'course'>, o: Stalactite) {
	const ground = world.terrain.groundY(o.x)
	const roof = world.course.cave?.ceiling(o.x) ?? ground - 120
	const drop = Math.max(0, ground - HEAD - (roof - ROOTED + STALACTITE_HEIGHT))
	return OUTRUN * (SHAKE + Math.sqrt((2 * drop) / GRAVITY)) - CLEAR
}

/** Sets off any stalactite someone racing has got near, this tick. Not anyone down a Secret, under it all. */
export function wakeStalactites(world: World) {
	for (const state of world.obstacles) {
		const o = state.obstacle
		if (o.kind !== 'stalactite' || state.flown !== undefined) continue
		const near = nearOf(world, o)
		if (
			world.racers.some(
				(r) => !r.out && !r.body.secret && r.body.x > o.x - near,
			)
		)
			state.flown = world.raceTicks()
	}
}

/**
 * A stalactite, now: `hanging` from the roof; set off, `shaking`; then
 * `falling`, and `smashed` on the floor. `top` is the y of its top, and
 * `tip` of its point; `since` how long it's been doing what it is, in
 * ticks. The same on every screen for the same tick.
 */
export function stalactiteAt(
	world: Pick<World, 'terrain' | 'course' | 'raceTicks'>,
	state: Pick<ObstacleState, 'flown'> & { obstacle: Stalactite },
) {
	const o = state.obstacle
	const ground = world.terrain.groundY(o.x)
	const roof = world.course.cave?.ceiling(o.x) ?? ground - 120
	const hung = roof - ROOTED
	const fall = Math.sqrt((2 * (ground - (hung + STALACTITE_HEIGHT))) / GRAVITY)
	const hanging = { top: hung, tip: hung + STALACTITE_HEIGHT, ground, fall }
	if (state.flown === undefined)
		return { ...hanging, phase: 'hanging' as const, since: 0 }
	const since = world.raceTicks() - state.flown
	if (since < SHAKE) return { ...hanging, phase: 'shaking' as const, since }
	const falling = since - SHAKE
	if (falling < fall) {
		const top = hung + (GRAVITY * falling * falling) / 2
		return {
			...hanging,
			top,
			tip: top + STALACTITE_HEIGHT,
			phase: 'falling' as const,
			since: falling,
		}
	}
	return {
		...hanging,
		top: ground - STALACTITE_HEIGHT,
		tip: ground,
		phase: 'smashed' as const,
		since: falling - fall,
	}
}

/** Its sounds, as it goes: a crack and a whistle as it drops, a crash as it lands. */
export function soundStalactites(world: World) {
	for (const state of world.obstacles) {
		const o = state.obstacle
		if (o.kind !== 'stalactite' || state.flown === undefined) continue
		const at = stalactiteAt(world, { ...state, obstacle: o })
		const since = world.raceTicks() - state.flown
		if (since === SHAKE) play('stalactite')
		else if (since === SHAKE + Math.ceil(at.fall)) play('rubble')
	}
}
