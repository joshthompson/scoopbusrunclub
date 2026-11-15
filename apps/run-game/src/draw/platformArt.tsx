import { Show, createMemo } from 'solid-js'
import { svgUrl } from '../courses/kit/pixelArt'
import type { Course, PlatformLook } from '../courses/types'
import { cachedArt } from './canvasArt'
import {
	backgroundImage,
	cssColour,
	fillBackground,
} from './paint/cssBackground'

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
 * A candyfloss cloud's cells, `width` by `depth`, as a path for each of its
 * colours, from `over` px above its box, where its puffs stand up to.
 */
export function cloudCells(width: number, depth: number) {
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
}

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
	const cells = createMemo(() => cloudCells(props.width, props.depth))
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

/** What a Draw Hook loads its pictures with: its `image(url)`. */
type LoadImage = (
	url: string,
) => { image: CanvasImageSource; width: number; height: number } | undefined

/**
 * `PlatformArt`, painted in a Draw Hook: the same Platform, `width` by
 * `depth`, from (0, 0) of `ctx`. Painted once and kept (see `cachedArt`),
 * once the pictures it's painted with have loaded: till then, not at all,
 * and the canvas is painted again as each arrives.
 */
export function platformPainter(
	look: FullPlatformLook,
	options: { solid?: boolean; width: number; depth: number },
) {
	const { width, depth } = options
	const rock = look.cloud ? undefined : look.rock
	const solid = !!options.solid
	/** Its face's picture, if it's one; and the moss and drips on rock. */
	const face = look.cloud ? undefined : backgroundImage(look.face)
	const moss = rock && tufts(rock.moss)
	const drip = rock && solid ? drips(rock.drip) : undefined
	// How far it reaches out of its box: a cloud's puffs up over its top,
	// a rock shelf's moss and its drips under it.
	const cloud = look.cloud ? cloudCells(width, depth) : undefined
	const over = cloud ? cloud.over : rock ? 4 : 0
	const under = cloud ? 8 : drip ? 10 : 0
	const key = `platform:${JSON.stringify(look)}:${solid}:${width}x${depth}`
	const paint = (
		c: CanvasRenderingContext2D,
		pictures: Record<string, ReturnType<LoadImage>>,
	) => {
		c.imageSmoothingEnabled = false
		c.translate(0, over)
		if (cloud) {
			const fills = [
				[cloud.face, look.face],
				[cloud.top, look.top],
				[cloud.edge, look.edge],
				[cloud.shine, '#ffffff'],
			]
			for (const [cells, fill] of fills) {
				c.fillStyle = cssColour(fill)
				c.fill(new Path2D(cells))
			}
			return
		}
		// Its face, inside its borders: 6 px of its top over it, 4 px of its
		// edge under it.
		const inside = { x: 0, y: 6, width, height: depth - 10 }
		fillBackground(c, look.face, inside, face ? pictures[face] : undefined)
		if (rock) {
			// Darker the further down it goes, and at its far end; lit at its
			// near one.
			const shade = c.createLinearGradient(0, inside.y, 0, depth - 4)
			shade.addColorStop(0.2, 'rgba(0, 0, 0, 0)')
			shade.addColorStop(1, 'rgba(0, 0, 0, 0.32)')
			c.fillStyle = shade
			c.fillRect(inside.x, inside.y, inside.width, inside.height)
			c.fillStyle = 'rgba(255, 255, 255, 0.07)'
			c.fillRect(0, inside.y, 4, inside.height)
			c.fillStyle = 'rgba(0, 0, 0, 0.28)'
			c.fillRect(width - 4, inside.y, 4, inside.height)
		}
		c.fillStyle = cssColour(look.top)
		c.fillRect(0, 0, width, 6)
		c.fillStyle = cssColour(look.edge)
		c.fillRect(0, depth - 4, width, 4)
		if (!rock) return
		c.fillStyle = rock.lit
		c.fillRect(0, 0, width, 2)
		const along = (url: string, x: number, y: number, w: number) => {
			const picture = pictures[url]
			if (!picture) return
			fillBackground(
				c,
				`url("${url}")`,
				{ x, y, width: w, height: picture.height },
				picture,
			)
		}
		if (moss) along(moss, 4, -4, width - 8)
		if (drip) along(drip, 6, depth, width - 12)
	}
	return (ctx: CanvasRenderingContext2D, image: LoadImage) => {
		const pictures: Record<string, ReturnType<LoadImage>> = {}
		for (const url of [face, moss, drip]) {
			if (!url) continue
			pictures[url] = image(url)
			if (!pictures[url]) return
		}
		const height = over + depth + under
		const art = cachedArt(key, width, height, (c) => paint(c, pictures))
		ctx.drawImage(art, 0, -over, width, height)
	}
}
