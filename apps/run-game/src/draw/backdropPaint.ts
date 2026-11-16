import lightningAsset from '@/assets/background/lightning.png'
import bg1Asset from '@/assets/misc/bg1.png'
import bg2Asset from '@/assets/misc/bg2.png'
import bg3Asset from '@/assets/misc/bg3.png'
import sunAsset from '@/assets/misc/sun.png'
import type { BridgeLook, CourseLook } from '../courses/types'
import { TICK_MS, VIEW_HEIGHT, VIEW_WIDTH } from '../game/constants'
import { DRAWN_FROM } from '../game/groundColumns'
import type { World } from '../game/world'
import {
	CLOUDS,
	CLOUD_ROOM,
	FIELD_PARALLAX,
	FIELD_TEXTURE_PARALLAX,
	HAGA_FAR,
	HAGA_NEAR,
	HORIZON,
	HORIZON_SKY_OVER,
	NEARER_FASTER,
	NEARER_PARALLAX,
	NEARER_STEP,
	NEARER_TOP,
	QUAY_EDGE,
	QUAY_LIT,
	QUAY_SLANT,
	QUAY_SPREAD,
	QUAY_STONE,
	SKYLINE_HEIGHT,
	SPIRES_HEIGHT,
	type Scattering,
	farOf,
	nearOf,
	quaySlantRows,
	rippleTile,
	scatteredItems,
	skyFlyerItems,
	voyageFadeIn,
	wrap,
} from './Backdrop'
import { paintStadiumBackdrop } from './Stadium'
import { cycle, easeInOut, keyframed, steps } from './paint/animation'
import { type ImageOf, paintTiled } from './paint/bands'
import { type Resolve, filtered } from './paint/css'
import { inLayer } from './paint/layer'

/**
 * The Backdrop, painted onto the canvas: the sky, the sun, the clouds, and
 * the bands of hills or horizon behind the course, each going by slower
 * the further back it is. What `Backdrop` draws in a course's preview, the
 * same, in its own coordinates: (0, 0) its top left, `width` across, and its
 * bottom `height` down.
 */
