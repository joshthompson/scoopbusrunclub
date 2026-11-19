import type { Obstacle } from '../courses/types'
import { swimmingBox } from './swim'
import type { ObstacleState, World } from './world'

/**
 * Sharks, in Deep Water (see `Obstacle`'s `shark`): each lurking, cruising
 * slowly to and fro deep down where it's put, till anyone swims within
 * `SPOT` of it; then it's after whoever's nearest, turning towards them
 * and speeding up, faster than anyone swims. Into them, a bite, and it's
 * done: off it goes, turning for the open water and down into the deep,
 * never to bite again. Its swimming's stepped by the tick from where
 * everyone is, so a Remote Player's screen, stepping it the same, sees
 * much the same.
 */

type Shark = Extract<Obstacle, { kind: 'shark' }>

/** Where a shark is, and how it's going: on its state, plain. */
export interface SharkSwim {
	x: number
	y: number
	vx: number
	vy: number
	facing: 1 | -1
	/** After someone, or off away, done. */
	mode: 'lurking' | 'hunting' | 'leaving'
	/** The tick it was last stepped, so it's stepped once a tick. */
	at: number
}

/** How near it spots anyone, and how far off it gives up on them. */
const SPOT = 520
const GIVE_UP = 900
/** How fast it cruises, lurking; hunting, how fast at most, and how quickly it turns to. */
const CRUISE = 1.2
const HUNT = 7.6
const TURN = 0.06
/** How far either side of its home it cruises, idling. */
const PATROL = 180
/** How fast it swims back home, with nobody to chase, and how hard it steers up or down to it. */
const RETURN = 3
const RETURN_LIFT = 0.02
/** How fast it swims off, done, and how steeply it dives as it goes. */
const LEAVE = 6
const LEAVE_DIVE = 3
/** How big it is, to bite with: half its length, and half its depth. */
export const SHARK_HALF = { along: 44, across: 14 }

/** Where a shark is: its state's, or where it's put, to begin with. */
export function sharkSwim(
	world: Pick<World, 'terrain'>,
	state: ObstacleState & { obstacle: Shark },
): SharkSwim {
	const o = state.obstacle
	state.swim ??= {
		x: o.x,
		y: world.terrain.groundY(o.x) - o.height,
		vx: -CRUISE,
		vy: 0,
		facing: -1,
		mode: 'lurking',
		at: -1,
	}
	return state.swim
}

/**
 * Where a shark's home is, to go back to with nobody to chase: the middle
 * of the sea along, as deep down as it was put. Where it's put, if the
 * course has no sea.
 */
export function sharkHome(world: Pick<World, 'terrain' | 'course'>, o: Shark) {
	const { deepWater } = world.course
	const x = deepWater ? (deepWater.from + deepWater.to) / 2 : o.x
	return { x, y: world.terrain.groundY(x) - o.height }
}

/** Every shark on the course, a tick on: by the host, and by a Remote Player's screen. */
export function stepSharks(world: World) {
	const now = world.ticks()
	for (const state of world.obstacles) {
		if (state.obstacle.kind !== 'shark') continue
		const shark = sharkSwim(world, state as ObstacleState & { obstacle: Shark })
		if (shark.at === now) continue
		shark.at = now
		// Bitten someone, by the host's say: off it goes.
		if (state.used) shark.mode = 'leaving'
		stepShark(world, state.obstacle, shark)
	}
}

function stepShark(world: World, o: Shark, shark: SharkSwim) {
	const swimmers = world.racers.filter((r) => !r.out && r.body.swimming)
	const nearest = swimmers
		.map((r) => ({
			r,
			d: Math.hypot(r.body.x - shark.x, r.body.feetY - 15 - shark.y),
		}))
		.sort((a, b) => a.d - b.d)[0]
	if (shark.mode === 'leaving') {
		// Nothing more to do but go.
	} else if (shark.mode === 'lurking' && nearest && nearest.d < SPOT)
		shark.mode = 'hunting'
	if (shark.mode === 'hunting' && (!nearest || nearest.d > GIVE_UP))
		shark.mode = 'lurking'

	let want = { vx: 0, vy: 0 }
	if (shark.mode === 'hunting' && nearest) {
		// Straight at them, where they'll be in a moment.
		const b = nearest.r.body
		const dx = b.x + b.vx * 8 - shark.x
		const dy = b.feetY - 15 - shark.y
		const d = Math.hypot(dx, dy) || 1
		want = { vx: (dx / d) * HUNT, vy: (dy / d) * HUNT }
	} else if (shark.mode === 'leaving') {
		// Away, down into the deep: towards the sea's far end, the open water,
		// never on towards the near one, where the seabed may rise up a reef
		// to the shore and lift it to the surface.
		const { deepWater } = world.course
		const away = deepWater
			? deepWater.to - shark.x > shark.x - deepWater.from
				? 1
				: -1
			: 1
		want = { vx: away * LEAVE, vy: LEAVE_DIVE }
	} else {
		// Nobody to chase: back to the middle of the sea, and then to and fro,
		// slowly, there.
		const home = sharkHome(world, o)
		const away = shark.x - home.x
		const heading = Math.abs(away) > PATROL ? -Math.sign(away) : shark.facing
		const lift = Math.max(
			-RETURN,
			Math.min(RETURN, (home.y - shark.y) * RETURN_LIFT),
		)
		want = {
			vx: heading * (Math.abs(away) > PATROL ? RETURN : CRUISE),
			vy: lift,
		}
	}
	shark.vx += (want.vx - shark.vx) * TURN
	shark.vy += (want.vy - shark.vy) * TURN
	shark.x += shark.vx
	shark.y += shark.vy
	// In the water, never up out of it, nor down into the seabed, nor off
	// either end of it.
	const { deepWater } = world.course
	if (deepWater)
		shark.x = Math.max(
			deepWater.from + SHARK_HALF.along,
			Math.min(deepWater.to - SHARK_HALF.along, shark.x),
		)
	const floor = world.terrain.groundY(shark.x) - SHARK_HALF.across
	const top = (deepWater?.surface ?? floor) + SHARK_HALF.across + 10
	shark.y = Math.max(top, Math.min(floor, shark.y))
	if (Math.abs(shark.vx) > 0.3) shark.facing = shark.vx > 0 ? 1 : -1
}

/** Whether a shark, hunting, has its jaws on `b`, swimming. */
export function sharkBites(
	shark: SharkSwim,
	b: Pick<World['body'], 'x' | 'feetY'>,
) {
	if (shark.mode !== 'hunting') return false
	const box = swimmingBox(b)
	// Its head end, the way it's going.
	const head = shark.x + shark.facing * SHARK_HALF.along * 0.6
	return (
		head + SHARK_HALF.along * 0.5 > box.left &&
		head - SHARK_HALF.along * 0.5 < box.right &&
		shark.y + SHARK_HALF.across > box.top &&
		shark.y - SHARK_HALF.across < box.bottom
	)
}

/** Bitten, it's done: off it goes. */
export function sharkLeaves(shark: SharkSwim) {
	shark.mode = 'leaving'
}
