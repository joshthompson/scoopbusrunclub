import { createController } from 'scoopjs'
import { createEffect, onCleanup } from 'solid-js'
import type { Eruption } from '../courses/types'
import { VIEW_HEIGHT, VIEW_WIDTH } from '../game/constants'
import { type World, isCaught } from '../game/world'
import { cellBatch } from './paint/cellBatch'

/**
 * A volcano erupting (see `CourseLook['eruption']`), once everyone
 * racing's crossed its crater: the course's own sky and hills fading away behind a
 * burning one, red cloud on red cloud, darker the higher up, ridges of
 * mountains in deep reds, the volcano itself far off, lava pouring down
 * it and its smoke going up into the clouds, and ash falling. Painted
 * behind the race's canvas, so with the canvas's own sky gone, it shows
 * through; and from `silhouette.from` to `silhouette.to`, everything in the
 * canvas is drawn black against it (`silhouetteFilter`). All of it goes by
 * the tick the last of them crossed, and where the camera is, so it's the same on
 * every screen.
 */

/** How long the sky takes to burn red, and the screen shakes, once it's gone off. */
const BURN_TICKS = 90
const SHAKE_TICKS = 50
/** How far into, and out of, the silhouetted stretch it takes to go black, and back. */
const SILHOUETTE_FADE = 500

/** When each race's volcano went off, by the tick: drawing only, worked out from the bus. */
const wentOff = new WeakMap<World, number>()

/**
 * When the volcano went off, if it has: the first tick everyone still
 * racing was over its crater, the last of them off its bridge. Or, if
 * they've all been caught, the bus.
 */
export function eruptedAt(world: World) {
	const eruption = world.course.look?.eruption
	if (!eruption) return undefined
	const at = wentOff.get(world)
	if (at !== undefined && at <= world.ticks()) return at
	if (world.ticks() < 0) return undefined
	const racing = world.racers.filter((r) => !isCaught(r.out))
	const allOver =
		racing.length > 0 && racing.every((r) => r.body.x >= eruption.at)
	if (!allOver && world.bus.frontX < eruption.at) return undefined
	wentOff.set(world, world.ticks())
	return world.ticks()
}

/** How far before it's cleared the smoke starts clearing. */
const CLEARING = 700

/**
 * How burnt the sky is, 0 to 1: none till it goes off, then up to all of
 * it; and clearing again, far enough on, by where the camera's looking.
 */
export function eruptionStrength(world: World) {
	const at = eruptedAt(world)
	const eruption = world.course.look?.eruption
	if (at === undefined || !eruption) return 0
	const x = world.camera() + world.viewWidth() * 0.35
	const clearing = Math.max(0, Math.min(1, (eruption.clear - x) / CLEARING))
	return Math.min(1, (world.ticks() - at) / BURN_TICKS) * clearing
}

/** How far the screen's shaken, the volcano going off. */
export function eruptionShake(world: World) {
	const at = eruptedAt(world)
	if (at === undefined) return 0
	const since = world.ticks() - at
	if (since > SHAKE_TICKS) return 0
	return Math.round(Math.sin(since * 1.7) * 6 * (1 - since / SHAKE_TICKS))
}

/** How black everything in the canvas is, 0 to 1: in the silhouetted stretch, once it's gone off. */
export function silhouetteOf(world: World) {
	const eruption = world.course.look?.eruption
	if (!eruption) return 0
	const burnt = eruptionStrength(world)
	if (!burnt) return 0
	// Where the camera's looking: a third of the way across, where the runner is.
	const x = world.camera() + world.viewWidth() * 0.35
	const { from, to } = eruption.silhouette
	const into = Math.min(x - from, to - x) / SILHOUETTE_FADE
	return burnt * Math.max(0, Math.min(1, into))
}

/** The canvas's CSS filter for its silhouette, if it's in one. */
export function silhouetteFilter(world: World) {
	const black = silhouetteOf(world)
	return black > 0 ? `brightness(${(1 - black).toFixed(3)})` : undefined
}

// --- The burning sky ----------------------------------------------------------------------

