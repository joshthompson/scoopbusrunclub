/**
 * Runs both fetch-results (athlete results) and fetch-parkrun (parkrun-specific
 * data such as volunteering) sequentially with a pause in between.
 *
 * Usage:
 *   npx tsx scripts/fetch-all.ts
 *   npx tsx scripts/fetch-all.ts --env=prod
 *
 *   # Dry run (passes --dry to both scripts, no pauses):
 *   npx tsx scripts/fetch-all.ts --dry
 */
import { spawn } from 'node:child_process'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PARKRUN_EVENTS } from '../../../libs/shared/parkrun-events'
import { randomDelay, sleep, TRACKED_ATHLETES } from './shared'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Pass through --env, --dry, --all, and --all-for args
const envArg = process.argv.find((a) => a.startsWith('--env='))
const envFlag = envArg ? ` ${envArg}` : ''
const isDryRun = process.argv.includes('--dry')
const dryFlag = isDryRun ? ' --dry' : ''
const hasAll = process.argv.includes('--all')
const allFlag = hasAll ? ' --all' : ''
const allForArg = process.argv.find((a) => a.startsWith('--all-for='))
const allForFlag = allForArg ? ` ${allForArg}` : ''

const BAR_WIDTH = 30
const REQUEST_ESTIMATE_MS = 2_000
const BETWEEN_SCRIPT_DELAY_MS = { min: 15_000, max: 30_000 }

function buildWaitDurations(count: number): number[] {
	if (isDryRun || count <= 0) return []
	const waits: number[] = []
	for (let i = 0; i < count; i++) {
		waits.push(randomDelay(BETWEEN_SCRIPT_DELAY_MS))
	}
	return waits
}

const resultsWaitDurations = buildWaitDurations(
	Math.max(0, TRACKED_ATHLETES.length - 1),
)
const betweenScriptDelay = isDryRun ? 0 : randomDelay(BETWEEN_SCRIPT_DELAY_MS)
const parkrunInterEventWaitDurations = buildWaitDurations(
	Math.max(0, PARKRUN_EVENTS.length - 1),
)

type ProgressState = {
	startedAt: number
	resultsStarted: number
	resultsTotal: number
	parkrunChecksCompleted: number
	parkrunChecksTotal: number
	parkrunScrapeStarted: number
	parkrunScrapeTotal: number
	plannedTotalMs: number
	plannedWaitTotalMs: number
	completedWaitMs: number
	activeRequestStartedAt: number | null
	activeWaitStartedAt: number | null
	activeWaitDurationMs: number
	progressInterval: NodeJS.Timeout | null
}

const progress: ProgressState = {
	startedAt: Date.now(),
	resultsStarted: 0,
	resultsTotal: TRACKED_ATHLETES.length,
	parkrunChecksCompleted: 0,
	parkrunChecksTotal: PARKRUN_EVENTS.length,
	parkrunScrapeStarted: 0,
	parkrunScrapeTotal: 0,
	plannedTotalMs: 0,
	plannedWaitTotalMs: 0,
	completedWaitMs: 0,
	activeRequestStartedAt: null,
	activeWaitStartedAt: null,
	activeWaitDurationMs: 0,
	progressInterval: null,
}

const parkrunEventIds = new Set(PARKRUN_EVENTS.map((e) => e.eventId))
const checkedParkrunEvents = new Set<string>()
const parkrunScrapeByEvent = new Map<string, { done: number; total: number }>()
const parkrunEventsWithResolvedChecks = new Set<string>()
let renderedProgressLength = 0

function formatDuration(ms: number): string {
	const totalSec = Math.max(0, Math.round(ms / 1000))
	const min = Math.floor(totalSec / 60)
	const sec = totalSec % 60
	if (min === 0) return `${sec}s`
	return `${min}m ${sec.toString().padStart(2, '0')}s`
}

function getPlannedRequestCount(): number {
	return (
		progress.resultsTotal +
		progress.parkrunChecksTotal +
		progress.parkrunScrapeTotal
	)
}

function getStartedRequestCount(): number {
	return (
		progress.resultsStarted +
		progress.parkrunChecksCompleted +
		progress.parkrunScrapeStarted
	)
}

function getExpectedElapsedMs(now: number): number {
	const startedRequests = getStartedRequestCount()
	let completedRequestEstimateMs = startedRequests * REQUEST_ESTIMATE_MS

	let currentRequestMs = 0
	if (progress.activeRequestStartedAt !== null) {
		const activeElapsed = Math.max(0, now - progress.activeRequestStartedAt)
		currentRequestMs = Math.min(REQUEST_ESTIMATE_MS, activeElapsed)
		completedRequestEstimateMs -= REQUEST_ESTIMATE_MS
	}

	let currentWaitMs = 0
	if (progress.activeWaitStartedAt !== null) {
		const waitElapsed = Math.max(0, now - progress.activeWaitStartedAt)
		currentWaitMs = Math.min(progress.activeWaitDurationMs, waitElapsed)
	}

	return (
		progress.completedWaitMs +
		completedRequestEstimateMs +
		currentRequestMs +
		currentWaitMs
	)
}

