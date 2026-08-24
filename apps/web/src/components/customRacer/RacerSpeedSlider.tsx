import { css } from '@style/css'

/**
 * A slower→faster slider dragged by the racer's own head. The value is stored
 * 0–1 and never shown as a number — it's a feel, not a pace, and the real speed
 * only exists relative to whoever else is in the header that week.
 */
export function RacerSpeedSlider(props: {
	value: number
	/** The racer's face sprite, used as the slider's thumb. */
	faceUrl?: string
	onChange: (value: number) => void
}) {
	return (
		<div class={styles.wrapper}>
			<span class={styles.label} id="racer-speed-label">
				Speed
			</span>
			<div class={styles.track}>
				<span class={styles.end}>Slower</span>
				<input
					type="range"
					min="0"
					max="1"
					step="0.01"
					value={props.value}
					aria-labelledby="racer-speed-label"
					aria-valuetext={describeSpeed(props.value)}
					class={styles.slider}
					style={{ '--face': `url(${props.faceUrl ?? ''})` }}
					onInput={(e) => props.onChange(Number(e.currentTarget.value))}
				/>
				<span class={styles.end}>Faster</span>
			</div>
		</div>
	)
}

/** Screen readers get words rather than the raw 0–1, matching what's on screen. */
function describeSpeed(value: number): string {
	if (value < 0.2) return 'Much slower'
	if (value < 0.4) return 'Slower'
	if (value < 0.6) return 'Middle of the pack'
	if (value < 0.8) return 'Faster'
	return 'Much faster'
}

const THUMB = {
	width: '44px',
	height: '44px',
	border: 'none',
	background: 'var(--face) center / contain no-repeat',
	imageRendering: 'pixelated',
	cursor: 'grab',
	appearance: 'none',
} as const

const styles = {
	wrapper: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '0.5rem',
	}),
	label: css({
		fontSize: '0.8rem',
		fontWeight: 'bold',
		textTransform: 'uppercase',
		letterSpacing: '0.05em',
	}),
	track: css({
		display: 'flex',
		alignItems: 'center',
		gap: '0.75rem',
	}),
	end: css({
		fontSize: '0.7rem',
		textTransform: 'uppercase',
		letterSpacing: '0.05em',
		opacity: 0.8,
		whiteSpace: 'nowrap',
	}),
	slider: css({
		flex: 1,
		appearance: 'none',
		background: 'transparent',
		// Room for the head, which overhangs the track it rides on
		height: '48px',
		cursor: 'pointer',

		'&::-webkit-slider-runnable-track': {
			height: '6px',
			borderRadius: '3px',
			background: 'var(--overlay-black-30)',
			border: '1px solid var(--dirt-darker-brown)',
		},
		'&::-moz-range-track': {
			height: '6px',
			borderRadius: '3px',
			background: 'var(--overlay-black-30)',
			border: '1px solid var(--dirt-darker-brown)',
		},
		// Webkit centres the thumb on the track itself, so it needs pulling up by
		// half its own height; Firefox already centres it for us.
		'&::-webkit-slider-thumb': { ...THUMB, marginTop: '-20px' },
		'&::-moz-range-thumb': THUMB,
		'&:active::-webkit-slider-thumb': { cursor: 'grabbing' },
		'&:active::-moz-range-thumb': { cursor: 'grabbing' },
	}),
}
