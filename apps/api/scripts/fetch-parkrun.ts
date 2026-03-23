/**
 * Playwright script to fetch Parkrun athlete pages and POST parsed data to Convex.
 *
 * Usage:
 *   # Load from .env.local (default):
 *   npx tsx scripts/fetch-parkrun.ts
 *
 *   # Load from .env.prod (upload to production):
 *   npx tsx scripts/fetch-parkrun.ts --env=prod
 *
 * Requires: playwright (install chromium with `npx playwright install chromium`)
 */
import {
  parseRunnerData,
  parseRunResults,
  extractEvents,
  type RunnerInfo,
  type RunResult,
  type EventInfo,
} from "../lib/parsers";
import {
  TRACKED_ATHLETES,
  DELAY_BETWEEN_FETCHES_MS,
  loadEnv,
  requireEnvVars,
  randomDelay,
  sleep,
  launchBrowser,
  fetchPage,
} from "./shared";

// --- Env file loading ---

loadEnv(import.meta.url);
const { convexSiteUrl: CONVEX_SITE_URL, ingestSecret: INGEST_SECRET } = requireEnvVars();

// --- Types matching the ingest endpoint ---

interface IngestPayload {
  athletes: {
    parkrunId: string;
    runner: RunnerInfo;
    runResults: RunResult[];
  }[];
  events: EventInfo[];
  appData?: Record<string, string>;
}

// --- Main ---

async function main() {
  const { browser, context } = await launchBrowser();

  const payload: IngestPayload = { athletes: [], events: [] };

  /** Collect all events across athletes, deduplicating by eventId */
  const allEvents = new Map<string, EventInfo>();

  /** Track the latest run result date across all athletes */
  let latestResultDate = "";

  for (const { parkrunId, name } of TRACKED_ATHLETES) {
    console.log(`Fetching results for ${name} (${parkrunId})...`);

    try {
      // Fetch all results page — runner info + full run history
      const allResultsUrl = `https://www.parkrun.org.uk/parkrunner/${parkrunId}/all/`;
      const allHtml = await fetchPage(context, allResultsUrl);

      // Parse
      const runner = parseRunnerData(allHtml);
      const runResults = parseRunResults(allHtml);

      console.log(`  → ${runner.name}: ${runner.totalRuns} runs, ${runner.totalJuniorRuns} junior runs, ${runResults.length} run results`);
      console.log(`    ${runner.totalRuns} runs`);
      if (runner.totalJuniorRuns) {
        console.log(`    ${runner.totalJuniorRuns} junior runs`);
      }
      console.log(`    ${runResults.length} run results`);

      // Track the latest result date
      for (const result of runResults) {
        if (result.date > latestResultDate) {
          latestResultDate = result.date;
        }
      }

      // Extract unique events from this athlete's results
      const events = extractEvents(runResults);
      for (const event of events) {
        if (!allEvents.has(event.eventId)) {
          allEvents.set(event.eventId, event);
        }
      }

      payload.athletes.push({
        parkrunId,
        runner,
        runResults,
      });
    } catch (error) {
      console.error(`  ✗ Error fetching ${name} (${parkrunId}):`, error);
    }

    // Pause between athletes to avoid being blocked by the server
    if (parkrunId !== TRACKED_ATHLETES[TRACKED_ATHLETES.length - 1].parkrunId) {
      const delay = randomDelay(DELAY_BETWEEN_FETCHES_MS);
      console.log(`  Waiting ${(delay / 1000).toFixed(1)}s before next fetch...`);
      await sleep(delay);
    }
  }

  await browser.close();

  // Attach deduplicated events to payload
  payload.events = Array.from(allEvents.values());
  console.log(`\nCollected ${payload.events.length} unique event(s).`);

  if (payload.athletes.length === 0) {
    console.log("No athlete data fetched, skipping ingest.");
    return;
  }

  // Store the latest result date so fetch-haga can reference it
  if (latestResultDate) {
    payload.appData = { latestResultsScrapeDate: latestResultDate };
    console.log(`Latest result date: ${latestResultDate}`);
  }

  // POST to Convex ingest endpoint
  console.log(`\nIngesting ${payload.athletes.length} athlete(s) into Convex...`);

  const ingestUrl = `${CONVEX_SITE_URL}/api/ingest`;
  const response = await fetch(ingestUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${INGEST_SECRET}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Ingest failed (${response.status}): ${text}`);
    process.exit(1);
  }

  const result = await response.json();
  console.log("Ingest response:", result);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
