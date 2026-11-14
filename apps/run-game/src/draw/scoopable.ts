import {
	type DrawPainting,
	createController,
	createObjectSignal,
} from 'scoopjs'
import type { JSX } from 'solid-js'
import { scoopFlight } from '../game/step'
import type { ObstacleState, World } from '../game/world'
import { rendererChoice } from './rendererChoice'

/**
 * An Obstacle the bus can scoop up, standing on the ground at `x` as a
 * fixture does until then, and flying off, spinning, after.
 *
 * Under the DOM Renderer its `children` fly, in `Scoopable`, and it stays
 * where it was. Under the Canvas Renderer it flies itself, along with its
 * box: the canvas leaves out whatever's boxed off the screen, and a box left
 * behind goes off it while what was scooped is still up in the air, ahead.
 */
export function createScoopable(options: {
	id: string
	type: string
	x: number
	/** How far its bottom goes into the ground. */
	sink?: number
	width: number
	height: number
	world: World
	state: ObstacleState
	children: () => JSX.Element
	draw: (painting: DrawPainting) => void
}) {
	const { world, state, width, height } = options
	const left = options.x - width / 2
	const top = world.terrain.groundY(options.x) - height + (options.sink ?? 0)
	return createController({
		draw: options.draw,
		init: () => ({
			id: options.id,
			type: options.type,
			...createObjectSignal(left, 'x'),
			...createObjectSignal(top, 'y'),
			...createObjectSignal(0, 'rotation'),
			width: () => width,
			height: () => height,
			children: options.children,
		}),
		// Round its middle, as `Scoopable` spins it. `scooped` isn't a
		// signal, so this looks every tick.
		onEnterFrame: rendererChoice.canvas
			? ({ $ }) => {
					const { scooped } = state
					const flight = scooped
						? scoopFlight(scooped, world.ticks())
						: { x: 0, y: 0, spin: 0 }
					$.setX(left + flight.x)
					$.setY(top + flight.y)
					$.setRotation(flight.spin)
				}
			: undefined,
	})
}
