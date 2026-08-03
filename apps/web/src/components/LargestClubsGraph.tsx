import type { LargestClubSnapshot } from '@/utils/api'
import { SCOOP_BUS_CLUB_NAME } from '@/utils/largestClubs'
import { css } from '@style/css'
import { For, Show, createMemo, createSignal } from 'solid-js'
import {
	GRAPH_MARGIN,
	GraphFrame,
	GraphLine,
	type GraphPoint,
	GraphPointMarker,
	GraphTooltip,
	SERIES_COLORS,
	buildLinePath,
	createGraphGeometry,
	createGraphWidth,
	graphContainer,
	niceStep,
	pickLabelIndexes,
	spreadVertically,
} from './graph'

/** How many clubs to plot. */
const MAX_CLUBS = 5
const MAX_Y_LABELS = 6
/** Room on the right for the club-name labels. */
const LABEL_GUTTER = 158
/** Width of the x-axis date badges. */
const X_BADGE_W = 65
/** Smallest vertical gap between two club-name labels, outline included. */
const LABEL_MIN_GAP = 17
const LABEL_FONT_SIZE = '13'
/** Black outline drawn behind the coloured label text, so it reads on any line. */
const LABEL_OUTLINE_WIDTH = '3'
const MAX_LABEL_CHARS = 18
/**
 * Below this width the name gutter would leave almost no room to plot, so the
 * names move into a legend underneath instead.
 */
const SIDE_LABEL_MIN_WIDTH = 620

/** Our own line always gets this colour so it's recognisable at a glance. */
const SCOOP_BUS_COLOR = 'var(--pink-rose)'
const OTHER_COLORS = SERIES_COLORS.filter((c) => c !== SCOOP_BUS_COLOR)

interface ClubSeries {
	name: string
	label: string
	color: string
	isScoopBus: boolean
	/** One entry per week, null where that club has no snapshot. */
	points: (GraphPoint | null)[]
	values: (number | null)[]
	path: string
	/** The last point with data, where the name label is anchored. */
	lastPoint: GraphPoint | null
}

function truncate(name: string): string {
	if (name.length <= MAX_LABEL_CHARS) return name
	return `${name.slice(0, MAX_LABEL_CHARS - 1).trimEnd()}…`
}

/** "2026-08-01" → "01/08/26" */
function formatWeek(week: string): string {
	const [year, month, day] = week.split('-')
	return `${day}/${month}/${year.slice(2)}`
}

/**
 * Total runs per week for the biggest clubs in Sweden, in the same wooden-sign
 * style as the member graph. Club names sit to the right of each line.
 */
