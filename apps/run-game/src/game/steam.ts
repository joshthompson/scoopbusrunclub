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
