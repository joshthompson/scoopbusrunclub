import { type Scene, createController } from 'scoopjs'
import { VIEW_HEIGHT } from '../game/constants'
import type { World } from '../game/world'
import { cellBatch } from './paint/cellBatch'

/**
 * The sea, swum through (see `Course['deepWater']`): its water behind
 * everything in it, from the surface on down, the seabed and its rock in
 * front of it; and over everyone in it, a wash of its colour, the surface
 * rippling along its top, shafts of light slanting down through it, and
 * bubbles rising, so what's in it is under it. Both only where the camera
 * is: it's a long sea.
 */

/** How far down from the surface the water goes deep, and how far on past the bottom of the screen it's drawn. */
const DEEPENS = 900
const UNDER = 300
/** How strong the wash over everyone in it is, and how far down into the seabed it goes. */
const WASH = 0.28
const WASH_INTO_BED = 400
/**
 * Shafts of light down through it: how deep they reach at most, how wide
 * they are at the surface, how far apart, how far they slant, and how far
 * along that takes them, at most.
 */
const SHAFT_DEEP = 520
const SHAFT_WIDE = 22
const SHAFT_APART = 140
const SHAFT_SLANT = 0.35
const SHAFT_REACH = SHAFT_DEEP * SHAFT_SLANT + SHAFT_WIDE * 3

/** A fraction, the same every time, for `i` and `salt`. */
const hash = (i: number, salt: number) => {
	const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
	return x - Math.floor(x)
}

/**
 * How bright shaft `i` is, `seconds` in: each fading in and out on its
 * own, slowly, as the surface over it ripples, now and then gone.
 */
const shaftLight = (i: number, seconds: number) =>
	Math.max(
		0,
		0.55 +
			0.45 * Math.sin(seconds * (0.25 + hash(i, 4) * 0.3) + hash(i, 5) * 6),
	) *
	(0.6 + hash(i, 6) * 0.4)

/**
 * A shaft of light's colour, `light`, fading down it to nothing by `deep`
 * under the surface: quickly, then slowly, as light does in water.
 */
function shaftFade(ctx: CanvasRenderingContext2D, light: string, deep: number) {
	const [r, g, b, a = 1] = (light.match(/[\d.]+/g) ?? []).map(Number)
	const fade = ctx.createLinearGradient(0, 6, 0, 6 + deep)
	for (const at of [0, 0.25, 0.5, 0.75, 1])
		fade.addColorStop(at, `rgba(${r}, ${g}, ${b}, ${a * (1 - at) ** 1.6})`)
	return fade
}

const secondsIn = (world: World) => Math.max(0, world.ticks()) / 60

