/**
 * Svenskspringare: run every parkrun in Sweden.
 *
 * The backend's `events` table only holds parkruns someone in the club has
 * actually run — rows are written from the results we scrape — so it can't be
 * the challenge's denominator on its own. A Swedish parkrun nobody has been to
 * yet would simply not exist, and the card would read as complete while a
 * corner of the country was still missing.
 *
 * So the list is kept here instead, and the two are merged: anything the events
 * table reports as Swedish that isn't named below is added to the card rather
 * than dropped. That way a new event the club reaches before this file is
 * updated still counts, and the card can only ever be too small, never too big.
 *
 * Names are the ones parkrun itself uses, which is what the page sorts on.
 */
export interface SwedishParkrun {
	/** The `eventId` results carry, e.g. `haga`. */
	eventId: string
	/** Display name, e.g. `Malmö Ribersborg`. */
	name: string
	/** City the parkrun is located in. */
	city: string
	/** Whether the parkrun is active or not */
	active?: boolean
}

/**
 * Every parkrun in Sweden, as far as we know. Add new ones as parkrun Sweden
 * opens them — order doesn't matter here, the page sorts by name.
 */
export const SWEDISH_PARKRUNS: SwedishParkrun[] = [
	{ eventId: 'billdalsparken', name: 'Billdalsparken', city: 'Gothenburg' },
	{ eventId: 'boulognerskogen', name: 'Boulognerskogen', city: 'Gävle' },
	{ eventId: 'broparken', name: 'Broparken', city: 'Umeå' },
	{ eventId: 'bulltofta', name: 'Bulltofta', city: 'Malmö' },
	{ eventId: 'djakneberget', name: 'Djäkneberget', city: 'Västerås' },
	{ eventId: 'haga', name: 'Haga', city: 'Stockholm' },
	{ eventId: 'huddinge', name: 'Huddinge', city: 'Stockholm' },
	{ eventId: 'judarskogen', name: 'Judarskogen', city: 'Stockholm' },
	{
		eventId: 'kungsangen',
		name: 'Kungsängen',
		city: 'Stockholm',
		active: false,
	},
	{ eventId: 'lillsjon', name: 'Lillsjön', city: 'Stockholm' },
	{ eventId: 'malmoribersborg', name: 'Malmö Ribersborg', city: 'Malmö' },
	{ eventId: 'orebro', name: 'Örebro', city: 'Örebro' },
	{ eventId: 'skatas', name: 'Skatås', city: 'Gothenburg' },
	{ eventId: 'uppsala', name: 'Uppsala', city: 'Uppsala' },
	{ eventId: 'vallaskogen', name: 'Vallaskogen', city: 'Linköping' },
	{ eventId: 'vaxjosjon', name: 'Växjösjön', city: 'Växjö' },
	{ eventId: 'kalgarden', name: 'Kålgården', city: 'Falun' },
]

/**
 * Where a parkrun the events table knows about but this file doesn't goes. It
 * is a real Swedish parkrun — the backend said so — we just have no city for
 * it, so it gets its own group at the bottom rather than being filed wrongly.
 */
export const UNPLACED_CITY = 'Elsewhere in Sweden'

/**
 * Sweden's own alphabet runs ...X Y Z Å Ä Ö, so Örebro sorts last rather than
 * among the O's and Växjösjön before Åre would. `sv` is what knows that; the
 * default collation would put them in the wrong place on a Swedish page.
 */
export function bySwedishName(a: SwedishParkrun, b: SwedishParkrun): number {
	return a.name.localeCompare(b.name, 'sv')
}

/** A parkrun still standing — anything not explicitly closed down. */
export function isActive(parkrun: SwedishParkrun): boolean {
	return parkrun.active !== false
}

/**
 * Whether a club event's title names this parkrun, e.g. "Scoop Bus Kungsängen
 * Reunion" for Kungsängen.
 *
 * Only ever asked about a parkrun that has closed. There is no way left to run
 * one of those, so a club event on the old course is the nearest thing there is
 * and the card counts it — flagged, because it wasn't the parkrun itself. For a
 * parkrun still going the question doesn't arise: the answer is to go and run
 * it, and a title match would otherwise hand out "Haga" to everyone who turned
 * up to "Haga parkrun's 10th Birthday".
 */
export function titleNamesParkrun(
	eventTitle: string,
	parkrun: SwedishParkrun,
): boolean {
	return eventTitle.toLowerCase().includes(parkrun.name.toLowerCase())
}

/**
 * The card to fill in: the list above, plus any Swedish event the club has
 * turned out to have run that isn't on it yet. Those arrive from the events
 * table with no city of their own, so they land in {@link UNPLACED_CITY}.
 */
export function swedishParkrunCard(
	knownSwedishEvents: { eventId: string; name: string }[] = [],
): SwedishParkrun[] {
	const byId = new Map(SWEDISH_PARKRUNS.map((pr) => [pr.eventId, pr]))
	for (const event of knownSwedishEvents) {
		if (byId.has(event.eventId)) continue
		byId.set(event.eventId, { ...event, city: UNPLACED_CITY })
	}
	return [...byId.values()].sort(bySwedishName)
}

/** One city's parkruns, for the page's grouped card. */
export interface CityGroup {
	city: string
	parkruns: SwedishParkrun[]
}

/**
 * The card split by city, cities in Swedish alphabetical order and each one's
 * parkruns likewise — except the unplaced group, which is always last however
 * its name happens to sort.
 */
export function groupByCity(parkruns: SwedishParkrun[]): CityGroup[] {
	const byCity = new Map<string, SwedishParkrun[]>()
	for (const parkrun of parkruns) {
		const group = byCity.get(parkrun.city)
		if (group) group.push(parkrun)
		else byCity.set(parkrun.city, [parkrun])
	}

	return [...byCity.entries()]
		.map(([city, group]) => ({
			city,
			parkruns: [...group].sort(bySwedishName),
		}))
		.sort((a, b) => {
			if (a.city === UNPLACED_CITY) return 1
			if (b.city === UNPLACED_CITY) return -1
			return a.city.localeCompare(b.city, 'sv')
		})
}
