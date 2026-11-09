/**
 * Every number the game's feel comes from, in one place for tuning. Distances
 * are world pixels and speeds are pixels per tick, unless they say otherwise.
 */

/** The game is drawn at this size and scaled to fit the window. */
export const VIEW_WIDTH = 960
export const VIEW_HEIGHT = 540
/** 60 ticks a second. */
export const TICK_MS = 1000 / 60

// --- The course ---------------------------------------------------------
/** World pixels to a metre along the course: Haga's 5 km is 20,000 px. */
export const PX_PER_M = 4
/** Pixels to a metre of climb. More than `PX_PER_M`, so the hills look as hard as they feel. */
export const HILL_PX_PER_M = 9
/** Where the lowest point of the course is drawn. */
export const GROUND_Y = 490
/**
 * The path reaches this far back from the line everything stands on, and
 * this far forward of it: runners, rocks and the bus are down the middle of it.
 */
export const PATH_BACK = 18
export const PATH_FRONT = 18
/**
 * Grass drawn behind the path, for what's set back from it to stand on: on
 * high stretches, the scenery behind would otherwise be distant hills.
 */
export const VERGE = 24
/** Where the runner starts, and where the start line is. */
export const START_X = 200
/**
 * The runner is kept this far across the screen running right, leaving room
 * behind for the bus to show up in, and this far from the right running left.
 */
export const CAMERA_LEAD = 0.35
/**
 * Through the countdown, the runner's this far across instead, so the bus
 * parked behind everyone's in view too. On "Go!" it swings round to
 * `CAMERA_LEAD`.
 */
export const START_LEAD = 0.78
/** How quickly the camera swings round to the other side on turning, a share a tick. */
export const CAMERA_TURN = 0.04

// --- The runner ---------------------------------------------------------
/** Runner sprites are drawn at twice their pixel size, as in the header. */
export const RUNNER_SCALE = 2
/** Either way: left is as fast as right, it's just towards the bus. */
export const RUN_TOP_SPEED = 6.5
/** How quickly running closes the gap to top speed, as a share of it each tick. */
export const RUN_GRIP = 0.03
/** Speed kept each tick with no key held. */
export const COAST_KEEP = 0.97
/** Speed kept each tick while ducking: a slide, so it barely slows. */
export const SLIDE_KEEP = 0.996
/** How strongly a slope speeds you up or slows you down. Doubled while sliding downhill. */
export const HILL_PULL = 0.3
export const MAX_SPEED = 12
export const JUMP_SPEED = 9.5
export const GRAVITY = 0.45
/** Air control, a little either way. */
export const AIR_PUSH = 0.04
/** How tall the runner's hitbox is, standing and ducking. */
export const STAND_HEIGHT = 52
export const DUCK_HEIGHT = 28
export const HITBOX_HALF_WIDTH = 10

// --- Hazards and boosts --------------------------------------------------
export const STUMBLE_TICKS = 40
export const STUMBLE_SPEED = 1.5
export const MUD_TOP_SPEED = 2.5
export const FIKA_BOOST = 3
export const CHEER_BOOST = 2.5

// --- Points: one a metre, and these on top ----------------------------------
export const FIKA_POINTS = 100
export const CHEER_POINTS = 50
export const CORGI_POINTS = 250
/** Taken off for each hazard hit: a rock, a branch, the mud, a furby on your head. */
export const HAZARD_POINTS = 50

// --- The pack: the other runners on the path ------------------------------
/** At most this many of them about at once. */
export const PACK_SIZE = 8
/** Their easy paces, between these: all slower than you at full tilt. */
export const PACER_SLOWEST = 3
export const PACER_FASTEST = 5.4
/** Another one joins, just off the screen ahead, every this many ticks or so. */
export const PACER_EVERY_TICKS = 80
export const PACER_EVERY_SPREAD = 110
/** How many of them are someone the club knows, a member or a guest, rather than anyone at all. */
export const MEMBER_SHARE = 0.25
/** Bouncing off someone's head: as high as this, or higher holding jump. */
export const STOMP_BOUNCE = 8.5
export const STOMP_BOUNCE_HELD = 12
export const STOMP_BOOST = 2
/** Points for a head bounced off, doubling for each more before landing, up to `STOMP_POINTS_MAX`. */
export const STOMP_POINTS = 100
export const STOMP_POINTS_MAX = 1600
/** How long someone's dazed after being bounced on, plodding at `DAZED_SPEED`. */
export const DAZED_TICKS = 100
export const DAZED_SPEED = 1.2

