/**
 * The review step: everything that will be uploaded, before anything is sent.
 *
 * The ingest window is six weeks, so most of what gets re-sent is already in the
 * database. Every section therefore leads with what's *new* and keeps the rest
 * one click away — otherwise the interesting rows are buried in forty
 * already-known ones.
 */
import { AdminButton } from '@/components/admin/AdminButton'
import { DirtBlock } from '@/components/ui/DirtBlock'
import {
	type ManualSummary,
	type UploadReport,
	type UploadSection,
	presentSections,
} from '@/utils/manualResults'
import { For, type JSX, Show, createMemo, createSignal } from 'solid-js'
import { styles } from './resultStyles'

/** Anchor for jumping straight here after a scrape. */
export const EXTRACTED_DATA_ID = 'extracted-data'

export function ExtractedData(props: {
	summary: ManualSummary
	report: UploadReport | null
	progress: string | null
	disabled: boolean
	onUpload: (sections: Set<UploadSection>) => void
}) {
	const [showAllResults, setShowAllResults] = createSignal(false)
	const [showAllEvents, setShowAllEvents] = createSignal(false)

	// --- Which sections are going up ---

	/**
	 * Everything is ticked to start with: the normal upload is all of it, and
	 * unticking is for the odd run where one source came back wrong.
	 */
	const [excluded, setExcluded] = createSignal<Set<UploadSection>>(new Set())

	const isOn = (section: UploadSection) => !excluded().has(section)

	const toggle = (section: UploadSection) => {
		setExcluded((current) => {
			const next = new Set(current)
			if (!next.delete(section)) next.add(section)
			return next
		})
	}

	/** Ticked sections that have something to send. */
	const selected = () =>
		new Set(presentSections(props.summary.payload).filter(isOn))

	/** A heading that doubles as the section's include-in-upload checkbox. */
	const SectionToggle = (toggleProps: {
		section: UploadSection
		children: JSX.Element
	}) => (
		<h3 class={styles.groupTitle}>
			<label class={styles.sectionToggle}>
				<input
					type="checkbox"
					checked={isOn(toggleProps.section)}
					disabled={props.disabled}
					onChange={() => toggle(toggleProps.section)}
				/>
				<span>{toggleProps.children}</span>
			</label>
		</h3>
	)

	const results = () => props.summary.results
	const newResults = () => results().filter((r) => r.isNew)
	const visibleResults = () => (showAllResults() ? results() : newResults())

	const events = () => props.summary.events
	const newEvents = () => events().filter((e) => e.isNew)
	const knownEvents = () => events().filter((e) => !e.isNew)
	const visibleEvents = () => (showAllEvents() ? events() : newEvents())

	const totals = createMemo(() => ({
		volunteerRecords: props.summary.payload.volunteers.length,
	}))

	return (
		<DirtBlock>
			<h2 class={styles.sectionTitle} id={EXTRACTED_DATA_ID}>
				Extracted Data
			</h2>
			<p class={styles.intro}>
				{props.summary.ingestAll
					? 'Full history will be uploaded.'
					: `Only results from ${props.summary.cutoffDate} onwards will be uploaded.`}{' '}
				Nothing has been sent yet — untick a section to leave it out.
			</p>

			{/* --- Results --- */}

			<Show when={results().length > 0}>
				<SectionToggle section="results">
					{newResults().length} new result
					{newResults().length === 1 ? '' : 's'}
					<span class={styles.groupTitleMuted}>
						{' '}
						of {results().length} being uploaded
					</span>
				</SectionToggle>

				<div classList={{ [styles.sectionOff]: !isOn('results') }}>
					<Show
						when={visibleResults().length > 0}
						fallback={
							<p class={styles.emptyState}>
								Nothing new — every result in the window is already stored.
							</p>
						}
					>
						<table class={styles.table}>
							<thead>
								<tr>
									<th>Runner</th>
									<th>Event</th>
									<th>#</th>
									<th>Date</th>
									<th>Pos</th>
									<th>Time</th>
								</tr>
							</thead>
							<tbody>
								<For each={visibleResults()}>
									{(result) => (
										<tr class={result.isNew ? styles.newRow : undefined}>
											<td>{result.runner}</td>
											<td>{result.eventName}</td>
											<td>{result.eventNumber}</td>
											<td>{result.date}</td>
											<td>{result.position}</td>
											<td>{result.time}</td>
										</tr>
									)}
								</For>
							</tbody>
						</table>
					</Show>

					<Show when={results().length > newResults().length}>
						<button
							type="button"
							class={styles.dismiss}
							onClick={() => setShowAllResults(!showAllResults())}
						>
							{showAllResults()
								? 'Hide results already stored'
								: `See all ${results().length} results`}
						</button>
					</Show>
				</div>
			</Show>

			{/* --- Runner totals --- */}
			{/* No checkbox of its own: the runners ride along with their results. */}

			<Show when={props.summary.athletes.length > 0}>
				<div classList={{ [styles.sectionOff]: !isOn('results') }}>
					<h3 class={styles.groupTitle}>
						Runners ({props.summary.athletes.length})
						<span class={styles.groupTitleMuted}> · part of results</span>
					</h3>
					<table class={styles.table}>
						<thead>
							<tr>
								<th>Runner</th>
								<th>Total runs</th>
								<th>In file</th>
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
				</div>
			</Show>

			{/* --- Events --- */}

			<Show when={events().length > 0}>
				<SectionToggle section="events">
					{newEvents().length} new event{newEvents().length === 1 ? '' : 's'}
					<Show when={knownEvents().length > 0}>
						<span class={styles.groupTitleMuted}>
							{' '}
							of {events().length} run
						</span>
					</Show>
				</SectionToggle>

				<div classList={{ [styles.sectionOff]: !isOn('events') }}>
					<Show
						when={visibleEvents().length > 0}
						fallback={
							<p class={styles.emptyState}>
								Nothing new — every event has been run before.
							</p>
						}
					>
						<p class={styles.chips}>
							<For each={visibleEvents()}>
								{(event) => (
									<span class={event.isNew ? styles.chipNew : styles.chip}>
										{event.name} ({event.country}){event.isNew ? ' · new' : ''}
									</span>
								)}
							</For>
						</p>
					</Show>

					<Show when={knownEvents().length > 0}>
						<button
							type="button"
							class={styles.dismiss}
							onClick={() => setShowAllEvents(!showAllEvents())}
						>
							{showAllEvents()
								? 'Hide events already run'
								: `See all ${events().length} events`}
						</button>
					</Show>
				</div>
			</Show>

			{/* --- Volunteers --- */}

			<Show when={props.summary.volunteers.length > 0}>
				<SectionToggle section="volunteers">
					Volunteers — {totals().volunteerRecords} record(s)
				</SectionToggle>
				<div classList={{ [styles.sectionOff]: !isOn('volunteers') }}>
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
				</div>
			</Show>

			{/* --- Courses --- */}

			<Show when={props.summary.courses.length > 0}>
				<SectionToggle section="courses">
					New Courses ({props.summary.courses.length})
				</SectionToggle>
				<ul
					class={styles.list}
					classList={{ [styles.sectionOff]: !isOn('courses') }}
				>
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

			{/* --- Clubs --- */}

			<Show when={props.summary.clubs}>
				{(clubs) => (
					<>
						<SectionToggle section="clubs">
							Largest Clubs — {clubs().total} clubs, week {clubs().week}
						</SectionToggle>
						<div classList={{ [styles.sectionOff]: !isOn('clubs') }}>
							{/* The league table lags the events it counts, so this week gets
							    scraped more than once — say plainly that a re-upload
							    overwrites rather than stacking up. */}
							<p class={styles.groupHint}>
								Filed under Saturday {clubs().week}; uploading replaces any
								snapshot already stored for that week.
							</p>
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
						</div>
					</>
				)}
			</Show>

			{/* --- Upload --- */}

			<div class={styles.actions}>
				<Show when={props.progress}>
					<p class={styles.rowStatus}>{props.progress}</p>
				</Show>
				<div class={styles.actionButtons}>
					<AdminButton
						size="large"
						disabled={props.disabled || selected().size === 0}
						onClick={() => props.onUpload(selected())}
					>
						{props.report ? 'Upload again' : 'Upload'}
						{selected().size > 0 &&
						selected().size < presentSections(props.summary.payload).length
							? ` ${selected().size} section(s)`
							: ''}
					</AdminButton>
				</div>
			</div>

			<Show when={selected().size === 0}>
				<p class={styles.gateHint}>Tick a section to upload it.</p>
			</Show>

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