/** The cloud bands, top down: their colours, how far down the screen, and how fast they drift by. */
const CLOUDS: [colour: string, top: number, parallax: number][] = [
	['#1a0202', 0, 0.02],
	['#2c0404', 70, 0.03],
	['#420606', 140, 0.04],
	['#5e0808', 200, 0.05],
	['#8a0c0a', 255, 0.06],
	['#b0120c', 300, 0.07],
]
/** The ridges, back to front: their colours, how high their peaks reach, and how fast they go by. */
const RIDGES: [colour: string, top: number, parallax: number, seed: number][] =
	[
		['#7a0a08', 300, 0.1, 1],
		['#5a0606', 340, 0.18, 2],
		['#3a0303', 380, 0.28, 3],
	]
/** How the far volcano goes by, and how big it is. */
const VOLCANO_PARALLAX = 0.06
const VOLCANO_WIDE = 360
const VOLCANO_TALL = 200
const LAVA = '#ff7a1a'
const LAVA_BRIGHT = '#ffd23a'
const SMOKE = '#2a0a08'

/**
 * Asteroids falling out of the sky at once, how long each takes, and
 * which way they fall: down and on, steeply, slowly.
 */
export const ASTEROIDS = 3
const ASTEROID_EVERY = 260
const ASTEROID_VX = 1.6
const ASTEROID_VY = 2.6
const ASTEROID_SPEED = Math.hypot(ASTEROID_VX, ASTEROID_VY)
const ASTEROID = '#f6e2d6'
const TRAIL = '#e2b8a8'
const TRAIL_FAR = '#b88a80'

/**
 * Asteroid `i`, `ticks` in: how far it's fallen (in ticks, since it first
 * appeared over the top of the screen), how big it is, and where on the
 * screen it's got to. Also what its sounds go by (`eruptionSounds`).
 */
export function asteroidAt(i: number, ticks: number) {
	const t =
		(ticks + i * Math.round(ASTEROID_EVERY / ASTEROIDS) * 1.3) % ASTEROID_EVERY
	const from = ((i * 331) % 700) + 40
	return {
		t,
		size: 8 + ((i * 5) % 3) * 4,
		x: from + ASTEROID_VX * t,
		y: -60 + ASTEROID_VY * t,
	}
}
/** The biggest of them: the one heard coming down. */
export const BIG_ASTEROID = 1

/** Sky lava bomb `i`, `ticks` in: how long since it was hurled out. */
export const skyBombAt = (i: number, ticks: number) =>
	(ticks + i * (SKY_BOMB_EVERY / SKY_BOMBS) * 1.7) % SKY_BOMB_EVERY

/** How far down the screen it sinks, at most, looking up a mountain. */
const SINKS = 110

/** Lava bombs across the sky at once, and how long each takes across it. */
export const SKY_BOMBS = 9
const SKY_BOMB_EVERY = 300

/** A wavy edge, in 4 px steps: a cloud band's bottom, a ridge's top. */
const wave = (x: number, seed: number, high: number) =>
	Math.round(
		(Math.sin(x / 47 + seed) * 0.6 +
			Math.sin(x / 19 + seed * 2.3) * 0.3 +
			Math.sin(x / 113 + seed * 0.7)) *
			high,
	)

/** How high a ridge's peaks are `x` along: sharp peaks, saddles between, up to about 90 px. */
function ridgeLine(x: number, seed: number) {
	const peak = (wide: number, phase: number) =>
		1 - Math.abs(((((x / wide + phase) % 2) + 2) % 2) - 1)
	return (
		peak(170, seed * 0.37) * 55 +
		peak(63, seed * 0.71) * 22 +
		peak(29, seed * 0.13) * 8
	)
}

