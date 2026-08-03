import {
	type CelebrationData,
	getCelebrationTags,
	getOrBuildCelebrationData,
} from '@/components/ResultCelebrations'
import { type RunnerName, runners as runnerSignals } from '@/data/runners'
import type { RunResultItem, Runner } from '@/utils/api'
import { getRunnerKeyFromRouteName } from '@/utils/memberRoute'
import { parseTimeToSeconds } from '@/utils/misc'
import { useParams } from '@solidjs/router'
import { css } from '@style/css'
import { For, Show, createMemo, createSignal } from 'solid-js'
import {
	GRAPH_HEIGHT,
	GRAPH_MARGIN,
	GraphFrame,
	GraphLine,
	GraphPointMarker,
	GraphTooltip,
	buildLinePath,
	createGraphGeometry,
	createGraphWidth,
	graphContainer,
	pickLabelIndexes,
} from './graph'

/** Category of celebration for filtering */
export type GraphMarkerCategory = 'pb' | 'coursePb' | 'other'

/** A celebration marker to display above a data point on the graph. */
export interface GraphMarker {
	/** Index of the data point this marker is attached to */
	index: number
	/** Emoji character to render */
	emoji: string
	/** Short achievement name */
	label: string
	/** Longer description for tooltip */
	description: string
	/** Run time (e.g. "23:45") */
	time?: string
	/** Event name (e.g. "Haga parkrun") */
	eventName?: string
	/** Event ID (e.g. "haga") */
	event?: string
	/** Date string (e.g. "2025-03-15") */
	date?: string
	/** Filter category */
	category: GraphMarkerCategory
}

interface GraphProps {
	results: RunResultItem[]
	runners: Runner[]
	celebrationData?: CelebrationData
}

const HEIGHT = GRAPH_HEIGHT
const MARGIN = GRAPH_MARGIN
const MAX_Y_LABELS = 6
/** Snap distance in pixels for the hover cursor line */
const SNAP_DISTANCE = 1000
/** Width of the x-axis date badges */
const X_BADGE_W = 65

