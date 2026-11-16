import { svgUrl } from '../courses/kit/pixelArt'
import { seeded } from '../courses/kit/seeded'
import { VIEW_HEIGHT, VIEW_WIDTH } from '../game/constants'
import type { World } from '../game/world'
import { type ImageOf, paintTiled } from './paint/bands'
import { inLayer } from './paint/layer'

/**
 * Fog, settled in, high up a mountain: wisps of mist drifting over
 * everything, two layers of them, the near one bigger and quicker, going
 * by as the course does, and up and down with the camera. Fading in along
 * the course from where it's settled, and clearing again further on.
 *
 * And a bank of cloud lying across the course, `deck`, in the world, not
 * on the screen: over whoever's falling through it, so it's a leap into
 * the white.
 */

/**
 * A tile of mist, `width` by `height`: wisps, long and thin, each a few
 * puffs of cells `cell` px across, see-through, softer at their ends.
 */
function wisps(
	width: number,
	height: number,
	count: number,
	cell: number,
	seed: number,
) {
	const random = seeded(seed)
	const snap = (n: number) => Math.round(n / cell) * cell
	let body = ''
	for (let i = 0; i < count; i++) {
		const cx = random() * width
		const cy = snap(height * 0.1 + random() * height * 0.8)
		const length = 120 + random() * 220
		const thick = cell * (2 + Math.floor(random() * 3))
		const alpha = 0.08 + random() * 0.12
		// Puffs along it: thickest in the middle, thinning to either end.
		for (let x = -length / 2; x < length / 2; x += cell) {
			const t = 1 - Math.abs(x) / (length / 2)
			const h = snap(
				thick * (0.3 + t * 0.7) + Math.sin((x + i * 13) / 9) * cell,
			)
			if (h <= 0) continue
			const y = cy - snap(h / 2)
			// Wrapped round, so it tiles.
			for (const dx of [0, -width, width]) {
				const at = snap(cx + x) + dx
				if (at < -cell || at > width) continue
				body += `<rect x="${at}" y="${y}" width="${cell}" height="${h}" fill="rgba(240,244,246,${(alpha * (0.5 + t * 0.5)).toFixed(3)})"/>`
			}
		}
	}
	return svgUrl(width, height, body)
}

/** Far to near: their tile, its size, how fast they drift, a tick, and how much they go by with the camera. */
const LAYERS = [
	{
		tile: wisps(720, 300, 10, 2, 71),
		width: 720,
		height: 300,
		drift: -0.25,
		along: 0.55,
	},
	{
		tile: wisps(1100, 420, 7, 4, 73),
		width: 1100,
		height: 420,
		drift: -0.6,
		along: 1.1,
	},
]

/** A cloud's colours: lit on top, its body, and in shadow underneath. */
const CLOUD_LIT = '#ffffff'
const CLOUD = '#eef2f5'
const CLOUD_SHADE = '#d3dde5'

/** How far the deck's puffs rise over its top, and hang under its bottom. */
const PUFF = 34

/**
 * A stretch of the bank of cloud, `width` across, `depth` deep from its
 * top to its bottom, puffed up over its top and hanging in puffs under its
 * bottom: tiled along it.
 */
function deckTile(width: number, depth: number, seed: number) {
	const random = seeded(seed)
	const height = depth + PUFF * 2
	const puff = (cx: number, cy: number, r: number, fill: string) => {
		let out = ''
		for (const dx of [0, -width, width])
			for (let y = -r; y <= r; y += 4) {
				const half = Math.round(Math.sqrt(r * r - y * y) / 4) * 4
				if (half <= 0) continue
				out += `<rect x="${cx + dx - half}" y="${cy + y}" width="${half * 2}" height="4" fill="${fill}"/>`
			}
		return out
	}
	let shade = ''
	let lit = ''
	let body = ''
	for (let x = 0; x < width; x += 30 + Math.round(random() * 24)) {
		const r = 18 + Math.round(random() * 14)
		lit += puff(x, PUFF + 6 - Math.round(random() * 10), r, CLOUD_LIT)
		body += puff(x + 6, PUFF + 12, r - 2, CLOUD)
		shade += puff(
			x + 14,
			PUFF + depth - 4 + Math.round(random() * 10),
			r - 4,
			CLOUD_SHADE,
		)
	}
	return svgUrl(
		width,
		height,
		`${shade}<rect x="0" y="${PUFF + depth - 12}" width="${width}" height="12" fill="${CLOUD_SHADE}"/>${lit}${body}<rect x="0" y="${PUFF + 12}" width="${width}" height="${depth - 24}" fill="${CLOUD}"/>`,
	)
}

type FogLook = NonNullable<NonNullable<World['course']['look']>['fog']>
type DeckLook = NonNullable<FogLook['deck']>

/** How thick it is, where the camera is: none till `from`, all of it by `full`, gone again by `gone`. */
function thickness(world: World, fog: FogLook) {
	const x = world.camera()
	const rise = (x - fog.from) / (fog.full - fog.from)
	const fall = (fog.gone - x) / (fog.gone - fog.clear)
	return Math.max(0, Math.min(1, rise, fall))
}

/** Where a layer's tiles are, on the screen. */
function layerAt(world: World, i: number) {
	const { width, height, drift, along } = LAYERS[i]
	const t = Math.max(0, world.ticks())
	return {
		x: Math.round(t * drift - world.camera() * along) % width,
		y: Math.round(-world.cameraY() * along * 0.5) % height,
	}
}

