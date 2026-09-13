/**
 * The notifications that go out at a time rather than on an event.
 *
 * Two of them: a heads-up on the morning of a major race, and Wrapped going
 * live on 1 December. Both are due at 9am Swedish time, which Convex's crons —
 * which run in UTC — can't express, because Sweden moves an hour twice a year.
 * So the cron ticks hourly and this decides whether it's nine o'clock in
 * Stockholm, which stays true through both clock changes without an offset
 * being written down anywhere.
 */

import { expandRecurringRaces } from '../../../libs/shared/calendar/recurrence'
import { CLUB_MEMBERS, type MemberKey } from '../../../libs/shared/members'
import {
	buildRace,
	buildWrapped,
	raceKey,
	wrappedKey,
} from '../../../libs/shared/notifications/messages'
import { internal } from './_generated/api'
import { internalAction, internalQuery } from './_generated/server'

/** The club's timezone. Every scheduled notification is due by this clock. */
const CLUB_TIMEZONE = 'Europe/Stockholm'

/** The hour, in the club's timezone, that scheduled notifications go out. */
const SEND_HOUR = 9

/** Wrapped goes live on the first of December. */
const WRAPPED_MONTH = 12
const WRAPPED_DAY = 1

interface ClubNow {
	/** YYYY-MM-DD in the club's timezone. */
	date: string
	year: number
	month: number
	day: number
	hour: number
}

/**
 * The wall clock in Stockholm right now.
 *
 * Two ways of getting there, because this runs unattended once an hour and a
 * wrong answer is either a notification at the wrong time or a cron that throws
 * every hour forever. `Intl` is the correct way and is tried first; if the
 * runtime turns out to ship without timezone data it throws a RangeError on an
 * unknown zone, and the EU rules below answer instead.
 */
function clubNow(at: Date = new Date()): ClubNow {
	return clubNowViaIntl(at) ?? clubNowViaEuRules(at)
}

/**
 * `en-CA` because it renders a date the way the rest of the codebase writes one
 * — YYYY-MM-DD — and `h23` so midnight is hour 0 rather than 24.
 *
 * Returns null rather than throwing when the runtime can't do it, so the caller
 * can fall back.
 */
function clubNowViaIntl(at: Date): ClubNow | null {
	try {
		const parts = new Intl.DateTimeFormat('en-CA', {
			timeZone: CLUB_TIMEZONE,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			hourCycle: 'h23',
		}).formatToParts(at)

		const value = (type: Intl.DateTimeFormatPartTypes) =>
			parts.find((part) => part.type === type)?.value

		const year = value('year')
		const month = value('month')
		const day = value('day')
		const hour = value('hour')
		if (!year || !month || !day || hour === undefined) return null

		return {
			date: `${year}-${month}-${day}`,
			year: Number(year),
			month: Number(month),
			day: Number(day),
			hour: Number(hour),
		}
	} catch {
		return null
	}
}

/**
 * Sweden's clock worked out from the EU rule, for a runtime without timezone
 * data: UTC+1, and UTC+2 between 01:00 UTC on the last Sunday of March and
 * 01:00 UTC on the last Sunday of October.
 *
 * Written down here only as a backstop. If the EU ever does abolish the clock
 * change, this is the thing that goes wrong — and `Intl`, which would have got
 * it right, is what normally answers.
 */
function clubNowViaEuRules(at: Date): ClubNow {
	const summerTime =
		at >= lastSundayAt01Utc(at.getUTCFullYear(), 2) &&
		at < lastSundayAt01Utc(at.getUTCFullYear(), 9)

	const shifted = new Date(at.getTime() + (summerTime ? 2 : 1) * 60 * 60 * 1000)
	const pad = (n: number) => String(n).padStart(2, '0')
	const year = shifted.getUTCFullYear()
	const month = shifted.getUTCMonth() + 1
	const day = shifted.getUTCDate()

	return {
		date: `${year}-${pad(month)}-${pad(day)}`,
		year,
		month,
		day,
		hour: shifted.getUTCHours(),
	}
}

