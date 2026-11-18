import { createController } from 'scoopjs'
import { createSignal } from 'solid-js'
import { HATCHLING } from '../courses/kit/dinoForest'
import type { FollowerKind } from '../courses/types'
import type { World } from '../game/world'
import { flyerLook } from './flyerLook'

/**
 * Followers, drawn (see `game/followers.ts`): each one's run frames,
 * facing the way it's going, a frame every `STRIDE` px it goes; flying and
 * spinning out of the scoop. Up to `MOST` of them, made before they've
 * hatched, so they're there when they do.
 */

/** Each kind's picture: its run's frames, facing right, `width` by `height`. */
const LOOKS: Record<
	FollowerKind,
	{ frames: string[]; width: number; height: number }
> = {
	hatchling: HATCHLING,
}
/** The room one takes up: the biggest of them. */
const BOX = {
	width: Math.max(...Object.values(LOOKS).map((look) => look.width)),
	height: Math.max(...Object.values(LOOKS).map((look) => look.height)),
}
/** How far a stride takes one, a frame each. */
const STRIDE = 7
/** How many there can be at once: one each, a Player. */
const MOST = 4

export function createFollowers(world: World) {
	// Only where there's something to follow anyone: an egg to hatch.
	if (!world.ball?.egg) return []
	return Array.from({ length: MOST }, (_, i) => {
		const [x, setX] = createSignal(0)
		const [y, setY] = createSignal(0)
		const frames = Object.values(LOOKS).flatMap((look) => look.frames)
		return createController({
			frames,
			init: () => ({
				id: `follower-${i}`,
				type: 'pacer',
				x,
				y,
				width: () => BOX.width,
				height: () => BOX.height,
			}),
			// Its own flyer, over it, carrying it.
			drawReach: { top: 90, left: 70, right: 70 },
			draw: ({ ctx, image }) => {
				const f = world.followers[i]
				if (!f) return
				const look = LOOKS[f.kind]
				// Carried, as they were there: another of the course's flyers
				// has it, its feet gripping the top of its head.
				if (f.carried && !f.out) {
					const flyer = flyerLook(world.course)
					const now = Math.max(0, world.ticks())
					const picture = image(flyer.picture(now, true))
					if (picture)
						ctx.drawImage(
							picture.image,
							look.width / 2 - flyer.width / 2,
							flyer.grip - flyer.height,
							flyer.width,
							flyer.height,
						)
				}
				const frame = f.grounded
					? Math.floor(f.run / STRIDE) % look.frames.length
					: 0
				const art = image(look.frames[frame])
				if (!art) return
				ctx.save()
				ctx.translate(look.width / 2, look.height / 2)
				if (f.out === 'scooped') ctx.rotate((f.spin * Math.PI) / 180)
				ctx.scale(f.facing, 1)
				ctx.drawImage(
					art.image,
					-look.width / 2,
					-look.height / 2,
					look.width,
					look.height,
				)
				ctx.restore()
			},
			onEnterFrame: () => {
				const f = world.followers[i]
				if (!f) return
				const look = LOOKS[f.kind]
				setX(Math.round(f.x - look.width / 2))
				setY(Math.round(f.feetY - look.height))
			},
		})
	})
}
