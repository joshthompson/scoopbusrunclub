import { DEPTH_SLANT } from './constants'

/**
 * A guard tower over a wall's walkway: how big it is, and where its
 * doorways go through it. Its front is `TOWER_WIDTH` across, centred on
 * where it stands; its side goes back from its right edge, `DEPTH_SLANT`
 * further along. The walkway goes in one side and out the other, through
 * doorways `TOWER_DOOR` high.
 */
export const TOWER_WIDTH = 130
export const TOWER_HEIGHT = 230
export const TOWER_MERLON = 10
/**
 * How high its doorways are, at their sides: high enough for the bus to
 * drive through. They're arched, a little higher in the middle.
 */
export const TOWER_DOOR = 150
/** How much higher the arch is over the middle of them. */
export const TOWER_ARCH = 16
/** Its pixels: the arch is drawn in steps this big. */
export const TOWER_PIXEL = 4

/** From where its left side is, to where its right side goes back to. */
export const towerSpan = (x: number) => ({
	left: x - TOWER_WIDTH / 2,
	right: x + TOWER_WIDTH / 2 + DEPTH_SLANT,
})
