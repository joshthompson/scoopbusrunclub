import type { Course } from '../courses/types'
import {
	LIFEBOAT_RIDE_HEIGHT,
	LIFEBOAT_SEAT,
	RAMP_RISE,
	RAMP_RUN,
} from '../draw/art/lifeboat'
import { collect } from '../saved/collected'
import { play } from '../sfx'
import { PICKUP_WORD } from './collectables'
import { CORGI_POINTS, GRAVITY } from './constants'
import { fling } from './secret'
import { scored } from './step'
import type { Body, Racer, World } from './world'

/**
 * A Secret's lifeboat (see `SecretLifeboat`), under Scoop Cruises' engine
 * rooms: bobbing on the water under the hole blown in their floor, for
 * whoever drops down it first. In it, they're off along the water, sat
 * down in it, faster than anyone runs, hopping the waves when they jump,
 * up the trick ramp at the Secret's `launch`, and thrown up off it,
 * back up into the ship. Only the one: anyone down the hole after it's gone
 * drops into the sea.
 */

/**
 * - `waiting`: bobbing under the hole, for someone to drop into it
 * - `ridden`: along the water, someone in it
 * - `thrown`: up off the ramp, whoever was in it thrown on up out of it
 * - `adrift`: back down on the water, empty, drifting to a stop
 */
export type LifeboatState = 'waiting' | 'ridden' | 'thrown' | 'adrift'

export interface Lifeboat {
	/** The middle of it, and its waterline: where it sits in the water. */
	x: number
	y: number
	vx: number
	vy: number
	state: LifeboatState
	/** Who's in it, by their racer's id, while it's `ridden`. */
	rider?: string
	/** Up off the water, hopping a wave, or thrown off the ramp. */
	air: boolean
	/** Degrees it's turned, as a picture's turned: less than none, nose up, up the ramp or hopping. */
	tilt: number
}

/** How fast it goes, once it's got going, and how quickly it gets going: faster than anyone runs. */
const LIFEBOAT_SPEED = 10
const LIFEBOAT_PUSH = 0.08
/** How hard it hops, jumped: over a wave, for the fika over the water. */
const LIFEBOAT_HOP = 8.5
/** How far it bobs up and down on the water, and how quickly. */
const BOB = 1.5
const BOB_TICKS = 9
/** Thrown off the ramp, how hard the boat itself goes up, and how fast it drifts on after. */
const THROWN_UP = 9
const ADRIFT_KEEP = 0.985

/** Where the lifeboat waits: on the water, under the middle of its hole. */
const waitingAt = (course: Pick<Course, 'secret'>) => {
	const lifeboat = course.secret?.lifeboat
	if (!lifeboat) return undefined
	return {
		x: Math.round((lifeboat.hole.from + lifeboat.hole.to) / 2),
		y: lifeboat.water,
	}
}

/** A course's lifeboat, waiting, if its Secret has one. */
export function createLifeboat(course: Pick<Course, 'secret'>) {
	const at = waitingAt(course)
	if (!at) return undefined
	const boat: Lifeboat = {
		x: at.x,
		y: at.y,
		vx: 0,
		vy: 0,
		state: 'waiting',
		air: false,
		tilt: 0,
	}
	return boat
}

/**
 * How far over the water the trick ramp's lifted it, at `x`: straight up
 * its deck to its lip, at the Secret's `launch` (see `rampPicture`).
 */
export function rampRise(world: Pick<World, 'course'>, x: number) {
	const launch = world.course.secret?.launch
	if (launch === undefined) return 0
	const u = (x - (launch - RAMP_RUN)) / RAMP_RUN
	if (u <= 0 || u > 1) return 0
	return RAMP_RISE * u
}

/** The water's surface under the lifeboat at `x`, bobbing, or the ramp's deck. */
function surfaceAt(world: World, x: number) {
	const water = world.course.secret?.lifeboat?.water ?? 0
	const rise = rampRise(world, x)
	if (rise > 0) return water - rise
	return water + BOB * Math.sin(world.ticks() / BOB_TICKS)
}

/**
 * Whether `b` has gone over the side: down out of a Secret through the
 * hole in its floor, under it, into the sea or the lifeboat.
 */
export function overSide(world: Pick<World, 'course'>, b: Body) {
	const secret = world.course.secret
	const hole = secret?.lifeboat?.hole
	if (!secret || !hole || b.secret !== 'in') return false
	return (
		b.feetY > secret.floor + 2 && b.x > hole.from - 20 && b.x < hole.to + 20
	)
}

/**
 * Down out of the hole this tick: into the lifeboat, if it's still waiting,
 * and theirs, sat down in it; or, it gone, into the sea, `true` (fallen,
 * for the caller).
 */
export function dropOut(world: World, racer: Racer) {
	const b = racer.body
	const lifeboat = world.course.secret?.lifeboat
	const boat = world.lifeboat
	if (!lifeboat || !boat || !overSide(world, b) || b.vy < 0) return false
	// It's under the hole, so anyone down it's over it.
	if (boat.state === 'waiting' && b.feetY >= boat.y - LIFEBOAT_SEAT - 4) {
		board(world, racer, boat)
		return false
	}
	// Into the sea: as anyone goes into it, past the boat, or with no boat.
	return b.feetY > lifeboat.water
}

