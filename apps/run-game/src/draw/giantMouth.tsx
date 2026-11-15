import { createController } from 'scoopjs'
import { createSignal } from 'solid-js'
import { GIANT_FACE } from '../courses/kit/bodyScenery'
import {
	JAW,
	JAW_DROP,
	JAW_FROM,
	LIPS_FRONT,
	LOWER_TEETH,
	MOUTH_INSIDE_STOPS,
	MOUTH_WIDTH,
	UPPER_TEETH,
	tongue,
} from '../courses/kit/giantMouth'
import type { World } from '../game/world'

/**
 * A giant's mouth, in its face (see `CourseLook['mouth']`): shut, till
 * anyone racing gets near; then its jaw drops, the dark inside of it and
 * its teeth showing, and its tongue rolls out, down over the edge of the
 * bench, for them to run up. Snapped shut again, behind them, the moment
 * nobody's still on their way in. Behind everyone, over the face: the
 * Ground's tongue under it is what's run on, there all along, and drawn by
 * this, not the Ground.
 */

/** How quickly it opens, and shuts, a share of the way a tick: shutting much quicker. */
const OPENING = 0.12
const SHUTTING = 0.25
/** How far on in past its inside someone still keeps it open: just in. */
const IN_PAST = 40
/** How far its jaw's cells are: 4 px, as the face's. */
const CELL = 4
/** How tall its teeth are, top and bottom, and how far in from its top the top ones are. */
const TEETH = 12
const TEETH_DOWN = 4

export function createGiantMouth(world: World) {
	const mouth = world.course.look?.mouth
	if (!mouth) return []
	const { face, tip, inside, opens } = mouth
	const { terrain } = world
	const lips = face.x + LIPS_FRONT
	const art = tongue(inside - tip, (x) => terrain.groundY(tip + x))
	const [open, setOpen] = createSignal(0)
	/** Open, or opening: anyone racing near, and not yet on in past it. */
	const wanted = () =>
		world.racers.some(
			({ body, out }) =>
				!out && body.x > tip - opens && body.x < inside + IN_PAST,
		)
	const jawTop = face.y + JAW_FROM
	const drop = () => Math.round((open() * JAW_DROP) / CELL) * CELL
	/** How much of the tongue, from its tip, is still back in the mouth, in %. */
	const hidden = () => Math.round(Math.max(0, 1 - open() * 1.2) * 100)
	return [
		// The inside of the mouth, its teeth top and bottom, between its lips.
		createController({
			init: () => ({
				id: 'mouth-inside',
				type: 'scenery',
				x: () => lips,
				y: () => jawTop - 4,
				width: () => MOUTH_WIDTH,
				height: () => drop() + 4,
			}),
			draw: ({ ctx, image }) => {
				if (open() <= 0.02) return
				const height = drop() + 4
				const inside = ctx.createLinearGradient(0, 0, MOUTH_WIDTH, 0)
				for (const [at, colour] of MOUTH_INSIDE_STOPS)
					inside.addColorStop(at, colour)
				ctx.fillStyle = inside
				ctx.fillRect(0, 0, MOUTH_WIDTH, height)
				const upper = image(UPPER_TEETH)
				if (upper)
					ctx.drawImage(upper.image, 4, TEETH_DOWN, MOUTH_WIDTH - 8, TEETH)
				const lower = image(LOWER_TEETH)
				if (lower)
					ctx.drawImage(lower.image, 8, height - TEETH, MOUTH_WIDTH - 8, TEETH)
			},
			// Only just open, 4 px tall, its teeth stick out of it, the top
			// ones down past its bottom and the bottom ones up past its top.
			drawReach: { top: TEETH - 4, bottom: TEETH_DOWN + TEETH - 4 },
			// Opening and shutting, by who's near: the same on every screen.
			onEnterFrame: () => {
				const target = wanted() ? 1 : 0
				const now = open()
				if (now !== target)
					setOpen(
						Math.abs(target - now) < 0.01
							? target
							: now + (target - now) * (target ? OPENING : SHUTTING),
					)
			},
		}),
		// Its jaw, its chin and lower lip, dropping.
		createController({
			init: () => ({
				id: 'mouth-jaw',
				type: 'scenery',
				x: () => face.x,
				y: () => jawTop + drop(),
				width: () => GIANT_FACE.width,
				height: () =>
					(GIANT_FACE.height * (900 - JAW_FROM)) / GIANT_FACE.height,
			}),
			draw: ({ ctx, image }) => {
				const jaw = image(JAW)
				if (jaw && open() > 0.02)
					ctx.drawImage(jaw.image, 0, 0, GIANT_FACE.width, 900 - JAW_FROM)
			},
		}),
		// Its tongue, rolling out of it, over the bench: from its tip, out of
		// sight back in the mouth till it's open.
		createController({
			init: () => ({
				id: 'mouth-tongue',
				type: 'scenery',
				x: () => tip,
				y: () => art.top,
				width: () => art.width,
				height: () => art.height,
			}),
			draw: ({ ctx, image }) => {
				const picture = image(art.asset)
				if (!picture || hidden() >= 100) return
				const from = (art.width * hidden()) / 100
				ctx.beginPath()
				ctx.rect(from, 0, art.width - from, art.height)
				ctx.clip()
				ctx.drawImage(picture.image, 0, 0, art.width, art.height)
			},
		}),
	]
}