function getOverallFraction(now: number): number {
	if (progress.plannedTotalMs <= 0) return 0
	const expectedElapsedMs = getExpectedElapsedMs(now)
	return Math.min(1, expectedElapsedMs / progress.plannedTotalMs)
}

function clearProgressLine() {
	if (!process.stdout.isTTY) return
	process.stdout.write(`\r${' '.repeat(renderedProgressLength)}\r`)
}

function renderProgress() {
	const now = Date.now()
	const fraction = getOverallFraction(now)
	const percent = Math.min(100, Math.max(0, Math.round(fraction * 100)))
	const filled = Math.round((BAR_WIDTH * percent) / 100)
	const bar = `${'█'.repeat(filled)}${'░'.repeat(BAR_WIDTH - filled)}`

	const expectedElapsedMs = getExpectedElapsedMs(now)
	const remainingMs = Math.max(0, progress.plannedTotalMs - expectedElapsedMs)
	const etaLabel = formatDuration(remainingMs)
	const line = `Progress [${bar}] ${percent}% | ETA ${etaLabel}`

	if (process.stdout.isTTY) {
		process.stdout.write(`\r${line}`)
		renderedProgressLength = line.length
		return
	}

	console.log(line)
}

function flushProgressLine() {
	if (!process.stdout.isTTY) return
	clearProgressLine()
	renderedProgressLength = 0
}

function completeActiveWait() {
	if (progress.activeWaitStartedAt !== null) {
		progress.completedWaitMs += progress.activeWaitDurationMs
		progress.activeWaitStartedAt = null
		progress.activeWaitDurationMs = 0
	}
}

function startActiveWait(durationMs: number) {
	completeActiveWait()
	progress.activeWaitStartedAt = Date.now()
	progress.activeWaitDurationMs = durationMs
}

function startActiveRequestTimer() {
	completeActiveWait()
	progress.activeRequestStartedAt = Date.now()
}

function stopActiveRequestTimer() {
	if (progress.activeRequestStartedAt === null) return
	progress.activeRequestStartedAt = null
}

function startProgressInterval() {
	if (progress.progressInterval) return
	progress.progressInterval = setInterval(() => {
		renderProgress()
	}, 1000)
}

function stopProgressInterval() {
	if (!progress.progressInterval) return
	clearInterval(progress.progressInterval)
	progress.progressInterval = null
}

function completeWait(durationMs: number) {
	if (durationMs <= 0) return
	progress.completedWaitMs += durationMs
	renderProgress()
}

function parseWaitLine(line: string): number | null {
	const match = line.match(/Waiting\s+([\d.]+)s\s+before next fetch/)
	if (!match) return null
	return Math.round(Number.parseFloat(match[1]) * 1000)
}

function updateResultsProgress(line: string) {
	const waitMs = parseWaitLine(line)
	if (waitMs !== null) {
		stopActiveRequestTimer()
		startActiveWait(waitMs)
		renderProgress()
		return
	}

	const match = line.match(/^(\d+)\/(\d+):\s+Fetching results for\s+/)
	if (!match) return

	progress.resultsStarted = Number.parseInt(match[1], 10)
	progress.resultsTotal = Number.parseInt(match[2], 10)
	startActiveRequestTimer()
	renderProgress()
}

function updateParkrunProgress(line: string) {
	const waitMs = parseWaitLine(line)
	if (waitMs !== null) {
		stopActiveRequestTimer()
		startActiveWait(waitMs)
		renderProgress()
		return
	}

	const statusMatch = line.match(/^\s*([a-z0-9-]+):\s+(.*)$/i)
	if (statusMatch) {
		const eventId = statusMatch[1]
		const message = statusMatch[2]
		if (
			parkrunEventIds.has(eventId) &&
			(message.includes('no new events') ||
				message.includes('new events to scrape'))
		) {
			checkedParkrunEvents.add(eventId)
			if (!parkrunEventsWithResolvedChecks.has(eventId)) {
				parkrunEventsWithResolvedChecks.add(eventId)
				progress.parkrunChecksCompleted = parkrunEventsWithResolvedChecks.size
			}
			if (message.includes('new events to scrape')) {
				stopActiveRequestTimer()
			}
			renderProgress()
		}
	}

	const scrapeMatch = line.match(
		/\s*Scraping\s+([a-z0-9-]+)\s+#\d+\s+\((\d+)\/(\d+)\)\.\.\./i,
	)
	if (!scrapeMatch) return

	const eventId = scrapeMatch[1]
	const done = Number.parseInt(scrapeMatch[2], 10)
	const total = Number.parseInt(scrapeMatch[3], 10)

	startActiveRequestTimer()
	parkrunScrapeByEvent.set(eventId, { done, total })

	let scrapeDone = 0
	let scrapeTotal = 0
	for (const value of parkrunScrapeByEvent.values()) {
		scrapeDone += value.done
		scrapeTotal += value.total
	}

	progress.parkrunScrapeStarted = scrapeDone
	progress.parkrunScrapeTotal = scrapeTotal
	progress.plannedTotalMs =
		progress.plannedWaitTotalMs + getPlannedRequestCount() * REQUEST_ESTIMATE_MS
	renderProgress()
}

