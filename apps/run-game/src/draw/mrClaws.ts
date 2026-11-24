import { createController, createObjectSignal } from 'scoopjs'
import type { JSX } from 'solid-js'
import {
	PUFFIN_LEDGES,
	SEA_STACK_FOAM,
	SEA_STACK_NEAR_WIDTH,
	SEA_STACK_SEA,
	STACK_ART_HEIGHT,
	STACK_ART_TOP,
	STACK_CORE,
	STACK_SLICES_LEFT,
	STACK_SLICES_RIGHT,
} from '../courses/kit/seaStackScenery'
import { RUNNER_SCALE, VIEW_HEIGHT, VIEW_WIDTH } from '../game/constants'
import type { World } from '../game/world'
import { ARENA_LEFT } from '../minigames/arena'
import {
	CLASH_TICKS,
	CORE_HALF,
	SLICE,
	SLICES,
	SPLASH_TICKS,
	STACK_HALF,
	STACK_MIDDLE,
	WATERLINE,
	WOBBLE_TICKS,
	clawsOf,
	fallsAt,
	sliceSpan,
	wobblesAt,
} from '../minigames/mrClaws'
import { HORIZON } from './Backdrop'
import {
	GULL_FRAMES,
	GULL_HEIGHT,
	GULL_WIDTH,
	PUFFIN_BLINK,
	PUFFIN_FLY,
	PUFFIN_FLY_HEIGHT,
	PUFFIN_FLY_WIDTH,
	PUFFIN_STAND,
	PUFFIN_STAND_HEIGHT,
	PUFFIN_STAND_WIDTH,
	PUFFIN_STRETCH,
	PUFFIN_SWIM,
	PUFFIN_SWIM_HEIGHT,
	PUFFIN_SWIM_WIDTH,
} from './art/puffin'
import { cellBatch, seeThrough } from './paint/cellBatch'
import { paintPicture } from './paint/picture'

/** A pixel, as everything's drawn: 2 px. */
const CELL = 2
/** How see-through the Sea is, over what's under it: the stack's foot, anyone swimming. */
const SEA_OVER = 0.6
/** How many drops a splash throws up. */
const SPLASH_DROPS = 10
/** A slice of the stack, falling: how fast it gathers speed, and how far it's turned outwards a tick. */
const SLICE_GRAVITY = 0.45
const SLICE_TURN = 0.012
/** When a falling slice's top reaches the Sea, ticks after it went: its splash. */
const SLICE_SPLASHES = Math.ceil(
	Math.sqrt((2 * (WATERLINE - STACK_ART_TOP)) / SLICE_GRAVITY),
)
/** A Clash's sparks: how many, and their colours, hot to cooler. */
const SPARKS = 8
const SPARK_COLOURS = ['#fff6d0', '#ffd24a', '#ff9a2e']
/** The Struggle meter over anyone Grabbed: its size, its back, and its fill as it fills. */
const METER_WIDTH = 40
const METER_HIGH = 6
const METER_BACK = '#2b2722'
const METER_LOW = '#ffd24a'
const METER_FULL = '#7fe05a'

/**
 * The near horizon band's puffins, stood on its stacks and skerry: where
 * each one's left and top are in the band, in px; the band, drawn this far
 * down the screen, moving this much of the camera's way (see `Backdrop`).
 */
const BAND_PUFFINS = [
	[170, 24],
	[834, 82],
	[858, 82],
]
const NEAR_BAND_TOP = HORIZON - 40
const NEAR_BAND_PARALLAX = 0.16
/** How fast a ledge puffin flies off as its slice starts to wobble, out and up, a tick. */
const FLEE_OUT = 2.4
const FLEE_UP = 1.6
/**
 * Puffins flying in, one every `ARRIVE_EVERY` ticks or so, at `FLY_SPEED`,
 * high over the sea, then swooping down into it, bobbing there a while
 * (`BOB_LEAST` to `BOB_LEAST + BOB_MORE` ticks), then diving under, over
 * `DIVE_TICKS`. Where they come down: the open sea either side of the stack.
 */
const ARRIVE_EVERY = 300
const FLY_SPEED = 2.6
const SWOOP_FROM = 0.55
const BOB_LEAST = 300
const BOB_MORE = 300
const DIVE_TICKS = 16
const OPEN_SEA = [
	[24, 150],
	[810, 936],
]
/** Gulls, far off, crossing the sky: how many. */
const GULLS = 5

