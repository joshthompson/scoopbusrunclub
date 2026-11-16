import type { Obstacle } from '../courses/types'
import { play } from '../sfx'
import type { Body, World } from './world'

/**
 * Inside someone, in Karolinska: Germs floating
 * about to pop, and a heart beating, its valves flapping open on every
 * beat, and firing whoever gets onto one up into the air.
 */

// --- Germs ---------------------------------------------------------------

/** How big a Germ is, its spikes and all, and how long it takes to bob up and back. */
export const GERM_SIZE = 32
const GERM_BOB = 150

/** Where a Germ's bottom is now, over the Ground. */
export function germHeight(
	o: Extract<Obstacle, { kind: 'germ' }>,
	ticks: number,
) {
	const t = ticks / GERM_BOB + o.x / 377
	return o.low + (o.high - o.low) * (0.5 - 0.5 * Math.cos(t * Math.PI * 2))
}

/** How much of a Germ, either side of its middle, and down from its top, counts as running into it. */
export const GERM_REACH = 13
/** Landing this far into its top still counts as on top of it. */
export const GERM_GIVE = 10

// --- The heart -------------------------------------------------------------

/** A heartbeat, "lub-dub", every this many ticks: the "dub" this long after the "lub". */
export const HEARTBEAT = 80
export const HEARTBEAT_DUB = 14
/** How long a valve's open, on the beat or firing someone up; how far either side it fires them; how hard. */
const VALVE_OPEN = 24
export const VALVE_REACH = 48
const VALVE_LAUNCH = 16

/** How far through the heart's beat it is, in ticks since its last "lub". */
export const beatAt = (ticks: number) => ticks % HEARTBEAT

/** Whether the valves are open now, on the beat. */
export const valveOpen = (ticks: number) => beatAt(ticks) < VALVE_OPEN

/**
 * How long ago, at `ticks`, a valve that last fired someone up at `flown`
 * flapped open to do it, if it's still open from it.
 */
export const valveFlapped = (flown: number | undefined, ticks: number) =>
	flown !== undefined && ticks >= flown && ticks - flown < VALVE_OPEN
		? ticks - flown
		: undefined

/**
 * Fired up off a valve, the moment they're on it, beat or no beat: no
 * stood waiting for it, with the bus coming. Whether they were.
 */
export function onValve(_world: World, b: Body, x: number) {
	if (!b.grounded || Math.abs(b.x - x) > VALVE_REACH) return false
	b.vy = -VALVE_LAUNCH
	b.grounded = false
	b.jumping = false
	b.on = undefined
	b.ducking = false
	play('whoosh')
	return true
}

/** The heart's beat, heard while it's in view. */
export function stepHeart(world: World) {
	const heart = world.course.look?.heartbeat
	if (!heart) return
	const beat = beatAt(world.ticks())
	if (beat !== 0 && beat !== HEARTBEAT_DUB) return
	const middle = world.camera() + world.viewWidth() / 2
	if (middle < heart.from || middle > heart.to) return
	play(beat === 0 ? 'heartbeat' : 'heartbeatDub')
}
