import { letterArt } from './pixelArt'

/**
 * Dino Island's fika, drawn in code: in the forest, fossil pops, the
 * island's own sweet; up the volcano, a lava cake, molten in the middle;
 * and on the island, a coconut, a straw in it.
 */

/**
 * Fossil pops: lollipops, each candy curled up like an ammonite, a spiral
 * groove round it as a fossil's, in caramel, cherry and lemon, on white
 * sticks. A Dino Island sweet. 15 by 13.
 */
export const fossilPops = letterArt(
	[
		'......RRR......',
		'.....RrrRR.....',
		'.AAA.RrRrR.....',
		'AaaAARRRrR.GGG.',
		'AaAaA.RRR.GggGG',
		'AAAaA..W..GgGgG',
		'.AAA...w..GGGgG',
		'..W....W...GGG.',
		'..W....W....W..',
		'..w....w....w..',
		'..W....W....W..',
		'..W....W....W..',
		'..w....w....w..',
	],
	{
		A: '#f0a030',
		a: '#b86a18',
		R: '#e8484a',
		r: '#a82a2e',
		G: '#f2d06a',
		g: '#c09030',
		W: '#f4efe6',
		w: '#cfc6b6',
	},
)

/** A lava cake: a little chocolate fondant on a plate, split open, molten orange running out of it. 12 by 9. */
export const lavaCake = letterArt(
	[
		'....CCCC....',
		'..CCccccCC..',
		'.Cccccccccd.',
		'.CccOoOcccd.',
		'.CccoOOoccd.',
		'.ccccOoOOdd.',
		'..ddddOOoOo.',
		'wwwwwwwwwwww',
		'.WWWWWWWWWW.',
	],
	{
		C: '#7a4a2e',
		c: '#5a3220',
		d: '#3e2014',
		O: '#ffb12a',
		o: '#ff6a1a',
		w: '#ffffff',
		W: '#cfd6dc',
	},
)

/** A coconut, its top lopped off, a striped straw in it and a paper umbrella. 11 by 12. */
export const coconut = letterArt(
	[
		'......u....',
		'.....uUu...',
		'....uUuUu..',
		'...s..|....',
		'...s..|....',
		'..wwWWWWw..',
		'.BbbbbbbbB.',
		'BbbBbbbBbbd',
		'BbbbbbBbbbd',
		'.bbBbbbbbd.',
		'..bbbbbdd..',
		'....ddd....',
	],
	{
		u: '#ff6aa8',
		U: '#ffd23a',
		'|': '#e8e2d0',
		s: '#ff4a4a',
		w: '#fffaf0',
		W: '#f2ead6',
		B: '#8a5a32',
		b: '#6e4426',
		d: '#4a2c18',
	},
)
