import pumpkin1Asset from '@/assets/halloween/pumpkin1.png'
import pumpkin2Asset from '@/assets/halloween/pumpkin2.png'
import pumpkin3Asset from '@/assets/halloween/pumpkin3.png'
import pumpkin4Asset from '@/assets/halloween/pumpkin4.png'
import pumpkin5Asset from '@/assets/halloween/pumpkin5.png'
import { type JSX, Show } from 'solid-js'
import {
	type PixelRect,
	paintedArt,
	pixelArt,
} from '../../courses/kit/pixelArt'
import type { Hat, HatKind } from '../../game/hats'

/**
 * The hats, as they're worn: each facing left, the way the run sprites do,
 * so it turns round with whoever's wearing it. Drawn in cells twice the size
 * of a screen pixel, as the runners are, but for the Pumpkins, which are
 * pictures of their own.
 */

const CELL = 2

/** A hat's picture, and where on it the top of a head goes. */
export interface HatArt {
	src: string
	width: number
	height: number
	/** How far down from its top the top of the head is: how far it comes down over it. */
	crown: number
	/** How far in from its left the middle of the head is. */
	middle: number
}

const cells = (
	columns: number,
	rows: number,
	rects: PixelRect[],
	crown: number,
	middle: number,
): HatArt => ({
	src: pixelArt(columns, rows, rects),
	width: columns * CELL,
	height: rows * CELL,
	crown: crown * CELL,
	middle: middle * CELL,
})

/**
 * A miner's helmet: a yellow hard hat, a ridge along its top, its brim all
 * round, and its lamp on the front, lit.
 */
const MINER = cells(
	10,
	5,
	[
		[3, 0, 5, 1, '#f2c12e'],
		[2, 1, 7, 2, '#f2c12e'],
		[2, 3, 7, 1, '#c9971c'],
		[1, 4, 9, 1, '#a87a12'],
		// The light on it, and its ridge.
		[3, 1, 2, 1, '#ffe27a'],
		[6, 0, 1, 3, '#d9a722'],
		// The lamp: its housing, and its lens, lit.
		[1, 1, 1, 3, '#3d3d3d'],
		[0, 1, 1, 3, '#fff3a0'],
		[0, 1, 1, 1, '#ffffff'],
	],
	2,
	5.5,
)

/**
 * The captain's hat, worn: smaller than it's drawn sat up on the ferry's
 * roof (see `captainsHat`), to fit a head. White, its band black with a
 * gold badge, its peak out over the brow.
 */
const CAPTAIN = cells(
	9,
	5,
	[
		[2, 0, 6, 1, '#ffffff'],
		[1, 1, 8, 2, '#f3f1ea'],
		[2, 1, 3, 1, '#ffffff'],
		[1, 3, 8, 1, '#1e2328'],
		[4, 3, 1, 1, '#e2c25a'],
		[0, 4, 5, 1, '#1e2328'],
		[1, 4, 2, 1, '#3a4047'],
	],
	2.5,
	5,
)

/** A ski helmet: red, shiny, vents along its top, and goggles pushed up on its front. */
const SKI_HELMET = cells(
	8,
	5,
	[
		[2, 0, 4, 1, '#d8342c'],
		[1, 1, 6, 2, '#d8342c'],
		[1, 3, 7, 1, '#d8342c'],
		[1, 4, 7, 1, '#9c1f1a'],
		// The shine on it, and its vents.
		[2, 1, 2, 1, '#f47a70'],
		[5, 1, 1, 1, '#7a1612'],
		// Its goggles, pushed up on its front.
		[0, 2, 2, 2, '#f39a2a'],
		[0, 2, 1, 1, '#ffe0a3'],
		[2, 3, 5, 1, '#26262b'],
	],
	2,
	4,
)

const GOLD = '#e8b52c'
const LAPIS = '#2350a8'
/**
 * A pharaoh's headdress, its nemes: striped gold and blue, a gold band
 * across the brow with the cobra rearing up off its front, and its cloth
 * down behind the ear to the shoulder, and on down the back.
 */