function paintSky(
	ctx: CanvasRenderingContext2D,
	world: World,
	eruption: Eruption,
) {
	const camera = world.camera()
	const ticks = Math.max(0, world.ticks())
	ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT)
	// Looking up a mountain, it's all a little lower on the screen, as the
	// course's own horizon is (see `backdropLift`), and no more: the
	// ridges still just over the ground, however high up it is.
	const lift =
		Math.round(Math.min(SINKS, Math.max(0, -world.cameraY() * 0.5)) / 4) * 4
	const cloudLift = Math.round(lift / 2 / 4) * 4
	// The glow low down, under the clouds; then cloud on cloud, the
	// highest and darkest over the rest.
	ctx.fillStyle = '#c8180e'
	ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT)
	for (const [colour, top, parallax] of [...CLOUDS].reverse()) {
		ctx.fillStyle = colour
		const drift = camera * parallax + ticks * parallax * 2
		for (let x = 0; x < VIEW_WIDTH; x += 4) {
			const edge = top + 40 + wave(x + drift, top, 12) + cloudLift
			if (edge > 0) ctx.fillRect(x, 0, 4, Math.round(edge / 4) * 4)
		}
	}
	// The volcano, far off, behind the ridges: lava down it, smoke up off it.
	const vx = Math.round(
		(eruption.crater.x - camera) * VOLCANO_PARALLAX + VIEW_WIDTH * 0.1,
	)
	const vy = 250 + lift
	ctx.fillStyle = '#4a0505'
	for (let y = 0; y < VOLCANO_TALL; y += 4) {
		const half = 30 + (y / VOLCANO_TALL) * (VOLCANO_WIDE / 2)
		ctx.fillRect(vx - half, vy + y, half * 2, 4)
	}
	// Lava, pouring down it, flickering.
	for (const [off, phase] of [
		[-10, 0],
		[14, 2],
		[-26, 4],
	]) {
		ctx.fillStyle = (ticks / 8 + phase) % 2 < 1 ? LAVA : LAVA_BRIGHT
		for (let y = 0; y < 120; y += 4) {
			const x = vx + off + (off < 0 ? -1 : 1) * Math.round((y * 0.45) / 4) * 4
			ctx.fillRect(x, vy + y, 4, 4)
		}
	}
	// Its smoke, billowing up into the clouds.
	ctx.fillStyle = SMOKE
	for (let i = 0; i < 14; i++) {
		const rise = ((ticks * 0.6 + i * 22) % 300) / 300
		const r = 16 + rise * 50
		const x = vx + Math.sin(i * 1.7) * 20 + rise * 60
		const y = vy - rise * 260
		for (let dy = -r; dy < r; dy += 4)
			ctx.fillRect(
				Math.round((x - Math.sqrt(r * r - dy * dy)) / 4) * 4,
				Math.round((y + dy) / 4) * 4,
				Math.round((Math.sqrt(r * r - dy * dy) * 2) / 4) * 4,
				4,
			)
	}
	// The ridges, front to back.
	for (const [colour, top, parallax, seed] of RIDGES) {
		ctx.fillStyle = colour
		const drift = camera * parallax
		for (let x = 0; x < VIEW_WIDTH; x += 4) {
			const peaks = ridgeLine(x + drift, seed)
			const edge = Math.round((top - peaks + 30 + lift) / 4) * 4
			ctx.fillRect(x, edge, 4, VIEW_HEIGHT - edge)
		}
	}
	// Asteroids, falling out of the sky, long pale trails behind them, down
	// and on, one after another.
	for (let i = 0; i < ASTEROIDS; i++) {
		const { size, ...head } = asteroidAt(i, ticks)
		if (head.y > VIEW_HEIGHT + 40) continue
		// Its trail, back up the way it came, tapering, paler and paler.
		const length = 160 + size * 8
		for (let along = length; along > 0; along -= 4) {
			const k = along / length
			const width = Math.max(2, Math.round((size * (1 - k)) / 2) * 2)
			ctx.fillStyle = k > 0.6 ? TRAIL_FAR : TRAIL
			ctx.fillRect(
				Math.round((head.x - (ASTEROID_VX / ASTEROID_SPEED) * along) / 2) * 2 -
					width / 2,
				Math.round((head.y - (ASTEROID_VY / ASTEROID_SPEED) * along) / 2) * 2 -
					width / 2,
				width,
				width,
			)
		}
		// Its head, round, burning white.
		ctx.fillStyle = ASTEROID
		for (let dy = -size / 2; dy < size / 2; dy += 2) {
			const half = Math.round(Math.sqrt((size / 2) ** 2 - dy * dy) / 2) * 2
			ctx.fillRect(
				Math.round(head.x / 2) * 2 - half,
				Math.round((head.y + dy) / 2) * 2,
				half * 2,
				2,
			)
		}
	}
	// Lava bombs, hurled out of it, arcing across the sky over everyone,
	// bright against it, trailing fire: by the tick, one after another.
	for (let i = 0; i < SKY_BOMBS; i++) {
		const t = skyBombAt(i, ticks)
		const from = ((i * 263) % 400) - 120
		const vx = 3.2 + ((i * 37) % 10) / 4
		const vy = 2.6 + ((i * 53) % 10) / 5
		const at = (u: number) => ({
			x: from + vx * u,
			y: 300 + lift - vy * u + 0.012 * u * u,
		})
		const head = at(t)
		if (head.y > VIEW_HEIGHT || head.x > VIEW_WIDTH) continue
		for (let k = 4; k >= 0; k--) {
			const p = at(t - k * 3)
			ctx.fillStyle = k === 0 ? LAVA_BRIGHT : k < 3 ? LAVA : '#c8321a'
			const size = k === 0 ? 6 : 4
			ctx.fillRect(Math.round(p.x / 2) * 2, Math.round(p.y / 2) * 2, size, size)
		}
	}
	// Ash, falling.
	ctx.fillStyle = '#1a0606'
	for (let i = 0; i < 40; i++) {
		const x =
			(i * 211 + ticks * (0.4 + (i % 3) * 0.2) - camera * 0.4) % VIEW_WIDTH
		const y = (i * 97 + ticks * (0.8 + (i % 4) * 0.3)) % VIEW_HEIGHT
		ctx.fillRect(
			Math.round(((x + VIEW_WIDTH) % VIEW_WIDTH) / 2) * 2,
			Math.round(y / 2) * 2,
			2,
			2,
		)
	}
}