/** A number from a seed, the same every time, 0 to 1. */
function hash(n: number) {
	let h = Math.imul(n * 374761393 + 668265263, 1274126177)
	h ^= h >>> 13
	h = Math.imul(h, 1103515245)
	return ((h >>> 0) % 10000) / 10000
}

/**
 * Mr Claws, drawn: the sea stack, its edge slices wobbling and breaking
 * off into the Sea in the last half minute (everyone's Crab Hat is a hat,
 * drawn on their head, posed: see `hatArt`); the Sea in front, over the stack's foot and anyone in it;
 * splashes, Clashes' sparks, and the Struggle meter over anyone Grabbed.
 * Nothing, if the world's not a game of it.
 */
export function createMrClaws(world: World) {
	const show = clawsOf(world)
	if (!show) return []
	/** One picture over the whole arena: `type` says what it's in front of. */
	const layer = (
		id: string,
		type: string,
		paint: (
			ctx: CanvasRenderingContext2D,
			image: Parameters<typeof paintPicture>[1],
			now: number,
		) => void,
	) =>
		createController({
			init: () => ({
				id,
				type,
				...createObjectSignal(ARENA_LEFT, 'x'),
				...createObjectSignal(0, 'y'),
				...createObjectSignal({} as JSX.CSSProperties, 'style'),
				width: () => VIEW_WIDTH,
				height: () => VIEW_HEIGHT,
			}),
			draw({ ctx, image }) {
				// Read the tick, so it's painted again every one.
				paint(ctx, image, world.ticks())
			},
		})

	/** The Sea's edge at `x` across the screen, rippling. */
	const surface = (x: number, now: number) =>
		Math.round(
			(WATERLINE +
				2 * Math.sin(x / 37 + now / 20) +
				Math.sin(x / 13 - now / 11)) /
				CELL,
		) * CELL

	const stack = layer('sea-stack', 'boost', (ctx, image) => {
		const race = world.raceTicks()
		paintPicture(
			ctx,
			image,
			STACK_CORE,
			STACK_MIDDLE - CORE_HALF - ARENA_LEFT,
			STACK_ART_TOP,
			CORE_HALF * 2,
			STACK_ART_HEIGHT,
		)
		for (const side of [-1, 1]) {
			const slices = side < 0 ? STACK_SLICES_LEFT : STACK_SLICES_RIGHT
			for (let i = 0; i < SLICES; i++) {
				const { from } = sliceSpan(side, i)
				const x = from - ARENA_LEFT
				const since = race - fallsAt(i)
				if (since < 0) {
					// Wobbling, about to go: shaking, quicker the nearer it is.
					const wobble = race - wobblesAt(i)
					const shake =
						wobble >= 0 && wobble < WOBBLE_TICKS
							? (Math.floor(race / (wobble > WOBBLE_TICKS / 2 ? 2 : 4)) % 2
									? 1
									: -1) * CELL
							: 0
					paintPicture(
						ctx,
						image,
						slices[i],
						x + shake,
						STACK_ART_TOP,
						SLICE,
						STACK_ART_HEIGHT,
					)
					continue
				}
				// Gone: falling, tipping outwards, down into the Sea.
				const drop = 0.5 * SLICE_GRAVITY * since * since
				if (STACK_ART_TOP + drop > VIEW_HEIGHT) continue
				ctx.save()
				ctx.translate(x + (side < 0 ? 0 : SLICE), STACK_ART_TOP + drop)
				ctx.rotate(side * since * SLICE_TURN)
				paintPicture(
					ctx,
					image,
					slices[i],
					side < 0 ? 0 : -SLICE,
					0,
					SLICE,
					STACK_ART_HEIGHT,
				)
				ctx.restore()
			}
		}
	})

	const sea = layer('sea-stack-sea', 'foreground', (ctx, _image, now) => {
		// The Sea, over everything under its edge, see-through; and foam
		// along its edge, broken. Each filled the once: as strips, side by
		// side, they'd show a hairline between each.
		const cells = cellBatch(ctx)
		cells.fillStyle = seeThrough(SEA_STACK_SEA, SEA_OVER)
		for (let x = 0; x < VIEW_WIDTH; x += CELL * 2) {
			const top = surface(x, now)
			cells.fillRect(x, top, CELL * 2, VIEW_HEIGHT - top)
		}
		cells.fillStyle = SEA_STACK_FOAM
		for (let x = 0; x < VIEW_WIDTH; x += CELL * 2)
			if ((x / (CELL * 2) + Math.floor(now / 16)) % 5 !== 0)
				cells.fillRect(x, surface(x, now) - CELL, CELL * 2, CELL)
		cells.flush()
	})

	/** A splash at `x` across the screen, `t` ticks in, `big` for a lump of cliff. */
	function paintSplash(
		ctx: CanvasRenderingContext2D,
		x: number,
		t: number,
		big: number,
	) {
		const fade = 1 - t / SPLASH_TICKS
		ctx.fillStyle = SEA_STACK_FOAM
		// The column, up and falling back.
		if (t < 14) {
			ctx.globalAlpha = 0.9
			const tall =
				Math.round(((t < 6 ? t * 6 : (14 - t) * 4.5) * big) / CELL) * CELL
			const wide = Math.round((12 * big) / CELL) * CELL
			ctx.fillRect(
				Math.round(x / CELL) * CELL - wide / 2,
				WATERLINE - tall,
				wide,
				tall,
			)
		}
		// Drops, flung up and out, and down again.
		ctx.globalAlpha = fade
		for (let k = 0; k < SPLASH_DROPS * big; k++) {
			const out = ((k * 7) % SPLASH_DROPS) / (SPLASH_DROPS - 1) - 0.5
			const up = 5 + ((k * 5) % 4)
			const dx = x + out * 6 * big * t
			const dy = WATERLINE - (up * t - 0.35 * t * t)
			if (dy > WATERLINE) continue
			const size = k % 3 ? CELL : CELL * 2
			ctx.fillRect(
				Math.round(dx / CELL) * CELL,
				Math.round(dy / CELL) * CELL,
				size,
				size,
			)
		}
		// A ring of foam spreading out on the water.
		const ring = Math.round(((12 + t * 1.6) * big) / CELL) * CELL
		ctx.fillRect(Math.round(x / CELL) * CELL - ring - 6, WATERLINE, 8, CELL)
		ctx.fillRect(Math.round(x / CELL) * CELL + ring - 2, WATERLINE, 8, CELL)
		ctx.globalAlpha = 1
	}

	const effects = layer('claws-effects', 'foreground', (ctx, _image, now) => {
		// Splashes: anyone going in, and slices of the stack.
		for (const splash of show.splashes) {
			const t = now - splash.at
			if (t >= 0 && t < SPLASH_TICKS)
				paintSplash(ctx, splash.x - ARENA_LEFT, t, 1)
		}
		const race = world.raceTicks()
		for (let i = 0; i < SLICES; i++) {
			const t = race - fallsAt(i) - SLICE_SPLASHES
			if (t < 0 || t >= SPLASH_TICKS) continue
			for (const side of [-1, 1]) {
				const { from } = sliceSpan(side, i)
				paintSplash(ctx, from + SLICE / 2 - ARENA_LEFT + side * 12, t, 1.8)
			}
		}
		// Clashes: sparks flying out from where the claws met.
		for (const clash of show.clashes) {
			const t = now - clash.at
			if (t < 0 || t >= CLASH_TICKS) continue
			const x = clash.x - ARENA_LEFT
			for (let k = 0; k < SPARKS; k++) {
				const angle = (k / SPARKS) * Math.PI * 2 + hash(clash.at + k) * 0.6
				const out = 4 + t * (2.2 + hash(clash.at * 3 + k))
				const size = t < 8 ? CELL * 2 : CELL
				ctx.fillStyle = SPARK_COLOURS[Math.min(2, Math.floor(t / 8))]
				ctx.fillRect(
					Math.round((x + Math.cos(angle) * out) / CELL) * CELL,
					Math.round((clash.y + Math.sin(angle) * out * 0.7) / CELL) * CELL,
					size,
					size,
				)
			}
			// A flash, at first, where they met.
			if (t < 4) {
				ctx.fillStyle = SPARK_COLOURS[0]
				ctx.fillRect(Math.round(x / CELL) * CELL - 6, clash.y - 6, 12, 12)
			}
		}
		// Struggle meters, over anyone up in someone's claws.
		for (const racer of world.racers) {
			const c = show.claws.get(racer.id)
			if (!c?.carriedBy) continue
			const b = racer.body
			const x = Math.round((b.x - ARENA_LEFT - METER_WIDTH / 2) / CELL) * CELL
			const y =
				Math.round(
					(b.feetY - (racer.runner.sprite.height * RUNNER_SCALE) / 2 - 34) /
						CELL,
				) * CELL
			ctx.fillStyle = METER_BACK
			ctx.fillRect(
				x - CELL,
				y - CELL,
				METER_WIDTH + CELL * 2,
				METER_HIGH + CELL * 2,
			)
			const full = Math.min(1, c.struggle)
			ctx.fillStyle = full > 0.7 ? METER_FULL : METER_LOW
			ctx.fillRect(
				x,
				y,
				Math.round((METER_WIDTH * full) / CELL) * CELL,
				METER_HIGH,
			)
		}
	})

	/**
	 * A puffin stood up, `seed` its own, fidgeting: turning round every so
	 * often, blinking, and now and again stretching a wing.
	 */
	function idlePuffin(seed: number, now: number) {
		const t = now + Math.floor(hash(seed) * 1000)
		const stretching = t % 640 >= 400 && t % 640 < 436
		const picture = stretching
			? Math.floor(t / 6) % 2
				? PUFFIN_STRETCH
				: PUFFIN_STAND
			: t % 210 < 7
				? PUFFIN_BLINK
				: PUFFIN_STAND
		const flip = Math.floor(t / (360 + seed * 40)) % 2 === 1
		return { picture, flip }
	}

	/** `picture`, `width` by `height`, its top left at `x`, `y`, turned to face right if `flip`. */
	function paintBird(
		ctx: CanvasRenderingContext2D,
		image: Parameters<typeof paintPicture>[1],
		picture: string,
		x: number,
		y: number,
		width: number,
		height: number,
		flip: boolean,
	) {
		const left = Math.round(x / CELL) * CELL
		const top = Math.round(y / CELL) * CELL
		if (!flip) {
			paintPicture(ctx, image, picture, left, top, width, height)
			return
		}
		ctx.save()
		ctx.translate(left + width, top)
		ctx.scale(-1, 1)
		paintPicture(ctx, image, picture, 0, 0, width, height)
		ctx.restore()
	}

	/** A puffin flying in, the `k`th: where it's from, where it comes down, and when. */
	function arrival(k: number) {
		const from = hash(k * 5 + 1) < 0.5 ? -1 : 1
		const lands = hash(k * 5 + 2) < 0.6 ? from : -from
		const [low, high] = OPEN_SEA[lands < 0 ? 0 : 1]
		const landX = low + hash(k * 5 + 3) * (high - low)
		const startX = from < 0 ? -PUFFIN_FLY_WIDTH : VIEW_WIDTH
		const cruise = 140 + hash(k * 5 + 4) * 90
		const start = k * ARRIVE_EVERY + Math.floor(hash(k * 5) * 150)
		const flight = Math.abs(landX - startX) / FLY_SPEED
		const bob = BOB_LEAST + Math.floor(hash(k * 5 + 6) * BOB_MORE)
		return { startX, landX, cruise, start, flight, bob }
	}

	/** The puffins flying in that are about at `now`: each's arrival, and how far it is through its time. */
	function arrivals(now: number) {
		const last = Math.floor(now / ARRIVE_EVERY)
		const about = []
		for (let k = Math.max(0, last - 4); k <= last; k++) {
			const a = arrival(k)
			const t = now - a.start
			if (t >= 0 && t < a.flight + a.bob + DIVE_TICKS) about.push({ k, a, t })
		}
		return about
	}

	/** The near horizon's puffins, and gulls crossing the sky, behind everything. */
	const distant = layer('distant-birds', 'scenery', (ctx, image, now) => {
		const off = Math.round(-world.camera() * NEAR_BAND_PARALLAX)
		BAND_PUFFINS.forEach(([x, y], i) => {
			const { picture, flip } = idlePuffin(i + 11, now)
			for (const wrap of [0, SEA_STACK_NEAR_WIDTH])
				paintBird(
					ctx,
					image,
					picture,
					x + off - wrap,
					NEAR_BAND_TOP + y,
					PUFFIN_STAND_WIDTH,
					PUFFIN_STAND_HEIGHT,
					flip,
				)
		})
		for (let i = 0; i < GULLS; i++) {
			const speed = 0.25 + hash(i * 3 + 40) * 0.35
			const way = hash(i * 3 + 41) < 0.5 ? -1 : 1
			const span = VIEW_WIDTH + GULL_WIDTH * 4
			const across =
				((((hash(i * 3 + 42) * span + now * speed * way) % span) + span) %
					span) -
				GULL_WIDTH * 2
			const y = 70 + hash(i * 7 + 43) * 90 + Math.sin((now + i * 90) / 70) * 4
			// Flapping, wings up, level, down, level; or now and then gliding, level.
			const gliding = Math.floor((now + i * 77) / 90) % 3 === 0
			const flap = [0, 1, 2, 1][Math.floor((now + i * 5) / 6) % 4]
			paintBird(
				ctx,
				image,
				GULL_FRAMES[gliding ? 1 : flap],
				across,
				y,
				GULL_WIDTH,
				GULL_HEIGHT,
				false,
			)
		}
	})

	/** The stack's ledge puffins, and puffins flying in, in front of the stack, behind everyone. */
	const puffins = layer('puffins', 'boost', (ctx, image, now) => {
		const race = world.raceTicks()
		const flapping = Math.floor(now / 5) % 2
		PUFFIN_LEDGES.forEach((ledge, i) => {
			const x = STACK_MIDDLE - STACK_HALF + ledge.left - ARENA_LEFT
			const top = STACK_ART_TOP + ledge.feet - PUFFIN_STAND_HEIGHT
			// On a slice of the stack that's about to go: off it flies, out and up, as it starts to wobble.
			const middle =
				STACK_MIDDLE - STACK_HALF + ledge.left + PUFFIN_STAND_WIDTH / 2
			let flees: { side: number; at: number } | undefined
			for (const side of [-1, 1])
				for (let j = 0; j < SLICES; j++) {
					const { from, to } = sliceSpan(side, j)
					if (middle >= from && middle < to) flees = { side, at: wobblesAt(j) }
				}
			const gone = flees && race >= flees.at ? race - flees.at : -1
			if (gone < 0) {
				const { picture, flip } = idlePuffin(i + 1, now)
				paintBird(
					ctx,
					image,
					picture,
					x,
					top,
					PUFFIN_STAND_WIDTH,
					PUFFIN_STAND_HEIGHT,
					flip,
				)
				return
			}
			const side = flees?.side ?? 1
			paintBird(
				ctx,
				image,
				PUFFIN_FLY[flapping],
				x + side * gone * FLEE_OUT,
				top - gone * FLEE_UP,
				PUFFIN_FLY_WIDTH,
				PUFFIN_FLY_HEIGHT,
				side > 0,
			)
		})
		for (const { k, a, t } of arrivals(now)) {
			const right = a.landX > a.startX
			if (t < a.flight) {
				// In, high over the sea, flapping; then swooping down to it, wings up.
				const p = t / a.flight
				const x = a.startX + (a.landX - a.startX) * p
				const swoop = Math.max(0, (p - SWOOP_FROM) / (1 - SWOOP_FROM))
				const y =
					a.cruise + (WATERLINE - PUFFIN_FLY_HEIGHT - a.cruise) * swoop * swoop
				paintBird(
					ctx,
					image,
					PUFFIN_FLY[swoop > 0 && swoop < 0.8 ? 0 : flapping],
					x,
					y,
					PUFFIN_FLY_WIDTH,
					PUFFIN_FLY_HEIGHT,
					right,
				)
				continue
			}
			// On the water, bobbing, drifting, turning round now and then; then diving under.
			const on = t - a.flight
			const diving = Math.max(0, on - a.bob)
			const x = a.landX - PUFFIN_SWIM_WIDTH / 2 + Math.sin(on / 90 + k) * 6
			const y =
				WATERLINE +
				2 -
				PUFFIN_SWIM_HEIGHT +
				Math.round(Math.sin(on / 18 + k) * 0.8) * CELL +
				diving * 1.2
			const flip = Math.floor((on + k * 50) / 240) % 2 === 0 ? right : !right
			paintBird(
				ctx,
				image,
				PUFFIN_SWIM,
				x,
				y,
				PUFFIN_SWIM_WIDTH,
				PUFFIN_SWIM_HEIGHT,
				flip,
			)
		}
	})

	/** A splash as each puffin comes down into the sea, and a little one as it dives. */
	const birdSplashes = layer(
		'puffin-splashes',
		'foreground',
		(ctx, _image, now) => {
			for (const { k, a, t } of arrivals(now)) {
				const landed = t - a.flight
				if (landed >= 0 && landed < SPLASH_TICKS)
					paintSplash(ctx, a.landX, landed, 0.5)
				const dived = landed - a.bob
				if (dived >= 0 && dived < SPLASH_TICKS)
					paintSplash(ctx, a.landX + Math.sin(a.bob / 90 + k) * 6, dived, 0.3)
			}
		},
	)

	return [distant, stack, puffins, sea, effects, birdSplashes]
}
