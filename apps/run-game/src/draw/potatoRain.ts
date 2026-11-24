import { createController, createObjectSignal } from 'scoopjs'
import type { JSX } from 'solid-js'
import { START_X, VIEW_HEIGHT, VIEW_WIDTH } from '../game/constants'
import type { World } from '../game/world'
import { ARENA_LEFT } from '../minigames/arena'
import {
	SPLIT_FADES,
	SPLIT_LIES,
	potatoAt,
	potatoesOf,
	tulipGrowth,
} from '../minigames/potatoRain'
import {
	POTATO,
	POTATO_HEIGHT,
	POTATO_SMASHED,
	POTATO_WIDTH,
	SMASH_GROUND_Y,
	SMASH_HEIGHT,
	SMASH_STEAM,
	SMASH_TOP_Y,
	SMASH_WIDTH,
} from './art/potato'
import { TULIP_ART, TULIP_HEIGHT, TULIP_WIDTH } from './art/tulip'
import { paintPicture } from './paint/picture'

/** A pixel, as everything's drawn: 2 px. */
const CELL = 2
/** How long a potato takes to settle, squashed, after it hits. */
const IMPACT_TICKS = 8
/** Steam off a smashed potato: how many wisps, how tall, and how long one takes to rise. */
const STEAM_WISPS = 3
const STEAM_RISES = 70
const STEAM_TALL = 36
/** How far grown a tulip is at each stage after the shoot: a sprout, a bud, then in flower. */
const SPROUTS_AT = 0.3
const BUDS_AT = 0.65
/** How often a tulip in flower glints, to be picked, and for how long. */
const GLINT_EVERY = 50
const GLINT_FOR = 8

/**
 * Potato Rain, drawn. Behind everyone: the tulips coming up out of the
 * path, a shoot, a sprout, a bud, then in flower, glinting occasionally to
 * be picked; each potato's shadow on the path,
 * growing and darkening as it comes (all the warning there is), and the
 * potatoes landed there, split open, steaming, then fading away. In front:
 * the potatoes dropping, fast, streaks over them. Nothing, if the world's not a game of it.
 */
