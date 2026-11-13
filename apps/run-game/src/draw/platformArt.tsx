import { Show, createMemo } from 'solid-js'
import { svgUrl } from '../courses/kit/pixelArt'
import type { Course, PlatformLook } from '../courses/types'

/** A Platform's colours, if its course doesn't say: a grassy ledge, in the course's own. */
/** A Platform's look, with everything filled in but what's only for rock. */
export type FullPlatformLook = Required<Omit<PlatformLook, 'rock'>> &
	Pick<PlatformLook, 'rock'>

const PLATFORM_LOOK: FullPlatformLook = {
	top: 'var(--grass-green)',
	face: 'var(--dirt-brown)',
	edge: 'var(--dirt-darker-brown)',
	depth: 18,
	cable: '',
	cloud: false,
}

/** How `course`'s Platforms look. */
export const platformLook = (course: Course): FullPlatformLook => ({
	...PLATFORM_LOOK,
	...course.look?.platform,
})

/**
 * A Platform, filling whatever it's in: its top, its face, and the darker
 * edge under it; or a candyfloss cloud, puffs along its top, its ends
 * rounded.
 */
export function PlatformArt(props: {
	look: FullPlatformLook
	/** Solid all through: a shelf with nothing but air under it. */
	solid?: boolean
	/** How wide it is, and how deep it's drawn: a cloud's drawn to fit. */
	width?: number
	depth?: number
}) {
	if (props.look.cloud)
		return (
			<CloudArt
				look={props.look}
				width={props.width ?? 200}
				depth={props.depth ?? props.look.depth}
			/>
		)
	const rock = props.look.rock
	if (rock)
		return <RockShelf look={props.look} rock={rock} solid={props.solid} />
	return (
		<div
			style={{
				position: 'absolute',
				inset: 0,
				background: props.look.face,
				'border-top': `6px solid ${props.look.top}`,
				'border-bottom': `4px solid ${props.look.edge}`,
				'box-sizing': 'border-box',
			}}
		/>
	)
}

/** How big a candyfloss cloud's pixels are. */
const CLOUD_CELL = 4
/** How far its ends are rounded. */
const CLOUD_ROUND = 12
/** How far apart its puffs are, about, and how big each is, in turn. */
const PUFF_EVERY = 46
const PUFF_SIZES = [16, 12, 18, 14]

/**
 * A candyfloss cloud, `width` by `depth`, as pixel art: its puffs up along
 * its top, its ends rounded, a band of its lightest along its
 * top and its puffs, a highlight on each puff, and its shade along its
 * underside. Its puffs stand up over its top, outside its box.
 */
function CloudArt(props: {
	look: FullPlatformLook
	width: number
	depth: number
}) {
	const cells = createMemo(() => {
		const { width, depth } = props
		// Puffs all along its top, a candyfloss-sized one every so often,
		// big and small by turns; and smaller lumps along its underside.
		const count = Math.max(2, Math.round(width / PUFF_EVERY))
		const step = width / count
		const puffs = Array.from({ length: count }, (_, i) => ({
			x: step * (i + 0.5),
			y: 6,
			r: PUFF_SIZES[i % PUFF_SIZES.length],
		}))
		const lumps = Array.from({ length: count - 1 }, (_, i) => ({
			x: step * (i + 1),
			y: depth - 2,
			r: 8,
		}))
		const over = Math.max(...puffs.map((p) => p.r - p.y))
		const inBody = (x: number, y: number) => {
			if (y < 0 || y > depth || x < 0 || x > width) return false
			// Its ends, rounded off.
			const cx = Math.min(Math.max(x, CLOUD_ROUND), width - CLOUD_ROUND)
			const cy = Math.min(Math.max(y, CLOUD_ROUND), depth - CLOUD_ROUND)
			return (x - cx) ** 2 + (y - cy) ** 2 <= CLOUD_ROUND ** 2
		}
		const puffAt = (x: number, y: number) =>
			puffs.find((p) => (x - p.x) ** 2 + (y - p.y) ** 2 <= p.r ** 2)
		const lumpAt = (x: number, y: number) =>
			lumps.some((p) => (x - p.x) ** 2 + (y - p.y) ** 2 <= p.r ** 2)
		const paths = { top: '', face: '', edge: '', shine: '' }
		const C = CLOUD_CELL
		for (let y = -Math.ceil(over / C) * C; y < depth + 8; y += C)
			for (let x = 0; x < width; x += C) {
				const mx = x + C / 2
				const my = y + C / 2
				const puff = puffAt(mx, my)
				const lump = !puff && !inBody(mx, my) && lumpAt(mx, my)
				if (!puff && !inBody(mx, my) && !lump) continue
				const cell = `M${x},${y}h${C}v${C}h-${C}Z`
				if (
					puff &&
					my < puff.y - puff.r * 0.4 &&
					mx < puff.x - puff.r * 0.1 &&
					mx > puff.x - puff.r * 0.6
				)
					paths.shine += cell
				else if (my < 8 || (puff && my < puff.y)) paths.top += cell
				else if (lump || my > depth - 6) paths.edge += cell
				else paths.face += cell
			}
		return { ...paths, over: Math.ceil(over / C) * C }
	})
	return (
		<svg
			width={props.width}
			height={props.depth + 8 + cells().over}
			shape-rendering="crispEdges"
			aria-hidden="true"
			style={{
				position: 'absolute',
				left: 0,
				top: `${-cells().over}px`,
				overflow: 'visible',
			}}
		>
			<g transform={`translate(0 ${cells().over})`}>
				<path d={cells().face} fill={props.look.face} />
				<path d={cells().top} fill={props.look.top} />
				<path d={cells().edge} fill={props.look.edge} />
				<path d={cells().shine} fill="#ffffff" />
			</g>
		</svg>
	)
}