/**
 * A layer of the mist, far (0) or near (1), painted onto the canvas over
 * the whole screen: in the screen's own pixels, from its top left.
 */
export function paintFog(
	ctx: CanvasRenderingContext2D,
	image: ImageOf,
	world: World,
	i: number,
) {
	const fog = world.course.look?.fog
	if (!fog) return
	const opacity = thickness(world, fog)
	if (opacity <= 0) return
	ctx.globalAlpha *= opacity
	paintTiled(
		ctx,
		image,
		LAYERS[i].tile,
		{ left: 0, top: 0, width: VIEW_WIDTH, height: VIEW_HEIGHT },
		{ ...layerAt(world, i), down: true },
	)
}

/** The bank of cloud's two tiles, as images' URLs: made once each. */
export const deckTiles = (deck: DeckLook) => [
	deckTile(DECK_TILE, deck.depth, 81),
	deckTile(DECK_TILE, deck.depth + 20, 83),
]

/**
 * Where the bank of cloud is drawn, in the world, at the camera's `zoom`:
 * its top, less `PUFF`, and how wide and deep, its second tile and all.
 */
export const deckBox = (deck: DeckLook, zoom: number) => ({
	top: deck.top - PUFF,
	width: deck.to - deck.from,
	height: Math.max(
		deck.depth + PUFF * 2 + 20 + 10 * zoom,
		deck.deep ? DEEP_BOTTOM - deck.top + PUFF : 0,
	),
})

/**
 * How far down a deep deck goes, in the world: further than any camera
 * looks, which is never lower than the course's lowest (see `cameraYFor`).
 */
const DEEP_BOTTOM = VIEW_HEIGHT * 2
/** How far a deep deck takes to thin out at its far end. */
const DEEP_FADE = 90
/** How much darker it gets the further down, over how far. */
const DEEP_SHADE = '#dde5eb'
const DEEP_SHADING = 700

/**
 * Under a deck, over its `deep` stretch: the cloud going on down, `left`
 * to `right` of it in view, from inside its body, under its tiles, so its
 * bottom's puffs hang in it. Thickening from nothing at its near end, as
 * the deck does, and thinning out at its far end.
 */
function paintDeep(
	ctx: CanvasRenderingContext2D,
	deck: DeckLook,
	left: number,
	right: number,
	height: number,
) {
	if (!deck.deep) return
	const from = deck.deep.from - deck.from
	const to = deck.deep.to - deck.from
	const l = Math.max(left, from)
	const r = Math.min(right, to)
	if (r <= l) return
	const top = PUFF + 40
	const fill = (c: CanvasRenderingContext2D) => {
		const shade = c.createLinearGradient(0, top, 0, top + DEEP_SHADING)
		shade.addColorStop(0, CLOUD)
		shade.addColorStop(1, DEEP_SHADE)
		c.fillStyle = shade
		c.fillRect(l, top, r - l, height - top)
	}
	if (l >= from + DECK_FADE && r <= to - DEEP_FADE) return fill(ctx)
	inLayer(ctx, 1, fill, (c) => {
		const fade = c.createLinearGradient(from, 0, to, 0)
		const span = to - from
		fade.addColorStop(0, 'rgba(0, 0, 0, 0)')
		fade.addColorStop(Math.min(0.5, DECK_FADE / span), 'black')
		fade.addColorStop(Math.max(0.5, 1 - DEEP_FADE / span), 'black')
		fade.addColorStop(1, 'rgba(0, 0, 0, 0)')
		c.fillStyle = fade
		c.fillRect(l, top, r - l, height - top)
	})
}

/**
 * The bank of cloud, painted onto the canvas, in the world: from its left
 * end, and its top (less `PUFF`), at the camera's `zoom`. Only `left` to
 * `right` of it, what's in view.
 */
export function paintFogDeck(
	ctx: CanvasRenderingContext2D,
	image: ImageOf,
	world: World,
	deck: DeckLook,
	tiles: string[],
	view: { left: number; right: number },
) {
	const width = deck.to - deck.from
	const left = Math.max(0, view.left)
	const right = Math.min(width, view.right)
	if (right <= left) return
	paintDeep(ctx, deck, left, right, deckBox(deck, world.zoom()).height)
	tiles.forEach((tile, i) => {
		const draw = (c: CanvasRenderingContext2D) =>
			paintTiled(
				c,
				image,
				tile,
				{
					left,
					top: i * 10 * world.zoom(),
					width: right - left,
					height: deck.depth + PUFF * 2 + 20,
				},
				{
					x: Math.round(Math.max(0, world.ticks()) * (i ? -0.3 : 0.2)) - left,
				},
			)
		const opacity = i ? 0.9 : 1
		// Wisping away at its near end, not cut off.
		if (left >= DECK_FADE) {
			ctx.save()
			ctx.globalAlpha *= opacity
			draw(ctx)
			ctx.restore()
			return
		}
		inLayer(ctx, opacity, draw, (c) => {
			const fade = c.createLinearGradient(0, 0, DECK_FADE, 0)
			fade.addColorStop(0, 'rgba(0, 0, 0, 0)')
			fade.addColorStop(1, 'black')
			c.fillStyle = fade
			c.fillRect(0, -PUFF, width, deck.depth + PUFF * 4 + 40)
		})
	})
}

/** The deck's tiles, along it. */
const DECK_TILE = 600
/** How far in from its near end it takes to thicken, from nothing. */
const DECK_FADE = 320
