import batAsset from '@/assets/halloween/bat.png'
import { createController } from 'scoopjs'
import {
	EARTH,
	EARTH_LIT,
	GLASS,
	GLASS_LIT,
	GRAVE_MOUND,
	MONSTER,
	WINDOW,
} from '../courses/kit/hauntedHouse'
import { seeded } from '../courses/kit/seeded'
import type { HauntedHouse } from '../courses/types'
import { inClutches, risingFromGrave } from '../game/haunted'
import type { Body, World } from '../game/world'

/**
 * A haunted house's moving parts (see `HauntedHouse`): bats bursting out of
 * its door at whoever's coming; its window, whole till someone jumps out
 * through it, and then smashed, the glass flying; its monster, up in its
 * attic, lunging at whoever gets near; and its grave, earth flying up out
 * of it as a ghost comes up. All by where everyone is, and the tick, so
 * it's the same on every screen.
 */
export function createHauntedHouse(world: World) {
	const house = world.course.haunted
	if (!house) return []
	return [
		createBats(world, house),
		createWindow(world, house),
		createMonster(world, house),
		createGrave(world, house),
	]
}

/** When something first happened, by the tick: once it has, it stays happened. */
function firstTick(world: World, happening: () => boolean) {
	let at: number | undefined
	return () => {
		if (at === undefined && world.ticks() >= 0 && happening())
			at = world.ticks()
		return at
	}
}

/** Everyone still racing, as the physics sees them. */
const racing = (world: World) =>
	world.racers.filter((r) => !r.out).map((r) => r.body)

// --- Bats ---------------------------------------------------------------------

/** How many bats burst out, how long they take to, and how long till they're all gone. */
const BAT_COUNT = 14
const BAT_SPREAD = 50
const BAT_TICKS = 170
/** A bat's frame, two side by side in its sheet, and how big it's drawn. */
const BAT = { width: 13, height: 9, scale: 2 }
/** How far left of the door, and up, the bats can get: their box. */
const BATS_REACH = 1500
const BATS_UP = 420

/** The bats: out of the door, at whoever's coming, flapping, and up and away over them. */
function createBats(world: World, house: HauntedHouse) {
	const out = firstTick(world, () =>
		racing(world).some((b) => b.x >= house.door - house.bats),
	)
	const doorY = world.terrain.groundY(house.door)
	const random = seeded(1031)
	const bats = Array.from({ length: BAT_COUNT }, (_, i) => ({
		delay: Math.round((i / BAT_COUNT) * BAT_SPREAD + random() * 6),
		y: 30 + random() * 50,
		speed: 6 + random() * 3,
		climb: 0.4 + random() * 0.9,
		wobble: random() * Math.PI * 2,
	}))
	const left = house.door - BATS_REACH
	const top = doorY - BATS_UP
	return createController({
		frames: [batAsset],
		init: () => ({
			id: 'house-bats',
			type: 'bats',
			x: () => left,
			y: () => top,
			width: () => BATS_REACH + 40,
			height: () => BATS_UP,
		}),
		draw: ({ ctx, image }) => {
			const from = out()
			const sheet = image(batAsset)
			if (from === undefined || !sheet) return
			const since = world.ticks() - from
			if (since > BAT_TICKS + BAT_SPREAD) return
			const w = BAT.width * BAT.scale
			const h = BAT.height * BAT.scale
			for (const bat of bats) {
				const t = since - bat.delay
				if (t < 0 || t > BAT_TICKS) continue
				const x = house.door - left - t * bat.speed
				const y =
					BATS_UP - bat.y - t * bat.climb + Math.sin(t / 5 + bat.wobble) * 8
				const frame = Math.floor((t + bat.delay) / 4) % 2
				ctx.drawImage(
					sheet.image,
					frame * BAT.width,
					0,
					BAT.width,
					BAT.height,
					Math.round(x - w / 2),
					Math.round(y - h / 2),
					w,
					h,
				)
			}
		},
	})
}

// --- The window ---------------------------------------------------------------

/** How long its glass flies for, and how much of it. */
const SHARD_TICKS = 60
const SHARD_COUNT = 16
/** How far its glass can fly, along and down: the box it's in. */
const SHARDS_REACH = 260

