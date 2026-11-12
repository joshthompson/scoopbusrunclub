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
 * How far along a line straight back across the path leans, from its near
 * edge to its far one: the slant everything going back into the scene is
 * drawn at, the start and finish banners, buildings' sides.
 */
export const DEPTH_SLANT = 56
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
/** How much harder going up a hill pulls back than going down one pushes on: for everyone, the bus too. */
export const UPHILL_HARDER = 1.4
/**
 * How much of its speed a hill takes off the bus going up it, for its slope:
 * as much as it takes off a runner, so up a pyramid it's half its speed too.
 */
export const BUS_HILL_PULL = 1.45

/** A hill's pull, for its `slope`: harder going up. */
export const hillPull = (slope: number) =>
	slope < 0 ? slope * UPHILL_HARDER : slope
export const MAX_SPEED = 12
/**
 * The top speed in a multiplayer Round instead, boosts and all: much lower,
 * so a few boosts at once can't take one Player so far ahead that the bus
 * scoops everyone else off the back of the screen.
 */
export const ROUND_MAX_SPEED = 8
/** How fast anyone can go: lower in a multiplayer Round. */
export const topSpeed = (world: { round: boolean }) =>
	world.round ? ROUND_MAX_SPEED : MAX_SPEED
export const JUMP_SPEED = 9.5
/**
 * How fast they're still going up, at most, once they let go of jump: a tap
 * is a hop, held is the whole jump.
 */
export const JUMP_CUT = 2
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
/** A parkrun's barcode token: the last boost, and a big one. */
export const BARCODE_BOOST = 6
/** How far before a parkrun's finish its barcode token is, and how high, to run straight through. */
export const BARCODE_BEFORE = 320
export const BARCODE_HEIGHT = 22
/** Its art's size: 24 by 13 cells, twice the size of a screen pixel. */
export const BARCODE_WIDTH = 48
export const BARCODE_TALL = 26

// --- Points: one a metre, and these on top ----------------------------------
export const FIKA_POINTS = 100
export const BARCODE_POINTS = 250
/**
 * Finishing, points for every tick quicker round than the bus would be at
 * its own pace: 120 a second.
 */
export const SPEED_POINTS = 2
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
/** How long one sits on your head before hopping off. */
export const FURBY_RIDE_TICKS = 35
/**
 * Landed on, you're squashed: half your height, and slower, this long, till
 * you spring back up.
 */
export const FURBY_SQUASH_TICKS = 180
export const SQUASHED = 0.5
export const SQUASHED_TOP_SPEED = 3.6

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
/**
 * How hard a Ride leaps, up off the ground with you on its back: a little
 * higher than you jump.
 */
export const RIDE_LEAP = 10.5

// --- The Cliff: gliders and Rings ------------------------------------------
/**
 * On a glider: cruising as fast as the bus's top speed, so it's the Rings
 * that get you away from it; quicker diving, slower climbing, and how
 * quickly it gets to that.
 */
export const GLIDER_SPEED = 7
export const GLIDER_DIVE = 1.6
/**
 * Boosted past that, by a Ring, how quickly it bleeds back down: much
 * quicker than running, so a Ring's a burst, not a lead.
 */
export const GLIDER_BOOST_GRIP = 0.025
/** Holding right on one, this much faster; left, this much slower. */
export const GLIDER_PUSH = 1.6
export const GLIDER_BRAKE = 2.5
export const GLIDER_CLIMB_DRAG = 1.2
export const GLIDER_GRIP = 0.03
/**
 * How fast it climbs or dives, held, and how quickly it answers; and how
 * fast it sinks, left to it.
 */
export const GLIDER_CLIMB = 4.5
export const GLIDER_STEER = 0.12
export const GLIDER_SINK = 0.5
/** How far over the Ground a glider keeps, at least: its rider's feet. Not over the sea. */
export const GLIDER_CLEARANCE = 46
/** Into something on one: down to this speed, and knocked this much down. */
export const GLIDER_KNOCK_SPEED = 2.5
export const GLIDER_KNOCK_DROP = 3
/** How far over a glider's rider's head its wing is, to fly into things. */
export const GLIDER_WING = 16
/** Through a Ring: this much faster, and these points. */
export const RING_BOOST = 1.8
export const RING_POINTS = 50

