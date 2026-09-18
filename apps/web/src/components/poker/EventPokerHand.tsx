import { Tooltip } from '@/components/ui/Tooltip'
import { HAND_INFO, type PokerHand, pokerRoute } from '@/utils/poker'
import { A } from '@solidjs/router'
import { css, cx } from '@style/css'
import { For, Show } from 'solid-js'
import { PokerCardMini } from './PokerCards'

/**
 * The poker hand an event earned, as a button beside "Watch Replay" that leads
 * to that day's table. The hand's cards fan out over the button's left edge, a
 * few pixels bigger than the button so they read as cards, not an icon.
 * High Card is not a celebration, so nothing renders for it.
 */
export function EventPokerHand(props: {
	hand: PokerHand | null | undefined
	/** The event's date, so the link opens the right day. */
	date: string
	class?: string
}) {
	return (
		<Show when={props.hand && props.hand.type !== 'highCard' && props.hand}>
			{(hand) => (
				<Tooltip
					content={`${hand().label}: ${HAND_INFO[hand().type].description}`}
				>
					<A href={pokerRoute(props.date)} class={cx(props.class, styles.link)}>
						<span class={styles.fan}>
							<For each={hand().cards}>
								{(card, i) => (
									<PokerCardMini
										card={card}
										tooltip={false}
										class={styles.card}
										style={{
											rotate: `${fanAngle(i(), hand().cards.length)}deg`,
										}}
									/>
								)}
							</For>
						</span>
						{hand().label}
					</A>
				</Tooltip>
			)}
		</Show>
	)
}

/** Tilt for card `i` of `n`, spreading a hand from leaning left to leaning right. */
function fanAngle(i: number, n: number): number {
	if (n < 2) return -8
	return -10 + (20 * i) / (n - 1)
}

const styles = {
	link: css({
		display: 'inline-flex',
		alignItems: 'center',
		gap: '0.5rem',
	}),
	fan: css({
		display: 'inline-flex',
		alignItems: 'center',
		flexShrink: 0,
		// Taller than the button and hanging off its left edge; the negative
		// margins let the cards overflow it.
		fontSize: '1.35em',
		margin: '-0.45em 0 -0.45em -1.1em',
	}),
	card: css({
		boxShadow: '2px 2px 0 var(--overlay-black-30)',
		// Each card sits on the one before it
		'&:not(:first-child)': { ml: '-0.7em' },
	}),
}
