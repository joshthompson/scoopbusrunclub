/**
 * The calendar page's entries.
 *
 * All of the logic — what counts as an entry, who was there, the standing
 * Wednesday, the birthdays — lives in `@shared/calendar/entries`, which the
 * Convex backend also uses to generate the subscribable .ics feed. The only
 * thing this layer adds is where the website looks event names up, so a change
 * to the calendar shows up on the page and in the feed at once.
 */

import {
	type CalendarEntry,
	type CalendarSources,
	indexCalendarEntries as indexCalendarEntriesWith,
} from '@shared/calendar/entries'
import { getEventName } from './events'

export {
	CALENDAR_ENTRY_KINDS,
	WEEKDAY_LABELS,
	birthdayEntries,
	buildCalendarMonth,
	entriesForDate,
	formatMonthTitle,
	parseISODate,
	parseMonthKey,
	toISODate,
	toMonthKey,
	upcomingCalendarDays,
	type CalendarDay,
	type CalendarEntry,
	type CalendarEntryKind,
	type CalendarSources,
} from '@shared/calendar/entries'

export function indexCalendarEntries(
	sources: CalendarSources,
): Map<string, CalendarEntry[]> {
	return indexCalendarEntriesWith(sources, { eventName: getEventName })
}
