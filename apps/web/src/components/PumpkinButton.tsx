import { track } from '@/utils/analytics'
import { setHalloween } from '@/utils/halloween'
import { css } from '@style/css'
import { Emoji } from './ui/Emoji'

/**
 * A pumpkin beside a Halloween parkrun's name that turns Halloween mode on, and
 * takes you up to the header to see it — the same as a furby beside a Förbi.
 */
export function PumpkinButton(props: { flipped?: boolean }) {
	return (
		<button
			type="button"
			class={styles.pumpkin}
			title="Turn on Halloween"
			aria-label="Turn on Halloween"
			onClick={() => {
				setHalloween(true)
				// Track Halloween mode being turned on from a results block in Mixpanel
				track('halloween_mode_enabled')
				window.scrollTo({ top: 0, behavior: 'smooth' })
			}}
		>
			<Emoji emoji="🎃" flipped={props.flipped} />
		</button>
	)
}

const styles = {
	pumpkin: css({
		display: 'inline-block',
		verticalAlign: 'bottom',
		p: 0,
		border: 'none',
		background: 'none',
		font: 'inherit',
		cursor: 'pointer',
		transition: 'translate 0.15s',
		_hover: { translate: '0 -3px' },
		_focusVisible: { outline: '2px solid currentColor', outlineOffset: '2px' },
	}),
}
