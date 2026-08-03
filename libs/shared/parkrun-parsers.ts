// Shared Parkrun HTML parsing logic.
// Used by the scraping scripts (apps/api/scripts) and by the Manual Results
// admin page, which runs these same parsers over hand-downloaded pages.
//
// Parses: /parkrunner/{id}/all/ → runner info + all run results
//
// Two flavours of HTML reach these parsers: the DOM serialised by Playwright
// (entities like &nbsp;, English UI when fetched from parkrun.org.uk) and page
// source saved straight from a browser (literal non-breaking spaces, and any
// parkrun locale's UI text). Everything here keys off structure rather than
// wording so both work.

// --- Types ---

export interface RunnerInfo {
	name: string
	/** Athlete ID read back off the page, e.g. "8070821". Empty if not found. */
	parkrunId: string
	totalRuns: number
	totalJuniorRuns: number
}

export interface RunResult {
	event: string // eventId, e.g. "haga"
	eventName: string // display name, e.g. "Haga" (used by extractEvents, not stored in runResults)
	eventUrl: string // e.g. "https://www.parkrun.se/haga/results/394/"
	eventNumber: number
	position: number
	time: string
	ageGrade: string
	date: string // YYYY-MM-DD
}

export interface EventInfo {
	eventId: string // e.g. "haga"
	name: string // e.g. "Haga"
	url: string // e.g. "https://www.parkrun.se/haga/results/"
	country: string // e.g. "SE"
}

// --- Country code mapping from parkrun domain ---

const NAMIBIA_EVENTS = new Set(['walvisbay', 'windhoek', 'swakopmund'])

const DOMAIN_TO_COUNTRY: Record<string, string> = {
	'parkrun.com.au': 'AU',
	'parkrun.co.at': 'AT',
	'parkrun.ca': 'CA',
	'parkrun.dk': 'DK',
	'parkrun.fi': 'FI',
	'parkrun.com.de': 'DE',
	'parkrun.ie': 'IE',
	'parkrun.it': 'IT',
	'parkrun.jp': 'JP',
	'parkrun.lt': 'LT',
	'parkrun.my': 'MY',
	'parkrun.co.nl': 'NL',
	'parkrun.co.nz': 'NZ',
	'parkrun.no': 'NO',
	'parkrun.pl': 'PL',
	'parkrun.sg': 'SG',
	'parkrun.co.za': 'ZA',
	'parkrun.se': 'SE',
	'parkrun.org.uk': 'UK',
	'parkrun.us': 'US',
}

function getCountryFromUrl(url: string, eventId: string): string {
	try {
		const hostname = new URL(url).hostname.replace(/^www\./, '')
		if (hostname === 'parkrun.co.za' && NAMIBIA_EVENTS.has(eventId)) {
			return 'NA'
		}
		return DOMAIN_TO_COUNTRY[hostname] ?? '??'
	} catch {
		return '??'
	}
}

/**
 * Extract unique event info from parsed run results.
 * Derives eventId, name, base URL, and country from the result URLs.
 */
export function extractEvents(runResults: RunResult[]): EventInfo[] {
	const seen = new Map<string, EventInfo>()

	for (const result of runResults) {
		if (!result.eventUrl || !result.event) continue
		if (seen.has(result.event)) continue

		// URL looks like https://www.parkrun.se/haga/results/394/
		// We want base: https://www.parkrun.se/haga/
		const urlMatch = result.eventUrl.match(
			/^(https?:\/\/[^/]+\/[^/]+)\/results\/?\d*\/?$/,
		)
		if (!urlMatch) continue

		const baseUrl = `${urlMatch[1]}/`

		seen.set(result.event, {
			eventId: result.event,
			name: result.eventName,
			url: baseUrl,
			country: getCountryFromUrl(result.eventUrl, result.event),
		})
	}

	return Array.from(seen.values())
}

// --- Helper: strip HTML tags ---

function stripTags(html: string): string {
	return html.replace(/<[^>]*>/g, '').trim()
}

// --- Helper: decode the handful of entities parkrun emits in club names ---

