import { pixelArt } from './pixelArt'

/**
 * Scoop Cruises' fika, drawn in code, all of it vegan or easily made
 * so: off the buffet, out of the tax-free shop, and in Turku, from a
 * Finnish bakery.
 */

/** Kladdkaka, a slice of it, sticky, on a plate, cream and a raspberry on top: 12 by 8. */
export const kladdkaka = pixelArt(12, 8, [
	[0, 6, 12, 1, '#f3f1ea'],
	[1, 7, 10, 1, '#c9ced0'],
	[1, 2, 10, 4, '#4a2a1a'],
	[1, 2, 10, 1, '#6a3e26'],
	[2, 5, 8, 1, '#3a1e12'],
	[4, 0, 4, 2, '#ffffff'],
	[5, 0, 2, 1, '#d42f4a'],
	[9, 3, 1, 1, '#6a3e26'],
])

/** A glass of lingondricka, lingonberry juice, deep red, a berry on its rim: 8 by 12. */
export const lingondricka = pixelArt(8, 12, [
	[0, 2, 8, 1, '#d6ecf0'],
	[0, 3, 1, 8, '#d6ecf0'],
	[7, 3, 1, 8, '#d6ecf0'],
	[1, 4, 6, 7, '#b0142e'],
	[1, 4, 6, 1, '#d8344e'],
	[2, 5, 1, 4, '#d8344e'],
	[1, 11, 6, 1, '#d6ecf0'],
	[5, 0, 2, 2, '#c8213a'],
	[6, 0, 1, 1, '#e8475a'],
])

/** A bag of pick-and-mix, from the tax-free shop: sweets showing through it. 9 by 12. */
export const pickAndMix = pixelArt(9, 12, [
	[2, 0, 5, 2, '#f3f1ea'],
	[3, 1, 3, 1, '#c8312b'],
	[1, 2, 7, 10, '#e9eef0'],
	[0, 4, 1, 7, '#d0d8dc'],
	[8, 4, 1, 7, '#d0d8dc'],
	[2, 4, 2, 2, '#ff4fa0'],
	[5, 5, 2, 2, '#ffd23a'],
	[3, 7, 2, 2, '#5fd68a'],
	[5, 8, 2, 2, '#1e1e1e'],
	[2, 9, 2, 2, '#4fb3ff'],
	[6, 3, 1, 1, '#c8312b'],
])

/** Salmiakki, salty liquorice diamonds, black, in their box: 10 by 9. */
export const salmiakki = pixelArt(10, 9, [
	[0, 3, 10, 6, '#1f3f8a'],
	[0, 3, 10, 1, '#3f63b3'],
	[1, 5, 8, 3, '#f3f1ea'],
	[2, 0, 2, 1, '#1e1e1e'],
	[1, 1, 4, 1, '#1e1e1e'],
	[2, 2, 2, 1, '#1e1e1e'],
	[6, 0, 2, 1, '#1e1e1e'],
	[5, 1, 4, 1, '#1e1e1e'],
	[6, 2, 2, 1, '#1e1e1e'],
	[2, 6, 1, 1, '#1e1e1e'],
	[4, 6, 1, 1, '#1e1e1e'],
	[6, 6, 1, 1, '#1e1e1e'],
	[2, 1, 1, 1, '#5a5f66'],
])

/** A Karelian pie, its rye crust crimped round its rice, egg butter on it: 12 by 7. */
export const karelianPie = pixelArt(12, 7, [
	[1, 1, 10, 5, '#a8743e'],
	[0, 2, 12, 3, '#a8743e'],
	[2, 2, 8, 3, '#f3e8c8'],
	[3, 2, 6, 1, '#fff6dc'],
	[4, 3, 3, 1, '#ffe07a'],
	...[1, 3, 5, 7, 9].map((x): [number, number, number, number, string] => [
		x,
		1,
		1,
		1,
		'#7a5028',
	]),
	...[2, 4, 6, 8, 10].map((x): [number, number, number, number, string] => [
		x,
		5,
		1,
		1,
		'#7a5028',
	]),
])

/**
 * A captain's hat, left up on the ferry's roof: white, its peak black, a
 * gold anchor on its band. Not fika, but well worth having. 12 by 8.
 */
export const captainsHat = pixelArt(12, 8, [
	[2, 0, 8, 2, '#ffffff'],
	[1, 1, 10, 3, '#f3f1ea'],
	[1, 4, 10, 2, '#1e2328'],
	[5, 4, 2, 2, '#e2c25a'],
	[0, 6, 9, 2, '#1e2328'],
	[2, 1, 4, 1, '#ffffff'],
	[9, 6, 3, 1, '#3a4047'],
])
