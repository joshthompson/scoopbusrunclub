import type { Obstacle } from '../courses/types'
import { play } from '../sfx'
import type { Body, World } from './world'

/**
 * Inside someone, in Karolinska: Germs floating
 * about to pop, and a heart beating, its valves firing whoever's on them
 * up into the air on every beat.
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
/** How long a valve's open on the beat, firing anyone on it up; how far either side; how hard. */
const VALVE_OPEN = 24
export const VALVE_REACH = 48
const VALVE_LAUNCH = 16

/** How far through the heart's beat it is, in ticks since its last "lub". */
export const beatAt = (ticks: number) => ticks % HEARTBEAT

/** Whether the valves are open now, on the beat. */
export const valveOpen = (ticks: number) => beatAt(ticks) < VALVE_OPEN

/** Fired up off a valve, if they're on one as it opens: whether they were. */
export function onValve(world: World, b: Body, x: number) {
	if (!b.grounded || Math.abs(b.x - x) > VALVE_REACH) return false
	if (!valveOpen(world.ticks())) return false
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
