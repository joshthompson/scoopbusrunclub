import { For } from 'solid-js'

/** Pixel rects: [x, y, width, height, colour]. */
export function Pixels(props: {
	width: number
	height: number
	rects: [number, number, number, number, string][]
}) {
	return (
		<svg
			width={props.width}
			height={props.height}
			viewBox={`0 0 ${props.width} ${props.height}`}
			shape-rendering="crispEdges"
			style={{ display: 'block', overflow: 'visible' }}
			aria-hidden="true"
		>
			<For each={props.rects}>
				{([x, y, w, h, fill]) => (
					<rect x={x} y={y} width={w} height={h} fill={fill} />
				)}
			</For>
		</svg>
	)
}
