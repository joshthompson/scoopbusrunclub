import ghostAsset from '@/assets/halloween/ghost1.png'
import pumpkinAsset from '@/assets/halloween/pumpkin1.png'
import { Show } from 'solid-js'
import { paintedArt } from '../../courses/kit/pixelArt'
import { cone } from '../../courses/kit/sewerScenery'
import type { CourseId } from '../../courses/types'
import { PixelArt } from '../PixelArt'
import { BALL } from '../football'
import { TrophyArt } from './trophy'

/**
 * Each course's special goal, its own picture: what's to be done, drawn. And
 * where a course's own hat would be the same picture, something else for
 * its collectables goal in its place.
 */

/** A goal's picture, and how big it's drawn, at its biggest. */
export interface GoalIcon {
	src: string
	width: number
	height: number
}

/** Each cell twice the size of a screen pixel, as the runners are. */
const CELL = 2

/** Pixel art from rows of letters, each a colour; a `.`, nothing. */
function rowsArt(rows: string[], colours: Record<string, string>): GoalIcon {
	const columns = rows[0].length
	return {
		src: paintedArt(
			columns,
			rows.length,
			(x, y) => colours[rows[Math.floor(y)][Math.floor(x)]],
		),
		width: columns * CELL,
		height: rows.length * CELL,
	}
}

/** Score a goal: the football. */
const FOOTBALL: GoalIcon = { src: BALL, width: 11 * CELL, height: 11 * CELL }

/** Finish wearing a pumpkin: one, carved. */
const PUMPKIN: GoalIcon = { src: pumpkinAsset, width: 29, height: 23 }

/** Deer riding deer: a deer's head, its antlers up off it. */
const DEER = rowsArt(
	[
		'D.D.......D.D',
		'A.A.D...D.A.A',
		'.AAAA...AAAA.',
		'...A.....A...',
		'...A.....A...',
		'.bbBBBBBBBbb.',
		'bBBBBBBBBBBBb',
		'...BBBBBBB...',
		'...BKBBBKB...',
		'...BBBBBBB...',
		'....BBBBB....',
		'....BLLLB....',
		'....LLLLL....',
		'.....LKL.....',
	],
	{
		A: '#c9a46a',
		D: '#9c7a46',
		B: '#9a6438',
		b: '#6e4424',
		L: '#e2c79c',
		K: '#1d1d1d',
	},
)

/** Long jump 10 m: the sand pit, a marker flag stuck in it, far out. */
const LONG_JUMP = rowsArt(
	[
		'.........PRRRR',
		'.........PRWWR',
		'.........PRRRR',
		'.........P....',
		'.........P....',
		'..s......P....',
		'.s.s.....P....',
		's...s....P....',
		'SSSSSSSSSSSSSS',
		'SSddSSSSSSSSSS',
		'ssssssssssssss',
		'bbbbbbbbbbbbbb',
	],
	{
		P: '#5b4a36',
		R: '#e8473c',
		W: '#ffffff',
		S: '#f0d79a',
		s: '#c9a96a',
		d: '#b8955a',
		b: '#8a5a34',
	},
)

/** Knock over every traffic cone: one. */
const CONE: GoalIcon = { src: cone, width: 8 * CELL, height: 11 * CELL }

/** Complete the course on foot: a running shoe. */
const SHOE = rowsArt(
	[
		'..OOOO..........',
		'.ORRRRO.........',
		'.ORRWRRO........',
		'.ORRRWRRO.......',
		'.ORRRRWRROOO....',
		'.ORRRRRRRRRROO..',
		'.ORRRRRRRRRRRRO.',
		'.OSSSSSSSSSSSSSO',
		'..OOOOOOOOOOOOO.',
	],
	{ O: '#2b2f36', R: '#e8473c', W: '#ffffff', S: '#eef1f4' },
)

/** On top of a tower: a guard tower, its flag flying. */
const TOWER = rowsArt(
	[
		'.....PRR...',
		'.....PRR...',
		'.....P.....',
		'L.L.LPL.L.L',
		'LLLLLLLLLLL',
		'DDDDDDDDDDD',
		'.LLLLLLLLL.',
		'.LLKLLLKLL.',
		'.LLKLLLKLL.',
		'.LLLLLLLLL.',
		'.LLLKKKLLL.',
		'.LLKKKKKLL.',
		'.LLKKKKKLL.',
		'.LLKKKKKLL.',
	],
	{
		P: '#5b4a36',
		R: '#e8473c',
		L: '#b9a98a',
		D: '#8a7a5e',
		K: '#2b2722',
	},
)

/** Each special goal's picture: any without, a trophy. */
const SPECIAL: Partial<Record<CourseId, GoalIcon>> = {
	haga: FOOTBALL,
	'halloween-town': PUMPKIN,
	huddinge: DEER,
	kristineberg: LONG_JUMP,
	sewers: CONE,
	slopes: SHOE,
	'great-wall': TOWER,
}

/**
 * For a collectables goal, in place of the course's own hat, where that's
 * its special goal's picture: Halloween Town's ghost, its pumpkin being for
 * finishing in one.
 */
export const COLLECTABLES_ICON: Partial<Record<CourseId, GoalIcon>> = {
	'halloween-town': { src: ghostAsset, width: 32, height: 50 },
}

/**
 * A goal's picture, fitted into `size` px if given: a shadow of it, till
 * it's `done`.
 */
export function GoalIconArt(props: {
	icon: GoalIcon
	done?: boolean
	size?: number
}) {
	/**
	 * Down to fit, a whole number of times smaller, so its pixels stay
	 * square: a cell a pixel, drawn half size.
	 */
	const fit = () =>
		props.size
			? 1 /
				Math.ceil(Math.max(props.icon.width, props.icon.height) / props.size)
			: 1
	return (
		<span
			style={{
				display: 'inline-grid',
				'place-items': 'center',
				width: props.size ? `${props.size}px` : undefined,
				height: props.size ? `${props.size}px` : undefined,
				'flex-shrink': 0,
				'line-height': 0,
				filter: props.done ? undefined : 'brightness(0) opacity(0.35)',
			}}
		>
			<PixelArt
				src={props.icon.src}
				width={Math.round(props.icon.width * fit())}
				height={Math.round(props.icon.height * fit())}
			/>
		</span>
	)
}

/**
 * A course's special goal's picture, fitted into `size` px if given, or a
 * trophy, if it hasn't one of its own: a shadow of it, till it's `done`.
 */
export function SpecialGoalArt(props: {
	course: CourseId
	done?: boolean
	size?: number
}) {
	return (
		<Show
			when={SPECIAL[props.course]}
			fallback={<TrophyArt done={props.done} scale={props.size ? 1 : 2} />}
		>
			{(icon) => (
				<GoalIconArt icon={icon()} done={props.done} size={props.size} />
			)}
		</Show>
	)
}
