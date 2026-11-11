import { For } from 'solid-js'

/**
 * A splash, as someone goes into the sea: a column of water bursting up
 * where they went in, spray flying out either side and falling back, and
 * foam spreading out over the water. `age` ticks in, by the tick, so the
 * same on every screen. Its middle is the drawing's middle, at the sea's
 * surface `SPLASH_UP` down from its top.
 */

export const SPLASH_WIDTH = 120
export const SPLASH_UP = 110
export const SPLASH_HEIGHT = SPLASH_UP + 20
/** How long one lasts. */
export const SPLASH_TICKS = 50

const WATER = '#e9f6ff'
const SPRAY = '#bfe3f7'
const FALL = 0.32

/** Spray: how fast out, how fast up, and how big, a drop each. */
const DROPS: [number, number, number][] = [
	[-2.2, 6.5, 6],
	[-1.4, 8, 4],
	[-0.6, 9, 6],
	[0.6, 9.5, 4],
	[1.4, 8, 6],
	[2.2, 6.5, 4],
	[-3, 5, 4],
	[3, 5, 4],
	[-1, 7, 4],
	[1, 7.5, 6],
]

const snap = (n: number) => Math.round(n / 2) * 2

export function SplashArt(props: { age: number }) {
	const t = () => Math.max(0, props.age)
	/** The column, up and back down. */
	const column = () => (t() < 26 ? Math.sin((t() / 26) * Math.PI) * 70 : 0)
	const middle = SPLASH_WIDTH / 2
	return (
		<div
			style={{
				position: 'relative',
				width: `${SPLASH_WIDTH}px`,
				height: `${SPLASH_HEIGHT}px`,
				opacity: t() > SPLASH_TICKS - 10 ? (SPLASH_TICKS - t()) / 10 : 1,
			}}
		>
			{/* The column, wider at its foot. */}
			<div
				style={{
					position: 'absolute',
					left: `${middle - 8}px`,
					width: '16px',
					top: `${snap(SPLASH_UP - column())}px`,
					height: `${snap(column())}px`,
					background: WATER,
				}}
			/>
			<div
				style={{
					position: 'absolute',
					left: `${middle - 14}px`,
					width: '28px',
					top: `${snap(SPLASH_UP - column() * 0.4)}px`,
					height: `${snap(column() * 0.4)}px`,
					background: SPRAY,
				}}
			/>
			<For each={DROPS}>
				{([vx, vy, size]) => {
					const x = () => middle + vx * t() * 1.6 - size / 2
					const y = () => SPLASH_UP - (vy * t() - (FALL * t() * t()) / 2)
					return (
						<div
							style={{
								position: 'absolute',
								left: `${snap(x())}px`,
								top: `${snap(y())}px`,
								width: `${size}px`,
								height: `${size}px`,
								background: size > 4 ? WATER : SPRAY,
								visibility: y() > SPLASH_UP + 4 ? 'hidden' : 'visible',
							}}
						/>
					)
				}}
			</For>
			{/* Foam, spreading out over the water. */}
			<div
				style={{
					position: 'absolute',
					left: `${snap(middle - 12 - t() * 1.1)}px`,
					width: `${snap(24 + t() * 2.2)}px`,
					top: `${SPLASH_UP - 2}px`,
					height: '6px',
					background: WATER,
					opacity: 0.85,
				}}
			/>
		</div>
	)
}
