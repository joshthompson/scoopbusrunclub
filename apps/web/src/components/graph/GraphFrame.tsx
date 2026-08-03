import { css } from '@style/css'
import { For, type JSX, Show, onCleanup, onMount } from 'solid-js'
import { SignBadge } from './SignBadge'
import { graphPlot } from './container'
import type { GraphGeometry } from './geometry'

/**
 * The chrome shared by every graph: grid lines, signpost axis labels, axes, the
 * hover cursor line, and mouse/touch tracking. Plot content (lines, points,
 * markers) is passed as children and drawn on top of the cursor line.
 */
export function GraphFrame(props: {
	geometry: GraphGeometry
	ariaLabel: string
	yLabels: { y: number; label: string }[]
	xLabels: { x: number; label: string }[]
	yLabelWidth?: number
	xLabelWidth?: number
	/** Dashed vertical guides, as pixel x positions. */
	verticalLines?: number[]
	/** Pixel x of the hover cursor line; null hides it. */
	cursorX?: number | null
	/** SVG-relative x as the pointer moves, or null when it leaves. */
	onPointerXChange?: (x: number | null) => void
	ref?: (element: SVGSVGElement) => void
	children?: JSX.Element
}) {
	let svgRef!: SVGSVGElement

	/** Whether a touch interaction started on the graph. */
	let isTouching = false

	const report = (x: number | null) => props.onPointerXChange?.(x)

	/** Convert a clientX to SVG-local X */
	const clientXToLocal = (clientX: number) =>
		clientX - svgRef.getBoundingClientRect().left

	const handleTouchStart = (e: TouchEvent) => {
		e.preventDefault()
		isTouching = true
		const touch = e.touches[0]
		if (touch) report(clientXToLocal(touch.clientX))
	}

	const handleTouchMove = (e: TouchEvent) => {
		if (!isTouching) return
		e.preventDefault()
		const touch = e.touches[0]
		if (touch) report(clientXToLocal(touch.clientX))
	}

	const handleTouchEnd = () => {
		if (!isTouching) return
		isTouching = false
		report(null)
	}

	onMount(() => {
		// Attach touchmove/touchend on document so dragging outside the graph still works
		document.addEventListener('touchmove', handleTouchMove, { passive: false })
		document.addEventListener('touchend', handleTouchEnd)
		document.addEventListener('touchcancel', handleTouchEnd)

		onCleanup(() => {
			document.removeEventListener('touchmove', handleTouchMove)
			document.removeEventListener('touchend', handleTouchEnd)
			document.removeEventListener('touchcancel', handleTouchEnd)
		})
	})

	const g = () => props.geometry

	return (
		<div class={graphPlot} style={{ height: `${g().height}px` }}>
			<svg
				ref={(element) => {
					svgRef = element
					props.ref?.(element)
				}}
				width={g().width}
				height={g().height}
				class={styles.graph}
				role="img"
				aria-label={props.ariaLabel}
				onMouseMove={(e) => report(clientXToLocal(e.clientX))}
				onMouseLeave={() => report(null)}
				onTouchStart={handleTouchStart}
			>
				{/* Horizontal grid lines */}
				<For each={props.yLabels}>
					{(label) => (
						<line
							x1={g().margin.left}
							y1={label.y}
							x2={g().plotRight}
							y2={label.y}
							stroke="rgba(0,0,0,0.1)"
							stroke-width="1"
						/>
					)}
				</For>

				{/* Y axis labels */}
				<For each={props.yLabels}>
					{(label) => (
						<SignBadge
							x={g().margin.left - 28}
							y={label.y}
							label={label.label}
							badgeW={props.yLabelWidth}
						/>
					)}
				</For>

				{/* X axis labels */}
				<For each={props.xLabels}>
					{(label) => (
						<SignBadge
							x={label.x}
							y={g().plotBottom + 17}
							label={label.label}
							badgeW={props.xLabelWidth ?? 65}
						/>
					)}
				</For>

				{/* Dashed vertical guides */}
				<For each={props.verticalLines ?? []}>
					{(x) => (
						<line
							x1={x}
							y1={g().margin.top}
							x2={x}
							y2={g().plotBottom}
							stroke="#AD855A"
							stroke-width="1"
							stroke-dasharray="4 4"
						/>
					)}
				</For>

				{/* Y axis */}
				<line
					x1={g().margin.left}
					y1={g().margin.top}
					x2={g().margin.left}
					y2={g().plotBottom}
					stroke="#5c3d1a"
					stroke-width="2"
				/>
				{/* X axis */}
				<line
					x1={g().margin.left}
					y1={g().plotBottom}
					x2={g().plotRight}
					y2={g().plotBottom}
					stroke="#5c3d1a"
					stroke-width="2"
				/>

				{/* Hover cursor line (behind the plot content) */}
				<Show when={props.cursorX}>
					{(cx) => (
						<line
							x1={cx()}
							y1={g().margin.top}
							x2={cx()}
							y2={g().plotBottom}
							stroke="#000"
							stroke-width="2"
						/>
					)}
				</Show>

				{props.children}
			</svg>
		</div>
	)
}

const styles = {
	graph: css({
		'& text': {
			fontFamily: '"Jersey 10", sans-serif',
			textTransform: 'uppercase',
			fontSize: '1rem',
		},
	}),
}