const PHARAOH = cells(
	11,
	11,
	[
		// Over the top of the head, striped.
		[3, 0, 6, 1, GOLD],
		[2, 1, 8, 1, LAPIS],
		[2, 2, 8, 1, GOLD],
		// The band across the brow, and the cobra rearing up off its front.
		[1, 3, 9, 1, GOLD],
		[1, 3, 1, 1, '#fff0a8'],
		[0, 0, 2, 1, '#2f8f4a'],
		[1, 1, 1, 2, GOLD],
		// Its lappet, down behind the ear to the shoulder, striped.
		...[4, 5, 6, 7, 8, 9].map(
			(y): PixelRect => [5, y, 2, 1, y % 2 ? GOLD : LAPIS],
		),
		[5, 10, 3, 1, GOLD],
		// Down the back of the head, flaring out, and its tail.
		...[3, 4, 5, 6, 7, 8].map(
			(y): PixelRect => [8, y, y < 6 ? 2 : 3, 1, y % 2 ? LAPIS : GOLD],
		),
		[9, 9, 2, 1, LAPIS],
		[9, 10, 2, 1, GOLD],
	],
	1,
	5,
)

const STRAW = '#e2c27a'
const STRAW_DARK = '#b8954c'
/**
 * A bamboo hat (dǒulì): the conical straw hat, wide and shallow, woven in rings, a knot
 * at its point, and its shade under the brim.
 */
const BAMBOO_HAT = cells(
	15,
	5,
	[
		[6, 0, 3, 1, STRAW],
		[4, 1, 7, 1, STRAW],
		[2, 2, 11, 1, STRAW],
		[0, 3, 15, 1, STRAW_DARK],
		[3, 4, 9, 1, '#6e5426'],
		// The weave, in rings, and the light on it.
		[5, 1, 1, 1, STRAW_DARK],
		[9, 1, 1, 1, STRAW_DARK],
		[3, 2, 1, 1, STRAW_DARK],
		[7, 2, 1, 1, STRAW_DARK],
		[11, 2, 1, 1, STRAW_DARK],
		[4, 1, 1, 1, '#f3dda0'],
		[7, 0, 1, 1, '#8a6a2a'],
	],
	3.5,
	7.5,
)

/** A crown of midsummer flowers, on a band of leaves, round the top of the head. */
const FLOWER_CROWN = cells(
	9,
	3,
	[
		[0, 2, 9, 1, '#3f8f3a'],
		[2, 2, 1, 1, '#5fb14f'],
		[6, 2, 1, 1, '#5fb14f'],
		...['#f6d743', '#ffffff', '#e2413b', '#7aa8f0', '#f29bb0'].flatMap(
			(colour, i): PixelRect[] => [
				[i * 2, 1, 2, 1, colour],
				[i * 2 + (i % 2), 0, 1, 1, colour],
			],
		),
	],
	2,
	4.5,
)

/** A sweatband round the brow: white, a red stripe, its ends tied at the back. */
const SWEATBAND = cells(
	9,
	3,
	[
		[0, 0, 7, 1, '#f4f4f4'],
		[0, 1, 7, 1, '#d8342c'],
		[7, 0, 2, 1, '#f4f4f4'],
		[7, 1, 1, 2, '#d8342c'],
	],
	-3,
	3.5,
)

const NAVY = '#1f2b55'
const BRASS = '#e2b13c'
/**
 * A Royal Guard's helmet: navy blue, its brass spike and its badge on the
 * front, a peak out over the brow, and a white plume up off the top.
 */
