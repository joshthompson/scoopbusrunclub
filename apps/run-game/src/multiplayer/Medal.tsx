import { For } from 'solid-js'

/** Gold, silver and bronze: [face, rim, shine]. */
const METALS = [
	['#ffd23f', '#b8860b', '#fff3b0'],
	['#dfe4ea', '#8a939e', '#ffffff'],
	['#e0915a', '#8f4a1f', '#f7c9a2'],
] as const

/** [x, y, width] of each row of the disc, in pixels, and inset by one for its face. */
const RIM: [number, number, number][] = [
	[4, 6, 4],
	[3, 7, 6],
	[2, 8, 8],
	[2, 9, 8],
	[2, 10, 8],
	[2, 11, 8],
	[3, 12, 6],
	[4, 13, 4],
]
const FACE: [number, number, number][] = [
	[4, 7, 4],
	[3, 8, 6],
	[3, 9, 6],
	[3, 10, 6],
	[3, 11, 6],
	[4, 12, 4],
]

/**
 * A medal on its ribbon, in pixels: gold for 1st, silver for 2nd, bronze for
 * 3rd. `size` is how many screen pixels each of its pixels is.
 */
export function Medal(props: { place: 1 | 2 | 3; size?: number }) {
	const metal = () => METALS[props.place - 1]
	const size = () => props.size ?? 4
	return (
		<svg
			width={12 * size()}
			height={14 * size()}
			viewBox="0 0 12 14"
			shape-rendering="crispEdges"
			role="img"
			aria-label={['Gold', 'Silver', 'Bronze'][props.place - 1]}
			style={{ display: 'block', 'flex-shrink': 0 }}
		>
			{/* The ribbon, a V of the bus's red and the ink. */}
			<rect x={2} y={0} width={2} height={3} fill="#e8423f" />
			<rect x={3} y={3} width={2} height={3} fill="#e8423f" />
			<rect x={8} y={0} width={2} height={3} fill="#0f1f29" />
			<rect x={7} y={3} width={2} height={3} fill="#0f1f29" />
			<For each={RIM}>
				{([x, y, w]) => (
					<rect x={x} y={y} width={w} height={1} fill={metal()[1]} />
				)}
			</For>
			<For each={FACE}>
				{([x, y, w]) => (
					<rect x={x} y={y} width={w} height={1} fill={metal()[0]} />
				)}
			</For>
			<rect x={4} y={8} width={1} height={2} fill={metal()[2]} />
			<rect x={5} y={8} width={1} height={1} fill={metal()[2]} />
		</svg>
	)
}

/** Points, said properly: 1 pt, 2 pts. */
export const pts = (n: number) => `${n} pt${n === 1 ? '' : 's'}`

export const ordinal = (n: number) =>
	`${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`
