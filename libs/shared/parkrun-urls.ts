/**
 * The parkrun pages our data comes from.
 *
 * Shared by the admin upload form (which links to each page you need to download)
 * and the results-scraper extension (which navigates to them), so the two always
 * agree on what to fetch. The Playwright scripts predate this module and still
 * build athlete URLs themselves.
 */
import { DOMAIN_TO_COUNTRY } from './parkrun-parsers'

/**
 * Which parkrun site to read athlete history from.
 *
 * Every country's site serves the same athlete pages, so this is a free choice,
 * and it's the Swedish one because that's where everything else we fetch lives —
 * the club's events and the league table are both on `parkrun.se`. Keeping athlete
 * pages there means a whole scrape stays on one origin, which matters for any
 * scraper working from inside a page rather than through host permissions: the
 * same-origin policy makes one origin readable and the rest not.
 *
 * Swedish pages are a supported parser path rather than a lucky one: the total-runs
 * regex matches "totalt" as well as "total", and `findResultTbodies` handles the
 * localised "Alla resultat" caption by falling back to the last results table.
 * Verified against a real `parkrun.se` athlete page — 155 results parsed.
 *
 * Note this constant does not reach the Playwright scripts, which build the same
 * URL against `parkrun.org.uk` by hand (`apps/api/scripts/fetch-results.ts`).
 */
export const ATHLETE_SITE = 'https://www.parkrun.se'

/**
 * An athlete's full run history — requested by the extension and linked to by the
 * manual upload form.
 */
export function athletePageUrl(parkrunId: string): string {
	return `${ATHLETE_SITE}/parkrunner/${parkrunId}/all/`
}

/**
 * An event's most recent results. fetch-parkrun.ts walks the event history to
 * find every unscraped number; by hand you want the latest one, which parkrun
 * serves at a stable URL.
 */
export function latestResultsUrl(eventBaseUrl: string): string {
	return `${trimSlash(eventBaseUrl)}/results/latestresults/`
}

/** A numbered event results page, e.g. …/haga/results/415/ */
export function eventResultsUrl(
	eventBaseUrl: string,
	eventNumber: number,
): string {
	return `${trimSlash(eventBaseUrl)}/results/${eventNumber}/`
}

/** An event's course page, which embeds the Google map holding the KMZ. */
export function coursePageUrl(eventBaseUrl: string): string {
	return `${trimSlash(eventBaseUrl)}/course/`
}

/** The Google My Maps KMZ export for a map id found on a course page. */
export function courseKmzUrl(mid: string): string {
	return `https://www.google.com/maps/d/kml?mid=${mid}`
}

/** The embed URL, used to resolve legacy map ids via their redirect. */
export function courseMapEmbedUrl(mid: string): string {
	return `https://www.google.com/maps/d/embed?mid=${mid}`
}

/** The league table fetch-largest-clubs.ts scrapes. */
export const LARGEST_CLUBS_URL = 'https://www.parkrun.se/results/largestclubs/'

function trimSlash(url: string): string {
	return url.replace(/\/$/, '')
}

// --- Host patterns, for the extension's manifest ---

/**
 * Match patterns covering every parkrun site we know about, plus Google Maps.
 * Match patterns can't wildcard a TLD, so these have to be enumerated — hence
 * deriving them from the country map the parsers already maintain.
 */
export const PARKRUN_HOST_PATTERNS = Object.keys(DOMAIN_TO_COUNTRY).flatMap(
	(domain) => [`*://${domain}/*`, `*://*.${domain}/*`],
)

export const GOOGLE_MAPS_HOST_PATTERNS = ['*://*.google.com/maps/*']
