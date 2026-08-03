/**
 * A little wooden signpost used for axis labels, centred on (x, y).
 */
export function SignBadge(props: {
	x: number
	y: number
	label: string
	badgeW?: number
	badgeH?: number
}) {
	const bw = () => props.badgeW ?? 40
	const bh = () => props.badgeH ?? 18
	const bx = () => props.x - bw() / 2
	const by = () => props.y - bh() / 2
	const postTopY = () => by() + bh()
	const postBottomY = () => postTopY() + 6

	return (
		<g>
			{/* Sign posts */}
			<line
				x1={bx() + bw() * 0.3}
				y1={postTopY()}
				x2={bx() + bw() * 0.3}
				y2={postBottomY()}
				stroke="#4A3215"
				stroke-width="1.5"
			/>
			<line
				x1={bx() + bw() * 0.7}
				y1={postTopY()}
				x2={bx() + bw() * 0.7}
				y2={postBottomY()}
				stroke="#4A3215"
				stroke-width="1.5"
			/>
			{/* Badge outline */}
			<rect
				x={bx() - 1}
				y={by() - 1}
				width={bw() + 2}
				height={bh() + 2}
				fill="#4A3215"
			/>
			{/* Badge fill */}
			<rect x={bx()} y={by()} width={bw()} height={bh()} fill="#AD855A" />
			{/* Badge text */}
			<text
				x={props.x}
				y={props.y}
				fill="#4A3215"
				font-family="monospace"
				font-weight="bold"
				font-size="11"
				text-anchor="middle"
				dominant-baseline="central"
			>
				{props.label}
			</text>
		</g>
	)
}
