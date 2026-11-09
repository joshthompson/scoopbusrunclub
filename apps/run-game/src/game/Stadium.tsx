import { For, type JSX } from 'solid-js'
import { seeded } from '../levels/seeded'
import type { View } from './Backdrop'
import { PATH_BACK, PX_PER_M, START_X, VERGE } from './constants'
import { LANE_LINES, TRACK_INSIDE } from './trackArt'

/**
 * A stadium behind the track, for Kristineberg: the grandstand, white with its
 * wooden roof and benches and blue pillars, coming round once a lap; a
 * railing along the back of the track; floodlight masts; and the yellow
 * blocks of flats beyond. Each is drawn once, as pixel art, into an image,
 * and the images repeated, rather than thousands of separate rectangles.
 */

/** [x, y, width, height, colour] */
type Rect = [number, number, number, number, string]

/** Rectangles as an SVG image, to use as an `<img>` or a background. */
function image(width: number, height: number, rects: Rect[]) {
	const body = rects
		.map(
			([x, y, w, h, fill]) =>
				`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`,
		)
		.join('')
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">${body}</svg>`
	return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`
}

/** Where the concrete behind the track starts: everything stands on it. */
const APRON_TOP = (y: number) => y - PATH_BACK - VERGE

// --- The grandstand ---------------------------------------------------------

const STAND_WIDTH = 900
const STAND_HEIGHT = 272
/** It comes round once a lap: 400 m. */
const LAP = 400 * PX_PER_M
/** Where the first one is: the start line in front of it, towards its far end. */
const FIRST_STAND = START_X - 620

const WHITE = '#f3f2ed'
const SHADE = '#c7ccd0'
const WOOD = '#8a4a24'
const WOOD_DARK = '#6f3a1b'
const BENCH = '#a0683a'
const BENCH_GAP = '#4f2f17'
const PILLAR = '#4f7590'
const PILLAR_DARK = '#3a586d'
const CONCRETE = '#b8bdc1'
const WINDOW = '#5d6a74'

function standRects(): Rect[] {
	const W = STAND_WIDTH
	const r: Rect[] = []
	// The roof: its white edge, the wooden planks underneath, and its shadow.
	r.push([0, 0, W, 6, '#f8f8f5'])
	r.push([0, 6, W, 26, WOOD])
	for (let y = 11; y < 32; y += 6) r.push([0, y, W, 2, WOOD_DARK])
	r.push([0, 32, W, 2, '#4a2612'])
	// The wall at the back, under the roof, in its shade at the top.
	r.push([30, 34, W - 50, 30, SHADE])
	r.push([30, 64, W - 50, 50, '#e8e7e2'])
	for (let x = 60; x < W - 30; x += 90) r.push([x, 34, 2, 80, '#b5bbc0'])
	for (let x = 50; x < W - 30; x += 60) r.push([x, 36, 4, 4, '#fffbe0'])
	// Rows of wooden benches, down to the front.
	const seatsTop = 114
	const seatsBottom = 182
	for (let y = seatsTop; y < seatsBottom; y += 8) {
		r.push([30, y, W - 50, 4, BENCH])
		r.push([30, y + 4, W - 50, 4, BENCH_GAP])
	}
	// Steps up through them, with a handrail.
	for (let x = 210; x < W - 60; x += 240) {
		r.push([x, seatsTop, 14, seatsBottom - seatsTop, '#c9cdd0'])
		for (let y = seatsTop; y < seatsBottom; y += 8)
			r.push([x, y + 6, 14, 2, '#9aa1a6'])
		r.push([x - 2, seatsTop, 2, seatsBottom - seatsTop, '#f2f2f2'])
	}
	// The pillars holding the roof up.
	for (let x = 70; x < W - 30; x += 110) {
		r.push([x, 34, 6, seatsBottom - 34, PILLAR])
		r.push([x + 4, 34, 2, seatsBottom - 34, PILLAR_DARK])
	}
	// The railing along the front of the seats.
	r.push([30, seatsBottom - 12, W - 50, 2, '#f4f4f4'])
	for (let x = 30; x < W - 20; x += 16)
		r.push([x, seatsBottom - 12, 2, 12, '#f4f4f4'])
	// The building underneath: white, with a row of small windows, a door,
	// drainpipes, and a grey plinth.
	const baseTop = seatsBottom
	const baseBottom = STAND_HEIGHT - 8
	r.push([40, baseTop, W - 60, 4, '#d9d9d4'])
	r.push([40, baseTop + 4, W - 60, baseBottom - baseTop - 4, WHITE])
	const door = W / 2
	for (let x = 70; x < W - 50; x += 36) {
		if (Math.abs(x + 10 - door) < 40) continue
		r.push([x, 208, 20, 16, '#e0e0da'])
		r.push([x + 2, 210, 16, 12, WINDOW])
		r.push([x + 2, 210, 16, 3, '#8796a1'])
	}
	r.push([door - 14, 200, 28, baseBottom - 200, '#a7aeb3'])
	r.push([door - 12, 202, 24, baseBottom - 202, '#cfd4d7'])
	for (let x = 120; x < W - 40; x += 180)
		r.push([x, baseTop + 4, 2, baseBottom - baseTop - 4, '#c3c8cb'])
	r.push([40, baseBottom, W - 60, 8, '#8f969b'])
	// The stairs up to the seats, at the near end, with a white rail.
	for (let k = 0; k < 10; k++) {
		const top = STAND_HEIGHT - (k + 1) * 9
		r.push([k * 4, top, 4, STAND_HEIGHT - top, CONCRETE])
		r.push([k * 4, top - 14, 4, 2, '#f4f4f4'])
		if (k % 3 === 0) r.push([k * 4, top - 14, 2, 14, '#f4f4f4'])
	}
	return r
}

const STAND = image(STAND_WIDTH, STAND_HEIGHT, standRects())

// --- The flats beyond, and trees between them --------------------------------

const CITY_WIDTH = 1400
const CITY_HEIGHT = 200
const CITY_PARALLAX = 0.25
const FACADES = ['#e9c46a', '#f2d58f', '#e7b95c', '#efe3c4']

function cityRects(): Rect[] {
	const random = seeded(1937)
	const r: Rect[] = []
	let x = 10
	while (x < CITY_WIDTH - 160) {
		const width = Math.round((140 + random() * 140) / 2) * 2
		if (x + width > CITY_WIDTH - 10) break
		const height = Math.round((70 + random() * 80) / 2) * 2
		const top = CITY_HEIGHT - height
		const facade = FACADES[Math.floor(random() * FACADES.length)]
		r.push([x, top, width, height, facade])
		r.push([x, top, width, 6, '#8b6b56'])
		for (let wy = top + 16; wy < CITY_HEIGHT - 12; wy += 18)
			for (let wx = x + 10; wx < x + width - 14; wx += 16) {
				r.push([wx, wy, 8, 10, '#6c7a86'])
				r.push([wx, wy + 10, 8, 2, '#fff6e0'])
			}
		x += width
		// Trees in some of the gaps between them, coming into leaf.
		const gap = Math.round((16 + random() * 50) / 2) * 2
		if (gap > 36) {
			const middle = x + gap / 2
			r.push([middle - 2, CITY_HEIGHT - 30, 4, 30, '#5b4636'])
			r.push([middle - 16, CITY_HEIGHT - 62, 32, 34, '#7aa35a'])
			r.push([middle - 10, CITY_HEIGHT - 72, 20, 12, '#8db86a'])
			r.push([middle - 16, CITY_HEIGHT - 36, 32, 6, '#5f8a45'])
		}
		x += gap
	}
	return r
}

const CITY = image(CITY_WIDTH, CITY_HEIGHT, cityRects())

// --- Floodlight masts ----------------------------------------------------------

const MAST_WIDTH = 1100
const MAST_HEIGHT = 420
const MAST_PARALLAX = 0.55

function mastRects(): Rect[] {
	const r: Rect[] = []
	const x = MAST_WIDTH / 2
	// Its lattice: two legs, rungs and a zigzag between them.
	r.push([x - 6, 30, 2, MAST_HEIGHT - 30, '#c9ced2'])
	r.push([x + 6, 30, 2, MAST_HEIGHT - 30, '#c9ced2'])
	for (let y = 34; y < MAST_HEIGHT; y += 10) {
		r.push([x - 6, y, 14, 2, '#c9ced2'])
		r.push([x - 4 + ((y / 10) % 2) * 6, y + 4, 6, 2, '#b3b9be'])
	}
	// The lamps at the top.
	r.push([x - 24, 0, 50, 30, '#7c858b'])
	for (let i = 0; i < 3; i++)
		for (let j = 0; j < 2; j++)
			r.push([x - 20 + i * 16, 4 + j * 13, 12, 9, '#fff6c8'])
	return r
}

const MASTS = image(MAST_WIDTH, MAST_HEIGHT, mastRects())

// --- The railing along the back of the track ------------------------------

const RAIL_WIDTH = 48
const RAIL_HEIGHT = 16
const RAILING = image(RAIL_WIDTH, RAIL_HEIGHT, [
	[0, 0, RAIL_WIDTH, 3, '#f4f4f4'],
	[0, 8, RAIL_WIDTH, 2, '#f4f4f4'],
	[0, 0, 3, RAIL_HEIGHT, '#f4f4f4'],
	[3, 0, 1, RAIL_HEIGHT, '#c9cdd0'],
])

const layer: JSX.CSSProperties = { position: 'absolute', left: 0, right: 0 }

/**
 * Everything behind the track, front of the sky: the stadium's backdrop, in
 * place of Haga's hills. The track itself, and the concrete it's set in, are
 * the ground's.
 */
export function StadiumBackdrop(props: { world: View }) {
	const { terrain } = props.world
	const scroll = (parallax: number) =>
		`${Math.round(-props.world.camera() * parallax)}px`
	/** The top of the concrete behind the track: it's flat, so one height. */
	const apronTop = APRON_TOP(terrain.groundY(START_X))

	const stands: number[] = []
	for (let x = FIRST_STAND; x < terrain.finishX + 1600; x += LAP) stands.push(x)

	const band = (
		image: string,
		top: number,
		height: number,
		parallax: number,
	): JSX.Element => (
		<div
			style={{
				...layer,
				top: `${top}px`,
				height: `${height}px`,
				'background-image': image,
				'background-repeat': 'repeat-x',
				'background-position-x': scroll(parallax),
			}}
		/>
	)

	return (
		<>
			{band(CITY, apronTop - 36 - CITY_HEIGHT, CITY_HEIGHT, CITY_PARALLAX)}
			{band(MASTS, 40, MAST_HEIGHT, MAST_PARALLAX)}
			{/* A grass bank between the flats and the track. */}
			<div
				style={{
					...layer,
					top: `${apronTop - 44}px`,
					bottom: 0,
					background: '#7aa957',
				}}
			/>
			{band(RAILING, apronTop - RAIL_HEIGHT, RAIL_HEIGHT, 1)}
			{/* The grandstands, one a lap, right behind the track: they move with it. */}
			<div
				style={{
					position: 'absolute',
					inset: 0,
					transform: `translateX(${Math.round(-props.world.camera())}px)`,
					'will-change': 'transform',
				}}
			>
				<For each={stands}>
					{(x) => (
						<div
							style={{
								position: 'absolute',
								left: `${x}px`,
								top: `${apronTop - STAND_HEIGHT}px`,
								width: `${STAND_WIDTH}px`,
								height: `${STAND_HEIGHT}px`,
								'background-image': STAND,
							}}
						/>
					)}
				</For>
			</div>
		</>
	)
}

/** The ground's layers for a running track, as offsets from the line everyone runs along. */
export const TRACK_GROUND: [number, string][] = [
	// The concrete behind the track, with a step at its back.
	[-PATH_BACK - VERGE, '#b9bec2'],
	[-PATH_BACK - VERGE + 2, '#d9dcde'],
	// The kerb, then the track, its lanes marked out in white.
	[-PATH_BACK - 2, '#f2f2f2'],
	[-PATH_BACK, '#a8442f'],
	[-PATH_BACK + 2, '#cd5a40'],
	...LANE_LINES.flatMap((y): [number, string][] => [
		[y, '#f4efe8'],
		[y + 2, '#cd5a40'],
	]),
	// Its inside edge, and the football pitch's turf, with a line on it.
	[TRACK_INSIDE, '#f4efe8'],
	[TRACK_INSIDE + 2, '#59b448'],
	[34, '#f4efe8'],
	[36, '#59b448'],
]
