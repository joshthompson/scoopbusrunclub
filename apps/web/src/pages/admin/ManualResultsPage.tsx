import { AdminButton } from '@/components/admin/AdminButton'
import { Checkbox } from '@/components/ui/Checkbox'
import { DirtBlock } from '@/components/ui/DirtBlock'
import { fetchAllResults, fetchCourseEventIds, fetchEvents } from '@/utils/api'
import {
	LARGEST_CLUBS_URL,
	type ManualSummary,
	type ParsedAthleteFile,
	type ParsedClubsFile,
	type ParsedCourseFile,
	type ParsedEventFile,
	RESULTS_WINDOW_DAYS,
	type UploadReport,
	athletePageUrl,
	buildManualSummary,
	coursePageUrl,
	latestResultsUrl,
	parseAthleteFile,
	parseClubsFile,
	parseCourseFile,
	parseEventFile,
	resultKey,
	uploadManualResults,
} from '@/utils/manualResults'
import { PARKRUN_EVENTS } from '@shared/parkrun-events'
import { TRACKED_ATHLETES } from '@shared/tracked-athletes'
import { css, cva } from '@style/css'
import {
	type Component,
	For,
	Show,
	createMemo,
	createResource,
	createSignal,
} from 'solid-js'

/**
 * Manual Results — the fallback path for ingesting parkrun data when the
 * scrapers are blocked or nobody can run them.
 *
 * The pages are downloaded by hand, parsed in the browser by the very same
 * parsers the scripts use, shown as a summary for review, and only then sent to
 * the backend. See apps/web/src/utils/manualResults.ts for the processing.
 */

// ── Per-field state ─────────────────────────────────────────────────

interface Slot<T> {
	fileName: string
	skip: boolean
	parsing: boolean
	parsed: T | null
	error: string | null
}

function emptySlot<T>(): Slot<T> {
	return {
		fileName: '',
		skip: false,
		parsing: false,
		parsed: null,
		error: null,
	}
}

/**
 * Keep the end of a filename, which is the part that differs — parkrun's saved
 * pages all start with the same long "view-source_https___www.parkrun…" prefix.
 */
function truncateStart(name: string, max = 34): string {
	return name.length <= max ? name : `…${name.slice(-(max - 1))}`
}

/** A slot is settled once it has either been skipped or parsed cleanly. */
function isReady<T>(slot: Slot<T> | undefined): boolean {
	if (!slot) return false
	return slot.skip || (!!slot.parsed && !slot.parsing)
}

type SlotMap<T> = Record<string, Slot<T>>

