import { type Scene, createController } from 'scoopjs'
import { createComponent } from 'solid-js'
import { TICK_MS, VIEW_HEIGHT, VIEW_WIDTH } from '../game/constants'
import { DRAWN_FROM } from '../game/groundColumns'
import type { World } from '../game/world'
import {
	COVER_FADE_MS,
	CaveCoverArt,
	SKY_ROOM,
	caveCoverParts,
	coverOpening,
} from './Backdrop'
import {
	CREST_HEIGHT,
	CREST_SINK,
	CREST_WIDTH,
	FRONT_WAVES,
	WIND,
	crests,
} from './Sea'
import { cachedArt } from './canvasArt'
import { cycle, ease, steps } from './paint/animation'
import { paintTiled } from './paint/bands'
import { cssGradient, paletteOf } from './paint/css'
import { readSvg } from './paint/svgPainter'
import { TILE, type Tiles, tileControllers, tileDensity } from './paint/tiles'

/**
 * What's over everyone in the scene, as Controllers with Draw Hooks: a
 * Cave's cover over the inside of it, till someone racing goes in, and the
 * sea's waves in front of everyone in it. Their types are at the end of the
 * backdrop's `OVER_TYPES`.
 */

/** The far end of what's drawn of a course: as far as the Ground goes. */
const drawnTo = (world: World) => world.terrain.finishX + 1600

/**
 * A Cave's cover, part by part: each in tiles, painted once each and kept,
 * fading as it opens up, and back if it closes again.
 */
export function createCaveCover(world: World, scene: Scene) {
	const { cave } = world.course
	const look = world.course.look?.cave
	if (!cave || !look) return []
	const resolve = paletteOf(world.course.look?.palette)
	return caveCoverParts(cave).flatMap((part) => {
		// The page's own drawing of it, read, then let go of.
		const key = `${part.id}:${world.course.id}:${drawnTo(world)}`
		const drawing = readSvg(
			() => createComponent(CaveCoverArt, { world, cave, look, ...part }),
			{ chunkWidth: TILE, resolve, key },
		)
		if (!drawing) return []
		const width = drawnTo(world) - DRAWN_FROM
		const columns = Math.max(0, ...drawing.chunks.keys()) + 1
		const rows = Array.from({ length: columns }, (_, c): [number, number] => {
			const chunk = drawing.chunks.get(c)
			if (!chunk) return [0, -1]
			// Cut off where its `<svg>` ends.
			const top = Math.max(-SKY_ROOM, chunk.top)
			const bottom = Math.min(VIEW_HEIGHT, chunk.bottom)
			return bottom > top
				? [Math.floor(top / TILE), Math.floor((bottom - 1) / TILE)]
				: [0, -1]
		})
		const tiles: Tiles = {
			left: DRAWN_FROM,
			columns,
			rows,
			tile(c, r, image, zoom) {
				for (const url of drawing.images) if (!image(url)) return undefined
				const density = tileDensity(zoom)
				return cachedArt(
					`${key}:${density}:${c}:${r}`,
					TILE,
					TILE,
					(ctx) => {
						ctx.imageSmoothingEnabled = false
						ctx.translate(-c * TILE, -r * TILE)
						ctx.beginPath()
						ctx.rect(0, -SKY_ROOM, width, VIEW_HEIGHT + SKY_ROOM)
						ctx.clip()
						drawing.paint(ctx, c, image)
					},
					density,
				)
			},
		}
		return tileControllers(tiles, scene, {
			id: part.id,
			type: 'cave-cover',
			alpha: coverFade(
				world,
				scene,
				coverOpening(world, cave, part.from, part.to),
			),
		})
	})
}

/**
 * How solid a Cave's cover is, 0 to 1: going, eased, over `COVER_FADE_MS`
 * once `opened` says it's open, and
 * coming back once it's shut again, from wherever it had got to. Asked
 * every tick, whether it's in view or not, so it knows when.
 */
