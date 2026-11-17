import { letterArt } from './pixelArt'

/**
 * The Cliff's fika, drawn in code: up in the sky, a strawberry with wings
 * and a piece of bubble gum; and on the island, cloudberries.
 */

/** A flying strawberry: red, its seeds yellow, its leaves on top, a white wing either side. 12 by 8. */
export const flyingStrawberry = letterArt(
	[
		'.....Gg.....',
		'...gGggGg...',
		'Ww.RRrrrd.wW',
		'wwwRyrrydwww',
		'.WWrryrrdWW.',
		'...rrrydd...',
		'....ryrd....',
		'.....dd.....',
	],
	{
		G: '#7fd05a',
		g: '#3f9a3a',
		R: '#ff6a6a',
		r: '#e8283a',
		d: '#a8182a',
		y: '#ffe07a',
		w: '#ffffff',
		W: '#d8e6f0',
	},
)

/** A piece of bubble gum, pink, in a wrapper twisted at both ends, a blue stripe on it. 12 by 6. */
export const bubbleGum = letterArt(
	[
		'ww..PPPP..ww',
		'wWwPppppdwWw',
		'.wWbbbbbdWw.',
		'.wWpppppdWw.',
		'wWwpppppdwWw',
		'ww..dddd..ww',
	],
	{
		w: '#ffffff',
		W: '#cfd8e0',
		P: '#ffc6e0',
		p: '#ff8fc2',
		d: '#e0609a',
		b: '#6bc4ff',
	},
)

/**
 * Cloudberries, hjortron: a golden-orange berry, bumpy all over, its
 * sepals on top and a leaf off its stalk. 9 by 9.
 */
export const cloudberries = letterArt(
	[
		'....n....',
		'...Gnggg.',
		'.gGgggGg.',
		'..OoOoo..',
		'.OoOoOod.',
		'.oOoOood.',
		'.OoOoodd.',
		'..ooodd..',
		'...ddd...',
	],
	{
		n: '#6a4a2a',
		G: '#8fcf5a',
		g: '#5f9a3a',
		O: '#ffc46a',
		o: '#f29a2e',
		d: '#c46a14',
	},
)
