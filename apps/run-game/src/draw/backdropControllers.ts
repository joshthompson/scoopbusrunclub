import { type Scene, createController } from 'scoopjs'
import { createComponent } from 'solid-js'
import { render } from 'solid-js/web'
import {
	DEPTH_SLANT,
	GROUND_Y,
	PATH_BACK,
	PATH_FRONT,
	TICK_MS,
	VIEW_HEIGHT,
	VIEW_WIDTH,
} from '../game/constants'
import { DRAWN_FROM, GROUND_STEP } from '../game/groundColumns'
import type { World } from '../game/world'
import {
	FLAME,
	Ground,
	HORIZON_SKY_OVER,
	backdropLift,
	buildingLook,
	gapLook,
	groundPits,
	hellFire,
	horizonTreeList,
	pitDarkening,
	pitInside,
} from './Backdrop'
import { deckBox, deckTiles, paintFog, paintFogDeck } from './Fog'
import { paintSnow } from './Snow'
import { createBackdropPainter } from './backdropPaint'
import { cachedArt } from './canvasArt'
import { cycle, steps } from './paint/animation'
import { type ImageOf, paintTiled } from './paint/bands'
import {
	type Resolve,
	brighter,
	cssGradient,
	filtered,
	paletteOf,
} from './paint/css'
import { type SvgDrawing, compileSvg } from './paint/svgCanvas'
import { TILE, tileControllers, tileDensity } from './paint/tiles'

/**
 * What's drawn behind the course and over it, as Controllers with Draw
 * Hooks: the backdrop (as `Backdrop` draws it in a course's preview), the
 * horizon's trees and the Ground behind every sprite, and snow and fog over
 * them all.
 *
 * Each goes in the Scene's own coordinates: the backdrop with the camera,
 * its bands going by at a fraction of it, and the Ground in the world, in
 * tiles painted once and kept.
 */

/** Their types, behind every sprite, front to back, for `assetOrder`'s end. */
export const BEHIND_TYPES = ['ground', 'backdrop']
/**
 * And over every sprite, front to back, for its start: under the snow and
 * fog, the sea's waves and a River's water in front of everyone in them,
 * and a Cave's cover (see `frontControllers` and `river`).
 */
export const OVER_TYPES = [
	'fog',
	'snow',
	'sea-front',
	'river-front',
	'cave-cover',
]

/** What the camera sees, in the Scene. */
const cameraOf = (scene: Scene) => scene.canvas.get()

/** The Backdrop, the trees over the brow, and the Ground, back to front. */
export function createBackdrop(world: World, scene: Scene) {
	const resolve = paletteOf(world.course.look?.palette)
	return [
		createSky(world, scene, resolve),
		...createGround(world, scene, resolve),
	]
}

/** Snow and fog, over everything, with the camera. */
export function createWeather(world: World, scene: Scene) {
	const look = world.course.look
	const camera = () => cameraOf(scene)
	/** Over the whole of what the camera sees, painted in the screen's own pixels. */
	const overScreen = (
		id: string,
		type: string,
		paint: (ctx: CanvasRenderingContext2D, image: ImageOf) => void,
	) =>
		createController({
			init: () => ({
				id,
				type,
				x: () => camera().x(),
				y: () => camera().y(),
				width: () => camera().width(),
				height: () => camera().height(),
			}),
			draw: ({ ctx, image }) => {
				const zoom = camera().width() / VIEW_WIDTH
				ctx.scale(zoom, zoom)
				paint(ctx, image)
			},
		})
	const controllers = []
	if (look?.snow)
		controllers.push(
			overScreen('snow', 'snow', (ctx, image) => paintSnow(ctx, image, world)),
		)
	if (look?.fog) {
		controllers.push(
			overScreen('fog-far', 'fog', (ctx, image) =>
				paintFog(ctx, image, world, 0),
			),
		)
		// The bank of cloud, in the world, between the two layers of mist.
		const { deck } = look.fog
		if (deck) {
			const tiles = deckTiles(deck)
			const zoom = () => camera().width() / VIEW_WIDTH
			controllers.push(
				createController({
					init: () => ({
						id: 'fog-deck',
						type: 'fog',
						x: () => deck.from,
						y: () => deckBox(deck, zoom()).top,
						width: () => deckBox(deck, zoom()).width,
						height: () => deckBox(deck, zoom()).height,
					}),
					draw: ({ ctx, image }) =>
						paintFogDeck(ctx, image, world, deck, tiles, {
							left: camera().x() - deck.from,
							right: camera().x() + camera().width() - deck.from,
						}),
				}),
			)
		}
		controllers.push(
			overScreen('fog-near', 'fog', (ctx, image) =>
				paintFog(ctx, image, world, 1),
			),
		)
	}
	return controllers
}

