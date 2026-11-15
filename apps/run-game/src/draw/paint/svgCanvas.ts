import { cachedArt } from '../canvasArt'
import type { Loaded, Resolve } from './css'

/**
 * An SVG of the game's own, painted onto a canvas by hand: its `<path>`s,
 * `<rect>`s, `<polygon>`s, `<polyline>`s and `<image>`s, filled with
 * colours, `<pattern>`s and `<linearGradient>`s, in `<g>`s moved about.
 * What the Ground is drawn as, along the whole course.
 *
 * A course is tens of thousands of pixels long, and one path along all of
 * it costs as much to fill however little of it's in view. So it's cut,
 * as it's read, into chunks `chunkWidth` across, each a `Path2D` of its
 * own, built once: painting a bit of it fills only the chunk it's in.
 * The Ground's paths are its columns, all straight across or straight
 * down, so they're cut exactly; anything else is put whole into every
 * chunk it reaches.
 */

/** A rectangle: left, top, right, bottom. */
type Box = [number, number, number, number]

/** What fills or strokes something. */
type Fill =
	| { colour: string }
	| { pattern: string }
	| { gradient: string }
	| undefined

interface Shape {
	kind: 'fill' | 'stroke' | 'image'
	fill: Fill
	/** How far round it is, all of it, not just a chunk: a gradient's box. */
	box: Box
	transform?: DOMMatrix
	alpha: number
	rule: CanvasFillRule
	lineWidth: number
	image?: {
		href: string
		x: number
		y: number
		width: number
		height: number
		stretch: boolean
	}
}

/** A chunk's share of the drawing: what's in it, in order, each cut to it. */
interface Chunk {
	parts: { shape: Shape; path?: Path2D }[]
	top: number
	bottom: number
}

interface PatternDef {
	width: number
	height: number
	x: number
	y: number
	content: SvgDrawing
}

interface GradientDef {
	userSpace: boolean
	x1: number
	y1: number
	x2: number
	y2: number
	stops: [number, string][]
}

export interface SvgDrawing {
	/** Every image it draws, to load before it's painted. */
	images: string[]
	/** Which chunks it has, and how far up and down each goes. */
	chunks: Map<number, { top: number; bottom: number }>
	chunkWidth: number
	/**
	 * Paints chunk `k` onto `ctx`, in the drawing's own coordinates, with
	 * its images, which have to have loaded.
	 */
	paint(
		ctx: CanvasRenderingContext2D,
		k: number,
		image: (url: string) => Loaded | undefined,
	): void
}

/** A colour as a canvas has it, to tell whether it's see-through, and to give it an opacity. */
let probe: CanvasRenderingContext2D | null | undefined
function normalColour(colour: string) {
	probe ??= document.createElement('canvas').getContext('2d')
	if (!probe) return colour
	probe.fillStyle = '#000000'
	probe.fillStyle = colour
	return String(probe.fillStyle)
}

