import type { Obstacle } from '../courses/types'
import { swimmingBox } from './swim'
import type { ObstacleState, World } from './world'

/**
 * Sharks, in Deep Water (see `Obstacle`'s `shark`): each lurking, roaming
 * about its own patch of the open water it's put in (see `sharkPatch`),
 * from one spot in it to the next, till anyone swims within `SPOT` of it;
 * then it's after whoever's nearest, turning towards them and speeding
 * up, faster than anyone swims. Into them, a bite, and it's done: back to
 * roaming its patch, never to bite again. Its swimming's stepped by the
 * tick from where everyone is, and where it roams to next is picked by
 * how many spots it's been to, not at random, so a Remote Player's
 * screen, stepping it the same, sees much the same.
 */

type Shark = Extract<Obstacle, { kind: 'shark' }>

/** Where a shark is, and how it's going: on its state, plain. */
export interface SharkSwim {
	x: number
	y: number
	vx: number
	vy: number
	facing: 1 | -1
	/** Roaming, after someone, or done, roaming on, fed. */
	mode: 'lurking' | 'hunting' | 'done'
	/** How many spots in its patch it's been to: which one it's off to next. */
	leg: number
	/** The tick it set off for this one: given up on, taking too long. */
	legAt: number
	/** The tick it was last stepped, so it's stepped once a tick. */
	at: number
}

/** How near it spots anyone, and how far off it gives up on them. */
const SPOT = 520
const GIVE_UP = 900
/** How fast it cruises, roaming; hunting, how fast at most, and how quickly it turns to. */
const CRUISE = 1.6
const HUNT = 7.6
const TURN = 0.06
/** Roaming, how quickly it turns: lazily, round in a curve, not on the spot. */
const ROAM_TURN = 0.025
/** How fast it swims back to its patch from far off, after someone. */
const RETURN = 3
const FAR = 300
/** How near a spot it has to get to be there, and how long it tries before it picks another. */
const THERE = 50
const LEG_TICKS = 900
/**
 * Its patch, of the open water it's in: as wide as this much of it, in
 * the middle of it, and no wider than `PATCH_MOST` either side; as deep as
 * `PATCH_DEEP` either side of where it's put, in the water.
 */
const PATCH_SHARE = 0.6
const PATCH_MOST = 450
const PATCH_DEEP = 150
/** Water shallower than this, over the seabed, isn't open water: a reef, the shore. */
const OPEN_DEPTH = 500
/** How far under the surface, and over the seabed, it keeps to, roaming. */
const UNDER_SURFACE = 110
const OVER_SEABED = 50
/** How finely the open water's looked along, for where it ends. */
const SCAN = 20
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
		leg: 0,
		legAt: 0,
	}
	return state.swim
}

/**
 * Whether `x` is open water: in the Deep Water, out from under any rock,
 * and deep enough over the seabed.
 */
function open(world: Pick<World, 'terrain' | 'course'>, x: number) {
	const { deepWater, cave } = world.course
	if (!deepWater || x < deepWater.from || x >= deepWater.to) return false
	if (cave?.ceiling(x) !== undefined) return false
	return world.terrain.groundY(x) - deepWater.surface >= OPEN_DEPTH
}

/** Each shark's patch, worked out once: by the shark. */
const patches = new WeakMap<Shark, { from: number; to: number }>()

/**
 * A shark's patch, along: the middle of the open water it's put in, from
 * the rock, or the cliff, behind it to the reef rising ahead, or wherever
 * else it ends. Just round where it's put, if that's not open water.
 */
export function sharkPatch(world: Pick<World, 'terrain' | 'course'>, o: Shark) {
	const known = patches.get(o)
	if (known) return known
	let from = o.x
	let to = o.x
	if (open(world, o.x)) {
		while (open(world, from - SCAN)) from -= SCAN
		while (open(world, to + SCAN)) to += SCAN
	}
	const middle = (from + to) / 2
	const half = Math.min(PATCH_MOST, ((to - from) / 2) * PATCH_SHARE)
	const patch = { from: middle - half, to: middle + half }
	patches.set(o, patch)
	return patch
}

/** A number from 0 to 1 for `n` and `seed`, the same every time: no `Math.random`, so every screen agrees. */
function pick(n: number, seed: number) {
	const v = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453
	return v - Math.floor(v)
}

/**
 * The spot in its patch a shark's off to, on its `leg`th: anywhere along
 * it, and as deep as it was put, give or take, in the water there.
 */
function spot(world: Pick<World, 'terrain' | 'course'>, o: Shark, leg: number) {
	const { from, to } = sharkPatch(world, o)
	const x = from + (to - from) * pick(leg, o.x)
	const ground = world.terrain.groundY(x)
	const top = (world.course.deepWater?.surface ?? ground) + UNDER_SURFACE
	const bottom = ground - OVER_SEABED
	const middle = Math.max(top, Math.min(bottom, ground - o.height))
	const y = middle + (pick(leg, o.x + 1) * 2 - 1) * PATCH_DEEP
	return { x, y: Math.max(top, Math.min(bottom, y)) }
}

/** Every shark on the course, a tick on: by the host, and by a Remote Player's screen. */
export function stepSharks(world: World) {
	const now = world.ticks()
	for (const state of world.obstacles) {
		if (state.obstacle.kind !== 'shark') continue
		const shark = sharkSwim(world, state as ObstacleState & { obstacle: Shark })
		if (shark.at === now) continue
		shark.at = now
		// Bitten someone, by the host's say: done.
		if (state.used) shark.mode = 'done'
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
	if (shark.mode === 'done') {
		// Fed: nothing more to do but roam.
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
	} else {
		// Nobody to chase, or done: on to the next spot in its patch, lazily;
		// quicker, from far off. There, or too long at it, and it's off to
		// another.
		let goal = spot(world, o, shark.leg)
		const now = world.ticks()
		if (
			Math.hypot(goal.x - shark.x, goal.y - shark.y) < THERE ||
			now - shark.legAt > LEG_TICKS
		) {
			shark.leg++
			shark.legAt = now
			goal = spot(world, o, shark.leg)
		}
		const dx = goal.x - shark.x
		const dy = goal.y - shark.y
		const d = Math.hypot(dx, dy) || 1
		const speed = d > FAR ? RETURN : CRUISE
		want = { vx: (dx / d) * speed, vy: (dy / d) * speed }
	}
	const turn = shark.mode === 'hunting' ? TURN : ROAM_TURN
	shark.vx += (want.vx - shark.vx) * turn
	shark.vy += (want.vy - shark.vy) * turn
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

/** Bitten, it's done: roaming its patch, never to bite again. */
export function sharkDone(shark: SharkSwim) {
	shark.mode = 'done'
}
