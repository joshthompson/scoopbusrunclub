import { letterArt } from './pixelArt'

/**
 * Huddinge's fika, drawn in code: what's had on a picnic deep in the
 * forest. A cake in a can, wild berries off the bushes along the path,
 * a chanterelle, and one bad mushroom.
 */

/**
 * A cake in a can: a tin, its lid peeled back and stood up behind it, a
 * chocolate sponge domed up out of the top, a red label round it with a
 * picture of the cake on a white band. 10 by 12.
 */
export const cakeInACan = letterArt(
	[
		'........Ts',
		'..CCCC..Ts',
		'.CCccCC.T.',
		'CcccccccT.',
		'TTTTTTTS..',
		'LrrrrrrD..',
		'LwwwwwwD..',
		'LwkkkwwD..',
		'LwwwwwwD..',
		'LrrrrrrD..',
		'LrrrrrrD..',
		'SSSSSSSS..',
	],
	{
		C: '#9c6536',
		c: '#7a4a26',
		k: '#5b3418',
		T: '#e3e6e8',
		s: '#b5bbbf',
		S: '#9aa1a6',
		L: '#e2554c',
		r: '#c8322b',
		D: '#9e2420',
		w: '#f3efe4',
	},
)

/**
 * Wild berries on a sprig: two blueberries, dusty blue, and a lingonberry,
 * red, between them, hanging off a twig with its leaves. 12 by 10.
 */
export const berries = letterArt(
	[
		'...Gg..gG...',
		'..Ggg..ggG..',
		'gg...nn...gg',
		'.nnnnnnnnnn.',
		'..n...n...n.',
		'.Bb...n..Bb.',
		'BbbdRrr.Bbbd',
		'bbddRrrdbbdd',
		'.dd.rrdd.dd.',
		'.....dd.....',
	],
	{
		G: '#6cbf4f',
		g: '#3f8a3a',
		n: '#6a4a2a',
		B: '#7f92d8',
		b: '#3b4a9c',
		d: '#26306a',
		R: '#ff6a6a',
		r: '#d0202e',
	},
)

/**
 * Chanterelles, kantareller, the forest's gold: two of them, a big one and
 * a little one, their caps funnels, wavy round their rims, their ridges
 * running down into their stems, on a tuft of moss. 10 by 9.
 */
export const mushroom = letterArt(
	[
		'.YY.Y.....',
		'YyyYyY....',
		'yyyyyo.YyY',
		'.gggo.yyyo',
		'..ggo..go.',
		'..gyo..yo.',
		'..yyo..yo.',
		'.yyyoo.yo.',
		'mMmmmmmmmm',
	],
	{
		Y: '#ffcf6a',
		y: '#f5a623',
		o: '#c47a12',
		g: '#e0901c',
		m: '#3f7a2e',
		M: '#5f9f3a',
	},
)

/**
 * A bad mushroom: a fly agaric, flugsvamp, its cap red with white spots,
 * a skirt round its white stem. Eaten, the whole screen goes funny for a
 * moment (see `TRIP_TICKS`). 10 by 11.
 */
export const badMushroom = letterArt(
	[
		'...RRRR...',
		'.RRRwRrrr.',
		'RRwwrrrwrr',
		'rrrrrrwwrd',
		'rwrrrrrrdd',
		'.dddddddd.',
		'...wwwW...',
		'..WWwwWW..',
		'...wwwW...',
		'...wwwW...',
		'..wwwwWW..',
	],
	{
		R: '#ff5a4a',
		r: '#d8262a',
		d: '#9e1a1e',
		w: '#fbf6ea',
		W: '#d8cfbb',
	},
)
