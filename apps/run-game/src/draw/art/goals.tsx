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

/** Become a ghost: one, a sheet with eyes, its hem wavy, see-through at its edge. */
const GHOST = rowsArt(
	[
		'....WWWWW....',
		'...WWWWWWW...',
		'..WWWWWWWWW..',
		'.WWWWWWWWWWS.',
		'.WWKKWWWKKWS.',
		'.WWKKWWWKKWS.',
		'.WWWWWWWWWWS.',
		'.WWWWKKKWWWS.',
		'.WWWWKKKWWWS.',
		'.WWWWWWWWWWS.',
		'.WWWWWWWWWWS.',
		'.WWWWWWWWWWS.',
		'.WSWWSWWWSWS.',
		'.S..S.S..S.S.',
	],
	{ W: '#f4f2ff', S: '#b9b4d6', K: '#2b2236' },
)

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

/** Pop every germ: a germ, green, its spikes out all round, grinning. */
const GERM = rowsArt(
	[
		'......S......',
		'......D......',
		'..S..GGG..S..',
		'...DGGGGGD...',
		'...GLLGGGG...',
		'..GLGGGGGGG..',
		'SDGGKGGGKGGDS',
		'..GGGGGGGGG..',
		'...GGKKKGGD..',
		'...DGGGGGD...',
		'..S..GDD..S..',
		'......D......',
		'......S......',
	],
	{ G: '#7ac143', L: '#c4ec86', D: '#4f8a2a', S: '#e8604a', K: '#2b2722' },
)

/**
 * Bounce on every crocodile: a crocodile's head, side on, in the water,
 * its eye and its grin, ripples either side of it.
 */
const CROCODILE = rowsArt(
	[
		'.......GGG...',
		'......GYKGG..',
		'..GGGGGGGGGG.',
		'.GLLLLLLLGGG.',
		'GGGGGGGGGGGG.',
		'GTDTDTDTGGGG.',
		'.BBBBBBBGGGD.',
		'WWWWWWWWWWWWW',
		'.WW..WWW..WW.',
	],
	{
		G: '#5f9a3e',
		L: '#7fb655',
		D: '#3f6f2a',
		B: '#d2dc8e',
		Y: '#f2d14a',
		K: '#1d1d1d',
		T: '#fffaf0',
		W: '#6fbcd8',
	},
)

/** Find the Yeti: his face, shaggy and white, pale blue in it, grinning. */
export const YETI = rowsArt(
	[
		'....L.L.L....',
		'..LLWLWLWLL..',
		'.LWWWWWWWWWL.',
		'.WWWWWWWWWWWS',
		'WWWWWWWWWWWWS',
		'WWFFWWWWWFFWS',
		'WWFFFFFFFFFWS',
		'WWFKFFFFFKFWS',
		'SWFFFFfFFFFWS',
		'SWFMFFFFFMFWS',
		'.SWFMTMTMFWS.',
		'.SWWFFFFFWWS.',
		'..SWSWSWSWS..',
		'...S.S.S.S...',
	],
	{
		L: '#ffffff',
		W: '#eef1f7',
		S: '#b9c0dc',
		F: '#a6c0e0',
		f: '#7f9cc6',
		M: '#3b3350',
		T: '#ffffff',
		K: '#1d1d1d',
	},
)

/**
 * Find the miners: the Miner Twins, front on, two heads in orange hard
 * hats over the one wide stiff orange cape, no arms, and their legs.
 */
export const MINERS = rowsArt(
	[
		'..HHH.....HHH..',
		'.HhHHH...HhHHH.',
		'BBBBBBB.BBBBBBB',
		'.SSSSS...SSSSS.',
		'.SKSKS...SKSKS.',
		'.SSSSS...SSSSS.',
		'..SmS.....SmS..',
		'OOOOOOOOOOOOOOO',
		'OlOOOOOOOOOOOlO',
		'OOOOOOOcOOOOOOO',
		'OOOOOOOOOOOOOOO',
		'oOOOOOOcOOOOOOo',
		'ooooooooooooooo',
		'.D.D.......D.D.',
		'.F.F.......F.F.',
	],
	{
		H: '#ef7a33',
		h: '#ffb070',
		B: '#c4561f',
		S: '#f0c49a',
		K: '#1d1d1d',
		m: '#c46a5a',
		O: '#e8642c',
		l: '#ff9460',
		o: '#b04a1f',
		c: '#f2d14a',
		D: '#2b2f3a',
		F: '#7d8fa8',
	},
)

