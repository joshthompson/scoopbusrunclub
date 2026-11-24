import {
	SKATE_SKY_BOTTOM,
	SKATE_SKY_TOP,
	SKATE_WALL,
} from '../courses/kit/skateJamScenery'
import { SKATEBOARD_FLIP, SKATEBOARD_FLIP_TICKS } from '../draw/art/skateboard'
import { GRAVITY, RUNNER_SCALE, TICK_MS } from '../game/constants'
import type { Terrain } from '../game/terrain'
import type { Racer, World } from '../game/world'
import type { Controls } from '../input'
import { collect } from '../saved/collected'
import { play } from '../sfx'
import { type Arena, arenaCourse, inRandomOrder } from './arena'
import {
	FLAT_LEFT,
	FLAT_RIGHT,
	FLOOR,
	LIP_LEFT,
	LIP_RIGHT,
	LIP_Y,
	MIDDLE,
	RAIL_FROM,
	RAIL_TO,
	RAIL_Y,
	RAMP_LEFT,
	rampSlope,
	rampY,
} from './skateRamp'
import {
	IDLE,
	type Minigame,
	type MinigameFrame,
	type MinigameRun,
} from './types'

/**
 * Skate Jam: everyone on a skateboard, on a mini ramp at Fryshuset, on a
 * summer evening, Globen glowing over the rooftops. Two quarter pipes,
 * one either end, a flat bottom between them with a grind rail along it.
 *
 * Hold the way you're rolling to pump, faster down each transition, and
 * higher up the other side, till you're flying up off the coping, floaty,
 * hanging there. Up's an ollie. In the air, up's a kickflip and down a
 * heelflip, the board turning over under your feet one way or the other;
 * left or right, a grab, ducked down onto the board. Tap up or
 * down landing on the flat and you're into a manual, on two wheels, its
 * balance to keep with up and down. On the rail, a way pressed is another
 * grind. Landed, it's points, into your combo, more for more of them in
 * the one air. Keep landing tricks, grinds and manuals, and the combo
 * keeps going, each another ×1 on it, till five of them bank it, ×5; go
 * too long without one, and it's banked as it is. Come down with the
 * board upside down, or tip a manual over, or have someone come
 * down on your head, and it's a wipeout: the combo not yet banked, gone.
 *
 * The last 15 seconds are double points. After a minute, the most points
 * wins, and the winner rolls down onto the flat and dances, on their board.
 */

/** How long it goes on: a minute. */
export const SKATE_TICKS = Math.round(60_000 / TICK_MS)
/** The last 15 seconds: double points. */
const DOUBLE_TICKS = Math.round(15_000 / TICK_MS)
/** How long "Double points!" is up, big. */
const ANNOUNCED_FOR = 100

// --- The ramp ------------------------------------------------------------------

/** The ramp, as the engine sees it (see `skateRamp`): no further than it need be. */
const terrain: Terrain = {
	length: 2000,
	finishX: MIDDLE + 2000,
	groundY: rampY,
	slope: rampSlope,
	gaps: [],
	inGap: () => false,
	walls: [],
}

const ARENA: Arena = {
	left: RAMP_LEFT,
	cameraY: 0,
	walls: { left: LIP_LEFT, right: LIP_RIGHT },
}

// --- Skating ---------------------------------------------------------------------

/** How much speed rolling keeps, a tick; and how hard braking (holding back) slows them. */
const ROLL_KEEP = 0.998
const BRAKE_KEEP = 0.95
/**
 * Pumping, holding the way they're rolling, on a transition: how much
 * faster, a little anywhere on it, more the steeper, and twice that going
 * down it.
 */
const PUMP = 0.22
const PUMP_FLAT = 0.35
/** Pushing along the flat: up to how fast, and how quickly. */
const PUSH_TOP = 9
const PUSH_GRIP = 0.1
/** The fastest anyone can go: about the coping's height again, in the air over it. */
const TOP_SPEED = 18
/** How hard an ollie pops them up off the ramp. */
const OLLIE = 7.4
/**
 * In the air, floaty: gravity this much of everyone else's, and what's
 * kept of the speed up off the ramp, so they hang there longer but go
 * only a little higher. Their speed up's put back, landing, so nothing's
 * lost to the ramp.
 */
const AIR_GRAVITY = GRAVITY * 0.6
const LIFT = 0.85
/** In the air, they settle level with the ramp under them, this many degrees a tick. */
const SETTLE = 5
/** How long a grab's held, left or right pressed: ducked down onto the board. */
const GRAB_TICKS = 16
/** Flying up off the coping: how fast they drift back in over the ramp, so they come down on it. */
const DRIFT_IN = 0.55
/** How tall someone stands on their board, for heads. */
const TALL = 29 * RUNNER_SCALE
/** How long a wipeout lasts, and what they keep of their speed each tick of it, sliding; and how long after it nobody can come down on their head. */
const WIPEOUT_TICKS = 55
const SAFE_TICKS = 90
const WIPEOUT_KEEP = 0.95
/**
 * A kickflip or heelflip, landed: counted, if it's this near done, the
 * board all but the right way up; or begun only this long ago, too late,
 * not a trick at all, but a manual, on the flat, the board caught on its
 * wheels. Between the two, the board's upside down, and it's a bail.
 */