/** Rects as an SVG's markup, all `fill`. */
const marks = (rects: number[][], fill: string) =>
	rects
		.map(
			([x, y, w, h]) =>
				`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`,
		)
		.join('')

/** Tufts of moss along a rock shelf's lip, as a picture to repeat along it: 52 by 6. */
const tufts = (moss: string) =>
	svgUrl(
		52,
		6,
		marks(
			[
				[3, 4, 6, 2],
				[5, 2, 2, 2],
				[21, 5, 4, 1],
				[33, 3, 8, 3],
				[35, 2, 2, 1],
				[39, 2, 1, 1],
			],
			moss,
		),
	)

/** Rock dripping off a shelf's underside, as a picture to repeat along it: 44 by 10. */
const drips = (drip: string) =>
	svgUrl(
		44,
		10,
		marks(
			[
				[2, 0, 6, 2],
				[3, 2, 4, 2],
				[4, 4, 2, 3],
				[15, 0, 4, 2],
				[16, 2, 2, 2],
				[26, 0, 8, 2],
				[27, 2, 6, 2],
				[28, 4, 4, 2],
				[29, 6, 2, 4],
				[39, 0, 3, 2],
			],
			drip,
		),
	)

/**
 * A shelf of rock: a worn lip, lit, moss along it; the rock of its face,
 * darker the further down it goes, and at its far end; and, under a solid
 * one, rock dripping off it.
 */
function RockShelf(props: {
	look: FullPlatformLook
	rock: NonNullable<PlatformLook['rock']>
	solid?: boolean
}) {
	const { rock } = props
	return (
		<div style={{ position: 'absolute', inset: 0 }}>
			<div
				style={{
					position: 'absolute',
					inset: 0,
					background: `linear-gradient(to bottom, rgba(0, 0, 0, 0) 20%, rgba(0, 0, 0, 0.32)), ${props.look.face}`,
					'border-top': `6px solid ${props.look.top}`,
					'border-bottom': `4px solid ${props.look.edge}`,
					'box-shadow':
						'inset 4px 0 0 rgba(255, 255, 255, 0.07), inset -4px 0 0 rgba(0, 0, 0, 0.28)',
					'box-sizing': 'border-box',
				}}
			/>
			{/* Its lip, lit, and the moss along it. */}
			<div
				style={{
					position: 'absolute',
					left: 0,
					right: 0,
					top: 0,
					height: '2px',
					background: rock.lit,
				}}
			/>
			<div
				style={{
					position: 'absolute',
					left: '4px',
					right: '4px',
					top: '-4px',
					height: '6px',
					background: `url("${tufts(rock.moss)}") repeat-x`,
				}}
			/>
			<Show when={props.solid}>
				<div
					style={{
						position: 'absolute',
						left: '6px',
						right: '6px',
						top: '100%',
						height: '10px',
						background: `url("${drips(rock.drip)}") repeat-x`,
					}}
				/>
			</Show>
		</div>
	)
}