const GUARD_HELMET = cells(
	9,
	9,
	[
		[4, 0, 2, 1, '#ffffff'],
		[3, 1, 3, 1, '#ffffff'],
		[4, 2, 2, 1, '#e4e4e4'],
		[4, 3, 2, 1, BRASS],
		[2, 4, 6, 1, NAVY],
		[1, 5, 8, 2, NAVY],
		[3, 5, 2, 1, '#3d4f86'],
		[1, 5, 2, 2, BRASS],
		[0, 7, 9, 1, '#151b33'],
		[0, 7, 3, 1, '#0d1122'],
	],
	5,
	4.5,
)

const ANTLER = '#c9a46a'
const ANTLER_DARK = '#9c7a46'
/** A headband with a pair of antlers up off it, branching. */
const ANTLERS = cells(
	13,
	7,
	[
		[3, 6, 7, 1, '#7a4a2a'],
		// The front one, and the back one, each branching.
		[3, 2, 1, 4, ANTLER],
		[2, 1, 1, 2, ANTLER],
		[1, 0, 1, 2, ANTLER_DARK],
		[4, 3, 1, 1, ANTLER],
		[5, 2, 1, 1, ANTLER_DARK],
		[9, 2, 1, 4, ANTLER],
		[10, 1, 1, 2, ANTLER],
		[11, 0, 1, 2, ANTLER_DARK],
		[8, 3, 1, 1, ANTLER],
		[7, 2, 1, 1, ANTLER_DARK],
	],
	6,
	6.5,
)

/** A propeller beanie's cap, in quarters, a peak out front and a button on top for its propeller. */
const PROPELLER = cells(
	8,
	4,
	[
		[2, 0, 2, 1, '#d8342c'],
		[4, 0, 2, 1, '#f2c12e'],
		[1, 1, 3, 2, '#d8342c'],
		[4, 1, 3, 2, '#f2c12e'],
		[1, 2, 3, 1, '#2f5fb3'],
		[4, 2, 3, 1, '#3f9a4a'],
		[3, 0, 2, 1, '#ffffff'],
		[0, 3, 4, 1, '#2f5fb3'],
		[4, 3, 3, 1, '#245090'],
	],
	1.5,
	4,
)

/** A chullo: knitted, in stripes and zigzags, an ear flap down with a tassel, a pompom on top. */
const CHULLO = cells(
	9,
	9,
	[
		[4, 0, 1, 1, '#f2c12e'],
		[3, 1, 3, 1, '#c8322f'],
		[2, 2, 5, 1, '#ffffff'],
		[1, 3, 7, 1, '#2f5fb3'],
		[1, 4, 7, 1, '#c8322f'],
		[2, 3, 1, 1, '#f2c12e'],
		[4, 3, 1, 1, '#f2c12e'],
		[6, 3, 1, 1, '#f2c12e'],
		// Its ear flap, behind the ear, and the tassel off it.
		[4, 5, 3, 2, '#c8322f'],
		[5, 5, 1, 1, '#ffffff'],
		[5, 7, 1, 1, '#f2c12e'],
		[5, 8, 1, 1, '#f2c12e'],
	],
	2.5,
	4.5,
)

const TENTACLE = '#8e3fb8'
const TENTACLE_DARK = '#6a2a8c'
const TENTACLE_LIGHT = '#b46ad8'
const SUCKER = '#58c43a'
const SUCKER_DARK = '#2f8a22'
/**
 * A purple tentacle, stood up on the head: rounded at its tip, broadening
 * down to its base, a cross brow over the top of its front, and green
 * suckers, rings, down its front, getting bigger.
 */
const TENTACLE_HAT = cells(
	8,
	15,
	[
		// Its body, rounded at its tip, broadening down to its base.
		[3, 0, 2, 1, TENTACLE],
		[2, 1, 4, 3, TENTACLE],
		[2, 4, 5, 4, TENTACLE],
		[1, 8, 6, 4, TENTACLE],
		[0, 12, 8, 3, TENTACLE],
		[5, 2, 1, 10, TENTACLE_DARK],
		[6, 12, 2, 3, TENTACLE_DARK],
		[3, 1, 1, 2, TENTACLE_LIGHT],
		// Its brow, cross.
		[1, 2, 3, 1, '#1d1d1d'],
		// Its suckers down its front, each a ring.
		[1, 4, 3, 2, SUCKER],
		[2, 5, 1, 1, SUCKER_DARK],
		[0, 7, 4, 3, SUCKER],
		[1, 8, 2, 1, SUCKER_DARK],
		[0, 11, 5, 3, SUCKER],
		[1, 12, 3, 1, SUCKER_DARK],
	],
	13.5,
	4,
)

