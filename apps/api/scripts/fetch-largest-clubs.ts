/**
 * Playwright script to fetch the parkrun Sweden "largest clubs" league table and
 * POST it to Convex as this week's snapshot.
 *
 * Each run stores one row per club, stamped with the Saturday on or before
 * today, so re-running mid-week overwrites that week rather than duplicating it.
 *
 * Usage:
 *   npx tsx scripts/fetch-largest-clubs.ts
 *   npx tsx scripts/fetch-largest-clubs.ts --env=prod
 *
 *   # Dry run (show what would be scraped and ingested, no requests made):
 *   npx tsx scripts/fetch-largest-clubs.ts --dry
 *
 *   # Parse a saved copy of the page instead of fetching it (still ingests):
 *   npx tsx scripts/fetch-largest-clubs.ts --file="resultat _ parkrun Sweden.html"
 *
 * Requires: playwright (install chromium with `npx playwright install chromium`)
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
	type LargestClubEntry,
	parseLargestClubs,
} from '../../../libs/shared/parkrun-parsers'
import { fetchPage, launchBrowser, loadEnv, requireEnvVars } from './shared'

const LARGEST_CLUBS_URL = 'https://www.parkrun.se/results/largestclubs/'
const SCOOP_BUS_CLUB_NAME = 'Scoop Bus Run Club'
const DAY_MS = 24 * 60 * 60 * 1000

// --- Env file loading ---

loadEnv(import.meta.url)
const { convexSiteUrl: CONVEX_SITE_URL, ingestSecret: INGEST_SECRET } =
	requireEnvVars()

// --- CLI flags ---

const isDryRun = process.argv.includes('--dry')
const fileArg = process.argv.find((a) => a.startsWith('--file='))
const localFile = fileArg ? fileArg.slice('--file='.length) : null

/** The Saturday on or before `timestamp`, as YYYY-MM-DD (UTC). */
function snapshotWeek(timestamp: number): string {
	// getUTCDay: Sun=0 … Sat=6. Days elapsed since the most recent Saturday.
	const daysSinceSaturday = (new Date(timestamp).getUTCDay() + 1) % 7
	return new Date(timestamp - daysSinceSaturday * DAY_MS)
		.toISOString()
		.slice(0, 10)
}

async function loadHtml(): Promise<string> {
	if (localFile) {
		const path = resolve(process.cwd(), localFile)
		console.log(`Reading local file: ${path}`)
		return readFileSync(path, 'utf-8')
	}

	const { browser, context } = await launchBrowser()
	try {
		console.log(`Fetching ${LARGEST_CLUBS_URL}...`)
		return await fetchPage(context, LARGEST_CLUBS_URL)
	} finally {
		await browser.close()
	}
}

async function main() {
	const week = snapshotWeek(Date.now())
	console.log(`Snapshot week: ${week}`)

	if (isDryRun) {
		console.log('[DRY RUN] No requests will be made.\n')
		console.log(`Would fetch: GET ${LARGEST_CLUBS_URL}`)
		console.log(
			`Would POST the parsed league table to: ${CONVEX_SITE_URL}/api/ingest-largest-clubs`,
		)
		return
	}

	const html = await loadHtml()
	const clubs: LargestClubEntry[] = parseLargestClubs(html)

	console.log(`Parsed ${clubs.length} club(s) from the league table.`)

	if (clubs.length === 0) {
		console.error(
			'✗ No clubs parsed — the page layout may have changed. Nothing ingested.',
		)
		process.exit(1)
	}

	const byEvents = [...clubs].sort((a, b) => b.events - a.events)
	console.log('\nTop 5 by total runs:')
	for (const [i, club] of byEvents.slice(0, 5).entries()) {
		console.log(
			`  ${i + 1}. ${club.name} — ${club.events} runs, ${club.members} members`,
		)
	}

	const scoopBusIndex = byEvents.findIndex(
		(c) => c.name.trim().toLowerCase() === SCOOP_BUS_CLUB_NAME.toLowerCase(),
	)
	if (scoopBusIndex === -1) {
		console.warn(`\n⚠ ${SCOOP_BUS_CLUB_NAME} not found in the league table.`)
	} else {
		const scoopBus = byEvents[scoopBusIndex]
		console.log(
			`\n${SCOOP_BUS_CLUB_NAME}: #${scoopBusIndex + 1} by runs — ${scoopBus.events} runs, ${scoopBus.members} members`,
		)
	}

	console.log(`\nIngesting ${clubs.length} club snapshot(s) into Convex...`)

	const response = await fetch(`${CONVEX_SITE_URL}/api/ingest-largest-clubs`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${INGEST_SECRET}`,
		},
		body: JSON.stringify({ week, clubs }),
	})

	if (!response.ok) {
		const text = await response.text()
		console.error(`Ingest failed (${response.status}): ${text}`)
		process.exit(1)
	}

	const result = await response.json()
	console.log('Ingest response:', result)

	if (result.estimatedWeeksToLargest === null) {
		console.log(
			`\n${SCOOP_BUS_CLUB_NAME} is not currently projected to become the largest club.`,
		)
	} else {
		console.log(
			`\nEstimated ${result.estimatedWeeksToLargest} week(s) until ${SCOOP_BUS_CLUB_NAME} is the largest club.`,
		)
	}
}

main().catch((error) => {
	console.error('Fatal error:', error)
	process.exit(1)
})
