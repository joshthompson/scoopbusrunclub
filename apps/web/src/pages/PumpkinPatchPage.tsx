import { BackSignButton } from '@/components/BackSignButton'
import { LitPumpkin } from '@/components/PumpkinLight'
import { DirtBlock } from '@/components/ui/DirtBlock'
import {
	PUMPKIN_HEIGHT,
	PUMPKIN_WIDTH,
	fetchPumpkinPatch,
	pumpkinPatch,
} from '@/utils/pumpkins'
import { A } from '@solidjs/router'
import { css } from '@style/css'
import { For, Show, createResource } from 'solid-js'

/** A whole number, so `image-rendering: pixelated` keeps every pixel the same size. */
const PUMPKIN_SCALE = 4

/** Every pumpkin anyone's carved, with its name and whoever carved it. */
export function PumpkinPatchPage() {
	const [fetched] = createResource(fetchPumpkinPatch)
	const pumpkins = () => pumpkinPatch(fetched() ?? [])

	return (
		<div class={styles.container}>
			<DirtBlock title="Pumpkin Patch" signType="purple">
				<A href="/pumpkins/carve" class={styles.carve}>
					Carve a pumpkin!
				</A>

				<Show when={fetched.error}>
					<p class={styles.message}>
						Couldn't dig up the pumpkin patch — try again in a bit.
					</p>
				</Show>

				<Show
					when={pumpkins().length || fetched.state !== 'ready'}
					fallback={
						<p class={styles.message}>
							Nobody's carved a pumpkin yet — be the first!
						</p>
					}
				>
					<Show when={fetched.loading && !pumpkins().length}>
						<p class={styles.message}>Loading…</p>
					</Show>
					<ul class={styles.patch}>
						<For each={pumpkins()}>
							{(pumpkin) => (
								<li class={styles.pumpkin}>
									<LitPumpkin
										src={pumpkin.image}
										blinking
										width={PUMPKIN_WIDTH * PUMPKIN_SCALE}
										height={PUMPKIN_HEIGHT * PUMPKIN_SCALE}
										class={styles.image}
									/>
									<span class={styles.name}>{pumpkin.name}</span>
									<span class={styles.carver}>carved by {pumpkin.carver}</span>
								</li>
							)}
						</For>
					</ul>
				</Show>
			</DirtBlock>

			<BackSignButton class={styles.backSign} />
		</div>
	)
}

const styles = {
	container: css({
		width: 'calc(100% - 2rem)',
		maxWidth: '1000px',
		margin: '1rem auto',
		display: 'flex',
		flexDirection: 'column',
		gap: '2rem',
	}),
	carve: css({
		display: 'block',
		width: 'fit-content',
		margin: '0 auto 1.5rem',
		padding: '0.5rem 1.5rem',
		border: '3px double currentColor',
		color: 'inherit',
		fontWeight: 'bold',
		fontSize: '1rem',
		textTransform: 'uppercase',
		textDecoration: 'none',
		cornerShape: 'notch',
		borderRadius: '4px',
		_hover: { background: 'var(--overlay-white-10)' },
	}),
	message: css({
		fontWeight: 'bold',
		margin: 0,
	}),
	patch: css({
		listStyle: 'none',
		margin: 0,
		padding: 0,
		display: 'flex',
		flexWrap: 'wrap',
		justifyContent: 'center',
		gap: '1.5rem 1rem',
	}),
	pumpkin: css({
		// As wide as the pumpkin, so a long name wraps under it rather than
		// pushing its neighbours away.
		width: '116px',
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		textAlign: 'center',
		overflowWrap: 'anywhere',
	}),
	image: css({
		marginBottom: '0.25rem',
	}),
	name: css({
		fontWeight: 'bold',
	}),
	carver: css({
		fontSize: '0.8rem',
		opacity: 0.8,
	}),
	backSign: css({
		margin: '0 auto',
		display: 'block',
	}),
}
