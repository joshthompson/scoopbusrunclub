/**
 * Alphabet: collecting a parkrun whose name starts with each letter.
 *
 * The card is A–Z with X removed (no parkrun name starts with X), so 25 slots.
 * First letters are diacritic-stripped before matching, so Ö and Ō → O, Å/Ä → A,
 * etc. — matching the "Ö counts as O" rule.
 */

// A–Z excluding X.
export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWYZ'.split('')
export const ALPHABET_SLOTS = ALPHABET.length // 25

/**
 * Map an event name's first character to its Alphabet slot index, or -1
 * if it isn't one of the 25 letters (e.g. X, a digit, or empty).
 */
export function firstLetterSlot(name: string): number {
	const first = name.trim().charAt(0)
	if (!first) return -1
	const base = first
		.normalize('NFD') // decompose accented letters, e.g. Ö → O + combining mark
		.replace(/\p{M}/gu, '') // strip the combining marks → Ö/Ō→O, Å/Ä→A
		.toUpperCase()
	return ALPHABET.indexOf(base)
}
