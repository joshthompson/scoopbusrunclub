import type { FollowerKind } from '../courses/types'
import { play } from '../sfx'
import { GRAVITY } from './constants'
import type { Racer, World } from './world'

/**
 * Followers: something following someone along, a moment behind them, the
 * way they went: Dino Island's hatchling, out of its egg on its own two
 * legs (see `Course['egg']`). It goes where they went, jumps where they
 * jumped, swims where they swam, `FOLLOW_TICKS` behind, so wherever they
 * can go, it can; carried off by a flyer, another carries it after them. Let the bus get to it, and it's scooped, gone. Plain
 * state, on the world; not in a Round.
 */
export interface Follower {
	kind: FollowerKind
	/** Whose it is, by their racer id. */
	owner: string
	x: number
	feetY: number
	facing: 1 | -1
	grounded: boolean
	/** Being carried, as they were there: by a flyer of its own, its own pterodactyl. */
	carried: boolean
	/** How far it's gone, all told: for its legs. */
	run: number
	/** Where they've been, oldest first: where it's going. */
	trail: TrailPoint[]
	/** Over the finish line, home; or scooped up by the bus, flying. */
	out?: 'home' | 'scooped'
	/** Flying out of the scoop: how fast, and how far round it's spun. */
	vx: number
	vy: number
	spin: number
}

interface TrailPoint {
	x: number
	feetY: number
	facing: 1 | -1
	grounded: boolean
	/** Carried by a flyer, there. */
	carried: boolean
}

/** How far behind them it follows, in ticks. */
export const FOLLOW_TICKS = 16
/** How high it leaps, catching up with them, from wherever it was. */
const CATCH_UP_LEAP = 60

/**
 * A new Follower, of `kind`, at `x`, `feetY`, after `owner`: a leap from
 * there to where they are, then on after them.
 */
export function createFollower(
	kind: FollowerKind,
	owner: Racer,
	x: number,
	feetY: number,
): Follower {
	const b = owner.body
	const trail: TrailPoint[] = []
	for (let i = 1; i <= FOLLOW_TICKS; i++) {
		const t = i / FOLLOW_TICKS
		trail.push({
			x: x + (b.x - x) * t,
			feetY: feetY + (b.feetY - feetY) * t - CATCH_UP_LEAP * 4 * t * (1 - t),
			facing: b.x >= x ? 1 : -1,
			grounded: i === FOLLOW_TICKS,
			carried: false,
		})
	}
	return {
		kind,
		owner: owner.id,
		x,
		feetY,
		facing: 1,
		grounded: true,
		carried: false,
		run: 0,
		trail,
		vx: 0,
		vy: 0,
		spin: 0,
	}
}

/**
 * A tick of everyone's Followers: on after them, where they went, a moment
 * behind; home over the finish line; scooped by the bus, if it gets to one.
 */
export function stepFollowers(world: World) {
	for (const f of world.followers) {
		if (f.out === 'scooped') {
			f.x += f.vx
			f.vy += GRAVITY
			f.feetY += f.vy
			f.spin += 14
			continue
		}
		const owner = world.racers.find((r) => r.id === f.owner)
		// Where they are now, to go to in a moment; unless they've been
		// caught, and there's nowhere more to follow them to.
		if (owner && owner.out !== 'scooped' && owner.out !== 'fallen')
			f.trail.push({
				x: owner.body.x,
				feetY: owner.body.feetY,
				facing: owner.body.facing,
				grounded: owner.body.grounded,
				carried: owner.body.carried > 0,
			})
		const next = f.trail.length > FOLLOW_TICKS ? f.trail.shift() : undefined
		if (next) {
			f.run += Math.abs(next.x - f.x)
			f.x = next.x
			f.feetY = next.feetY
			f.facing = next.facing
			f.grounded = next.grounded
			f.carried = next.carried
		}
		if (!f.out && f.x >= world.terrain.finishX) f.out = 'home'
		// The bus gets to it: scooped up and flung off, gone.
		if (!f.out && world.phase() === 'running' && world.bus.frontX >= f.x - 8) {
			f.out = 'scooped'
			f.vx = Math.max(world.bus.speed, 2) + 3
			f.vy = -13
			world.bus.scooping = 10
			play('scooped')
			world.popup('Hatchling scooped!', f.x, f.feetY - 60)
		}
	}
}

/** Whether `racer` has their Follower with them still, not scooped. */
export const stillFollowed = (world: World, racer: Racer) =>
	world.followers.some((f) => f.owner === racer.id && f.out !== 'scooped')
