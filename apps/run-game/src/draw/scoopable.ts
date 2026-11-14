import { type DrawPainting, type DrawReach, createController } from 'scoopjs'
import type { JSX } from 'solid-js'
import { scoopFlight } from '../game/step'
import type { ObstacleState, World } from '../game/world'
import { rendererChoice } from './rendererChoice'

/** A point in a Sprite's box, from its top left. */
interface Point {
	x: number
	y: number
}

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
	/** How far its Draw Hook paints past its box: see `drawReach`. */
	drawReach?: DrawReach
	/**
	 * What it spins round, flying: its middle, unless it's somewhere else
	 * in its art, as `Scoopable`'s `spin` says.
	 */
	spin?: Point
	/**
	 * How it lies on the ground, if not upright: a CSS `transform` about
	 * `origin`. It flies inside that, as `Scoopable` flies inside it.
	 */
	lie?: { transform: string; origin: Point }
	/** The rest of its style. */
	style?: () => JSX.CSSProperties
}) {
	const { world, state, width, height, lie } = options
	const left = options.x - width / 2
	const top = world.terrain.groundY(options.x) - height + (options.sink ?? 0)
	const spin = options.spin ?? { x: width / 2, y: height / 2 }
	/** What its style turns it round: its middle, unless it lies otherwise. */
	const origin = lie?.origin ?? { x: width / 2, y: height / 2 }
	/**
	 * Its flight, as a `transform` after how it lies: on from where it was,
	 * spinning round `spin`, as `Scoopable` moves its `children`.
	 */
	const flight = () => {
		const { scooped } = state
		if (!scooped) return undefined
		const { x, y, spin: turn } = scoopFlight(scooped, world.ticks())
		const dx = spin.x - origin.x
		const dy = spin.y - origin.y
		return `translate(${x + dx}px, ${y + dy}px) rotate(${turn}deg) translate(${-dx}px, ${-dy}px)`
	}
	return createController({
		draw: options.draw,
		drawReach: options.drawReach,
		init: () => ({
			id: options.id,
			type: options.type,
			x: () => left,
			y: () => top,
			width: () => width,
			height: () => height,
			children: options.children,
			// `scooped` isn't a signal: reading the tick keeps it up to date.
			style: () => {
				const own = options.style?.() ?? {}
				const transform = [
					lie?.transform,
					rendererChoice.canvas ? flight() : undefined,
				]
					.filter(Boolean)
					.join(' ')
				if (!transform) return own
				return {
					...own,
					transform,
					'transform-origin': `${origin.x}px ${origin.y}px`,
				}
			},
		}),
	})
}
