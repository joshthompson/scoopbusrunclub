import { createController, createObjectSignal } from 'scoopjs'
import type { JSX } from 'solid-js'
import {
	ARCTIC_FOAM,
	ARCTIC_SEA,
	FLOE,
	FLOE_HEIGHT,
	FLOE_WIDTH,
	ICEBERG,
	ICEBERG_HEIGHT,
	ICEBERG_TOP_LEFT,
	ICEBERG_TOP_WIDTH,
	ICEBERG_TOP_Y,
	ICEBERG_WIDTH,
	WAVE_CREST,
	WAVE_CREST_HEIGHT,
	WAVE_CREST_WIDTH,
} from '../courses/kit/arcticScenery'
import { VIEW_HEIGHT, VIEW_WIDTH } from '../game/constants'
import type { World } from '../game/world'
import { ARENA_LEFT } from '../minigames/arena'
import {
	BERG_HALF,
	BERG_MIDDLE,
	BERG_TOP,
	SPLASH_TICKS,
	WATERLINE,
	berg,
	bergShowOf,
} from '../minigames/icebergBump'
import {
	EMPEROR_PENGUIN,
	EMPEROR_PENGUIN_HEIGHT,
	EMPEROR_PENGUIN_WIDTH,
	PENGUIN,
	PENGUIN_HEIGHT,
	PENGUIN_WIDTH,
} from './art/penguin'
import { cellBatch, seeThrough } from './paint/cellBatch'
import { paintPicture } from './paint/picture'

/** A pixel, as everything's drawn: 2 px. */
const CELL = 2
/** How see-through the sea is, over what's under it: the iceberg's bulk, anyone swimming. */
const SEA_OVER = 0.6
/** Floes drifting by, out on the water behind: [x, y, how fast]. */
const FLOES = [
	[90, 372, 0.05],
	[640, 352, -0.04],
	[860, 404, 0.03],
]
/** How many drops a splash throws up. */
const SPLASH_DROPS = 10
/** Wave crests on the water in front, by where they are across, and how far down. */
const CRESTS = [40, 170, 300, 420, 560, 690, 820, 930]

/**
 * Iceberg Bump, drawn: the iceberg, tipped and bobbing as it is, about the
 * middle of its top; floes drifting by out on the water behind it; and the
 * sea in front, over its bulk under the waterline and over anyone in it,
 * its edge moving, foam along it. Nothing, if the world's not a game of it.
 */
