import { letterArt } from './pixelArt'

/**
 * Rocket Launch's fika, each a cell to a pixel, drawn twice the size, as
 * fika is: freeze-dried astronaut ice cream in its foil packet and a tube
 * of space food, out in space; a starfruit on the planet; and in the alien
 * base, a wobbling, glowing alien jelly.
 */

/**
 * Astronaut ice cream: a freeze-dried Neapolitan slab, chocolate, vanilla
 * and strawberry, pushed half out of its torn foil packet. 12 by 12.
 */
export const astronautIceCream = letterArt(
	[
		'..KKKVVVPPP.',
		'..KKKVVVPPP.',
		'..KKkVVvPPp.',
		'..KKKVVVPPP.',
		'..kkkvvvppp.',
		'fWfWfWfWfWfW',
		'FFFFFFFFFFFF',
		'FWFFRRRRFFFf',
		'FWFFFFFFFFFf',
		'FWFFFFFFFFff',
		'FFFFFFFFFFff',
		'ffffffffffff',
	],
	{
		K: '#6b4030',
		k: '#4a2a1e',
		V: '#f4ead0',
		v: '#d4c6a2',
		P: '#f08aa4',
		p: '#c25a78',
		F: '#c4ccd6',
		f: '#8a94a4',
		W: '#f4f8fc',
		R: '#e8484a',
	},
)

/** A tube of space food, squeezed from the bottom, its cap off, a blob of orange paste at the nozzle. 8 by 14. */
export const spaceTube = letterArt(
	[
		'...OO...',
		'..OOOo..',
		'...oo...',
		'...NN...',
		'..NNNN..',
		'.WWWWWw.',
		'WBBBBBBw',
		'WBYYBBBw',
		'WBBYYBBw',
		'WBBBBBBw',
		'WWWWWWww',
		'WWWWWwww',
		'NNNNNNNN',
		'nnnnnnnn',
	],
	{
		O: '#ffa83a',
		o: '#d6761a',
		N: '#b4bcc8',
		n: '#7c8696',
		W: '#f2f4f8',
		w: '#c4cad6',
		B: '#3a6ad0',
		Y: '#ffd23a',
	},
)

/** A starfruit, sliced end on: a yellow star, green at its tips, lit from above. 12 by 12. */
export const starfruit = letterArt(
	[
		'.....gg.....',
		'....LYYY....',
		'....LYYY....',
		'gLLLYYYYYYYg',
		'.LYYYWWYYYO.',
		'..YYYWWYYO..',
		'...YYYYYYO..',
		'...YYYYYOO..',
		'..YYYYYYOOO.',
		'.LYYYY..YOOO',
		'.YYY....OOO.',
		'.gg......gg.',
	],
	{
		g: '#7ac24a',
		L: '#fff08a',
		Y: '#f2d23a',
		W: '#fffbd0',
		O: '#d99a1e',
	},
)

/** An alien jelly, green and glowing, wobbling on its plate. 12 by 11. */
export const alienJelly = letterArt(
	[
		'...hGGGGh...',
		'..GGLLGGGG..',
		'.GGLLGGGGGg.',
		'.GLGGbGGGGg.',
		'GGGGGGGGGGgg',
		'GGbGGGGGbGgg',
		'GGGGGGGGGGgg',
		'.GGGGGGGGgg.',
		'..gggggggg..',
		'wwwwwwwwwwww',
		'.WWWWWWWWWW.',
	],
	{
		h: '#9dffa030',
		G: '#6fe870',
		L: '#c8ffc0',
		g: '#3fb450',
		b: '#2f9a48',
		w: '#ffffff',
		W: '#cfd6dc',
	},
)
