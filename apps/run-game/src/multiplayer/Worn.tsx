import { imageSize } from '@/utils/imageSize'
import { For, Show } from 'solid-js'
import { hatArt } from '../draw/art/hats'
import { headTop, headTops } from '../draw/heads'
import { RUNNER_SCALE } from '../game/constants'
import type { Hat } from '../game/hats'
import type { Playable } from '../runners/playable'
import { WornMedal } from './Medal'

/**
 * What a runner on the Podium has on: the hat they finished the last
 * Round in, and their medal, if they're in the top three. Both go where
 * their head is in the frame they're shown in (found from the picture, as
 * a hat's is in a Round: see `headTop`): the hat on top of it, as it sits
 * on in a Round (one on each of the Miner Twins' heads), and the medal
 * round their neck, under it. Turned round with them.
 */

/**
 * How far down from the top of their head their neck is, in their own
 * pixels, for anyone whose neck isn't known (see `neck`).
 */
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
	/**
	 * Their sprite, for where their neck is (see `Playable['sprite']['neck']`),
	 * for their medal to hang from: as far from the top of their head in
	 * this frame as it is in their first run frame.
	 */
	sprite?: Playable['sprite']
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
	/**
	 * Where each of their heads is for a hat, the top of it, in their box:
	 * both of them, the Miner Twins', a hat on each; or the one.
	 */
	const hatHeads = (): { x: number; y: number }[] => {
		const frame = props.frame
		const one = head()
		if (!frame || !props.sprite?.twoHeads) return one ? [one] : []
		if (!props.single) {
			const found = headTops(
				frame,
				(props.width / props.scale) * RUNNER_SCALE,
				(props.height / props.scale) * RUNNER_SCALE,
			)
			if (!found || found.length < 2) return one ? [one] : []
			return found.map((f) => ({ x: f.x * k(), y: f.y * k() }))
		}
		const size = imageSize(frame)
		if (!size) return one ? [one] : []
		const found = headTops(
			frame,
			size.width * RUNNER_SCALE,
			size.height * RUNNER_SCALE,
		)
		if (!found || found.length < 2) return one ? [one] : []
		return found.map((f) => ({
			x: (props.width - size.width * props.scale) / 2 + f.x * k(),
			y: props.height - size.height * props.scale + f.y * k(),
		}))
	}
	/**
	 * Their neck, from the top of their head, in their own pixels at
	 * `RUNNER_SCALE`: from where it is in their first run frame.
	 */
	const neck = () => {
		const sprite = props.sprite
		const at = sprite?.neck
		const first = sprite?.run[0]
		if (!sprite || !at || !first) return undefined
		const found = headTop(
			first,
			sprite.width * RUNNER_SCALE,
			sprite.height * RUNNER_SCALE,
		)
		return (
			found && {
				x: at.x * RUNNER_SCALE - found.x,
				y: at.y * RUNNER_SCALE - found.y,
			}
		)
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
						x={across((head()?.x ?? props.width / 2) + (neck()?.x ?? 0) * k())}
						top={
							head()
								? (head()?.y ?? 0) +
									(neck()?.y ?? HEAD_ROWS * RUNNER_SCALE) * k()
								: props.height * 0.26
						}
					/>
				)}
			</Show>
			<Show when={hat()}>
				{(art) => (
					<For each={hatHeads()}>
						{(at) => {
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
										left: `${across(at.x) - middle() * k()}px`,
										top: `${at.y - art().crown * k()}px`,
										width: `${art().width * k()}px`,
										height: `${art().height * k()}px`,
										transform: props.flipped ? 'scaleX(-1)' : undefined,
										'pointer-events': 'none',
									}}
								/>
							)
						}}
					</For>
				)}
			</Show>
		</>
	)
}