export function createIcebergBump(world: World) {
	if (world.minigame?.id !== 'iceberg-bump') return []
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

	/** The sea's edge at `x` across the screen, rippling. */
	const surface = (x: number, now: number) =>
		Math.round(
			(WATERLINE +
				2 * Math.sin(x / 37 + now / 20) +
				Math.sin(x / 13 - now / 11)) /
				CELL,
		) * CELL

	const floes = layer('arctic-floes', 'scenery', (ctx, image, now) => {
		for (const [x, y, drift] of FLOES) {
			const across =
				((((x + now * drift) % (VIEW_WIDTH + FLOE_WIDTH)) +
					VIEW_WIDTH +
					FLOE_WIDTH) %
					(VIEW_WIDTH + FLOE_WIDTH)) -
				FLOE_WIDTH
			const bob = Math.round(Math.sin(now / 40 + x) * 1)
			paintPicture(
				ctx,
				image,
				FLOE,
				Math.round(across / CELL) * CELL,
				y + bob * CELL,
				FLOE_WIDTH,
				FLOE_HEIGHT,
			)
		}
	})

	const iceberg = layer('iceberg', 'boost', (ctx, image) => {
		// Turned about the middle of its top, where it sits.
		ctx.save()
		ctx.translate(BERG_MIDDLE - ARENA_LEFT, BERG_TOP + berg.bob)
		ctx.rotate(berg.tilt)
		// Its top as wide as the iceberg everyone's stood on.
		const scale = (BERG_HALF * 2) / ICEBERG_TOP_WIDTH
		ctx.scale(scale, scale)
		paintPicture(
			ctx,
			image,
			ICEBERG,
			-(ICEBERG_TOP_LEFT + ICEBERG_TOP_WIDTH / 2),
			-ICEBERG_TOP_Y,
			ICEBERG_WIDTH,
			ICEBERG_HEIGHT,
		)
		ctx.restore()
	})

	const sea = layer('arctic-sea', 'foreground', (ctx, image, now) => {
		// The sea, over everything under its edge, see-through; and foam
		// along its edge, broken. Each filled the once: as strips, side by
		// side, they'd show a hairline between each.
		const cells = cellBatch(ctx)
		cells.fillStyle = seeThrough(ARCTIC_SEA, SEA_OVER)
		for (let x = 0; x < VIEW_WIDTH; x += CELL * 2) {
			const top = surface(x, now)
			cells.fillRect(x, top, CELL * 2, VIEW_HEIGHT - top)
		}
		cells.fillStyle = ARCTIC_FOAM
		for (let x = 0; x < VIEW_WIDTH; x += CELL * 2)
			if ((x / (CELL * 2) + Math.floor(now / 16)) % 5 !== 0)
				cells.fillRect(x, surface(x, now) - CELL, CELL * 2, CELL)
		cells.flush()
		// Crests on the water, coming and going.
		CRESTS.forEach((x, i) => {
			const shown = (now / 50 + i * 0.37) % 1
			if (shown > 0.7) return
			paintPicture(
				ctx,
				image,
				WAVE_CREST,
				Math.round((x + shown * 20) / CELL) * CELL,
				WATERLINE + 12 + (i % 3) * 10,
				WAVE_CREST_WIDTH,
				WAVE_CREST_HEIGHT,
			)
		})
	})
	const show = bergShowOf(world)
	/** The penguins, and emperors bigger: leaping nose first, or flat on their bellies along the iceberg. */
	const penguins = layer('penguins', 'zombie', (ctx, image) => {
		for (const p of show?.penguins ?? []) {
			const heading = Math.sign(p.vx) || 1
			const turn =
				p.stage === 'slide'
					? berg.tilt
					: Math.atan2(p.vy, Math.abs(p.vx)) * heading
			ctx.save()
			ctx.translate(Math.round(p.x - ARENA_LEFT), Math.round(p.y))
			ctx.rotate(turn)
			ctx.scale(heading, 1)
			// An emperor's bigger.
			const width = p.emperor ? EMPEROR_PENGUIN_WIDTH : PENGUIN_WIDTH
			const height = p.emperor ? EMPEROR_PENGUIN_HEIGHT : PENGUIN_HEIGHT
			paintPicture(
				ctx,
				image,
				p.emperor ? EMPEROR_PENGUIN : PENGUIN,
				-width / 2,
				-height,
				width,
				height,
			)
			ctx.restore()
		}
	})
	/** Splashes, in front of the sea: a column of white water, drops flung out, a ring of foam. */
	const splashes = layer('splashes', 'foreground', (ctx, _image, now) => {
		for (const splash of show?.splashes ?? []) {
			const t = now - splash.at
			if (t < 0 || t >= SPLASH_TICKS) continue
			const x = splash.x - ARENA_LEFT
			const fade = 1 - t / SPLASH_TICKS
			ctx.fillStyle = ARCTIC_FOAM
			// The column, up and falling back.
			if (t < 14) {
				ctx.globalAlpha = 0.9
				const tall = Math.round((t < 6 ? t * 6 : (14 - t) * 4.5) / CELL) * CELL
				ctx.fillRect(
					Math.round(x / CELL) * CELL - 6,
					WATERLINE - tall,
					12,
					tall,
				)
			}
			// Drops, flung up and out, and down again.
			ctx.globalAlpha = fade
			for (let k = 0; k < SPLASH_DROPS; k++) {
				const out = ((k * 7) % SPLASH_DROPS) / (SPLASH_DROPS - 1) - 0.5
				const up = 5 + ((k * 5) % 4)
				const dx = x + out * 6 * t
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
			const ring = Math.round((12 + t * 1.6) / CELL) * CELL
			ctx.fillRect(Math.round(x / CELL) * CELL - ring - 6, WATERLINE, 8, CELL)
			ctx.fillRect(Math.round(x / CELL) * CELL + ring - 2, WATERLINE, 8, CELL)
			ctx.globalAlpha = 1
		}
	})
	return [floes, iceberg, penguins, sea, splashes]
}
