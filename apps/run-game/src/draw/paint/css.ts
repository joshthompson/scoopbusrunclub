import { cachedArt } from '../canvasArt'

/**
 * Painting what CSS draws on the page, onto a canvas: its custom
 * properties, its `linear-gradient`s, and its colour `filter`s.
 */

/**
 * The page's colours, as `var(--name)` gives them, with a course's own
 * `palette` over them: a canvas can't look them up itself.
 */
export function paletteOf(palette: Record<string, string> = {}) {
	const root = getComputedStyle(document.documentElement)
	const found = new Map<string, string>()
	/** `value` with each `var(--name)` in it swapped for its colour. */
	const resolve = (value: string): string =>
		value.includes('var(')
			? value.replace(
					/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\))?[^()]*))?\)/g,
					(_, name: string, fallback?: string) => {
						let colour = found.get(name)
						if (colour === undefined) {
							colour = palette[name] ?? root.getPropertyValue(name).trim()
							found.set(name, colour)
						}
						return colour || (fallback ? resolve(fallback.trim()) : '')
					},
				)
			: value
	return resolve
}
export type Resolve = ReturnType<typeof paletteOf>

/** Splits a CSS list on its top-level commas, not those inside brackets. */
function splitTopLevel(list: string) {
	const parts: string[] = []
	let depth = 0
	let from = 0
	for (let i = 0; i < list.length; i++) {
		const c = list[i]
		if (c === '(') depth++
		else if (c === ')') depth--
		else if (c === ',' && depth === 0) {
			parts.push(list.slice(from, i).trim())
			from = i + 1
		}
	}
	parts.push(list.slice(from).trim())
	return parts
}

/** A colour stop: the colour, and where along it is, in px, if it says. */
interface Stop {
	colour: string
	at?: number
}

/**
 * A `linear-gradient(to bottom, …)`, as a canvas's fill for a box `top`
 * down to `top + height`: its stops in px, or %, of the box, as CSS lays
 * them out. Undefined for anything else, which paints nothing.
 */
export function cssGradient(
	ctx: CanvasRenderingContext2D,
	css: string,
	top: number,
	height: number,
	resolve: Resolve,
): CanvasGradient | string | undefined {
	const value = resolve(css).trim()
	const match = /^linear-gradient\((.*)\)$/s.exec(value)
	if (!match) return value === 'none' ? undefined : value
	const parts = splitTopLevel(match[1])
	if (parts[0].startsWith('to ')) {
		if (parts[0] !== 'to bottom') return undefined
		parts.shift()
	}
	const length = (text: string) =>
		text.endsWith('%')
			? (Number.parseFloat(text) / 100) * height
			: Number.parseFloat(text)
	const stops: Stop[] = []
	for (const part of parts) {
		// The colour, then a position or two: brackets kept together.
		const tokens = part.match(/[^\s(]+(?:\([^)]*\))?/g) ?? []
		const colour = tokens[0]
		if (!colour) continue
		const ats = tokens.slice(1).map(length)
		if (!ats.length) stops.push({ colour })
		for (const at of ats) stops.push({ colour, at })
	}
	if (!stops.length) return undefined
	// As CSS fills them in: the ends at either end, those between spread
	// evenly, and none before the one before it.
	stops[0].at ??= 0
	stops[stops.length - 1].at ??= height
	for (let i = 1; i < stops.length; i++) {
		if (stops[i].at !== undefined) continue
		let j = i
		while (stops[j].at === undefined) j++
		const from = stops[i - 1].at ?? 0
		const to = stops[j].at ?? 0
		for (let k = i; k < j; k++)
			stops[k].at = from + ((to - from) * (k - i + 1)) / (j - i + 1)
	}
	let last = Number.NEGATIVE_INFINITY
	for (const stop of stops) {
		stop.at = Math.max(last, stop.at ?? 0)
		last = stop.at
	}
	// Long enough for every stop: past the box, it's cut off anyway.
	const first = Math.min(0, stops[0].at ?? 0)
	const end = Math.max(height, last, first + 1)
	const gradient = ctx.createLinearGradient(0, top + first, 0, top + end)
	for (const stop of stops)
		gradient.addColorStop(
			((stop.at ?? 0) - first) / (end - first),
			stop.colour === 'transparent' ? 'rgba(0, 0, 0, 0)' : stop.colour,
		)
	return gradient
}

/** One function of a CSS `filter`. */
type FilterStep =
	| { matrix: number[] }
	| { shadow: { x: number; y: number; blur: number; colour: string } }

