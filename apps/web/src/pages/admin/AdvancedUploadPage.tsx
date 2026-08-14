import { AdminButton } from '@/components/admin/AdminButton'
import {
	EXTRACTED_DATA_ID,
	ExtractedData,
} from '@/components/admin/results/ExtractedData'
import { UploadRow } from '@/components/admin/results/UploadRow'
import { styles } from '@/components/admin/results/resultStyles'
import { createResultSlots } from '@/components/admin/results/useResultSlots'
import { Checkbox } from '@/components/ui/Checkbox'
import { DirtBlock } from '@/components/ui/DirtBlock'
import {
	LARGEST_CLUBS_URL,
	type ManualSummary,
	RESULTS_WINDOW_DAYS,
	type UploadReport,
	type UploadSection,
	athletePageUrl,
	coursePageUrl,
	latestResultsUrl,
	uploadManualResults,
} from '@/utils/manualResults'
import { PARKRUN_EVENTS } from '@shared/parkrun-events'
import { TRACKED_ATHLETES } from '@shared/tracked-athletes'
import { A } from '@solidjs/router'
import { type Component, For, Show, createSignal } from 'solid-js'

/**
 * The by-hand path: download each page from parkrun yourself and drop it in.
 *
 * Superseded by the scraper extension for everyday use, but kept because it's
 * the only option on a machine that can't run the extension, and it's the
 * fallback when the extension fails on a page or two.
 */
