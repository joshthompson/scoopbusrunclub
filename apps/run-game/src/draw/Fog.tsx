import { For, type JSX, Show } from 'solid-js'
import { svgUrl } from '../courses/kit/pixelArt'
import { seeded } from '../courses/kit/seeded'
import { VIEW_HEIGHT } from '../game/constants'
import type { World } from '../game/world'

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

export function Fog(props: { world: World }) {
	const fog = props.world.course.look?.fog
	if (!fog) return null
	const { world } = props
	/** How thick it is, where the camera is: none till `from`, all of it by `full`, gone again by `gone`. */
	const thickness = () => {
		const x = world.camera()
		const rise = (x - fog.from) / (fog.full - fog.from)
		const fall = (fog.gone - x) / (fog.gone - fog.clear)
		return Math.max(0, Math.min(1, rise, fall))
	}
	const layer = (i: number): JSX.CSSProperties => {
		const { tile, width, height, drift, along } = LAYERS[i]
		const t = Math.max(0, world.ticks())
		const x = Math.round(t * drift - world.camera() * along) % width
		const y = Math.round(-world.cameraY() * along * 0.5) % height
		return {
			position: 'absolute',
			inset: 0,
			'pointer-events': 'none',
			'background-image': `url("${tile}")`,
			'background-position': `${x}px ${y}px`,
			'image-rendering': 'pixelated',
			opacity: thickness(),
			visibility: thickness() > 0 ? 'visible' : 'hidden',
		}
	}
	return (
		<>
			<div style={layer(0)} />
			<Show when={fog.deck}>
				{(deck) => <Deck world={world} deck={deck()} />}
			</Show>
			<div style={layer(1)} />
		</>
	)
}

/** The deck's tiles, along it. */
const DECK_TILE = 600
/** How far in from its near end it takes to thicken, from nothing. */
const DECK_FADE = 320

function Deck(props: {
	world: World
	deck: NonNullable<
		NonNullable<NonNullable<World['course']['look']>['fog']>['deck']
	>
}) {
	const { world, deck } = props
	const tiles = [
		deckTile(DECK_TILE, deck.depth, 81),
		deckTile(DECK_TILE, deck.depth + 20, 83),
	]
	/** Where it is on the screen, with the camera's zoom and how far up it's looking. */
	const at = () => {
		const zoom = world.zoom()
		const left = (deck.from - world.camera()) / zoom
		const top =
			VIEW_HEIGHT - (VIEW_HEIGHT - (deck.top - PUFF - world.cameraY())) / zoom
		return { left, top, zoom }
	}
	const shown = () => {
		const { left, top, zoom } = at()
		const width = (deck.to - deck.from) / zoom
		return (
			left < 960 &&
			left + width > 0 &&
			top < VIEW_HEIGHT &&
			top + (deck.depth + PUFF * 2) / zoom > 0
		)
	}
	return (
		<Show when={shown()}>
			<For each={tiles}>
				{(tile, i) => (
					<div
						style={{
							position: 'absolute',
							'pointer-events': 'none',
							left: `${Math.round(at().left)}px`,
							top: `${Math.round(at().top + i() * 10)}px`,
							width: `${deck.to - deck.from}px`,
							height: `${deck.depth + PUFF * 2 + 20}px`,
							'background-image': `url("${tile}")`,
							'background-repeat': 'repeat-x',
							'background-position-x': `${Math.round(Math.max(0, world.ticks()) * (i() ? -0.3 : 0.2))}px`,
							transform: `scale(${1 / at().zoom})`,
							// Wisping away at its near end, not cut off.
							'mask-image': `linear-gradient(to right, transparent, black ${DECK_FADE}px)`,
							'transform-origin': '0 0',
							opacity: i() ? 0.9 : 1,
						}}
					/>
				)}
			</For>
		</Show>
	)
}
