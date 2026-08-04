/**
 * Client-side processing for the Process Results admin pages.
 *
 * When parkrun blocks the scrapers (or nobody is at a machine that can run
 * them), the pages can be downloaded by hand and dropped into the admin form.
 * This module runs the very same parsers the scripts use — from
 * libs/shared/parkrun-parsers.ts — over those files, so a manual upload lands
 * exactly the data a scrape would have landed.
 *
 * Mirrors:
 *   apps/api/scripts/fetch-results.ts        → athlete pages, events, courses
 *   apps/api/scripts/fetch-parkrun.ts        → event pages (volunteers)
 *   apps/api/scripts/fetch-largest-clubs.ts  → the club league table
 */
import { type CourseData, parseKml } from '@shared/kml-parser'
import {
	type EventInfo,
	type EventPageMeta,
	type LargestClubEntry,
	type RunResult,
	type RunnerInfo,
	extractEvents,
	parseEventPageMeta,
	parseEventVolunteers,
	parseLargestClubs,
	parseRunResults,
	parseRunnerData,
} from '@shared/parkrun-parsers'
import { TRACKED_ATHLETES, TRACKED_IDS } from '@shared/tracked-athletes'
import { getAuthToken } from './adminApi'
import { extractKmlFromKmz } from './kmz'

const CONVEX_URL = (import.meta.env.VITE_CONVEX_URL as string) || ''

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Results older than this can no longer be adjusted by parkrun, so the scrapers
 * only ingest the recent window by default. Matches fetch-results.ts.
 */
export const RESULTS_WINDOW_DAYS = 42

export const SCOOP_BUS_CLUB_NAME = 'Scoop Bus Run Club'

// Source-page URLs live in @shared/parkrun-urls so the scraper extension and the
// scripts build the same links; re-exported here for the page's convenience.
export {
	LARGEST_CLUBS_URL,
	athletePageUrl,
	coursePageUrl,
	latestResultsUrl,
} from '@shared/parkrun-urls'

/** Oldest result date the default (windowed) ingest will include. */
export function resultsCutoffDate(now = Date.now()): string {
	return new Date(now - RESULTS_WINDOW_DAYS * DAY_MS).toISOString().slice(0, 10)
}

/** The Saturday on or before `timestamp`, as YYYY-MM-DD (UTC). */
export function snapshotWeek(timestamp = Date.now()): string {
	// getUTCDay: Sun=0 … Sat=6. Days elapsed since the most recent Saturday.
	const daysSinceSaturday = (new Date(timestamp).getUTCDay() + 1) % 7
	return new Date(timestamp - daysSinceSaturday * DAY_MS)
		.toISOString()
		.slice(0, 10)
}

// ── Parsed file shapes ──────────────────────────────────────────────

export interface ParsedAthleteFile {
	runner: RunnerInfo
	runResults: RunResult[]
	events: EventInfo[]
	/** Non-fatal notes to show next to the field, e.g. an ID mismatch. */
	warnings: string[]
}

export interface ParsedEventFile {
	meta: EventPageMeta
	volunteers: { parkrunId: string; roles: string[] }[]
	warnings: string[]
}

export interface ParsedClubsFile {
	week: string
	clubs: LargestClubEntry[]
	/** Scoop Bus's 1-based rank by total runs, or null if it isn't listed. */
	scoopBusRank: number | null
	scoopBus: LargestClubEntry | null
	warnings: string[]
}

export interface ParsedCourseFile {
	course: CourseData
	warnings: string[]
}

// ── File parsing ────────────────────────────────────────────────────

/**
 * Parse an athlete's "all results" page.
 *
 * @param expectedParkrunId The athlete the form field asked for — 15 similar
 * HTML files are easy to mix up, so we check the ID printed on the page.
 */