export function createBackdropPainter(world: World, resolve: Resolve) {
	const look = world.course.look ?? {}
	const far = look.far ? farOf(look.far) : HAGA_FAR
	const near = look.near ? nearOf(look.near, look.nearGap) : HAGA_NEAR
	const scattered = (scattering: Scattering) => {
		const items = scatteredItems(world, scattering)
		return { scattering, items }
	}
	const hills =
		!look.stadium && !look.horizon
			? { far: scattered(far), near: scattered(near) }
			: undefined
	const flyers = (look.skyFlyers ?? []).map((flyer, i) => ({
		flyer,
		items: skyFlyerItems(flyer, i + 1),
	}))
	const legs = look.horizon
		? [{ from: undefined, horizon: look.horizon }, ...(look.voyage ?? [])]
		: []
	const bridges = (look.bridges ?? []).map((bridge) => ({
		bridge,
		ripples: rippleTile(bridge.water),
	}))
	const skyTop = resolve('var(--sky-blue-top)')
	const skyBottom = resolve('var(--sky-blue-bottom)')
	const grass = resolve('var(--grass-green)')

	return (
		ctx: CanvasRenderingContext2D,
		image: ImageOf,
		width: number,
		height: number,
	) => {
		const camera = world.camera()
		const scroll = (parallax: number) => Math.round(-camera * parallax)
		/** Seconds the race has run, for what the page animates by itself. */
		const seconds = (Math.max(0, world.ticks()) * TICK_MS) / 1000
		const band = (
			asset: string,
			top: number,
			bandHeight: number,
			parallax: number,
			filter?: string,
		) =>
			paintTiled(
				ctx,
				image,
				asset,
				{ left: 0, top, width, height: bandHeight },
				{ x: scroll(parallax), filter },
			)
		/** A colour, or a gradient, on down from `top` to the bottom. */
		const fillDown = (
			top: number,
			fill: string | CanvasGradient,
			from = 0,
			to = width,
		) => {
			ctx.fillStyle = fill
			ctx.fillRect(from, top, to - from, height - top)
		}

		// The sky, on up over the top of the screen too.
		const sky = ctx.createLinearGradient(0, -HORIZON_SKY_OVER, 0, height)
		sky.addColorStop(0, skyTop)
		sky.addColorStop(HORIZON_SKY_OVER / (height + HORIZON_SKY_OVER), skyTop)
		sky.addColorStop(1, skyBottom)
		fillDown(-HORIZON_SKY_OVER, sky)

		// The sun, from the top right, or a moon.
		const sunUrl = look.sunAsset ?? sunAsset
		const sun = image(sunUrl)
		if (sun) {
			const scale = look.sunScale ?? 1
			const art = filtered(sunUrl, sun, look.sun, scale)
			ctx.drawImage(
				art.art,
				width - 120 - art.width - art.pad,
				40 - art.pad,
				art.width + art.pad * 2,
				art.height + art.pad * 2,
			)
		}

		if (look.lightning) paintLightning(ctx, image, seconds, height, width)

		for (const { flyer, items } of flyers) {
			const strip = image(flyer.asset)
			if (!strip) continue
			const frames = flyer.frames ?? 1
			const scale = flyer.scale ?? 1
			const w = flyer.width * scale
			const h = flyer.height * scale
			const frameWidth = strip.width / frames
			ctx.save()
			ctx.globalAlpha *= flyer.opacity ?? 1
			for (const item of items) {
				const crossed = cycle(seconds, item.seconds, item.delay) ?? 0
				const x = 1040 + (-120 - 1040) * crossed
				const frame =
					frames > 1 ? steps(frames, cycle(seconds, 0.4) ?? 0) * frames : 0
				const bob = item.bob
					? keyframed(
							[
								[0, 0],
								[0.5, -(flyer.bob ?? 0)],
								[1, 0],
							],
							cycle(seconds, item.bob) ?? 0,
							easeInOut,
						)
					: 0
				ctx.drawImage(
					strip.image,
					Math.round(frame) * frameWidth,
					0,
					frameWidth,
					strip.height,
					x,
					item.top + bob,
					w,
					h,
				)
			}
			ctx.restore()
		}

		// Drifting by slowly, and back round from the right once off the left.
		for (const cloud of CLOUDS) {
			const loaded = image(cloud.asset)
			if (!loaded) continue
			const art = filtered(cloud.asset, loaded, look.clouds)
			ctx.drawImage(
				art.art,
				wrap(cloud.x - camera * 0.05) - CLOUD_ROOM - art.pad,
				cloud.y - art.pad,
				art.width + art.pad * 2,
				art.height + art.pad * 2,
			)
		}

		// On a voyage, one horizon after another, each fading in as the last
		// fades out: each as one, so what's behind its bands doesn't show
		// through them as it does.
		legs.forEach((leg, i) => {
			const next = look.voyage?.[i]
			const shown =
				(leg.from === undefined ? 1 : voyageFadeIn(world, leg.from)) *
				(next ? 1 - voyageFadeIn(world, next.from) : 1)
			if (shown <= 0) return
			const bands = (c: CanvasRenderingContext2D) =>
				paintHorizon(c, image, leg.horizon, scroll, width, height, grass)
			if (shown >= 1) bands(ctx)
			else inLayer(ctx, shown, bands)
		})
		if (look.horizon)
			for (const { bridge, ripples } of bridges)
				paintBridgeWater(ctx, image, world, bridge, ripples, height)

		if (look.stadium) paintStadiumBackdrop(ctx, image, world, width, height)
		if (hills) {
			/** The course's own bands among the hills, after `over`. */
			const hillBands = (over: 'far' | 'middle') => {
				for (const b of look.hillBands ?? [])
					if (b.over === over) band(b.asset, b.top, b.height, b.parallax)
			}
			band(bg3Asset, 196, 43, 0.12, look.hills?.[0])
			paintScattered(ctx, image, hills.far, camera, width, height)
			hillBands('far')
			band(bg2Asset, 216, 46, 0.22, look.hills?.[1])
			hillBands('middle')
			// Level with the middle hills, as in the header: any lower and the
			// sky shows through between them.
			band(bg1Asset, HORIZON, 150, FIELD_PARALLAX, look.hills?.[2])
			fillDown(HORIZON + 149, grass)
			paintScattered(ctx, image, hills.near, camera, width, height)
		}
	}
}