const ENTITIES: Record<string, string> = {
	'&amp;': '&',
	'&lt;': '<',
	'&gt;': '>',
	'&quot;': '"',
	'&#039;': "'",
	'&apos;': "'",
	'&nbsp;': ' ',
}

function decodeEntities(text: string): string {
	return text
		.replace(/&(?:amp|lt|gt|quot|#039|apos|nbsp);/g, (m) => ENTITIES[m] ?? m)
		.replace(/&#(\d+);/g, (_, code) =>
			String.fromCodePoint(Number.parseInt(code, 10)),
		)
		.replace(/\u00a0/g, ' ')
}

// --- Parse runner info from the /all/ page ---

export function parseRunnerData(html: string): RunnerInfo {
	// Name: <h2>Josh THOMPSON&nbsp;<span title="parkrun ID">(A8070821)</span></h2>
	// The ID span has to be there for us to trust the heading — a blocked or
	// error page can carry an unrelated <h2>, and callers use the "Unknown"
	// name as their signal to retry.
	const heading = html.match(/<h2>([\s\S]*?)<\/h2>/)?.[1] ?? ''
	const idMatch = heading.match(/\(\s*A?(\d+)\s*\)/)
	const headingName = decodeEntities(stripTags(heading))
		.replace(/\(\s*A?\d+\s*\)/, '')
		.trim()
	const name = idMatch && headingName ? headingName : 'Unknown'

	// Total runs: <h3>136 parkruns total</h3>  or  <h3>\n  136 parkruns totalt\n</h3>
	// With junior parkruns: <h3>10 parkruns &amp; 4 junior parkruns totalt</h3>
	const totalMatch = html.match(
		/<h3>\s*(\d+)\s*parkruns?\s*(?:&amp;|&)?\s*(?:(\d+)\s*junior\s*parkruns?\s*)?total/i,
	)
	const totalRuns = totalMatch ? Number.parseInt(totalMatch[1], 10) : 0
	const totalJuniorRuns = totalMatch?.[2]
		? Number.parseInt(totalMatch[2], 10)
		: 0

	return {
		name,
		parkrunId: idMatch ? idMatch[1] : '',
		totalRuns,
		totalJuniorRuns,
	}
}

// --- Parse all run results from the /all/ page ---

/**
 * The `<tbody>` blocks that could hold the all-results table, best candidate
 * first. The page also carries a summary-statistics and a yearly-bests table
 * with the same `id="results"`, and the caption naming the right one is
 * localised ("All Results" / "– Alla resultat"), so we try the English caption
 * first and then fall back to every results table, last one first (the
 * all-results table is the last on the page).
 */
function findResultTbodies(html: string): string[] {
	const candidates: string[] = []

	const captionMatch = html.match(
		/All\s+Results\s*<\/caption>[\s\S]*?<tbody[^>]*>([\s\S]*?)<\/tbody>/i,
	)
	if (captionMatch) candidates.push(captionMatch[1])

	const tables = [
		...html.matchAll(/<table[^>]*id="results"[^>]*>([\s\S]*?)<\/table>/gi),
	]
	for (const table of tables.reverse()) {
		const tbody = table[1].match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i)
		candidates.push(tbody ? tbody[1] : table[1])
	}

	return candidates
}

export function parseRunResults(html: string): RunResult[] {
	for (const tbody of findResultTbodies(html)) {
		const results = parseResultRows(tbody)
		if (results.length > 0) return results
	}
	return []
}

function parseResultRows(tbody: string): RunResult[] {
	const results: RunResult[] = []

	// Match each row: <tr class="..."><td>...</td><td>...</td>...</tr>
	const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi

	for (const rowMatch of tbody.matchAll(rowRegex)) {
		const row = rowMatch[1]

		// Extract cells
		const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi
		const cells: string[] = []
		for (const cellMatch of row.matchAll(cellRegex)) {
			cells.push(cellMatch[1])
		}

		// Columns: Event, Run Date, Run Number, Pos, Time, Age Grade, PB?
		if (cells.length < 6) continue

		// Event name + URL: <a href="https://www.parkrun.se/haga/results/394/">Haga</a>
		const eventLinkMatch = cells[0].match(
			/<a\s+href="([^"]+)"[^>]*>([^<]+)<\/a>/,
		)
		const eventUrl = eventLinkMatch ? eventLinkMatch[1].trim() : ''
		const eventName = eventLinkMatch
			? decodeEntities(eventLinkMatch[2]).trim()
			: decodeEntities(stripTags(cells[0]))

		// Only the all-results table links each row to an event's results page —
		// this is what rules out the statistics tables sharing id="results".
		if (!/\/results\//.test(eventUrl)) continue

		// Derive eventId from URL (e.g. "haga" from ".../haga/results/394/")
		const eventIdMatch = eventUrl.match(/\/([^/]+)\/results\//)
		const event = eventIdMatch
			? eventIdMatch[1]
			: eventName.toLowerCase().replace(/[^a-z0-9]/g, '')

		// Run Date: <a href="..."><span class="format-date">07/03/2026</span></a>
		// Saved pages may carry an already-ISO date instead, depending on which
		// locale reformatted the cell.
		const date = parseResultDate(cells[1])

		// Run Number: <a href="...">394</a>
		const eventNumber = Number.parseInt(stripTags(cells[2]), 10) || 0

		// Position
		const position = Number.parseInt(stripTags(cells[3]), 10) || 0

		// Time (e.g. "19:39" or "01:08:30")
		const time = stripTags(cells[4])

		// Age Grade (e.g. "67.09%")
		const ageGrade = stripTags(cells[5])

		if (eventName && time) {
			results.push({
				event,
				eventName,
				eventUrl,
				eventNumber,
				position,
				time,
				ageGrade,
				date,
			})
		}
	}

	return results
}

/** Read a run date cell as YYYY-MM-DD. Accepts DD/MM/YYYY and YYYY-MM-DD. */
function parseResultDate(cell: string): string {
	const dmy = cell.match(/>(\d{2})\/(\d{2})\/(\d{4})</)
	if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`

	const iso = cell.match(/>(\d{4}-\d{2}-\d{2})</)
	if (iso) return iso[1]

	return stripTags(cell)
}

// --- Parse the "largest clubs" league table ---
// Parses https://www.parkrun.se/results/largestclubs/
// Columns: Klubb | (spacer) | Antal deltagare | Antal starter | Klubbens hemsida

export interface LargestClubEntry {
	/** parkrun's internal club id, from the `#featureClub=50310` anchor. */
	clubId?: string
	name: string
	/** "Antal deltagare" — distinct club members who have run. */
	members: number
	/** "Antal starter" — total runs started by club members. */
	events: number
}

export function parseLargestClubs(html: string): LargestClubEntry[] {
	const entries: LargestClubEntry[] = []

	const tableMatch = html.match(
		/<table[^>]*id="results"[^>]*>[\s\S]*?<tbody[^>]*>([\s\S]*?)<\/tbody>/i,
	)
	if (!tableMatch) return entries

	const tbody = tableMatch[1]

	for (const rowMatch of tbody.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
		const cells: string[] = []
		for (const cellMatch of rowMatch[1].matchAll(
			/<td[^>]*>([\s\S]*?)<\/td>/gi,
		)) {
			cells.push(cellMatch[1])
		}

		if (cells.length < 4) continue

		const name = decodeEntities(stripTags(cells[0]))
		if (!name) continue

		const clubIdMatch = cells[0].match(/#featureClub=(\d+)/)
		const members = Number.parseInt(stripTags(cells[2]), 10)
		const events = Number.parseInt(stripTags(cells[3]), 10)

		if (Number.isNaN(members) || Number.isNaN(events)) continue

		entries.push({
			clubId: clubIdMatch ? clubIdMatch[1] : undefined,
			name,
			members,
			events,
		})
	}

	return entries
}

// --- Types for event page parsing ---

export interface EventHistoryEntry {
	eventNumber: number
	date: string // YYYY-MM-DD
}

export interface VolunteerEntry {
	parkrunId: string
	roles: string[]
}

// --- Parse event history page ---
// Parses https://www.parkrun.se/haga/results/eventhistory/
// Each row: <tr class="Results-table-row" data-parkrun="396" data-date="2026-03-21" ...>

export function parseEventHistory(html: string): EventHistoryEntry[] {
	const entries: EventHistoryEntry[] = []

	const rowRegex =
		/<tr\s+class="Results-table-row"[^>]*data-parkrun="(\d+)"[^>]*data-date="(\d{4}-\d{2}-\d{2})"[^>]*>/gi

	for (const match of html.matchAll(rowRegex)) {
		entries.push({
			eventNumber: Number.parseInt(match[1], 10),
			date: match[2],
		})
	}

	// Sort descending by event number (most recent first)
	entries.sort((a, b) => b.eventNumber - a.eventNumber)
	return entries
}

// --- Parse event date from a single event results page ---
// With Swedish locale (sv-SE) the format-date span contains YYYY-MM-DD.

export function parseEventDate(html: string): string {
	const match = html.match(
		/<span\s+class="format-date">(\d{4}-\d{2}-\d{2})<\/span>/,
	)
	return match ? match[1] : ''
}

// --- Parse the identity of a single event results page ---
// The scraping scripts already know which event page they asked for; the manual
// upload page has to read it back off the file it was handed.
//
//   <h1>Haga parkrun</h1>
//   <h3><span class="format-date">2026-08-01</span> … <span>#415</span></h3>

export interface EventPageMeta {
	/** eventId from the in-page athlete links, e.g. "haga". Empty if not found. */
	eventId: string
	/** Event title, e.g. "Haga parkrun". Empty if not found. */
	title: string
	/** Event number, e.g. 415. Zero if not found. */
	eventNumber: number
	/** YYYY-MM-DD, or empty if not found. */
	date: string
}

export function parseEventPageMeta(html: string): EventPageMeta {
	const title = decodeEntities(
		stripTags(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? ''),
	)

	// Athlete links on the page are event-relative: /haga/parkrunner/6148794
	const eventId = html.match(/href="\/([^/"]+)\/parkrunner\//)?.[1] ?? ''

	const numberMatch = html.match(/<span>\s*#(\d+)\s*<\/span>/)

	return {
		eventId,
		title,
		eventNumber: numberMatch ? Number.parseInt(numberMatch[1], 10) : 0,
		date: parseEventDate(html),
	}
}

// --- Parse volunteers from a single event results page ---
// Finds tracked athletes in the Volunteers-table and extracts their roles.
// Each volunteer row: <tr class="Volunteers-table-row" ... data-role="Funktionär,Resultatsansvarig," ...>
//   with <a href="/haga/parkrunner/{parkrunId}" ...>

export function parseEventVolunteers(
	html: string,
	trackedIds: Set<string>,
): VolunteerEntry[] {
	const volunteers: VolunteerEntry[] = []

	// Find the volunteers table section
	const tableMatch = html.match(
		/class="Volunteers-table[^"]*js-VolunteersTable[^"]*"[\s\S]*?<tbody[^>]*>([\s\S]*?)<\/tbody>/i,
	)
	if (!tableMatch) return volunteers

	const tbody = tableMatch[1]

	// Match each volunteer row
	const rowRegex =
		/<tr\s+class="Volunteers-table-row"[^>]*data-role="([^"]*)"[^>]*>([\s\S]*?)<\/tr>/gi

	for (const match of tbody.matchAll(rowRegex)) {
		const dataRole = match[1]
		const rowHtml = match[2]

		// Extract parkrunId from the link
		const idMatch = rowHtml.match(/\/parkrunner\/(\d+)/)
		if (!idMatch) continue

		const parkrunId = idMatch[1]
		if (!trackedIds.has(parkrunId)) continue

		// Parse roles from data-role (comma-separated, trailing comma)
		const roles = dataRole
			.split(',')
			.map((r) => r.trim())
			.filter((r) => r.length > 0)

		volunteers.push({ parkrunId, roles })
	}

	return volunteers
}
