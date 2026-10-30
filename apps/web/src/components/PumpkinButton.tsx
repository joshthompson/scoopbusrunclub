import { track } from '@/utils/analytics'
import { animateWhileOnScreen } from '@/utils/animateWhileOnScreen'
import { pumpkinAssets, pumpkinTint, setHalloween } from '@/utils/halloween'
import { css } from '@style/css'
import { Tooltip } from './ui/Tooltip'

const LABEL = 'Turn on Halloween'

/** Two different pumpkins, picked at random, to stand either side of a title. */
export function pickPumpkins() {
	return pumpkinAssets
		.map((src) => ({ src, order: Math.random() }))
		.sort((a, b) => a.order - b.order)
		.slice(0, 2)
		.map(({ src }) => src)
}

/**
 * A pumpkin beside a Halloween parkrun's name that turns Halloween mode on, and
 * takes you up to the header to see it — the same as a furby beside a Förbi.
 * The art looks left, so `flipped` turns the one on the left to face the name.
 */
export function PumpkinButton(props: { src: string; flipped?: boolean }) {
	return (
		<Tooltip content={LABEL}>
			<button
				ref={animateWhileOnScreen}
				type="button"
				class={styles.pumpkin}
				aria-label={LABEL}
				onClick={() => {
					setHalloween(true)
					// Track Halloween mode being turned on from a results block in Mixpanel
					track('halloween_mode_enabled')
					window.scrollTo({ top: 0, behavior: 'smooth' })
				}}
			>
				<img
					src={props.src}
					alt=""
					class={styles.image}
					style={{
						filter: pumpkinTint(props.src),
						...(props.flipped ? { scale: '-1 1' } : {}),
					}}
				/>
			</button>
		</Tooltip>
	)
}

const styles = {
	pumpkin: css({
		display: 'inline-block',
		p: 0,
		border: 'none',
		background: 'none',
		cursor: 'pointer',
		animation: 'buldge 2s ease-in-out infinite',
		'&[data-offscreen]': { animationPlayState: 'paused' },
		transition: 'translate 0.15s',
		_hover: { translate: '0 -3px' },
		_focusVisible: { outline: '2px solid currentColor', outlineOffset: '2px' },
	}),
	// The same pixel scale as the furbies, which are a few pixels taller. Left
	// inline so the pumpkin sits on the name's baseline, not below it.
	image: css({
		verticalAlign: 'baseline',
		height: '1em',
		width: 'auto',
		imageRendering: 'pixelated',
	}),
}
