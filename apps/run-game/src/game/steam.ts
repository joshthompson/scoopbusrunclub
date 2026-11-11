/**
 * Steam Vents: grates in the ground that puff the moment anyone steps on
 * one, runner or Pacer, firing them up into the air. When one last puffed
 * is kept on it (its `flown`), the same on every screen.
 */

/** How hard it fires whoever's on it upwards: up onto a roof. */
export const STEAM_LAUNCH = 14
/** How far either side of its middle it fires anyone up. */
export const STEAM_REACH = 20
/** How long its puff of steam is seen for. */
const STEAM_PUFF = 34

/** How far through its last puff a vent is, out of 1, if it's still puffing. */
export const steamPuff = (puffed: number | undefined, ticks: number) =>
	puffed !== undefined && ticks >= puffed && ticks - puffed < STEAM_PUFF
		? (ticks - puffed) / STEAM_PUFF
		: undefined

/**
 * A Giant Vent, a sewer's way out: how hard it fires whoever's on it up,
 * right up out of the ground, and on, and how far either side of its
 * middle it does.
 */
export const GIANT_LAUNCH = 27
export const GIANT_PUSH = 7
export const GIANT_REACH = 90

/** How far either side of a vent's middle it fires anyone up, and how hard, up and on. */
export const steamFires = (vent: { giant?: boolean }) =>
	vent.giant
		? { reach: GIANT_REACH, up: GIANT_LAUNCH, on: GIANT_PUSH }
		: { reach: STEAM_REACH, up: STEAM_LAUNCH, on: 0 }