const LAND_GIVE = 8
const LATE_TICKS = 6
/**
 * A manual: up or down tapped landing, or this soon after, on the flat,
 * on the back wheels or the front. Its balance, -1 to 1, tips away from
 * level, a little at random, more the further over it is and the longer
 * it's gone on; up and down push it back. Past either end, a bail.
 */
const MANUAL_WINDOW = 8
const MANUAL_TIPS = 0.004
const MANUAL_WOBBLE = 0.006
const MANUAL_WORSENS = 240
const MANUAL_PUSH = 0.0045
const MANUAL_KEEP = 0.94
/** How far a manual tips the board up, in degrees, and more as it's off balance. */
const MANUAL_LEAN = 12
const MANUAL_SWAY = 8
/** How close, across, they have to come down over someone's head, and how high off it they bounce. */
const HEAD_REACH = 14
const HEAD_BOUNCE = 8.5

// --- Points ----------------------------------------------------------------------

/**
 * The tricks: in the air, up a kickflip, down a heelflip, the board
 * turning over under their feet one way or the other; left or right, a
 * grab, an Indy the way they face, a Melon behind.
 */
export type SkateTrick = 'kickflip' | 'heelflip' | 'indy' | 'melon'
const SKATE_TRICKS: SkateTrick[] = ['kickflip', 'heelflip', 'indy', 'melon']
/** How long a kickflip or heelflip takes, in ticks: the board's four frames of turning over (`SKATEBOARD_FLIP`). */
const FLIP_TICKS = SKATEBOARD_FLIP.length * SKATEBOARD_FLIP_TICKS
/** A heelflip's frames: a kickflip's, the other way round, the right way up last. */
const HEELFLIP_FRAMES = [2, 1, 0, 3]
/** What each trick's worth, landed. */
const TRICK_POINTS: Record<SkateTrick, number> = {
	kickflip: 100,
	heelflip: 100,
	indy: 60,
	melon: 60,
}
/** What each's called, landed. */
const TRICK_NAMES: Record<SkateTrick, string> = {
	kickflip: 'kickflip',
	heelflip: 'heelflip',
	indy: 'Indy grab',
	melon: 'Melon grab',
}
/**
 * The grinds: a 50-50, landed on the rail; then a way pressed on it, a
 * Nosegrind the way they're going, a 5-0 back, a Boardslide down, each new
 * one worth more and another on the combo. They all look the same.
 */
const GRINDS = ['50-50', 'Nosegrind', '5-0', 'Boardslide']
/** A grind: points a tick, on the rail; and for each new one, switched to. */
const GRIND_POINTS = 4
const GRIND_SWITCH_POINTS = 100
/** A manual: points a tick, in it. */
const MANUAL_POINTS = 5
/** A head bounce. */
const BOUNCE_POINTS = 100
/**
 * How long after landing a trick another has to be under way, for the
 * combo to go on; and how many landings make a whole combo, banked there
 * and then, and a fresh one begun.
 */
export const COMBO_TICKS = 150
const COMBO_MOST = 5

/** Someone on their board. */
export interface Skater {
	x: number
	/** Their feet, on the ramp, or in the air. */
	y: number
	/** Rolling along the ramp: how fast, along it (right's positive). In the air, `vx` and `vy`. */
	v: number
	vx: number
	vy: number
	air: boolean
	/** How they're turned in the air, in degrees: as the ramp was, taking off, then turned by left and right held, and settling level. */
	airTilt: number
	/** Which way they face: the way they're rolling. */
	facing: 1 | -1
	/** On the rail: grinding it, since when; which grind it is now (its place in `GRINDS`), and how many they've done on it. */
	grind?: number
	grindKind: number
	grinds: number
	/** The board turning over under them, a kickflip or a heelflip, and how far into it. */
	trick?: SkateTrick
	trickTicks: number
	/** Tricks done in this air. */
	tricks: SkateTrick[]
	/** Ducked down onto the board in a grab, till when, by the world's ticks. */
	grabUntil: number
	/** When they last came down onto the ramp, by the world's ticks: for a manual, tapped just after. */
	downAt: number
	/** In a manual: since when, on the nose or the tail, and its balance (-1 to 1) and how fast it's tipping. */
	manual?: { at: number; nose: boolean; balance: number; tipping: number }
	/** Ticks left of a wipeout; and after it, of nobody coming down on their head. */
	wipeout: number
	safe: number
	/** Points banked, and the combo going: its points, how many times it's multiplied, and when last a trick was landed. */
	score: number
	pot: number
	combo: number
	landedAt: number
	/** The ways held last tick, for a press to be a new one. */
	was: Controls
	/** Won, and rolled down onto the flat: dancing, on their board. */
	dancing: boolean
}

