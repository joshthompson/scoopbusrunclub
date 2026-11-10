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
}

/** What's said, having it: "Fika!", or the drink's name. */
export const FIKA_WORD: Partial<Record<FikaItem, string>> = {
	incaCola: 'Inca Cola!',
}
