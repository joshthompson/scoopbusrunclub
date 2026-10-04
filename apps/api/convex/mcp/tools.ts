/**
 * What the MCP server offers an LLM: a handful of focused, read-only questions
 * about the club, each answered with compact JSON. Lists are capped and say how
 * much they left out, so a model never has to wade through the whole history
 * to answer "what's Keith's Haga PB?".
 */

import { addDays } from '../../../../libs/shared/calendar/dates'
import {
	entriesForDate,
	indexCalendarEntries,
} from '../../../../libs/shared/calendar/entries'
import {
	describeRecurrence,
	expandRecurringRaces,
	withoutClashingRepeats,
} from '../../../../libs/shared/calendar/recurrence'
import { getSpecialDayName } from '../../../../libs/shared/calendar/special-days'
import type { ResultItem } from '../queries'
import {
	type ClubData,
	ToolError,
	ageGradeValue,
	capped,
	clubToday,
	fastestResult,
	findMember,
	findParkrun,
	memberName,
	milestoneOutlook,
	resultRow,
	timeSeconds,
} from './data'

const SITE = 'https://scoopbus.run'

type Args = Record<string, unknown>

export interface Tool {
	name: string
	title: string
	description: string
	inputSchema: {
		type: 'object'
		properties: Record<string, unknown>
		required?: string[]
		additionalProperties?: boolean
	}
	run: (data: ClubData, args: Args) => unknown
}

// ---------------------------------------------------------------------------
// Argument reading
// ---------------------------------------------------------------------------

function optionalString(args: Args, key: string): string | undefined {
	const value = args[key]
	if (value === undefined || value === null || value === '') return undefined
	if (typeof value !== 'string')
		throw new ToolError(`"${key}" must be a string.`)
	return value.trim()
}

function requiredString(args: Args, key: string): string {
	const value = optionalString(args, key)
	if (!value) throw new ToolError(`"${key}" is required.`)
	return value
}

function optionalDate(args: Args, key: string): string | undefined {
	const value = optionalString(args, key)
	if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		throw new ToolError(`"${key}" must be a date as YYYY-MM-DD.`)
	}
	return value
}

function optionalYear(args: Args): number | undefined {
	const value = args.year
	if (value === undefined || value === null || value === '') return undefined
	const year = Number(value)
	if (!Number.isInteger(year))
		throw new ToolError('"year" must be a year, e.g. 2025.')
	return year
}

function limitArg(args: Args, fallback: number, max: number): number {
	const value = args.limit
	if (value === undefined || value === null) return fallback
	const limit = Number(value)
	if (!Number.isFinite(limit) || limit < 1)
		throw new ToolError('"limit" must be at least 1.')
	return Math.min(Math.floor(limit), max)
}

function oneOf<T extends string>(
	args: Args,
	key: string,
	options: readonly T[],
	fallback?: T,
): T {
	const value = optionalString(args, key) ?? fallback
	if (!value || !(options as readonly string[]).includes(value)) {
		throw new ToolError(`"${key}" must be one of: ${options.join(', ')}.`)
	}
	return value as T
}

const dateSchema = (description: string) => ({
	type: 'string',
	pattern: '^\\d{4}-\\d{2}-\\d{2}$',
	description,
})

const memberSchema = {
	type: 'string',
	description:
		'A member\'s name, e.g. "Keith" or "Other Josh". Matched loosely.',
}

const parkrunSchema = {
	type: 'string',
	description:
		'A parkrun\'s name or id, e.g. "Haga" or "haga". Matched loosely.',
}

const limitSchema = (fallback: number, max: number) => ({
	type: 'integer',
	minimum: 1,
	maximum: max,
	description: `How many to return. Defaults to ${fallback}.`,
})

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

function yearOf(date: string) {
	return Number(date.slice(0, 4))
}

function inRange(date: string, from?: string, to?: string) {
	return (!from || date >= from) && (!to || date <= to)
}

function guestName(data: ClubData, guestId: string) {
	return data.guests.find((g) => g._id === guestId)?.name ?? 'Guest'
}

function attendeeName(data: ClubData, runnerId: string) {
	return data.memberByKey.get(runnerId)?.name ?? runnerId
}