export async function parseAthleteFile(
	file: File,
	expectedParkrunId: string,
): Promise<ParsedAthleteFile> {
	const html = await file.text()
	const runner = parseRunnerData(html)
	const runResults = parseRunResults(html)
	const warnings: string[] = []

	if (runner.name === 'Unknown') {
		throw new Error(
			"Couldn't read a runner name — is this a parkrunner /all/ results page?",
		)
	}
	if (runResults.length === 0) {
		throw new Error("Couldn't find any run results in this page.")
	}
	if (runner.parkrunId && runner.parkrunId !== expectedParkrunId) {
		throw new Error(
			`This page is for athlete ${runner.parkrunId} (${runner.name}), not ${expectedParkrunId}.`,
		)
	}
	// The all-results table lists junior parkruns alongside adult ones, and the
	// heading counts them separately ("22 parkruns & 5 junior parkruns totalt"),
	// so the row count should match the two added together.
	const expectedRows = runner.totalRuns + runner.totalJuniorRuns
	if (runResults.length !== expectedRows) {
		const reported = runner.totalJuniorRuns
			? `${runner.totalRuns} parkruns and ${runner.totalJuniorRuns} junior parkruns`
			: `${runner.totalRuns} parkruns`
		warnings.push(
			`Page reports ${reported} but the table has ${runResults.length} rows.`,
		)
	}

	return { runner, runResults, events: extractEvents(runResults), warnings }
}

/** Parse a single event's full results page for volunteer credits. */
export async function parseEventFile(
	file: File,
	expectedEventId: string,
): Promise<ParsedEventFile> {
	const html = await file.text()
	const meta = parseEventPageMeta(html)
	const warnings: string[] = []

	if (!meta.date) {
		throw new Error(
			"Couldn't read an event date — is this a single event's results page?",
		)
	}
	if (!meta.eventNumber) {
		throw new Error("Couldn't read the event number from this page.")
	}
	if (meta.eventId && meta.eventId !== expectedEventId) {
		throw new Error(
			`This page is for "${meta.eventId}"${meta.title ? ` (${meta.title})` : ''}, not "${expectedEventId}".`,
		)
	}

	const volunteers = parseEventVolunteers(html, TRACKED_IDS)
	if (volunteers.length === 0) {
		warnings.push('No tracked club members volunteered at this event.')
	}

	return {
		meta: { ...meta, eventId: meta.eventId || expectedEventId },
		volunteers,
		warnings,
	}
}

/** Parse the parkrun Sweden largest-clubs league table. */
export async function parseClubsFile(file: File): Promise<ParsedClubsFile> {
	const html = await file.text()
	const clubs = parseLargestClubs(html)
	const warnings: string[] = []

	if (clubs.length === 0) {
		throw new Error(
			"Couldn't parse any clubs — is this the largest clubs league table?",
		)
	}

	const byEvents = [...clubs].sort((a, b) => b.events - a.events)
	const index = byEvents.findIndex(
		(c) => c.name.trim().toLowerCase() === SCOOP_BUS_CLUB_NAME.toLowerCase(),
	)

	if (index === -1) {
		warnings.push(`${SCOOP_BUS_CLUB_NAME} is not in this league table.`)
	}

	return {
		week: snapshotWeek(),
		clubs,
		scoopBusRank: index === -1 ? null : index + 1,
		scoopBus: index === -1 ? null : byEvents[index],
		warnings,
	}
}

/** Parse a course map file — either a KMZ archive or a bare KML. */
export async function parseCourseFile(file: File): Promise<ParsedCourseFile> {
	const isKml = /\.kml$/i.test(file.name)

	// Imported statically on purpose: as a lazy chunk this is the one module the
	// page fetches mid-interaction, so a restarted dev server or a redeploy under
	// an open tab breaks the KMZ field alone. It gzips to under a kilobyte.
	const kml = isKml
		? await file.text()
		: await extractKmlFromKmz(await file.arrayBuffer())

	const course = parseKml(kml)
	const warnings: string[] = []

	if (course.coordinates.length === 0) {
		throw new Error('No course path found in this file.')
	}
	if (course.points.length === 0) {
		warnings.push('No named points (Start, Finish, …) found.')
	}

	return { course, warnings }
}

// ── Building the summary ────────────────────────────────────────────