/**
 * The Backdrop: where the page has it, across the camera's view, and up
 * and down with the camera all but a little (`backdropLift`).
 */
function createSky(world: World, scene: Scene, resolve: Resolve) {
	const paint = createBackdropPainter(world, resolve)
	const camera = () => cameraOf(scene)
	/** Its height, from the top of the screen: risen up a mountain, on down as far again. */
	const height = VIEW_HEIGHT + (world.course.look?.horizonRise ?? 0)
	return createController({
		init: () => ({
			id: 'backdrop',
			type: 'backdrop',
			x: () => camera().x(),
			// Its sky goes on up over the top of the screen.
			y: () => backdropLift(world) - HORIZON_SKY_OVER,
			width: () => camera().width(),
			height: () => height + HORIZON_SKY_OVER,
		}),
		draw: ({ ctx, image }) => {
			ctx.translate(0, HORIZON_SKY_OVER)
			paint(ctx, image, camera().width(), height)
		},
	})
}

/**
 * The Ground, and the trees over the brow behind it, in tiles (`TILE`
 * square), in the world: a Controller for each few columns of them, as
 * tall as the ground in them goes, each painting the tiles of it in view.
 * Fire down a pit into hell, flickering, over them.
 */
function createGround(world: World, scene: Scene, resolve: Resolve) {
	const art = createGroundArt(world, resolve)
	return [
		...tileControllers({ left: DRAWN_FROM, ...art }, scene, {
			id: 'ground',
			type: 'ground',
		}),
		...createHellFire(world, scene),
	]
}

/**
 * The Ground as a course's preview draws it (`Ground`, and `HorizonTrees`
 * behind it), read once, ready to paint a tile at a time: its SVG read
 * into chunks a tile wide, and its pits and buildings, not in the SVG,
 * painted by hand. In the Ground's own coordinates: x from `DRAWN_FROM`, y
 * the world's.
 */
function createGroundArt(world: World, resolve: Resolve) {
	const { terrain } = world
	const look = world.course.look
	// The page's own drawing of it, read, then let go of.
	const holder = document.createElement('div')
	const dispose = render(() => createComponent(Ground, { world }), holder)
	const svg = holder.querySelector(':scope > div > svg')
	const [, viewTop = 0, width = 0] = (svg?.getAttribute('viewBox') ?? '')
		.split(' ')
		.map(Number)
	const key = `ground:${world.course.id}:${terrain.finishX}`
	const drawing: SvgDrawing | undefined =
		svg && (svg as SVGElement).style.display !== 'none'
			? compileSvg(svg, { chunkWidth: TILE, resolve, key })
			: undefined
	dispose()

	const pits = gapLook(world) === 'none' ? [] : groundPits(world)
	const gapFill = gapLook(world)
	const insides = look?.pit
		? pits.map((pit) =>
				pitInside({
					look: look.pit as NonNullable<typeof look.pit>,
					width: pit.width,
					near: pit.near - pit.top,
					far: pit.far - pit.top,
					seed: pit.left,
				}),
			)
		: []
	const buildings = buildingLook(world)
	const blocks = terrain.blocks ?? []
	const trees = (horizonTreeList(world) ?? []).map((tree) => ({
		...tree,
		x: tree.x - DRAWN_FROM,
	}))
	/** Every picture it draws, to have loaded before painting any of it. */
	const images = [
		...new Set([
			...(drawing?.images ?? []),
			...trees.map((t) => t.asset),
			...(blocks.length ? buildings.facades : [])
				.map(cssUrl)
				.filter((url) => url !== undefined),
		]),
	]

	// How far up and down each column of tiles has anything in it.
	const columns = Math.max(1, Math.ceil(width / TILE))
	const tops = Array<number>(columns).fill(Number.POSITIVE_INFINITY)
	const bottoms = Array<number>(columns).fill(Number.NEGATIVE_INFINITY)
	const extend = (left: number, right: number, top: number, bottom: number) => {
		const from = Math.max(0, Math.floor(left / TILE))
		const to = Math.min(columns - 1, Math.floor(right / TILE))
		for (let c = from; c <= to; c++) {
			tops[c] = Math.min(tops[c], top)
			bottoms[c] = Math.max(bottoms[c], bottom)
		}
	}
	for (const [c, bounds] of drawing?.chunks ?? [])
		extend(
			c * TILE,
			c * TILE,
			Math.max(viewTop, bounds.top),
			Math.min(VIEW_HEIGHT, bounds.bottom),
		)
	for (const pit of pits)
		extend(pit.left, pit.left + pit.width, pit.top, VIEW_HEIGHT)
	for (const block of blocks)
		extend(
			block.from - DRAWN_FROM,
			block.to - DRAWN_FROM + DEPTH_SLANT,
			GROUND_Y - block.height - PATH_BACK,
			VIEW_HEIGHT,
		)
	// Their size isn't known till they're loaded: as big as any is.
	for (const tree of trees)
		extend(tree.x, tree.x + 160, tree.top, tree.top + 200)
	const rows = tops.map((top, c): [number, number] =>
		top < bottoms[c]
			? [Math.floor(top / TILE), Math.floor((bottoms[c] - 1) / TILE)]
			: [0, -1],
	)

	/** Paints tile `c`, `r` onto `ctx`, from its top left. */
	const paintTile = (
		ctx: CanvasRenderingContext2D,
		c: number,
		r: number,
		image: ImageOf,
	) => {
		const left = c * TILE
		const right = left + TILE
		ctx.translate(-left, -r * TILE)
		// The trees over the brow, behind it all.
		for (const tree of trees) {
			if (tree.x > right || tree.x + 160 < left) continue
			const loaded = image(tree.asset)
			if (!loaded) continue
			const art = filtered(tree.asset, loaded, look?.foliage)
			ctx.drawImage(
				art.art,
				tree.x - art.pad,
				tree.top - art.pad,
				art.width + art.pad * 2,
				art.height + art.pad * 2,
			)
		}
		pits.forEach((pit, i) => {
			if (pit.left > right || pit.left + pit.width < left) return
			paintPit(ctx, pit, gapFill, insides[i], !!look?.pit, resolve)
		})
		blocks.forEach((block, i) => {
			if (block.from - DRAWN_FROM > right) return
			if (block.to - DRAWN_FROM + DEPTH_SLANT < left) return
			paintBuilding(ctx, block, i, buildings, image)
		})
		if (drawing) {
			// Cut off where its `<svg>` ends.
			ctx.save()
			ctx.beginPath()
			ctx.rect(0, viewTop, width, VIEW_HEIGHT - viewTop)
			ctx.clip()
			drawing.paint(ctx, c, image)
			ctx.restore()
		}
	}

	return {
		columns,
		/** Each column's first and last row of tiles with anything in them. */
		rows,
		/**
		 * Tile `c`, `r`, painted, if what it needs has loaded: as sharp as
		 * the screen shows it, zoomed out `zoom`, so zoomed right out it's
		 * not more than a phone can keep.
		 */
		tile(c: number, r: number, image: ImageOf, zoom: number) {
			for (const url of images) if (!image(url)) return undefined
			const density = tileDensity(zoom)
			return cachedArt(
				`${key}:${density}:${c}:${r}`,
				TILE,
				TILE,
				(ctx) => paintTile(ctx, c, r, image),
				density,
			)
		},
	}
}