/** A chimney sweep's top hat: tall and black, a band round it, smudged with soot. */
const TOP_HAT = cells(
	7,
	7,
	[
		[1, 0, 5, 5, '#1d1d1f'],
		[2, 0, 1, 4, '#3a3a3e'],
		[1, 4, 5, 1, '#5a1a1a'],
		[0, 5, 7, 1, '#1d1d1f'],
		[4, 1, 1, 1, '#2c2c30'],
	],
	5.5,
	3.5,
)

const LEATHER = '#4a2a14'
const LEATHER_LIT = '#7d4c26'
/**
 * A leather flying helmet: dark, lit along its top, stitched down the
 * middle, an ear flap buckled under, and goggles in brass pushed up on its
 * brow, their strap round the back.
 */
const FLYING_HELMET = cells(
	9,
	6,
	[
		[2, 0, 5, 1, LEATHER_LIT],
		[1, 1, 7, 2, LEATHER],
		[1, 3, 7, 1, LEATHER],
		[2, 1, 4, 1, LEATHER_LIT],
		[5, 0, 1, 4, '#2a170a'],
		[5, 4, 3, 2, LEATHER],
		[6, 5, 1, 1, '#c9a24a'],
		// Its goggles, and their strap.
		[4, 2, 4, 1, '#2a170a'],
		[0, 1, 4, 3, '#c9a24a'],
		[0, 2, 3, 1, '#8fe0f0'],
		[0, 2, 1, 1, '#e6fbff'],
	],
	1.5,
	4.5,
)

/** A bobble hat: red, a white band of knitting round it, and a big white bobble. */
const BOBBLE_HAT = cells(
	8,
	7,
	[
		[3, 0, 2, 2, '#ffffff'],
		[2, 2, 4, 1, '#d23a3a'],
		[1, 3, 6, 1, '#d23a3a'],
		[3, 3, 1, 1, '#ffffff'],
		[5, 3, 1, 1, '#ffffff'],
		[1, 4, 6, 2, '#f2f2f2'],
		[2, 4, 1, 2, '#d8d8d8'],
		[4, 4, 1, 2, '#d8d8d8'],
		[6, 4, 1, 2, '#d8d8d8'],
	],
	4,
	4,
)

const PUMPKINS = [
	pumpkin1Asset,
	pumpkin2Asset,
	pumpkin3Asset,
	pumpkin4Asset,
	pumpkin5Asset,
]

/** A Pumpkin, over the whole head, by its carving. */
const pumpkin = (carving = 1): HatArt => ({
	src: PUMPKINS[carving - 1] ?? pumpkin1Asset,
	width: 29,
	height: 23,
	crown: 13,
	middle: 14.5,
})

const ART: Record<Exclude<HatKind, 'pumpkin'>, HatArt> = {
	miner: MINER,
	captain: CAPTAIN,
	skiHelmet: SKI_HELMET,
	pharaoh: PHARAOH,
	bambooHat: BAMBOO_HAT,
	flowerCrown: FLOWER_CROWN,
	sweatband: SWEATBAND,
	guardHelmet: GUARD_HELMET,
	antlers: ANTLERS,
	propeller: PROPELLER,
	chullo: CHULLO,
	tentacle: TENTACLE_HAT,
	topHat: TOP_HAT,
	flyingHelmet: FLYING_HELMET,
	bobbleHat: BOBBLE_HAT,
}

