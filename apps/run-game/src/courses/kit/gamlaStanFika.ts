import { pixelArt } from './pixelArt'

/**
 * Gamla Stan's own fika, a cell to a pixel, drawn twice the size, as fika
 * is: down in the tavern under the old town, a tankard of ale.
 */

const OAK_LIT = '#b47a44'
const OAK = '#8d5a2e'
const OAK_SHADE = '#5f3a1a'
const HOOP = '#3a3634'
const HOOP_LIT = '#7a736d'
const FOAM = '#fffaf0'
const FOAM_SHADE = '#e8dcc2'

/**
 * A tankard of ale, wooden, the old way: oak staves, lit down its left,
 * two iron hoops round it, a handle off its right side, and the foam
 * heaped up over its rim and running down its front. 11 by 12.
 */
export const ale = pixelArt(11, 12, [
	// The foam, heaped up over the rim.
	[2, 0, 4, 1, FOAM],
	[1, 1, 7, 1, FOAM],
	[0, 2, 9, 1, FOAM],
	[5, 1, 2, 1, FOAM_SHADE],
	[0, 3, 9, 1, FOAM_SHADE],
	// The tankard, its staves, lit down its left.
	[0, 3, 8, 9, OAK],
	[0, 3, 2, 9, OAK_LIT],
	[6, 3, 2, 9, OAK_SHADE],
	[3, 4, 1, 7, OAK_SHADE],
	// The foam running down its front.
	[1, 3, 2, 2, FOAM],
	[2, 5, 1, 1, FOAM_SHADE],
	// Its hoops.
	[0, 5, 8, 1, HOOP],
	[0, 5, 2, 1, HOOP_LIT],
	[0, 10, 8, 1, HOOP],
	[0, 10, 2, 1, HOOP_LIT],
	[1, 11, 6, 1, OAK_SHADE],
	// Its handle, off its right side.
	[8, 4, 2, 1, OAK],
	[9, 5, 2, 4, OAK],
	[10, 5, 1, 4, OAK_SHADE],
	[8, 9, 2, 1, OAK_SHADE],
])
