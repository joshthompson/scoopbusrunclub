import { css } from '@style/css'
import { Show } from 'solid-js'

/** Size of the head, and of the invisible input's thumb that has to track it. */
const THUMB = 44

/**
 * A slower→faster slider dragged by the racer's own head. The value is stored
 * 0–1 and never shown as a number — it's a feel, not a pace, and the real speed
 * only exists relative to whoever else is in the header that week.
 *
 * The head is a plain image and the range input is invisible on top of it, doing
 * nothing but handling drag, touch and arrow keys. Styling the native thumb
 * instead looked right everywhere except iOS, which kept painting its own chrome
 * behind the sprite; there's no thumb left to paint this way.
 */
export function RacerSpeedSlider(props: {
	value: number
	/** The racer's face sprite, used as the slider's handle. */
	faceUrl?: string
	onChange: (value: number) => void
}) {
	const fraction = () => Math.min(1, Math.max(0, props.value))

	/**
	 * Where the head's centre sits. The offset term keeps it inside the rail at
	 * both ends — the same inset a native thumb gets — instead of hanging half
	 * off the edge at 0 and 1.
	 */
	const headLeft = () =>
		`calc(${fraction() * 100}% + ${(0.5 - fraction()) * THUMB}px)`

	return (
		<div class={styles.wrapper}>
			<span class={styles.label} id="racer-speed-label">
				Speed
			</span>
			<div class={styles.track}>
				<span class={styles.end}>Slower</span>
				<div class={styles.rail}>
					<div class={styles.railLine} />
					<input
						type="range"
						min="0"
						max="1"
						step="0.01"
						value={props.value}
						aria-labelledby="racer-speed-label"
						aria-valuetext={describeSpeed(props.value)}
						class={styles.input}
						onInput={(e) => props.onChange(Number(e.currentTarget.value))}
					/>
					<Show when={props.faceUrl}>
						{(url) => (
							<img
								src={url()}
								alt=""
								aria-hidden="true"
								class={styles.head}
								style={{ left: headLeft() }}
							/>
						)}
					</Show>
				</div>
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
	rail: css({
		position: 'relative',
		flex: 1,
		minWidth: 0,
		// Room for the head, which overhangs the line it rides on
		height: `${THUMB + 4}px`,
		// The input carries no visible focus ring once it's transparent, so the
		// rail wears one on its behalf.
		'&:focus-within': {
			outline: '2px solid var(--dirt-darker-brown)',
			outlineOffset: '2px',
			borderRadius: '4px',
		},
	}),
	railLine: css({
		position: 'absolute',
		left: 0,
		right: 0,
		top: '50%',
		height: '6px',
		marginTop: '-3px',
		borderRadius: '3px',
		background: 'var(--overlay-black-30)',
		border: '1px solid var(--dirt-darker-brown)',
	}),
	head: css({
		position: 'absolute',
		top: '50%',
		width: `${THUMB}px`,
		height: `${THUMB}px`,
		objectFit: 'contain',
		transform: 'translate(-50%, -50%)',
		imageRendering: 'pixelated',
		// The input above it owns every pointer event
		pointerEvents: 'none',
	}),
	/**
	 * Invisible, but still the real control — drag, touch and arrow keys all come
	 * from here. Its thumb is sized to match the head so the grab point and the
	 * sprite stay on top of each other at every position.
	 */
	input: css({
		position: 'absolute',
		inset: 0,
		width: '100%',
		height: '100%',
		margin: 0,
		padding: 0,
		opacity: 0,
		appearance: 'none',
		background: 'transparent',
		cursor: 'pointer',
		'&::-webkit-slider-thumb': {
			appearance: 'none',
			width: `${THUMB}px`,
			height: `${THUMB}px`,
		},
		'&::-moz-range-thumb': {
			border: 'none',
			width: `${THUMB}px`,
			height: `${THUMB}px`,
		},
	}),
}
