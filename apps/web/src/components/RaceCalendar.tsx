import { Emoji, EmojiString } from '@/components/ui/Emoji'
import { runners } from '@/data/runners'
import type { RunnerName } from '@/data/runners'
import type {
	GuestItem,
	RaceItem,
	RunResultItem,
	VolunteerItem,
} from '@/utils/api'
import { raceEmoji, toISODate } from '@/utils/calendar'
import { formatDate } from '@/utils/misc'
import {
	isParkrunTrip,
	withoutReportedTrips,
} from '@shared/calendar/parkrun-trips'
import {
	expandRecurringRaces,
	withoutClashingRepeats,
} from '@shared/calendar/recurrence'
import { A } from '@solidjs/router'
import { css } from '@style/css'
import { For, Show } from 'solid-js'
import { DirtBlock } from './ui/DirtBlock'

/**
 * What the club has coming up: the races worth a mention, and every Scoop Bus
 * trip out to another parkrun. A repeating event is listed on each of the dates
 * it comes round on, and a trip drops off once parkrun has reported it, by which
 * point the results say the same thing.
 */
export function RaceCalendar(props: {
	races: RaceItem[]
	guests?: GuestItem[]
	results?: RunResultItem[]
	volunteers?: VolunteerItem[]
}) {
	const upcoming = () => {
		const today = toISODate(new Date())
		return withoutClashingRepeats(
			withoutReportedTrips(
				expandRecurringRaces(props.races, { today }),
				props.results ?? [],
				props.volunteers ?? [],
			),
		)
			.filter((r) => (r.majorEvent || isParkrunTrip(r)) && r.date >= today)
			.sort((a, b) => a.date.localeCompare(b.date))
	}

	const guestRecord = (guestId: string) =>
		(props.guests ?? []).find((g) => g._id === guestId)

	return (
		<Show when={upcoming().length > 0}>
			<DirtBlock title="Race Calendar">
				<div class={styles.races}>
					<For each={upcoming()}>
						{(race) => (
							<div>
								<h4 class={styles.raceName}>
									<Emoji emoji={raceEmoji(race)} />{' '}
									<Show
										when={isParkrunTrip(race) && race.website}
										fallback={<EmojiString text={race.name} />}
									>
										{(website) => (
											<a
												href={website()}
												target="_blank"
												rel="noreferrer"
												class={styles.link}
											>
												<EmojiString text={race.name} />
											</a>
										)}
									</Show>
								</h4>
								<p>
									{formatDate(new Date(`${race.date}T00:00:00`))}
									{race.time ? `, ${race.time}` : ''}
								</p>
								<p>
									{[
										...race.attendees.map((r) => {
											const runner = runners[r.runnerId as RunnerName]
											return {
												key: r.runnerId,
												name: runner ? runner[0]().name : r.runnerId,
												href: `/member/${r.runnerId}`,
											}
										}),
										...(race.guests ?? []).map((g) => {
											const guest = guestRecord(g.guestId)
											return {
												key: g.guestId,
												name: `${guest?.name ?? 'Guest'} 👋`,
												href: `/guests/${guest?.parkrunId ?? g.guestId}`,
											}
										}),
									].map((person, i) => (
										<>
											{i > 0 && ', '}
											<A
												key={person.key}
												href={person.href}
												class={styles.link}
											>
												{person.name}
											</A>
										</>
									))}
								</p>
							</div>
						)}
					</For>
				</div>
			</DirtBlock>
		</Show>
	)
}

const styles = {
	races: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '1rem',
	}),
	raceName: css({
		fontWeight: 'bold',
	}),
	link: css({
		color: 'inherit',
		textDecoration: 'underline',
		fontWeight: 'bold',
	}),
}