function roleCounts(roles: string[][]) {
	const counts: Record<string, number> = {}
	for (const list of roles) {
		for (const role of list) counts[role] = (counts[role] ?? 0) + 1
	}
	return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1]))
}

/** The club's own events in a range, repeats of recurring ones included. */
function ourEventsBetween(data: ClubData, from: string, to: string) {
	const expanded = withoutClashingRepeats(
		expandRecurringRaces(data.races, {
			today: clubToday(),
			horizonDays: Math.max(366, daysBetween(clubToday(), to) + 1),
		}),
	)
	return expanded
		.filter((race) => inRange(race.date, from, to))
		.sort(
			(a, b) =>
				a.date.localeCompare(b.date) ||
				(a.time ?? '').localeCompare(b.time ?? ''),
		)
}

function daysBetween(from: string, to: string) {
	return Math.round(
		(new Date(`${to}T00:00:00Z`).getTime() -
			new Date(`${from}T00:00:00Z`).getTime()) /
			86_400_000,
	)
}

function ourEventRow(
	data: ClubData,
	race: ReturnType<typeof ourEventsBetween>[number],
) {
	return {
		date: race.date,
		name: race.name,
		type: race.type,
		time: race.time,
		location: race.location,
		website: race.website,
		is_major_event: race.majorEvent || undefined,
		repeats:
			race.recurrence && !race.repeatOf
				? describeRecurrence(race.recurrence)
				: undefined,
		is_repeat_of_recurring_event: race.repeatOf ? true : undefined,
		attendees: race.attendees.length
			? race.attendees.map((a) => ({
					name: attendeeName(data, a.runnerId),
					position: a.position,
					time: a.time,
					distance_km: a.distance,
					laps: a.laps,
					class: a.class,
				}))
			: undefined,
		guests: race.guests?.length
			? race.guests.map((g) => ({
					name: guestName(data, g.guestId),
					position: g.position,
					time: g.time,
					distance_km: g.distance,
					laps: g.laps,
					class: g.class,
				}))
			: undefined,
	}
}

function bestPerMember(data: ClubData, results: ResultItem[]) {
	const best = new Map<string, ResultItem>()
	for (const r of results) {
		const current = best.get(r.parkrunId)
		if (!current || timeSeconds(r.time) < timeSeconds(current.time)) {
			best.set(r.parkrunId, r)
		}
	}
	return [...best.values()].sort(
		(a, b) => timeSeconds(a.time) - timeSeconds(b.time),
	)
}

// ---------------------------------------------------------------------------
// The tools
// ---------------------------------------------------------------------------

const getClubOverview: Tool = {
	name: 'get_club_overview',
	title: 'Club overview',
	description:
		'An overview of Scoop Bus Run Club: every member with their parkrun count, latest run, fastest 5k and next milestone, plus club totals and when the data was last updated. A good first call for any question about the club.',
	inputSchema: { type: 'object', properties: {}, additionalProperties: false },
	run: (data) => {
		const today = clubToday()
		const members = data.members.map((m) => {
			const runs = data.resultsBy.get(m.parkrunId) ?? []
			const last = runs.at(-1)
			const fastest = fastestResult(data, runs)
			return {
				name: m.name,
				site_page: `${SITE}/member/${m.key.toLowerCase()}`,
				total_parkruns: m.totalRuns ?? undefined,
				results_on_record: runs.length,
				volunteer_credits: data.volunteersBy.get(m.parkrunId)?.length ?? 0,
				latest_run: last
					? { date: last.date, parkrun: last.eventName, time: last.time }
					: undefined,
				fastest_5k: fastest
					? {
							time: fastest.time,
							parkrun: fastest.eventName,
							date: fastest.date,
						}
					: undefined,
				next_milestone: milestoneOutlook(data, m),
			}
		})
		return {
			club: 'Scoop Bus Run Club',
			website: SITE,
			today,
			data_updated_at: new Date(data.generatedAt).toISOString(),
			latest_results_date: data.latestResultDate,
			totals: {
				members: data.members.length,
				results_on_record: data.results.length,
				volunteer_credits: data.volunteers.length,
				parkruns_visited: new Set(data.results.map((r) => r.event)).size,
				upcoming_club_events_next_30_days: ourEventsBetween(
					data,
					today,
					addDays(today, 30),
				).length,
			},
			members,
		}
	},
}