/** The burning sky, behind the race's canvas: there once the volcano's gone off. */
export function EruptionSky(props: { world: World }) {
	const eruption = props.world.course.look?.eruption
	if (!eruption) return null
	const canvas = document.createElement('canvas')
	canvas.width = VIEW_WIDTH
	canvas.height = VIEW_HEIGHT
	Object.assign(canvas.style, {
		position: 'absolute',
		inset: '0',
		width: '100%',
		height: '100%',
		'image-rendering': 'pixelated',
		'pointer-events': 'none',
	})
	const ctx = canvas.getContext('2d')
	let painted = -1
	createEffect(() => {
		// The tick's a signal: reading it repaints it every tick.
		const ticks = props.world.ticks()
		const strength = eruptionStrength(props.world)
		canvas.style.opacity = String(strength)
		if (!ctx || strength <= 0 || ticks === painted) return
		painted = ticks
		paintSky(ctx, props.world, eruption)
	})
	onCleanup(() => canvas.remove())
	return canvas
}

// --- Its crater, blowing ----------------------------------------------------------------

/** How long the lava fountain goes on at full, then dying down over as long again, in ticks. */
export const FOUNTAIN_TICKS = 540
/** Lava bombs, and how often each is thrown up again, and how hard it falls. */
const BOMBS = 70
const BOMB_EVERY = 140
const BOMB_FALL = 0.16
/** Smoke puffs, rising off it, each taking so long to rise and fade. */
const PUFFS = 26
const PUFF_RISE = 260
/**
 * The box it's all drawn in, round the crater: how far back and on, up
 * and down. Most of it's thrown on ahead, the way everyone's running.
 */
const BURST_BACK = 400
const BURST_ON = 1100
const BURST_UP = 760
const BURST_DOWN = 260

/** A fraction, the same every time, for `i` and `salt`: where a bomb goes. */
const hash = (i: number, salt: number) => {
	const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
	return x - Math.floor(x)
}

/**
 * The volcano going off, at its crater: lava bombs hurled up out of it,
 * glowing yellow, then orange, then a dull red as they come down, back
 * into it and over its sides; a fountain for a while, then dying down to
 * occasionally; and smoke pouring up off it, on and on, billowing out as
 * it rises. All by the tick since it went off.
 */
