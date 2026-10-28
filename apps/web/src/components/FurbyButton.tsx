import { track } from '@/utils/analytics'
import { furbyAssets, setFurbys } from '@/utils/furbys'
import { css } from '@style/css'
import { Tooltip } from './ui/Tooltip'

const LABEL = 'Let the furbies out'

/** Two different furbies, picked at random, to stand either side of a title. */
export function pickFurbies() {
	return furbyAssets
		.map((src) => ({ src, order: Math.random() }))
		.sort((a, b) => a.order - b.order)
		.slice(0, 2)
		.map(({ src }) => src)
}

/** A furby that lets the rest of them out, and takes you up to watch. */
export function FurbyButton(props: { src: string }) {
	return (
		<Tooltip content={LABEL} class={styles.tooltip}>
			<button
				type="button"
				class={styles.furby}
				aria-label={LABEL}
				onClick={() => {
					setFurbys(true)
					track('furbies_released')
					window.scrollTo({ top: 0, behavior: 'smooth' })
				}}
			>
				<img src={props.src} alt="" class={styles.image} />
			</button>
		</Tooltip>
	)
}

const styles = {
	tooltip: css({ verticalAlign: 'bottom' }),
	furby: css({
		display: 'inline-block',
		verticalAlign: 'bottom',
		p: 0,
		border: 'none',
		background: 'none',
		cursor: 'pointer',
		animation: 'buldge 2s ease-in-out infinite',
		transition: 'translate 0.15s',
		_hover: { translate: '0 -3px' },
		_focusVisible: { outline: '2px solid currentColor', outlineOffset: '2px' },
	}),
	// A touch bigger than an emoji, since the art has room round the edges.
	image: css({
		display: 'block',
		height: '1.25em',
		width: 'auto',
		imageRendering: 'pixelated',
	}),
}