/**
 * The colour matrices of a CSS filter's functions, as the Filter Effects
 * spec gives them (worked on red, green and blue as they are, as CSS's
 * filter functions are), each a row of red, green, blue and an offset
 * for each of red, green and blue, then how much of alpha to keep.
 */
function filterSteps(filter: string): FilterStep[] {
	const steps: FilterStep[] = []
	for (const [, name, raw] of filter.matchAll(
		/([\w-]+)\(([^()]*(?:\([^()]*\))?[^()]*)\)/g,
	)) {
		const amount = raw.trim().endsWith('%')
			? Number.parseFloat(raw) / 100
			: Number.parseFloat(raw)
		const a = Number.isNaN(amount) ? 1 : amount
		switch (name) {
			case 'brightness':
				steps.push({ matrix: [a, 0, 0, 0, 0, a, 0, 0, 0, 0, a, 0, 1] })
				break
			case 'contrast': {
				const offset = (0.5 - 0.5 * a) * 255
				steps.push({
					matrix: [a, 0, 0, offset, 0, a, 0, offset, 0, 0, a, offset, 1],
				})
				break
			}
			case 'invert': {
				const k = 1 - 2 * a
				const offset = a * 255
				steps.push({
					matrix: [k, 0, 0, offset, 0, k, 0, offset, 0, 0, k, offset, 1],
				})
				break
			}
			case 'opacity':
				steps.push({ matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, a] })
				break
			case 'saturate': {
				const s = a
				steps.push({
					matrix: [
						0.213 + 0.787 * s,
						0.715 - 0.715 * s,
						0.072 - 0.072 * s,
						0,
						0.213 - 0.213 * s,
						0.715 + 0.285 * s,
						0.072 - 0.072 * s,
						0,
						0.213 - 0.213 * s,
						0.715 - 0.715 * s,
						0.072 + 0.928 * s,
						0,
						1,
					],
				})
				break
			}
			case 'grayscale': {
				const s = 1 - Math.min(1, a)
				steps.push({
					matrix: [
						0.2126 + 0.7874 * s,
						0.7152 - 0.7152 * s,
						0.0722 - 0.0722 * s,
						0,
						0.2126 - 0.2126 * s,
						0.7152 + 0.2848 * s,
						0.0722 - 0.0722 * s,
						0,
						0.2126 - 0.2126 * s,
						0.7152 - 0.7152 * s,
						0.0722 + 0.9278 * s,
						0,
						1,
					],
				})
				break
			}
			case 'sepia': {
				const s = 1 - Math.min(1, a)
				steps.push({
					matrix: [
						0.393 + 0.607 * s,
						0.769 - 0.769 * s,
						0.189 - 0.189 * s,
						0,
						0.349 - 0.349 * s,
						0.686 + 0.314 * s,
						0.168 - 0.168 * s,
						0,
						0.272 - 0.272 * s,
						0.534 - 0.534 * s,
						0.131 + 0.869 * s,
						0,
						1,
					],
				})
				break
			}
			case 'hue-rotate': {
				const turn = raw.trim().endsWith('turn')
					? Number.parseFloat(raw) * 360
					: Number.parseFloat(raw)
				const cos = Math.cos((turn * Math.PI) / 180)
				const sin = Math.sin((turn * Math.PI) / 180)
				steps.push({
					matrix: [
						0.213 + cos * 0.787 - sin * 0.213,
						0.715 - cos * 0.715 - sin * 0.715,
						0.072 - cos * 0.072 + sin * 0.928,
						0,
						0.213 - cos * 0.213 + sin * 0.143,
						0.715 + cos * 0.285 + sin * 0.14,
						0.072 - cos * 0.072 - sin * 0.283,
						0,
						0.213 - cos * 0.213 - sin * 0.787,
						0.715 - cos * 0.715 + sin * 0.715,
						0.072 + cos * 0.928 + sin * 0.072,
						0,
						1,
					],
				})
				break
			}
			case 'drop-shadow': {
				const tokens = raw.match(/[^\s(]+(?:\([^)]*\))?/g) ?? []
				const lengths = tokens.filter((t) => /^-?[\d.]+(px)?$/.test(t))
				const colour = tokens.find((t) => !/^-?[\d.]+(px)?$/.test(t))
				const [x = 0, y = 0, blur = 0] = lengths.map((t) =>
					Number.parseFloat(t),
				)
				steps.push({
					shadow: { x, y, blur, colour: colour ?? 'black' },
				})
				break
			}
		}
	}
	return steps
}

const clamp = (n: number) => (n < 0 ? 0 : n > 255 ? 255 : n)

