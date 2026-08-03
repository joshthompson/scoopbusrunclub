import type { LargestClub, LargestClubsSummary } from './api'
import { formatDate } from './misc'

/**
 * Turns the largest-clubs summary into the one-line status of Scoop Bus Run
 * Club's race to be the biggest parkrun club in Sweden.
 */

export const SCOOP_BUS_CLUB_NAME = 'Scoop Bus Run Club'

function addDays(date: Date, days: number): Date {
	const shifted = new Date(date)
	shifted.setDate(shifted.getDate() + days)
	return shifted
}

/**
 * The Saturday `weeks` after the snapshot week, rolled forward if that date has
 * already passed — projections are always a Saturday still to come.
 */
export function projectedSaturday(week: string, weeks: number): Date {
	const today = new Date()
	today.setHours(0, 0, 0, 0)

	let date = addDays(new Date(`${week}T00:00:00`), weeks * 7)
	while (date <= today) date = addDays(date, 7)
	return date
}

/** "A", "A and B", "A, B and C" */
function listNames(clubs: LargestClub[]): string {
	const names = clubs.map((club) => club.name)
	if (names.length <= 1) return names.join('')
	return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/** The rival closest to passing us, if any is projected to. */
function soonestOvertaker(rivals: LargestClub[]): LargestClub | null {
	let soonest: LargestClub | null = null
	for (const rival of rivals) {
		if (rival.weeksToOvertakeScoopBus === null) continue
		if (
			soonest?.weeksToOvertakeScoopBus == null ||
			rival.weeksToOvertakeScoopBus < soonest.weeksToOvertakeScoopBus
		) {
			soonest = rival
		}
	}
	return soonest
}

/**
 * The homepage sentence, or null when there's nothing to say (no snapshots yet,
 * or Scoop Bus isn't in the league table).
 */
export function largestClubMessage(
	summary: LargestClubsSummary | null | undefined,
): string | null {
	if (!summary?.week) return null

	const scoopBus = summary.clubs.find((club) => club.isScoopBus)
	if (!scoopBus) return null

	const rivals = summary.clubs.filter((club) => !club.isScoopBus)
	const ahead = rivals.filter((club) => club.events > scoopBus.events)
	const tied = rivals.filter((club) => club.events === scoopBus.events)
	const runs = scoopBus.events.toLocaleString()

	// Tied for first
	if (ahead.length === 0 && tied.length > 0) {
		return `Scoop Bus Run Club is tied for largest club in Sweden with ${listNames(tied)} and ${runs} total runs!`
	}

	// Largest outright
	if (ahead.length === 0) {
		const chaser = soonestOvertaker(rivals)
		if (!chaser?.weeksToOvertakeScoopBus) {
			return `Scoop Bus Run Club is the largest club in Sweden with ${runs} total runs!`
		}
		const date = formatDate(
			projectedSaturday(summary.week, chaser.weeksToOvertakeScoopBus),
		)
		return `Scoop Bus Run Club is the largest club in Sweden with ${runs} total runs but ${chaser.name} is likely to overtake on ${date}!`
	}

	// Chasing the leader
	const leader = ahead.reduce((best, club) =>
		club.events > best.events ? club : best,
	)
	const behindBy = leader.events - scoopBus.events
	const runWord = behindBy === 1 ? 'run' : 'runs'

	if (summary.estimatedWeeksToLargest !== null) {
		const date = formatDate(
			projectedSaturday(summary.week, summary.estimatedWeeksToLargest),
		)
		return `Scoop Bus Run Club is ${behindBy.toLocaleString()} ${runWord} behind ${leader.name} and is projected to overtake on ${date}!`
	}

	return `Scoop Bus Run Club is ${behindBy.toLocaleString()} ${runWord} behind ${leader.name} but isn't projected to overtake.`
}
