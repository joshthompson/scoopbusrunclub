import { createController, createObjectSignal } from 'scoopjs'
import type { JSX } from 'solid-js'
import { START_X, VIEW_HEIGHT, VIEW_WIDTH } from '../game/constants'
import type { World } from '../game/world'
import { ARENA_LEFT } from '../minigames/arena'
import { CANNON_IN, cannonMouth, kebabOf } from '../minigames/fruitKebab'
import {
	CANNON,
	CANNON_HEIGHT,
	CANNON_WIDTH,
	FRUIT_ART,
	PUFF,
	PUFF_SIZE,
} from './art/fruit'
import { paintPicture } from './paint/picture'

/** How long a cannon's puff of smoke hangs about, and how far back it kicks, firing. */
const PUFF_TICKS = 24
const KICK = 4
const KICK_TICKS = 8

/**
 * Fruit Kebab, drawn: its two cannons, either side, kicking back and
 * puffing smoke as they fire; and its fruit, flying, turning, and
 * splatted on the path. Nothing, if the world's not a game of it.
 */
export function createFruitKebab(world: World) {
	const show = kebabOf(world)
	if (!show) return []
	const ground = world.terrain.groundY(START_X)
	const cannon = (side: 0 | 1) => {
		const left =
			side === 0
				? ARENA_LEFT + CANNON_IN
				: ARENA_LEFT + VIEW_WIDTH - CANNON_IN - CANNON_WIDTH
		return createController({
			init: () => ({
				id: `cannon-${side}`,
				type: 'hazard',
				...createObjectSignal(left, 'x'),
				...createObjectSignal(ground - CANNON_HEIGHT + 2, 'y'),
				...createObjectSignal({} as JSX.CSSProperties, 'style'),
				width: () => CANNON_WIDTH,
				height: () => CANNON_HEIGHT,
			}),
			draw({ ctx, image }) {
				const since = world.ticks() - show.fired[side]
				const kick =
					show.fired[side] >= 0 && since < KICK_TICKS
						? KICK * (1 - since / KICK_TICKS)
						: 0
				ctx.save()
				// The right one faces left: turned round.
				if (side === 1) {
					ctx.translate(CANNON_WIDTH, 0)
					ctx.scale(-1, 1)
				}
				paintPicture(
					ctx,
					image,
					CANNON,
					-Math.round(kick),
					0,
					CANNON_WIDTH,
					CANNON_HEIGHT,
				)
				ctx.restore()
			},
		})
	}
	/** All the fruit at once, and the smoke: one picture over the whole arena. */
	const fruit = createController({
		init: () => ({
			id: 'kebab-fruit',
			type: 'furby',
			...createObjectSignal(ARENA_LEFT, 'x'),
			...createObjectSignal(0, 'y'),
			...createObjectSignal({} as JSX.CSSProperties, 'style'),
			width: () => VIEW_WIDTH,
			height: () => VIEW_HEIGHT,
		}),
		draw({ ctx, image }) {
			const now = world.ticks()
			for (const side of [0, 1] as const) {
				const since = now - show.fired[side]
				if (show.fired[side] < 0 || since >= PUFF_TICKS) continue
				const mouth = cannonMouth(world, side)
				// Growing to twice its size as it drifts up, in whole cells.
				const grow = 1 + since / PUFF_TICKS
				const size = Math.round((PUFF_SIZE * grow) / 2) * 2
				ctx.save()
				ctx.globalAlpha = 1 - since / PUFF_TICKS
				paintPicture(
					ctx,
					image,
					PUFF,
					Math.round(mouth.x - ARENA_LEFT - size / 2),
					Math.round(mouth.y - size / 2 - since * 0.8),
					size,
					size,
				)
				ctx.restore()
			}
			for (const f of show.fruit) {
				if (f.splatAt !== undefined) continue
				const art = FRUIT_ART[f.kind]
				ctx.save()
				ctx.translate(Math.round(f.x - ARENA_LEFT), Math.round(f.y))
				// Turning in quarter turns, to keep its pixels square.
				ctx.rotate((Math.round(f.spin / 90) * Math.PI) / 2)
				paintPicture(
					ctx,
					image,
					art.src,
					-art.width / 2,
					-art.height / 2,
					art.width,
					art.height,
				)
				ctx.restore()
			}
		},
	})
	/** The fruit fallen on the path, whole, behind everyone: just now, and left lying there since. */
	const splats = createController({
		init: () => ({
			id: 'kebab-splats',
			type: 'boost',
			...createObjectSignal(ARENA_LEFT, 'x'),
			...createObjectSignal(0, 'y'),
			...createObjectSignal({} as JSX.CSSProperties, 'style'),
			width: () => VIEW_WIDTH,
			height: () => VIEW_HEIGHT,
		}),
		draw({ ctx, image }) {
			// Read the tick, so it's painted again every one.
			world.ticks()
			for (const list of [show.lying, show.fruit])
				for (const f of list) {
					if (f.splatAt === undefined) continue
					const art = FRUIT_ART[f.kind]
					ctx.save()
					ctx.translate(Math.round(f.x - ARENA_LEFT), Math.round(f.y))
					// Lying there as it came to rest, whole: turned in quarter
					// turns, as it flew, to keep its pixels square.
					ctx.rotate((Math.round(f.spin / 90) * Math.PI) / 2)
					paintPicture(
						ctx,
						image,
						art.src,
						-art.width / 2,
						-art.height / 2,
						art.width,
						art.height,
					)
					ctx.restore()
				}
		},
	})
	return [cannon(0), cannon(1), splats, fruit]
}
