import shadowAsset from '@/assets/runners/shadow.png'
import { createRunnerFrames } from '@/utils/createRunnerFrames'
import { type CustomRacer, daysRemaining } from '@/utils/customRacers'
import { css } from '@style/css'
import { Show, createMemo } from 'solid-js'

/**
 * One visitor-made racer, sitting. Deliberately not `CharacterImage` — that has
 * a name-based special case for club members which a visitor could trip by
 * naming their racer after one.
 */
export function RacerCard(props: {
	racer: CustomRacer
	/** Shown on your own racers, where the week left and any hold-up are useful. */
	showStatus?: boolean
}) {
	const sitFrame = createMemo(() => {
		try {
			return createRunnerFrames(props.racer.avatar).frames.sit?.[0]
		} catch {
			return undefined
		}
	})

	const days = () => daysRemaining(props.racer.expiresAt)

	return (
		<div class={styles.card}>
			<div class={styles.figure}>
				<Show when={sitFrame()}>
					{(frame) => <img src={frame()} alt="" class={styles.sprite} />}
				</Show>
				<img src={shadowAsset} alt="" class={styles.shadow} />
			</div>
			<span class={styles.name}>{props.racer.name}</span>
			<Show when={props.showStatus}>
				<span class={styles.status}>
					<Show when={!props.racer.pending} fallback="Waiting to be approved">
						{days() === 1 ? 'Last day' : `${days()} days left`}
					</Show>
				</span>
			</Show>
		</div>
	)
}

const styles = {
	card: css({
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		gap: '0.15rem',
		width: '110px',
	}),
	figure: css({
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		height: '80px',
		justifyContent: 'flex-end',
	}),
	sprite: css({
		height: '70px',
		imageRendering: 'pixelated',
	}),
	shadow: css({
		width: '48px',
		mt: '-6px',
		filter: 'brightness(0)',
		opacity: 0.15,
	}),
	name: css({
		fontWeight: 'bold',
		fontSize: '0.9rem',
		textAlign: 'center',
		wordBreak: 'break-word',
	}),
	status: css({
		fontSize: '0.7rem',
		textTransform: 'uppercase',
		letterSpacing: '0.05em',
		opacity: 0.75,
		textAlign: 'center',
	}),
}