export function createDeepWater(world: World, scene: Scene) {
	const { deepWater } = world.course
	const look = world.course.look?.deepWater
	if (!deepWater || !look) return []
	const camera = () => scene.canvas.get()
	const top = deepWater.surface
	// Back to the cliff's foot, and on to where the shore's up out of it.
	const { groundY } = world.terrain
	let from = deepWater.from
	while (groundY(from - 2) > top) from -= 2
	let to = deepWater.from
	while (to < deepWater.to + 600 && groundY(to + 2) > top) to += 2
	const height = VIEW_HEIGHT - top + UNDER
	/** What's in view of the sea, along: from and how wide, in its own px. */
	const inView = () => {
		const view = camera()
		const left = Math.max(0, Math.floor(view.x() - from))
		const right = Math.min(to, Math.ceil(view.x() + view.width())) - from
		return { left, width: right - left }
	}
	const water = (ctx: CanvasRenderingContext2D) => {
		const fill = ctx.createLinearGradient(0, 0, 0, DEEPENS)
		fill.addColorStop(0, look.water)
		fill.addColorStop(1, look.deep)
		return fill
	}
	return [
		// Behind it all: the water, from the surface down, behind the seabed.
		createController({
			init: () => ({
				id: 'deep-water-back',
				type: 'deep-water-back',
				x: () => from,
				y: () => top,
				width: () => to - from,
				height: () => height,
			}),
			draw: ({ ctx }) => {
				const { left, width } = inView()
				if (width <= 0) return
				ctx.fillStyle = water(ctx)
				ctx.fillRect(left, 0, width, height)
				// Its surface, from under it: a bright line.
				ctx.fillStyle = look.surface
				ctx.fillRect(left, 0, width, 2)
			},
		}),
		// Over everyone in it.
		createController({
			init: () => ({
				id: 'deep-water-front',
				type: 'sea-front',
				x: () => from,
				y: () => top - 6,
				width: () => to - from,
				height: () => height + 6,
			}),
			draw: ({ ctx }) => {
				const { left, width } = inView()
				if (width <= 0) return
				const alpha = ctx.globalAlpha
				const seconds = secondsIn(world)
				// Only over the water: its light's shafts slant off its ends.
				ctx.save()
				ctx.beginPath()
				ctx.rect(left, 0, width, height + 6)
				ctx.clip()
				// The wash of the water's colour over it all, down to just into
				// the seabed: none over the shore, up out of it.
				ctx.globalAlpha = alpha * WASH
				// Its columns filled as one: no hairlines between them.
				const wash = cellBatch(ctx)
				wash.fillStyle = water(ctx)
				for (let x = Math.floor(left / 4) * 4; x < left + width; x += 4) {
					// Over the seabed too, the deeper it is the further: dim down
					// there, and none where it's up at the shore.
					const deep = groundY(from + x) - top
					const bed = deep + Math.min(WASH_INTO_BED, deep * 0.5)
					if (bed > 6) wash.fillRect(x, 6, 4, Math.min(height, bed) - 6)
				}
				wash.flush()
				// Shafts of light down from the surface: each its own width and
				// brightness, widening and fading as they go down, swaying a
				// little, and coming and going as the surface ripples.
				const first = Math.floor((left - SHAFT_REACH) / SHAFT_APART) - 1
				for (let i = first; (i - 1) * SHAFT_APART < left + width; i++) {
					const lit = shaftLight(i, seconds)
					if (lit <= 0) continue
					const x0 =
						i * SHAFT_APART +
						hash(i, 1) * SHAFT_APART * 0.6 +
						Math.sin(seconds * 0.35 + i) * 10
					const wide = SHAFT_WIDE * (0.5 + hash(i, 2))
					const deep = SHAFT_DEEP * (0.6 + hash(i, 3) * 0.6)
					// Each shaft one shape, fading down it: no hairlines across it.
					const shaft = cellBatch(ctx)
					shaft.fillStyle = shaftFade(ctx, look.light, deep)
					for (let y = 0; y < deep; y += 4) {
						const down = y / deep
						const w = Math.round((wide * (1 + down * 1.4)) / 2) * 2
						const x = Math.round((x0 + y * SHAFT_SLANT - w / 2) / 2) * 2
						// No further down than the seabed, nor on into the rock.
						const at = from + x + w / 2
						if (6 + y > groundY(at) - top) break
						const rock = world.course.cave?.ceiling(at)
						if (rock !== undefined && top + 6 + y < rock) break
						shaft.fillRect(x, 6 + y, w, 4)
					}
					ctx.globalAlpha = alpha * lit
					shaft.flush()
				}
				ctx.globalAlpha = alpha
				// The surface, rippling: a wave along it, in 2 px steps.
				const surface = cellBatch(ctx)
				surface.fillStyle = look.surface
				const phase = seconds * 2
				const start = Math.floor(left / 4) * 4
				for (let x = start; x < left + width; x += 4) {
					const lift = Math.round(
						(Math.sin(x / 26 + phase) + Math.sin(x / 11 - phase * 1.3) * 0.5) *
							1.5,
					)
					surface.fillRect(x, 4 + lift * 2, 4, 2)
				}
				surface.flush()
				ctx.restore()
				ctx.globalAlpha = alpha
			},
		}),
	]
}
