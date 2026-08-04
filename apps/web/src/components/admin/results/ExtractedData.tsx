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
import type { ManualSummary, UploadReport } from '@/utils/manualResults'
import { For, Show, createMemo, createSignal } from 'solid-js'
import { styles } from './resultStyles'

/** Anchor for jumping straight here after a scrape. */
export const EXTRACTED_DATA_ID = 'extracted-data'

export function ExtractedData(props: {
	summary: ManualSummary
	report: UploadReport | null
	progress: string | null
	disabled: boolean
	onUpload: () => void
}) {
	const [showAllResults, setShowAllResults] = createSignal(false)
	const [showAllEvents, setShowAllEvents] = createSignal(false)

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
				Nothing has been sent yet.
			</p>

			{/* --- Results --- */}

			<Show when={results().length > 0}>
				<h3 class={styles.groupTitle}>
					{newResults().length} new result
					{newResults().length === 1 ? '' : 's'}
					<span class={styles.groupTitleMuted}>
						{' '}
						of {results().length} being uploaded
					</span>
				</h3>

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
			</Show>

			{/* --- Runner totals --- */}

			<Show when={props.summary.athletes.length > 0}>
				<h3 class={styles.groupTitle}>
					Runners ({props.summary.athletes.length})
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
			</Show>

			{/* --- Events --- */}

			<Show when={events().length > 0}>
				<h3 class={styles.groupTitle}>
					{newEvents().length} new event{newEvents().length === 1 ? '' : 's'}
					<Show when={knownEvents().length > 0}>
						<span class={styles.groupTitleMuted}>
							{' '}
							of {events().length} run
						</span>
					</Show>
				</h3>

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
			</Show>

			{/* --- Volunteers --- */}

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

			{/* --- Courses --- */}

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

			{/* --- Clubs --- */}

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

			{/* --- Upload --- */}

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
