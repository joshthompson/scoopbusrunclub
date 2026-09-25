/**
 * A member running on the spot: the sheet stepped through with a CSS
 * animation, so a page of them costs nothing per frame.
 */
import { Show, createResource } from 'solid-js'
import styles from './RunnerAnim.module.css'
import { type SpriteMember, frameSize } from './sprites'

export function RunnerAnim(props: {
	member: SpriteMember
	/** Rendered height in CSS pixels. */
	height: number
	flip?: boolean
	/** Seconds per full cycle of the sheet. */
	cycle?: number
	class?: string
	style?: Record<string, string>
}) {
	const [size] = createResource(
		() => props.member,
		(member) => frameSize(member),
	)

	return (
		<Show when={size()}>
			{(s) => {
				const scale = () => props.height / s().height
				return (
					<div
						class={`${styles.runner} ${props.class ?? ''}`}
						style={{
							width: `${s().width * scale()}px`,
							height: `${props.height}px`,
							'background-image': `url(${props.member.runSheet})`,
							'background-size': `${s().sheetWidth * scale()}px ${props.height}px`,
							'--sheet-width': `${s().sheetWidth * scale()}px`,
							'--frames': `${props.member.frameCount}`,
							'--cycle': `${props.cycle ?? 0.5}s`,
							transform: props.flip ? 'scaleX(-1)' : undefined,
							...props.style,
						}}
					/>
				)
			}}
		</Show>
	)
}