export function LargestClubsGraph(props: { snapshots: LargestClubSnapshot[] }) {
	let svgRef: SVGSVGElement | undefined
	const { width, ref: containerRef } = createGraphWidth()
	const [mouseX, setMouseX] = createSignal<number | null>(null)

	const weeks = createMemo(() =>
		[...new Set(props.snapshots.map((s) => s.week))].sort((a, b) =>
			a.localeCompare(b),
		),
	)

	const chartData = createMemo(() => {
		const allWeeks = weeks()
		const w = width()
		if (allWeeks.length < 2 || w <= 0) return null

		// Runs per club per week, and each club's most recent total.
		const byClub = new Map<string, Map<string, number>>()
		const latestByClub = new Map<string, { week: string; events: number }>()
		for (const snapshot of props.snapshots) {
			const weekMap = byClub.get(snapshot.name) ?? new Map<string, number>()
			weekMap.set(snapshot.week, snapshot.events)
			byClub.set(snapshot.name, weekMap)

			const latest = latestByClub.get(snapshot.name)
			if (!latest || snapshot.week > latest.week) {
				latestByClub.set(snapshot.name, {
					week: snapshot.week,
					events: snapshot.events,
				})
			}
		}

		// Rank by most recent total, then keep the top few. If we've dropped out
		// of that group, swap us in — this page is about our own progress.
		const ranked = [...latestByClub.entries()]
			.sort((a, b) => b[1].events - a[1].events)
			.map(([name]) => name)

		const chosen = ranked.slice(0, MAX_CLUBS)
		if (
			ranked.includes(SCOOP_BUS_CLUB_NAME) &&
			!chosen.includes(SCOOP_BUS_CLUB_NAME)
		) {
			chosen[chosen.length - 1] = SCOOP_BUS_CLUB_NAME
		}

		// Y range across the plotted clubs only.
		let minEvents = Number.POSITIVE_INFINITY
		let maxEvents = Number.NEGATIVE_INFINITY
		for (const name of chosen) {
			for (const week of allWeeks) {
				const events = byClub.get(name)?.get(week)
				if (events === undefined) continue
				minEvents = Math.min(minEvents, events)
				maxEvents = Math.max(maxEvents, events)
			}
		}
		if (!Number.isFinite(minEvents)) return null

		// Snap the axis to whole steps, leaving a little headroom above the
		// leader so its name label isn't jammed against the top edge.
		const step = niceStep(maxEvents - minEvents, MAX_Y_LABELS)
		const yMin = Math.floor(minEvents / step) * step
		let yMax = Math.ceil(maxEvents / step) * step
		if (yMax - maxEvents < step * 0.2) yMax += step

		const showSideLabels = w >= SIDE_LABEL_MIN_WIDTH

		const geometry = createGraphGeometry({
			width: w,
			count: allWeeks.length,
			yMin,
			yMax,
			margin: showSideLabels
				? { ...GRAPH_MARGIN, right: LABEL_GUTTER }
				: GRAPH_MARGIN,
		})
		const { toX, toY, plotW } = geometry

		const yLabels: { y: number; label: string }[] = []
		for (let value = yMin; value <= yMax; value += step) {
			yLabels.push({ y: toY(value), label: value.toLocaleString() })
		}

		const labelIndexes = pickLabelIndexes(allWeeks.length, plotW, X_BADGE_W)
		const xLabels = labelIndexes.map((i) => ({
			x: toX(i),
			label: formatWeek(allWeeks[i]),
		}))
		const verticalLines = labelIndexes.filter((i) => i > 0).map((i) => toX(i))

		let colorIndex = 0
		const series: ClubSeries[] = chosen.map((name) => {
			const isScoopBus = name === SCOOP_BUS_CLUB_NAME
			const color = isScoopBus
				? SCOOP_BUS_COLOR
				: OTHER_COLORS[colorIndex++ % OTHER_COLORS.length]

			const values = allWeeks.map((week) => byClub.get(name)?.get(week) ?? null)
			const points = values.map((value, i) =>
				value === null ? null : { x: toX(i), y: toY(value) },
			)

			let lastPoint: GraphPoint | null = null
			for (const point of points) if (point) lastPoint = point

			return {
				name,
				label: truncate(name),
				color,
				isScoopBus,
				values,
				points,
				path: buildLinePath(points),
				lastPoint,
			}
		})

		// Nudge the name labels apart so none overlap.
		const labelled = showSideLabels ? series.filter((s) => s.lastPoint) : []
		const labelYs = spreadVertically(
			labelled.map((s) => s.lastPoint?.y ?? 0),
			LABEL_MIN_GAP,
			geometry.margin.top,
			geometry.plotBottom,
		)
		const nameLabels = labelled.map((s, i) => ({
			series: s,
			y: labelYs[i],
			/** Where the line ends, so the label can be tied back to it. */
			from: s.lastPoint as GraphPoint,
		}))

		// Points get cramped once there are a lot of weeks.
		const weeksPer100px = (allWeeks.length / Math.max(1, plotW)) * 100
		const pointSize = weeksPer100px < 8 ? 7 : weeksPer100px < 16 ? 5 : 0
		const lineWidth = weeksPer100px < 16 ? 3 : 2

		return {
			geometry,
			weeks: allWeeks,
			series,
			nameLabels,
			showSideLabels,
			yLabels,
			xLabels,
			verticalLines,
			pointSize,
			lineWidth,
		}
	})

	/** Week index the cursor is nearest to. */
	const snappedIndex = createMemo(() => {
		const mx = mouseX()
		const data = chartData()
		if (mx == null || !data) return null

		let closest: number | null = null
		let closestDist = Number.POSITIVE_INFINITY
		for (let i = 0; i < data.weeks.length; i++) {
			const dist = Math.abs(data.geometry.toX(i) - mx)
			if (dist < closestDist) {
				closest = i
				closestDist = dist
			}
		}
		return closest
	})

	const cursorX = createMemo(() => {
		const data = chartData()
		const index = snappedIndex()
		if (!data || index == null) return null
		return data.geometry.toX(index)
	})

	/** Each plotted club's total at the snapped week, biggest first. */
	const snappedTotals = createMemo(() => {
		const data = chartData()
		const index = snappedIndex()
		if (!data || index == null) return null

		const rows = data.series
			.map((s) => ({
				name: s.name,
				color: s.color,
				isScoopBus: s.isScoopBus,
				events: s.values[index],
			}))
			.filter(
				(row): row is typeof row & { events: number } => row.events !== null,
			)
			.sort((a, b) => b.events - a.events)

		return { week: data.weeks[index], rows }
	})

	return (
		<div ref={containerRef} class={graphContainer}>
			<Show
				when={chartData()}
				fallback={
					<p class={styles.empty}>
						{weeks().length === 1
							? 'Only one week of data so far — the graph appears once there are two snapshots to compare.'
							: 'No snapshots have been taken yet.'}
					</p>
				}
			>
				{(data) => (
					<GraphFrame
						ref={(element) => {
							svgRef = element
						}}
						geometry={data().geometry}
						ariaLabel="Total runs per week for the largest parkrun clubs in Sweden"
						yLabels={data().yLabels}
						xLabels={data().xLabels}
						yLabelWidth={48}
						xLabelWidth={X_BADGE_W}
						verticalLines={data().verticalLines}
						cursorX={cursorX()}
						onPointerXChange={setMouseX}
					>
						<For each={data().series}>
							{(series) => (
								<GraphLine
									path={series.path}
									color={series.color}
									width={data().lineWidth + (series.isScoopBus ? 1 : 0)}
								/>
							)}
						</For>

						<Show when={data().pointSize > 0}>
							<For each={data().series}>
								{(series) => (
									<For each={series.points}>
										{(point) => (
											<Show when={point}>
												{(p) => (
													<GraphPointMarker
														x={p().x}
														y={p().y}
														size={data().pointSize}
														fill={series.color}
														stroke="var(--dirt-darker-brown)"
													/>
												)}
											</Show>
										)}
									</For>
								)}
							</For>
						</Show>

						{/* Club names to the right of each line */}
						<For each={data().nameLabels}>
							{(label) => (
								<>
									<line
										x1={label.from.x}
										y1={label.from.y}
										x2={data().geometry.plotRight + 4}
										y2={label.y}
										stroke={label.series.color}
										stroke-width="1"
										stroke-dasharray="2 2"
									/>
									<text
										x={data().geometry.plotRight + 7}
										y={label.y}
										fill={label.series.color}
										stroke="var(--color-black)"
										stroke-width={LABEL_OUTLINE_WIDTH}
										stroke-linejoin="round"
										paint-order="stroke"
										font-size={LABEL_FONT_SIZE}
										dominant-baseline="central"
										style={{
											'font-weight': label.series.isScoopBus
												? 'bold'
												: 'normal',
										}}
									>
										{label.series.label}
									</text>
								</>
							)}
						</For>
					</GraphFrame>
				)}
			</Show>

			{/* Too narrow for names beside the lines — list them underneath */}
			<Show when={chartData() && !chartData()?.showSideLabels}>
				<ul class={styles.legend}>
					<For each={chartData()?.series ?? []}>
						{(series) => (
							<li class={styles.legendItem}>
								<span
									class={styles.swatch}
									style={{ background: series.color }}
								/>
								<span
									style={{
										'font-weight': series.isScoopBus ? 'bold' : 'normal',
									}}
								>
									{series.name}
								</span>
							</li>
						)}
					</For>
				</ul>
			</Show>

			<Show when={snappedTotals()}>
				{(totals) => (
					<GraphTooltip
						svg={svgRef}
						x={cursorX() ?? 0}
						anchorY={GRAPH_MARGIN.top}
						width={220}
					>
						<div class={styles.tooltipTitle}>{formatWeek(totals().week)}</div>
						<For each={totals().rows}>
							{(row) => (
								<div class={styles.tooltipRow}>
									<span
										class={styles.swatch}
										style={{ background: row.color }}
									/>
									<span class={styles.tooltipName}>{row.name}</span>
									<span class={styles.tooltipValue}>
										{row.events.toLocaleString()}
									</span>
								</div>
							)}
						</For>
					</GraphTooltip>
				)}
			</Show>
		</div>
	)
}

const styles = {
	empty: css({
		textAlign: 'center',
		padding: '2rem 1rem',
	}),
	legend: css({
		listStyle: 'none',
		padding: 0,
		margin: '0.75rem 0 0',
		display: 'flex',
		flexWrap: 'wrap',
		gap: '0.25rem 0.75rem',
		justifyContent: 'center',
		fontSize: '0.8rem',
	}),
	legendItem: css({
		display: 'flex',
		alignItems: 'center',
		gap: '0.3rem',
	}),
	tooltipTitle: css({
		fontWeight: 'bold',
		fontSize: '0.8rem',
		mb: '0.25rem',
	}),
	tooltipRow: css({
		display: 'flex',
		alignItems: 'center',
		gap: '0.35rem',
		textAlign: 'left',
	}),
	swatch: css({
		width: '8px',
		height: '8px',
		flexShrink: 0,
	}),
	tooltipName: css({
		flex: 1,
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
	}),
	tooltipValue: css({
		fontWeight: 'bold',
	}),
}
