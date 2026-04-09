/**
 * Playwright script to fetch parkrun event pages and extract volunteer data
 * for tracked club members.
 *
 * Supports multiple parkrun events (e.g. haga, judarskogen). Each event has
 * its own watermark in the appData table: latest{CapitalisedName}EventNumber.
 *
 * Usage:
 *   # Scrape new events for ALL configured parkruns (reads watermarks from DB):
 *   npx tsx scripts/fetch-results.ts
 *   npx tsx scripts/fetch-results.ts --env=prod
 *
 *   # Scrape specific event(s):
 *   npx tsx scripts/fetch-results.ts --event=haga:50
 *   npx tsx scripts/fetch-results.ts --event=haga:1-10
 *   npx tsx scripts/fetch-results.ts --event=judarskogen:10
 *   npx tsx scripts/fetch-results.ts --event=haga:50,judarskogen:10-20
 * *   # Dry run (show what would be fetched without making requests):
 *   npx tsx scripts/fetch-parkrun.ts --dry
 * * Requires: playwright (install chromium with `npx playwright install chromium`)
 */
import {
  parseEventHistory,
  parseEventDate,
  parseEventVolunteers,
} from "../lib/parsers";
import {
  TRACKED_IDS,
  DELAY_BETWEEN_FETCHES_MS,
  loadEnv,
  requireEnvVars,
  randomDelay,
  sleep,
  launchBrowser,
  fetchPage,
  getAppDataValue,
} from "./shared";

// --- Configured parkrun events ---

interface ParkrunEventConfig {
  /** Lowercase event ID used in URLs and DB, e.g. "haga" */
  eventId: string;
  /** parkrun domain for this event */
  baseUrl: string;
}

/**
 * All parkrun events we scrape volunteer data for.
 * To add a new event, just append to this array.
 */
const PARKRUN_EVENTS: ParkrunEventConfig[] = [
  { eventId: "haga", baseUrl: "https://www.parkrun.se/haga" },
  { eventId: "judarskogen", baseUrl: "https://www.parkrun.se/judarskogen" },
];

/** Build the appData key for an event's watermark, e.g. "latestHagaEventNumber" */
function watermarkKey(eventId: string): string {
  const capitalised = eventId.charAt(0).toUpperCase() + eventId.slice(1);
  return `latest${capitalised}EventNumber`;
}

// --- Env file loading ---

loadEnv(import.meta.url);
const { convexSiteUrl: CONVEX_SITE_URL, ingestSecret: INGEST_SECRET } =
  requireEnvVars();

// --- CLI flags ---

const isDryRun = process.argv.includes("--dry");

// --- CLI arg parsing ---

interface EventRange {
  eventId: string;
  start: number;
  end: number;
}

/**
 * Parse the --event CLI arg.
 *
 * Supported formats:
 *   --event=haga:50            → single event number
 *   --event=haga:1-10          → range
 *   --event=judarskogen:10     → single
 *   --event=haga:50,judarskogen:10-20  → multiple, comma-separated
 *
 * Returns null when no --event arg is provided (= automatic mode).
 */
function parseEventArg(): EventRange[] | null {
  const eventArg = process.argv.find((a) => a.startsWith("--event="));
  if (!eventArg) return null;

  const value = eventArg.split("=")[1];
  const segments = value.split(",");
  const ranges: EventRange[] = [];

  for (const segment of segments) {
    const colonIdx = segment.indexOf(":");
    if (colonIdx === -1) {
      console.error(
        `Invalid --event segment: "${segment}". Expected format: eventId:number or eventId:start-end`,
      );
      process.exit(1);
    }

    const eventId = segment.slice(0, colonIdx).trim();
    const rangeStr = segment.slice(colonIdx + 1).trim();

    if (!eventId) {
      console.error(`Missing event ID in segment: "${segment}"`);
      process.exit(1);
    }

    if (rangeStr.includes("-")) {
      const [startStr, endStr] = rangeStr.split("-");
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (isNaN(start) || isNaN(end) || start > end) {
        console.error(
          `Invalid range in --event segment: "${segment}". Expected format: eventId:START-END`,
        );
        process.exit(1);
      }
      ranges.push({ eventId, start, end });
    } else {
      const single = parseInt(rangeStr, 10);
      if (isNaN(single)) {
        console.error(
          `Invalid number in --event segment: "${segment}". Expected format: eventId:NUMBER`,
        );
        process.exit(1);
      }
      ranges.push({ eventId, start: single, end: single });
    }
  }

  return ranges;
}

