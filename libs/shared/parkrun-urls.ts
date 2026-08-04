/**
 * The parkrun pages our data comes from.
 *
 * Shared by the scraping scripts, the admin upload form (which links to
 * each page you need to download) and the results-scraper extension (which
 * navigates to them). One definition so all three agree.
 */
import { DOMAIN_TO_COUNTRY } from './parkrun-parsers'

/**
 * Which parkrun site to read athlete history from. Every country's site serves
 * the same athlete pages; the scripts have always used the UK one, and its
 * pages are in English, which is the parsers' primary path.
 */
export const ATHLETE_SITE = 'https://www.parkrun.org.uk'

/** An athlete's full run history — what fetch-results.ts requests. */
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