/** What's to be drawn of a game of Skate Jam. */
export interface SkateShow {
	skaters: Map<string, Skater>
}
const shows = new WeakMap<World, SkateShow>()
/** `world`'s game of Skate Jam, for drawing, if it's one. */
export const skateOf = (world: World) => shows.get(world)

export const skateJam: Minigame = {
	id: 'skate-jam',
	name: 'Skate Jam',
	tagline: 'Kickflips for points',
	blurb:
		'Pump the ramp and fly off the coping! In the air, up kickflips, down heelflips, left or right grabs. Tap up or down landing to manual, and press a way on the rail to switch grinds. Keep landing them for a bigger combo. Most points after a minute wins!',
	tune: 'midnattsloppet:rock',
	collectables: ['ride:skateboard'],
	course: {
		...arenaCourse(
			'skate-jam',
			'Skate Jam',
			'Pump the mini ramp, land tricks, keep the combo going. Most points wins!',
			// Fryshuset's skatepark on a summer evening: Globen over the
			// rooftops, a graffiti wall, floodlights (see `draw/skateJam`). The
			// ramp's its own, so no Ground.
			{
				palette: {
					'--sky-blue-top': SKATE_SKY_TOP,
					'--sky-blue-bottom': SKATE_SKY_BOTTOM,
					'--grass-green': SKATE_WALL,
				},
				far: [],
				near: [],
				horizonTrees: false,
				ground: [],
			},
		),
		terrain,
	},
	arena: ARENA,
	start: startSkateJam,
}

/** Which way `x` is from the middle: -1 the left quarter pipe's side. */
const sideOf = (x: number) => (x < MIDDLE ? -1 : 1)
/** How steep the ramp is at `x`, as an angle, in radians: positive, going down to the right. */
const angleAt = (x: number) => Math.atan(rampSlope(x))

/** What a run of tricks in one air is called, skateboarders' way: two kickflips a double kickflip. */
export function skateName(tricks: SkateTrick[]) {
	const names: string[] = []
	let i = 0
	while (i < tricks.length) {
		const kind = tricks[i]
		let n = 1
		while (tricks[i + n] === kind) n++
		i += n
		const times =
			n === 1 ? '' : n === 2 ? 'Double ' : n === 3 ? 'Triple ' : `${n}× `
		names.push(`${times}${TRICK_NAMES[kind]}`)
	}
	const said = names.join(' + ')
	return said.charAt(0).toUpperCase() + said.slice(1)
}

/** A whole number of points, as they're said, the Swedish way: "1 250". */
export const pointsSaid = (n: number) =>
	String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

