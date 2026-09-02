/**
 * The club's members, as plain facts.
 *
 * This is the one place a member's name, parkrun id and birthday are written
 * down. The website's runners (`apps/web/src/data/runners.ts`) build their
 * sprites and signals on top of these, and the Convex backend reads the same
 * facts when it generates the calendar feed — so a new member, a corrected id
 * or a fixed birthday only ever needs editing here.
 */

type MonthDigit1 = 0 | 1
type DayDigit1 = 0 | 1 | 2 | 3
type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

/** DD/MM. `00/00` for a member who hasn't told us yet. */
export type Birthday = `${DayDigit1}${Digit}/${MonthDigit1}${Digit}`

export type MemberKey =
	| 'josh'
	| 'keith'
	| 'claire'
	| 'lyra'
	| 'adam'
	| 'anna'
	| 'eline'
	| 'rick'
	| 'sophie'
	| 'august'
	| 'alisa'
	| 'link'
	| 'otherJosh'
	| 'mikael'
	| 'mia'
	| 'david'

export interface MemberFacts {
	name: string
	/** Other names this member is known by, for matching what parkrun reports. */
	altNames?: string[]
	/** parkrun athlete id. Empty for a member parkrun doesn't know about. */
	id: string
	'5verstId'?: string
	birthday: Birthday
	/** The year they joined (2025 = founding member, later = new member). */
	joined: number
}

export const CLUB_MEMBERS: Record<MemberKey, MemberFacts> = {
	josh: {
		name: 'Josh',
		id: '8070821',
		'5verstId': '790281221',
		birthday: '15/08',
		joined: 2025,
	},
	keith: { name: 'Keith', id: '5635044', birthday: '01/08', joined: 2025 },
	claire: { name: 'Claire', id: '377595', birthday: '06/06', joined: 2025 },
	lyra: { name: 'Lyra', id: '8009111', birthday: '00/00', joined: 2025 },
	adam: { name: 'Adam', id: '7758658', birthday: '12/05', joined: 2025 },
	anna: { name: 'Anna', id: '850764', birthday: '02/12', joined: 2025 },
	eline: { name: 'Eline', id: '8943925', birthday: '06/12', joined: 2025 },
	rick: { name: 'Rick', id: '9679233', birthday: '10/08', joined: 2025 },
	sophie: { name: 'Sophie', id: '6076813', birthday: '28/11', joined: 2025 },
	august: { name: 'August', id: '545803', birthday: '02/12', joined: 2025 },
	alisa: {
		name: 'Alisa',
		id: '10663604',
		'5verstId': '790281220',
		birthday: '22/11',
		joined: 2025,
	},
	// Uses Alisa's speed/data, and parkrun doesn't know them yet.
	link: { name: 'Link', id: '', birthday: '09/03', joined: 2025 },
	otherJosh: {
		name: 'Other Josh',
		altNames: [
			'Other Josh',
			'Josh 2',
			'Joshua II',
			'Cass',
			'Josh Cass',
			'Ozzy Josh',
			'OJ',
		],
		id: '5346109',
		birthday: '02/07',
		joined: 2026,
	},
	mikael: { name: 'Mikael', id: '9854274', birthday: '01/01', joined: 2026 },
	mia: { name: 'Mia', id: '8398883', birthday: '22/02', joined: 2026 },
	david: { name: 'David', id: '3710502', birthday: '04/04', joined: 2026 },
}

export const MEMBER_KEYS = Object.keys(CLUB_MEMBERS) as MemberKey[]

/** Every member, paired with the key that names their page route. */
export const CLUB_MEMBER_ENTRIES: [MemberKey, MemberFacts][] = MEMBER_KEYS.map(
	(key) => [key, CLUB_MEMBERS[key]],
)

/** The site route for a member's page — the key, lowercased. */
export function memberRouteFor(key: MemberKey | string): string {
	return `/member/${key.toLowerCase()}`
}

// ---------- Lookups ----------

function normalizeName(name: string) {
	return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

const parkrunIdToKey = new Map<string, MemberKey>()
const nameToKey = new Map<string, MemberKey>()
const routeToKey = new Map<string, MemberKey>()

for (const [key, member] of CLUB_MEMBER_ENTRIES) {
	if (member.id) parkrunIdToKey.set(member.id, key)
	nameToKey.set(normalizeName(member.name), key)
	routeToKey.set(key.toLowerCase(), key)
}

/** The member a parkrun id belongs to, or the one who runs under that name. */
export function memberKeyFor(
	parkrunId?: string,
	runnerName?: string,
): MemberKey | null {
	const byId = parkrunId ? parkrunIdToKey.get(parkrunId) : undefined
	if (byId) return byId
	const byName = runnerName
		? nameToKey.get(normalizeName(runnerName))
		: undefined
	return byName ?? null
}

/** Their page route, or null when they aren't a member. */
export function memberRoute(
	parkrunId?: string,
	runnerName?: string,
): string | null {
	const key = memberKeyFor(parkrunId, runnerName)
	return key ? memberRouteFor(key) : null
}

/** The member a `/member/<name>` route param names, matched case-insensitively. */
export function memberKeyFromRoute(routeName?: string): MemberKey | null {
	if (!routeName) return null
	return routeToKey.get(routeName.toLowerCase()) ?? null
}

/** A member's display name for a parkrun id, falling back to what was reported. */
export function memberDisplayName(parkrunId: string): string | null {
	const key = parkrunIdToKey.get(parkrunId)
	return key ? CLUB_MEMBERS[key].name : null
}