function handleScriptLine(script: 'results' | 'parkrun', line: string) {
	if (!line.trim()) return

	if (script === 'results') {
		updateResultsProgress(line)
	} else {
		updateParkrunProgress(line)
	}

	flushProgressLine()
	console.log(line)
	renderProgress()
}

async function runScriptWithStreamingOutput(
	scriptPath: string,
	args: string,
	script: 'results' | 'parkrun',
) {
	return new Promise<void>((resolve, reject) => {
		const child = spawn(
			'npx',
			['tsx', scriptPath, ...args.trim().split(/\s+/).filter(Boolean)],
			{
				cwd: dirname(__dirname),
				stdio: ['ignore', 'pipe', 'pipe'],
			},
		)

		let stdoutBuffer = ''
		let stderrBuffer = ''

		child.stdout.on('data', (chunk: Buffer) => {
			stdoutBuffer += chunk.toString()
			const lines = stdoutBuffer.split(/\r?\n/)
			stdoutBuffer = lines.pop() ?? ''
			for (const line of lines) {
				handleScriptLine(script, line)
			}
		})

		child.stderr.on('data', (chunk: Buffer) => {
			stderrBuffer += chunk.toString()
			const lines = stderrBuffer.split(/\r?\n/)
			stderrBuffer = lines.pop() ?? ''
			for (const line of lines) {
				if (!line.trim()) continue
				flushProgressLine()
				console.error(line)
				renderProgress()
			}
		})

		child.on('close', (code) => {
			stopActiveRequestTimer()
			completeActiveWait()
			if (stdoutBuffer.trim()) {
				handleScriptLine(script, stdoutBuffer)
			}
			if (stderrBuffer.trim()) {
				flushProgressLine()
				console.error(stderrBuffer)
				renderProgress()
			}

			if (code === 0) {
				resolve()
			} else {
				reject(new Error(`${scriptPath} exited with code ${code}`))
			}
		})

		child.on('error', (error) => reject(error))
	})
}

async function main() {
	progress.plannedWaitTotalMs =
		resultsWaitDurations.reduce((sum, ms) => sum + ms, 0) +
		betweenScriptDelay +
		parkrunInterEventWaitDurations.reduce((sum, ms) => sum + ms, 0)
	progress.plannedTotalMs =
		progress.plannedWaitTotalMs + getPlannedRequestCount() * REQUEST_ESTIMATE_MS

	startProgressInterval()
	renderProgress()

	// --- Step 1: fetch-results (athlete run results) ---
	flushProgressLine()
	console.log('='.repeat(60))
	console.log('Step 1: Running fetch-results (athlete results)...')
	console.log('='.repeat(60))
	renderProgress()

	try {
		await runScriptWithStreamingOutput(
			'scripts/fetch-results.ts',
			`${envFlag}${dryFlag}${allFlag}${allForFlag}`,
			'results',
		)
		progress.resultsStarted = progress.resultsTotal
		stopActiveRequestTimer()
		renderProgress()
	} catch (error) {
		stopProgressInterval()
		flushProgressLine()
		console.error(
			'\n✗ fetch-results exited with an error. See output above for details.',
		)
		process.exit(1)
	}

	// --- Pause ---
	if (!isDryRun) {
		const delay = betweenScriptDelay
		flushProgressLine()
		console.log(`\nPausing ${(delay / 1000).toFixed(1)}s between scripts...\n`)
		await sleep(delay)
		completeWait(delay)
		renderProgress()
	}

	// --- Step 2: fetch-parkrun (parkrun-specific: volunteers) ---
	flushProgressLine()
	console.log('='.repeat(60))
	console.log('Step 2: Running fetch-parkrun (volunteers)...')
	console.log('='.repeat(60))
	renderProgress()

	try {
		await runScriptWithStreamingOutput(
			'scripts/fetch-parkrun.ts',
			`${envFlag}${dryFlag}`,
			'parkrun',
		)
		progress.parkrunChecksCompleted = progress.parkrunChecksTotal
		if (progress.parkrunScrapeTotal > 0) {
			progress.parkrunScrapeStarted = progress.parkrunScrapeTotal
		}
		stopActiveRequestTimer()
		progress.plannedTotalMs =
			progress.plannedWaitTotalMs +
			getPlannedRequestCount() * REQUEST_ESTIMATE_MS
		renderProgress()
	} catch (error) {
		stopProgressInterval()
		flushProgressLine()
		console.error(
			'\n✗ fetch-parkrun exited with an error. See output above for details.',
		)
		process.exit(1)
	}

	stopProgressInterval()
	flushProgressLine()
	console.log(
		`Progress [${'█'.repeat(BAR_WIDTH)}] 100% | ETA 0s | Total ${formatDuration(
			Date.now() - progress.startedAt,
		)}`,
	)
	console.log('\n✓ fetch-all complete.')
}

main().catch((error) => {
	console.error('Fatal error:', error)
	process.exit(1)
})
