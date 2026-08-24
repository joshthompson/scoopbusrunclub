import { BackSignButton } from '@/components/BackSignButton'
import { RacerCard } from '@/components/customRacer/RacerCard'
import { FieldBlock } from '@/components/ui/FieldBlock'
import {
	RACER_LIFETIME_DAYS,
	fetchCustomRacers,
	fetchMyRacers,
	getRacerSecretId,
	hasMadeRacer,
} from '@/utils/customRacers'
import { A } from '@solidjs/router'
import { css } from '@style/css'
import {
	For,
	Show,
	createMemo,
	createResource,
	createSignal,
	onMount,
} from 'solid-js'

export function CustomRacersPage() {
	const [racers] = createResource(fetchCustomRacers)

	// Only look up your own racers if this browser has made one — otherwise there
	// is nothing to find and no reason to mint a secret id for a passer-by.
	const [secretId, setSecretId] = createSignal<string | undefined>()
	onMount(() => {
		if (hasMadeRacer()) setSecretId(getRacerSecretId())
	})
	const [mine] = createResource(secretId, fetchMyRacers)

	const mineIds = createMemo(
		() => new Set((mine()?.racers ?? []).map((r) => r._id)),
	)

	/**
	 * Everyone else's racers plus your own — your own come from a separate call
	 * that also returns any of yours the public list is holding back, so they're
	 * merged in rather than shown twice.
	 */
	const everyone = createMemo(() => {
		const own = mine()?.racers ?? []
		const others = (racers() ?? []).filter((r) => !mineIds().has(r._id))
		return [...own, ...others].sort((a, b) => b.createdAt - a.createdAt)
	})

	return (
		<div class={styles.container}>
			<FieldBlock title="Custom Racers" signType="purple">
				<p class={styles.intro}>
					Racers made by visitors to the site. Each one runs in the header for{' '}
					{RACER_LIFETIME_DAYS} days before heading home.
				</p>

				<Show
					when={everyone().length > 0}
					fallback={
						<p class={styles.empty}>
							<Show when={!racers.loading} fallback="Loading…">
								Nobody has made a racer yet — you could be the first.
							</Show>
						</p>
					}
				>
					<div class={styles.grid}>
						<For each={everyone()}>
							{(racer) => (
								<RacerCard
									racer={racer}
									showStatus={mineIds().has(racer._id)}
								/>
							)}
						</For>
					</div>
				</Show>

				<div class={styles.actions}>
					<A href="/custom-racer/add" class={styles.addButton}>
						+ Add Racer
					</A>
				</div>
			</FieldBlock>

			<BackSignButton class={styles.backSign} />
		</div>
	)
}

const styles = {
	container: css({
		width: 'calc(100% - 2rem)',
		maxWidth: '760px',
		margin: '1rem auto',
		display: 'flex',
		flexDirection: 'column',
		gap: '2rem',
	}),
	intro: css({
		textAlign: 'center',
		marginBottom: '1rem',
	}),
	empty: css({
		opacity: 0.8,
		margin: '1rem 0',
	}),
	grid: css({
		display: 'flex',
		flexWrap: 'wrap',
		gap: '1rem',
		justifyContent: 'center',
	}),
	actions: css({
		display: 'flex',
		justifyContent: 'center',
		marginTop: '1.5rem',
	}),
	addButton: css({
		padding: '0.5rem 1.5rem',
		border: '3px double currentColor',
		borderRadius: '4px',
		cornerShape: 'notch',
		fontWeight: 'bold',
		fontSize: '1rem',
		textTransform: 'uppercase',
		textDecoration: 'none',
		color: 'inherit',
		_hover: { background: 'var(--overlay-white-10)' },
	}),
	backSign: css({
		margin: '0 auto',
		display: 'block',
	}),
}
