import type { Obstacle } from '../courses/types'
import { play } from '../sfx'
import { GRAVITY } from './constants'
import type { Body, World } from './world'

/**
 * Inside someone, in Karolinska: breathed in off a table, Germs floating
 * about to pop, and a heart beating, its valves firing whoever's on them
 * up into the air on every beat.
 */

// --- Breathed in --------------------------------------------------------

/** How hard the breath pulls, a tick, before the table's edge. */
const BREATH_PULL = 0.06
/** How fast it carries whoever's over the drop, and how quickly it gets them going. */
const BREATH_SPEED = 7.5
const BREATH_GRIP = 0.12
/** How far over the table, and over the nostril's floor, it carries them, at its highest. */
const BREATH_LIFT = 90

const ease = (t: number) => {
	const c = Math.max(0, Math.min(1, t))
	return c * c * (3 - 2 * c)
}

/**
 * The breath on someone, if they're in it: drawn towards the edge, and
 * over the drop, carried up off it and on into the nostril. Whether it's
 * carrying them, so nothing else moves them this tick.
 */
export function breathe(world: World, b: Body) {
	const breath = world.course.breath
	if (!breath || b.x < breath.edge - breath.pull || b.x >= breath.to) return false
	if (b.x < breath.edge) {
		// Sniffed towards it, along the table.
		b.vx += BREATH_PULL
		return false
	}
	// Over the drop: carried, whatever's held, up and into the nostril.
	const { terrain } = world
	const from = terrain.groundY(breath.edge - 1)
	const to = terrain.groundY(breath.to)
	const along = (b.x - breath.edge) / (breath.to - breath.edge)
	const line = from + (to - from) * ease(along * 1.15)
	const target = line - BREATH_LIFT * Math.sin(Math.PI * Math.min(1, along))
	// Once each: the giant breathing in.
	if (!b.breathed) {
		b.breathed = true
		play('sniff')
		world.popup('Sniiiff!', b.x + 60, b.feetY - 90)
	}
	b.grounded = false
	b.jumping = false
	b.ducking = false
	b.on = undefined
	b.facing = 1
	b.vx += (BREATH_SPEED - b.vx) * BREATH_GRIP
	b.vy = Math.max(-9, Math.min(6, (target - b.feetY) * 0.2))
	b.x += b.vx
	b.feetY += b.vy
	// Past it, down onto the nostril's floor, falling as anyone does.
	if (b.x >= breath.to) b.vy = Math.max(0, b.vy) + GRAVITY
	return true
}

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
const VALVE_OPEN = 14
export const VALVE_REACH = 26
const VALVE_LAUNCH = 15.5

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
