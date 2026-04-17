/**
 * Playwright script to fetch Parkrun athlete pages and POST parsed data to Convex.
 *
 * By default, only results from the last 6 weeks are ingested (since older
 * results can no longer be adjusted by parkrun).
 *
 * Usage:
 *   # Load from .env.local (default):
 *   npx tsx scripts/fetch-parkrun.ts
 *
 *   # Ingest full history:
 *   npx tsx scripts/fetch-parkrun.ts --all
 *
 *   # Load from .env.prod (upload to production):
 *   npx tsx scripts/fetch-results.ts --env=prod
 *
 *   # Dry run (show what would be fetched without making requests):
 *   npx tsx scripts/fetch-results.ts --dry
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
import { scrapeCourseMap } from "../lib/map-scraper";

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

// --- CLI flags ---

const ingestAll = process.argv.includes("--all");
const isDryRun = process.argv.includes("--dry");

/** Cutoff date: only ingest results from the last 6 weeks (unless --all) */
function getCutoffDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 42); // 6 weeks
  return d.toISOString().split("T")[0];
}

async function main() {
  if (isDryRun) console.log("[DRY RUN] No requests will be made.\n");

  if (ingestAll) {
    console.log("Running with --all: ingesting full run history.");
  } else {
    console.log(`Ingesting results from the last 6 weeks (since ${getCutoffDate()}). Use --all for full history.`);
  }

  if (isDryRun) {
    console.log("\nWould fetch the following URLs:");
    for (const { parkrunId, name } of TRACKED_ATHLETES) {
      console.log(`  GET https://www.parkrun.org.uk/parkrunner/${parkrunId}/all/  (${name})`);
    }
    console.log(`\nWould POST results to: ${CONVEX_SITE_URL}/api/ingest`);
    return;
  }

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

      const filteredResults = ingestAll
        ? runResults
        : runResults.filter((r) => r.date >= getCutoffDate());

      if (!ingestAll && filteredResults.length < runResults.length) {
        console.log(`    ${filteredResults.length} of ${runResults.length} results within 6-week window`);
      }

      payload.athletes.push({
        parkrunId,
        runner,
        runResults: filteredResults,
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

  // --- Fetch course maps for events that don't have one yet ---

  payload.events = Array.from(allEvents.values());
  console.log(`\nCollected ${payload.events.length} unique event(s).`);

  if (!isDryRun && payload.events.length > 0) {
    try {
      const coursesRes = await fetch(`${CONVEX_SITE_URL}/api/courses`, {
        headers: { Authorization: `Bearer ${INGEST_SECRET}` },
      });
      const existingCourseEventIds: string[] = await coursesRes.json();
      const existingCourseSet = new Set(existingCourseEventIds);

      const eventsNeedingCourse = payload.events.filter(
        (e) => !existingCourseSet.has(e.eventId),
      );

      if (eventsNeedingCourse.length > 0) {
        console.log(
          `\nFound ${eventsNeedingCourse.length} event(s) without course data. Fetching maps...`,
        );

        for (const event of eventsNeedingCourse) {
          try {
            const result = await scrapeCourseMap(context, event.url);
            if (result) {
              const courseRes = await fetch(
                `${CONVEX_SITE_URL}/api/ingest-course`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${INGEST_SECRET}`,
                  },
                  body: JSON.stringify({
                    eventId: event.eventId,
                    coordinates: result.courseData.coordinates,
                    points: result.courseData.points,
                  }),
                },
              );
              if (courseRes.ok) {
                console.log(
                  `  ✓ Course data stored for ${event.eventId}`,
                );
              } else {
                console.warn(
                  `  ⚠ Failed to store course for ${event.eventId}: ${courseRes.status}`,
                );
              }
            }
          } catch (error) {
            console.error(
              `  ✗ Failed to fetch course map for ${event.eventId}:`,
              error,
            );
          }

          // Delay between course fetches
          if (event !== eventsNeedingCourse[eventsNeedingCourse.length - 1]) {
            const delay = randomDelay(DELAY_BETWEEN_FETCHES_MS);
            console.log(
              `  Waiting ${(delay / 1000).toFixed(1)}s before next fetch...`,
            );
            await sleep(delay);
          }
        }
      }
    } catch (error) {
      console.error("Error checking/fetching course data:", error);
    }
  }

  await browser.close();

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