/**
 * Down a Gap: its drop, and what's inside it, if the course has walls in
 * them, cut to the pit's shape. See `Ground`'s pits.
 */
function paintPit(
	ctx: CanvasRenderingContext2D,
	pit: ReturnType<typeof groundPits>[number],
	gapFill: string,
	inside: ReturnType<typeof pitInside> | undefined,
	walled: boolean,
	resolve: Resolve,
) {
	const { left, width, top, near, far } = pit
	const height = VIEW_HEIGHT - top
	ctx.save()
	ctx.beginPath()
	if (walled) {
		// Its top straight across from one bank to the other.
		ctx.moveTo(left, near)
		ctx.lineTo(left + width, far)
		ctx.lineTo(left + width, VIEW_HEIGHT)
		ctx.lineTo(left, VIEW_HEIGHT)
		ctx.closePath()
	} else ctx.rect(left, top, width, height)
	ctx.clip()
	const fill = cssGradient(ctx, gapFill, top, height, resolve)
	if (fill) {
		ctx.fillStyle = fill
		ctx.fillRect(left, top, width, height)
	}
	if (inside) {
		for (const [x, y, w, h, colour] of inside.rects) {
			ctx.fillStyle = colour
			ctx.fillRect(left + x, top + y, w, h)
		}
		const dark = cssGradient(
			ctx,
			pitDarkening(inside.rim),
			top,
			height,
			resolve,
		)
		if (dark) {
			ctx.fillStyle = dark
			ctx.fillRect(left, top, width, height)
		}
	}
	ctx.restore()
}

