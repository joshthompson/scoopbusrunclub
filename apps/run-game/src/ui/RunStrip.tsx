import type { JSX } from 'solid-js'

/**
 * A runner's run strip, playing on a loop and turned to face right, at
 * `scale` times its pixel size.
 */
export function RunStrip(props: {
	/** One of the runner's run frames, as the engine takes them. */
	frame: string
	width: number
	height: number
	scale?: number
	/** How long one stride takes, in seconds. */
	stride?: number
	style?: JSX.CSSProperties
}) {
	const scale = () => props.scale ?? 2
	return (
		<div
			class="pixelated"
			style={{
				width: `${props.width * scale()}px`,
				height: `${props.height * scale()}px`,
				'background-image': `url(${props.frame.split('#')[0]})`,
				'background-size': 'auto 100%',
				'background-repeat': 'repeat-x',
				transform: 'scaleX(-1)',
				// Squashed any shorter, the strip would show more than one frame.
				'flex-shrink': 0,
				'--strip': `${props.width * scale() * 4}px`,
				animation: `run-strip ${props.stride ?? 0.5}s steps(4) infinite`,
				...props.style,
			}}
		/>
	)
}
