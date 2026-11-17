import { letterArt } from './pixelArt'

/**
 * The Caves' fika, drawn in code: a miner's packed lunch, a cool rock,
 * and a jar of pickles left down there in the dark.
 */

/**
 * A sandwich, side on, from a miner's lunch box: two slices of bread,
 * lettuce, ham and cheese between them. 12 by 9.
 */
export const sandwich = letterArt(
	[
		'.cCCCCCCCCc.',
		'cbbbbbbbbbbc',
		'cbbbbbbbbbbc',
		'GgGgGGgGgGgG',
		'hhhhhhhhhhhh',
		'yyyyyyyyyyyY',
		'cbbbbbbbbbbc',
		'cbbbbbbbbbbc',
		'.kkkkkkkkkk.',
	],
	{
		C: '#d9a05a',
		c: '#b9783a',
		k: '#8a5426',
		b: '#f0d9a0',
		G: '#8fd05f',
		g: '#5aa83f',
		h: '#f08a8a',
		y: '#ffd84a',
		Y: '#f2b21c',
	},
)

/**
 * A cool rock: a geode, cracked open, purple crystals inside it, one
 * glinting. 10 by 9.
 */
export const coolRock = letterArt(
	[
		'......w...',
		'..RRRRR.w.',
		'.RRrrrrRr.',
		'RrrpPPprrd',
		'RrpPqqPprd',
		'rrpqPwqprd',
		'rrPpqqppdd',
		'.rdpppddd.',
		'..dddddd..',
	],
	{
		R: '#a19d97',
		r: '#7d7a76',
		d: '#575450',
		P: '#d6b0ff',
		p: '#9a5ad8',
		q: '#6a34a8',
		w: '#ffffff',
	},
)

/**
 * Cave pickles: a glass jar of gherkins in brine, its lid gold, left to
 * pickle in the dark. 9 by 12.
 */
export const cavePickles = letterArt(
	[
		'.LLLLLLL.',
		'.lllllll.',
		'..ggggg..',
		'.gbbbbbg.',
		'wbPbbPbbx',
		'wbpbPpbbx',
		'wbpbppPbx',
		'wPpbppbbx',
		'wppbpbPbx',
		'wppbpbpbx',
		'.bbbbbbx.',
		'..xxxxx..',
	],
	{
		L: '#f0c64a',
		l: '#b8862a',
		g: '#e6f2ea',
		w: '#f2fbf6',
		b: '#c9d77a',
		x: '#a3b85a',
		p: '#4f7f24',
		P: '#7fb33f',
	},
)