/** The window out: whole, till someone's through it, and then smashed, the glass flying on out with them. */
function createWindow(world: World, house: HauntedHouse) {
	const { window } = house
	const through = firstTick(world, () =>
		racing(world).some(
			(b) =>
				b.x >= window.x - 2 &&
				b.x < window.x + SHARDS_REACH &&
				b.feetY < window.floor + 20,
		),
	)
	const random = seeded(1999)
	const shards = Array.from({ length: SHARD_COUNT }, () => ({
		x: random() * WINDOW.width,
		y: random() * WINDOW.height,
		vx: 1.5 + random() * 4,
		vy: -2 - random() * 3,
		size: random() < 0.4 ? 4 : 2,
	}))
	const top = window.floor - WINDOW.height
	return createController({
		frames: [WINDOW.whole, WINDOW.smashed],
		init: () => ({
			id: 'house-window',
			type: 'scenery',
			x: () => window.x - WINDOW.width / 2,
			y: () => top,
			width: () => WINDOW.width + SHARDS_REACH,
			height: () => WINDOW.height + SHARDS_REACH,
		}),
		draw: ({ ctx, image }) => {
			const at = through()
			const art = image(at === undefined ? WINDOW.whole : WINDOW.smashed)
			if (art) ctx.drawImage(art.image, 0, 0, WINDOW.width, WINDOW.height)
			if (at === undefined) return
			const t = world.ticks() - at
			if (t > SHARD_TICKS) return
			ctx.globalAlpha *= 1 - t / SHARD_TICKS
			for (const [i, s] of shards.entries()) {
				const x = s.x + s.vx * t
				const y = s.y + s.vy * t + 0.25 * t * t
				ctx.fillStyle = i % 3 ? GLASS : GLASS_LIT
				ctx.fillRect(Math.round(x), Math.round(y), s.size, s.size)
			}
		},
	})
}

// --- The monster --------------------------------------------------------------

/** How far further off than its reach it starts to lunge, at whoever's coming. */
const LUNGE_FROM = 120

/** The monster in the attic: waiting, breathing, its eyes on the way up; lunging, at anyone near. */
function createMonster(world: World, house: HauntedHouse) {
	const { monster } = house
	const near = () =>
		racing(world).some(
			(b) =>
				inClutches(world, b) ||
				(b.feetY <= monster.floor + 4 &&
					b.x >= monster.x - monster.reach - LUNGE_FROM &&
					b.x < house.window.x),
		)
	return createController({
		frames: [MONSTER.idle, MONSTER.lunge],
		init: () => ({
			id: 'house-monster',
			type: 'scenery',
			x: () => monster.x - MONSTER.width / 2,
			y: () => monster.floor - MONSTER.height,
			width: () => MONSTER.width,
			height: () => MONSTER.height,
		}),
		draw: ({ ctx, image }) => {
			const lunging = near()
			const art = image(lunging ? MONSTER.lunge : MONSTER.idle)
			if (!art) return
			// Breathing, slow, its shoulders rising and falling; lunging, still.
			const breath = lunging ? 0 : Math.round(Math.sin(world.ticks() / 30)) * 2
			ctx.drawImage(
				art.image,
				lunging ? -8 : 0,
				breath,
				MONSTER.width,
				MONSTER.height - breath,
			)
		},
	})
}

// --- The grave ----------------------------------------------------------------

/** How long earth flies up out of the grave for, and how much. */
const EARTH_TICKS = 50
const CLODS = 12
/** How far its earth flies: the box round the grave it's in. */
const EARTH_REACH = 120

/** The open grave past the house, in front of the path: earth flying up out of it as a ghost comes up. */
function createGrave(world: World, house: HauntedHouse) {
	const ground = world.terrain.groundY(house.grave)
	const risingSince = new WeakMap<Body, number>()
	const random = seeded(4013)
	const clods = Array.from({ length: CLODS }, () => ({
		vx: (random() - 0.5) * 5,
		vy: -4 - random() * 4,
		size: random() < 0.5 ? 4 : 2,
	}))
	/** The latest anyone started coming up out of it, if earth's still flying from it. */
	const latest = () => {
		let since: number | undefined
		for (const b of world.racers.map((r) => r.body)) {
			if (risingFromGrave(world, b) === undefined) continue
			if (!risingSince.has(b)) risingSince.set(b, world.ticks())
			const at = risingSince.get(b) ?? world.ticks()
			if (since === undefined || at > since) since = at
		}
		return since
	}
	let last: number | undefined
	return createController({
		frames: [GRAVE_MOUND.asset],
		init: () => ({
			id: 'house-grave',
			type: 'foreground',
			x: () => house.grave - EARTH_REACH,
			y: () => ground - GRAVE_MOUND.lip - EARTH_REACH,
			width: () => EARTH_REACH * 2,
			height: () => EARTH_REACH + GRAVE_MOUND.height,
		}),
		draw: ({ ctx, image }) => {
			const mound = image(GRAVE_MOUND.asset)
			if (mound)
				ctx.drawImage(
					mound.image,
					EARTH_REACH - GRAVE_MOUND.width / 2,
					EARTH_REACH,
					GRAVE_MOUND.width,
					GRAVE_MOUND.height,
				)
			last = latest() ?? last
			if (last === undefined) return
			const t = world.ticks() - last
			if (t > EARTH_TICKS) return
			for (const [i, c] of clods.entries()) {
				const x = EARTH_REACH + c.vx * t
				const y = EARTH_REACH + GRAVE_MOUND.lip + c.vy * t + 0.3 * t * t
				if (y > EARTH_REACH + GRAVE_MOUND.lip + 4) continue
				ctx.fillStyle = i % 3 ? EARTH : EARTH_LIT
				ctx.fillRect(Math.round(x), Math.round(y), c.size, c.size)
			}
		},
	})
}