export const ManualResultsPage: Component = () => {
	// Existing data, so the summary can say what's new and which courses we lack.
	const [existingResults] = createResource(fetchAllResults)
	const [existingEvents] = createResource(fetchEvents)
	const [existingCourseIds] = createResource(fetchCourseEventIds)

	const [athleteSlots, setAthleteSlots] = createSignal<
		SlotMap<ParsedAthleteFile>
	>({})
	const [eventSlots, setEventSlots] = createSignal<SlotMap<ParsedEventFile>>({})
	const [courseSlots, setCourseSlots] = createSignal<SlotMap<ParsedCourseFile>>(
		{},
	)
	const [clubsSlot, setClubsSlot] = createSignal<Slot<ParsedClubsFile>>(
		emptySlot(),
	)

	const [ingestAll, setIngestAll] = createSignal(false)
	const [summary, setSummary] = createSignal<ManualSummary | null>(null)
	const [report, setReport] = createSignal<UploadReport | null>(null)
	const [progress, setProgress] = createSignal<string | null>(null)

	const loading = () =>
		existingResults.loading ||
		existingEvents.loading ||
		existingCourseIds.loading

	// --- Existing data lookups ---

	const existing = createMemo(() => ({
		resultKeys: new Set(
			(existingResults() ?? []).map((r) =>
				resultKey(r.parkrunId, r.event, r.eventNumber),
			),
		),
		eventIds: new Set((existingEvents() ?? []).map((e) => e.eventId)),
		eventNames: new Map(
			(existingEvents() ?? []).map((e) => [e.eventId, e.name] as const),
		),
		courseEventIds: new Set(existingCourseIds() ?? []),
	}))

	// --- Course fields, derived from whichever athlete files are in ---

	/** Events found in uploaded athlete files that have no course data stored. */
	const newCourses = createMemo(() => {
		const known = existing().courseEventIds
		const found = new Map<
			string,
			{ name: string; url: string; runners: string[] }
		>()

		for (const athlete of TRACKED_ATHLETES) {
			const parsed = athleteSlots()[athlete.parkrunId]?.parsed
			if (!parsed) continue

			for (const event of parsed.events) {
				if (known.has(event.eventId)) continue
				const entry = found.get(event.eventId)
				if (entry) {
					if (!entry.runners.includes(athlete.name)) {
						entry.runners.push(athlete.name)
					}
				} else {
					// The base URL comes off the athlete's own result links, so it
					// already points at the right parkrun domain for this event.
					found.set(event.eventId, {
						name: event.name,
						url: event.url,
						runners: [athlete.name],
					})
				}
			}
		}

		return [...found.entries()]
			.map(([eventId, value]) => ({ eventId, ...value }))
			.sort((a, b) => a.name.localeCompare(b.name))
	})

	// --- File handling ---

	/** Parse a picked file into its slot, recording any error on the slot. */
	async function handleFile<T>(
		file: File | undefined,
		slot: Slot<T> | undefined,
		update: (next: Slot<T>) => void,
		parse: (file: File) => Promise<T>,
	) {
		setSummary(null)
		setReport(null)

		if (!file) {
			update({ ...emptySlot<T>(), skip: slot?.skip ?? false })
			return
		}

		const base = { fileName: file.name, skip: false, parsed: null, error: null }
		update({ ...base, parsing: true })

		try {
			const parsed = await parse(file)
			update({ ...base, parsing: false, parsed })
		} catch (error) {
			update({
				...base,
				parsing: false,
				error: error instanceof Error ? error.message : String(error),
			})
		}
	}

	const updateSlotMap =
		<T,>(setter: (fn: (prev: SlotMap<T>) => SlotMap<T>) => void, key: string) =>
		(next: Slot<T>) =>
			setter((prev) => ({ ...prev, [key]: next }))

	/** Ticking Skip discards whatever was in the field; unticking clears the tick. */
	const toggleSkip = <T,>(
		slot: Slot<T> | undefined,
		update: (next: Slot<T>) => void,
		skip: boolean,
	) => {
		setSummary(null)
		setReport(null)
		update(skip ? { ...emptySlot<T>(), skip: true } : { ...emptySlot<T>() })
	}

	// --- Gating ---

	/** Every field on the form must be filled in or explicitly skipped. */
	const allReady = createMemo(() => {
		if (loading()) return false

		for (const athlete of TRACKED_ATHLETES) {
			if (!isReady(athleteSlots()[athlete.parkrunId])) return false
		}
		for (const event of PARKRUN_EVENTS) {
			if (!isReady(eventSlots()[event.eventId])) return false
		}
		if (!isReady(clubsSlot())) return false
		for (const course of newCourses()) {
			if (!isReady(courseSlots()[course.eventId])) return false
		}

		return true
	})

	const nothingToUpload = createMemo(() => {
		const s = summary()
		if (!s) return true
		return (
			s.payload.athletes.length === 0 &&
			s.payload.volunteerEvents.length === 0 &&
			s.payload.courses.length === 0 &&
			!s.payload.largestClubs
		)
	})

	// --- Process / upload ---

	const handleProcess = () => {
		const athletes = new Map<string, ParsedAthleteFile>()
		for (const athlete of TRACKED_ATHLETES) {
			const parsed = athleteSlots()[athlete.parkrunId]?.parsed
			if (parsed) athletes.set(athlete.parkrunId, parsed)
		}

		const events = new Map<string, ParsedEventFile>()
		for (const event of PARKRUN_EVENTS) {
			const parsed = eventSlots()[event.eventId]?.parsed
			if (parsed) events.set(event.eventId, parsed)
		}

		const courses = new Map<string, ParsedCourseFile>()
		for (const course of newCourses()) {
			const parsed = courseSlots()[course.eventId]?.parsed
			if (parsed) courses.set(course.eventId, parsed)
		}

		setReport(null)
		setSummary(
			buildManualSummary({
				athletes,
				events,
				courses,
				clubs: clubsSlot().parsed,
				ingestAll: ingestAll(),
				existing: existing(),
			}),
		)
	}

	const handleUpload = async () => {
		const current = summary()
		if (!current) return

		setProgress('Uploading…')
		const result = await uploadManualResults(current, (done, total, label) => {
			setProgress(
				done >= total
					? 'Finishing up…'
					: `Uploading ${done + 1}/${total}: ${label}`,
			)
		})
		setProgress(null)
		setReport(result)
	}

	const handleReset = () => {
		setAthleteSlots({})
		setEventSlots({})
		setCourseSlots({})
		setClubsSlot(emptySlot<ParsedClubsFile>())
		setSummary(null)
		setReport(null)
	}

	return (
		<div class={styles.container}>
			<DirtBlock>
				<h2 class={styles.sectionTitle}>Manual Results Upload</h2>
				<p class={styles.intro}>
					Download each page from parkrun by hand and drop it in below - they're
					parsed here in the browser with the same parsers the scrapers use, and
					nothing reaches the database until you press Upload. Every field needs
					a file or a tick in Skip.
				</p>

				<Show when={loading()}>
					<p class={styles.loading}>Loading current data…</p>
				</Show>

				<Show when={!loading()}>
					<h3 class={styles.groupTitle}>Runners</h3>
					<p class={styles.groupHint}>
						The <code>/parkrunner/&lt;id&gt;/all/</code> page for each member.
					</p>
					<For each={TRACKED_ATHLETES}>
						{(athlete) => {
							const slot = () => athleteSlots()[athlete.parkrunId]
							const update = updateSlotMap<ParsedAthleteFile>(
								setAthleteSlots,
								athlete.parkrunId,
							)
							return (
								<UploadRow
									label={athlete.name}
									sublabel={`Athlete ${athlete.parkrunId}`}
									href={athletePageUrl(athlete.parkrunId)}
									accept=".html,.htm"
									slot={slot()}
									onFile={(file) =>
										handleFile(file, slot(), update, (f) =>
											parseAthleteFile(f, athlete.parkrunId),
										)
									}
									onSkip={(skip) => toggleSkip(slot(), update, skip)}
									status={(parsed) =>
										`${parsed.runner.name} · ${parsed.runner.totalRuns} parkruns${
											parsed.runner.totalJuniorRuns
												? ` + ${parsed.runner.totalJuniorRuns} junior`
												: ''
										} · ${parsed.runResults.length} results`
									}
								/>
							)
						}}
					</For>

					<h3 class={styles.groupTitle}>Volunteer Data</h3>
					<p class={styles.groupHint}>
						The latest <code>/results/&lt;number&gt;/</code> page for each
						parkrun we track volunteering at.
					</p>
					<For each={PARKRUN_EVENTS}>
						{(event) => {
							const slot = () => eventSlots()[event.eventId]
							const update = updateSlotMap<ParsedEventFile>(
								setEventSlots,
								event.eventId,
							)
							const name = () =>
								existing().eventNames.get(event.eventId) ?? event.eventId
							return (
								<UploadRow
									label={`${name()} Full Results`}
									sublabel={event.baseUrl.replace(/^https?:\/\//, '')}
									href={latestResultsUrl(event.baseUrl)}
									accept=".html,.htm"
									slot={slot()}
									onFile={(file) =>
										handleFile(file, slot(), update, (f) =>
											parseEventFile(f, event.eventId),
										)
									}
									onSkip={(skip) => toggleSkip(slot(), update, skip)}
									status={(parsed) =>
										`#${parsed.meta.eventNumber} · ${parsed.meta.date} · ${parsed.volunteers.length} tracked volunteer(s)`
									}
								/>
							)
						}}
					</For>

					<h3 class={styles.groupTitle}>Largest Club Data</h3>
					<p class={styles.groupHint}>
						<code>parkrun.se/results/largestclubs/</code>
					</p>
					<UploadRow
						label="Largest Clubs Page"
						href={LARGEST_CLUBS_URL}
						accept=".html,.htm"
						slot={clubsSlot()}
						onFile={(file) =>
							handleFile(file, clubsSlot(), setClubsSlot, parseClubsFile)
						}
						onSkip={(skip) => toggleSkip(clubsSlot(), setClubsSlot, skip)}
						status={(parsed) =>
							`${parsed.clubs.length} clubs · week ${parsed.week}${
								parsed.scoopBusRank
									? ` · Scoop Bus #${parsed.scoopBusRank} by runs`
									: ''
							}`
						}
					/>

					<Show when={newCourses().length > 0}>
						<h3 class={styles.groupTitle}>New Courses</h3>
						<p class={styles.groupHint}>
							These events have no course map yet. Grab the KMZ from the Google
							map on the event's <code>/course/</code> page.
						</p>
						<For each={newCourses()}>
							{(course) => {
								const slot = () => courseSlots()[course.eventId]
								const update = updateSlotMap<ParsedCourseFile>(
									setCourseSlots,
									course.eventId,
								)
								return (
									<UploadRow
										label={`${course.name} KMZ file`}
										sublabel={`Ran by ${course.runners.join(', ')}`}
										href={coursePageUrl(course.url)}
										accept=".kmz,.kml"
										slot={slot()}
										onFile={(file) =>
											handleFile(file, slot(), update, parseCourseFile)
										}
										onSkip={(skip) => toggleSkip(slot(), update, skip)}
										status={(parsed) =>
											`${parsed.course.coordinates.length} coordinates${
												parsed.course.points.length
													? ` · ${parsed.course.points.map((p) => p.name).join(', ')}`
													: ''
											}`
										}
									/>
								)
							}}
						</For>
					</Show>

					<div class={styles.actions}>
						<Checkbox
							label={`Ingest full history (default: last ${RESULTS_WINDOW_DAYS / 7} weeks)`}
							checked={ingestAll()}
							onChange={(e) => {
								setIngestAll(e.currentTarget.checked)
								setSummary(null)
								setReport(null)
							}}
						/>
						<div class={styles.actionButtons}>
							<AdminButton variant="secondary" onClick={handleReset}>
								Reset
							</AdminButton>
							<AdminButton disabled={!allReady()} onClick={handleProcess}>
								Process
							</AdminButton>
						</div>
					</div>

					<Show when={!allReady()}>
						<p class={styles.gateHint}>
							Upload or skip every field above to enable Process.
						</p>
					</Show>
				</Show>
			</DirtBlock>

			<Show when={summary()}>
				{(current) => (
					<SummaryBlock
						summary={current()}
						report={report()}
						progress={progress()}
						disabled={nothingToUpload() || !!progress()}
						onUpload={handleUpload}
					/>
				)}
			</Show>
		</div>
	)
}

// ── One form row ────────────────────────────────────────────────────

function UploadRow<T extends { warnings: string[] }>(props: {
	label: string
	sublabel?: string
	/** The parkrun page this field's file comes from, opened in a new tab. */
	href?: string
	accept: string
	slot: Slot<T> | undefined
	onFile: (file: File | undefined) => void
	onSkip: (skip: boolean) => void
	/** One-line description of what was parsed out of the file. */
	status: (parsed: T) => string
}) {
	const slot = () => props.slot ?? emptySlot<T>()

	return (
		<div class={styles.row}>
			<div class={styles.rowHead}>
				<Show
					when={props.href}
					fallback={<span class={styles.rowLabel}>{props.label}</span>}
				>
					{(href) => (
						<a
							class={styles.rowLabelLink}
							href={href()}
							target="_blank"
							rel="noreferrer"
							title={`Open ${href()}`}
						>
							{props.label}
							<span class={styles.externalIcon}>↗</span>
						</a>
					)}
				</Show>
				<Show when={props.sublabel}>
					<span class={styles.rowSublabel}>{props.sublabel}</span>
				</Show>
			</div>
			<div class={styles.rowControls}>
				{/* The native file input is unstyleable, so it stays visually hidden
				    (but focusable) inside a label that acts as the button. */}
				<label class={styles.fileButton({ disabled: slot().skip })}>
					<input
						class={styles.hiddenFileInput}
						type="file"
						accept={props.accept}
						disabled={slot().skip}
						onChange={(e) => props.onFile(e.currentTarget.files?.[0])}
					/>
					{slot().fileName ? 'Change file' : 'Choose file'}
				</label>
				<span
					class={styles.fileName({ empty: !slot().fileName })}
					title={slot().fileName || undefined}
				>
					{slot().skip
						? 'Skipped'
						: slot().fileName
							? truncateStart(slot().fileName)
							: 'No file chosen'}
				</span>
				<Checkbox
					label="Skip"
					checked={slot().skip}
					onChange={(e) => props.onSkip(e.currentTarget.checked)}
				/>
			</div>
			<Show when={slot().parsing}>
				<p class={styles.rowStatus}>Parsing…</p>
			</Show>
			<Show when={slot().error}>
				<p class={styles.rowError}>✗ {slot().error}</p>
			</Show>
			<Show when={slot().parsed}>
				{(parsed) => (
					<>
						<p class={styles.rowStatus}>✓ {props.status(parsed())}</p>
						<For each={parsed().warnings}>
							{(warning) => <p class={styles.rowWarning}>⚠ {warning}</p>}
						</For>
					</>
				)}
			</Show>
		</div>
	)
}

// ── Summary + upload ────────────────────────────────────────────────

function SummaryBlock(props: {
	summary: ManualSummary
	report: UploadReport | null
	progress: string | null
	disabled: boolean
	onUpload: () => void
}) {
	const totals = createMemo(() => {
		const s = props.summary
		return {
			results: s.payload.athletes.reduce(
				(sum, a) => sum + a.runResults.length,
				0,
			),
			newResults: s.athletes.reduce((sum, a) => sum + a.newResults, 0),
			newEvents: s.events.filter((e) => e.isNew).length,
			volunteerRecords: s.payload.volunteers.length,
		}
	})

	return (
		<DirtBlock>
			<h2 class={styles.sectionTitle}>Extracted Data</h2>
			<p class={styles.intro}>
				{props.summary.ingestAll
					? 'Full history will be uploaded.'
					: `Only results from ${props.summary.cutoffDate} onwards will be uploaded.`}{' '}
				Nothing has been sent yet.
			</p>

			<Show when={props.summary.athletes.length > 0}>
				<h3 class={styles.groupTitle}>
					Runners ({props.summary.athletes.length}) — {totals().results}{' '}
					results, {totals().newResults} new
				</h3>
				<table class={styles.table}>
					<thead>
						<tr>
							<th>Runner</th>
							<th>Total runs</th>
							<th>Parsed</th>
							<th>Uploading</th>
							<th>New</th>
							<th>Latest</th>
						</tr>
					</thead>
					<tbody>
						<For each={props.summary.athletes}>
							{(athlete) => (
								<tr>
									<td>{athlete.name}</td>
									<td>
										{athlete.totalRuns}
										{athlete.totalJuniorRuns
											? ` (+${athlete.totalJuniorRuns} jr)`
											: ''}
									</td>
									<td>{athlete.parsedResults}</td>
									<td>{athlete.uploadedResults}</td>
									<td class={athlete.newResults > 0 ? styles.highlight : ''}>
										{athlete.newResults}
									</td>
									<td>{athlete.latestResultDate}</td>
								</tr>
							)}
						</For>
					</tbody>
				</table>
			</Show>

			<Show when={props.summary.events.length > 0}>
				<h3 class={styles.groupTitle}>
					Events ({props.summary.events.length}) — {totals().newEvents} new
				</h3>
				<p class={styles.chips}>
					<For each={props.summary.events}>
						{(event) => (
							<span class={event.isNew ? styles.chipNew : styles.chip}>
								{event.name} ({event.country}){event.isNew ? ' · new' : ''}
							</span>
						)}
					</For>
				</p>
			</Show>

			<Show when={props.summary.volunteers.length > 0}>
				<h3 class={styles.groupTitle}>
					Volunteers — {totals().volunteerRecords} record(s)
				</h3>
				<For each={props.summary.volunteers}>
					{(entry) => (
						<div class={styles.subBlock}>
							<p class={styles.subTitle}>
								{entry.event} #{entry.eventNumber} · {entry.date}
							</p>
							<Show
								when={entry.entries.length > 0}
								fallback={
									<p class={styles.emptyState}>No tracked volunteers.</p>
								}
							>
								<ul class={styles.list}>
									<For each={entry.entries}>
										{(volunteer) => (
											<li>
												<strong>{volunteer.label}</strong> —{' '}
												{volunteer.roles.join(', ')}
											</li>
										)}
									</For>
								</ul>
							</Show>
						</div>
					)}
				</For>
			</Show>

			<Show when={props.summary.courses.length > 0}>
				<h3 class={styles.groupTitle}>
					New Courses ({props.summary.courses.length})
				</h3>
				<ul class={styles.list}>
					<For each={props.summary.courses}>
						{(course) => (
							<li>
								<strong>{course.name}</strong> — {course.coordinates}{' '}
								coordinates
								{course.pointNames.length > 0
									? `, points: ${course.pointNames.join(', ')}`
									: ''}
							</li>
						)}
					</For>
				</ul>
			</Show>

			<Show when={props.summary.clubs}>
				{(clubs) => (
					<>
						<h3 class={styles.groupTitle}>
							Largest Clubs — {clubs().total} clubs, week {clubs().week}
						</h3>
						<table class={styles.table}>
							<thead>
								<tr>
									<th>#</th>
									<th>Club</th>
									<th>Runs</th>
									<th>Members</th>
								</tr>
							</thead>
							<tbody>
								<For each={clubs().top}>
									{(club, index) => (
										<tr>
											<td>{index() + 1}</td>
											<td>{club.name}</td>
											<td>{club.events}</td>
											<td>{club.members}</td>
										</tr>
									)}
								</For>
								{/* Scoop Bus is not in the top five yet — show it anyway. */}
								<Show
									when={
										(clubs().scoopBusRank ?? 0) > clubs().top.length
											? clubs().scoopBus
											: null
									}
								>
									{(scoopBus) => (
										<tr class={styles.highlightRow}>
											<td>{clubs().scoopBusRank}</td>
											<td>{scoopBus().name}</td>
											<td>{scoopBus().events}</td>
											<td>{scoopBus().members}</td>
										</tr>
									)}
								</Show>
							</tbody>
						</table>
					</>
				)}
			</Show>

			<div class={styles.actions}>
				<Show when={props.progress}>
					<p class={styles.rowStatus}>{props.progress}</p>
				</Show>
				<div class={styles.actionButtons}>
					<AdminButton
						size="large"
						disabled={props.disabled}
						onClick={props.onUpload}
					>
						{props.report ? 'Upload again' : 'Upload'}
					</AdminButton>
				</div>
			</div>

			<Show when={props.report}>
				{(report) => (
					<div class={styles.subBlock}>
						<p class={styles.subTitle}>Upload result</p>
						<ul class={styles.list}>
							<li>
								{report().runners} runner(s), {report().runResults} result(s)
								stored
							</li>
							<li>{report().events} event(s) stored</li>
							<li>{report().volunteers} volunteer record(s) stored</li>
							<li>{report().courses} course(s) stored</li>
							<li>{report().clubs} club snapshot(s) stored</li>
							<Show when={report().estimatedWeeksToLargest !== null}>
								<li>
									Estimated {report().estimatedWeeksToLargest} week(s) until
									Scoop Bus is the largest club
								</li>
							</Show>
						</ul>
						<Show
							when={report().errors.length > 0}
							fallback={<p class={styles.rowStatus}>✓ Everything uploaded.</p>}
						>
							<For each={report().errors}>
								{(error) => <p class={styles.rowError}>✗ {error}</p>}
							</For>
						</Show>
					</div>
				)}
			</Show>
		</DirtBlock>
	)
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = {
	container: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '1.5rem',
	}),
	sectionTitle: css({
		fontSize: '1.25rem',
		fontWeight: 'bold',
		textTransform: 'uppercase',
		letterSpacing: '0.05em',
		m: 0,
		marginBottom: '0.5rem',
	}),
	intro: css({
		fontSize: '0.85rem',
		opacity: 0.8,
		m: 0,
		marginBottom: '1rem',
	}),
	groupTitle: css({
		fontSize: '1rem',
		fontWeight: 'bold',
		textTransform: 'uppercase',
		letterSpacing: '0.05em',
		m: 0,
		marginTop: '1.5rem',
		paddingTop: '0.75rem',
		borderTop: '1px solid var(--overlay-black-20)',
	}),
	groupHint: css({
		fontSize: '0.75rem',
		opacity: 0.65,
		m: 0,
		marginBottom: '0.5rem',
	}),
	row: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '0.25rem',
		padding: '0.5rem 0',
		borderBottom: '1px solid var(--overlay-black-12)',
	}),
	rowHead: css({
		display: 'flex',
		alignItems: 'baseline',
		gap: '0.5rem',
		flexWrap: 'wrap',
	}),
	rowLabel: css({
		fontWeight: 'bold',
		fontSize: '0.9rem',
	}),
	rowLabelLink: css({
		fontWeight: 'bold',
		fontSize: '0.9rem',
		color: 'inherit',
		textDecoration: 'none',
		display: 'inline-flex',
		alignItems: 'baseline',
		gap: '0.25rem',
		_hover: { textDecoration: 'underline' },
	}),
	externalIcon: css({
		fontSize: '0.75rem',
		opacity: 0.6,
	}),
	rowSublabel: css({
		fontSize: '0.7rem',
		opacity: 0.6,
	}),
	rowControls: css({
		display: 'flex',
		alignItems: 'center',
		gap: '0.75rem',
		flexWrap: 'wrap',
	}),
	/** Styled to match AdminButton, since it stands in for one. */
	fileButton: cva({
		base: {
			flexShrink: 0,
			display: 'inline-flex',
			alignItems: 'center',
			padding: '0.3rem 0.9rem',
			border: '3px double var(--color-black)',
			borderRadius: '4px',
			cornerShape: 'notch',
			background: 'var(--overlay-black-15)',
			color: 'var(--color-white)',
			fontWeight: 'bold',
			fontSize: '0.7rem',
			textTransform: 'uppercase',
			letterSpacing: '0.03em',
			cursor: 'pointer',
			_hover: { background: 'var(--overlay-black-25)' },
			// The real input is invisible but still focusable, so show focus here.
			'&:focus-within': { background: 'var(--overlay-black-25)' },
		},
		variants: {
			disabled: {
				true: { opacity: 0.4, cursor: 'default', pointerEvents: 'none' },
			},
		},
	}),
	hiddenFileInput: css({
		position: 'absolute',
		width: '1px',
		height: '1px',
		opacity: 0,
		pointerEvents: 'none',
	}),
	/** Fixed width so the Skip box doesn't shift as filenames change. */
	fileName: cva({
		base: {
			flex: '0 1 26ch',
			minWidth: 0,
			fontSize: '0.75rem',
			textAlign: 'left',
			overflow: 'hidden',
			whiteSpace: 'nowrap',
		},
		variants: {
			empty: {
				true: { opacity: 0.5, fontStyle: 'italic' },
			},
		},
	}),
	rowStatus: css({
		fontSize: '0.75rem',
		m: 0,
		opacity: 0.85,
		textAlign: 'left',
	}),
	rowWarning: css({
		fontSize: '0.75rem',
		m: 0,
		color: 'var(--color-white)',
		opacity: 0.75,
		textAlign: 'left',
	}),
	rowError: css({
		fontSize: '0.75rem',
		m: 0,
		fontWeight: 'bold',
		color: 'var(--error-red)',
		textAlign: 'left',
	}),
	actions: css({
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: '1rem',
		flexWrap: 'wrap',
		marginTop: '1.5rem',
	}),
	actionButtons: css({
		display: 'flex',
		alignItems: 'center',
		gap: '0.75rem',
		marginLeft: 'auto',
	}),
	gateHint: css({
		fontSize: '0.75rem',
		opacity: 0.6,
		m: 0,
		marginTop: '0.5rem',
		textAlign: 'right',
	}),
	loading: css({
		textAlign: 'center',
		padding: '1rem',
	}),
	table: css({
		width: '100%',
		borderCollapse: 'collapse',
		marginTop: '0.5rem',
		'& th, & td': {
			padding: '0.375rem 0.5rem',
			textAlign: 'left',
			borderBottom: '1px solid var(--overlay-black-12)',
		},
		'& th': {
			fontWeight: 'bold',
			fontSize: '0.7rem',
			textTransform: 'uppercase',
			letterSpacing: '0.05em',
		},
		'& td': {
			fontSize: '0.8rem',
		},
	}),
	highlight: css({
		fontWeight: 'bold',
	}),
	highlightRow: css({
		fontWeight: 'bold',
		background: 'var(--overlay-black-15)',
	}),
	chips: css({
		display: 'flex',
		flexWrap: 'wrap',
		gap: '0.375rem',
		m: 0,
		marginTop: '0.5rem',
	}),
	chip: css({
		fontSize: '0.7rem',
		padding: '0.125rem 0.5rem',
		borderRadius: '3px',
		background: 'var(--overlay-black-15)',
	}),
	chipNew: css({
		fontSize: '0.7rem',
		fontWeight: 'bold',
		padding: '0.125rem 0.5rem',
		borderRadius: '3px',
		background: 'var(--overlay-black-25)',
		border: '1px solid var(--overlay-white-30)',
	}),
	subBlock: css({
		marginTop: '0.75rem',
		textAlign: 'left',
	}),
	subTitle: css({
		fontSize: '0.8rem',
		fontWeight: 'bold',
		m: 0,
	}),
	list: css({
		fontSize: '0.8rem',
		margin: '0.25rem 0 0',
		paddingLeft: '1.25rem',
		textAlign: 'left',
		'& li': { marginBottom: '0.125rem' },
	}),
	emptyState: css({
		fontSize: '0.75rem',
		opacity: 0.6,
		m: 0,
	}),
}
