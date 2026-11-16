import { RUN_TOP_SPEED, STOMP_BOUNCE, STOMP_BOUNCE_HELD } from './constants'
import { bounceOff } from './pack'
import type { Body, ObstacleState, Racer, World } from './world'

/**
 * A River across the course (see `Course['river']`): the Nile, on the
 * Pyramids. Missed its crocodiles and in it, wading, slowed right down;
 * the bus too. Its crocodiles, to bounce across it on, dipping under
 * whoever lands on them.
 */

/** How fast anyone can wade. */
export const WADE_TOP_SPEED = 3.5
/** How much of its pace the bus keeps, driving through it. */
export const RIVER_BUS_PACE = 0.55
/** How far a crocodile's back is up out of the water: what you land on. */
export const CROC_BACK_UP = 8
/** How far either side of its middle its back reaches, to land on. */
export const CROC_REACH = 28
/** Landing this far down into its back still counts as on it. */
const CROC_GIVE = 10
/** How far it dips under whoever bounces on it, and how long it takes to come back up. */
const DIP = 6
const DIP_DOWN = 4
const DIP_UP = 30

/** Whether `x` is in the course's River, bank to bank. */
export const inRiver = (world: World, x: number) => {
	const { river } = world.course
	return !!river && x > river.from && x < river.to
}

/** In it, on its bed, the water over their feet: wading. */
export const wading = (world: World, b: Body) =>
	b.grounded &&
	b.on === undefined &&
	inRiver(world, b.x) &&
	!!world.course.river &&
	b.feetY > world.course.river.level + 2

/**
 * How far a crocodile's dipped under the water, `since` ticks after it
 * was last bounced on: down quickly, and back up slowly.
 */
export function crocDip(since: number | undefined) {
	if (since === undefined || since < 0 || since > DIP_DOWN + DIP_UP) return 0
	if (since < DIP_DOWN) return Math.round((DIP * since) / DIP_DOWN)
	const up = (since - DIP_DOWN) / DIP_UP
	return Math.round(DIP * (1 + Math.cos(up * Math.PI)) * 0.5)
}

/**
 * Coming down onto a crocodile's back this tick: a bounce off it, as off
 * a head, and it dips under them. Points the first time each. No
 * springboard, though: they go on as fast as they came (or at a run, if
 * they came slower), a bounce's length theirs to steer in the air, onto
 * the next one's back. The ones they
 * bounce on in turn, first to last, without touching down between, count
 * for the special goal. Whether they did.
 */
export function bounceOnCrocodile(
	world: World,
	racer: Racer,
	state: ObstacleState,
) {
	const { river } = world.course
	const o = state.obstacle
	const b = racer.body
	if (!river || o.kind !== 'crocodile') return false
	const back = river.level - CROC_BACK_UP
	if (Math.abs(b.x - o.x) > CROC_REACH) return false
	if (b.vy <= 0 || b.feetY < back || b.feetY - b.vy > back + CROC_GIVE)
		return false
	state.flown = world.ticks()
	const crocodiles = world.obstacles.filter(
		(s) => s.obstacle.kind === 'crocodile',
	)
	const index = crocodiles.indexOf(state)
	// In turn: the next one on from the last, or starting again at the first.
	b.crocChain = index === (b.crocChain ?? 0) ? index + 1 : index === 0 ? 1 : 0
	b.crocBest = Math.max(b.crocBest ?? 0, b.crocChain)
	const vx = b.vx
	if (!state.hit.has(racer.id)) {
		state.hit.add(racer.id)
		bounceOff(world, racer, back, o.x)
	} else {
		// Again: just a bounce, nothing for it.
		b.feetY = back
		b.vy = -(racer.controls().up ? STOMP_BOUNCE_HELD : STOMP_BOUNCE)
		b.launchX = undefined
		b.jumping = false
	}
	// On no slower than a run, though: a bounce at a crawl goes nowhere.
	b.vx = Math.max(vx, RUN_TOP_SPEED)
	b.airBase = b.vx
	if (b.crocChain > 1)
		world.popup(
			b.crocChain === crocodiles.length
				? 'Across the Nile!'
				: `${b.crocChain}/${crocodiles.length}`,
			o.x,
			back - 80,
		)
	return true
}

/** Down on the ground: their run of crocodiles, in turn, is over. */
export function touchedDown(b: Body) {
	if (b.grounded) b.crocChain = 0
}