export function createPotatoRain(world: World) {
	const show = potatoesOf(world)
	if (!show) return []
	const ground = world.terrain.groundY(START_X)
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

	const behind = layer('potato-ground', 'boost', (ctx, image, now) => {
		for (const t of show.tulips) {
			const grown = tulipGrowth(t, now)
			const stage =
				grown >= 1 ? 3 : grown >= BUDS_AT ? 2 : grown >= SPROUTS_AT ? 1 : 0
			const x = Math.round((t.x - ARENA_LEFT - TULIP_WIDTH / 2) / CELL) * CELL
			paintPicture(
				ctx,
				image,
				TULIP_ART[t.colour % TULIP_ART.length][stage],
				x,
				ground - TULIP_HEIGHT + CELL,
				TULIP_WIDTH,
				TULIP_HEIGHT,
			)
			// In flower: a glint at its top left, occasionally.
			if (stage === 3 && (now + t.id * 17) % GLINT_EVERY < GLINT_FOR) {
				ctx.fillStyle = '#ffffff'
				ctx.fillRect(x, ground - TULIP_HEIGHT - CELL, CELL, CELL)
				ctx.fillRect(x - CELL, ground - TULIP_HEIGHT, CELL * 3, CELL)
				ctx.fillRect(x, ground - TULIP_HEIGHT + CELL, CELL, CELL)
			}
		}
		for (const p of show.potatoes) {
			const x = Math.round(p.x - ARENA_LEFT)
			if (p.landedAt === undefined) {
				// Its shadow: small and faint to begin with, as wide as it is
				// and dark by the time it lands.
				const { near } = potatoAt(p, ground, now)
				paintShadow(
					ctx,
					x,
					ground - 1,
					POTATO_WIDTH * (0.35 + 0.75 * near),
					6 + 8 * near,
					0.1 + 0.5 * near * near,
				)
				continue
			}
			// Landed, smashed on the path, its mash splattered out, steaming;
			// and after a while, fading away.
			const since = now - p.landedAt
			const fade =
				since < SPLIT_LIES
					? 1
					: Math.max(0, 1 - (since - SPLIT_LIES) / SPLIT_FADES)
			ctx.save()
			ctx.globalAlpha = fade
			// Squashed flatter the moment it hits, its splat still spreading.
			const squash = Math.max(0, 1 - since / IMPACT_TICKS)
			ctx.translate(x, ground)
			ctx.scale(1 - 0.3 * squash, 1 - 0.35 * squash)
			paintPicture(
				ctx,
				image,
				POTATO_SMASHED,
				-SMASH_WIDTH / 2,
				-SMASH_GROUND_Y,
				SMASH_WIDTH,
				SMASH_HEIGHT,
			)
			paintSteam(
				ctx,
				-SMASH_WIDTH / 2,
				SMASH_TOP_Y - SMASH_GROUND_Y,
				since,
				p.id,
			)
			ctx.restore()
		}
	})

	const front = layer('potato-air', 'furby', (ctx, image, now) => {
		for (const p of show.potatoes) {
			const x = Math.round(p.x - ARENA_LEFT)
			if (p.landedAt !== undefined) continue
			const at = potatoAt(p, ground, now)
			if (!at.falling) continue
			const top = Math.round(at.y - POTATO_HEIGHT / 2)
			// Streaks over it, it's coming down that fast.
			ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
			for (const [across, long] of [
				[-0.3, 70],
				[0.05, 110],
				[0.32, 80],
			])
				ctx.fillRect(
					Math.round(x + across * POTATO_WIDTH),
					top - long,
					CELL,
					long - 6,
				)
			paintPicture(
				ctx,
				image,
				POTATO,
				x - POTATO_WIDTH / 2,
				top,
				POTATO_WIDTH,
				POTATO_HEIGHT,
			)
		}
	})
	return [behind, front]
}

/** A shadow on the path, an oval in 2 px steps, `width` by `height`, its middle at `x`, `y`: darker in its middle. */
function paintShadow(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	alpha: number,
) {
	const rows = Math.max(1, Math.round(height / CELL))
	for (const [scale, strength] of [
		[1, alpha * 0.6],
		[0.65, alpha * 0.6],
	]) {
		ctx.fillStyle = `rgba(40, 24, 10, ${strength.toFixed(3)})`
		for (let row = 0; row < rows; row++) {
			const v = (row + 0.5) / rows - 0.5
			const half = ((width * scale) / 2) * Math.sqrt(Math.max(0, 1 - 4 * v * v))
			const across = Math.round(half / CELL) * CELL
			if (across <= 0) continue
			ctx.fillRect(
				x - across,
				Math.round(y - height / 2 + row * CELL),
				across * 2,
				CELL,
			)
		}
	}
}

/** Steam rising off the top of a smashed potato, its left at `left`, its top at `y`: wisps, drifting, fading as they rise. */
function paintSteam(
	ctx: CanvasRenderingContext2D,
	left: number,
	y: number,
	since: number,
	seed: number,
) {
	for (const middle of SMASH_STEAM)
		for (let i = 0; i < STEAM_WISPS; i++) {
			const t =
				((since + (i * STEAM_RISES) / STEAM_WISPS + seed * 13) % STEAM_RISES) /
				STEAM_RISES
			const sway = Math.sin(t * 6 + i + seed) * 4
			const px = left + middle + (i - 1) * 8 + sway
			const py = y - t * STEAM_TALL
			ctx.fillStyle = `rgba(255, 255, 255, ${(0.5 * (1 - t)).toFixed(3)})`
			ctx.fillRect(Math.round(px) & ~1, Math.round(py) & ~1, CELL, CELL * 2)
		}
}