export interface AthleteSummary {
	parkrunId: string
	/** Short club name from the tracked list, e.g. "Josh". */
	label: string
	/** Full name as printed on the page, e.g. "Josh THOMPSON". */
	name: string
	totalRuns: number
	totalJuniorRuns: number
	/** Results found in the file. */
	parsedResults: number
	/** Results that will actually be sent, after the date window. */
	uploadedResults: number
	/** Of those, how many the database doesn't have yet. */
	newResults: number
	latestResultDate: string
	warnings: string[]
}

/**
 * A single result in the upload, flagged against what's already stored.
 *
 * The default window is six weeks, so most of what gets re-sent is already in
 * the database — only `isNew` rows are worth reading.
 */
export interface ResultSummary {
	parkrunId: string
	/** Short club name, for the results table. */
	runner: string
	event: string
	eventName: string
	eventNumber: number
	date: string
	position: number
	time: string
	isNew: boolean
}

export interface EventSummary {
	eventId: string
	name: string
	country: string
	isNew: boolean
}

export interface VolunteerSummary {
	event: string
	eventNumber: number
	date: string
	entries: { parkrunId: string; label: string; roles: string[] }[]
	warnings: string[]
}

export interface CourseSummary {
	eventId: string
	name: string
	coordinates: number
	pointNames: string[]
	warnings: string[]
}

export interface ClubsSummary {
	week: string
	total: number
	top: LargestClubEntry[]
	scoopBusRank: number | null
	scoopBus: LargestClubEntry | null
	warnings: string[]
}

export interface ManualSummary {
	ingestAll: boolean
	cutoffDate: string
	athletes: AthleteSummary[]
	/** Every result in the upload, newest first, each flagged new or already stored. */
	results: ResultSummary[]
	events: EventSummary[]
	volunteers: VolunteerSummary[]
	courses: CourseSummary[]
	clubs: ClubsSummary | null
	payload: ManualIngestSections
}

/** What actually gets sent to /api/admin/manual-ingest. */
export interface ManualIngestSections {
	athletes: {
		parkrunId: string
		runner: RunnerInfo
		runResults: RunResult[]
	}[]
	events: EventInfo[]
	volunteers: {
		parkrunId: string
		event: string
		eventNumber: number
		date: string
		roles: string[]
	}[]
	/** Event pages that were processed, even ones with no tracked volunteers. */
	volunteerEvents: { event: string; eventNumber: number }[]
	courses: {
		eventId: string
		coordinates: number[][]
		points: CourseData['points']
	}[]
	largestClubs: { week: string; clubs: LargestClubEntry[] } | null
}

export interface ExistingData {
	/** `${parkrunId}#${event}#${eventNumber}` for every result already stored. */
	resultKeys: Set<string>
	eventIds: Set<string>
	/** Display name per eventId, for labelling. */
	eventNames: Map<string, string>
	courseEventIds: Set<string>
}

export interface ProcessInput {
	athletes: Map<string, ParsedAthleteFile>
	events: Map<string, ParsedEventFile>
	courses: Map<string, ParsedCourseFile>
	clubs: ParsedClubsFile | null
	ingestAll: boolean
	existing: ExistingData
}

const ATHLETE_LABELS = new Map(
	TRACKED_ATHLETES.map((a) => [a.parkrunId, a.name]),
)

/**
 * Assemble the upload payload and a human-readable summary of it, cross-checked
 * against what the database already holds.
 */