export function createEruptionBurst(world: World) {
	const eruption = world.course.look?.eruption
	if (!eruption) return []
	const { crater } = eruption
	const left = crater.x - BURST_BACK
	const top = crater.y - BURST_UP
	/** A square of `size`, its middle at `x`, `y` from the crater's lip, on the cell grid. */
	const square = (
		cells: ReturnType<typeof cellBatch>,
		x: number,
		y: number,
		size: number,
	) =>
		cells.fillRect(
			Math.round((BURST_BACK + x - size / 2) / 2) * 2,
			Math.round((BURST_UP + y - size / 2) / 2) * 2,
			size,
			size,
		)
	return [
		createController({
			init: () => ({
				id: 'eruption-burst',
				type: 'scenery',
				x: () => left,
				y: () => top,
				width: () => BURST_BACK + BURST_ON,
				height: () => BURST_UP + BURST_DOWN,
			}),
			draw: ({ ctx }) => {
				const at = eruptedAt(world)
				if (at === undefined) return
				const since = world.ticks() - at
				const alpha = ctx.globalAlpha
				// Each colour's cells filled as one: no hairlines between them.
				const cells = cellBatch(ctx)
				// Its smoke, behind the lava: dark, billowing, drifting off.
				for (let i = 0; i < PUFFS; i++) {
					const t = (since + i * (PUFF_RISE / PUFFS)) % PUFF_RISE
					// Only puffs that have had time to go up since it went off.
					if (since < t) continue
					const rise = t / PUFF_RISE
					const r = 18 + rise * 110
					// Drifting on ahead on the wind, over everyone, as it rises.
					const x = (hash(i, 1) - 0.5) * 60 + rise * 900
					const y = -rise * 420 - rise * rise * 200
					// Each puff its own see-through: painted before the next.
					cells.flush()
					ctx.globalAlpha = alpha * 0.85 * (1 - rise * 0.6)
					cells.fillStyle = rise < 0.12 ? '#5a2a1a' : '#2e2826'
					for (let dy = -r; dy < r; dy += 4) {
						const half = Math.sqrt(r * r - dy * dy)
						cells.fillRect(
							Math.round((BURST_BACK + x - half) / 4) * 4,
							Math.round((BURST_UP + y + dy) / 4) * 4,
							Math.round((half * 2) / 4) * 4,
							4,
						)
					}
				}
				cells.flush()
				ctx.globalAlpha = alpha
				// Its lava bombs: a fountain at first, dying down.
				const dying = Math.max(
					0,
					Math.min(1, (since - FOUNTAIN_TICKS) / FOUNTAIN_TICKS),
				)
				for (let i = 0; i < BOMBS; i++) {
					const phase = Math.floor(hash(i, 2) * BOMB_EVERY)
					if (since < phase) continue
					const t = (since - phase) % BOMB_EVERY
					const round = Math.floor((since - phase) / BOMB_EVERY)
					// Fewer and fewer thrown up, as it dies down.
					if (hash(i, 10 + round) < dying * 0.9) continue
					// Mostly on ahead, low and long, over everyone running away
					// from it, raining down round them.
					const vx = 1 + hash(i, 3 + round) * 7
					const vy = 4 + hash(i, 5 + round) * 6
					const x = vx * t
					const y = -vy * t + 0.5 * BOMB_FALL * t * t
					if (y > BURST_DOWN) continue
					const cooling = t / (2 * (vy / BOMB_FALL))
					cells.fillStyle =
						cooling < 0.35 ? '#ffe36a' : cooling < 0.7 ? '#ff8a1e' : '#c8321a'
					square(cells, x, y, i % 3 === 0 ? 6 : 4)
					// A trail of sparks behind it, going up.
					if (vy - BOMB_FALL * t > 2) {
						cells.fillStyle = '#ff6a1a'
						square(cells, x - vx * 2, y + (vy - BOMB_FALL * t) * 2, 2)
					}
				}
				cells.flush()
			},
		}),
	]
}

// --- The smoke rolling down after everyone ------------------------------------------------

/** How far back from the bus's front the smoke's front edge is: halfway along it. */
const WALL_AT = 150
/**
 * How tall it is; how far back it's thick, the bus's back half in it and on
 * past the left of the screen, as it's chasing; and how far on back from
 * there it thins away to nothing: a trail after the bus, not a wall over
 * everything behind it, once it's passed whoever's watching.
 */
const WALL_TALL = 360
const WALL_THICK = 260
const WALL_THINS = 480
const WALL_BACK = WALL_THICK + WALL_THINS
/** Its billows, along its front and over its top: how big, and how far apart. */
const BILLOW = 34
const BILLOW_APART = 26
const SMOKE_DARK = '#140d0b'
const SMOKE_LIT = '#2c211d'