function coverFade(world: World, scene: Scene, opened: () => boolean) {
	let open = false
	/** How solid it was when it last changed, and on which tick. */
	let from = 1
	let since = 0
	const now = () => Math.max(0, world.ticks())
	const alpha = () => {
		const t = ease(Math.min(1, ((now() - since) * TICK_MS) / COVER_FADE_MS))
		return open ? from * (1 - t) : from + (1 - from) * t
	}
	scene.tickers.add(() => {
		const opening = opened()
		if (opening === open) return
		from = alpha()
		open = opening
		since = now()
	})
	return alpha
}

/** Seconds since the race started, for what's animated by the clock. */
const secondsIn = (world: World) =>
	(Math.max(0, world.ticks()) * TICK_MS) / 1000

/**
 * The sea's waves in front of everyone in it: its crests rolling in, the
 * water on down under them, and the headwind streaking by up high. In front
 * of the bus's wheels, afloat, a whale, under, and anyone who's fallen in,
 * gone under, so what's in it is in it.
 */
export function createSeaFront(world: World, scene: Scene) {
	const { sea } = world.course
	const look = world.course.look?.sea
	if (!sea || !look) return []
	const camera = () => scene.canvas.get()
	const right = drawnTo(world)
	const top = sea.level + FRONT_WAVES
	const crestTop = top - CREST_HEIGHT + CREST_SINK
	const waterTop = top + CREST_SINK
	// On down past the bottom, for the camera looking down.
	const waterHeight = VIEW_HEIGHT - top + 200
	const crest = crests(look)
	const water = `linear-gradient(to bottom, ${look.water}, ${look.deep} 120px)`
	const resolve = paletteOf(world.course.look?.palette)
	const controllers = []
	if (sea.from < right)
		controllers.push(
			createController({
				init: () => ({
					id: 'sea-waves',
					type: 'sea-front',
					x: () => sea.from,
					y: () => crestTop,
					width: () => right - sea.from,
					height: () => waterTop + waterHeight - crestTop,
				}),
				draw: ({ ctx, image }) => {
					// Only what's in view: it's as long as the sea.
					const view = camera()
					const left = Math.max(0, Math.floor(view.x() - sea.from))
					const width =
						Math.min(right, Math.ceil(view.x() + view.width())) -
						sea.from -
						left
					if (width <= 0) return
					ctx.globalAlpha *= 0.92
					// Rolling in: the crests' picture going by a step at a time.
					const roll = -CREST_WIDTH * steps(16, cycle(secondsIn(world), 3) ?? 0)
					paintTiled(
						ctx,
						image,
						crest,
						{ left, top: 0, width, height: CREST_HEIGHT },
						{ x: roll - left },
					)
					const fill = cssGradient(
						ctx,
						water,
						waterTop - crestTop,
						waterHeight,
						resolve,
					)
					if (fill) {
						ctx.fillStyle = fill
						ctx.fillRect(left, waterTop - crestTop, width, waterHeight)
					}
				},
			}),
		)
	// The headwind up high, streaking by: there to be seen over the sea,
	// across the screen wherever the camera is.
	const highest = Math.max(...WIND.map((streak) => streak.height))
	const across = Math.max(...WIND.map((streak) => streak.x + streak.width))
	controllers.push(
		createController({
			init: () => ({
				id: 'sea-wind',
				type: 'sea-front',
				x: () => Math.round(world.camera()),
				y: () => sea.level - highest,
				width: () => across,
				height: () => highest + 2,
			}),
			draw: ({ ctx }) => {
				const x = world.camera()
				if (x + VIEW_WIDTH <= sea.from || x >= sea.to) return
				const seconds = secondsIn(world)
				const alpha = ctx.globalAlpha
				ctx.fillStyle = 'white'
				for (const streak of WIND) {
					const progress = cycle(
						seconds,
						Number(streak.seconds),
						Number(streak.delay),
					)
					if (progress === undefined) continue
					// Fading in over the first 15% of its way across, and out over the last.
					const strength = Number(streak.opacity)
					const fade = Math.min(1, progress / 0.15, (1 - progress) / 0.15)
					ctx.globalAlpha = alpha * strength * fade
					ctx.fillRect(
						streak.x - 360 * progress,
						highest - streak.height,
						streak.width,
						2,
					)
				}
			},
		}),
	)
	return controllers
}
