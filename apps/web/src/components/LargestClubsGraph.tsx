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

/**
 * How many clubs the graph opens on, before the reader picks their own.
 *
 * Out in front there's only one club worth watching — whoever is closest
 * behind. Chasing, it's everyone ahead of us, which past tenth place is a wall
 * of lines that says nothing about our own race.
 */
const LEAD_CLUBS = 2
const MAX_CLUBS_AHEAD = 10
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

	/** Clubs the reader has picked, or null while the default top few stand. */
	const [picked, setPicked] = createSignal<string[] | null>(null)

	const weeks = createMemo(() =>
		[...new Set(props.snapshots.map((s) => s.week))].sort((a, b) =>
			a.localeCompare(b),
		),
	)

	/** Runs per club per week, and each club's most recent total. */
	const clubIndex = createMemo(() => {
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

		// Every club, biggest first — the order the picker offers them in.
		const ranked = [...latestByClub.entries()]
			.sort((a, b) => b[1].events - a[1].events)
			.map(([name]) => name)

		return { byClub, ranked }
	})

	/**
	 * Who the graph opens on, which depends on where we stand: this page is
	 * about our own race, so the default is whoever we're racing.
	 *
	 * Leading, that's us and the club closest behind. Chasing, it's every club
	 * ahead of us up to the cap, and our own line is always added however far
	 * back it sits. Before we have any snapshot of our own there's no race to
	 * frame, so the top of the league stands in.
	 */
	const defaultClubs = createMemo(() => {
		const { ranked } = clubIndex()
		const place = ranked.indexOf(SCOOP_BUS_CLUB_NAME)
		if (place === -1) return ranked.slice(0, MAX_CLUBS_AHEAD)
		if (place === 0) return ranked.slice(0, LEAD_CLUBS)
		return [
			...ranked.slice(0, Math.min(place, MAX_CLUBS_AHEAD)),
			SCOOP_BUS_CLUB_NAME,
		]
	})

	const chosenClubs = createMemo(() => picked() ?? defaultClubs())

	/**
	 * A colour per plotted club, held apart from the chart so the picker's
	 * swatches match the lines even at widths where nothing is plotted yet.
	 *
	 * A club keeps the colour it was first given for as long as it stays on the
	 * graph, so removing one club doesn't recolour every line below it.
	 */
	const clubColors = createMemo<Map<string, string>>((previous) => {
		const colors = new Map<string, string>()
		const used = new Set<string>()
		let wrapIndex = 0

		const keep = (name: string, color: string) => {
			colors.set(name, color)
			used.add(color)
		}

		for (const name of chosenClubs()) {
			if (name === SCOOP_BUS_CLUB_NAME) {
				keep(name, SCOOP_BUS_COLOR)
				continue
			}
			const held = previous.get(name)
			if (held && !used.has(held)) keep(name, held)
		}

		for (const name of chosenClubs()) {
			if (colors.has(name)) continue
			// Past the palette's length colours have to repeat, so pick round-robin.
			const free = OTHER_COLORS.find((color) => !used.has(color))
			keep(name, free ?? OTHER_COLORS[wrapIndex++ % OTHER_COLORS.length])
		}

		return colors
	}, new Map())

	const addClub = (name: string) => setPicked([...chosenClubs(), name])
	const removeClub = (name: string) =>
		setPicked(chosenClubs().filter((club) => club !== name))

	const chartData = createMemo(() => {
		const allWeeks = weeks()
		const w = width()
		if (allWeeks.length < 2 || w <= 0) return null

		const { byClub } = clubIndex()
		const chosen = chosenClubs()

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

		const colors = clubColors()
		const series: ClubSeries[] = chosen.map((name) => {
			const isScoopBus = name === SCOOP_BUS_CLUB_NAME
			const color = colors.get(name) ?? SERIES_COLORS[0]

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
						{chosenClubs().length === 0
							? 'No clubs on the graph — add one below.'
							: weeks().length === 1
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

			{/*
			 * The plotted clubs, each removable, plus every other club to add. It
			 * doubles as the legend: on narrow screens there's no room for names
			 * beside the lines, so these swatches are the only key to the colours.
			 */}
			<Show when={clubIndex().ranked.length > 0}>
				<div class={styles.picker}>
					<For each={chosenClubs()}>
						{(name) => (
							<button
								type="button"
								class={styles.chip}
								onClick={() => removeClub(name)}
								title={`Remove ${name} from the graph`}
							>
								<span
									class={styles.swatch}
									style={{ background: clubColors().get(name) }}
								/>
								<span
									style={{
										'font-weight':
											name === SCOOP_BUS_CLUB_NAME ? 'bold' : 'normal',
									}}
								>
									{name}
								</span>
								<span class={styles.chipRemove} aria-hidden="true">
									×
								</span>
							</button>
						)}
					</For>

					<select
						class={styles.add}
						aria-label="Add a club to the graph"
						// Bound back to the placeholder so the same club can be added,
						// removed, then added again.
						value=""
						onChange={(event) => {
							const name = event.currentTarget.value
							event.currentTarget.value = ''
							if (name) addClub(name)
						}}
					>
						<option value="">+ Add a club…</option>
						<For
							each={clubIndex().ranked.filter(
								(name) => !chosenClubs().includes(name),
							)}
						>
							{(name) => <option value={name}>{name}</option>}
						</For>
					</select>

					<Show when={picked() !== null}>
						<button
							type="button"
							class={styles.reset}
							onClick={() => setPicked(null)}
						>
							Reset
						</button>
					</Show>
				</div>
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
	picker: css({
		margin: '0.75rem 0 0',
		display: 'flex',
		flexWrap: 'wrap',
		gap: '0.35rem',
		justifyContent: 'center',
		fontSize: '0.8rem',
	}),
	chip: css({
		display: 'flex',
		alignItems: 'center',
		gap: '0.35rem',
		padding: '0.15rem 0.4rem',
		border: '1px solid var(--overlay-white-30)',
		background: 'transparent',
		color: 'inherit',
		font: 'inherit',
		cursor: 'pointer',
		cornerShape: 'notch',
		borderRadius: '4px',
		_hover: {
			background: 'var(--overlay-white-10)',
		},
	}),
	/** Only shows the chip is removable — the whole chip is the button. */
	chipRemove: css({
		opacity: 0.6,
		lineHeight: 1,
	}),
	add: css({
		padding: '0.15rem 0.4rem',
		border: '1px dashed var(--overlay-white-30)',
		background: 'transparent',
		color: 'inherit',
		font: 'inherit',
		cursor: 'pointer',
		cornerShape: 'notch',
		borderRadius: '4px',
	}),
	reset: css({
		padding: '0.15rem 0.4rem',
		border: 'none',
		background: 'transparent',
		color: 'inherit',
		font: 'inherit',
		opacity: 0.7,
		textDecoration: 'underline',
		cursor: 'pointer',
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
