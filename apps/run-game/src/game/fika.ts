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
	| 'candyCorn'
	| 'toffeeApple'
	| 'spiderCupcake'

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
	'candyCorn',
	'toffeeApple',
	'coffee',
	'spiderCupcake',
	'chokladboll',
]

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
	candyCorn: { width: 8 * CELL, height: 10 * CELL },
	toffeeApple: { width: 10 * CELL, height: 10 * CELL },
	spiderCupcake: { width: 12 * CELL, height: 10 * CELL },
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
	candyCorn: 'Candy corn!',
	toffeeApple: 'Toffee apple!',
	spiderCupcake: 'Spider cupcake!',
}