// --- Types ---

interface VolunteerRecord {
  date: string;
  event: string;
  eventNumber: number;
  parkrunId: string;
  roles: string[];
}

// --- Scrape a single parkrun event ---

async function scrapeEvent(
  config: ParkrunEventConfig,
  eventsToScrape: number[],
): Promise<{ volunteers: VolunteerRecord[]; highestEventNumber: number }> {
  if (isDryRun) {
    console.log(`\n  Would scrape ${eventsToScrape.length} event(s) for ${config.eventId}:`);
    for (const eventNumber of eventsToScrape) {
      console.log(`    GET ${config.baseUrl}/results/${eventNumber}/`);
    }
    return { volunteers: [], highestEventNumber: Math.max(...eventsToScrape, 0) };
  }

  const { browser, context } = await launchBrowser();
  const volunteers: VolunteerRecord[] = [];
  let highestEventNumber = 0;

  for (let i = 0; i < eventsToScrape.length; i++) {
    const eventNumber = eventsToScrape[i];
    const url = `${config.baseUrl}/results/${eventNumber}/`;

    console.log(
      `\n  Scraping ${config.eventId} #${eventNumber} (${i + 1}/${eventsToScrape.length})...`,
    );
    console.log(`    URL: ${url}`);

    try {
      const html = await fetchPage(context, url);

      // Parse date
      const date = parseEventDate(html);
      if (!date) {
        console.warn(
          `    ⚠ Could not extract date for ${config.eventId} #${eventNumber}, skipping.`,
        );
        continue;
      }
      console.log(`    Date: ${date}`);

      // Parse volunteers
      const vols = parseEventVolunteers(html, TRACKED_IDS);
      console.log(`    Found ${vols.length} tracked volunteer(s).`);

      for (const vol of vols) {
        console.log(`      • ${vol.parkrunId}: ${vol.roles.join(", ")}`);
        volunteers.push({
          date,
          event: config.eventId,
          eventNumber,
          parkrunId: vol.parkrunId,
          roles: vol.roles,
        });
      }

      if (eventNumber > highestEventNumber) {
        highestEventNumber = eventNumber;
      }
    } catch (error) {
      console.error(
        `    ✗ Error scraping ${config.eventId} #${eventNumber}:`,
        error,
      );
    }

    // Pause between events
    if (i < eventsToScrape.length - 1) {
      const delay = randomDelay(DELAY_BETWEEN_FETCHES_MS);
      console.log(
        `    Waiting ${(delay / 1000).toFixed(1)}s before next fetch...`,
      );
      await sleep(delay);
    }
  }

  await browser.close();
  return { volunteers, highestEventNumber };
}

/**
 * Determine which event numbers to scrape for a parkrun in automatic mode.
 * Reads the watermark from DB, fetches the event history page, and returns
 * the new event numbers to scrape. Returns empty array if nothing new.
 */
async function resolveAutoEvents(
  config: ParkrunEventConfig,
): Promise<number[]> {
  const key = watermarkKey(config.eventId);

  if (isDryRun) {
    console.log(`  ${config.eventId}: would read watermark "${key}" from DB`);
    console.log(`  ${config.eventId}: would fetch ${config.baseUrl}/results/eventhistory/`);
    console.log(`  ${config.eventId}: would scrape any events newer than watermark`);
    return [];
  }

  const latestScrapedStr = await getAppDataValue(
    CONVEX_SITE_URL,
    INGEST_SECRET,
    key,
  );
  const latestScraped = latestScrapedStr ? parseInt(latestScrapedStr, 10) : 0;
  console.log(
    `  ${config.eventId}: latest scraped event number: ${latestScraped || "(none)"}`,
  );

  // Fetch event history page
  const { browser, context } = await launchBrowser();
  console.log(`  ${config.eventId}: fetching event history...`);
  const historyHtml = await fetchPage(
    context,
    `${config.baseUrl}/results/eventhistory/`,
  );
  await browser.close();

  const allEvents = parseEventHistory(historyHtml);
  console.log(
    `  ${config.eventId}: found ${allEvents.length} total events in history.`,
  );

  if (allEvents.length === 0) return [];

  const newEvents = allEvents
    .filter((e) => e.eventNumber > latestScraped)
    .sort((a, b) => a.eventNumber - b.eventNumber);

  if (newEvents.length === 0) {
    console.log(
      `  ${config.eventId}: no new events (latest in DB: ${latestScraped}, latest available: ${allEvents[0].eventNumber}).`,
    );
    return [];
  }

  const numbers = newEvents.map((e) => e.eventNumber);
  console.log(`  ${config.eventId}: new events to scrape: ${numbers.join(", ")}`);
  return numbers;
}