/**
 * Find the Viking: his face, old, no helmet, his long white hair round it
 * under a leather headband, a ginger moustache gone mostly grey, and his
 * big white beard, its braid tied at its end.
 */
export const VIKING = rowsArt(
	[
		'...HHHHHHH...',
		'..HHHHHHHHH..',
		'.HBBBBBBBBBH.',
		'.HSSSSSSSSSH.',
		'HHSKSSSSSKSHH',
		'HHSSSSnSSSSHH',
		'HHsSSnnnSSsHH',
		'HHWGGGGGGGWHH',
		'HHWWWWmWWWWHH',
		'hHWWWWWWWWWHh',
		'hhWWWWWWWWWhh',
		'.hhWWWWWWWhh.',
		'...hWWWWWh...',
		'.....WWW.....',
		'......B......',
	],
	{
		H: '#eeebe4',
		h: '#aba69c',
		B: '#47301f',
		S: '#e5ad86',
		s: '#bf8462',
		n: '#bf8462',
		K: '#1d1d1d',
		G: '#c4834e',
		W: '#f7f5f0',
		m: '#8a4a3a',
	},
)

/**
 * Find the Furby Queen: her face, a Furby's, front on, pink tinsel, its
 * ears up either side of her gold crown, two big eyes with long lashes,
 * and a yellow beak between them.
 */
const FURBY_QUEEN = rowsArt(
	[
		'L...Y.Y.Y...D',
		'LL..YBYBY..DD',
		'LEL.yYYYy.DED',
		'.LLLLLLLLLLD.',
		'LLPLPLPLPLPPD',
		'PKPKPPPKPKPPD',
		'KWWWKPKWWWKPD',
		'WWIIWPWWIIWPD',
		'WIKKWPWIKKWPD',
		'WIKKWYWIKKWPD',
		'PWWWYYYWWWPPD',
		'PPPPyYyPPPPDD',
		'.PDPDyDPDPDD.',
	],
	{
		P: '#e2589f',
		L: '#ff8ccb',
		D: '#a8357a',
		E: '#ffc6e2',
		W: '#fbf8f2',
		I: '#2aa6c4',
		K: '#1d1d1d',
		Y: '#ffd23f',
		y: '#d0921a',
		B: '#3a7bd5',
	},
)

/**
 * Find Bat Person: his face, his black bat hood pulled down over his eyes,
 * its ears up, the whites of his eyes through its slits, his chin under it.
 */
export const BAT_PERSON = rowsArt(
	[
		'.H.........H.',
		'.HH.......HH.',
		'.hHH.....HHh.',
		'.hhHHHHHHHhh.',
		'hhhhhhhhhhhhh',
		'hhhhhhhhhhhhh',
		'hheeehhheeehh',
		'hhhhhhhhhhhhh',
		'hhkkkkkkkkkhh',
		'.hkkkkkkkkkh.',
		'.hkkiiiiikkh.',
		'..kkkkkkkkK..',
		'...kkkkkkK...',
		'....KKKKK....',
	],
	{
		h: '#2c2c38',
		H: '#4a4a5c',
		e: '#f4f4f0',
		k: '#f0c49a',
		K: '#cf9b70',
		i: '#3b1f1a',
	},
)

/**
 * Get all the Rings: one, face on, gold, the light on its top left, its
 * inside edge in shade, the sky through it.
 */
export const RING = rowsArt(
	[
		'....LLLLL....',
		'..LLGGGGGGG..',
		'.LGGDDDDDGGG.',
		'.LGD.....DGG.',
		'LGD.......DGG',
		'LGD.......DGG',
		'LGD.......DGG',
		'LGD.......DGG',
		'GGD.......DGG',
		'.GGD.....DGG.',
		'.GGGDDDDDGGG.',
		'..GGGGGGGGG..',
		'....GGGGG....',
	],
	{
		L: '#ffe680',
		G: '#f7c531',
		D: '#b8860b',
	},
)

