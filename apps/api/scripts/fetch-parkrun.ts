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
import { chromium } from "playwright";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  parseRunnerData,
  parseRunResults,
  extractEvents,
  type RunnerInfo,
  type RunResult,
  type EventInfo,
} from "../lib/parsers";

// --- Env file loading ---

const __dirname = dirname(fileURLToPath(import.meta.url));
const envArg = process.argv.find((a) => a.startsWith("--env="));
const envName = envArg ? envArg.split("=")[1] : "local";
const envFile = resolve(__dirname, `../.env.${envName}`);

if (existsSync(envFile)) {
  console.log(`Loading env from: .env.${envName}`);
  const lines = readFileSync(envFile, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (key && !(key in process.env)) {
      process.env[key.trim()] = rest.join("=").trim();
    }
  }
} else {
  console.warn(`Warning: env file not found: ${envFile}`);
}

// --- Config ---

const TRACKED_ATHLETES: { parkrunId: string; name: string }[] = [
  { parkrunId: "8070821", name: "Josh" },
  { parkrunId: "10663604", name: "Alisa" },
  { parkrunId: "7758658", name: "Adam" },
  { parkrunId: "5635044", name: "Keith" },
  { parkrunId: "6076813", name: "Sophie" },
  { parkrunId: "377595", name: "Claire" },
  { parkrunId: "8009111", name: "Lyra" },
  { parkrunId: "545803", name: "August" },
  { parkrunId: "850764", name: "Anna" },
  { parkrunId: "8943925", name: "Eline" },
  { parkrunId: "9679233", name: "Rick" },
  { parkrunId: "5346109", name: "Other Josh" },
];

/** Delay range (in ms) between fetching each athlete's page to avoid rate-limiting. */
const DELAY_BETWEEN_FETCHES_MS = { min: 30_000, max: 60_000 };

/** Number of times to retry a failed page load before giving up. */
const MAX_RETRIES = 4;

const CONVEX_SITE_URL = process.env.CONVEX_SITE_URL;
const INGEST_SECRET = process.env.INGEST_SECRET;

if (!CONVEX_SITE_URL) {
  console.error("Missing CONVEX_SITE_URL environment variable");
  process.exit(1);
}
if (!INGEST_SECRET) {
  console.error("Missing INGEST_SECRET environment variable");
  process.exit(1);
}

// --- Types matching the ingest endpoint ---

interface IngestPayload {
  athletes: {
    parkrunId: string;
    runner: RunnerInfo;
    runResults: RunResult[];
  }[];
  events: EventInfo[];
}

// --- Helpers ---

function randomDelay({ min, max }: { min: number; max: number }): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(
  context: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>["newContext"]>>,
  url: string,
): Promise<string> {
  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(3000);
      const html = await page.content();
      return html;
    } catch (error) {
      if (attempt <= MAX_RETRIES) {
        const backoff = randomDelay({ min: 10_000, max: 20_000 });
        console.log(`  ⟳ Attempt ${attempt} failed, retrying in ${(backoff / 1000).toFixed(1)}s...`);
        await sleep(backoff);
      } else {
        throw error;
      }
    } finally {
      await page.close();
    }
  }
  throw new Error("Unreachable");
}

// --- Main ---

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const payload: IngestPayload = { athletes: [], events: [] };

  /** Collect all events across athletes, deduplicating by eventId */
  const allEvents = new Map<string, EventInfo>();

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
