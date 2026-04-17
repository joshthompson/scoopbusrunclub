/**
 * Scrape course map data from a parkrun event's course page.
 *
 * Flow:
 * 1. Fetch the /course/ page HTML using Playwright
 * 2. Extract the Google Maps embed iframe URL and its `mid` parameter
 * 3. Download the KMZ file (zip) from Google Maps
 * 4. Unzip to get doc.kml
 * 5. Parse the KML for coordinates and named points
 */
import JSZip from "jszip";
import { parseKml, type CourseData } from "./kml-parser";
import type { BrowserContext } from "../scripts/shared";

/**
 * Extract the Google Maps embed `mid` from a parkrun course page HTML.
 * Looks for an iframe whose src points to google.com/maps/d/…embed?mid=…
 */
export function extractMapMid(html: string): string | null {
  const iframeRegex =
    /src="https:\/\/www\.google\.com\/maps\/d\/[^"]*?[?&]mid=([^&"]+)/;
  const match = html.match(iframeRegex);
  return match ? match[1] : null;
}

/**
 * Download a KMZ file from Google Maps using Playwright (to avoid being blocked)
 * and extract the KML content.
 */
/**
 * Resolve a potentially legacy Google Maps `mid` by navigating to the embed
 * URL and extracting the final `mid` after any redirects.
 */
async function resolveMapMid(
  context: BrowserContext,
  mid: string,
): Promise<string> {
  const embedUrl = `https://www.google.com/maps/d/embed?mid=${mid}`;
  const page = await context.newPage();
  try {
    await page.goto(embedUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    const finalUrl = page.url();
    const match = finalUrl.match(/[?&]mid=([^&]+)/);
    if (match && match[1] !== mid) {
      console.log(`  Resolved legacy mid → ${match[1]}`);
      return match[1];
    }
    return mid;
  } finally {
    await page.close();
  }
}

export async function downloadAndExtractKml(
  context: BrowserContext,
  mid: string,
): Promise<string> {
  const kmzUrl = `https://www.google.com/maps/d/kml?mid=${mid}`;
  console.log(`  Downloading KMZ from: ${kmzUrl}`);

  const page = await context.newPage();
  try {
    const responsePromise = page.waitForEvent("download").catch(() => null);
    // Use page.evaluate to fetch the binary data within the browser context
    const buffer = await page.evaluate(async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const buf = await res.arrayBuffer();
      return Array.from(new Uint8Array(buf));
    }, kmzUrl);

    const zip = await JSZip.loadAsync(new Uint8Array(buffer));

  // Try doc.kml first (standard KMZ), then any .kml file
  let kmlFile = zip.file("doc.kml");
  if (!kmlFile) {
    const kmlFiles = Object.keys(zip.files).filter((name) =>
      name.endsWith(".kml"),
    );
    if (kmlFiles.length === 0) {
      throw new Error("No KML file found in KMZ archive");
    }
    kmlFile = zip.file(kmlFiles[0]);
    if (!kmlFile) throw new Error("Could not read KML file from archive");
  }

  return await kmlFile.async("text");
  } finally {
    await page.close();
  }
}

/**
 * Scrape course map data for a parkrun event.
 *
 * @param context Playwright browser context
 * @param eventBaseUrl Base URL for the event, e.g. "https://www.parkrun.se/haga/"
 * @returns Parsed course data and raw KML content, or null if no map was found.
 */
export async function scrapeCourseMap(
  context: BrowserContext,
  eventBaseUrl: string,
): Promise<{ courseData: CourseData; kmlContent: string } | null> {
  const courseUrl = eventBaseUrl.replace(/\/$/, "") + "/course/";
  console.log(`  Fetching course page: ${courseUrl}`);

  // We need the raw HTML response (before cookie consent scripts strip the iframe).
  // The iframe manager replaces <iframe> elements with placeholder divs on load,
  // so page.content() won't contain the Google Maps URL.
  const page = await context.newPage();
  let rawHtml = "";
  try {
    page.on("response", async (response) => {
      if (response.url() === courseUrl && response.status() === 200) {
        try {
          rawHtml = await response.text();
        } catch {
          // response body may not be available in some cases
        }
      }
    });
    await page.goto(courseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    // Also grab the rendered DOM as a fallback
    const renderedHtml = await page.content();
    if (!rawHtml) rawHtml = renderedHtml;
  } finally {
    await page.close();
  }

  const mid = extractMapMid(rawHtml);

  if (!mid) {
    console.log(`  ⚠ No Google Maps embed found on course page`);
    return null;
  }

  console.log(`  Found map mid: ${mid}`);

  let resolvedMid = mid;
  let kmlContent: string;
  try {
    kmlContent = await downloadAndExtractKml(context, resolvedMid);
  } catch {
    // KMZ download failed — try resolving via embed redirect (legacy map IDs)
    console.log(`  KMZ download failed, attempting to resolve mid via embed redirect...`);
    resolvedMid = await resolveMapMid(context, mid);
    kmlContent = await downloadAndExtractKml(context, resolvedMid);
  }

  const courseData = parseKml(kmlContent);

  console.log(
    `  Parsed ${courseData.coordinates.length} coordinate points`,
  );
  console.log(
    `  Found ${courseData.points.length} named points: ${courseData.points.map((p) => p.name).join(", ")}`,
  );

  return { courseData, kmlContent };
}