/**
 * Once it's gone off, a wall of black smoke rolling down the volcano after
 * everyone, level with the bus, its front edge halfway along it, so only
 * its front half shows out of it; billowing along its front and over its
 * top. Left behind at the end of the silhouetted stretch, where the bus
 * goes on, out of it, into the sea.
 */
/** The smoke's colour, thinning away to nothing back from `thick`, to the left. */
function thinning(ctx: CanvasRenderingContext2D, thick: number) {
	const fade = ctx.createLinearGradient(thick, 0, 0, 0)
	fade.addColorStop(0, SMOKE_DARK)
	fade.addColorStop(0.5, 'rgba(20, 13, 11, 0.4)')
	fade.addColorStop(1, 'rgba(20, 13, 11, 0)')
	return fade
}

export function createSmokeWall(world: World) {
	const eruption = world.course.look?.eruption
	if (!eruption) return []
	const end = eruption.silhouette.to
	const front = () => Math.min(world.bus.frontX - WALL_AT, end)
	const ground = () => world.terrain.groundY(front())
	return [
		createController({
			init: () => ({
				id: 'smoke-wall',
				// Over the bus's own parts: its back half in it.
				type: 'bus-dirt',
				x: () => Math.round(front()) - WALL_BACK,
				y: () => Math.round(ground()) - WALL_TALL - BILLOW,
				width: () => WALL_BACK + BILLOW * 2,
				height: () => WALL_TALL + BILLOW + 400,
			}),
			draw: ({ ctx }) => {
				const strength = eruptionStrength(world)
				if (strength <= 0 || world.bus.frontX < eruption.at) return
				const ticks = Math.max(0, world.ticks())
				const edge = WALL_BACK
				const top = BILLOW
				const alpha = ctx.globalAlpha
				ctx.globalAlpha = alpha * Math.min(1, strength * 1.5)
				// Each colour's cells filled as one: no hairlines between them.
				const cells = cellBatch(ctx)
				// The wall itself, thick, then thinning away behind.
				const thick = edge - WALL_THICK
				cells.fillStyle = SMOKE_DARK
				cells.fillRect(thick, top + BILLOW / 2, WALL_THICK, WALL_TALL + 400)
				cells.fillStyle = thinning(ctx, thick)
				cells.fillRect(0, top + BILLOW / 2, thick, WALL_TALL + 400)
				/** A billow, round, its middle at `x`, `y`, lit on its top. */
				const billow = (x: number, y: number, r: number) => {
					for (let dy = -r; dy < r; dy += 4) {
						const half = Math.round(Math.sqrt(r * r - dy * dy) / 4) * 4
						cells.fillStyle = dy < -r * 0.6 ? SMOKE_LIT : SMOKE_DARK
						cells.fillRect(
							Math.round(x / 4) * 4 - half,
							Math.round((y + dy) / 4) * 4,
							half * 2,
							4,
						)
					}
				}
				// Along its front, rolling, each swelling and shrinking.
				for (let y = top; y < top + WALL_TALL + 120; y += BILLOW_APART) {
					const roll = Math.sin(ticks / 11 + y / 17)
					billow(edge + roll * 8, y, BILLOW * (0.8 + 0.25 * roll))
				}
				// And over its top, back from its front, as far as it's thick.
				for (let x = edge; x > thick; x -= BILLOW_APART * 1.5) {
					const roll = Math.sin(ticks / 13 + x / 23)
					billow(x, top + BILLOW / 2 + roll * 6, BILLOW * (0.85 + 0.2 * roll))
				}
				cells.flush()
				// On back, where it thins, fainter and fainter, sinking.
				for (let x = thick; x > 0; x -= BILLOW_APART * 1.5) {
					const left = x / WALL_THINS
					const roll = Math.sin(ticks / 13 + x / 23)
					ctx.globalAlpha = alpha * Math.min(1, strength * 1.5) * left
					billow(
						x,
						top + BILLOW / 2 + roll * 6 + (1 - left) * 40,
						BILLOW * (0.5 + 0.35 * left + 0.2 * roll),
					)
					cells.flush()
				}
				ctx.globalAlpha = alpha
			},
		}),
	]
}