export function GraphSVG(props: GraphProps) {
	let svgRef: SVGSVGElement | undefined
	const { width, ref: containerRef } = createGraphWidth()
	const [mouseX, setMouseX] = createSignal<number | null>(null)
	const [showPbs, setShowPbs] = createSignal(true)
	const [showCoursePbs, setShowCoursePbs] = createSignal(true)
	const [showOther, setShowOther] = createSignal(true)
	const [filterLowest, setFilterLowest] = createSignal(false)

	const params = useParams<{ name: string }>()
	const runnerKey = createMemo(
		() => getRunnerKeyFromRouteName(params.name) ?? '',
	)
	const runnerSignal = createMemo(
		() => runnerSignals[runnerKey() as RunnerName],
	)
	const runnerData = createMemo(() => runnerSignal()?.[0]())
	const runnerId = createMemo(() => runnerData()?.id ?? '')

	const runnerResults = createMemo(() => {
		const sorted = props.results
			.filter((r) => r.parkrunId === runnerId())
			.sort((a, b) => a.date.localeCompare(b.date))

		if (!filterLowest()) return sorted

		// Remove the slowest % of runs (highest times)
		// const PERCENT_TO_FILTER = 0.1
		// const times = sorted.map((r) => parseTimeToSeconds(r.time))
		// const sortedTimes = [...times].sort((a, b) => a - b)
		// const cutoffIndex = Math.ceil(sortedTimes.length * (1 - PERCENT_TO_FILTER))
		// const cutoff = sortedTimes[cutoffIndex - 1] ?? Infinity
		// return sorted.filter((r) => parseTimeToSeconds(r.time) <= cutoff)

		// Remove runs slower than 50 mins
		const cutoff = 50 * 60
		return sorted.filter((r) => parseTimeToSeconds(r.time) <= cutoff)
	})

	const celebrationData = createMemo(
		() =>
			props.celebrationData ??
			getOrBuildCelebrationData(props.results, props.runners),
	)

	const chartData = createMemo(() => {
		const data = runnerResults()
		const w = width()
		if (data.length === 0 || w <= 0) return null

		const times = data.map((r) => parseTimeToSeconds(r.time))
		const dates = data.map((r) => r.date)

		const minTime = Math.min(...times)
		const maxTime = Math.max(...times)

		// Snap Y range to exact minute boundaries
		const minMinute = Math.floor(minTime / 60)
		const maxMinute = Math.ceil(maxTime / 60)
		const totalMinutes = maxMinute - minMinute
		const minuteStep = Math.max(1, Math.ceil(totalMinutes / (MAX_Y_LABELS - 1)))

		// Faster times sit nearer the top, so the y axis runs the other way.
		const geometry = createGraphGeometry({
			width: w,
			count: data.length,
			yMin: (minMinute - minuteStep) * 60,
			yMax: (maxMinute + minuteStep) * 60,
			largerIsHigher: false,
		})
		const { toX, toY, plotW } = geometry

		// Y grid labels
		const yLabels: { y: number; label: string }[] = []
		for (let m = minMinute; m <= maxMinute; m += minuteStep) {
			yLabels.push({ y: toY(m * 60), label: `${m}:00` })
		}

		// X axis labels
		const monthNames = [
			'Jan',
			'Feb',
			'Mar',
			'Apr',
			'May',
			'Jun',
			'Jul',
			'Aug',
			'Sep',
			'Oct',
			'Nov',
			'Dec',
		]
		const xLabels = pickLabelIndexes(data.length, plotW, X_BADGE_W).map((i) => {
			const [y, m] = dates[i].split('-')
			return {
				x: toX(i),
				label: `${monthNames[Number.parseInt(m, 10) - 1]} ${y}`,
			}
		})

		// Dashed vertical lines on multiples of 5 results, never closer than 30px
		const verticalLines: number[] = []
		const basePxPer5 = data.length > 1 ? (5 / (data.length - 1)) * plotW : plotW
		let vStep = 5
		while (basePxPer5 * (vStep / 5) < 30 && vStep < data.length) {
			vStep += 5
		}
		for (let i = vStep - 1; i < data.length; i += vStep) {
			verticalLines.push(toX(i))
		}

		// Data points
		const points = data.map((_, i) => ({ x: toX(i), y: toY(times[i]) }))
		const linePath = buildLinePath(points)

		// Build celebrations from the shared celebration rules
		const celData = celebrationData()
		const pid = runnerId()
		const celebrations: GraphMarker[] = []

		for (let i = 0; i < data.length; i++) {
			const r = data[i]
			const resultKey = `${r.parkrunId}:${r.date}:${r.event}:${r.eventNumber}`
			const runnerDateKey = `${r.parkrunId}:${r.date}`
			const tags = getCelebrationTags({
				data: celData,
				resultKey,
				runnerDateKey,
				parkrunId: pid,
				date: r.date,
			})

			for (const tag of tags) {
				const isPb =
					tag.label === 'New PB!' ||
					tag.label === 'Parkrun debut!' ||
					tag.label === 'New Junior PB!'
				const isCoursePb =
					!isPb && tag.label.startsWith('New ') && tag.label.endsWith(' PB!')
				celebrations.push({
					index: i,
					emoji: tag.emoji,
					label: tag.label,
					description: tag.description,
					time: r.time,
					eventName: r.eventName,
					event: r.event,
					date: r.date,
					category: isPb ? 'pb' : isCoursePb ? 'coursePb' : 'other',
				})
			}
		}

		// Find the current PB (fastest time = lowest seconds, last occurrence)
		let currentPbIndex = -1
		let currentPbTime = Number.POSITIVE_INFINITY
		for (let i = 0; i < times.length; i++) {
			if (times[i] <= currentPbTime) {
				currentPbTime = times[i]
				currentPbIndex = i
			}
		}

		return {
			geometry,
			yLabels,
			xLabels,
			verticalLines,
			points,
			linePath,
			celebrations,
			currentPbIndex,
			width: w,
		}
	})

	const visibleCelebrations = createMemo(() => {
		const d = chartData()
		if (!d) return []
		return d.celebrations.filter((c) => {
			if (c.category === 'pb' && showPbs()) return true
			if (c.category === 'coursePb' && showCoursePbs()) return true
			if (c.category === 'other' && showOther()) return true
			return false
		})
	})

	/** Celebrations with stacking offsets for overlapping markers at the same data point */
	const positionedCelebrations = createMemo(() => {
		const markers = visibleCelebrations()
		const d = chartData()
		if (!d) return []

		const EMOJI_SIZE = 22
		const GAP = 4
		const STEP = EMOJI_SIZE + GAP
		const BASE_OFFSET = 14 // base distance above the point

		// Group by index to determine stacking order
		const countByIndex = new Map<number, number>()
		for (const m of markers) {
			countByIndex.set(m.index, (countByIndex.get(m.index) ?? 0) + 1)
		}
		const seenByIndex = new Map<number, number>()

		return markers.map((marker) => {
			const slot = seenByIndex.get(marker.index) ?? 0
			seenByIndex.set(marker.index, slot + 1)
			const point = d.points[marker.index]

			// Check if there's enough space above the point
			const spaceAbove = point.y - MARGIN.top
			const totalNeeded =
				// biome-ignore lint/style/noNonNullAssertion: value guaranteed by surrounding logic
				BASE_OFFSET + (countByIndex.get(marker.index)! - 1) * STEP + EMOJI_SIZE

			if (spaceAbove >= totalNeeded) {
				// Stack upward above the point
				return { marker, y: point.y - BASE_OFFSET - slot * STEP }
			}
			// Not enough space above — stack downward below the point
			return { marker, y: point.y + BASE_OFFSET + EMOJI_SIZE + slot * STEP }
		})
	})

	/** Index of the data point the cursor is snapped to (within SNAP_DISTANCE px) */
	const snappedIndex = createMemo(() => {
		const mx = mouseX()
		const d = chartData()
		if (mx == null || !d) return null
		let closest: number | null = null
		let closestDist = Number.POSITIVE_INFINITY
		for (let i = 0; i < d.points.length; i++) {
			const dist = Math.abs(d.points[i].x - mx)
			if (dist <= SNAP_DISTANCE && dist < closestDist) {
				closest = i
				closestDist = dist
			}
		}
		return closest
	})

	/** X position of the cursor line (snapped or free) */
	const cursorLineX = createMemo(() => {
		const d = chartData()
		const mx = mouseX()
		if (!d || mx == null) return null
		const idx = snappedIndex()
		if (idx != null) return d.points[idx].x
		if (mx >= MARGIN.left && mx <= d.width - MARGIN.right) return mx
		return null
	})

	/** The result data for the snapped data point */
	const snappedResult = createMemo(() => {
		const idx = snappedIndex()
		if (idx == null) return null
		return runnerResults()[idx]
	})

	/** Visible celebrations at the snapped data point */
	const snappedCelebrations = createMemo(() => {
		const idx = snappedIndex()
		if (idx == null) return []
		return visibleCelebrations().filter((c) => c.index === idx)
	})

	const resultsPer100px = createMemo(() => {
		const d = chartData()
		if (!d) return 0
		return (
			(runnerResults().length / (d.width - MARGIN.left - MARGIN.right)) * 100
		)
	})

	const lineSizeProps = createMemo(() => {
		const rpp = resultsPer100px()
		const base = {
			lineWidth: 3,
			pointSize: 8,
			outerLineColor: 'var(--dirt-darker-brown)',
			innerLineColor: 'var(--dirt-dark-brown)',
			outerPointColor: 'var(--dirt-darker-brown)',
			innerPointColor: 'var(--dirt-dark-brown)',
		}
		if (rpp < 10)
			return {
				...base,
				lineWidth: 3,
				pointSize: 8,
			}
		if (rpp < 20)
			return {
				...base,
				lineWidth: 2,
				pointSize: 6,
			}
		if (rpp < 30)
			return {
				...base,
				lineWidth: 1,
				pointSize: 4,
			}

		return {
			...base,
			lineWidth: 1,
			pointSize: 1,
			outerLineColor: 'transparent',
			innerLineColor: 'var(--dirt-darker-brown)',
		}
	})

	const lineWidth = createMemo(() => lineSizeProps().lineWidth)
	const pointSize = createMemo(() => lineSizeProps().pointSize)

	return (
		<div ref={containerRef} class={graphContainer}>
			<Show when={chartData()}>
				{(data) => (
					<GraphFrame
						ref={(element) => {
							svgRef = element
						}}
						geometry={data().geometry}
						ariaLabel="Run time graph"
						yLabels={data().yLabels}
						xLabels={data().xLabels}
						xLabelWidth={X_BADGE_W}
						verticalLines={data().verticalLines}
						cursorX={cursorLineX()}
						onPointerXChange={setMouseX}
					>
						<GraphLine
							path={data().linePath}
							color={lineSizeProps().innerLineColor}
							outlineColor={lineSizeProps().outerLineColor}
							width={lineWidth()}
						/>

						{/* Data point squares */}
						<For each={data().points}>
							{(p, i) => {
								const isPb = () => i() === data().currentPbIndex
								return (
									<GraphPointMarker
										x={p.x}
										y={p.y}
										size={pointSize()}
										fill={
											isPb()
												? 'var(--gold-pure)'
												: lineSizeProps().innerPointColor
										}
										stroke={
											isPb()
												? 'var(--dirt-darker-brown)'
												: lineSizeProps().outerPointColor
										}
										strokeWidth={isPb() ? 2 : 1}
									/>
								)
							}}
						</For>

						{/* Celebration markers */}
						<For each={positionedCelebrations()}>
							{(positioned) => {
								const p = () => data().points[positioned.marker.index]
								return (
									<text
										x={p().x}
										y={positioned.y}
										font-size="20"
										text-anchor="middle"
										dominant-baseline="auto"
										style={{ cursor: 'default' }}
									>
										{positioned.marker.emoji}
									</text>
								)
							}}
						</For>
					</GraphFrame>
				)}
			</Show>
			<Show when={snappedResult()}>
				{(result) => {
					const r = () => result()
					const dateStr = () => {
						const [y, mo, d] = r().date.split('-')
						return `${d}/${mo}/${y}`
					}
					const celebrations = () => snappedCelebrations()
					return (
						<GraphTooltip
							svg={svgRef}
							x={cursorLineX() ?? 0}
							anchorY={MARGIN.top}
						>
							<div class={styles.tooltipTitle}>
								{r().time} - {r().eventName} #{r().eventNumber}
							</div>
							<div class={styles.tooltipDate}>{dateStr()}</div>
							<Show when={celebrations().length > 0}>
								<div class={styles.tooltipDivider} />
								<div class={styles.tooltipCelebrations}>
									<For each={celebrations()}>
										{(c) => (
											<div class={styles.tooltipCelebration}>
												<div class={styles.tooltipCelebrationTitle}>
													{c.emoji} {c.label}
												</div>
												<div>{c.description}</div>
											</div>
										)}
									</For>
								</div>
							</Show>
						</GraphTooltip>
					)
				}}
			</Show>
			<div class={styles.toggles}>
				<label class={styles.toggleLabel}>
					<input
						type="checkbox"
						class={styles.checkbox}
						checked={showPbs()}
						onChange={(e) => setShowPbs(e.currentTarget.checked)}
					/>
					🏅 Show PBs
				</label>
				<label class={styles.toggleLabel}>
					<input
						type="checkbox"
						class={styles.checkbox}
						checked={showCoursePbs()}
						onChange={(e) => setShowCoursePbs(e.currentTarget.checked)}
					/>
					⭐ Show Course PBs
				</label>
				<label class={styles.toggleLabel}>
					<input
						type="checkbox"
						class={styles.checkbox}
						checked={showOther()}
						onChange={(e) => setShowOther(e.currentTarget.checked)}
					/>
					🎊 Show Other Celebrations
				</label>
			</div>
			<div class={styles.toggles}>
				<label class={styles.toggleLabel}>
					<input
						type="checkbox"
						class={styles.checkbox}
						checked={filterLowest()}
						onChange={(e) => setFilterLowest(e.currentTarget.checked)}
					/>
					🚶 Filter out walks
				</label>
			</div>
		</div>
	)
}

