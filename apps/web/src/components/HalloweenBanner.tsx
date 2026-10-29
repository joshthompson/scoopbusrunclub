import { pumpkinAssets, pumpkinTint } from '@/utils/halloween'
import {
	PUMPKIN_HEIGHT,
	PUMPKIN_WIDTH,
	carvedPumpkins,
	carvedPumpkinsSettled,
	pumpkinLabel,
} from '@/utils/pumpkins'
import { A } from '@solidjs/router'
import { css } from '@style/css'
import { For, Show, createMemo } from 'solid-js'
import { LitPumpkin } from './PumpkinLight'
import { Tooltip } from './ui/Tooltip'

const PUMPKIN_COUNT = 10

/** A whole number, so `image-rendering: pixelated` keeps every pixel the same size. */
const PUMPKIN_SCALE = 2

/**
 * The top of the results in Halloween mode: a row of pumpkins people have
 * carved, and the way to carve your own or see everyone's. The patch is never
 * empty (Josh's are always in it), so the drawn ones only stand in when it
 * can't be reached. While it's loading the row is left empty, rather than
 * filled with drawn ones that are then swapped for however many carved ones
 * there are.
 */
export function HalloweenBanner() {
	const pumpkins = createMemo(() => {
		const carved = carvedPumpkins()
		if (!carvedPumpkinsSettled()) return []
		if (carved.length) {
			return carved.slice(0, PUMPKIN_COUNT).map((pumpkin) => ({
				image: pumpkin.image,
				label: pumpkinLabel(pumpkin) as string | undefined,
			}))
		}
		return Array.from({ length: PUMPKIN_COUNT }, () => ({
			image: pumpkinAssets[Math.floor(Math.random() * pumpkinAssets.length)],
			label: undefined,
		}))
	})
	return (
		<section class={styles.banner}>
			<h3 class={styles.title}>It's Spook Bus Halloween!</h3>
			<div class={styles.patch}>
				<For each={pumpkins()}>
					{(pumpkin, i) => {
						// Every other one turned round, so the row isn't all looking
						// the same way.
						const flip = i() % 2 ? { scale: '-1 1' } : undefined
						return (
							<Show
								when={pumpkin.label}
								fallback={
									<img
										src={pumpkin.image}
										alt=""
										width={PUMPKIN_WIDTH * PUMPKIN_SCALE}
										height={PUMPKIN_HEIGHT * PUMPKIN_SCALE}
										class={styles.pumpkin}
										style={{ filter: pumpkinTint(pumpkin.image), ...flip }}
									/>
								}
							>
								{(label) => (
									<Tooltip content={label()}>
										<LitPumpkin
											src={pumpkin.image}
											blinking
											alt={label()}
											width={PUMPKIN_WIDTH * PUMPKIN_SCALE}
											height={PUMPKIN_HEIGHT * PUMPKIN_SCALE}
											style={flip}
										/>
									</Tooltip>
								)}
							</Show>
						)
					}}
				</For>
			</div>
			<div class={styles.buttons}>
				<A href="/pumpkins/carve" class={styles.button}>
					Carve a pumpkin!
				</A>
				<A href="/pumpkins" class={styles.button}>
					Pumpkin Patch
				</A>
			</div>
		</section>
	)
}

const styles = {
	banner: css({
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		gap: '0.75rem',
		padding: '1rem',
		marginBottom: '1.5rem',
		background: 'linear-gradient(180deg, #1b1027, #2c1640)',
		color: 'var(--orange)',
		border: '2px solid var(--color-black)',
		borderRadius: '4px',
		cornerShape: 'notch',
		textAlign: 'center',
	}),
	title: css({
		margin: 0,
		fontSize: '1.4rem',
		textTransform: 'uppercase',
		letterSpacing: '0.05em',
	}),
	patch: css({
		display: 'flex',
		flexWrap: 'wrap',
		justifyContent: 'center',
		gap: '0.25rem 0.5rem',
		// A row's worth of room (`PUMPKIN_HEIGHT * PUMPKIN_SCALE`) kept while
		// they load, so the buttons don't jump down when they arrive.
		minHeight: '46px',
	}),
	pumpkin: css({
		display: 'block',
		imageRendering: 'pixelated',
	}),
	buttons: css({
		display: 'flex',
		flexWrap: 'wrap',
		justifyContent: 'center',
		gap: '0.75rem',
	}),
	button: css({
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
}
