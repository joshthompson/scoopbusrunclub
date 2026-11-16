import type { Scene } from 'scoopjs'
import { LEFT_EDGE, VIEW_HEIGHT, VIEW_WIDTH } from '../game/constants'
import type { World } from '../game/world'
import { dressedIn } from '../runners/raceShirts'
import { syncCamera } from './RaceView'

/**
 * A race got ready to draw, all of it, before anyone sees it: so nothing
 * pops in bit by bit as it starts, or as the camera gets to it.
 *
 * The engine loads each Sprite's Frames before its Scene ticks, but a
 * picture a Draw Hook paints is only loaded the first time it's on screen,
 * and drawn once it's in. So, with the race held and covered: its frames
 * in, the fonts too, then the camera swept along the whole course, zoomed
 * out, a screen at a time, and down into a Secret's cavern, each stop
 * drawn, so every picture on it's asked for and loaded; then back where it
 * started. `progress` is told how far through it is, 0 to 1.
 */
export async function prepareRace(
	world: World,
	scene: Scene,
	progress?: (done: number) => void,
) {
	// Everyone in the race's own T-shirt, if it has one, before they're seen.
	const shirt = world.course.raceShirt
	if (shirt) await dressedIn(shirt)
	await until(() => !scene.loading.get())
	await document.fonts?.ready
	const was = {
		camera: world.camera(),
		cameraY: world.cameraY(),
		zoom: world.zoom(),
	}
	const stops = sweep(world)
	const loading = watchImages()
	try {
		for (const [i, stop] of stops.entries()) {
			world.setZoom(SWEEP_ZOOM)
			world.setCamera(stop.x)
			world.setCameraY(stop.y)
			syncCamera(world, scene)
			// Drawn, so it asks for whatever's in sight.
			await frames(2)
			progress?.((i + 1) / stops.length)
		}
		world.setZoom(was.zoom)
		world.setCamera(was.camera)
		world.setCameraY(was.cameraY)
		syncCamera(world, scene)
		await frames(1)
		// Every picture it asked for, loaded and decoded.
		await loading.done()
	} finally {
		loading.stop()
	}
	// Each in, and the start drawn with all of them.
	await frames(2)
}

/**
 * Every image the page starts loading from now on, till `stop`: the
 * engine's own, which it keeps to itself. `done` waits till they're all
 * loaded and decoded, any loaded meanwhile too.
 */
function watchImages() {
	const proto = HTMLImageElement.prototype
	const src = Object.getOwnPropertyDescriptor(proto, 'src')
	const started: HTMLImageElement[] = []
	if (src?.set && src.get)
		Object.defineProperty(proto, 'src', {
			...src,
			set(this: HTMLImageElement, url: string) {
				src.set?.call(this, url)
				started.push(this)
			},
		})
	let restored = false
	return {
		async done() {
			for (let seen = 0; seen < started.length; ) {
				const batch = started.slice(seen)
				seen = started.length
				await Promise.all(batch.map((img) => img.decode().catch(() => {})))
			}
		},
		stop() {
			if (restored || !src) return
			restored = true
			Object.defineProperty(proto, 'src', src)
		},
	}
}

/** How far out the camera's zoomed, sweeping: more of it at each stop. */
const SWEEP_ZOOM = 3
/** How much of the screen there is under the Ground, at each stop. */
const UNDER_GROUND = 160

/**
 * Where the camera stops along the course, sweeping it: a screen apart,
 * zoomed out, a little overlapping, each with the Ground near the bottom,
 * from behind the start to past the finish; and along a Secret's cavern,
 * deep under it.
 */
function sweep(world: World) {
	const { terrain } = world
	const width = VIEW_WIDTH * SWEEP_ZOOM
	const stops: { x: number; y: number }[] = []
	// Its camera's y is the top of the screen at no zoom: zoomed out, it takes
	// in more over the top, the bottom staying where it is.
	const bottomAt = (y: number) => y - VIEW_HEIGHT
	for (let x = LEFT_EDGE; x < terrain.finishX + 1600; x += width * 0.9) {
		const middle = Math.min(terrain.finishX, Math.max(LEFT_EDGE, x + width / 2))
		stops.push({ x, y: bottomAt(terrain.groundY(middle) + UNDER_GROUND) })
	}
	const secret = world.course.secret
	if (secret)
		for (let x = secret.from - 200; x < secret.to; x += width * 0.9)
			stops.push({ x, y: bottomAt(secret.floor + UNDER_GROUND) })
	return stops
}

/** Waits for `count` frames to be drawn. */
const frames = (count: number) =>
	new Promise<void>((resolve) => {
		const next = (left: number) =>
			left ? requestAnimationFrame(() => next(left - 1)) : resolve()
		next(count)
	})

/** Waits till `ready` says so, a frame at a time. */
async function until(ready: () => boolean) {
	while (!ready()) await frames(1)
}