/** A horizon's bands, far to near, each its colour on down below it. */
function paintHorizon(
	ctx: CanvasRenderingContext2D,
	image: ImageOf,
	horizon: NonNullable<CourseLook['horizon']>,
	scroll: (parallax: number) => number,
	width: number,
	height: number,
	grass: string,
) {
	const band = (
		asset: string,
		top: number,
		bandHeight: number,
		parallax: number,
	) =>
		paintTiled(
			ctx,
			image,
			asset,
			{ left: 0, top, width, height: bandHeight },
			{ x: scroll(parallax) },
		)
	const fillDown = (top: number, fill: string | CanvasGradient) => {
		ctx.fillStyle = fill
		ctx.fillRect(0, top, width, height - top)
	}
	// Its own sky, solid on up over the top of the screen.
	if (horizon.sky) {
		const sky = ctx.createLinearGradient(0, -HORIZON_SKY_OVER, 0, height)
		const span = height + HORIZON_SKY_OVER
		sky.addColorStop(0, horizon.sky[0])
		sky.addColorStop(HORIZON_SKY_OVER / span, horizon.sky[0])
		sky.addColorStop(
			Math.min(1, (HORIZON_SKY_OVER + HORIZON) / span),
			horizon.sky[1],
		)
		sky.addColorStop(1, horizon.sky[1])
		fillDown(-HORIZON_SKY_OVER, sky)
	}
	// Further off still, back to front.
	for (const b of horizon.farther ?? [])
		band(b.asset, b.top, b.height, b.parallax)
	// Spires and towers rising out of the far roofs, behind them.
	if (horizon.spires)
		band(
			horizon.spires,
			HORIZON - 100 + SKYLINE_HEIGHT - SPIRES_HEIGHT,
			SPIRES_HEIGHT,
			0.08,
		)
	band(horizon.far, HORIZON - 100, SKYLINE_HEIGHT, 0.08)
	fillDown(HORIZON - 100 + SKYLINE_HEIGHT - 1, horizon.fill)
	band(horizon.near, HORIZON - 40, SKYLINE_HEIGHT, 0.16)
	const fieldTop = HORIZON - 40 + SKYLINE_HEIGHT - 1
	fillDown(fieldTop, grass)
	if (horizon.field)
		paintTiled(
			ctx,
			image,
			horizon.field,
			{ left: 0, top: fieldTop, width, height: height - fieldTop },
			{ x: scroll(FIELD_TEXTURE_PARALLAX), down: true },
		)
	;(horizon.nearer ?? []).forEach((nearer, i) => {
		const top = nearer.top ?? HORIZON + NEARER_TOP + i * NEARER_STEP
		band(nearer.asset, top, nearer.height, NEARER_PARALLAX + i * NEARER_FASTER)
		fillDown(top + nearer.height - 1, nearer.fill)
	})
}

/**
 * What's dotted along a band of the backdrop, scrolling with it, cut off
 * below `clipBelow`: only what's in view.
 */
function paintScattered(
	ctx: CanvasRenderingContext2D,
	image: ImageOf,
	{
		scattering,
		items,
	}: {
		scattering: Scattering
		items: ReturnType<typeof scatteredItems>
	},
	camera: number,
	width: number,
	height: number,
) {
	const { parallax, clipBelow } = scattering
	const scroll = Math.round(-camera * parallax)
	ctx.save()
	ctx.beginPath()
	ctx.rect(
		0,
		0,
		width,
		clipBelow === undefined ? height : height - (VIEW_HEIGHT - clipBelow),
	)
	ctx.clip()
	// The first that might be in view: they're in order along it, none
	// more than a few hundred px wide.
	let lo = 0
	let hi = items.length
	while (lo < hi) {
		const mid = (lo + hi) >> 1
		if (items[mid].x + scroll < -600) lo = mid + 1
		else hi = mid
	}
	for (let i = lo; i < items.length; i++) {
		const { piece, x, bottom } = items[i]
		const left = x + scroll
		if (left > width) break
		const loaded = image(piece.asset)
		if (!loaded) continue
		const scale = piece.scale ?? 1
		const art = filtered(piece.asset, loaded, piece.filter)
		// Scaled from its foot's middle.
		const w = loaded.width * scale
		const h = loaded.height * scale
		const foot = VIEW_HEIGHT - bottom
		const padded = art.pad * scale
		ctx.drawImage(
			art.art,
			left + loaded.width / 2 - w / 2 - padded,
			foot - h - padded,
			w + padded * 2,
			h + padded * 2,
		)
	}
	ctx.restore()
}