const getMember: Tool = {
	name: 'get_member',
	title: 'Member profile',
	description:
		"Everything about one member: parkrun totals, overall and per-course personal bests, parkruns visited, recent results, volunteering, next milestone, and the club events they've been to or are signed up for.",
	inputSchema: {
		type: 'object',
		properties: { name: memberSchema },
		required: ['name'],
		additionalProperties: false,
	},
	run: (data, args) => {
		const member = findMember(data, requiredString(args, 'name'))
		const runs = data.resultsBy.get(member.parkrunId) ?? []
		const volunteering = data.volunteersBy.get(member.parkrunId) ?? []
		const fastest = fastestResult(data, runs)
		const today = clubToday()

		const byCourse = new Map<string, ResultItem[]>()
		for (const run of runs) {
			const list = byCourse.get(run.event)
			if (list) list.push(run)
			else byCourse.set(run.event, [run])
		}
		const courses = [...byCourse.values()]
			.map((courseRuns) => {
				const best = bestPerMember(data, courseRuns)[0]
				return {
					parkrun: courseRuns[0].eventName,
					runs: courseRuns.length,
					best_time: best.time,
					best_date: best.date,
					first_visit: courseRuns[0].date,
					is_junior: data.isJunior(courseRuns[0].event) || undefined,
				}
			})
			.sort((a, b) => b.runs - a.runs)

		const theirEvents = data.races.filter((race) =>
			race.attendees.some((a) => a.runnerId === member.key),
		)

		return {
			name: member.name,
			site_page: `${SITE}/member/${member.key.toLowerCase()}`,
			parkrun_id: member.parkrunId || undefined,
			birthday_dd_mm: member.birthday ?? undefined,
			joined_club: member.joined ?? undefined,
			total_parkruns: member.totalRuns ?? undefined,
			total_junior_parkruns: member.totalJuniorRuns || undefined,
			results_on_record: runs.length,
			first_result_on_record: runs[0] ? resultRow(data, runs[0]) : undefined,
			personal_best_5k: fastest ? resultRow(data, fastest) : undefined,
			next_milestone: milestoneOutlook(data, member),
			parkruns_visited: courses.length,
			courses,
			recent_results: runs
				.slice(-10)
				.reverse()
				.map((r) => resultRow(data, r)),
			volunteering: {
				total: volunteering.length,
				roles: roleCounts(volunteering.map((v) => v.roles)),
				latest: volunteering
					.slice(-5)
					.reverse()
					.map((v) => ({ date: v.date, parkrun: v.eventName, roles: v.roles })),
			},
			club_events: {
				attended: theirEvents.filter((r) => r.date < today).length,
				recent: theirEvents
					.filter((r) => r.date < today)
					.slice(-5)
					.reverse()
					.map((race) => {
						const me = race.attendees.find((a) => a.runnerId === member.key)
						return {
							date: race.date,
							name: race.name,
							type: race.type,
							position: me?.position,
							time: me?.time,
							distance_km: me?.distance,
							class: me?.class,
						}
					}),
				upcoming: theirEvents
					.filter((r) => r.date >= today)
					.map((race) => ({
						date: race.date,
						name: race.name,
						time: race.time,
					})),
			},
		}
	},
}

const SORTS = ['date', 'time', 'position', 'age_grade'] as const