/** The propeller on top of a propeller beanie, its two blades, red and yellow. */
const BLADES = pixelArt(9, 1, [
	[0, 0, 4, 1, '#d8342c'],
	[4, 0, 1, 1, '#3a3a3a'],
	[5, 0, 4, 1, '#f2c12e'],
])

export const hatArt = (hat: Hat): HatArt =>
	hat.kind === 'pumpkin' ? pumpkin(hat.carving) : ART[hat.kind]

/** How far ahead the miner's lamp shines, and how wide its beam gets, in cells. */
const BEAM_CELLS = 75
const BEAM_ROWS = 33

/**
 * The miner's lamp's beam, as pixel art: a cone of light out ahead of the
 * lamp, facing left as the hats do, brighter down its middle and nearer
 * the lamp, fading in steps the further it goes, its edges dithered.
 */
const BEAM = paintedArt(BEAM_CELLS, BEAM_ROWS, (x, y) => {
	const out = BEAM_CELLS - x
	const half = 1 + out * 0.2
	const across = Math.abs(y - BEAM_ROWS / 2)
	if (across > half) return undefined
	const far = out / BEAM_CELLS
	// Dithered along its edges, and out at its far end.
	const edge = across > half - 1.5 || far > 0.85
	if (edge && (Math.floor(x) + Math.floor(y)) % 2) return undefined
	const core = across < half * 0.45
	const alpha =
		far < 0.3
			? core
				? '78'
				: '50'
			: far < 0.6
				? core
					? '50'
					: '34'
				: core
					? '30'
					: '1c'
	return `#fff0a0${alpha}`
})

/**
 * A hat, `art` sized: on its own, or on a head. The miner's helmet with
 * its lamp's beam shining out ahead of it.
 */
export function HatPicture(props: {
	hat: Hat
	style?: JSX.CSSProperties
	/** Its lamp lit, shining ahead: worn, not sat waiting. */
	lit?: boolean
	/** A propeller beanie's, spinning flat out, floating them down. */
	whirring?: boolean
	/** Not turning at all: a picture of it, on the collectables page. */
	still?: boolean
}) {
	const art = () => hatArt(props.hat)
	return (
		<div
			style={{
				position: 'absolute',
				width: `${art().width}px`,
				height: `${art().height}px`,
				...props.style,
			}}
		>
			<Show when={props.lit && props.hat.kind === 'miner'}>
				<img
					src={BEAM}
					alt=""
					class="pixelated"
					style={{
						position: 'absolute',
						right: `${art().width}px`,
						top: `${4 - BEAM_ROWS}px`,
						width: `${BEAM_CELLS * CELL}px`,
						height: `${BEAM_ROWS * CELL}px`,
						'max-width': 'none',
						'mix-blend-mode': 'screen',
						'pointer-events': 'none',
					}}
				/>
			</Show>
			{/* A propeller beanie's propeller, on its stalk, always turning. */}
			<Show when={props.hat.kind === 'propeller'}>
				<div style={styles.stalk} />
				<img
					src={BLADES}
					alt=""
					class={props.still ? 'pixelated' : 'pixelated propeller'}
					style={{
						...styles.blades,
						'animation-duration': props.whirring ? '0.12s' : '0.6s',
					}}
				/>
			</Show>
			<img
				src={art().src}
				alt=""
				class="pixelated"
				style={{
					display: 'block',
					width: `${art().width}px`,
					height: `${art().height}px`,
				}}
			/>
		</div>
	)
}

const styles = {
	stalk: {
		position: 'absolute',
		left: `${3.5 * CELL}px`,
		top: `${-2 * CELL}px`,
		width: `${CELL}px`,
		height: `${2 * CELL}px`,
		background: '#3a3a3a',
	},
	blades: {
		position: 'absolute',
		left: `${-0.5 * CELL}px`,
		top: `${-3 * CELL}px`,
		width: `${9 * CELL}px`,
		height: `${CELL}px`,
		'max-width': 'none',
	},
} satisfies Record<string, JSX.CSSProperties>
