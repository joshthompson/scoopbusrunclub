import weightAsset from '@/assets/balloons/weight.png'
import { MILESTONE_BALLOONS } from '@/data/balloons'
import { css } from '@style/css'
import { For, Show } from 'solid-js'

/**
 * The art's scale here. Bigger than the header's `RUNNER_SIZE`, because these
 * are the card's centrepiece rather than something a runner is towing past.
 */
const SCALE = 3
/** How high the balloons float above the knot their strings are tied at. */
const FLOAT_HEIGHT = 90
/** Between one digit and the next, across the row. */
const BALLOON_GAP = 10
/** Degrees each balloon swings through, and seconds a swing and a bob take. */
const SWAY = 2.5
const SWAY_SECONDS = 4.4
const BOB_SECONDS = 3.1

/**
 * The digits are drawn leaning, which is what the header wants — those balloons
 * are being towed along behind someone. Nothing is pulling these, so the lean
 * has to come back out of them. Measured off the round `0`, the one glyph in
 * the set symmetrical enough to read a true angle from.
 */
const ART_LEAN = 14

/**
 * A balloon sits upright however far off to the side of the knot it floats, so
 * the number reads straight across. These are the only degrees it is off true,
 * and the only pixels it is off the others' height — cycled by position so a
 * row never looks stamped out, and fixed rather than random so a card that
 * re-renders doesn't twitch.
 */
const TILTS = [-3, 2.5, -1.5]
const RISES = [0, 6, -4]

/**
 * The weight the strings are tied to, drawn at the same scale as the digits.
 * Its art is 9×6, with a tie loop whose eye is the pixel below the top middle —
 * which is the point every string runs to.
 */
const WEIGHT_WIDTH = 9 * SCALE
const WEIGHT_HEIGHT = 6 * SCALE
const WEIGHT_TIE_DEPTH = 1 * SCALE

/**
 * How far above the knot the highest balloon reaches, for the card to leave
 * room. The tallest digit art is 23px before scaling.
 */
export const BALLOON_REACH = FLOAT_HEIGHT + Math.max(...RISES) + 23 * SCALE

/**
 * The balloons a milestone earns, tied in a bunch at one knot on the side of a
 * card and bobbing on their strings. The strings fan out from that knot to
 * reach a balloon each, the way the header's do — but where the header's lean
 * with the pull of the runner towing them, these hang level and upright, so the
 * number reads straight across.
 *
 * Purely decorative — the card says in words what the balloons spell out.
 */
export function MilestoneBalloons(props: {
	milestone: number
	/** Which side of the card the bunch is tied to. */
	side: 'left' | 'right'
	/** The clearance to leave between that side and the outermost balloon. */
	inset: number
	/** How far down from the top of the card the knot sits. */
	top: number
}) {
	const widths = () =>
		(MILESTONE_BALLOONS[props.milestone] ?? []).map(
			(digit) => digit.width * SCALE,
		)

	const rowWidth = () =>
		widths().reduce(
			(total, width, i) => total + width + (i ? BALLOON_GAP : 0),
			0,
		)

	// The knot sits under the middle of the row, so it has to come in by half the
	// row's width for the outermost balloon to clear the side of the card.
	const knotInset = () => props.inset + rowWidth() / 2

	const strands = () => {
		const digits = MILESTONE_BALLOONS[props.milestone] ?? []
		const row = rowWidth()

		let alongRow = 0
		return digits.map((digit, i) => {
			const width = widths()[i]
			// Where the balloon floats, relative to the knot: along the row, and up.
			const x = alongRow + width / 2 - row / 2
			alongRow += width + BALLOON_GAP
			const y = FLOAT_HEIGHT + RISES[i % RISES.length]

			// However far off to the side that is, the string reaches it from the
			// knot — so the further out a balloon floats, the more its own string
			// slants, and the longer it has to be.
			const angle = (Math.atan2(x, y) * 180) / Math.PI

			return {
				src: digit.src,
				width,
				height: digit.height * SCALE,
				length: Math.hypot(x, y),
				angle,
				// Turned back out of both the slant it hangs on and the one it was
				// drawn at, so it stands upright with only its own small tilt left.
				tilt: TILTS[i % TILTS.length] - angle - ART_LEAN,
				// Staggered so a bunch never sways or bobs as one piece.
				swayDelay: i * -0.7,
				bobDelay: i * -0.5,
			}
		})
	}

	return (
		<Show when={strands().length > 0}>
			<div
				aria-hidden="true"
				class={styles.bunch}
				style={{
					[props.side]: `${knotInset()}px`,
					top: `${props.top}px`,
				}}
			>
				<For each={strands()}>
					{(strand) => (
						<div
							class={styles.strand}
							style={{
								'--angle': `${strand.angle}deg`,
								'--length': `${strand.length}px`,
								'--sway': `${SWAY}deg`,
								'animation-delay': `${strand.swayDelay}s, ${strand.bobDelay}s`,
							}}
						>
							<div class={styles.string} />
							<img
								src={strand.src}
								alt=""
								class={styles.balloon}
								style={{
									width: `${strand.width}px`,
									height: `${strand.height}px`,
									rotate: `${strand.tilt}deg`,
								}}
							/>
						</div>
					)}
				</For>
				{/* Last, so it covers where the strings run into its loop. */}
				<img src={weightAsset} alt="" class={styles.weight} />
			</div>
		</Show>
	)
}

