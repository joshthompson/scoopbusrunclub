import { imageSize } from '@/utils/imageSize'
import { Show } from 'solid-js'
import { hatArt } from '../draw/art/hats'
import { headTop } from '../draw/heads'
import { RUNNER_SCALE } from '../game/constants'
import type { Hat } from '../game/hats'
import { WornMedal } from './Medal'

/**
 * What a runner on the Podium has on: the hat they finished the last
 * Round in, and their medal, if they're in the top three. Both go where
 * their head is in the frame they're shown in (found from the picture, as
 * a hat's is in a Round: see `headTop`): the hat on top of it, as it sits
 * on in a Round, and the medal round their neck, under it. Turned round
 * with them.
 */

/** How far down from the top of their head their neck is, in their own pixels. */
const HEAD_ROWS = 7

export function Worn(props: {
	/** The frame they're shown in: a strip's (`url#left,…`) or, `single`, a picture of its own. */
	frame: string | undefined
	single?: boolean
	/** Their box: a run frame's size, at `scale`. */
	width: number
	height: number
	scale: number
	/** Facing right: drawn turned round, as their sprite is. */
	flipped?: boolean
	hat?: Hat
	place?: 1 | 2 | 3
}) {
	/** How much bigger than in a Round they're drawn. */
	const k = () => props.scale / RUNNER_SCALE
	/** The top of their head, in their box, and how far apart their pixels are. */
	const head = () => {
		const frame = props.frame
		if (!frame) return undefined
		if (!props.single) {
			const found = headTop(
				frame,
				(props.width / props.scale) * RUNNER_SCALE,
				(props.height / props.scale) * RUNNER_SCALE,
			)
			return found && { x: found.x * k(), y: found.y * k() }
		}
		// A picture of its own, at its own size times `scale`, stood at the
		// bottom of the box, in the middle.
		const size = imageSize(frame)
		if (!size) return undefined
		const found = headTop(
			frame,
			size.width * RUNNER_SCALE,
			size.height * RUNNER_SCALE,
		)
		if (!found) return undefined
		return {
			x: (props.width - size.width * props.scale) / 2 + found.x * k(),
			y: props.height - size.height * props.scale + found.y * k(),
		}
	}
	/** Across, turned round with them. */
	const across = (x: number) => (props.flipped ? props.width - x : x)
	const hat = () => props.hat && hatArt(props.hat)
	return (
		<>
			<Show when={props.place}>
				{(place) => (
					<WornMedal
						place={place()}
						x={across(head()?.x ?? props.width / 2)}
						top={
							head()
								? (head()?.y ?? 0) + HEAD_ROWS * props.scale
								: props.height * 0.26
						}
					/>
				)}
			</Show>
			<Show when={hat() && head()}>
				{(_) => {
					const art = () => hat() as NonNullable<ReturnType<typeof hat>>
					const at = () => head() as { x: number; y: number }
					// Facing left as the runners do: turned round with them, its
					// middle stays over their head.
					const middle = () =>
						props.flipped ? art().width - art().middle : art().middle
					return (
						<img
							src={art().src}
							alt=""
							class="pixelated"
							style={{
								position: 'absolute',
								left: `${across(at().x) - middle() * k()}px`,
								top: `${at().y - art().crown * k()}px`,
								width: `${art().width * k()}px`,
								height: `${art().height * k()}px`,
								transform: props.flipped ? 'scaleX(-1)' : undefined,
								'pointer-events': 'none',
							}}
						/>
					)
				}}
			</Show>
		</>
	)
}