const searchResults: Tool = {
	name: 'search_results',
	title: 'Search parkrun results',
	description:
		'Search the club\'s parkrun results, filtered by member, parkrun and date range and sorted by date, time, position or age grade. Use it for questions like "fastest times at Haga in 2025" or "everyone\'s runs last month". Each result says if it was a PB, course PB or milestone run.',
	inputSchema: {
		type: 'object',
		properties: {
			member: memberSchema,
			parkrun: parkrunSchema,
			from: dateSchema('Earliest date, inclusive (YYYY-MM-DD).'),
			to: dateSchema('Latest date, inclusive (YYYY-MM-DD).'),
			sort: {
				type: 'string',
				enum: SORTS,
				description: 'Defaults to date, newest first.',
			},
			order: {
				type: 'string',
				enum: ['asc', 'desc'],
				description:
					'Defaults to newest first for date, fastest/best first for the others.',
			},
			only_pbs: {
				type: 'boolean',
				description: 'Only results that were a PB or course PB.',
			},
			include_guests: {
				type: 'boolean',
				description: 'Also include guests who ran with the club.',
			},
			limit: limitSchema(25, 200),
		},
		additionalProperties: false,
	},
	run: (data, args) => {
		const memberArg = optionalString(args, 'member')
		const member = memberArg ? findMember(data, memberArg) : undefined
		const parkrunArg = optionalString(args, 'parkrun')
		const parkrun = parkrunArg ? findParkrun(data, parkrunArg) : undefined
		const from = optionalDate(args, 'from')
		const to = optionalDate(args, 'to')
		const sort = oneOf(args, 'sort', SORTS, 'date')
		const defaultOrder =
			sort === 'date' || sort === 'age_grade' ? 'desc' : 'asc'
		const order = oneOf(args, 'order', ['asc', 'desc'] as const, defaultOrder)
		const limit = limitArg(args, 25, 200)

		const source = member
			? (data.resultsBy.get(member.parkrunId) ?? [])
			: data.results
		let rows: (ReturnType<typeof resultRow> & { is_guest?: true })[] = source
			.filter(
				(r) =>
					(!parkrun || r.event === parkrun.eventId) &&
					inRange(r.date, from, to),
			)
			.map((r) => resultRow(data, r))
		if (args.only_pbs === true)
			rows = rows.filter((r) => r.is_pb || r.is_course_pb)

		if (args.include_guests === true && !member) {
			for (const g of data.guestResults) {
				if (parkrun && g.event !== parkrun.eventId) continue
				if (!inRange(g.date, from, to)) continue
				rows.push({
					date: g.date,
					runner: g.guestName,
					parkrun: g.eventName,
					event_number: g.eventNumber,
					position: g.position,
					time: g.time,
					is_guest: true,
				} as (typeof rows)[number])
			}
		}

		const value = (r: (typeof rows)[number]) =>
			sort === 'time'
				? timeSeconds(r.time)
				: sort === 'position'
					? r.position
					: sort === 'age_grade'
						? ageGradeValue(r.age_grade ?? '')
						: 0
		rows.sort((a, b) => {
			const diff =
				sort === 'date' ? a.date.localeCompare(b.date) : value(a) - value(b)
			return order === 'asc' ? diff : -diff
		})

		const page = capped(rows, limit)
		return {
			filters: {
				member: member?.name,
				parkrun: parkrun?.name,
				from,
				to,
				sort,
				order,
			},
			matching_results: page.total,
			truncated: page.truncated,
			results: page.items,
		}
	},
}

