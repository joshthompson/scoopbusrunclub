// Shared Parkrun HTML parsing logic.
// Used by scripts/fetch-parkrun.ts and scripts/test-parse.ts.
//
// Parses: /parkrunner/{id}/all/ → runner info + all run results

// --- Types ---

export interface RunnerInfo {
  name: string;
  totalRuns: number;
  totalJuniorRuns: number;
}

export interface RunResult {
  event: string;     // eventId, e.g. "haga"
  eventName: string; // display name, e.g. "Haga" (used by extractEvents, not stored in runResults)
  eventUrl: string;  // e.g. "https://www.parkrun.se/haga/results/394/"
  eventNumber: number;
  position: number;
  time: string;
  ageGrade: string;
  date: string; // YYYY-MM-DD
}

export interface EventInfo {
  eventId: string;   // e.g. "haga"
  name: string;      // e.g. "Haga"
  url: string;       // e.g. "https://www.parkrun.se/haga/results/"
  country: string;   // e.g. "SE"
}

// --- Country code mapping from parkrun domain ---

const NAMIBIA_EVENTS = new Set(["walvisbay", "windhoek", "swakopmund"]);

const DOMAIN_TO_COUNTRY: Record<string, string> = {
  "parkrun.com.au": "AU",
  "parkrun.co.at": "AT",
  "parkrun.ca": "CA",
  "parkrun.dk": "DK",
  "parkrun.fi": "FI",
  "parkrun.com.de": "DE",
  "parkrun.ie": "IE",
  "parkrun.it": "IT",
  "parkrun.jp": "JP",
  "parkrun.lt": "LT",
  "parkrun.my": "MY",
  "parkrun.co.nl": "NL",
  "parkrun.co.nz": "NZ",
  "parkrun.no": "NO",
  "parkrun.pl": "PL",
  "parkrun.sg": "SG",
  "parkrun.co.za": "ZA",
  "parkrun.se": "SE",
  "parkrun.org.uk": "UK",
  "parkrun.us": "US",
};

function getCountryFromUrl(url: string, eventId: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    if (hostname === "parkrun.co.za" && NAMIBIA_EVENTS.has(eventId)) {
      return "NA";
    }
    return DOMAIN_TO_COUNTRY[hostname] ?? "??";
  } catch {
    return "??";
  }
}

/**
 * Extract unique event info from parsed run results.
 * Derives eventId, name, base URL, and country from the result URLs.
 */
export function extractEvents(runResults: RunResult[]): EventInfo[] {
  const seen = new Map<string, EventInfo>();

  for (const result of runResults) {
    if (!result.eventUrl || !result.event) continue;
    if (seen.has(result.event)) continue;

    // URL looks like https://www.parkrun.se/haga/results/394/
    // We want base: https://www.parkrun.se/haga/
    const urlMatch = result.eventUrl.match(
      /^(https?:\/\/[^/]+\/[^/]+)\/results\/?\d*\/?$/,
    );
    if (!urlMatch) continue;

    const baseUrl = urlMatch[1] + "/";

    seen.set(result.event, {
      eventId: result.event,
      name: result.eventName,
      url: baseUrl,
      country: getCountryFromUrl(result.eventUrl, result.event),
    });
  }

  return Array.from(seen.values());
}

// --- Helper: strip HTML tags ---

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

// --- Parse runner info from the /all/ page ---

export function parseRunnerData(html: string): RunnerInfo {
  // Name: <h2>Josh THOMPSON&nbsp;<span ...>(A8070821)</span></h2>
  const nameMatch = html.match(/<h2>([^<]+?)&nbsp;/);
  const name = nameMatch ? nameMatch[1].trim() : "Unknown";

  // Total runs: <h3>136 parkruns total</h3>  or  <h3>\n  136 parkruns total\n</h3>
  // With junior parkruns: <h3>10 parkruns &amp; 4 junior parkruns totalt</h3>
  const totalMatch = html.match(
    /<h3>\s*(\d+)\s*parkruns?\s*(?:&amp;|&)?\s*(?:(\d+)\s*junior\s*parkruns?\s*)?total/i,
  );
  const totalRuns = totalMatch ? parseInt(totalMatch[1], 10) : 0;
  const totalJuniorRuns =
    totalMatch && totalMatch[2] ? parseInt(totalMatch[2], 10) : 0;

  return { name, totalRuns, totalJuniorRuns };
}

// --- Parse all run results from the /all/ page ---

