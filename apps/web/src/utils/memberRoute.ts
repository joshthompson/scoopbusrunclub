/**
 * Member page routes.
 *
 * The lookups themselves live in `@shared/members`, alongside the names and
 * parkrun ids they match on, so the backend resolves the same member to the
 * same page.
 */

import { memberKeyFromRoute, memberRoute } from '@shared/members'

export function getMemberRoute(
	parkrunId?: string,
	runnerName?: string,
): string | null {
	return memberRoute(parkrunId, runnerName)
}

export function getRunnerKeyFromRouteName(routeName?: string): string | null {
	return memberKeyFromRoute(routeName)
}
