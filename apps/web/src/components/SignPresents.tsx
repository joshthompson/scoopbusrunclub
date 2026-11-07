import { presentAssets } from '@/utils/christmas'
import { seasonalAsset } from '@/utils/seasons'
import { css, cx } from '@style/css'
import { For } from 'solid-js'
import { signFoot, twoOf } from './SignPumpkins'

const PRESENT_WIDTH = 23
const PRESENT_HEIGHT = 22

/**
 * A present either side of a wooden sign's post at Christmas, sat at its foot
 * where Halloween's pumpkins go. Two different ones, picked once per sign so
 * they don't swap about while the page is open.
 */
export function SignPresents(props: { class?: string }) {
	const presents = twoOf(presentAssets.length, [
		Math.random(),
		Math.random(),
	]).map((i) => presentAssets[i])

	return (
		<div class={cx(signFoot({ sign: 'wooden' }), props.class)}>
			<For each={presents}>
				{(present) => (
					<img
						src={seasonalAsset(present)}
						alt=""
						width={PRESENT_WIDTH}
						height={PRESENT_HEIGHT}
						class={styles.present}
					/>
				)}
			</For>
		</div>
	)
}

const styles = {
	present: css({
		display: 'block',
		flexShrink: 0,
		imageRendering: 'pixelated',
		// Further down into the grass than the pumpkins sit.
		position: 'relative',
		top: '4px',
	}),
}
