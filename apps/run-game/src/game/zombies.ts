import type { Obstacle } from '../courses/types'
import { ZOMBIE_SPEED } from './constants'
import type { Terrain } from './terrain'
import type { ObstacleState, World } from './world'

type Zombie = Extract<Obstacle, { kind: 'zombie' }>

/** How near anyone racing gets to a Zombie before it wakes, and starts walking at them. */
const WAKE_NEAR = 700
/** How far short of an open grave's edge a Zombie turns round. */
const GRAVE_ROOM = 40

/**
 * Where a Zombie walks, to and fro: its `range`, if it has one; or between
 * the open graves either side of it, turning round short of each.
 */
function zombieRange(terrain: Terrain, o: Zombie): [number, number] {
	if (o.range) return o.range
	let from = Number.NEGATIVE_INFINITY
	let to = Number.POSITIVE_INFINITY
	for (const gap of terrain.gaps) {
		if (gap.to <= o.x) from = gap.to + GRAVE_ROOM
		else if (gap.from >= o.x) {
			to = gap.from - GRAVE_ROOM
			break
		}
	}
	return [Math.max(from, 0), Math.min(to, terrain.finishX)]
}

/**
 * Wakes any Zombie someone racing has got near, this tick: from then on
 * it's walking (see `zombieAt`). When, goes in its `flown`, so a Remote
 * Player's screen has it too.
 */
export function wakeZombies(world: World) {
	for (const state of world.obstacles) {
		const o = state.obstacle
		if (o.kind !== 'zombie' || state.flown !== undefined) continue
		if (world.racers.some((r) => !r.out && r.body.x > o.x - WAKE_NEAR))
			state.flown = world.raceTicks()
	}
}

/**
 * Where a Zombie is, and which way it's facing: stood where it rose till
 * someone's near, then walking towards them, and on, turning round short
 * of a grave (or the end of its `range`) and back, to and fro, the same on
 * every screen for the same tick. Where the bus scooped it, if it did.
 */
export function zombieAt(
	world: Pick<World, 'terrain' | 'raceTicks'>,
	state: Pick<ObstacleState, 'scooped' | 'flown'> & { obstacle: Zombie },
) {
	const o = state.obstacle
	if (state.scooped?.x !== undefined)
		return { x: state.scooped.x, walking: false, facing: -1 as const }
	if (state.flown === undefined)
		return { x: o.x, walking: false, facing: -1 as const }
	const [from, to] = zombieRange(world.terrain, o)
	const span = to - from
	if (span <= 0) return { x: o.x, walking: false, facing: -1 as const }
	const walked = ZOMBIE_SPEED * Math.max(0, world.raceTicks() - state.flown)
	// Along its way there and back, unrolled: left first, from where it rose.
	const period = span * 2
	const along =
		(((Math.min(o.x, to) - from - walked) % period) + period) % period
	return along <= span
		? { x: from + along, walking: true, facing: -1 as const }
		: { x: from + period - along, walking: true, facing: 1 as const }
}
