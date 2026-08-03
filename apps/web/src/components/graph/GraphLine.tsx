/**
 * A plotted line in the chunky two-tone style: a dark outline stroke with a
 * lighter stroke drawn over it.
 */
export function GraphLine(props: {
	path: string
	color: string
	outlineColor?: string
	width?: number
}) {
	const width = () => props.width ?? 3

	return (
		<>
			<path
				d={props.path}
				fill="none"
				stroke={props.outlineColor ?? 'var(--dirt-darker-brown)'}
				stroke-width={width() + 2}
				stroke-linejoin="bevel"
				stroke-linecap="square"
			/>
			<path
				d={props.path}
				fill="none"
				stroke={props.color}
				stroke-width={width()}
				stroke-linejoin="round"
				stroke-linecap="round"
			/>
		</>
	)
}

/** A square data point marker centred on (x, y). */
export function GraphPointMarker(props: {
	x: number
	y: number
	size: number
	fill: string
	stroke: string
	strokeWidth?: number
}) {
	return (
		<rect
			x={props.x - props.size / 2}
			y={props.y - props.size / 2}
			width={props.size}
			height={props.size}
			fill={props.fill}
			stroke={props.stroke}
			stroke-width={props.strokeWidth ?? 1}
		/>
	)
}
