import { runners } from '@/data/runners'
import type { RunnerName } from '@/data/runners'
import type { RaceItem } from '@/utils/api'
import { formatDate } from '@/utils/misc'
import { A } from '@solidjs/router'
import { css } from '@style/css'
import { For, Show } from 'solid-js'
import { DirtBlock } from './ui/DirtBlock'

export function RaceCalendar(props: { races: RaceItem[] }) {
	const upcoming = () =>
		props.races.filter((r) => r.majorEvent && new Date(r.date) >= new Date())
	return (
		<Show when={upcoming().length > 0}>
			<DirtBlock title="Race Calendar">
				<div class={styles.races}>
					<For each={upcoming()}>
						{(race) => (
							<div>
								<h4 class={styles.raceName}>{race.name}</h4>
								<p>{formatDate(new Date(`${race.date}T00:00:00`))}</p>
								<p>
									{race.attendees.map((r, i) => {
										const runner = runners[r.runnerId as RunnerName]
										const name = runner ? runner[0]().name : r.runnerId
										return (
											<>
												{i > 0 && ', '}
												<A
													key={r.runnerId}
													href={`/member/${r.runnerId}`}
													class={styles.link}
												>
													{name}
												</A>
											</>
										)
									})}
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