const styles = {
	tooltipTitle: css({
		fontWeight: 'bold',
		fontSize: '0.8rem',
		mb: '0.1rem',
	}),
	tooltipDate: css({
		fontSize: '0.7rem',
		opacity: 0.85,
	}),
	tooltipDivider: css({
		borderTop: '1px solid var(--overlay-white-20)',
		mt: '0.25rem',
		mb: '0.25rem',
	}),
	tooltipCelebrations: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '0.35rem',
		fontSize: '0.7rem',
	}),
	tooltipCelebration: css({
		lineHeight: '1.3',
	}),
	tooltipCelebrationTitle: css({
		fontWeight: 'bold',
	}),
	toggles: css({
		display: 'flex',
		justifyContent: 'flex-end',
		gap: '0.75rem',
		pt: '0.5rem',
		flexWrap: 'wrap',
	}),
	toggleLabel: css({
		display: 'inline-flex',
		alignItems: 'center',
		gap: '0.3rem',
		fontSize: '1.25rem',
		fontWeight: 'bold',
		color: 'var(--dirt-darker-brown)',
		cursor: 'pointer',
		userSelect: 'none',
		fontFamily: '"Jersey 10", sans-serif',
		textTransform: 'uppercase',
	}),
	checkbox: css({
		width: '20px',
		height: '20px',
		cornerShape: 'notch',
		borderRadius: '2px',
		cursor: 'pointer',
		border: '2px solid var(--dirt-darker-brown)',
		appearance: 'none',
		background: 'var(--dirt-brown)',
		color: 'var(--color-white)',
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		fontFamily: '"Jersey 10", sans-serif',
		fontSize: '14px',
		_checked: {
			background: 'var(--dirt-dark-brown)',

			_after: {
				content: '"✔"',
				translate: '0px 0.5px',
			},
		},

		_hover: {
			background: 'var(--dirt-dark-brown)',
		},
	}),
}