const getParkrunDay: Tool = {
	name: 'get_parkrun_day',
	title: 'A day of parkrun',
	description:
		'Who in the club ran and volunteered on one day, at which parkruns, with times, positions, PBs, first visits and milestones. Leave out the date for the latest day with results — the usual answer to "how did everyone do on Saturday?".',
	inputSchema: {
		type: 'object',
		properties: {
			date: dateSchema(
				'The day (YYYY-MM-DD). Defaults to the latest day with results.',
			),
		},
		additionalProperties: false,
	},
	run: (data, args) => {
		const date = optionalDate(args, 'date') ?? data.latestResultDate
		if (!date) throw new ToolError('There are no results yet.')

		const results = data.results.filter((r) => r.date === date)
		const volunteers = data.volunteers.filter((v) => v.date === date)
		const guests = data.guestResults.filter((g) => g.date === date)
		const resultDates = [...new Set(data.results.map((r) => r.date))]

		if (!results.length && !volunteers.length && !guests.length) {
			const before = resultDates.filter((d) => d < date).at(-1)
			const after = resultDates.find((d) => d > date)
			throw new ToolError(
				`Nobody in the club has a parkrun on record for ${date}.${before ? ` Closest before: ${before}.` : ''}${after ? ` Closest after: ${after}.` : ''}`,
			)
		}

		const events = new Map<string, { parkrun: string; event_number: number }>()
		const eventKey = (event: string, n: number) => `${event}#${n}`
		for (const r of [...results, ...volunteers, ...guests]) {
			events.set(eventKey(r.event, r.eventNumber), {
				parkrun: r.eventName,
				event_number: r.eventNumber,
			})
		}

		const parkruns = [...events.entries()].map(([key, info]) => {
			const here = (r: { event: string; eventNumber: number }) =>
				eventKey(r.event, r.eventNumber) === key
			return {
				...info,
				runners: results
					.filter(here)
					.sort((a, b) => a.position - b.position)
					.map((r) => {
						const row = resultRow(data, r)
						const firstVisit = data.resultsBy
							.get(r.parkrunId)
							?.find((x) => x.event === r.event)
						return {
							...row,
							date: undefined,
							parkrun: undefined,
							event_number: undefined,
							is_first_visit_to_this_parkrun:
								firstVisit?.date === r.date && !row.is_first_result_on_record
									? true
									: undefined,
						}
					}),
				guests: guests.filter(here).map((g) => ({
					name: g.guestName,
					position: g.position,
					time: g.time,
				})),
				volunteers: volunteers.filter(here).map((v) => ({
					name: memberName(data, v.parkrunId, v.volunteerName),
					roles: v.roles,
				})),
			}
		})

		return {
			date,
			special_day: getSpecialDayName(date) ?? undefined,
			runner_count: results.length,
			parkruns,
			previous_date_with_results: resultDates.filter((d) => d < date).at(-1),
		}
	},
}

const listParkruns: Tool = {
	name: 'list_parkruns',
	title: 'parkruns visited',
	description:
		'The parkruns the club has been to, most-run first, with how many club results each has, how many members have run it, and the first and latest visit. Use it for "where have we been?" or tourism questions.',
	inputSchema: {
		type: 'object',
		properties: {
			country: {
				type: 'string',
				description:
					'Only parkruns in this country, as stored (e.g. "SE" or "Sweden").',
			},
			limit: limitSchema(50, 200),
		},
		additionalProperties: false,
	},
	run: (data, args) => {
		const country = optionalString(args, 'country')?.toLowerCase()
		const rows = data.parkruns
			.filter((e) => !country || e.country.toLowerCase() === country)
			.map((e) => {
				const runs = data.results.filter((r) => r.event === e.eventId)
				return {
					parkrun: e.name,
					id: e.eventId,
					country: e.country,
					url: e.url,
					club_results: runs.length,
					members_who_ran_it: new Set(runs.map((r) => r.parkrunId)).size,
					volunteer_credits: data.volunteers.filter(
						(v) => v.event === e.eventId,
					).length,
					first_visit: runs[0]?.date,
					latest_visit: runs.at(-1)?.date,
					is_junior: data.isJunior(e.eventId) || undefined,
				}
			})
			.filter((row) => row.club_results > 0 || row.volunteer_credits > 0)
			.sort((a, b) => b.club_results - a.club_results)
		const page = capped(rows, limitArg(args, 50, 200))
		return {
			count: page.total,
			countries: [...new Set(rows.map((r) => r.country))],
			truncated: page.truncated,
			parkruns: page.items,
		}
	},
}

const getParkrun: Tool = {
	name: 'get_parkrun',
	title: 'One parkrun',
	description:
		"The club's history at one parkrun: visits, first and latest visit, each member's best time and run count there, and volunteering.",
	inputSchema: {
		type: 'object',
		properties: { name: parkrunSchema },
		required: ['name'],
		additionalProperties: false,
	},
	run: (data, args) => {
		const parkrun = findParkrun(data, requiredString(args, 'name'))
		const runs = data.results.filter((r) => r.event === parkrun.eventId)
		const volunteering = data.volunteers.filter(
			(v) => v.event === parkrun.eventId,
		)

		const counts = new Map<string, number>()
		for (const r of runs)
			counts.set(r.parkrunId, (counts.get(r.parkrunId) ?? 0) + 1)

		return {
			parkrun: parkrun.name,
			id: parkrun.eventId,
			country: parkrun.country,
			url: parkrun.url,
			is_junior: data.isJunior(parkrun.eventId) || undefined,
			club_results: runs.length,
			club_visits: new Set(runs.map((r) => r.eventNumber)).size,
			first_visit: runs[0] ? resultRow(data, runs[0]) : undefined,
			latest_visit_date: runs.at(-1)?.date,
			members: bestPerMember(data, runs).map((best) => ({
				name: memberName(data, best.parkrunId, best.runnerName),
				runs: counts.get(best.parkrunId),
				best_time: best.time,
				best_date: best.date,
			})),
			volunteering: {
				total: volunteering.length,
				roles: roleCounts(volunteering.map((v) => v.roles)),
				by_member: Object.fromEntries(
					[...new Set(volunteering.map((v) => v.parkrunId))].map((id) => [
						memberName(data, id, id),
						volunteering.filter((v) => v.parkrunId === id).length,
					]),
				),
			},
		}
	},
}