export const AdvancedUploadPage: Component = () => {
	const slots = createResultSlots()

	const [summary, setSummary] = createSignal<ManualSummary | null>(null)
	const [report, setReport] = createSignal<UploadReport | null>(null)
	const [progress, setProgress] = createSignal<string | null>(null)

	/** Any change to the inputs invalidates a summary built from the old ones. */
	const invalidate = () => {
		setSummary(null)
		setReport(null)
	}

	const handleProcess = () => {
		setReport(null)
		setSummary(slots.buildSummary())
		requestAnimationFrame(() => {
			document
				.getElementById(EXTRACTED_DATA_ID)
				?.scrollIntoView({ behavior: 'smooth', block: 'start' })
		})
	}

	const handleUpload = async (sections: Set<UploadSection>) => {
		const current = summary()
		if (!current) return

		setProgress('Uploading…')
		const result = await uploadManualResults(
			current,
			(done, total, label) => {
				setProgress(
					done >= total
						? 'Finishing up…'
						: `Uploading ${done + 1}/${total}: ${label}`,
				)
			},
			sections,
		)
		setProgress(null)
		setReport(result)
	}

	const handleReset = () => {
		slots.reset()
		invalidate()
	}

	const nothingToUpload = () => {
		const s = summary()
		if (!s) return true
		return (
			s.payload.athletes.length === 0 &&
			s.payload.volunteerEvents.length === 0 &&
			s.payload.courses.length === 0 &&
			!s.payload.largestClubs
		)
	}

	return (
		<div class={styles.container}>
			<DirtBlock>
				<h2 class={styles.sectionTitle}>Upload Pages By Hand</h2>
				<p class={styles.intro}>
					For when the scraper extension isn't an option. Download each page
					from parkrun and drop it in — they're parsed here in the browser with
					the same parsers the scrapers use, and nothing reaches the database
					until you press Upload. Every field needs a file or a tick in Skip.
				</p>
				<p class={styles.advancedLink}>
					<A href="/admin/process-results">← Back to Process Results</A>
				</p>

				<Show when={slots.loading()}>
					<p class={styles.loading}>Loading current data…</p>
				</Show>

				<Show when={!slots.loading()}>
					<h3 class={styles.groupTitle}>Runners</h3>
					<p class={styles.groupHint}>
						The <code>/parkrunner/&lt;id&gt;/all/</code> page for each member.
					</p>
					<For each={TRACKED_ATHLETES}>
						{(athlete) => (
							<UploadRow
								label={athlete.name}
								sublabel={`Athlete ${athlete.parkrunId}`}
								href={athletePageUrl(athlete.parkrunId)}
								accept=".html,.htm"
								slot={slots.athleteSlot(athlete.parkrunId)}
								onFile={(file) => {
									invalidate()
									void slots.setAthleteFile(athlete.parkrunId, file)
								}}
								onSkip={(skip) => {
									invalidate()
									slots.setAthleteSkip(athlete.parkrunId, skip)
								}}
								status={(parsed) =>
									`${parsed.runner.name} · ${parsed.runner.totalRuns} parkruns${
										parsed.runner.totalJuniorRuns
											? ` + ${parsed.runner.totalJuniorRuns} junior`
											: ''
									} · ${parsed.runResults.length} results`
								}
							/>
						)}
					</For>

					<h3 class={styles.groupTitle}>Volunteer Data</h3>
					<p class={styles.groupHint}>
						The latest <code>/results/&lt;number&gt;/</code> page for each
						parkrun we track volunteering at.
					</p>
					<For each={PARKRUN_EVENTS}>
						{(event) => (
							<UploadRow
								label={`${slots.existing().eventNames.get(event.eventId) ?? event.eventId} Full Results`}
								sublabel={event.baseUrl.replace(/^https?:\/\//, '')}
								href={latestResultsUrl(event.baseUrl)}
								accept=".html,.htm"
								slot={slots.eventSlot(event.eventId)}
								onFile={(file) => {
									invalidate()
									void slots.setEventFile(event.eventId, file)
								}}
								onSkip={(skip) => {
									invalidate()
									slots.setEventSkip(event.eventId, skip)
								}}
								status={(parsed) =>
									`#${parsed.meta.eventNumber} · ${parsed.meta.date} · ${parsed.volunteers.length} tracked volunteer(s)`
								}
							/>
						)}
					</For>

					<h3 class={styles.groupTitle}>Largest Club Data</h3>
					<p class={styles.groupHint}>
						<code>parkrun.se/results/largestclubs/</code>
					</p>
					<UploadRow
						label="Largest Clubs Page"
						href={LARGEST_CLUBS_URL}
						accept=".html,.htm"
						slot={slots.clubsSlot()}
						onFile={(file) => {
							invalidate()
							void slots.setClubsFile(file)
						}}
						onSkip={(skip) => {
							invalidate()
							slots.setClubsSkip(skip)
						}}
						status={(parsed) =>
							`${parsed.clubs.length} clubs · week ${parsed.week}${
								parsed.scoopBusRank
									? ` · Scoop Bus #${parsed.scoopBusRank} by runs`
									: ''
							}`
						}
					/>

					<Show when={slots.missingCourses().length > 0}>
						<h3 class={styles.groupTitle}>New Courses</h3>
						<p class={styles.groupHint}>
							These events have no course map yet. Grab the KMZ from the Google
							map on the event's <code>/course/</code> page.
						</p>
						<For each={slots.missingCourses()}>
							{(course) => (
								<UploadRow
									label={`${course.name} KMZ file`}
									sublabel={`Ran by ${course.runners.join(', ')}`}
									href={coursePageUrl(course.url)}
									accept=".kmz,.kml"
									slot={slots.courseSlot(course.eventId)}
									onFile={(file) => {
										invalidate()
										void slots.setCourseFile(course.eventId, file)
									}}
									onSkip={(skip) => {
										invalidate()
										slots.setCourseSkip(course.eventId, skip)
									}}
									status={(parsed) =>
										`${parsed.course.coordinates.length} coordinates${
											parsed.course.points.length
												? ` · ${parsed.course.points.map((p) => p.name).join(', ')}`
												: ''
										}`
									}
								/>
							)}
						</For>
					</Show>

					<div class={styles.actions}>
						<Checkbox
							label={`Ingest full history (default: last ${RESULTS_WINDOW_DAYS / 7} weeks)`}
							checked={slots.ingestAll()}
							onChange={(e) => {
								slots.setIngestAll(e.currentTarget.checked)
								invalidate()
							}}
						/>
						<div class={styles.actionButtons}>
							<AdminButton variant="secondary" onClick={handleReset}>
								Reset
							</AdminButton>
							<AdminButton disabled={!slots.allReady()} onClick={handleProcess}>
								Process
							</AdminButton>
						</div>
					</div>

					<Show when={!slots.allReady()}>
						<p class={styles.gateHint}>
							Upload or skip every field above to enable Process.
						</p>
					</Show>
				</Show>
			</DirtBlock>

			<Show when={summary()}>
				{(current) => (
					<ExtractedData
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
