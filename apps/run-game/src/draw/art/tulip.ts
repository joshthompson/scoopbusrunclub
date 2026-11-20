import { letterArt } from '../../courses/kit/pixelArt'
import {
	TULIPS,
	TULIP_COLOURS,
	TULIP_GREENS,
	TULIP_PATH_SHADE,
} from '../../courses/kit/tulipScenery'

/**
 * A tulip growing up out of the path, in Potato Rain, in four stages, each
 * 9 by 18 cells, its stem in the middle of its bottom row, in a little
 * heap of turned earth: a shoot, two leaves just up; a sprout, its green
 * bud on a stem; a bud, closed, its colour showing; and in flower, a cup
 * of three petals, lit at the top left, ready to pick. In each of the
 * tulip field's colours.
 */
const SHOOT = [
	'.........',
	'.........',
	'.........',
	'.........',
	'.........',
	'.........',
	'.........',
	'.........',
	'.........',
	'.........',
	'.........',
	'.........',
	'.........',
	'...k.k...',
	'..lk.kd..',
	'..lkgkd..',
	'...lgd...',
	'.mmmgmmm.',
]
const SPROUT = [
	'.........',
	'.........',
	'.........',
	'.........',
	'.........',
	'....k....',
	'...kld...',
	'....g....',
	'....g....',
	'....g..k.',
	'.k..g.kd.',
	'.lk.gkd..',
	'..lkgd...',
	'...lg....',
	'....g....',
	'....g....',
	'....g....',
	'.mmmgmmm.',
]
const BUD = [
	'.........',
	'.........',
	'.........',
	'...LBS...',
	'...LBS...',
	'...LBS...',
	'....B....',
	'....g....',
	'....g....',
	'....g..k.',
	'.k..g.kd.',
	'.lk.gkd..',
	'..lkgd...',
	'...lg....',
	'....g....',
	'....g....',
	'....g....',
	'.mmmgmmm.',
]
const FLOWER = [
	'.L..B..S.',
	'.LL.B.SS.',
	'.LLBBBSS.',
	'.LLBBBBS.',
	'.LBBBBBS.',
	'..LBBBS..',
	'...BBS...',
	'....g....',
	'....g....',
	'....g..k.',
	'.k..g.kd.',
	'.lk.gkd..',
	'..lkgd...',
	'...lg....',
	'....g....',
	'....g....',
	'....g....',
	'.mmmgmmm.',
]

/** One cell on screen: 2 px. */
const CELL = 2
export const TULIP_WIDTH = 9 * CELL
export const TULIP_HEIGHT = 18 * CELL

/** The four stages, in order: shoot, sprout, bud, in flower. */
export type TulipStage = 0 | 1 | 2 | 3

/** Each colour's tulip, at each stage: `TULIP_ART[colour][stage]`. */
export const TULIP_ART = TULIP_COLOURS.map((colour) => {
	const [base, lit, shade] = TULIPS[colour]
	const colours = {
		L: lit,
		B: base,
		S: shade,
		g: TULIP_GREENS.stem,
		k: TULIP_GREENS.lit,
		l: TULIP_GREENS.leaf,
		d: TULIP_GREENS.dark,
		m: TULIP_PATH_SHADE,
	}
	return [SHOOT, SPROUT, BUD, FLOWER].map((rows) => letterArt(rows, colours))
})
