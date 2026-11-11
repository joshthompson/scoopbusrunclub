import { For, type JSX } from 'solid-js'
import flats from '../assets/stadium/flats.png'
import grandstand from '../assets/stadium/grandstand.png'
import masts from '../assets/stadium/masts.png'
import railing from '../assets/stadium/railing.png'
import { PATH_BACK, PX_PER_M, START_X, VERGE } from '../game/constants'
import type { View } from './Backdrop'
import { LANE_LINES, TRACK_INSIDE } from './art/track'

/**
 * A stadium behind the track, for Kristineberg: the grandstand, white with its
 * wooden roof and benches and blue pillars, coming round once a lap; a
 * railing along the back of the track; floodlight masts; and the yellow
 * blocks of flats beyond. Each is a picture, repeated.
 */

/** A picture, as a CSS background. */
const image = (src: string) => `url("${src}")`

/** Where the concrete behind the track starts: everything stands on it. */
const APRON_TOP = (y: number) => y - PATH_BACK - VERGE

// --- The grandstand ---------------------------------------------------------

const STAND_WIDTH = 900
const STAND_HEIGHT = 272
/** It comes round once a lap: 400 m. */
const LAP = 400 * PX_PER_M
/** Where the first one is: the start line in front of it, towards its far end. */
const FIRST_STAND = START_X - 620

const STAND = image(grandstand)

// --- The flats beyond, and trees between them --------------------------------

const CITY_WIDTH = 1400
const CITY_HEIGHT = 200
const CITY_PARALLAX = 0.25
const CITY = image(flats)

// --- Floodlight masts ----------------------------------------------------------

const MAST_WIDTH = 1100
const MAST_HEIGHT = 420
const MAST_PARALLAX = 0.55

const MASTS = image(masts)

// --- The railing along the back of the track ------------------------------

const RAIL_WIDTH = 48
const RAIL_HEIGHT = 16
const RAILING = image(railing)

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
