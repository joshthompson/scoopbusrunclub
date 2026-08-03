import { createSignal, onCleanup, onMount } from 'solid-js'

/**
 * Shared geometry and axis maths for the wooden-sign line graphs.
 *
 * Used by the member run-time graph and the largest-clubs graph so both share
 * one coordinate system, one set of margins, and one axis-labelling strategy.
 */

export const GRAPH_HEIGHT = 400

export interface GraphMargin {
	top: number
	right: number
	bottom: number
	left: number
}

export const GRAPH_MARGIN: GraphMargin = {
	left: 60,
	right: 20,
	top: 30,
	bottom: 40,
}

export interface GraphPoint {
	x: number
	y: number
}

export interface GraphGeometry {
	width: number
	height: number
	margin: GraphMargin
	plotW: number
	plotH: number
	/** Rightmost pixel of the plot area. */
	plotRight: number
	/** Bottom pixel of the plot area. */
	plotBottom: number
	/** Number of positions along the x axis. */
	count: number
	yMin: number
	yMax: number
	/** Pixel x for a zero-based position along the x axis. */
	toX: (index: number) => number
	/** Pixel y for a value on the y axis. */
	toY: (value: number) => number
}

export function createGraphGeometry(options: {
	width: number
	count: number
	yMin: number
	yMax: number
	height?: number
	margin?: Partial<GraphMargin>
	/**
	 * Whether larger values sit nearer the top. True for counts; false for run
	 * times, where the fastest (smallest) time belongs at the top.
	 */
	largerIsHigher?: boolean
}): GraphGeometry {
	const height = options.height ?? GRAPH_HEIGHT
	const margin = { ...GRAPH_MARGIN, ...options.margin }
	const plotW = Math.max(0, options.width - margin.left - margin.right)
	const plotH = height - margin.top - margin.bottom
	const span = options.yMax - options.yMin || 1
	const largerIsHigher = options.largerIsHigher ?? true

	return {
		width: options.width,
		height,
		margin,
		plotW,
		plotH,
		plotRight: options.width - margin.right,
		plotBottom: height - margin.bottom,
		count: options.count,
		yMin: options.yMin,
		yMax: options.yMax,
		toX: (index) => margin.left + (index / (options.count - 1 || 1)) * plotW,
		toY: (value) => {
			const fraction = (value - options.yMin) / span
			return margin.top + (largerIsHigher ? 1 - fraction : fraction) * plotH
		},
	}
}

/**
 * Tracks the rendered width of the graph container so the SVG can be sized in
 * real pixels. Attach the returned `ref` to the wrapping element.
 */
export function createGraphWidth(initialWidth = 800) {
	const [width, setWidth] = createSignal(initialWidth)
	let container: HTMLElement | undefined

	onMount(() => {
		if (!container) return
		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) setWidth(entry.contentRect.width)
		})
		observer.observe(container)
		onCleanup(() => observer.disconnect())
	})

	return {
		width,
		ref: (element: HTMLElement) => {
			container = element
		},
	}
}

/**
 * Evenly spaced x-axis positions that keep neighbouring labels from colliding,
 * given how wide a label badge is.
 */
export function pickLabelIndexes(
	count: number,
	plotW: number,
	labelWidth: number,
): number[] {
	const maxLabels = Math.max(1, Math.floor(plotW / (labelWidth * 1.5)))
	const step = Math.max(1, Math.ceil(count / maxLabels))
	const indexes: number[] = []
	for (let i = 0; i < count; i += step) indexes.push(i)
	return indexes
}

/** A rounded axis step that yields at most `maxLabels` labels across `range`. */
export function niceStep(range: number, maxLabels: number): number {
	if (range <= 0) return 1
	const rough = range / Math.max(1, maxLabels - 1)
	const magnitude = 10 ** Math.floor(Math.log10(rough))
	for (const multiple of [1, 2, 2.5, 5]) {
		if (magnitude * multiple >= rough) return magnitude * multiple
	}
	return magnitude * 10
}

/**
 * Nudge labels apart so none overlap, keeping each as close to its ideal
 * position as the `minGap` and the `min`/`max` bounds allow.
 */
export function spreadVertically(
	targets: number[],
	minGap: number,
	min: number,
	max: number,
): number[] {
	const ordered = targets
		.map((y, index) => ({ y, index }))
		.sort((a, b) => a.y - b.y)

	// Push downwards off the top bound.
	let previous = Number.NEGATIVE_INFINITY
	for (const item of ordered) {
		item.y = Math.max(item.y, previous + minGap, min)
		previous = item.y
	}

	// Pull anything shoved past the bottom bound back up.
	let next = Number.POSITIVE_INFINITY
	for (let i = ordered.length - 1; i >= 0; i--) {
		ordered[i].y = Math.min(ordered[i].y, next - minGap, max)
		next = ordered[i].y
	}

	const positions = new Array<number>(targets.length)
	for (const item of ordered) positions[item.index] = item.y
	return positions
}

/**
 * SVG path through a series of points, starting a new sub-path wherever the
 * data has a gap so missing values don't draw a misleading straight line.
 */
export function buildLinePath(points: (GraphPoint | null)[]): string {
	const commands: string[] = []
	let penDown = false

	for (const point of points) {
		if (!point) {
			penDown = false
			continue
		}
		commands.push(`${penDown ? 'L' : 'M'}${point.x},${point.y}`)
		penDown = true
	}

	return commands.join(' ')
}