export function buildManualSummary(input: ProcessInput): ManualSummary {
	const cutoff = resultsCutoffDate()
	const { existing } = input

	const athletes: AthleteSummary[] = []
	const results: ResultSummary[] = []
	const payloadAthletes: ManualIngestSections['athletes'] = []
	const allEvents = new Map<string, EventInfo>()

	for (const [parkrunId, parsed] of input.athletes) {
		const uploaded = input.ingestAll
			? parsed.runResults
			: parsed.runResults.filter((r) => r.date >= cutoff)

		const label = ATHLETE_LABELS.get(parkrunId) ?? parkrunId

		for (const result of uploaded) {
			results.push({
				parkrunId,
				runner: label,
				event: result.event,
				eventName: result.eventName,
				eventNumber: result.eventNumber,
				date: result.date,
				position: result.position,
				time: result.time,
				isNew: !existing.resultKeys.has(
					resultKey(parkrunId, result.event, result.eventNumber),
				),
			})
		}

		const newResults = uploaded.filter(
			(r) =>
				!existing.resultKeys.has(resultKey(parkrunId, r.event, r.eventNumber)),
		).length

		athletes.push({
			parkrunId,
			label,
			name: parsed.runner.name,
			totalRuns: parsed.runner.totalRuns,
			totalJuniorRuns: parsed.runner.totalJuniorRuns,
			parsedResults: parsed.runResults.length,
			uploadedResults: uploaded.length,
			newResults,
			latestResultDate: parsed.runResults.reduce(
				(latest, r) => (r.date > latest ? r.date : latest),
				'',
			),
			warnings: parsed.warnings,
		})

		payloadAthletes.push({
			parkrunId,
			runner: parsed.runner,
			runResults: uploaded,
		})

		// Events come from the athlete's full history, not the upload window —
		// same as extractEvents() in fetch-results.ts.
		for (const event of parsed.events) {
			if (!allEvents.has(event.eventId)) allEvents.set(event.eventId, event)
		}
	}

	athletes.sort((a, b) => a.label.localeCompare(b.label))

	// Newest first: the recent stuff is what anyone actually reads.
	results.sort(
		(a, b) => b.date.localeCompare(a.date) || a.runner.localeCompare(b.runner),
	)

	const events: EventSummary[] = [...allEvents.values()]
		.map((e) => ({
			eventId: e.eventId,
			name: e.name,
			country: e.country,
			isNew: !existing.eventIds.has(e.eventId),
		}))
		.sort(
			(a, b) =>
				Number(b.isNew) - Number(a.isNew) || a.name.localeCompare(b.name),
		)

	// --- Volunteers ---

	const volunteers: VolunteerSummary[] = []
	const payloadVolunteers: ManualIngestSections['volunteers'] = []
	const volunteerEvents: ManualIngestSections['volunteerEvents'] = []

	for (const [eventId, parsed] of input.events) {
		volunteers.push({
			event: eventId,
			eventNumber: parsed.meta.eventNumber,
			date: parsed.meta.date,
			entries: parsed.volunteers.map((v) => ({
				parkrunId: v.parkrunId,
				label: ATHLETE_LABELS.get(v.parkrunId) ?? v.parkrunId,
				roles: v.roles,
			})),
			warnings: parsed.warnings,
		})

		volunteerEvents.push({
			event: eventId,
			eventNumber: parsed.meta.eventNumber,
		})

		for (const vol of parsed.volunteers) {
			payloadVolunteers.push({
				parkrunId: vol.parkrunId,
				event: eventId,
				eventNumber: parsed.meta.eventNumber,
				date: parsed.meta.date,
				roles: vol.roles,
			})
		}
	}

	// --- Courses ---

	const courses: CourseSummary[] = []
	const payloadCourses: ManualIngestSections['courses'] = []

	for (const [eventId, parsed] of input.courses) {
		courses.push({
			eventId,
			name:
				allEvents.get(eventId)?.name ??
				existing.eventNames.get(eventId) ??
				eventId,
			coordinates: parsed.course.coordinates.length,
			pointNames: parsed.course.points.map((p) => p.name),
			warnings: parsed.warnings,
		})
		payloadCourses.push({
			eventId,
			coordinates: parsed.course.coordinates,
			points: parsed.course.points,
		})
	}

	// --- Clubs ---

	const clubs: ClubsSummary | null = input.clubs
		? {
				week: input.clubs.week,
				total: input.clubs.clubs.length,
				top: [...input.clubs.clubs]
					.sort((a, b) => b.events - a.events)
					.slice(0, 5),
				scoopBusRank: input.clubs.scoopBusRank,
				scoopBus: input.clubs.scoopBus,
				warnings: input.clubs.warnings,
			}
		: null

	return {
		ingestAll: input.ingestAll,
		cutoffDate: cutoff,
		athletes,
		results,
		events,
		volunteers,
		courses,
		clubs,
		payload: {
			athletes: payloadAthletes,
			events: [...allEvents.values()],
			volunteers: payloadVolunteers,
			volunteerEvents,
			courses: payloadCourses,
			largestClubs: input.clubs
				? { week: input.clubs.week, clubs: input.clubs.clubs }
				: null,
		},
	}
}

