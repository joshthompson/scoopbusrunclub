import type { JSX } from 'solid-js'
import { type PixelRect, pixelArt } from '../../courses/kit/pixelArt'
import { PixelArt } from '../PixelArt'
import type { CorgiPose } from './corgi'

/**
 * A mole, The Caves' Ride, side on and facing right, in cells twice the
 * size of a screen pixel, as the corgi is: velvety and near black, its
 * pink star of a nose out front, its great pink digging paws, a pink stub
 * of a tail, and a red saddle cloth over its back for riding on. Sat
 * waiting, paws tucked under its chin; scrabbling along, paws going; and
 * mid-hop, or tunnelling, paws out ahead, digging.
 */

const CELL = 2
const COLUMNS = 26
const ROWS = 15

export const MOLE_WIDTH = COLUMNS * CELL
export const MOLE_HEIGHT = ROWS * CELL
/** How tall it is to its back: what you land on to ride it. */
export const MOLE_BACK = 22
/** How far above its feet whoever's riding it sits. */
export const MOLE_SADDLE = 20

const FUR = '#3b3640'
const SHEEN = '#5f5869'
const DARK = '#25212a'
const PINK = '#f19ab0'
const PINK_DARK = '#c76a83'
const CLAW = '#fff4e8'
const CLOTH = '#c2372d'
const TRIM = '#f3c13a'

/** Its body, head and snout, the same in every pose. */
const BODY: PixelRect[] = [
	// A fat oval of velvet.
	[7, 3, 10, 1, FUR],
	[5, 4, 14, 1, FUR],
	[3, 5, 18, 5, FUR],
	[4, 10, 16, 1, FUR],
	[6, 11, 12, 1, DARK],
	// The light on its fur.
	[8, 4, 6, 1, SHEEN],
	[5, 5, 4, 1, SHEEN],
	[4, 6, 2, 1, SHEEN],
	// Its head, its snout, and the star of its nose.
	[20, 5, 3, 4, FUR],
	[22, 6, 2, 3, FUR],
	[24, 6, 2, 2, PINK],
	[25, 5, 1, 1, PINK],
	[25, 8, 1, 1, PINK],
	[24, 8, 1, 1, PINK_DARK],
	// A tiny eye, half hidden in its fur.
	[20, 6, 1, 1, '#0d0b10'],
	// A stub of a tail.
	[1, 8, 2, 1, PINK],
	// Its saddle cloth, and the trim along its edge.
	[9, 1, 7, 2, CLOTH],
	[8, 3, 9, 1, CLOTH],
	[8, 4, 9, 1, TRIM],
	[10, 1, 3, 1, '#e0574c'],
]

/** A big pink digging paw at `x`, `y`, its claws pointing `ahead` (or back). */
const paw = (x: number, y: number, ahead = true): PixelRect[] => [
	[x, y, 3, 2, PINK],
	[x, y + 1, 3, 1, PINK_DARK],
	[ahead ? x + 3 : x - 1, y, 1, 1, CLAW],
	[ahead ? x + 3 : x - 1, y + 1, 1, 1, CLAW],
]

/** Sat waiting, its paws tucked under its chin. */
const SIT = pixelArt(COLUMNS, ROWS, [
	...BODY,
	...paw(18, 11),
	...paw(5, 12, false),
	[3, 13, 18, 2, '#00000022'],
])

/** Scrabbling along, its paws going. */
const CROUCH = pixelArt(COLUMNS, ROWS, [
	...BODY,
	...paw(19, 10),
	...paw(15, 12),
	...paw(6, 11, false),
	...paw(3, 12, false),
])

/** Mid-hop, or tunnelling: its paws out ahead, digging, its hind feet kicking back. */
const LEAP = pixelArt(COLUMNS, ROWS, [
	...BODY,
	...paw(22, 3),
	...paw(22, 10),
	...paw(0, 10, false),
	...paw(2, 11, false),
])

const ART: Record<CorgiPose, string> = { sit: SIT, crouch: CROUCH, leap: LEAP }

/** An ink outline round it, as the corgi has, so it stands out against the rock. */
const OUTLINE: JSX.CSSProperties = {
	filter: [
		'drop-shadow(2px 0 0 #120f14)',
		'drop-shadow(-2px 0 0 #120f14)',
		'drop-shadow(0 2px 0 #120f14)',
		'drop-shadow(0 -2px 0 #120f14)',
	].join(' '),
}

export function MoleArt(props: { pose: CorgiPose }) {
	return (
		<div style={OUTLINE}>
			<PixelArt src={ART[props.pose]} width={MOLE_WIDTH} height={MOLE_HEIGHT} />
		</div>
	)
}
