/**
 * Fetch course map data for ALL events in the database.
 *
 * Usage:
 *   pnpm fetch-all-maps --env=prod
 *
 * Fetches the events list from the API, then scrapes and ingests course
 * map data for each one with a 20-40s delay between fetches to be polite
 * to parkrun servers.
 */
import {
  loadEnv,
  requireEnvVars,
  launchBrowser,
  randomDelay,
  sleep,
} from "./shared";
import { scrapeCourseMap } from "../lib/map-scraper";

// --- Env loading ---

loadEnv(import.meta.url);
const { convexSiteUrl: CONVEX_SITE_URL, ingestSecret: INGEST_SECRET } =
  requireEnvVars();

const DELAY_RANGE = { min: 5_000, max: 10_000 };

// --- Main ---

async function main() {
  // 1. Fetch all events from the database
  console.log("Fetching events list from API...\n");
  const eventsRes = await fetch(`${CONVEX_SITE_URL}/api/events`);
  if (!eventsRes.ok) {
    console.error(`Failed to fetch events: ${eventsRes.status}`);
    process.exit(1);
  }
  const events: { eventId: string; url?: string }[] = await eventsRes.json();
  console.log(`Found ${events.length} events.`);

  // 2. Fetch existing course event IDs so we can skip them
  const coursesRes = await fetch(`${CONVEX_SITE_URL}/api/courses`);
  const existingIds: string[] = coursesRes.ok ? await coursesRes.json() : [];
  const existingSet = new Set(existingIds);

  const toFetch = events.filter((e) => !existingSet.has(e.eventId));
  console.log(`${existingSet.size} already have course data, ${toFetch.length} remaining.\n`);

  if (toFetch.length === 0) {
    console.log("Nothing to fetch — all events already have course data.");
    return;
  }

  // 3. Launch browser once, reuse across all events
  const { browser, context } = await launchBrowser();

  const results: { eventId: string; status: "ok" | "no-map" | "error"; error?: string }[] = [];

  try {
    for (let i = 0; i < toFetch.length; i++) {
      const event = toFetch[i];
      const eventId = event.eventId;
      const baseUrl = event.url ?? `https://www.parkrun.se/${eventId}/`;

      console.log(`\n[${ i + 1}/${toFetch.length}] ${eventId}`);
      console.log(`  URL: ${baseUrl}`);

      try {
        const result = await scrapeCourseMap(context, baseUrl);

        if (!result) {
          console.log(`  ⚠ No course map found — skipping.`);
          results.push({ eventId, status: "no-map" });
        } else {
          const { courseData } = result;

          // POST to Convex
          const ingestUrl = `${CONVEX_SITE_URL}/api/ingest-course`;
          const response = await fetch(ingestUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${INGEST_SECRET}`,
            },
            body: JSON.stringify({
              eventId,
              coordinates: courseData.coordinates,
              points: courseData.points,
            }),
          });

          if (!response.ok) {
            const text = await response.text();
            console.error(`  ✗ Ingest failed (${response.status}): ${text}`);
            results.push({ eventId, status: "error", error: `Ingest ${response.status}` });
          } else {
            console.log(`  ✓ Stored (${courseData.coordinates.length} coords, ${courseData.points.length} points)`);
            results.push({ eventId, status: "ok" });
          }
        }
      } catch (err: any) {
        console.error(`  ✗ Error: ${err.message ?? err}`);
        results.push({ eventId, status: "error", error: err.message ?? String(err) });
      }

      // Delay before next fetch (skip after the last one)
      if (i < toFetch.length - 1) {
        const delay = randomDelay(DELAY_RANGE);
        console.log(`  ⏳ Waiting ${(delay / 1000).toFixed(0)}s before next event...`);
        await sleep(delay);
      }
    }
  } finally {
    await browser.close();
  }

  // 3. Summary
  const ok = results.filter((r) => r.status === "ok");
  const noMap = results.filter((r) => r.status === "no-map");
  const errors = results.filter((r) => r.status === "error");

  console.log("\n" + "=".repeat(50));
  console.log("SUMMARY");
  console.log("=".repeat(50));
  console.log(`  ✓ Stored:  ${ok.length}`);
  console.log(`  ⚠ No map:  ${noMap.length}`);
  console.log(`  ✗ Errors:  ${errors.length}`);

  if (errors.length > 0) {
    console.log("\nFailed events:");
    for (const e of errors) {
      console.log(`  - ${e.eventId}: ${e.error}`);
    }
  }

  if (noMap.length > 0) {
    console.log("\nEvents without course maps:");
    for (const e of noMap) {
      console.log(`  - ${e.eventId}`);
    }
  }

  console.log("");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