// --- Main ---

async function main() {
  const manualRanges = parseEventArg();
  const isManualMode = manualRanges !== null;

  if (isDryRun) console.log("[DRY RUN] No requests will be made.\n");

  const allVolunteers: VolunteerRecord[] = [];
  const appDataUpdates: Record<string, string> = {};

  if (isManualMode) {
    // --- Manual mode ---
    console.log("Manual mode: scraping specified events.");

    for (const range of manualRanges) {
      const config = PARKRUN_EVENTS.find((e) => e.eventId === range.eventId);
      if (!config) {
        console.warn(
          `Unknown event "${range.eventId}". Known events: ${PARKRUN_EVENTS.map((e) => e.eventId).join(", ")}`,
        );
        continue;
      }

      const numbers: number[] = [];
      for (let i = range.start; i <= range.end; i++) numbers.push(i);

      console.log(
        `\n${config.eventId}: scraping event(s) ${range.start}${range.start !== range.end ? `-${range.end}` : ""}`,
      );

      const { volunteers, highestEventNumber } = await scrapeEvent(
        config,
        numbers,
      );
      allVolunteers.push(...volunteers);

      if (highestEventNumber > 0) {
        appDataUpdates[watermarkKey(config.eventId)] =
          String(highestEventNumber);
      }

      // Pause between different parkrun events
      if (!isDryRun && range !== manualRanges[manualRanges.length - 1]) {
        const delay = randomDelay(DELAY_BETWEEN_FETCHES_MS);
        console.log(
          `\nPausing ${(delay / 1000).toFixed(1)}s before next parkrun event...`,
        );
        await sleep(delay);
      }
    }
  } else {
    // --- Automatic mode ---
    console.log("Checking all configured parkruns for new events...\n");

    for (const config of PARKRUN_EVENTS) {
      const eventsToScrape = await resolveAutoEvents(config);

      if (eventsToScrape.length === 0) continue;

      const { volunteers, highestEventNumber } = await scrapeEvent(
        config,
        eventsToScrape,
      );
      allVolunteers.push(...volunteers);

      if (highestEventNumber > 0) {
        appDataUpdates[watermarkKey(config.eventId)] =
          String(highestEventNumber);
      }

      // Pause between different parkrun events
      if (!isDryRun && config !== PARKRUN_EVENTS[PARKRUN_EVENTS.length - 1]) {
        const delay = randomDelay(DELAY_BETWEEN_FETCHES_MS);
        console.log(
          `\nPausing ${(delay / 1000).toFixed(1)}s before next parkrun event...`,
        );
        await sleep(delay);
      }
    }
  }

  // --- Ingest results ---

  console.log(`\nTotal volunteer records: ${allVolunteers.length}`);

  if (isDryRun) {
    console.log(`Would POST volunteer data to: ${CONVEX_SITE_URL}/api/ingest-volunteers`);
    return;
  }

  if (allVolunteers.length === 0 && Object.keys(appDataUpdates).length === 0) {
    console.log("No volunteer data to ingest.");
    return;
  }

  const payload: {
    volunteers: VolunteerRecord[];
    appData?: Record<string, string>;
  } = { volunteers: allVolunteers };

  if (Object.keys(appDataUpdates).length > 0) {
    payload.appData = appDataUpdates;
    for (const [key, value] of Object.entries(appDataUpdates)) {
      console.log(`  Updating ${key} to ${value}`);
    }
  }

  console.log(
    `\nIngesting ${allVolunteers.length} volunteer record(s) into Convex...`,
  );

  const ingestUrl = `${CONVEX_SITE_URL}/api/ingest-volunteers`;
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
