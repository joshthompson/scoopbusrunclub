import { letterArt } from './pixelArt'

/**
 * City Rooftop's fika, drawn in code: what's had up on a roof at sunset.
 * A box of popcorn, a mojito, and a bottle of Dobry Cola.
 */

/** A striped box of popcorn, red and white, heaped up over its top. 10 by 12. */
export const popcorn = letterArt(
	[
		'...wWw....',
		'.wwywwWw..',
		'wWwwwywwW.',
		'wywWwwwyww',
		'rbrbrbrbrd',
		'rbrbrbrbrd',
		'.rbrbrbrd.',
		'.rbrbrbrd.',
		'.rbrbrbrd.',
		'.rbrbrbrd.',
		'..rbrbrd..',
		'..dddddd..',
	],
	{
		w: '#fffbe8',
		W: '#e8d9a8',
		y: '#ffe07a',
		r: '#d8262a',
		b: '#fbf6ea',
		d: '#a81c20',
	},
)

/**
 * A mojito in a tall glass: a wedge of lime on its rim, mint leaves and
 * ice in it, a pink straw. 9 by 13.
 */
export const mojito = letterArt(
	[
		'......ss.',
		'.....s...',
		'YY..s....',
		'yxxxsxxx.',
		'.gMmslix.',
		'.gmMsiix.',
		'.glmsllx.',
		'.gilllmx.',
		'.gllilmx.',
		'.gMllllx.',
		'.gllllix.',
		'.gggxxxx.',
		'..xxxxx..',
	],
	{
		s: '#ff5a7a',
		Y: '#d6f27a',
		y: '#9ad43a',
		x: '#b9d6cf',
		g: '#f2fbf8',
		l: '#d7f0b0',
		m: '#2f9b4a',
		M: '#5fd06f',
		i: '#ffffff',
	},
)

/**
 * A bottle of Dobry Cola, ice cold: dark glass, a silver cap, a red label
 * with a white swoosh across it. 7 by 14.
 */
export const dobryCola = letterArt(
	[
		'..sss..',
		'..kKk..',
		'..kKk..',
		'.kkKkk.',
		'kkkKkkk',
		'rrrrrww',
		'rrwwwrr',
		'wwrrrrr',
		'kkKkkkk',
		'.kKkkk.',
		'.kKkkk.',
		'kkKkkkk',
		'kkKkkkk',
		'.kkkkk.',
	],
	{
		s: '#c9ccd0',
		k: '#3a1a0e',
		K: '#7a4a2a',
		r: '#d8262a',
		w: '#fbf6ea',
	},
)
