import pumpkinBaseAsset from '@/assets/halloween/pumpkin-base.png'
import { pumpkinTint } from '@/utils/halloween'
import { css, cx } from '@style/css'
import { type Accessor, type JSX, createSignal, onCleanup } from 'solid-js'

/** How long a blinking light stays on, and off, before it changes, in ms. */
const ON = [1500, 4000]
const OFF = [2000, 6000]

/** Somewhere in `[min, max]`. */
function between([min, max]: number[]) {
	return min + Math.random() * (max - min)
}

/**
 * The inside of a carved pumpkin: the uncarved pumpkin's shape, which shows
 * through wherever the pumpkin in front of it has been carved out. Black, and
 * lit up yellow while the pumpkin's hovered: when its parent is one marked
 * `data-lights-on-hover` (as `LitPumpkin`'s is), or when `lit` says so, for
 * somewhere a CSS hover can't reach. Black whatever happens otherwise, which is
 * how the carving page has it. A `blinking` one also comes
 * on and goes off again by itself (see `createBlink`). Fills its parent, behind
 * everything else in it, so the parent has to be positioned and start a
 * stacking context of its own.
 */
export function PumpkinLight(props: { lit?: boolean; blinking?: boolean }) {
	// Read once: whether a pumpkin blinks is settled by where it's shown.
	const on = props.blinking ? createBlink() : () => false

	return (
		<div
			class={styles.light}
			data-lit={props.lit || on() ? '' : undefined}
			style={{ 'mask-image': `url(${pumpkinBaseAsset})` }}
		/>
	)
}

/**
 * A light coming on and going off again by itself every few seconds, at
 * random, on a clock of its own so a row of them don't blink together. Made
 * once per pumpkin, by whatever lasts as long as it: the header redraws a
 * pumpkin's insides every tick, and a clock started there would start over
 * every tick too.
 */
export function createBlink(): Accessor<boolean> {
	const [on, setOn] = createSignal(false)
	let timer: number | undefined
	const turn = (lit: boolean) => {
		setOn(lit)
		timer = window.setTimeout(() => turn(!lit), between(lit ? ON : OFF))
	}
	turn(Math.random() < 0.5)
	onCleanup(() => clearTimeout(timer))
	return on
}

/** A carved pumpkin image with its inside behind it, lit up on hover. */
export function LitPumpkin(props: {
	src: string
	blinking?: boolean
	width: number
	height: number
	alt?: string
	class?: string
	style?: JSX.CSSProperties
}) {
	return (
		<span
			class={cx(styles.lit, props.class)}
			style={{ filter: pumpkinTint(props.src), ...props.style }}
			data-lights-on-hover
		>
			<PumpkinLight blinking={props.blinking} />
			<img
				src={props.src}
				alt={props.alt ?? ''}
				width={props.width}
				height={props.height}
				class={styles.image}
			/>
		</span>
	)
}

const styles = {
	light: css({
		position: 'absolute',
		inset: 0,
		zIndex: -1,
		maskSize: '100% 100%',
		maskRepeat: 'no-repeat',
		backgroundColor: 'var(--color-black)',
		// The yellow of the drawn pumpkins' faces, so a lit one matches them.
		'[data-lights-on-hover]:hover > &': { backgroundColor: '#ffe90a' },
		'&[data-lit]': { backgroundColor: '#ffe90a' },
	}),
	lit: css({
		position: 'relative',
		isolation: 'isolate',
		display: 'block',
	}),
	image: css({
		display: 'block',
		imageRendering: 'pixelated',
	}),
}
