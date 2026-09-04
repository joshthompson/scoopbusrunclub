import { A } from '@solidjs/router'
import { css } from '@style/css'
import { Show, createResource } from 'solid-js'
import { fetchLargestClubs } from '../utils/api'
import { largestClubMessage } from '../utils/largestClubs'
import { DirtBlock } from './ui/DirtBlock'
import { Emoji } from './ui/Emoji'

/**
 * Homepage block tracking Scoop Bus Run Club's progress towards being the
 * largest parkrun club in Sweden, by total runs started.
 */
export function LargestClub() {
	const [summary] = createResource(fetchLargestClubs)
	const message = () => largestClubMessage(summary())

	return (
		<Show when={message()}>
			{(text) => (
				<DirtBlock title="Largest Club">
					<p class={styles.message}>{text()}</p>
					<A href="/largestclubs" class={styles.link}>
						<Emoji emoji="🏆" animation="none" /> Largest clubs
					</A>
				</DirtBlock>
			)}
		</Show>
	)
}

const styles = {
	message: css({
		margin: 0,
	}),
	link: css({
		display: 'inline-block',
		mt: '0.75rem',
		color: 'inherit',
		textDecoration: 'underline',
		fontWeight: 'bold',
	}),
}
