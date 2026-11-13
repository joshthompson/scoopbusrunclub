import { createController } from 'scoopjs'
import { createSignal } from 'solid-js'
import { GIANT_FACE } from '../courses/kit/bodyScenery'
import {
	JAW,
	JAW_DROP,
	JAW_FROM,
	LIPS_FRONT,
	LOWER_TEETH,
	MOUTH_INSIDE,
	MOUTH_WIDTH,
	UPPER_TEETH,
	tongue,
} from '../courses/kit/giantMouth'
import type { World } from '../game/world'

/**
 * A giant's mouth, in its face (see `CourseLook['mouth']`): shut, till
 * anyone racing gets near; then its jaw drops, the dark inside of it and
 * its teeth showing, and its tongue rolls out, down over the edge of the
 * bench, for them to run up. Shut again once everyone's gone on in, or
 * past. Behind everyone, over the face: the Ground's tongue under it is
 * what's run on, there all along, and drawn by this, not the Ground.
 */

/** How quickly it opens, or shuts, a share of the way a tick. */
const OPENING = 0.06
/** How far its jaw's cells are: 4 px, as the face's. */
const CELL = 4

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
			({ body, out }) => !out && body.x > tip - opens && body.x < inside + 400,
		)
	const jawTop = face.y + JAW_FROM
	const drop = () => Math.round((open() * JAW_DROP) / CELL) * CELL
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
				children: () => (
					<div
						style={{
							position: 'absolute',
							inset: 0,
							background: MOUTH_INSIDE,
							visibility: open() > 0.02 ? 'visible' : 'hidden',
						}}
					>
						<img
							src={UPPER_TEETH}
							alt=""
							class="pixelated"
							width={MOUTH_WIDTH - 8}
							height={12}
							style={{ position: 'absolute', left: '4px', top: '4px' }}
						/>
						<img
							src={LOWER_TEETH}
							alt=""
							class="pixelated"
							width={MOUTH_WIDTH - 8}
							height={12}
							style={{ position: 'absolute', left: '8px', bottom: '0px' }}
						/>
					</div>
				),
			}),
			// Opening and shutting, by who's near: the same on every screen.
			onEnterFrame: () => {
				const target = wanted() ? 1 : 0
				const now = open()
				if (now !== target)
					setOpen(
						Math.abs(target - now) < 0.01
							? target
							: now + (target - now) * OPENING * 2,
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
				children: () => (
					<img
						src={JAW}
						alt=""
						class="pixelated"
						width={GIANT_FACE.width}
						height={900 - JAW_FROM}
						style={{
							display: 'block',
							visibility: open() > 0.02 ? 'visible' : 'hidden',
						}}
					/>
				),
			}),
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
				children: () => (
					<img
						src={art.asset}
						alt=""
						class="pixelated"
						width={art.width}
						height={art.height}
						style={{
							display: 'block',
							'clip-path': `inset(0 0 0 ${Math.round(Math.max(0, 1 - open() * 1.2) * 100)}%)`,
						}}
					/>
				),
			}),
		}),
	]
}
