import pathAsset from '@/assets/misc/path.png'
import { type JSX, Show } from 'solid-js'

/**
 * The little patch of Haga a runner is shown off on: sky, grass and, unless
 * `path` is false, the header's path scrolling by under their feet.
 */
export function RunnerStage(props: {
	children: JSX.Element
	path?: boolean
	pathStyle?: JSX.CSSProperties
	height?: number
}) {
	return (
		<div
			style={{
				...styles.stage,
				...(props.height ? { height: `${props.height}px` } : {}),
			}}
		>
			<Show when={props.path ?? true}>
				<div style={{ ...styles.path, ...props.pathStyle }} />
			</Show>
			{props.children}
		</div>
	)
}

/**
 * A name on one line, in a size that fits: never wrapped, which is what made
 * the old cards' names jump about.
 */
export const nameSize = (name: string, sizes: [number, number, number]) =>
	name.length <= 8 ? sizes[0] : name.length <= 12 ? sizes[1] : sizes[2]

const styles = {
	stage: {
		position: 'relative',
		width: '100%',
		height: '190px',
		'flex-shrink': 0,
		display: 'flex',
		'align-items': 'flex-end',
		'justify-content': 'center',
		background:
			'linear-gradient(to bottom, var(--sky-blue-top), var(--sky-blue-bottom) 70%, var(--grass-green) 70%)',
		border: '3px solid white',
		overflow: 'hidden',
	},
	path: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: '-20px',
		height: '67px',
		'background-image': `url(${pathAsset})`,
		'background-repeat': 'repeat-x',
		'--band': '637px',
		animation: 'band-scroll 5s linear infinite',
	},
} satisfies Record<string, JSX.CSSProperties>