/** In it: sat down, theirs, off along the water. */
function board(world: World, racer: Racer, boat: Lifeboat) {
	const b = racer.body
	boat.state = 'ridden'
	boat.rider = racer.id
	boat.vx = Math.max(2, Math.abs(b.vx))
	boat.vy = 0
	boat.air = false
	b.lifeboat = true
	b.stumble = 0
	b.combo = 0
	collect('ride:lifeboat')
	world.addBonus('corgis', CORGI_POINTS)
	world.popup(
		scored(world, PICKUP_WORD['ride:lifeboat'], `+${CORGI_POINTS}`),
		boat.x,
		boat.y - LIFEBOAT_RIDE_HEIGHT - 70,
	)
	play('splash')
	seat(b, boat)
}

/** Whoever's in it, sat in it, where it is, going as it goes. */
function seat(b: Body, boat: Lifeboat) {
	b.x = boat.x
	b.feetY = boat.y - LIFEBOAT_SEAT
	b.vx = boat.vx
	b.vy = boat.air ? boat.vy : 0
	b.grounded = true
	b.jumping = false
	b.on = undefined
	b.bed = undefined
	b.ducking = true
	b.facing = 1
	b.floor = b.feetY
}

/** Up off the water, or back down on it: its `vy`, and landing on whatever's under it. */
function fly(world: World, boat: Lifeboat) {
	boat.vy += GRAVITY
	boat.y += boat.vy
	const surface = surfaceAt(world, boat.x)
	if (boat.y < surface) return false
	boat.y = surface
	boat.vy = 0
	boat.air = false
	return true
}

/**
 * In the lifeboat, along the water: faster and faster up to its speed, sat
 * down in it; jumped, up off the water, and back down onto it with a
 * splash; and up the trick ramp, thrown up off it.
 */
export function rideLifeboat(world: World, racer: Racer, jump: boolean) {
	const b = racer.body
	const boat = world.lifeboat
	const secret = world.course.secret
	if (!boat || !secret || boat.rider !== racer.id) {
		b.lifeboat = false
		return
	}
	boat.vx += (LIFEBOAT_SPEED - boat.vx) * LIFEBOAT_PUSH
	boat.x += boat.vx
	if (jump && !boat.air && rampRise(world, boat.x) === 0) {
		boat.air = true
		boat.vy = -LIFEBOAT_HOP
		play('jump')
	}
	// Over the ramp's lip, it's thrown from the top of it.
	const crest = boat.x >= secret.launch
	if (boat.air) {
		if (fly(world, boat)) play('splash')
	} else
		boat.y = crest
			? (secret.lifeboat?.water ?? boat.y) - RAMP_RISE
			: surfaceAt(world, boat.x)
	// Nose up, up the ramp, and hopping, as it rises.
	const rise = rampRise(world, boat.x + 10) - rampRise(world, boat.x - 10)
	boat.tilt = boat.air
		? Math.max(-14, Math.min(14, boat.vy * 1.6))
		: -(Math.atan2(rise, 20) * 180) / Math.PI
	seat(b, boat)
	if (!crest) return
	// Off the ramp's lip: thrown up out of it, back up into the ship.
	boat.state = 'thrown'
	boat.rider = undefined
	boat.air = true
	boat.vy = -THROWN_UP
	b.lifeboat = false
	b.ducking = false
	b.grounded = false
	fling(world, b)
	play('whoosh')
	world.popup('Wheee!', b.x, b.feetY - 90)
}

/**
 * The lifeboat, with nobody in it: bobbing where it waits; thrown off the
 * ramp, up, and back down onto the water, drifting to a stop. Ridden, by
 * someone out (scooped, or the race over for them), it's left adrift.
 */
export function stepLifeboat(world: World) {
	const boat = world.lifeboat
	if (!boat) return
	if (boat.state === 'ridden') {
		const rider = world.racers.find((r) => r.id === boat.rider)
		if (rider && !rider.out && rider.body.lifeboat) return
		if (rider) rider.body.lifeboat = false
		boat.state = 'adrift'
		boat.rider = undefined
	}
	if (boat.state === 'waiting') {
		boat.y = surfaceAt(world, boat.x)
		return
	}
	boat.vx *= ADRIFT_KEEP
	boat.x += boat.vx
	if (boat.air) {
		boat.tilt += (boat.vy > 0 ? 3 : -2) * 0.6
		boat.tilt = Math.max(-30, Math.min(20, boat.tilt))
		if (fly(world, boat)) {
			boat.state = 'adrift'
			play('splash')
		}
		return
	}
	boat.tilt *= 0.9
	boat.y = surfaceAt(world, boat.x)
}

/**
 * In the lifeboat, the camera on the water: it and the ship's side over it
 * in view, the sea under it.
 */
export function lifeboatView(world: World, b: Body) {
	const water = world.course.secret?.lifeboat?.water
	if (!b.lifeboat || water === undefined) return undefined
	return { high: water - 320, low: water + 24 }
}