// --- The Slopes: skis, snowboards, tricks and rails ---------------------------
/**
 * On skis: how hard a slope pulls them down it, and how much of their speed
 * the snow takes off each tick, so they settle at a speed for its steepness;
 * less, tucked down, holding down on the snow.
 */
export const SKI_PULL = 0.45
export const SKI_DRAG = 0.01
export const SKI_TUCK_DRAG = 0.006
/**
 * Tucked down, how much faster than anyone else can go they can: 1.5 px a
 * tick, or in a multiplayer Round, where top speed's lower, a little.
 */
export const SKI_TUCK_OVER = 1.5
export const SKI_TUCK_OVER_ROUND = 0.5
/** Holding right, poling along: this much faster a tick, up to this. */
export const SKI_PUSH = 0.07
export const SKI_PUSH_TO = 6.5
/**
 * Tapping down, going slowly, a push off the poles, or off a back foot on
 * a snowboard: this much faster, up to `SKI_PUSH_TO`.
 */
export const SKI_POLE_PUSH = 1.4
/** Holding left, snowploughing: this much of their speed kept a tick. */
export const SKI_BRAKE = 0.95
/**
 * How far the snow can drop away under them, more than they'd fall
 * anyway, before they're off it, in the air: off a kicker's lip, or over
 * the top of a bump at speed.
 */
export const SKI_LAUNCH_GIVE = 1.2
/** How much of the speed they're going up a kicker goes into a jump off it. */
export const SKI_POP = 0.8
/** How fast, upwards, anything can launch them, at most. */
export const SKI_LAUNCH_MAX = 15
/**
 * Off the ski jump's lip, a jump's only a pop, as a ski jumper's is: timed
 * right at the lip, enough to fly to its K-point, but no further.
 */
export const SKI_JUMP_POP = 3
/** How far up its inrun and table, before its lip, a jump's only a pop. */
export const SKI_JUMP_TABLE = 640
/**
 * A trick: points for the first in one go in the air, doubling for each
 * more before landing, up to the most; and this much faster for each.
 */
export const TRICK_POINTS = 100
export const TRICK_POINTS_MAX = 1600
export const TRICK_BOOST = 1.2
/** Landing in the middle of one: a wipeout, slowed to this share of their speed, and down this long. */
export const WIPEOUT_KEEP = 0.3
export const WIPEOUT_TICKS = 50
/** How much of a trick can be left to do and still land it: the last few ticks of it. */
export const TRICK_LAND_GIVE = 7
/** A grind: points for it, and a few more for every tick of it, up to the most. */
export const GRIND_POINTS = 50
export const GRIND_POINTS_TICK = 3
export const GRIND_POINTS_MAX = 500
/** How much less the snow takes off them grinding: a rail's slick. */
export const GRIND_DRAG = 0.004
/** Through a slalom gate: this much faster, and these points. */
export const GATE_BOOST = 1
export const GATE_POINTS = 25
/** Off the ski jump: these points a metre flown, and a bonus past its K-point. */
export const SKI_JUMP_POINTS_M = 4
export const SKI_JUMP_K_BONUS = 200
export const SKI_JUMP_POINTS_MAX = 1200

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
/**
 * In a multiplayer Round, longer: 450 m. It's the leader that pulls the
 * bus along, so this is how far behind them anyone can be before it's got
 * them.
 */
export const ROUND_BUS_LEASH_MAX = 1800
/** How much the leash lengthens a tick at the end of it, up to `BUS_LEASH_FULL`, and just past it. */
export const BUS_LEASH_GROWTH = 3
export const BUS_LEASH_LATE_GROWTH = 0.6

// --- Countdown ----------------------------------------------------------
/** How long each of "3", "2", "1" and "Go!" is said for. */
export const COUNTDOWN_STEP_TICKS = 50

// --- Halloween Town ----------------------------------------------------------
/** A Pumpkin's boost, and how much faster than top speed wearing one keeps you. */
export const PUMPKIN_BOOST = 2
export const PUMPKIN_SPEED = 1.5
export const PUMPKIN_POINTS = 100
/** How tall a Mummy is, to run into: jump it. */
export const MUMMY_HEIGHT = 50
/** How fast Zombies walk towards you. */
export const ZOMBIE_SPEED = 0.7