/**
 * Break the bridge: a rope bridge snapped in the middle, its posts on the
 * banks, its two halves of planks hanging down towards the break.
 */
export const BROKEN_BRIDGE_ICON = rowsArt(
	[
		'P...........P',
		'Pr.........rP',
		'PBr.......rBP',
		'PBBr.....rBBP',
		'P.BBr...rBB.P',
		'P..BBr.rBB..P',
		'P...BB.BB...P',
		'P....B.B....P',
		'P...........P',
	],
	{
		P: '#5a3f26',
		B: '#95693a',
		r: '#b89b5a',
	},
)

/**
 * Hatch the egg and bring it home: the hatchling, out of its cracked egg,
 * its head up out of the top, running on its own two legs, a finish flag
 * behind it.
 */
const HATCHLING_HOME = rowsArt(
	[
		'K.......gg....',
		'KW.....gGgg...',
		'KWK....gGgkg..',
		'KKW....ggggggg',
		'K.....eEegggE.',
		'K....eEEeeeeee',
		'K....eEeeseeed',
		'K....eeecceeed',
		'K....eseeeeced',
		'K.....eeeeeed.',
		'K......dddddd.',
		'K......l...l..',
		'K.....l.....l.',
		'K....ll.....ll',
	],
	{
		K: '#3a3f44',
		W: '#ffffff',
		e: '#f2e2c0',
		E: '#fff6e0',
		d: '#d4c49a',
		s: '#a8885a',
		c: '#4a3a2a',
		g: '#5f9a3a',
		G: '#86c050',
		k: '#1d1d1d',
		l: '#e0a43a',
	},
)

/**
 * Bounce on 20 heads: a running shoe come down on a runner's head, in
 * Midnattsloppet's blue T-shirt, and the bounce off it, flicking out.
 */
const HEAD_BOUNCE = rowsArt(
	[
		'........Ff...',
		'.......RRRR..',
		'.....WRRRRR..',
		'..RRWRRRRRR..',
		'.Rrrrrrrrrr..',
		'.SSSSSSSSSS..',
		'Y...........Y',
		'.Y..HHHHH..Y.',
		'...HHHHHHH...',
		'...FFFFHHH...',
		'..FKFFFFHH...',
		'...FFFFFFH...',
		'....FFFFf....',
		'.....FFf.....',
		'..BBBBBBBBB..',
		'.BBBBBBBBBBB.',
	],
	{
		R: '#e8473c',
		r: '#b8322a',
		W: '#ffffff',
		S: '#eef1f4',
		Y: '#ffd84a',
		H: '#6a4428',
		F: '#f0c49a',
		f: '#cf9b70',
		K: '#1d1d1d',
		B: '#1f6bff',
	},
)

/** Each special goal's picture: any without, a trophy. */
const SPECIAL: Partial<Record<CourseId, GoalIcon>> = {
	haga: FOOTBALL,
	'halloween-town': GHOST,
	huddinge: DEER,
	kristineberg: LONG_JUMP,
	sewers: CONE,
	slopes: SHOE,
	'great-wall': TOWER,
	karolinska: GERM,
	pyramids: CROCODILE,
	everest: YETI,
	caves: MINERS,
	'city-rooftop': BAT_PERSON,
	'gamla-stan': VIKING,
	'furby-fields': FURBY_QUEEN,
	cliff: RING,
	'machu-picchu': BROKEN_BRIDGE_ICON,
	midnattsloppet: HEAD_BOUNCE,
	'dino-island': HATCHLING_HOME,
}

/**
 * For a collectables goal, in place of the course's own hat, where that's
 * its special goal's picture. None, now: Halloween Town's was its spider
 * cupcake, while its special goal was finishing in a pumpkin.
 */
export const COLLECTABLES_ICON: Partial<Record<CourseId, GoalIcon>> = {}

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