export function parseRunResults(html: string): RunResult[] {
  const results: RunResult[] = [];

  // Find the "All Results" table by its caption
  const allResultsMatch = html.match(
    /All\s+Results\s*<\/caption>[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i,
  );
  if (!allResultsMatch) return results;

  const tbody = allResultsMatch[1];

  // Match each row: <tr class="..."><td>...</td><td>...</td>...</tr>
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(tbody)) !== null) {
    const row = rowMatch[1];

    // Extract cells
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[] = [];
    let cellMatch;
    while ((cellMatch = cellRegex.exec(row)) !== null) {
      cells.push(cellMatch[1]);
    }

    // Columns: Event, Run Date, Run Number, Pos, Time, Age Grade, PB?
    if (cells.length < 6) continue;

    // Event name + URL: <a href="https://www.parkrun.se/haga/results/394/">Haga</a>
    const eventLinkMatch = cells[0].match(/<a\s+href="([^"]+)"[^>]*>([^<]+)<\/a>/);
    const eventUrl = eventLinkMatch ? eventLinkMatch[1].trim() : "";
    const eventName = eventLinkMatch ? eventLinkMatch[2].trim() : stripTags(cells[0]);

    // Derive eventId from URL (e.g. "haga" from ".../haga/results/394/")
    const eventIdMatch = eventUrl.match(/\/([^/]+)\/results\//);
    const event = eventIdMatch ? eventIdMatch[1] : eventName.toLowerCase().replace(/[^a-z0-9]/g, "");

    // Run Date: <a href="..."><span class="format-date">07/03/2026</span></a>
    const dateMatch = cells[1].match(/>(\d{2})\/(\d{2})\/(\d{4})</);
    const date = dateMatch
      ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`
      : stripTags(cells[1]);

    // Run Number: <a href="...">394</a>
    const eventNumber = parseInt(stripTags(cells[2]), 10) || 0;

    // Position
    const position = parseInt(stripTags(cells[3]), 10) || 0;

    // Time (e.g. "19:39" or "01:08:30")
    const time = stripTags(cells[4]);

    // Age Grade (e.g. "67.09%")
    const ageGrade = stripTags(cells[5]);

    if (eventName && time) {
      results.push({ event, eventName, eventUrl, eventNumber, position, time, ageGrade, date });
    }
  }

  return results;
}

// --- Types for event page parsing ---

export interface EventHistoryEntry {
  eventNumber: number;
  date: string; // YYYY-MM-DD
}

export interface VolunteerEntry {
  parkrunId: string;
  roles: string[];
}

// --- Parse event history page ---
// Parses https://www.parkrun.se/haga/results/eventhistory/
// Each row: <tr class="Results-table-row" data-parkrun="396" data-date="2026-03-21" ...>

export function parseEventHistory(html: string): EventHistoryEntry[] {
  const entries: EventHistoryEntry[] = [];

  const rowRegex = /<tr\s+class="Results-table-row"[^>]*data-parkrun="(\d+)"[^>]*data-date="(\d{4}-\d{2}-\d{2})"[^>]*>/gi;
  let match;

  while ((match = rowRegex.exec(html)) !== null) {
    entries.push({
      eventNumber: parseInt(match[1], 10),
      date: match[2],
    });
  }

  // Sort descending by event number (most recent first)
  entries.sort((a, b) => b.eventNumber - a.eventNumber);
  return entries;
}

// --- Parse event date from a single event results page ---
// With Swedish locale (sv-SE) the format-date span contains YYYY-MM-DD.

export function parseEventDate(html: string): string {
  const match = html.match(/<span\s+class="format-date">(\d{4}-\d{2}-\d{2})<\/span>/);
  return match ? match[1] : "";
}

// --- Parse volunteers from a single event results page ---
// Finds tracked athletes in the Volunteers-table and extracts their roles.
// Each volunteer row: <tr class="Volunteers-table-row" ... data-role="Funktionär,Resultatsansvarig," ...>
//   with <a href="/haga/parkrunner/{parkrunId}" ...>

export function parseEventVolunteers(
  html: string,
  trackedIds: Set<string>,
): VolunteerEntry[] {
  const volunteers: VolunteerEntry[] = [];

  // Find the volunteers table section
  const tableMatch = html.match(
    /class="Volunteers-table[^"]*js-VolunteersTable[^"]*"[\s\S]*?<tbody[^>]*>([\s\S]*?)<\/tbody>/i,
  );
  if (!tableMatch) return volunteers;

  const tbody = tableMatch[1];

  // Match each volunteer row
  const rowRegex = /<tr\s+class="Volunteers-table-row"[^>]*data-role="([^"]*)"[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;

  while ((match = rowRegex.exec(tbody)) !== null) {
    const dataRole = match[1];
    const rowHtml = match[2];

    // Extract parkrunId from the link
    const idMatch = rowHtml.match(/\/parkrunner\/(\d+)/);
    if (!idMatch) continue;

    const parkrunId = idMatch[1];
    if (!trackedIds.has(parkrunId)) continue;

    // Parse roles from data-role (comma-separated, trailing comma)
    const roles = dataRole
      .split(",")
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    volunteers.push({ parkrunId, roles });
  }

  return volunteers;
}

