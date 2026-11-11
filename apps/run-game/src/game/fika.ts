/** The fika on the course, which speeds you up (drawn by `FikaArt`). */
export type FikaItem =
	| 'coffee'
	| 'kanelbulle'
	| 'chokladboll'
	| 'prinsesstarta'
	/** Gamla Stan's own, on top of the usual round of them. */
	| 'kardemummabulle'
	| 'semla'
	| 'dammsugare'
	/** Machu Picchu's, not in the usual round of them: a can of Inca Cola. */
	| 'incaCola'
	/** The Pyramids'. */
	| 'falafel'
	| 'knafeh'
	| 'koshary'
	/** The Great Wall's. */
	| 'dumplings'
	| 'bubbleTea'
	| 'mooncake'
	/** Halloween Town's. */
	| 'candyfloss'
	| 'toffeeApple'
	| 'spiderCupcake'
	/** Furby Fields': sweets, and a tiny furby, to keep. */
	| 'tinyFurby'
	| 'lollipop'
	| 'rainbowCake'
	/** The Sewers': not fika, but what's been lost down the drains. */
	| 'rubberDuck'
	| 'goldRing'
	| 'oldCoin'
	| 'lostPhone'
	/** Scoop Cruises': off the buffet, out of the tax-free, and in Turku, from its bakeries. */
	| 'kladdkaka'
	| 'lingondricka'
	| 'pickAndMix'
	| 'salmiakki'
	| 'karelianPie'
	/** Not fika at all: up on Scoop Cruises' roof, a captain's hat. */
	| 'captainsHat'

export const FIKA_ITEMS: FikaItem[] = [
	'coffee',
	'kanelbulle',
	'chokladboll',
	'prinsesstarta',
]

/** Gamla Stan's, from its old cafés: the usual round, and more besides. */
export const GAMLA_STAN_FIKA: FikaItem[] = [
	'coffee',
	'semla',
	'kanelbulle',
	'dammsugare',
	'kardemummabulle',
	'chokladboll',
	'prinsesstarta',
]

/** The Pyramids', from Cairo's street food and sweet shops, and a coffee and a bun. */
export const PYRAMIDS_FIKA: FikaItem[] = [
	'falafel',
	'coffee',
	'knafeh',
	'koshary',
	'kanelbulle',
]

/** The Great Wall's: dim sum, tea and mooncakes, and a coffee and a bun. */
export const GREAT_WALL_FIKA: FikaItem[] = [
	'dumplings',
	'bubbleTea',
	'coffee',
	'mooncake',
	'kanelbulle',
]

/** Halloween Town's: sweets, a toffee apple, and a chokladboll and a coffee. */
export const HALLOWEEN_FIKA: FikaItem[] = [
	'candyfloss',
	'toffeeApple',
	'coffee',
	'spiderCupcake',
	'chokladboll',
]

/** Furby Fields': a tiny furby of your own, and sweets, candyfloss among them. */
export const FURBY_FIKA: FikaItem[] = [
	'tinyFurby',
	'lollipop',
	'candyfloss',
	'rainbowCake',
]

/**
 * The Sewers': no fika down there, but what's been lost down the drains,
 * found, and just as good for a bit of speed.
 */
export const SEWER_FINDS: FikaItem[] = [
	'rubberDuck',
	'goldRing',
	'oldCoin',
	'lostPhone',
]

/** On the ferry: the buffet's, the tax-free shop's, and a coffee and a bun. */
export const FERRY_FIKA: FikaItem[] = [
	'kladdkaka',
	'pickAndMix',
	'coffee',
	'lingondricka',
	'salmiakki',
	'kanelbulle',
]

/** In Turku: a Karelian pie, a coffee, salmiakki. */
export const TURKU_FIKA: FikaItem[] = ['karelianPie', 'coffee', 'salmiakki']

/** A cell's size, in screen pixels. */
const CELL = 2

/** Each item's size on the screen: its art, in cells twice the size of a screen pixel. */
export const FIKA_SIZE: Record<FikaItem, { width: number; height: number }> = {
	coffee: { width: 12 * CELL, height: 11 * CELL },
	kanelbulle: { width: 12 * CELL, height: 9 * CELL },
	chokladboll: { width: 9 * CELL, height: 9 * CELL },
	prinsesstarta: { width: 12 * CELL, height: 11 * CELL },
	kardemummabulle: { width: 12 * CELL, height: 9 * CELL },
	semla: { width: 12 * CELL, height: 11 * CELL },
	dammsugare: { width: 14 * CELL, height: 7 * CELL },
	incaCola: { width: 8 * CELL, height: 13 * CELL },
	falafel: { width: 12 * CELL, height: 10 * CELL },
	knafeh: { width: 12 * CELL, height: 9 * CELL },
	koshary: { width: 10 * CELL, height: 11 * CELL },
	dumplings: { width: 13 * CELL, height: 9 * CELL },
	bubbleTea: { width: 9 * CELL, height: 12 * CELL },
	mooncake: { width: 11 * CELL, height: 9 * CELL },
	candyfloss: { width: 10 * CELL, height: 14 * CELL },
	toffeeApple: { width: 10 * CELL, height: 10 * CELL },
	spiderCupcake: { width: 12 * CELL, height: 10 * CELL },
	tinyFurby: { width: 9 * CELL, height: 10 * CELL },
	lollipop: { width: 8 * CELL, height: 14 * CELL },
	rainbowCake: { width: 11 * CELL, height: 10 * CELL },
	rubberDuck: { width: 11 * CELL, height: 10 * CELL },
	goldRing: { width: 9 * CELL, height: 9 * CELL },
	oldCoin: { width: 9 * CELL, height: 9 * CELL },
	lostPhone: { width: 7 * CELL, height: 12 * CELL },
	kladdkaka: { width: 12 * CELL, height: 8 * CELL },
	lingondricka: { width: 8 * CELL, height: 12 * CELL },
	pickAndMix: { width: 9 * CELL, height: 12 * CELL },
	salmiakki: { width: 10 * CELL, height: 9 * CELL },
	karelianPie: { width: 12 * CELL, height: 7 * CELL },
	captainsHat: { width: 12 * CELL, height: 8 * CELL },
}

/** What's said, having it: "Fika!", or the drink's name. */
export const FIKA_WORD: Partial<Record<FikaItem, string>> = {
	incaCola: 'Inca Cola!',
	falafel: 'Falafel!',
	knafeh: 'Knafeh!',
	koshary: 'Koshary!',
	dumplings: 'Dumplings!',
	bubbleTea: 'Bubble tea!',
	mooncake: 'Mooncake!',
	candyfloss: 'Candyfloss!',
	toffeeApple: 'Toffee apple!',
	spiderCupcake: 'Spider cupcake!',
	tinyFurby: 'A tiny furby!',
	lollipop: 'Lollipop!',
	rainbowCake: 'Rainbow cake!',
	rubberDuck: 'Rubber duck!',
	goldRing: 'A gold ring!',
	oldCoin: 'An old coin!',
	lostPhone: 'A lost phone!',
	kladdkaka: 'Kladdkaka!',
	lingondricka: 'Lingondricka!',
	pickAndMix: 'Lösgodis!',
	salmiakki: 'Salmiakki!',
	karelianPie: 'Karjalanpiirakka!',
	captainsHat: 'Aye aye, Captain!',
}
