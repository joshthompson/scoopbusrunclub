/**
 * The club's journey out of Stockholm, with the site's event names bound in.
 *
 * The journey itself lives in `@shared/calendar/journey`, so the calendar feed
 * the backend generates measures the same distances. Junior parkruns are only
 * 2km, and only the event's name says so, so anything that has to weigh a run
 * needs a way to look that name up — here it's the events the app has loaded.
 */

import {
	isJuniorEvent as isJuniorEventWith,
	journeyMilestonesByDate as journeyMilestonesByDateWith,
	journeyMilestones as journeyMilestonesWith,
	resultDistanceKm as resultDistanceKmWith,
} from '@shared/calendar/journey'
import type { RunResultSource } from '@shared/calendar/types'
import { getEventName } from './events'

export {
	JOURNEY_WAYPOINTS,
	JUNIOR_PARKRUN_DISTANCE_KM,
	PARKRUN_DISTANCE_KM,
	journeyMilestoneDetail,
	journeyMilestoneShortDetail,
	journeyMilestoneTitle,
	type JourneyMilestone,
	type JourneyWaypoint,
} from '@shared/calendar/journey'

export function isJuniorEvent(eventId: string): boolean {
	return isJuniorEventWith(eventId, getEventName)
}

export function resultDistanceKm(result: { event: string }): number {
	return resultDistanceKmWith(result, getEventName)
}

export function journeyMilestones(results: RunResultSource[]) {
	return journeyMilestonesWith(results, getEventName)
}

export function journeyMilestonesByDate(results: RunResultSource[]) {
	return journeyMilestonesByDateWith(results, getEventName)
}