function withOpacity(colour: string, opacity: number) {
	const normal = normalColour(colour)
	if (opacity >= 1) return normal
	const hex = /^#([\da-f]{6})$/i.exec(normal)
	if (hex) {
		const n = Number.parseInt(hex[1], 16)
		return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${opacity})`
	}
	const rgba = /^rgba\(([^,]+),([^,]+),([^,]+),([^)]+)\)$/.exec(normal)
	if (rgba)
		return `rgba(${rgba[1]},${rgba[2]},${rgba[3]}, ${Number(rgba[4]) * opacity})`
	return normal
}

const number = (value: string | null, fallback = 0) => {
	if (value === null || value === '') return fallback
	const n = Number.parseFloat(value)
	return Number.isNaN(n) ? fallback : n
}

/** A gradient's `x1` and so on: a fraction, if given as a percentage. */
const fraction = (value: string | null, fallback: number) =>
	value?.trim().endsWith('%') ? number(value) / 100 : number(value, fallback)

/** The `transform` of a `<g>`: its `translate`s and `scale`s, in order. */
function transformOf(value: string | null) {
	if (!value) return undefined
	const matrix = new DOMMatrix()
	for (const [, name, args] of value.matchAll(/(\w+)\(([^)]*)\)/g)) {
		const [a = 0, b] = args
			.split(/[\s,]+/)
			.filter(Boolean)
			.map(Number)
		if (name === 'translate') matrix.translateSelf(a, b ?? 0)
		else if (name === 'scale') matrix.scaleSelf(a, b ?? a)
		else if (name === 'matrix') {
			const [m0, m1, m2, m3, m4, m5] = args.split(/[\s,]+/).map(Number)
			matrix.multiplySelf(new DOMMatrix([m0, m1, m2, m3, m4, m5]))
		}
	}
	return matrix
}

/** A path's `d`, as its subpaths' points, and whether each is all straight across and down. */
function subpathsOf(d: string) {
	const subpaths: { points: number[]; square: boolean }[] = []
	const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? []
	let x = 0
	let y = 0
	let current: number[] = []
	let square = true
	let command = ''
	let startX = 0
	let startY = 0
	const flush = () => {
		if (current.length >= 6) subpaths.push({ points: current, square })
		current = []
		square = true
	}
	const to = (nx: number, ny: number) => {
		if (nx !== x && ny !== y) square = false
		x = nx
		y = ny
		current.push(x, y)
	}
	let i = 0
	const next = () => Number(tokens[i++])
	while (i < tokens.length) {
		const token = tokens[i]
		if (/[a-zA-Z]/.test(token)) {
			command = token
			i++
			if (command === 'Z' || command === 'z') {
				flush()
				x = startX
				y = startY
				continue
			}
		}
		switch (command) {
			case 'M':
			case 'm': {
				flush()
				const nx = next()
				const ny = next()
				x = command === 'm' ? x + nx : nx
				y = command === 'm' ? y + ny : ny
				startX = x
				startY = y
				current.push(x, y)
				// Pairs after it are lines.
				command = command === 'm' ? 'l' : 'L'
				break
			}
			case 'L':
				to(next(), next())
				break
			case 'l': {
				const dx = next()
				const dy = next()
				to(x + dx, y + dy)
				break
			}
			case 'H':
				to(next(), y)
				break
			case 'h':
				to(x + next(), y)
				break
			case 'V':
				to(x, next())
				break
			case 'v':
				to(x, y + next())
				break
			default:
				// A curve: not one of the game's own.
				return undefined
		}
	}
	flush()
	return subpaths
}

/** The points of a `points` attribute. */
const pointsOf = (value: string | null) =>
	(value ?? '')
		.trim()
		.split(/[\s,]+/)
		.filter(Boolean)
		.map(Number)

function boxOf(points: number[]): Box {
	let left = Number.POSITIVE_INFINITY
	let top = Number.POSITIVE_INFINITY
	let right = Number.NEGATIVE_INFINITY
	let bottom = Number.NEGATIVE_INFINITY
	for (let i = 0; i < points.length; i += 2) {
		left = Math.min(left, points[i])
		right = Math.max(right, points[i])
		top = Math.min(top, points[i + 1])
		bottom = Math.max(bottom, points[i + 1])
	}
	return [left, top, right, bottom]
}

function transformedBox(box: Box, m: DOMMatrix | undefined): Box {
	if (!m) return box
	const corners = [
		m.transformPoint({ x: box[0], y: box[1] }),
		m.transformPoint({ x: box[2], y: box[1] }),
		m.transformPoint({ x: box[0], y: box[3] }),
		m.transformPoint({ x: box[2], y: box[3] }),
	]
	return boxOf(corners.flatMap((p) => [p.x, p.y]))
}

/**
 * Reads `svg` (or a `<pattern>`'s children) into chunks `chunkWidth`
 * across, ready to paint. `key` names it among the art kept painted (its
 * patterns' tiles), so has to be different for every different drawing.
 */
export function compileSvg(
	root: Element,
	options: { chunkWidth: number; resolve: Resolve; key: string },
): SvgDrawing {
	const { chunkWidth, resolve, key } = options
	const svg = root.closest('svg') ?? root
	const chunks = new Map<number, Chunk>()
	const images = new Set<string>()
	const patterns = new Map<string, PatternDef | undefined>()
	const gradients = new Map<string, GradientDef | undefined>()

	const chunkOf = (k: number) => {
		let chunk = chunks.get(k)
		if (!chunk) {
			chunk = {
				parts: [],
				top: Number.POSITIVE_INFINITY,
				bottom: Number.NEGATIVE_INFINITY,
			}
			chunks.set(k, chunk)
		}
		return chunk
	}
	const chunksOver = (left: number, right: number) => {
		if (!Number.isFinite(chunkWidth)) return [0, 0]
		return [Math.floor(left / chunkWidth), Math.floor(right / chunkWidth)]
	}

	/** A `url(#id)`'s pattern or gradient, read the first time it's used. */
	const fillOf = (value: string | null | undefined): Fill => {
		if (!value || value === 'none') return undefined
		const resolved = resolve(value).trim()
		const url = /^url\(\s*["']?#([^"')]+)["']?\s*\)$/.exec(resolved)
		if (!url) return { colour: normalColour(resolved) }
		const id = url[1]
		const element = svg.querySelector(`[id="${id}"]`)
		if (!element) return undefined
		if (element.localName === 'pattern') {
			if (!patterns.has(id)) {
				const width = number(element.getAttribute('width'))
				const height = number(element.getAttribute('height'))
				patterns.set(
					id,
					width > 0 && height > 0
						? {
								width,
								height,
								x: number(element.getAttribute('x')),
								y: number(element.getAttribute('y')),
								content: compileSvg(element, {
									chunkWidth: Number.POSITIVE_INFINITY,
									resolve,
									key: `${key}#${id}`,
								}),
							}
						: undefined,
				)
				for (const url of patterns.get(id)?.content.images ?? [])
					images.add(url)
			}
			return patterns.get(id) ? { pattern: id } : undefined
		}
		if (element.localName === 'linearGradient') {
			if (!gradients.has(id)) {
				const userSpace =
					element.getAttribute('gradientUnits') === 'userSpaceOnUse'
				const stops = [...element.querySelectorAll('stop')].map(
					(stop): [number, string] => {
						const offset = stop.getAttribute('offset') ?? '0'
						const colour =
							stop.getAttribute('stop-color') ??
							((stop as SVGElement).style?.getPropertyValue('stop-color') ||
								null) ??
							'black'
						return [
							Math.max(0, Math.min(1, fraction(offset, 0))),
							withOpacity(
								resolve(colour),
								number(stop.getAttribute('stop-opacity'), 1),
							),
						]
					},
				)
				gradients.set(id, {
					userSpace,
					x1: fraction(element.getAttribute('x1'), 0),
					y1: fraction(element.getAttribute('y1'), 0),
					x2: fraction(element.getAttribute('x2'), userSpace ? 0 : 1),
					y2: fraction(element.getAttribute('y2'), 0),
					stops,
				})
			}
			return gradients.get(id) ? { gradient: id } : undefined
		}
		return undefined
	}

	/** Puts a shape made of `subpaths` into the chunks it's in, cut to each. */
	const addPath = (
		shape: Shape,
		subpaths: { points: number[]; square: boolean }[],
		closed: boolean,
	) => {
		const built = new Map<number, Path2D>()
		const pathIn = (k: number) => {
			let path = built.get(k)
			if (!path) {
				path = new Path2D()
				built.set(k, path)
			}
			return path
		}
		const extend = (k: number, top: number, bottom: number) => {
			const chunk = chunkOf(k)
			chunk.top = Math.min(chunk.top, top)
			chunk.bottom = Math.max(chunk.bottom, bottom)
		}
		const outset = shape.kind === 'stroke' ? shape.lineWidth / 2 : 0
		for (const { points, square } of subpaths) {
			const [left, top, right, bottom] = transformedBox(
				boxOf(points),
				shape.transform,
			)
			const [from, to] = chunksOver(left - outset, right + outset)
			const trace = (path: Path2D, list: number[]) => {
				path.moveTo(list[0], list[1])
				for (let i = 2; i < list.length; i += 2)
					path.lineTo(list[i], list[i + 1])
				if (closed) path.closePath()
			}
			if (from === to || !square || !closed || shape.transform) {
				// Whole, into every chunk it reaches.
				for (let k = from; k <= to; k++) {
					trace(pathIn(k), points)
					extend(k, top - outset, bottom + outset)
				}
				continue
			}
			// Straight across and down: cut at each chunk's edges, by moving
			// whatever's past them onto them. Each edge goes into the chunks
			// it's in, so it takes one pass along it, however long.
			const cut = new Map<number, number[]>()
			const n = points.length / 2
			const push = (k: number, x: number, y: number) => {
				const kx = Math.min(Math.max(x, k * chunkWidth), (k + 1) * chunkWidth)
				let list = cut.get(k)
				if (!list) {
					list = []
					cut.set(k, list)
				}
				const last = list.length - 2
				if (list[last] !== kx || list[last + 1] !== y) list.push(kx, y)
			}
			for (let i = 0; i < n; i++) {
				const ax = points[i * 2]
				const ay = points[i * 2 + 1]
				const j = (i + 1) % n
				const bx = points[j * 2]
				const by = points[j * 2 + 1]
				const lo = Math.min(ax, bx)
				const hi = Math.max(ax, bx)
				const ka = Math.max(from, Math.ceil(lo / chunkWidth) - 1)
				const kb = Math.min(to, Math.floor(hi / chunkWidth))
				for (let k = ka; k <= kb; k++) {
					push(k, ax, ay)
					push(k, bx, by)
				}
			}
			for (const [k, list] of cut) {
				if (list.length < 6) continue
				trace(pathIn(k), list)
				let lo = Number.POSITIVE_INFINITY
				let hi = Number.NEGATIVE_INFINITY
				for (let i = 1; i < list.length; i += 2) {
					lo = Math.min(lo, list[i])
					hi = Math.max(hi, list[i])
				}
				extend(k, lo, hi)
			}
		}
		for (const [k, path] of built) chunkOf(k).parts.push({ shape, path })
	}

	/** Reads `element`'s children, in order, as they're drawn. */
	const walk = (
		parent: Element,
		inherited: {
			fill: string | null
			stroke: string | null
			strokeWidth: number
			transform?: DOMMatrix
		},
	) => {
		for (const element of parent.children) {
			const name = element.localName
			if (
				name === 'defs' ||
				name === 'pattern' ||
				name === 'linearGradient' ||
				name === 'radialGradient' ||
				name === 'style' ||
				name === 'title'
			)
				continue
			const style = (element as SVGElement).style
			if (
				style?.display === 'none' ||
				element.getAttribute('display') === 'none'
			)
				continue
			const own = (attribute: string) =>
				style?.getPropertyValue(attribute) || element.getAttribute(attribute)
			const transform = (() => {
				const mine = transformOf(element.getAttribute('transform'))
				if (!mine) return inherited.transform
				return inherited.transform ? inherited.transform.multiply(mine) : mine
			})()
			const state = {
				fill: own('fill') ?? inherited.fill,
				stroke: own('stroke') ?? inherited.stroke,
				strokeWidth: number(own('stroke-width'), inherited.strokeWidth),
				transform,
			}
			const alpha =
				number(element.getAttribute('opacity'), 1) *
				number(element.getAttribute('fill-opacity'), 1)
			const rule: CanvasFillRule =
				own('fill-rule') === 'evenodd' ? 'evenodd' : 'nonzero'
			if (name === 'g' || name === 'svg') {
				walk(element, state)
				continue
			}
			if (name === 'image') {
				const href =
					element.getAttribute('href') ?? element.getAttribute('xlink:href')
				if (!href) continue
				images.add(href)
				const x = number(element.getAttribute('x'))
				const y = number(element.getAttribute('y'))
				const width = number(element.getAttribute('width'))
				const height = number(element.getAttribute('height'))
				const box = transformedBox([x, y, x + width, y + height], transform)
				const shape: Shape = {
					kind: 'image',
					fill: undefined,
					box,
					transform,
					alpha,
					rule,
					lineWidth: 0,
					image: {
						href,
						x,
						y,
						width,
						height,
						stretch: element.getAttribute('preserveAspectRatio') === 'none',
					},
				}
				const [from, to] = chunksOver(box[0], box[2])
				for (let k = from; k <= to; k++) {
					const chunk = chunkOf(k)
					chunk.parts.push({ shape })
					chunk.top = Math.min(chunk.top, box[1])
					chunk.bottom = Math.max(chunk.bottom, box[3])
				}
				continue
			}
			let subpaths: { points: number[]; square: boolean }[] | undefined
			let closed = true
			if (name === 'path')
				subpaths = subpathsOf(element.getAttribute('d') ?? '')
			else if (name === 'rect') {
				const x = number(element.getAttribute('x'))
				const y = number(element.getAttribute('y'))
				const w = number(element.getAttribute('width'))
				const h = number(element.getAttribute('height'))
				if (w > 0 && h > 0)
					subpaths = [
						{ points: [x, y, x + w, y, x + w, y + h, x, y + h], square: true },
					]
			} else if (name === 'polygon' || name === 'polyline') {
				const points = pointsOf(element.getAttribute('points'))
				closed = name === 'polygon'
				if (points.length >= 4) subpaths = [{ points, square: false }]
			}
			if (!subpaths?.length) continue
			const box = transformedBox(
				boxOf(subpaths.flatMap((s) => s.points)),
				transform,
			)
			// A polyline's only stroked; anything else filled, then stroked.
			const fill =
				name === 'polyline' ? undefined : fillOf(state.fill ?? 'black')
			if (fill)
				addPath(
					{ kind: 'fill', fill, box, transform, alpha, rule, lineWidth: 0 },
					subpaths,
					true,
				)
			const stroke = fillOf(state.stroke)
			if (stroke && state.strokeWidth > 0)
				addPath(
					{
						kind: 'stroke',
						fill: stroke,
						box,
						transform,
						alpha,
						rule,
						lineWidth: state.strokeWidth,
					},
					subpaths,
					closed,
				)
		}
	}
	walk(root, { fill: null, stroke: null, strokeWidth: 1 })

	/** A pattern's tile, painted once and kept, as the canvas's pattern. */
	const patternFor = (
		ctx: CanvasRenderingContext2D,
		id: string,
		image: (url: string) => Loaded | undefined,
	) => {
		const def = patterns.get(id)
		if (!def) return undefined
		const tile = cachedArt(`svg:${key}#${id}`, def.width, def.height, (c) => {
			for (const k of def.content.chunks.keys()) def.content.paint(c, k, image)
		})
		const pattern = ctx.createPattern(tile, 'repeat')
		const scale = def.width / tile.width
		pattern?.setTransform(new DOMMatrix([scale, 0, 0, scale, def.x, def.y]))
		return pattern ?? undefined
	}

	return {
		images: [...images],
		chunks: new Map(
			[...chunks].map(([k, { top, bottom }]) => [k, { top, bottom }]),
		),
		chunkWidth,
		paint(ctx, k, image) {
			const chunk = chunks.get(k)
			if (!chunk) return
			const made = new Map<
				string,
				CanvasPattern | CanvasGradient | string | undefined
			>()
			const style = (shape: Shape) => {
				const { fill } = shape
				if (!fill) return undefined
				if ('colour' in fill) return fill.colour
				if ('pattern' in fill) {
					if (!made.has(fill.pattern))
						made.set(fill.pattern, patternFor(ctx, fill.pattern, image))
					return made.get(fill.pattern)
				}
				const def = gradients.get(fill.gradient)
				if (!def) return undefined
				// Across the shape's own box, or the drawing.
				const [left, top, right, bottom] = shape.box
				const at = (fx: number, fy: number) =>
					def.userSpace
						? [fx, fy]
						: [left + fx * (right - left), top + fy * (bottom - top)]
				const [x1, y1] = at(def.x1, def.y1)
				const [x2, y2] = at(def.x2, def.y2)
				const gradient = ctx.createLinearGradient(x1, y1, x2, y2)
				for (const [offset, colour] of def.stops)
					gradient.addColorStop(offset, colour)
				return gradient
			}
			for (const { shape, path } of chunk.parts) {
				ctx.save()
				if (shape.transform)
					ctx.transform(
						shape.transform.a,
						shape.transform.b,
						shape.transform.c,
						shape.transform.d,
						shape.transform.e,
						shape.transform.f,
					)
				ctx.globalAlpha *= shape.alpha
				if (shape.kind === 'image' && shape.image) {
					const { href, x, y, width, height, stretch } = shape.image
					const loaded = image(href)
					if (loaded) {
						if (stretch) ctx.drawImage(loaded.image, x, y, width, height)
						else {
							// Fitted in, its own shape, in the middle, as SVG's default.
							const scale = Math.min(
								width / loaded.width,
								height / loaded.height,
							)
							const w = loaded.width * scale
							const h = loaded.height * scale
							ctx.drawImage(
								loaded.image,
								x + (width - w) / 2,
								y + (height - h) / 2,
								w,
								h,
							)
						}
					}
				} else if (path) {
					const fill = style(shape)
					if (fill !== undefined) {
						if (shape.kind === 'fill') {
							ctx.fillStyle = fill
							ctx.fill(path, shape.rule)
						} else {
							ctx.strokeStyle = fill
							ctx.lineWidth = shape.lineWidth
							ctx.stroke(path)
						}
					}
				}
				ctx.restore()
			}
		},
	}
}