/** Lightning: two strikes, each a flash over the sky and a bolt out of it, on a beat of its own. */
function paintLightning(
	ctx: CanvasRenderingContext2D,
	image: ImageOf,
	seconds: number,
	height: number,
	width: number,
) {
	const FLASH: [number, number][] = [
		[0, 0],
		[0.93, 0],
		[0.94, 0.75],
		[0.95, 0.1],
		[0.965, 0.6],
		[0.98, 0],
		[1, 0],
	]
	for (const [beat, delay, x] of [
		[9, 2, 300],
		[13, 6.5, 1400],
	]) {
		const progress = cycle(seconds, beat, delay)
		if (progress === undefined) continue
		const opacity = keyframed(FLASH, progress)
		if (opacity <= 0) continue
		ctx.save()
		ctx.globalAlpha *= opacity
		ctx.fillStyle = '#f4ecff'
		ctx.fillRect(0, 0, width, height)
		ctx.scale(1.6, 1.6)
		paintTiled(
			ctx,
			image,
			lightningAsset,
			{ left: 0, top: 0, width: VIEW_WIDTH, height: 150 },
			{ x: -x, down: true },
		)
		ctx.restore()
	}
}

/**
 * Over a bridge, its water, from it right back to the buildings' feet
 * across it, on a quay along them: see `BridgeWater`. In the backdrop,
 * where the bridge is in the world.
 */
function paintBridgeWater(
	ctx: CanvasRenderingContext2D,
	image: ImageOf,
	world: World,
	bridge: BridgeLook,
	ripples: string,
	height: number,
) {
	const top = HORIZON - 40 + SKYLINE_HEIGHT - 1
	/** How far out under the land either side it goes at the far quay: none, out on open water. */
	const spread = bridge.open ? 0 : QUAY_SPREAD
	const from = (bridge.open ? DRAWN_FROM : bridge.from) - spread
	const to = (bridge.open ? world.terrain.finishX + 1600 : bridge.to) + spread
	const width = to - from
	const left = Math.round(from - world.camera())
	const along = (((DRAWN_FROM - from) % 64) + 64) % 64
	const down = ((-(top + QUAY_EDGE) % 18) + 18) % 18
	const waterTop = top + (bridge.open ? 0 : QUAY_EDGE)
	const rows = quaySlantRows(spread)
	ctx.save()
	if (!bridge.open) {
		// Its shape: its edges stepping in, down the slant, then straight down.
		const shape = new Path2D()
		for (const { y, inset } of rows)
			shape.rect(left + inset, top + y, width - 2 * inset, 2)
		shape.rect(
			left + spread,
			top + QUAY_SLANT,
			width - 2 * spread,
			height - top - QUAY_SLANT,
		)
		ctx.clip(shape)
	}
	ctx.fillStyle = bridge.water
	ctx.fillRect(left, waterTop, width, height - waterTop)
	paintTiled(
		ctx,
		image,
		ripples,
		{ left, top: waterTop, width, height: height - waterTop },
		{ x: along, y: down, down: true },
	)
	if (!bridge.open) {
		// The quay along the buildings' feet, lit along its top.
		ctx.fillStyle = QUAY_LIT
		ctx.fillRect(left, top, width, 2)
		ctx.fillStyle = QUAY_STONE
		ctx.fillRect(left, top + 2, width, QUAY_EDGE - 2)
	}
	ctx.restore()
	if (bridge.open) return
	// The land's stone edges, either end, slanting away from the bridge,
	// then down into the water.
	ctx.fillStyle = QUAY_STONE
	for (const { y, inset } of rows) {
		ctx.fillRect(left + inset, top + y, 4, 2)
		ctx.fillRect(left + width - inset - 4, top + y, 4, 2)
	}
	ctx.fillRect(left + spread, top + QUAY_SLANT, 4, height - top - QUAY_SLANT)
	ctx.fillRect(
		left + width - spread - 4,
		top + QUAY_SLANT,
		4,
		height - top - QUAY_SLANT,
	)
}