// --- Furby Fields: furbies and corgis -------------------------------------
/** Furbies hop about the path all the time, resting this long between hops, give or take. */
export const FURBY_REST_TICKS = 20
export const FURBY_REST_SPREAD = 30
/** How hard a furby hops, upwards. */
export const FURBY_HOP = 9.5
/** How far a hop goes either way, when it isn't after anyone, and how far from home it strays. */
export const FURBY_WANDER = 2
export const FURBY_ROAM = 140
/**
 * Near enough to you, its hops are aimed at where you'll be: this much of the
 * way, and then it leans towards you in the air a little. It's a furby: not
 * very good at it.
 */
export const FURBY_SPOT = 380
export const FURBY_AIM = 0.7
export const FURBY_STEER = 0.06
export const FURBY_REACH = 6
/** How far from where it aims it can land. */
export const FURBY_AIM_ERROR = 20
/** How long one sits on your head, slowing you right down, before hopping off. */
export const FURBY_RIDE_TICKS = 35

/**
 * Geese flying over Haga, from behind: this fast, overtaking you, and this
 * high, their feet off the ground, low enough to jump into.
 */
export const GOOSE_FLY_SPEED = 8.5
export const GOOSE_ALTITUDES = [96, 120, 142]
/**
 * Jump into one and it carries you this long, at this speed, your feet this
 * high off the ground, over everything. Press down to let go.
 */
export const GOOSE_CARRY_TICKS = 150
export const GOOSE_CARRY_SPEED = 10
export const GOOSE_CARRY_HEIGHT = 120
export const GOOSE_POINTS = 250

/** Land on a corgi and you ride it this long, galloping at this speed, over everything. */
export const CORGI_RIDE_TICKS = 200
export const CORGI_GALLOP = 9
/** How quickly it gets up to a gallop. */
export const CORGI_GRIP = 0.08
/** How far up its back you sit. */
export const CORGI_SADDLE = 16
/** It barks for you to hop on when you're this near. */
export const CORGI_CALL = 320

// --- The bus ------------------------------------------------------------
/**
 * Where the front of the scoop starts: parked a way back behind everyone on
 * the start line, in view through the countdown.
 */
export const BUS_START_X = -260
/** How long the bus waits after "Go!" before setting off. */
export const BUS_HOLD_TICKS = 60
export const BUS_START_SPEED = 3.8
export const BUS_TOP_SPEED = 7
/** How long the bus takes to get up to top speed. */
export const BUS_RAMP_TICKS = 2400
/**
 * The bus's leash: it's never further behind than this, however far ahead
 * you get; it keeps up. It starts as long as the gap to it on the start line,
 * and lengthens while you're pulling away at the end of it: quickly up to
 * `BUS_LEASH_FULL`, so you get away from it off the line, then more and more
 * slowly towards `BUS_LEASH_MAX`, so going well keeps you gaining on it, a
 * little, but never with too big a lead.
 */
export const BUS_LEASH_FULL = 900
export const BUS_LEASH_MAX = 1200
/** How much the leash lengthens a tick at the end of it, up to `BUS_LEASH_FULL`, and just past it. */
export const BUS_LEASH_GROWTH = 3
export const BUS_LEASH_LATE_GROWTH = 0.6

// --- Countdown ----------------------------------------------------------
/** How long each of "3", "2", "1" and "Go!" is said for. */
export const COUNTDOWN_STEP_TICKS = 50