const METRICS = [
	'total_parkruns',
	'fastest_time',
	'parkruns_visited',
	'volunteer_credits',
	'best_age_grade',
] as const

const getLeaderboard: Tool = {
	name: 'get_leaderboard',
	title: 'Leaderboard',
	description:
		"Rank the members by one measure, optionally at one parkrun or in one year. total_parkruns is parkrun's own lifetime count unless a filter is given, when it counts the results on record that match. fastest_time leaves out junior parkruns unless the parkrun filter is a junior one.",
	inputSchema: {
		type: 'object',
		properties: {
			metric: { type: 'string', enum: METRICS },
			parkrun: parkrunSchema,
			year: {
				type: 'integer',
				description: 'Only this calendar year, e.g. 2025.',
			},
			limit: limitSchema(20, 50),
		},
		required: ['metric'],
		additionalProperties: false,
	},
	run: (data, args) => {
		const metric = oneOf(args, 'metric', METRICS)
		const parkrunArg = optionalString(args, 'parkrun')
		const parkrun = parkrunArg ? findParkrun(data, parkrunArg) : undefined
		const year = optionalYear(args)
		const limit = limitArg(args, 20, 50)
		const matches = (r: { event: string; date: string }) =>
			(!parkrun || r.event === parkrun.eventId) &&
			(!year || yearOf(r.date) === year)

		const rows: {
			name: string
			value: number | string
			detail?: unknown
			sortKey: number
		}[] = []
		for (const member of data.members) {
			const runs = (data.resultsBy.get(member.parkrunId) ?? []).filter(matches)
			const volunteering = (
				data.volunteersBy.get(member.parkrunId) ?? []
			).filter(matches)
			switch (metric) {
				case 'total_parkruns': {
					const value =
						parkrun || year ? runs.length : (member.totalRuns ?? runs.length)
					if (value) rows.push({ name: member.name, value, sortKey: -value })
					break
				}
				case 'fastest_time': {
					const eligible =
						parkrun && data.isJunior(parkrun.eventId)
							? runs
							: runs.filter((r) => !data.isJunior(r.event))
					const best = bestPerMember(data, eligible)[0]
					if (best) {
						rows.push({
							name: member.name,
							value: best.time,
							detail: { parkrun: best.eventName, date: best.date },
							sortKey: timeSeconds(best.time),
						})
					}
					break
				}
				case 'parkruns_visited': {
					const value = new Set(runs.map((r) => r.event)).size
					if (value) rows.push({ name: member.name, value, sortKey: -value })
					break
				}
				case 'volunteer_credits': {
					const value = volunteering.length
					if (value) rows.push({ name: member.name, value, sortKey: -value })
					break
				}
				case 'best_age_grade': {
					let best: ResultItem | undefined
					for (const r of runs) {
						if (
							!best ||
							ageGradeValue(r.ageGrade) > ageGradeValue(best.ageGrade)
						)
							best = r
					}
					if (best && ageGradeValue(best.ageGrade) > 0) {
						rows.push({
							name: member.name,
							value: best.ageGrade,
							detail: {
								parkrun: best.eventName,
								date: best.date,
								time: best.time,
							},
							sortKey: -ageGradeValue(best.ageGrade),
						})
					}
					break
				}
			}
		}

		rows.sort((a, b) => a.sortKey - b.sortKey)
		return {
			metric,
			filters: { parkrun: parkrun?.name, year },
			leaderboard: rows.slice(0, limit).map(({ sortKey: _, ...row }, i) => ({
				rank: i + 1,
				...row,
			})),
		}
	},
}

