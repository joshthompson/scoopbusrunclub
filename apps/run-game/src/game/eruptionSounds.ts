import {
	ASTEROIDS,
	BIG_ASTEROID,
	FOUNTAIN_TICKS,
	SKY_BOMBS,
	asteroidAt,
	eruptedAt,
	eruptionStrength,
	skyBombAt,
} from '../draw/eruption'
import { SPURT_EVERY } from '../draw/lava'
import { play } from '../sfx'
import { VIEW_HEIGHT } from './constants'
import type { World } from './world'

/**
 * A volcano's sounds (see `CourseLook['eruption']` and `['lava']`), a tick
 * at a time, by the Host, so every screen hears them: its crater's lava
 * spurting, in earshot; going off; roaring on, near it or near the smoke
 * rolling down after everyone, as long as it's throwing lava up; and, in its burning sky, each meteor falling, the
 * big one coming down far off, and the lava bombs hurled over everyone.
 * All by the same ticks they're drawn by.
 */

/**
 * How near the middle of the screen its lava's heard spurting; and it
 * roaring on, its crater or the smoke rolling down after everyone with
 * the bus.
 */
const SPURT_HEARD = 700
const ROAR_HEARD = 1100
/** How often it rumbles, roaring on: a little less than each rumble's length, so they roll on into each other. */
const RUMBLE_EVERY = 90
/** How burnt the sky has to be for what's in it to be heard. */
const SKY_HEARD = 0.5
/** Of the sky's lava bombs, every this many is heard: all of them would be a din. */
const BOMB_HEARD = 3
/** How far down the screen the big meteor's heard coming down: going down behind the ground. */
const METEOR_DOWN = VIEW_HEIGHT - 60

/** Each race's volcano, heard going off: once. */
const heard = new WeakSet<World>()

export function soundEruption(world: World) {
	const ticks = world.ticks()
	if (ticks <= 0 || world.phase() !== 'running') return
	const look = world.course.look
	const middle = world.camera() + world.viewWidth() / 2
	for (const pit of look?.lava ?? [])
		if (
			ticks % SPURT_EVERY === 0 &&
			Math.abs((pit.from + pit.to) / 2 - middle) < SPURT_HEARD
		)
			play('blorp')

	const eruption = look?.eruption
	const at = eruption && eruptedAt(world)
	if (!eruption || at === undefined) return
	if (!heard.has(world)) {
		heard.add(world)
		play('eruption')
		return
	}
	const since = ticks - at
	if (
		since % RUMBLE_EVERY === 0 &&
		since < FOUNTAIN_TICKS * 2 &&
		(Math.abs(eruption.crater.x - middle) < ROAR_HEARD ||
			// The smoke goes no further than the silhouetted stretch.
			(world.bus.frontX < eruption.silhouette.to &&
				Math.abs(world.bus.frontX - middle) < ROAR_HEARD))
	)
		play('rumble')

	if (eruptionStrength(world) < SKY_HEARD) return
	for (let i = 0; i < ASTEROIDS; i++) {
		const now = asteroidAt(i, ticks)
		const was = asteroidAt(i, ticks - 1)
		if (now.t < was.t) play('meteor')
		if (i === BIG_ASTEROID && was.y < METEOR_DOWN && now.y >= METEOR_DOWN)
			play('meteorHit')
	}
	for (let i = 0; i < SKY_BOMBS; i += BOMB_HEARD)
		if (skyBombAt(i, ticks) < skyBombAt(i, ticks - 1)) play('lavaBomb')
}