export function resultKey(
	parkrunId: string,
	event: string,
	eventNumber: number,
): string {
	return `${parkrunId}#${event}#${eventNumber}`
}

// ── Uploading ───────────────────────────────────────────────────────

export interface UploadReport {
	runners: number
	runResults: number
	events: number
	volunteers: number
	courses: number
	clubs: number
	estimatedWeeksToLargest: number | null
	errors: string[]
}

/** One request's worth of payload, with the label shown while it's in flight. */
interface UploadChunk {
	label: string
	body: Partial<ManualIngestSections>
}

function buildChunks(payload: ManualIngestSections): UploadChunk[] {
	const chunks: UploadChunk[] = []

	// One athlete per request: a full history is thousands of row upserts, which
	// is more than one Convex mutation should be asked to do at once.
	for (const athlete of payload.athletes) {
		chunks.push({
			label: `${athlete.runner.name} (${athlete.runResults.length} results)`,
			body: { athletes: [athlete] },
		})
	}

	if (payload.events.length > 0) {
		chunks.push({
			label: `${payload.events.length} event(s)`,
			body: { events: payload.events },
		})
	}

	if (payload.volunteerEvents.length > 0) {
		chunks.push({
			label: `${payload.volunteers.length} volunteer record(s)`,
			body: {
				volunteers: payload.volunteers,
				volunteerEvents: payload.volunteerEvents,
			},
		})
	}

	for (const course of payload.courses) {
		chunks.push({
			label: `${course.eventId} course map`,
			body: { courses: [course] },
		})
	}

	if (payload.largestClubs) {
		chunks.push({
			label: `${payload.largestClubs.clubs.length} club snapshot(s)`,
			body: { largestClubs: payload.largestClubs },
		})
	}

	return chunks
}

/**
 * Upload a processed summary, one chunk per request.
 *
 * A failed chunk is reported and the rest still go — every write is an upsert,
 * so a partial upload can simply be retried.
 */
export async function uploadManualResults(
	summary: ManualSummary,
	onProgress?: (done: number, total: number, label: string) => void,
): Promise<UploadReport> {
	const token = getAuthToken()
	const report: UploadReport = {
		runners: 0,
		runResults: 0,
		events: 0,
		volunteers: 0,
		courses: 0,
		clubs: 0,
		estimatedWeeksToLargest: null,
		errors: [],
	}

	if (!token) {
		report.errors.push('Not authenticated')
		return report
	}

	const chunks = buildChunks(summary.payload)

	for (const [index, chunk] of chunks.entries()) {
		onProgress?.(index, chunks.length, chunk.label)

		try {
			const response = await fetch(`${CONVEX_URL}/api/admin/manual-ingest`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token, ...chunk.body }),
			})

			const data = await response.json()

			if (!response.ok || data.error) {
				report.errors.push(
					`${chunk.label}: ${data.error ?? `HTTP ${response.status}`}`,
				)
				continue
			}

			report.runners += data.runners ?? 0
			report.runResults += data.runResults ?? 0
			report.events += data.events ?? 0
			report.volunteers += data.volunteers ?? 0
			report.courses += data.courses ?? 0
			report.clubs += data.clubs ?? 0
			if (data.estimatedWeeksToLargest !== null) {
				report.estimatedWeeksToLargest = data.estimatedWeeksToLargest
			}
		} catch (error) {
			report.errors.push(
				`${chunk.label}: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}

	onProgress?.(chunks.length, chunks.length, 'Done')
	return report
}
