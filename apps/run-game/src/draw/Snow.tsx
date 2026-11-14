import { svgUrl } from '../courses/kit/pixelArt'
import { seeded } from '../courses/kit/seeded'
import { VIEW_HEIGHT, VIEW_WIDTH } from '../game/constants'
import type { World } from '../game/world'
import { type ImageOf, paintTiled } from './paint/bands'

/**
 * Snow falling, over the whole screen, up a mountain: two layers of flakes,
 * the near one bigger and quicker, blown along by the wind, going by as the
 * course does. Fading in along the course, from where it starts to snow.
 * Moved on by the game's ticks, so it stops when the game does.
 */

/** A tile of flakes, `size` square, `count` of them, each `flake` px. */
function flakes(size: number, count: number, flake: number, seed: number) {
	const random = seeded(seed)
	let body = ''
	for (let i = 0; i < count; i++) {
		const x = Math.round((random() * (size - flake)) / 2) * 2
		const y = Math.round((random() * (size - flake)) / 2) * 2
		const alpha = (0.55 + random() * 0.45).toFixed(2)
		body += `<rect x="${x}" y="${y}" width="${flake}" height="${flake}" fill="rgba(255,255,255,${alpha})"/>`
	}
	return svgUrl(size, size, body)
}

/** Far to near: their tile, its size, how fast they fall and blow, a tick, and how much they go by with the course. */
const LAYERS = [
	{ tile: flakes(240, 22, 2, 5), size: 240, fall: 1.1, blow: -0.7, along: 0.5 },
	{ tile: flakes(320, 12, 4, 9), size: 320, fall: 2.2, blow: -1.6, along: 0.9 },
]

/** How thick it is, where the camera is: none till `from`, all of it by `full`. */
const thickness = (
	world: World,
	snow: NonNullable<NonNullable<World['course']['look']>['snow']>,
) =>
	Math.max(
		0,
		Math.min(1, (world.camera() - snow.from) / (snow.full - snow.from)),
	)

/** Where a layer's tiles are, on the screen. */
function layerAt(world: World, i: number) {
	const { size, fall, blow, along } = LAYERS[i]
	const t = Math.max(0, world.ticks())
	return {
		x: Math.round(t * blow - world.camera() * along) % size,
		y: Math.round(t * fall + world.cameraY() * along) % size,
	}
}

/** Snow, painted over the whole screen: in the screen's own pixels, from its top left. */
export function paintSnow(
	ctx: CanvasRenderingContext2D,
	image: ImageOf,
	world: World,
) {
	const snow = world.course.look?.snow
	if (!snow) return
	const opacity = thickness(world, snow)
	if (opacity <= 0) return
	ctx.globalAlpha *= opacity
	LAYERS.forEach(({ tile }, i) =>
		paintTiled(
			ctx,
			image,
			tile,
			{ left: 0, top: 0, width: VIEW_WIDTH, height: VIEW_HEIGHT },
			{ ...layerAt(world, i), down: true },
		),
	)
}