/** Recolours a canvas's pixels in place, one filter function after another, each clamped. */
function recolourPixels(ctx: CanvasRenderingContext2D, matrices: number[][]) {
	if (!matrices.length) return
	const { width, height } = ctx.canvas
	let pixels: ImageData
	try {
		pixels = ctx.getImageData(0, 0, width, height)
	} catch {
		// Can't be read: from another site, without CORS. Left as it is.
		return
	}
	const data = pixels.data
	for (let i = 0; i < data.length; i += 4) {
		if (data[i + 3] === 0) continue
		// Worked on unpremultiplied, as getImageData gives them.
		let r = data[i]
		let g = data[i + 1]
		let b = data[i + 2]
		let a = data[i + 3]
		for (const m of matrices) {
			const r2 = clamp(m[0] * r + m[1] * g + m[2] * b + m[3])
			const g2 = clamp(m[4] * r + m[5] * g + m[6] * b + m[7])
			const b2 = clamp(m[8] * r + m[9] * g + m[10] * b + m[11])
			r = r2
			g = g2
			b = b2
			a *= m[12]
		}
		data[i] = r
		data[i + 1] = g
		data[i + 2] = b
		data[i + 3] = a
	}
	ctx.putImageData(pixels, 0, 0)
}

/** An image, as a Draw Hook's `image(url)` gives it. */
export interface Loaded {
	image: CanvasImageSource
	width: number
	height: number
}

/**
 * How far a drop shadow's blur reaches out past what casts it: three of its
 * standard deviations, which its blur is.
 */
const shadowReach = (steps: FilterStep[]) =>
	Math.ceil(
		Math.max(
			0,
			...steps.map((step) =>
				'shadow' in step
					? step.shadow.blur * 3 +
						Math.max(Math.abs(step.shadow.x), Math.abs(step.shadow.y))
					: 0,
			),
		),
	)

/**
 * An image, drawn `scale` times its size, through a CSS `filter`: painted
 * once and kept, as the page shows it, since WebKit's canvas has no
 * `filter`. A drop shadow reaches out past it by `pad`, all round, so it's
 * drawn from `-pad`, `density` of its pixels to each of the page's. An SVG
 * with no filter is painted once too, rather than drawn from its markup
 * every time.
 */
export function filtered(
	url: string,
	loaded: Loaded,
	filter: string | undefined,
	scale = 1,
): {
	art: CanvasImageSource
	pad: number
	width: number
	height: number
	density: number
} {
	const width = loaded.width * scale
	const height = loaded.height * scale
	const svg = url.startsWith('data:image/svg')
	if (!filter && !svg && scale === 1)
		return { art: loaded.image, pad: 0, width, height, density: 1 }
	const steps = filter ? filterSteps(filter) : []
	const pad = shadowReach(steps)
	const art = cachedArt(
		`filtered:${scale}:${filter ?? ''}:${url}`,
		width + pad * 2,
		height + pad * 2,
		(ctx) => {
			ctx.imageSmoothingEnabled = false
			ctx.drawImage(loaded.image, pad, pad, width, height)
			// The colour matrices in turn, and each drop shadow where it comes.
			let matrices: number[][] = []
			for (const step of steps) {
				if ('matrix' in step) {
					matrices.push(step.matrix)
					continue
				}
				recolourPixels(ctx, matrices)
				matrices = []
				// What's painted so far, cast as a shadow under itself: once, so
				// a canvas just for the while is fine.
				const density = ctx.getTransform().a
				const copy = document.createElement('canvas')
				copy.width = ctx.canvas.width
				copy.height = ctx.canvas.height
				copy.getContext('2d')?.drawImage(ctx.canvas, 0, 0)
				ctx.save()
				ctx.setTransform(1, 0, 0, 1, 0, 0)
				ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
				ctx.shadowColor = step.shadow.colour
				// A canvas blurs by half its `shadowBlur`, and `drop-shadow` by its
				// blur, its standard deviation, so it's given twice as much, as
				// ScoopJS does for a Controller's `filter`.
				ctx.shadowBlur = 2 * step.shadow.blur * density
				ctx.shadowOffsetX = step.shadow.x * density
				ctx.shadowOffsetY = step.shadow.y * density
				ctx.drawImage(copy, 0, 0)
				ctx.restore()
				copy.width = 0
			}
			recolourPixels(ctx, matrices)
		},
	)
	return { art, pad, width, height, density: art.width / (width + pad * 2) }
}

/** A colour, made `amount` times as bright, as `filter: brightness()` does. */
export function brighter(colour: string, amount: number) {
	const match = /^#([\da-f]{6})$/i.exec(colour.trim())
	if (!match) return colour
	const n = Number.parseInt(match[1], 16)
	const channel = (shift: number) =>
		Math.round(clamp(((n >> shift) & 255) * amount))
	return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`
}