function startSkateJam(world: World): MinigameRun {
	const { racers } = world
	const skaters = new Map<string, Skater>()
	const show: SkateShow = { skaters }
	shows.set(world, show)
	// Found, by playing it: not by watching its preview.
	if (!world.preview) collect('ride:skateboard')
	const solo = racers.length === 1

	// Everyone on their board along the flat and up the bottom of each
	// transition, in no particular order, facing the middle.
	const span = FLAT_RIGHT + 120 - (FLAT_LEFT - 120)
	inRandomOrder(racers).forEach((racer, i) => {
		const x = Math.round(FLAT_LEFT - 120 + (span * (i + 0.5)) / racers.length)
		skaters.set(racer.id, {
			x,
			y: rampY(x),
			v: 0,
			vx: 0,
			vy: 0,
			air: false,
			airTilt: 0,
			facing: x < MIDDLE ? 1 : -1,
			trickTicks: 0,
			tricks: [],
			grindKind: 0,
			grinds: 0,
			grabUntil: Number.NEGATIVE_INFINITY,
			downAt: Number.NEGATIVE_INFINITY,
			wipeout: 0,
			safe: 0,
			score: 0,
			pot: 0,
			combo: 0,
			landedAt: Number.NEGATIVE_INFINITY,
			was: { ...IDLE },
			dancing: false,
		})
	})
	const skaterOf = (racer: Racer) => skaters.get(racer.id) as Skater

	const ticksLeft = () => Math.max(0, SKATE_TICKS - world.raceTicks())
	const doubled = () => world.raceTicks() >= SKATE_TICKS - DOUBLE_TICKS
	/** Everything they've scored, banked or not. */
	const total = (s: Skater) => s.score + s.pot * Math.max(1, s.combo)
	const over = () => !!world.order()

	/** Points onto the combo: doubled at the end. */
	function score(s: Skater, points: number) {
		const worth = points * (doubled() ? 2 : 1)
		s.pot += worth
		return worth
	}

	/** Another landing in the combo: one more on it, and a whole one banked. */
	function landed(s: Skater) {
		s.combo++
		s.landedAt = world.ticks()
		if (s.combo < COMBO_MOST) return
		world.popup(`Combo ×${s.combo}!`, s.x, s.y - TALL - 70)
		play('cheer')
		bank(s)
	}

	/** The combo banked: its points times how many landings it was. */
	function bank(s: Skater) {
		if (s.pot <= 0) {
			s.combo = 0
			return
		}
		const banked = s.pot * Math.max(1, s.combo)
		s.score += banked
		if (s.combo > 1) world.popup(`+${pointsSaid(banked)}`, s.x, s.y - TALL - 50)
		s.pot = 0
		s.combo = 0
	}

	function wipeout(s: Skater, why: string) {
		if (s.wipeout > 0) return
		s.wipeout = WIPEOUT_TICKS
		s.trick = undefined
		s.trickTicks = 0
		s.tricks = []
		s.grind = undefined
		s.manual = undefined
		s.grabUntil = Number.NEGATIVE_INFINITY
		const lost = s.pot > 0
		s.pot = 0
		s.combo = 0
		play('stumble')
		world.popup(lost ? `${why} Combo lost` : why, s.x, s.y - TALL - 10)
	}

	/**
	 * Down from the air onto the ramp or the rail: landed, if the board's
	 * the right way up, their tricks counted, and a manual begun, if they
	 * tapped up or down too late for a flip, on the flat. False, if it's a
	 * bail.
	 */
	function touchDown(s: Skater, flat: boolean) {
		const now = world.ticks()
		// The board: turned all but over, counted; only just begun, caught,
		// and a manual, if it can be; upside down, a bail.
		let manual: boolean | undefined
		if (s.trick) {
			if (s.trickTicks >= FLIP_TICKS - LAND_GIVE) s.tricks.push(s.trick)
			else if (s.trickTicks < LATE_TICKS) {
				if (flat) manual = s.trick === 'heelflip'
			} else {
				wipeout(s, 'Bailed!')
				return false
			}
		}
		s.trick = undefined
		s.trickTicks = 0
		s.grabUntil = Number.NEGATIVE_INFINITY
		s.downAt = now
		landTricks(s)
		if (manual !== undefined) startManual(s, manual)
		return true
	}

	/** Down on the ramp from the air: the tricks landed, or a wipeout. */
	function land(s: Skater) {
		const a = angleAt(s.x)
		s.y = rampY(s.x)
		s.air = false
		// All their speed along the ramp, that way: off the coping and down
		// again, as fast as they went up, what the floatiness took put back.
		s.v = s.vx * Math.cos(a) + (s.vy / LIFT) * Math.sin(a)
		if (s.wipeout > 0) return
		touchDown(s, rampSlope(s.x) === 0)
	}

	/** The tricks done in the air, landed: onto the combo, each more in the one air worth more. */
	function landTricks(s: Skater) {
		const tricks = s.tricks
		s.tricks = []
		if (!tricks.length) return
		const base = tricks.reduce((sum, t) => sum + TRICK_POINTS[t], 0)
		const worth = score(s, base * tricks.length)
		world.popup(
			`${skateName(tricks)}! +${pointsSaid(worth)}`,
			s.x,
			s.y - TALL - 30,
		)
		play('trick')
		landed(s)
	}

	/** Into a manual, on the nose or the tail: tipping a little, the way it went down. */
	function startManual(s: Skater, nose: boolean) {
		s.manual = {
			at: world.ticks(),
			nose,
			balance: 0,
			tipping: (Math.random() - 0.5) * 0.02,
		}
		s.landedAt = world.ticks()
		play('scan')
	}

	/** Out of a manual, kept: its points, and another on the combo. */
	function endManual(s: Skater) {
		const m = s.manual
		if (!m) return
		s.manual = undefined
		const worth = score(s, (world.ticks() - m.at) * MANUAL_POINTS)
		world.popup(
			`${m.nose ? 'Nose manual' : 'Manual'}! +${pointsSaid(worth)}`,
			s.x,
			s.y - TALL - 30,
		)
		play('trick')
		landed(s)
	}

	/** A tick of a manual: its balance tipping, up and down pushing it back; over, a bail. */
	function balance(s: Skater, held: Controls) {
		const m = s.manual
		if (!m) return
		const worse = 1 + (world.ticks() - m.at) / MANUAL_WORSENS
		m.tipping +=
			(m.balance * MANUAL_TIPS + (Math.random() - 0.5) * MANUAL_WOBBLE) * worse
		if (held.up) m.tipping += MANUAL_PUSH
		if (held.down) m.tipping -= MANUAL_PUSH
		m.tipping *= MANUAL_KEEP
		m.balance += m.tipping
		// The combo kept going, as long as they're up on it.
		s.landedAt = world.ticks()
		if (Math.abs(m.balance) >= 1) wipeout(s, 'Bailed!')
	}

	/** Off the ground: their speed along the ramp, and up off it as hard as `pop`. */
	function takeOff(s: Skater, pop: number) {
		const a = angleAt(s.x)
		s.air = true
		s.airTilt = (a * 180) / Math.PI
		s.vx = s.v * Math.cos(a) + pop * Math.sin(a)
		s.vy = (s.v * Math.sin(a) - pop * Math.cos(a)) * LIFT
	}

	/** Which grind a way pressed on the rail is, if any: forwards a Nosegrind, back a 5-0, down a Boardslide. */
	function grindPressed(s: Skater, pressed: (way: keyof Controls) => boolean) {
		const forward: keyof Controls = s.v > 0 ? 'right' : 'left'
		const back: keyof Controls = s.v > 0 ? 'left' : 'right'
		if (pressed(forward)) return 1
		if (pressed(back)) return 2
		if (pressed('down')) return 3
		return undefined
	}

	/** A tick of someone on their board, holding `held`. */
	function skate(s: Skater, held: Controls) {
		const pressed = (way: keyof Controls) => held[way] && !s.was[way]
		const now = world.ticks()
		if (s.wipeout > 0) {
			s.wipeout--
			if (s.wipeout === 0) s.safe = SAFE_TICKS
		} else if (s.safe > 0) s.safe--
		const wiped = s.wipeout > 0
		const drive = wiped ? 0 : Number(held.right) - Number(held.left)

		if (s.dancing) return
		if (s.grind !== undefined) {
			// On the rail: along it, sparks flying, till its end, or an ollie
			// off; a way pressed, another grind.
			s.x += s.v
			s.v *= 0.996
			s.y = RAIL_Y
			const next = grindPressed(s, pressed)
			if (next !== undefined && next !== s.grindKind) {
				s.grindKind = next
				s.grinds++
				const worth = score(s, GRIND_SWITCH_POINTS)
				world.popup(
					`${GRINDS[next]}! +${pointsSaid(worth)}`,
					s.x,
					s.y - TALL - 30,
				)
				play('grind')
				landed(s)
			}
			const ground = s.x < RAIL_FROM || s.x > RAIL_TO
			if (ground || pressed('up')) {
				const ticks = now - s.grind
				s.grind = undefined
				const worth = score(s, ticks * GRIND_POINTS)
				world.popup(
					`${GRINDS[s.grindKind]}${s.grinds > 1 ? ' combo' : ' grind'}! +${pointsSaid(worth)}`,
					s.x,
					s.y - TALL - 30,
				)
				play('trick')
				landed(s)
				s.air = true
				s.airTilt = 0
				s.vx = s.v
				s.vy = ground ? 0 : -OLLIE * LIFT
			}
		} else if (!s.air) {
			const slope = rampSlope(s.x)
			const a = Math.atan(slope)
			// Down the ramp, gathering speed; up it, losing it.
			s.v += GRAVITY * Math.sin(a)
			s.v *= ROLL_KEEP
			const steep = Math.abs(slope) > 0.06
			if (wiped) s.v *= WIPEOUT_KEEP
			else if (drive && Math.abs(s.v) > 0.4 && drive !== Math.sign(s.v))
				s.v *= BRAKE_KEEP
			else if (drive && steep)
				// Pumping, on a transition: faster, and faster still going down it.
				s.v +=
					drive *
					PUMP *
					(PUMP_FLAT + Math.abs(Math.sin(a))) *
					(Math.sign(slope) === Math.sign(s.v) ? 2 : 1)
			else if (drive && !steep && s.v * drive < PUSH_TOP)
				// Pushing along the flat.
				s.v += (drive * PUSH_TOP - s.v) * PUSH_GRIP
			s.v = Math.max(-TOP_SPEED, Math.min(TOP_SPEED, s.v))
			s.x += s.v * Math.cos(a)
			if (Math.abs(s.v) > 0.8) s.facing = s.v > 0 ? 1 : -1
			else if (drive) s.facing = drive > 0 ? 1 : -1
			// A manual: kept balanced; done, kept, rolling into a transition or
			// to a stop.
			if (s.manual) {
				balance(s, held)
				if (s.manual && (steep || Math.abs(s.v) < 1)) endManual(s)
			} else if (
				!wiped &&
				!steep &&
				now - s.downAt <= MANUAL_WINDOW &&
				(pressed('up') || pressed('down'))
			)
				// Up or down tapped just down on the flat: a manual, not an ollie.
				startManual(s, pressed('down'))
			// Up off the coping: into the air, straight up, drifting back in.
			if (s.x <= LIP_LEFT || s.x >= LIP_RIGHT) {
				const side = sideOf(s.x)
				if (s.manual) endManual(s)
				s.x = side < 0 ? LIP_LEFT + 1 : LIP_RIGHT - 1
				s.air = true
				s.airTilt = side * -70
				s.vx = -side * DRIFT_IN
				s.vy = -Math.abs(s.v) * Math.sin(Math.abs(angleAt(s.x))) * LIFT
				s.y = LIP_Y
			} else {
				s.y = rampY(s.x)
				if (!wiped && !s.manual && pressed('up') && now - s.downAt > 0) {
					takeOff(s, OLLIE)
					play('jump')
				}
			}
		} else {
			// In the air: up a kickflip, down a heelflip, one at a time.
			if (!wiped && !s.trick) {
				const kind: SkateTrick | undefined = pressed('up')
					? 'kickflip'
					: pressed('down')
						? 'heelflip'
						: undefined
				if (kind) {
					s.trick = kind
					s.trickTicks = 0
					play('whoosh')
				}
			}
			if (s.trick) {
				s.trickTicks++
				// Over, and the right way up: another to land, and on to the
				// next, if pressed.
				if (s.trickTicks >= FLIP_TICKS) {
					s.tricks.push(s.trick)
					s.trick = undefined
					s.trickTicks = 0
				}
			}
			// Left or right, pressed here in the air, not just still held from
			// pumping: a grab, ducked down onto the board, unless they're in
			// one already.
			const grab = pressed('right') ? 1 : pressed('left') ? -1 : 0
			if (!wiped && grab && now >= s.grabUntil) {
				s.tricks.push(grab === s.facing ? 'indy' : 'melon')
				s.grabUntil = now + GRAB_TICKS
				play('whoosh')
			}
			// Settling level with the ramp under them.
			const under = (angleAt(s.x) * 180) / Math.PI
			s.airTilt += Math.max(-SETTLE, Math.min(SETTLE, under - s.airTilt))
			const wasY = s.y
			s.vy += AIR_GRAVITY
			s.x += s.vx
			s.y += s.vy
			// Never out over a deck: back in over the ramp.
			if (s.x < LIP_LEFT + 2) {
				s.x = LIP_LEFT + 2
				s.vx = Math.abs(s.vx)
			} else if (s.x > LIP_RIGHT - 2) {
				s.x = LIP_RIGHT - 2
				s.vx = -Math.abs(s.vx)
			}
			// Coming down on the rail: grinding it, landed level, or a bail.
			if (
				s.vy > 0 &&
				wasY <= RAIL_Y &&
				s.y >= RAIL_Y &&
				s.x > RAIL_FROM &&
				s.x < RAIL_TO &&
				!wiped
			) {
				s.y = RAIL_Y
				if (touchDown(s, false)) {
					s.air = false
					s.grind = now
					s.grindKind = 0
					s.grinds = 1
					const way = Math.sign(s.vx) || s.facing
					s.v = way * Math.max(3.5, Math.abs(s.vx))
					s.facing = way > 0 ? 1 : -1
					play('grind')
				}
			}
			if (s.air && s.vy > 0 && s.y >= rampY(s.x)) land(s)
		}
		s.was = { ...held }
		// Too long since a trick: the combo banked, once they're down.
		if (!s.air && s.grind === undefined && now - s.landedAt > COMBO_TICKS)
			bank(s)
	}

	/** Coming down on someone's head: off it, and them wiped out. */
	function heads(list: Skater[], wasY: Map<Skater, number>) {
		for (const s of list) {
			if (!s.air || s.vy <= 1 || s.wipeout > 0) continue
			for (const o of list) {
				if (o === s || o.wipeout > 0 || o.safe > 0) continue
				if (Math.abs(o.x - s.x) > HEAD_REACH) continue
				const head = o.y - TALL
				const from = wasY.get(s) ?? s.y
				if (s.y < head || from > head + 4) continue
				s.y = head
				s.vy = -HEAD_BOUNCE * LIFT
				const worth = score(s, BOUNCE_POINTS)
				s.landedAt = world.ticks()
				s.combo = Math.max(1, s.combo)
				world.popup(`Head bounce! +${pointsSaid(worth)}`, s.x, head - 30)
				play('stomp')
				wipeout(o, 'Bonk!')
				break
			}
		}
	}

	/** Their body put where they are on their board, for drawing and the rest. */
	function place(racer: Racer, s: Skater) {
		const b = racer.body
		b.held = 2
		// On the ground, as the engine sees it: no falling, and no bouncing
		// on heads but ours.
		b.grounded = true
		b.vx = 0
		b.vy = 0
		b.x = s.x
		b.feetY = s.y
		b.facing = s.facing
		const won = s.dancing
		b.celebrating = won
		if (won) {
			// Dancing, still stood on their board, level on the flat.
			b.skate = { turn: 0, across: 1, crouched: false }
			b.feetY = rampY(s.x)
			return
		}
		const ground = s.grind !== undefined ? 0 : (angleAt(s.x) * 180) / Math.PI
		const base = s.air ? s.airTilt : ground
		const now = world.ticks()
		const grabbing = now < s.grabUntil
		// A manual: the board tipped up on its back wheels, or down on its
		// front, swaying as its balance does.
		const m = s.manual
		const manual = m
			? -s.facing * ((m.nose ? -1 : 1) * MANUAL_LEAN + m.balance * MANUAL_SWAY)
			: 0
		const frame = Math.min(
			SKATEBOARD_FLIP.length - 1,
			Math.floor(s.trickTicks / SKATEBOARD_FLIP_TICKS),
		)
		b.skate = {
			turn:
				s.wipeout > 0
					? base + 80 * s.facing
					: base + manual + (grabbing ? -14 * s.facing : 0),
			across: 1,
			crouched: s.wipeout > 0 || !!s.trick || grabbing,
			flip:
				s.wipeout > 0 || !s.trick
					? undefined
					: s.trick === 'heelflip'
						? HEELFLIP_FRAMES[frame]
						: frame,
		}
	}

	/** Over: the minute's up. Everything not yet banked, banked. */
	function decide() {
		if (over() || ticksLeft() > 0) return
		for (const s of skaters.values()) {
			s.tricks = []
			s.trick = undefined
			bank(s)
		}
		const order = [...racers].sort(
			(a, b) => skaterOf(b).score - skaterOf(a).score,
		)
		world.setOrder(order)
		world.decidedAt = world.ticks()
		const winner = skaterOf(order[0])
		world.popup(
			solo
				? `${pointsSaid(winner.score)} points!`
				: `${order[0].runner.name} wins!`,
			winner.x,
			winner.y - TALL - 70,
		)
		play('finished')
	}

	/** Won: rolled down onto the flat first, then off their board and dancing. */
	const done = (racer: Racer) => skaterOf(racer).dancing

	// --- The bots ------------------------------------------------------------------
	const skills = new Map<string, number>()
	const skillOf = (racer: Racer) => {
		let skill = skills.get(racer.id)
		if (skill === undefined) {
			skill = 0.15 + Math.random() * 0.55
			skills.set(racer.id, skill)
		}
		return skill
	}
	/**
	 * What each bot's at in the air: the key it's holding for a trick, and
	 * till when; how wrong it's judging how long it's got, this air, decided
	 * as it takes off; and how many tricks it's done in it.
	 */
	const plans = new Map<
		string,
		{
			press?: keyof Controls
			until: number
			misjudged: number
			done: number
		}
	>()

	/** How long till `s` is down again, as things are, about: on the rail, if it's under them. */
	const airLeft = (s: Skater) => {
		const overRail = s.x > RAIL_FROM - 40 && s.x < RAIL_TO + 40 && s.y < RAIL_Y
		const drop = (overRail ? RAIL_Y : rampY(s.x)) - s.y
		return (
			(-s.vy + Math.sqrt(Math.max(0, s.vy ** 2 + 2 * AIR_GRAVITY * drop))) /
			AIR_GRAVITY
		)
	}
	function bot(racer: Racer): Controls {
		if (over()) return IDLE
		const s = skaterOf(racer)
		const skill = skillOf(racer)
		const now = world.ticks()
		const press = (way: keyof Controls) => ({ ...IDLE, [way]: true })
		if (s.air) {
			let plan = plans.get(racer.id)
			if (!plan) {
				// Off the ground: how well it's judging it, this time. Now and
				// then, badly.
				plan = {
					until: now + 3,
					misjudged:
						(Math.random() - 0.5) * 8 * (1 - skill) +
						(Math.random() < 0.4 * (1 - skill) ? 14 : 0),
					done: 0,
				}
				plans.set(racer.id, plan)
			}
			// Holding a trick's key, as long as it means to; then let go, a
			// tick at least, so the next press is a new one.
			if (plan.press) {
				if (now < plan.until) return press(plan.press)
				// A breather, before the next: longer, the worse it is.
				plan.press = undefined
				plan.until = now + 8 + Math.round((1 - skill) * 16)
			}
			if (now < plan.until || s.trick || s.wipeout > 0) return IDLE
			const left = airLeft(s) + plan.misjudged
			const hold = (way: keyof Controls, ticks: number) => {
				plan.done++
				plan.press = way
				plan.until = now + ticks
				return press(way)
			}
			// Coming down on the flat any moment: a tap, too late for a flip,
			// for a manual.
			if (
				left < LATE_TICKS - 1 &&
				rampSlope(s.x) === 0 &&
				Math.random() < 0.08 * skill
			)
				return hold(Math.random() < 0.7 ? 'up' : 'down', 2)
			// A trick, if there's time for one, as it judges it: mostly
			// kickflips and heelflips, or a grab; one an air, two the better ones.
			if (plan.done >= (skill > 0.5 ? 2 : 1)) return IDLE
			if (Math.random() > 0.03 + skill * 0.09) return IDLE
			const roll = Math.random()
			if (roll < 0.8 && left > FLIP_TICKS - LAND_GIVE + 3)
				return hold(Math.random() < 0.6 ? 'up' : 'down', 2)
			if (left > 10 && now >= s.grabUntil)
				return hold(Math.random() < 0.5 ? 'left' : 'right', 2)
			return IDLE
		}
		plans.delete(racer.id)
		if (s.wipeout > 0) return IDLE
		if (s.grind !== undefined) {
			// Switching grinds now and then.
			if (
				!s.was.left &&
				!s.was.right &&
				!s.was.down &&
				Math.random() < 0.05 * skill
			) {
				const ways: (keyof Controls)[] = ['left', 'right', 'down']
				return press(ways[Math.floor(Math.random() * ways.length)])
			}
			return IDLE
		}
		// On the ramp: pumping, holding the way they're rolling, or pushing
		// off, from still, the way they're facing.
		const way = Math.abs(s.v) > 0.6 ? Math.sign(s.v) : s.facing
		const pumping = Math.random() < 0.8 + skill * 0.2
		const m = s.manual
		if (m) {
			// In a manual: pushing back against where it's tipping, seen a
			// little late, and now and then not at all.
			const ahead = m.balance + m.tipping * (6 + (1 - skill) * 8)
			const lapse = Math.random() < (1 - skill) * 0.35
			return {
				left: way < 0,
				right: way > 0,
				up: !lapse && ahead < -0.15,
				down: !lapse && ahead > 0.15,
			}
		}
		// Ollying onto the rail, rolling towards it along the flat, now and then.
		const toRail = way > 0 ? RAIL_FROM - s.x : s.x - RAIL_TO
		const flat = rampSlope(s.x) === 0
		const ollie =
			flat &&
			now - s.downAt > MANUAL_WINDOW &&
			toRail > 10 &&
			toRail < 10 + Math.abs(s.v) * 4 &&
			Math.abs(s.v) > 3 &&
			Math.random() < 0.06 * skill
		return {
			left: pumping && way < 0,
			right: pumping && way > 0,
			up: ollie,
			down: false,
		}
	}

	const run: MinigameRun = {
		id: 'skate-jam',
		ticksLeft,
		chip: (racer) => pointsSaid(total(skaterOf(racer))),
		score: (racer) => total(skaterOf(racer)),
		note: (racer) => {
			return `${pointsSaid(skaterOf(racer).score)} points`
		},
		timeNote: (racer) =>
			over() ? `${pointsSaid(skaterOf(racer).score)} points` : undefined,
		done,
		out: () => false,
		announce: () => {
			if (over()) return undefined
			const into = world.raceTicks() - (SKATE_TICKS - DOUBLE_TICKS)
			return into >= 0 && into < ANNOUNCED_FOR ? 'Double points!' : undefined
		},
		bot,
		step() {
			if (world.phase() !== 'running') {
				for (const racer of racers) place(racer, skaterOf(racer))
				return
			}
			const wasY = new Map<Skater, number>()
			for (const racer of racers) {
				const s = skaterOf(racer)
				wasY.set(s, s.y)
				const held = over() ? IDLE : racer.controls()
				skate(s, held)
			}
			if (!over()) heads([...skaters.values()], wasY)
			decide()
			// The winner, once they're down on the flat: stopped, and dancing on their board.
			const winner = world.order()?.[0]
			if (winner) {
				const s = skaterOf(winner)
				if (!s.air && s.grind === undefined && rampSlope(s.x) === 0) {
					s.dancing = true
					s.v = 0
				}
			}
			for (const racer of racers) place(racer, skaterOf(racer))
		},
		frame(): MinigameFrame {
			return {
				skaters: racers.map((r) => {
					const s = skaterOf(r)
					return [
						Math.round(s.x * 10) / 10,
						Math.round(s.y * 10) / 10,
						s.air ? 1 : 0,
						Math.round(s.airTilt),
						s.facing,
						s.trick ? SKATE_TRICKS.indexOf(s.trick) : -1,
						s.trickTicks,
						s.wipeout,
						s.grind ?? -1,
						Math.round(s.score),
						Math.round(s.pot),
						s.combo,
						s.landedAt,
						s.dancing ? 1 : 0,
						Number.isFinite(s.grabUntil) ? s.grabUntil : -1,
						s.manual ? Math.round(s.manual.balance * 100) : -999,
						s.manual?.nose ? 1 : 0,
					]
				}),
			}
		},
		apply(a, b, share) {
			const mix = (from: number, to: number) => from + (to - from) * share
			racers.forEach((racer, i) => {
				const from = a.skaters?.[i]
				if (!from) return
				const to = b?.skaters?.[i] ?? from
				const s = skaterOf(racer)
				s.x = mix(from[0], to[0])
				s.y = mix(from[1], to[1])
				s.air = from[2] === 1
				s.airTilt = from[3]
				s.facing = from[4] < 0 ? -1 : 1
				s.trick = from[5] < 0 ? undefined : SKATE_TRICKS[from[5]]
				s.trickTicks = from[5] === to[5] ? mix(from[6], to[6]) : from[6]
				s.wipeout = from[7]
				s.grind = from[8] < 0 ? undefined : from[8]
				s.score = from[9]
				s.pot = from[10]
				s.combo = from[11]
				s.landedAt = from[12]
				s.dancing = from[13] === 1
				s.grabUntil = from[14] ?? -1
				s.manual =
					from[15] === undefined || from[15] === -999
						? undefined
						: {
								at: 0,
								nose: from[16] === 1,
								balance:
									mix(
										from[15],
										to[15] === undefined || to[15] === -999 ? from[15] : to[15],
									) / 100,
								tipping: 0,
							}
				place(racer, s)
			})
		},
	}
	return run
}