const MAX_CALENDAR_DAYS = 366

const getCalendar: Tool = {
	name: 'get_calendar',
	title: 'Club calendar',
	description:
		'The club calendar for a date range, as on scoopbus.run/calendar: club events and races, birthdays, milestone runs (past and projected), distance milestones, and who ran which parkrun on past days. Defaults to the next 30 days — the answer to "what\'s coming up?".',
	inputSchema: {
		type: 'object',
		properties: {
			from: dateSchema('First day, inclusive (YYYY-MM-DD). Defaults to today.'),
			to: dateSchema(
				'Last day, inclusive (YYYY-MM-DD). Defaults to 30 days after from.',
			),
		},
		additionalProperties: false,
	},
	run: (data, args) => {
		const from = optionalDate(args, 'from') ?? clubToday()
		const to = optionalDate(args, 'to') ?? addDays(from, 30)
		if (to < from) throw new ToolError('"to" is before "from".')
		if (daysBetween(from, to) >= MAX_CALENDAR_DAYS) {
			throw new ToolError(
				`Ask for at most ${MAX_CALENDAR_DAYS} days at a time.`,
			)
		}

		const index = indexCalendarEntries(
			{
				results: data.results,
				volunteers: data.volunteers,
				guestResults: data.guestResults,
				races: data.races,
				runners: data.members.flatMap((m) =>
					m.totalRuns === null
						? []
						: [
								{
									parkrunId: m.parkrunId,
									name: m.name,
									totalRuns: m.totalRuns,
								},
							],
				),
			},
			{ eventName: data.eventName, today: clubToday() },
		)

		const days: unknown[] = []
		for (let date = from; date <= to; date = addDays(date, 1)) {
			const entries = entriesForDate(index, date)
			if (!entries.length) continue
			days.push({
				date,
				special_day: getSpecialDayName(date) ?? undefined,
				entries: entries.map((e) => ({
					kind: e.kind,
					emoji: e.emoji,
					name: e.name,
					time: e.time,
					detail: e.tooltip ?? e.detail,
					location: e.location,
					type: e.raceType,
					people: e.people.length ? e.people : undefined,
					volunteers: e.volunteers.length ? e.volunteers : undefined,
					link: e.url ?? (e.href ? `${SITE}${e.href}` : undefined),
				})),
			})
		}

		return { from, to, today: clubToday(), days }
	},
}

const listOurEvents: Tool = {
	name: 'list_our_events',
	title: 'Club events and races',
	description:
		"The club's own events and races (not parkrun) in a date range, with who went or is going and their results. Recurring events are expanded into their dates. Defaults to the next 90 days.",
	inputSchema: {
		type: 'object',
		properties: {
			from: dateSchema('First day, inclusive (YYYY-MM-DD). Defaults to today.'),
			to: dateSchema(
				'Last day, inclusive (YYYY-MM-DD). Defaults to 90 days after from.',
			),
			search: {
				type: 'string',
				description: 'Only events whose name, type or location contains this.',
			},
			limit: limitSchema(50, 200),
		},
		additionalProperties: false,
	},
	run: (data, args) => {
		const from = optionalDate(args, 'from') ?? clubToday()
		const to = optionalDate(args, 'to') ?? addDays(from, 90)
		if (to < from) throw new ToolError('"to" is before "from".')
		const search = optionalString(args, 'search')?.toLowerCase()
		const limit = limitArg(args, 50, 200)

		const events = ourEventsBetween(data, from, to).filter(
			(race) =>
				!search ||
				[race.name, race.type, race.location].some((text) =>
					text?.toLowerCase().includes(search),
				),
		)
		const page = capped(events, limit)
		return {
			from,
			to,
			count: page.total,
			truncated: page.truncated,
			events: page.items.map((race) => ourEventRow(data, race)),
		}
	},
}

export const TOOLS: Tool[] = [
	getClubOverview,
	getMember,
	searchResults,
	getParkrunDay,
	listParkruns,
	getParkrun,
	getLeaderboard,
	getCalendar,
	listOurEvents,
]