/** A building, on a course over rooftops: its side, its roof, and its front. See `Buildings`. */
function paintBuilding(
	ctx: CanvasRenderingContext2D,
	block: NonNullable<World['terrain']['blocks']>[number],
	i: number,
	look: ReturnType<typeof buildingLook>,
	image: ImageOf,
) {
	const left = block.from - DRAWN_FROM
	const width = block.to - block.from
	const top = GROUND_Y - block.height - PATH_BACK
	const depth = PATH_BACK + PATH_FRONT
	const facade = look.facades[i % look.facades.length]
	const wall = look.walls[i % look.walls.length]
	// Its side, going back at the slant everything does, in shade.
	ctx.fillStyle = brighter(wall, 0.6)
	ctx.beginPath()
	ctx.moveTo(left + width, top + depth)
	ctx.lineTo(left + width + DEPTH_SLANT, top)
	ctx.lineTo(left + width + DEPTH_SLANT, VIEW_HEIGHT)
	ctx.lineTo(left + width, VIEW_HEIGHT)
	ctx.fill()
	// Its roof.
	ctx.fillStyle = look.roof
	ctx.beginPath()
	ctx.moveTo(left + DEPTH_SLANT, top)
	ctx.lineTo(left + width + DEPTH_SLANT, top)
	ctx.lineTo(left + width, top + depth)
	ctx.lineTo(left, top + depth)
	ctx.fill()
	// Its front, a picture repeated or a colour, the parapet along its top,
	// and in shadow down its left.
	const front = top + depth
	const url = cssUrl(facade)
	const box = { left, top: front, width, height: VIEW_HEIGHT - front }
	if (url) paintTiled(ctx, image, url, box, { x: 0, down: true })
	else {
		ctx.fillStyle = facade
		ctx.fillRect(left, front, width, VIEW_HEIGHT - front)
	}
	ctx.fillStyle = look.parapet
	ctx.fillRect(left, front - 6, width, 6)
	ctx.fillStyle = 'rgba(0,0,0,0.25)'
	ctx.fillRect(left, front, 6, VIEW_HEIGHT - front)
}

/** The picture in a CSS `url()`, if it's one. */
const cssUrl = (css: string) =>
	/^url\(\s*["']?([^"')]+)["']?\s*\)$/.exec(css.trim())?.[1]

/**
 * Fire down each pit into hell, flickering, and embers rising out of it:
 * over the Ground's tiles, but only where the pit is open, so nothing of
 * the ground either side is drawn over. See `HellFire`.
 */
function createHellFire(world: World, scene: Scene) {
	if (!world.course.look?.pitFire || gapLook(world) === 'none') return []
	const { terrain } = world
	return groundPits(world).map((pit, i) => {
		const { flames, embers } = hellFire(pit.width, pit.left)
		const x = DRAWN_FROM + pit.left
		// Where the Ground's columns leave it open: those with their middle in it.
		let open = Number.POSITIVE_INFINITY
		let shut = Number.NEGATIVE_INFINITY
		for (
			let column = Math.floor(pit.left / GROUND_STEP) * GROUND_STEP;
			column < pit.left + pit.width;
			column += GROUND_STEP
		) {
			if (!terrain.inGap(DRAWN_FROM + column + GROUND_STEP / 2)) continue
			open = Math.min(open, column)
			shut = Math.max(shut, column + GROUND_STEP)
		}
		const height = VIEW_HEIGHT - pit.top + 2
		return createController({
			init: () => ({
				id: `pit-fire-${i}`,
				type: 'ground',
				x: () => x,
				y: () => pit.top,
				width: () => pit.width,
				height: () => height,
			}),
			draw: ({ ctx }) => {
				if (!(shut > open)) return
				const seconds = (Math.max(0, world.ticks()) * TICK_MS) / 1000
				const bottom = VIEW_HEIGHT - pit.top
				ctx.beginPath()
				ctx.rect(
					Math.max(0, open - pit.left),
					0,
					Math.min(pit.width, shut - pit.left) - Math.max(0, open - pit.left),
					bottom,
				)
				ctx.clip()
				for (const flame of flames) {
					const progress = cycle(seconds, 0.45, flame.delay)
					let sx = 1
					let sy = 1
					if (progress !== undefined) {
						// Alternating: every other go, backwards.
						const go = Math.floor((seconds - flame.delay) / 0.45)
						const t = steps(3, go % 2 ? 1 - progress : progress)
						sx = 1.05 - 0.15 * t
						sy = 0.8 + 0.5 * t
					}
					const w = 6 * flame.scale
					ctx.save()
					// From its foot's middle.
					ctx.translate(flame.left + w / 2, bottom + 2)
					ctx.scale(sx * flame.scale, sy * flame.scale)
					ctx.translate(-3, -10)
					for (const [fx, fy, fw, fh, fill] of FLAME) {
						ctx.fillStyle = fill
						ctx.fillRect(fx, fy, fw, fh)
					}
					ctx.restore()
				}
				ctx.fillStyle = '#ffb03a'
				for (const ember of embers) {
					const progress = cycle(seconds, ember.seconds, ember.delay)
					const t = progress === undefined ? 0 : steps(12, progress)
					ctx.globalAlpha = 1 - t
					ctx.fillRect(ember.left + 6 * t, bottom - 23 - 80 * t, 3, 3)
				}
			},
		})
	})
}