/**
 * The digits on their own, sized to sit in a line of text. For the celebration
 * pill, where the label already says which milestone it is and the balloons are
 * only there to make it look like the occasion it is — so no strings, no
 * weight, and no un-leaning either: at this size turning the art would cost
 * more in mush than the lean costs in tidiness.
 */
export function MilestoneBalloonRow(props: { milestone: number }) {
	const digits = () => MILESTONE_BALLOONS[props.milestone] ?? []

	return (
		<span
			class={styles.row}
			aria-hidden="true"
			data-balloon-row={props.milestone}
		>
			<For each={digits()}>
				{(digit, i) => (
					<img
						src={digit.src}
						alt=""
						class={styles.rowDigit}
						style={{ 'animation-delay': `${i() * -0.5}s` }}
					/>
				)}
			</For>
		</span>
	)
}

const styles = {
	row: css({
		display: 'inline-flex',
		alignItems: 'flex-end',
		gap: '1px',
		verticalAlign: 'middle',
		translate: '0 -0.05em',
	}),
	rowDigit: css({
		width: 'auto',
		height: '1.35em',
		maxWidth: 'none',
		animation: 'balloonNudge 2.4s ease-in-out infinite',
	}),
	/** The knot. Zero-sized, so every string starts from the same point. */
	bunch: css({
		position: 'absolute',
		width: 0,
		height: 0,
		zIndex: 25,
		pointerEvents: 'none',
		// A narrow card can't take a full-size bunch: it would land on the text of
		// the card above rather than the dirt either side of it. Scaling from the
		// knot takes the strings down with the balloons, so the bunch stays tied
		// where it was. `MilestoneCard` is what declares the container.
		scale: '0.7',
		'@container milestoneCard (min-width: 610px)': {
			scale: '1',
		},
	}),
	strand: css({
		position: 'absolute',
		bottom: 0,
		left: 0,
		width: 0,
		height: 'var(--length)',
		rotate: 'var(--angle)',
		transformOrigin: 'bottom center',
		animation: `balloonSway ${SWAY_SECONDS}s ease-in-out infinite, balloonBob ${BOB_SECONDS}s ease-in-out infinite`,
	}),
	string: css({
		position: 'absolute',
		inset: '0 auto 0 -1px',
		width: '2px',
		background: 'rgba(0, 0, 0, 0.55)',
	}),
	balloon: css({
		position: 'absolute',
		bottom: '100%',
		left: '50%',
		translate: '-50% 0',
		transformOrigin: 'bottom center',
		// The reset caps images at the width of what holds them, and what holds
		// this one is a string — a line with no width at all.
		maxWidth: 'none',
	}),
	/** Hung off the knot by its tie loop, so the bunch has something holding it. */
	weight: css({
		position: 'absolute',
		width: `${WEIGHT_WIDTH}px`,
		height: `${WEIGHT_HEIGHT}px`,
		left: `${-WEIGHT_WIDTH / 2}px`,
		top: `${-WEIGHT_TIE_DEPTH}px`,
		maxWidth: 'none',
	}),
}
