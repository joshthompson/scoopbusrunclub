/**
 * Playwright script to fetch Haga parkrun event pages and extract volunteer data
 * for tracked club members.
 *
 * Usage:
 *   # Scrape new events since last run (reads latestHagaEventNumber from DB):
 *   npx tsx scripts/fetch-haga.ts
 *   npx tsx scripts/fetch-haga.ts --env=prod
 *
 *   # Scrape a specific event:
 *   npx tsx scripts/fetch-haga.ts --env=prod --event=395
 *
 *   # Scrape a range of events:
 *   npx tsx scripts/fetch-haga.ts --env=prod --event=390-396
 *
 * Requires: playwright (install chromium with `npx playwright install chromium`)
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

// --- Env file loading ---

loadEnv(import.meta.url);
const { convexSiteUrl: CONVEX_SITE_URL, ingestSecret: INGEST_SECRET } = requireEnvVars();

// --- CLI arg parsing ---

function parseEventArg(): { start: number; end: number } | null {
  const eventArg = process.argv.find((a) => a.startsWith("--event="));
  if (!eventArg) return null;

  const value = eventArg.split("=")[1];
  if (value.includes("-")) {
    const [startStr, endStr] = value.split("-");
    const start = parseInt(startStr, 10);
    const end = parseInt(endStr, 10);
    if (isNaN(start) || isNaN(end) || start > end) {
      console.error(`Invalid --event range: ${value}. Expected format: START-END (e.g. 390-396)`);
      process.exit(1);
    }
    return { start, end };
  }

  const single = parseInt(value, 10);
  if (isNaN(single)) {
    console.error(`Invalid --event value: ${value}. Expected a number or range (e.g. 395 or 390-396)`);
    process.exit(1);
  }
  return { start: single, end: single };
}

// --- Types ---

interface VolunteerRecord {
  date: string;
  event: string;
  eventNumber: number;
  parkrunId: string;
  roles: string[];
}

// --- Main ---

async function main() {
  const manualRange = parseEventArg();
  const isManualMode = manualRange !== null;

  let eventsToScrape: number[];

  if (isManualMode) {
    // Build array of event numbers from range
    eventsToScrape = [];
    for (let i = manualRange.start; i <= manualRange.end; i++) {
      eventsToScrape.push(i);
    }
    console.log(`Manual mode: scraping event(s) ${manualRange.start}${manualRange.start !== manualRange.end ? `-${manualRange.end}` : ""}`);
  } else {
    // Automatic mode: determine new events to scrape
    console.log("Checking for new Haga events to scrape...");

    const latestScrapedStr = await getAppDataValue(CONVEX_SITE_URL, INGEST_SECRET, "latestHagaEventNumber");
    const latestScraped = latestScrapedStr ? parseInt(latestScrapedStr, 10) : 0;
    console.log(`  Latest scraped event number: ${latestScraped || "(none)"}`);

    // Fetch event history page to see all available events
    const { browser: histBrowser, context: histContext } = await launchBrowser();
    console.log("  Fetching event history page...");
    const historyHtml = await fetchPage(histContext, "https://www.parkrun.se/haga/results/eventhistory/");
    await histBrowser.close();

    const allEvents = parseEventHistory(historyHtml);
    console.log(`  Found ${allEvents.length} total events in history.`);

    if (allEvents.length === 0) {
      console.log("No events found in event history. Nothing to scrape.");
      return;
    }

    // Filter to events newer than our last scraped one
    const newEvents = allEvents
      .filter((e) => e.eventNumber > latestScraped)
      .sort((a, b) => a.eventNumber - b.eventNumber); // ascending — scrape oldest first

    if (newEvents.length === 0) {
      console.log(`  No new events to scrape (latest in DB: ${latestScraped}, latest available: ${allEvents[0].eventNumber}).`);
      return;
    }

    eventsToScrape = newEvents.map((e) => e.eventNumber);
    console.log(`  New events to scrape: ${eventsToScrape.join(", ")}`);
  }

  // --- Scrape each event ---

  const { browser, context } = await launchBrowser();
  const allVolunteers: VolunteerRecord[] = [];
  let highestEventNumber = 0;

  for (let i = 0; i < eventsToScrape.length; i++) {
    const eventNumber = eventsToScrape[i];
    const url = `https://www.parkrun.se/haga/results/${eventNumber}/`;

    console.log(`\nScraping event #${eventNumber} (${i + 1}/${eventsToScrape.length})...`);
    console.log(`  URL: ${url}`);

    try {
      const html = await fetchPage(context, url);

      // Parse date
      const date = parseEventDate(html);
      if (!date) {
        console.warn(`  ⚠ Could not extract date for event #${eventNumber}, skipping.`);
        continue;
      }
      console.log(`  Date: ${date}`);

      // Parse volunteers
      const volunteers = parseEventVolunteers(html, TRACKED_IDS);
      console.log(`  Found ${volunteers.length} tracked volunteer(s).`);

      for (const vol of volunteers) {
        console.log(`    • ${vol.parkrunId}: ${vol.roles.join(", ")}`);
        allVolunteers.push({
          date,
          event: "haga",
          eventNumber,
          parkrunId: vol.parkrunId,
          roles: vol.roles,
        });
      }

      if (eventNumber > highestEventNumber) {
        highestEventNumber = eventNumber;
      }
    } catch (error) {
      console.error(`  ✗ Error scraping event #${eventNumber}:`, error);
    }

    // Pause between events
    if (i < eventsToScrape.length - 1) {
      const delay = randomDelay(DELAY_BETWEEN_FETCHES_MS);
      console.log(`  Waiting ${(delay / 1000).toFixed(1)}s before next fetch...`);
      await sleep(delay);
    }
  }

  await browser.close();

  // --- Ingest results ---

  console.log(`\nTotal volunteer records: ${allVolunteers.length}`);

  if (allVolunteers.length === 0 && !isManualMode && highestEventNumber === 0) {
    console.log("No volunteer data to ingest.");
    return;
  }

  const payload: {
    volunteers: VolunteerRecord[];
    appData?: Record<string, string>;
  } = { volunteers: allVolunteers };

  // Update watermark only in automatic mode (or always if we scraped something)
  if (highestEventNumber > 0) {
    payload.appData = {
      latestHagaEventNumber: String(highestEventNumber),
    };
    console.log(`Updating latestHagaEventNumber to ${highestEventNumber}`);
  }

  console.log(`\nIngesting ${allVolunteers.length} volunteer record(s) into Convex...`);

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
