/**
 * Fetch course map data for a parkrun event and store it in Convex.
 *
 * Usage:
 *   # Fetch course for a specific event (loads .env.local by default):
 *   pnpm fetch-map haga
 *
 *   # Use a different environment:
 *   pnpm fetch-map haga --env=prod
 *
 * The script will:
 * 1. Look up the event's base URL from the database
 * 2. Scrape the /course/ page for the Google Maps embed
 * 3. Download the KMZ, extract the KML, parse coordinates and points
 * 4. POST the structured data to the /api/ingest-course endpoint
 *
 * Requires: playwright (install chromium with `npx playwright install chromium`)
 */
import {
  loadEnv,
  requireEnvVars,
  launchBrowser,
} from "./shared";
import { scrapeCourseMap } from "../lib/map-scraper";

// --- Env loading ---

loadEnv(import.meta.url);
const { convexSiteUrl: CONVEX_SITE_URL, ingestSecret: INGEST_SECRET } =
  requireEnvVars();

// --- Main ---

async function main() {
  // Find the eventId from positional args (skip flags like --env=prod)
  const positionalArgs = process.argv
    .slice(2)
    .filter((a) => !a.startsWith("-"));
  const eventId = positionalArgs[0];

  if (!eventId) {
    console.error("Usage: pnpm fetch-map <eventId> [--env=local|prod]");
    console.error("Example: pnpm fetch-map haga --env=prod");
    process.exit(1);
  }

  console.log(`Fetching course map for event: ${eventId}\n`);

  // Look up event URL from the API
  let baseUrl: string;
  try {
    const eventsRes = await fetch(`${CONVEX_SITE_URL}/api/events`);
    const events: { eventId: string; url?: string }[] = await eventsRes.json();
    const event = events.find((e) => e.eventId === eventId);

    if (event?.url) {
      baseUrl = event.url;
      console.log(`Found event URL in database: ${baseUrl}`);
    } else {
      baseUrl = `https://www.parkrun.se/${eventId}/`;
      console.log(
        `Event not found in database, using default URL: ${baseUrl}`,
      );
    }
  } catch {
    baseUrl = `https://www.parkrun.se/${eventId}/`;
    console.log(`Could not query events API, using default URL: ${baseUrl}`);
  }

  const { browser, context } = await launchBrowser();

  try {
    const result = await scrapeCourseMap(context, baseUrl);

    if (!result) {
      console.error("\nFailed to scrape course map data.");
      process.exit(1);
    }

    const { courseData } = result;

    // POST to Convex
    console.log(`\nIngesting course data for ${eventId}...`);
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
      console.error(`Ingest failed (${response.status}): ${text}`);
      process.exit(1);
    }

    const responseData = await response.json();
    console.log("Ingest response:", responseData);
    console.log(`\n✓ Course data stored for ${eventId}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
