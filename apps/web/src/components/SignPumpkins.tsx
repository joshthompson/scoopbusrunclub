import { pumpkinAssets, pumpkinTint } from '@/utils/halloween'
import {
	PUMPKIN_HEIGHT,
	PUMPKIN_WIDTH,
	carvedPumpkins,
	carvedPumpkinsSettled,
	pumpkinLabel,
} from '@/utils/pumpkins'
import { A } from '@solidjs/router'
import { css, cva, cx } from '@style/css'
import { For, Show, createMemo } from 'solid-js'
import { LitPumpkin } from './PumpkinLight'
import { Tooltip } from './ui/Tooltip'

/** Two different picks out of `count`, from two random numbers in `[0, 1)`. */
function twoOf(count: number, [a, b]: number[]) {
	const first = Math.floor(a * count)
	if (count < 2) return [first, first]
	return [first, (first + 1 + Math.floor(b * (count - 1))) % count]
}

/**
 * A pumpkin either side of a wooden sign's post, or a tombstone, sat at its
 * foot in the grass it's planted in. Two of the carved ones, lit and labelled
 * like they are everywhere else and off to the patch when clicked; the drawn
 * ones only stand in if there are none, and neither shows until that's known.
 * Each sign picks its own two, once, so they don't swap about while the page
 * is open.
 */
export function SignPumpkins(props: {
	sign?: 'wooden' | 'tombstone'
	class?: string
}) {
	const picks = [Math.random(), Math.random()]

	const pumpkins = createMemo(() => {
		const carved = carvedPumpkins()
		if (!carvedPumpkinsSettled()) return []
		if (carved.length) {
			return twoOf(carved.length, picks).map((i) => ({
				image: carved[i].image,
				label: pumpkinLabel(carved[i]) as string | undefined,
			}))
		}
		return twoOf(pumpkinAssets.length, picks).map((i) => ({
			image: pumpkinAssets[i],
			label: undefined,
		}))
	})

	return (
		<div
			class={cx(styles.pumpkins({ sign: props.sign ?? 'wooden' }), props.class)}
		>
			<For each={pumpkins()}>
				{(pumpkin, i) => {
					// The right one turned round, so the pair face each other.
					const flip = i() ? { scale: '-1 1' } : undefined
					return (
						<Show
							when={pumpkin.label}
							fallback={
								<img
									src={pumpkin.image}
									alt=""
									width={PUMPKIN_WIDTH}
									height={PUMPKIN_HEIGHT}
									class={styles.pumpkin}
									style={{ filter: pumpkinTint(pumpkin.image), ...flip }}
								/>
							}
						>
							{(label) => (
								<A href="/pumpkins" class={styles.link}>
									<Tooltip content={label()} class={styles.link}>
										<LitPumpkin
											src={pumpkin.image}
											blinking
											alt={label()}
											width={PUMPKIN_WIDTH}
											height={PUMPKIN_HEIGHT}
											style={flip}
										/>
									</Tooltip>
								</A>
							)}
						</Show>
					)
				}}
			</For>
		</div>
	)
}

const styles = {
	pumpkins: cva({
		base: {
			position: 'absolute',
			// A little below the sign's foot, settled into the grass.
			bottom: '-3px',
			left: '50%',
			translate: '-50% 0',
			// As wide as the pair, not the half of the sign that's right of `left`,
			// which on a short title squashes them down to nothing.
			width: 'max-content',
			display: 'flex',
			alignItems: 'flex-end',
		},
		variants: {
			sign: {
				wooden: {
					// Tucked in against the post, over the edges of its grass.
					gap: '12px',
					// The post leans right, so the left one stands off it a bit further.
					'& > :first-child': { translate: '-4px 0' },
				},
				// In front of the corners of the tombstone's 80px wide base.
				tombstone: {
					gap: '56px',
				},
			},
		},
	}),
	link: css({
		display: 'block',
		flexShrink: 0,
	}),
	pumpkin: css({
		display: 'block',
		flexShrink: 0,
		imageRendering: 'pixelated',
	}),
}
