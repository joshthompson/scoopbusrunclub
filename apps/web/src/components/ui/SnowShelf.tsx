import shelfLeft from '@/assets/misc/wooden-sign-shelf-left.png'
import shelfMiddle from '@/assets/misc/wooden-sign-shelf-middle.png'
import shelfRight from '@/assets/misc/wooden-sign-shelf-right.png'
import { isSnowy } from '@/utils/snow'
import { css, cx } from '@style/css'
import { Show } from 'solid-js'

/** Rendered height of the shelf art */
const SHELF_HEIGHT = 7.5

/**
 * A ledge of settled snow that spans the top of whatever it's dropped into:
 * a cap at each end with a strip repeating between them.
 *
 * Renders nothing unless it's snowy, and lays itself out against the nearest
 * positioned ancestor — pass `class` to say how far down it sits.
 */
export function SnowShelf(props: { class?: string }) {
	return (
		<Show when={isSnowy()}>
			<div
				class={cx(styles.shelf, props.class)}
				style={{
					'--shelf-left': `url(${shelfLeft})`,
					'--shelf-middle': `url(${shelfMiddle})`,
					'--shelf-right': `url(${shelfRight})`,
				}}
			/>
		</Show>
	)
}

const styles = {
	shelf: css({
		position: 'absolute',
		left: 0,
		right: 0,
		// The 5px-tall art at the same 1.5x the rest of the pixel art is drawn at
		height: `${SHELF_HEIGHT}px`,
		// Caps sit in the padding, so the middle only repeats between them
		paddingX: `${SHELF_HEIGHT}px`,
		backgroundImage:
			'var(--shelf-left), var(--shelf-right), var(--shelf-middle)',
		backgroundPosition: 'left top, right top, left top',
		backgroundRepeat: 'no-repeat, no-repeat, repeat-x',
		backgroundSize: '7.5px 7.5px, 7.5px 7.5px, 30px 7.5px',
		backgroundOrigin: 'border-box, border-box, content-box',
		backgroundClip: 'border-box, border-box, content-box',
	}),
}
