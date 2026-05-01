// ---------- Passenger Pickup Mode Constants ----------
// All tunable values for Passenger Pickup mode.
// Adjust these to change game feel without touching logic.

/** Number of passenger NPCs spawned in the level */
export const PASSENGER_PICKUP_COUNT = 25;

/** Initial countdown timer in seconds */
export const PASSENGER_PICKUP_INITIAL_TIME = 90;

/** Starting seconds added per delivery (first dropoff) */
export const PASSENGER_PICKUP_DROPOFF_BONUS_START = 15;

/** Amount the bonus decreases per delivery */
export const PASSENGER_PICKUP_DROPOFF_BONUS_DECAY = 1;

/** Minimum bonus per delivery (floor) */
export const PASSENGER_PICKUP_DROPOFF_BONUS_MIN = 2;

/** Minimum world distance between spawn and delivery target (metres) */
export const PASSENGER_PICKUP_TARGET_DIST_MIN = 200;

/** Maximum world distance between spawn and delivery target (metres) */
export const PASSENGER_PICKUP_TARGET_DIST_MAX = 400;

/** Minimum world distance from delivery point for respawn (metres) */
export const PASSENGER_PICKUP_RESPAWN_MIN_DIST = 500;

/** Radius within which a delivery is triggered (metres) */
export const PASSENGER_PICKUP_DELIVERY_RADIUS = 10;

/** Cooldown before respawn after delivery (seconds) */
export const PASSENGER_PICKUP_COOLDOWN = 10;

/** Speed at which the delivered passenger runs to the flag (m/s) */
export const PASSENGER_PICKUP_RUN_SPEED = 6;

/** Scoop distance — how close the bus must be to pick up a passenger (metres) */
export const PASSENGER_PICKUP_SCOOP_DISTANCE = 5;
