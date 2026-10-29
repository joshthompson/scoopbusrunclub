import tombstone from '@/assets/halloween/tombstone.png'
import purpleSign from '@/assets/misc/purple-sign.png'
import woodenSign from '@/assets/misc/wooden-sign.png'
import { isHalloween, seasonalAsset } from '@/utils/halloween'
import { css, cva } from '@style/css'
import { Show, createEffect, createSignal } from 'solid-js'
import { SignPumpkins } from '../SignPumpkins'
import { SnowShelf } from './SnowShelf'

export type SignType = 'wooden' | 'purple' | 'tombstone'

const SIGN_IMAGES: Record<SignType, string> = {
	wooden: woodenSign,
	purple: purpleSign,
	tombstone,
}

/**
 * The space a title has to fit in on the signs that shrink it to fit, in px:
 * the purple board, and the panel on the tombstone's face.
 */
const TITLE_SPACE: Partial<
	Record<SignType, { width: number; height: number }>
> = {
	purple: { width: 105, height: 50 },
	tombstone: { width: 44, height: 44 },
}

export function TitleSign(props: {
	title: string
	type?: SignType
}) {
	const type = () => props.type ?? 'wooden'
	const signImage = () => seasonalAsset(SIGN_IMAGES[type()])

	let innerRef!: HTMLDivElement
	const [fontSize, setFontSize] = createSignal<string | undefined>(undefined)

	createEffect(() => {
		// Re-run when title or type changes
		const _title = props.title
		const _type = type()
		setFontSize(undefined)

		const space = TITLE_SPACE[_type]
		if (!space) return

		// Wait for DOM to update
		requestAnimationFrame(() => {
			if (!innerRef) return
			const { width: containerWidth, height: containerHeight } = space
			let size = 1.2 // starting em size (matches the CSS default)

			// Temporarily apply the size so we can measure
			while (size > 0.5) {
				innerRef.style.fontSize = `${size}em`
				if (
					innerRef.scrollWidth <= containerWidth &&
					innerRef.scrollHeight <= containerHeight
				) {
					break
				}
				size -= 0.05
			}

			setFontSize(`${size}em`)
		})
	})

	return (
		<div
			class={styles.sign({ type: type() })}
			style={{ 'background-image': `url(${signImage()})` }}
		>
			<Show when={type() === 'wooden'}>
				<SnowShelf class={styles.snowShelf} />
				<Show when={isHalloween()}>
					<SignPumpkins />
				</Show>
			</Show>
			<Show when={type() === 'tombstone'}>
				<SignPumpkins sign="tombstone" />
			</Show>
			<div
				ref={innerRef}
				class={styles.signInner({ type: type() })}
				data-halloween={isHalloween() ? '' : undefined}
				style={{ ...(fontSize() ? { 'font-size': fontSize() } : {}) }}
			>
				{props.title}
			</div>
		</div>
	)
}

const styles = {
	sign: cva({
		base: {
			zIndex: 4,
			position: 'absolute',
			top: '-2.8rem',
			left: '50%',
			transform: 'translateX(-50%)',
			fontSize: '20px',
			lineHeight: '16px',
			height: '75px',
			backgroundPosition: 'center',
			backgroundRepeat: 'no-repeat',
			fontFamily: '"Jersey 10", sans-serif',
			fontOpticalSizing: 'auto',
			fontWeight: 400,
			fontStyle: 'normal',
		},
		variants: {
			type: {
				wooden: {
					backgroundSize: '36px 75px',
				},
				purple: {
					width: '140px',
					height: '70px',
					backgroundSize: 'cover',
				},
				// Twice its 40 × 67 pixels, planted so its foot is where the purple
				// sign's bottom edge is.
				tombstone: {
					top: 'calc(-2.8rem - 64px)',
					width: '80px',
					height: '134px',
					backgroundSize: '80px 134px',
					imageRendering: 'pixelated',
				},
			},
		},
	}),
	signInner: cva({
		base: {
			display: 'inline-block',
			mt: '12px',
			textAlign: 'center',
			py: '4px',
			width: 'max-content',
			textTransform: 'uppercase',
		},
		variants: {
			type: {
				wooden: {
					cornerShape: 'notch',
					borderRadius: '4px',
					border: '2px solid var(--overlay-black-20)',
					padding: '0.1rem 0.75rem',
					background: 'var(--dirt-sign)',
				},
				purple: {
					color: 'var(--gold)',
					// Gold doesn't show up on the Halloween sign's orange.
					'&[data-halloween]': { color: 'var(--color-black)' },
					textAlign: 'center',
					width: '105px',
					height: '50px',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					mt: '10px',
					ml: '5px',
					fontSize: '1.2em',
					lineHeight: '1.1em',
				},
				// On the panel under the RIP, which is 48px square from 18px in and
				// 44px down, with a little room kept clear of its border.
				tombstone: {
					color: '#383838',
					// Carved in: lit along the bottom edge of each letter.
					textShadow: '0 1px 0 #a6a6a6',
					width: '44px',
					height: '44px',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					mt: '46px',
					ml: '20px',
					py: 0,
					fontSize: '1.2em',
					lineHeight: '0.9em',
				},
			},
		},
	}),
	snowShelf: css({
		// Resting on the top edge of the plank
		top: '10px',
	}),
}