/** 01:00 UTC on the last Sunday of a month, where the clocks change. */
function lastSundayAt01Utc(year: number, monthIndex: number): Date {
	// Day 0 of the next month is the last day of this one.
	const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0))
	const lastSunday = lastDay.getUTCDate() - lastDay.getUTCDay()
	return new Date(Date.UTC(year, monthIndex, lastSunday, 1))
}

// ---------------------------------------------------------------------------
// Reading the calendar
// ---------------------------------------------------------------------------

/**
 * The major races landing on a given day, with who's running them.
 *
 * Recurring races are expanded rather than looked up by date, because a repeat
 * isn't a row in the table — only the first of the series is. A repeat carries
 * no attendees, so in practice it's the written-up races that have somebody to
 * name, which is exactly the ones worth announcing.
 */
export const majorRacesOn = internalQuery({
	args: {},
	handler: async (ctx) => {
		const today = clubNow().date
		const races = await ctx.db.query('races').collect()

		const sources = races
			.filter((race) => race.public && race.majorEvent)
			.map((race) => ({
				_id: race._id as string,
				date: race.date,
				name: race.name,
				type: race.type,
				time: race.time,
				recurrence: race.recurrence,
				attendees: race.attendees,
				majorEvent: race.majorEvent,
			}))

		// Horizon 0 stops the expansion at today, so a weekly series gives its
		// occurrences up to now and nothing beyond.
		return expandRecurringRaces(sources, { today, horizonDays: 0 })
			.filter((race) => race.date === today)
			.map((race) => ({
				id: race._id,
				date: race.date,
				name: race.name,
				attendees: race.attendees.map((attendee) => attendee.runnerId),
			}))
	},
})

// ---------------------------------------------------------------------------
// The tick
// ---------------------------------------------------------------------------

/**
 * Runs every hour; does something on one of them.
 *
 * Both notifications claim a dedupe key that includes the day, so an hour that
 * fires twice — a retry, a clock change — can't send anything twice.
 */
export const hourlyTick = internalAction({
	args: {},
	handler: async (ctx) => {
		const now = clubNow()
		if (now.hour !== SEND_HOUR) return { sent: 0 }

		const candidates: {
			kind: string
			dedupeKey: string
			payload: ReturnType<typeof buildWrapped>
		}[] = []

		// --- Wrapped, on 1 December ---

		if (now.month === WRAPPED_MONTH && now.day === WRAPPED_DAY) {
			candidates.push({
				kind: 'wrapped',
				dedupeKey: wrappedKey(now.year),
				payload: buildWrapped(now.year),
			})
		}

		// --- Major races happening today ---

		const races = await ctx.runQuery(internal.notificationSchedule.majorRacesOn)

		for (const race of races) {
			const names = race.attendees
				.map((key) => CLUB_MEMBERS[key as MemberKey]?.name)
				.filter((name): name is string => Boolean(name))

			// Nobody signed up is nothing to announce — "Today will be running" is
			// not a sentence, and a race with no Scoop Bussers in it isn't news.
			if (names.length === 0) continue

			candidates.push({
				kind: 'race',
				dedupeKey: raceKey(race.id, race.date),
				payload: buildRace(race.name, names),
			})
		}

		if (candidates.length === 0) return { sent: 0 }

		const claimed = await ctx.runMutation(
			internal.notifications.claimDedupeKeys,
			{
				keys: candidates.map((c) => ({
					dedupeKey: c.dedupeKey,
					kind: c.kind,
				})),
			},
		)

		const claimedSet = new Set(claimed)
		let sent = 0
		for (const candidate of candidates) {
			if (!claimedSet.has(candidate.dedupeKey)) continue
			await ctx.scheduler.runAfter(0, internal.notificationsSend.sendToAll, {
				payload: candidate.payload,
			})
			sent++
		}

		return { sent }
	},
})
