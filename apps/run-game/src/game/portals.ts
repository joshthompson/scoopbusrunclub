import type { Portal } from '../courses/types'
import { play } from '../sfx'
import { CAMERA_LEAD, VIEW_HEIGHT, VIEW_WIDTH } from './constants'
import { CAMERA_HEADROOM } from './step'
import type { Racer, World } from './world'

/**
 * Portals: Karolinska's shrink ray, and the sneeze that blows everyone back
 * up to size (see `Portal`). Whoever gets to one is held in it, stood
 * still, till everyone still racing is too. Then it goes off, the same
 * moment for everyone, the camera diving in with them as they shrink (or
 * out, as they're sneezed out and grow), and they're let out the other
 * side as they went in: in the same order, as fast, but hardly apart (no
 * more than `MOST_APART`), so nobody first in is left waiting again the
 * other side. The bus too, as far behind the last of them as it was.
 *
 * Plain state, like the body, on the world (`portal`), so a Remote Player
 * sees the same (see `RaceFrame`'s `portal`).
 */

/** Someone in a Portal: when they got in, how fast they were going, and where they stand in it. */
export interface Held {
	at: number
	vx: number
	/**
	 * How far past its way in they'd got by the time they were held: let
	 * out that much past its way out, so the bus, put back as far behind
	 * its way out as it was behind its way in, is as far behind them as it
	 * was, not a step nearer.
	 */
	over: number
	/** Their place in it, in the order they got in: 0 in the middle, then either side. */
	slot: number
}

/** A Portal at work. */
export interface PortalRun {
	/** Which of the course's Portals. */
	index: number
	/** Who's in it, by racer id, till they're let out. */
	held: Map<string, Held>
	/** When the first of them got in. */
	firstAt: number
	/** When the last of them did, and it went off: undefined, still waiting for the rest. */
	zappedAt?: number
	/**
	 * How long after the first of them the last is let out, the other side,
	 * once it's gone off: see `MOST_APART`.
	 */
	lastOut?: number
	/** How far behind the way in the bus was as it went off. */
	busGap: number
}

/**
 * The shrink ray: it charges up, then shrinks them, the camera diving in
 * after them a moment behind, and at `SNAP` there's a flash and they're on
 * the other side, tiny. Ticks from going off.
 */
const SHRINK = { charge: 40, lag: 6, snap: 124 }
/**
 * The sneeze: "Ah... Ah..." for `snap` ticks, the nose shaking, then
 * "CHOO!", a flash, and they're blown out of the giant's nose, growing back
 * to their size as they fly, over `flight` ticks, down onto the floor.
 */
const SNEEZE = { snap: 84, flight: 64 }
/**
 * The sneeze, in the dark: down the Slide into the hole it's in, the
 * screen goes black this quick; and "CHOO!", out of it into the sneeze,
 * this slowly. In the dark, it's said, bigger each time, "Ah...", "Ah...!",
 * "AAH...!!", from these ticks after it went off, and at the snap, "CHOO!".
 */
const DARK_IN = 8
const DARK_OUT = 30
const AH = [
	{ at: 8, text: 'Ah...', size: 44 },
	{ at: 34, text: 'Ah...!', size: 60 },
	{ at: 58, text: 'AAH...!!', size: 80 },
]
const CHOO = { text: 'CHOO!', size: 130, ticks: 34 }
/** How small they get, shrunk, before the flash: and how small they start, sneezed out. */
export const SMALLEST = 1 / 24
/** How far apart, across, they stand in a Portal, and how far up a sneeze blows them. */
const SLOT_GAP = 16
const SNEEZE_ARC = 70
/** The flash at the snap: how long it takes to come up, and to go again. */
const FLASH_UP = 14
const FLASH_DOWN = 30

/**
 * The longest anyone's let out after whoever got in just before them, the
 * other side: under half a second, however long they took getting there.
 */
const MOST_APART = 24

/**
 * The rocket, on the course itself: everyone aboard, the countdown, "3, 2,
 * 1...", and at `lift` it lifts off its pad, faster and faster, the camera
 * going up after it a little way, then watching it go, up off the top of
 * the screen. Gone, at `cut`, the camera's out in space, where it pops up
 * from under the screen, slowing, risen by `risen`, and hangs there, in
 * close on its windows from `windows` to `wobble`, everyone at them
 * looking out, till it shudders, something going wrong, and at `snap` it
 * blows up, and they're thrown out into space. Ticks from everyone getting
 * aboard. Drawn in `draw/rocketLaunch.tsx`.
 */
export const LAUNCH = {
	lift: 70,
	cut: 170,
	risen: 230,
	windows: 236,
	wobble: 306,
	snap: 380,
}
/** How fast it speeds up, lifting off; how far the camera goes up after it, before it lets it go. */
const LIFT_PULL = 0.09
const CAMERA_FOLLOWS = 240
/** How far under where it blows up it pops up from: off the bottom of the screen. */
const POP_FROM = 560
/** How far in on its windows the camera goes. */
const WINDOW_ZOOM = 2.2

/** Where in space a rocket blows up, and everyone's thrown out: in its middle, at its way out. */
export function launchEnd(
	world: Pick<World, 'course' | 'terrain'>,
	portal: Portal,
) {
	const space = world.course.deepWater
	const floor = world.terrain.groundY(portal.out)
	return {
		x: portal.out,
		y: space ? (space.surface + floor) / 2 : floor - 200,
	}
}

/**
 * Where the rocket is, `t` ticks after everyone's aboard: its middle, and
 * how far round it's leaning, in degrees, its nose to the right. On its pad
 * (`focus`), up, and over, heading on along the course, sinking only
 * towards the end, out over space, where up and down's no matter.
 */
export function rocketFlight(
	world: Pick<World, 'course' | 'terrain'>,
	portal: Portal,
	t: number,
) {
	const pad = portal.focus
	const end = launchEnd(world, portal)
	// Shuddering on the pad, as it lifts, and as it goes wrong.
	const shudder =
		t >= LAUNCH.wobble
			? Math.sin(t * 1.9) * (2 + (t - LAUNCH.wobble) / 6)
			: t > LAUNCH.lift - 30 && t < LAUNCH.lift + 20
				? (t % 4 < 2 ? 1 : -1) * 0.8
				: 0
	if (t < LAUNCH.cut) {
		const up = Math.max(0, t - LAUNCH.lift)
		return { x: pad.x, y: pad.y - up * up * LIFT_PULL, angle: shudder }
	}
	// Out in space: up from under the screen, slowing, then drifting.
	const u = Math.min(1, (t - LAUNCH.cut) / (LAUNCH.risen - LAUNCH.cut))
	const drift = Math.sin((t - LAUNCH.risen) / 24) * 6
	return {
		x: end.x,
		y: end.y + POP_FROM * (1 - u) ** 2 + (u >= 1 ? drift : 0),
		angle: shudder + (u >= 1 ? Math.sin(t / 30) * 3 : 0),
	}
}

/** Where the camera looks while the rocket goes: up after it off the pad, then out in space. */
function launchCamera(
	world: Pick<World, 'course' | 'terrain'>,
	portal: Portal,
	t: number,
) {
	if (t < LAUNCH.cut) {
		const rocket = rocketFlight(world, portal, t)
		const y = Math.max(rocket.y, portal.focus.y - CAMERA_FOLLOWS)
		return { x: portal.focus.x - VIEW_WIDTH / 2, y: y - VIEW_HEIGHT / 2 }
	}
	const end = launchEnd(world, portal)
	return { x: end.x - VIEW_WIDTH / 2, y: end.y - VIEW_HEIGHT / 2 }
}
/** What's said, as the rocket goes: the countdown, lift-off, and something wrong. */
const LAUNCH_WORDS = [
	{ at: 0, to: 22, text: '3...', size: 70 },
	{ at: 22, to: 44, text: '2...', size: 70 },
	{ at: 44, to: LAUNCH.lift, text: '1...', size: 70 },
	{ at: LAUNCH.lift, to: LAUNCH.lift + 40, text: 'Lift off!', size: 80 },
	{ at: LAUNCH.wobble + 16, to: LAUNCH.snap - 10, text: 'Uh oh...', size: 70 },
]

/** How long after the first the last is thrown out, a tick or two each. */
const THROWN_APART = 2
/** How fast they're thrown out, on, and how far apart, up and down. */
const THROWN_ON = 5
const THROWN_SPREAD = 46

const snapOf = (portal: Portal) =>
	portal.kind === 'shrink'
		? SHRINK.snap
		: portal.kind === 'launch'
			? LAUNCH.snap
			: SNEEZE.snap
/** How long after their turn someone's flying, sneezed out, before they're down and running. */
const emergeOf = (portal: Portal) =>
	portal.kind === 'grow' ? SNEEZE.flight : 0

/** Where someone in slot `slot` stands, across, from the middle. */
const slotOffset = (slot: number) =>
	(slot % 2 ? 1 : -1) * Math.ceil(slot / 2) * SLOT_GAP

/** Where in a Portal they're held: on the shrink ray's plate, or just inside the nose. */
function heldX(portal: Portal, slot: number) {
	if (portal.kind === 'launch') return portal.in
	const middle = portal.kind === 'shrink' ? portal.focus.x : portal.in + 70
	return middle + slotOffset(slot)
}

/**
 * When someone's let out, the other side: in the order they got in, as long
 * after the first as they got in after them, but no more than `MOST_APART`
 * after the one before them (see `bunchUp`).
 */
const turnOf = (run: PortalRun, portal: Portal, held: Held) =>
	(run.zappedAt ?? 0) +
	snapOf(portal) +
	// Out of the rocket, blown up: all at once, near enough.
	(portal.kind === 'launch' ? held.slot * THROWN_APART : held.at - run.firstAt)

/** When the bus comes on again, the other side: as far behind the last of them as it was. */
const busTurn = (run: PortalRun, portal: Portal) =>
	(run.zappedAt ?? 0) +
	snapOf(portal) +
	(run.lastOut ?? (run.zappedAt ?? 0) - run.firstAt) +
	emergeOf(portal)

/**
 * Gone off: everyone's got in when they're to be let out, the other side,
 * as `turnOf` has it: in the order they got in, but each no more than
 * `MOST_APART` after the one before.
 */
function bunchUp(run: PortalRun) {
	const held = [...run.held.values()].sort((a, b) => a.at - b.at)
	let was = run.firstAt
	let at = run.firstAt
	for (const h of held) {
		at += Math.min(MOST_APART, h.at - was)
		was = h.at
		h.at = at
	}
	run.lastOut = at - run.firstAt
}

const ease = (t: number) => {
	const c = Math.max(0, Math.min(1, t))
	return c * c * (3 - 2 * c)
}

/** In a Portal, held still, or not yet let out the other side. */
export const isHeld = (world: World, racer: Racer) =>
	!!world.portal?.held.has(racer.id)

/** The bus, held up till its turn to come through after them. */
export function busHeld(world: World) {
	const run = world.portal
	const portal = run && world.course.portals?.[run.index]
	if (!run || !portal || run.zappedAt === undefined) return false
	return world.ticks() < busTurn(run, portal)
}

/**
 * One tick of the course's Portals, if it has any, before anyone moves:
 * anyone got to one held in it; everyone in, it goes off; and, the other
 * side, each let out in turn. Whether everything's stopped still this tick,
 * while it goes off.
 */
export function stepPortals(world: World) {
	const portals = world.course.portals
	if (!portals?.length || world.phase() !== 'running') return false
	const now = world.ticks()
	if (!world.portal) {
		const index = portals.findIndex(
			(portal, i) =>
				!world.portalsDone.has(i) &&
				world.racers.some(
					(r) => !r.out && r.body.x >= portal.in && r.body.x < portal.out,
				),
		)
		if (index < 0) return false
		world.portal = { index, held: new Map(), firstAt: now, busGap: 0 }
	}
	const run = world.portal
	const portal = portals[run.index]

	if (run.zappedAt === undefined) {
		for (const racer of world.racers)
			if (!racer.out && !run.held.has(racer.id) && racer.body.x >= portal.in)
				hold(world, run, portal, racer)
		for (const racer of world.racers) {
			const held = run.held.get(racer.id)
			if (held) pin(world, racer, heldX(portal, held.slot))
		}
		const racing = world.racers.filter((r) => !r.out)
		if (racing.length && racing.every((r) => run.held.has(r.id))) {
			run.zappedAt = now
			run.busGap = Math.max(0, portal.in - world.bus.frontX)
			bunchUp(run)
			if (portal.kind === 'shrink') {
				play('zap')
				world.popup('Shrink ray!', portal.focus.x, portal.focus.y - 110)
			}
			if (portal.kind === 'launch') play('count')
		}
		return false
	}

	const t = now - run.zappedAt
	const snap = snapOf(portal)
	if (t < snap) {
		// "Ah... Ah... AAH...", in the dark, a sniff each.
		if (portal.kind === 'grow' && AH.some((ah) => ah.at === t)) play('sniff')
		if (portal.kind === 'shrink' && t === SHRINK.charge) play('whoosh')
		if (portal.kind === 'launch') soundLaunch(t)
		return true
	}
	if (t === snap) through(world, run, portal)

	for (const racer of world.racers) {
		const held = run.held.get(racer.id)
		if (!held) continue
		const turn = turnOf(run, portal, held)
		if (now < turn) {
			// Not their turn yet: waiting, out of sight, the other side.
			pin(world, racer, portal.kind === 'grow' ? portal.focus.x : portal.out)
			if (portal.kind === 'grow') racer.body.feetY = portal.focus.y
			continue
		}
		if (portal.kind === 'grow' && now < turn + SNEEZE.flight) {
			fly(world, racer, held, (now - turn) / SNEEZE.flight, portal)
			continue
		}
		letOut(world, racer, held, portal)
		run.held.delete(racer.id)
	}
	if (!run.held.size && now >= busTurn(run, portal)) {
		world.portalsDone.add(run.index)
		world.portal = undefined
	}
	return false
}

/** Into it: held, with when, and how fast they were going. */
function hold(world: World, run: PortalRun, portal: Portal, racer: Racer) {
	const b = racer.body
	run.held.set(racer.id, {
		at: world.ticks(),
		vx: Math.max(0, b.vx),
		over: Math.max(0, b.x - portal.in),
		slot: run.held.size,
	})
	if (run.held.size === 1) run.firstAt = world.ticks()
	if (portal.kind === 'shrink') world.popup('In you go!', b.x, b.feetY - 70)
	if (portal.kind === 'launch') {
		world.popup('All aboard!', b.x, b.feetY - 70)
		play('scan')
	}
}

/** The rocket's countdown, lift-off, roar, and the bang. */
function soundLaunch(t: number) {
	if (t === 22 || t === 44) play('count')
	if (t === LAUNCH.lift) play('go')
	if (t === LAUNCH.lift + 4 || t === LAUNCH.wobble) play('rumble')
	if (t === LAUNCH.lift + 30) play('whoosh')
	if (t === LAUNCH.snap - 8) play('eruption')
}

/** Stood still at `x`, on the floor, nothing going on. */
function pin(world: World, racer: Racer, x: number) {
	const b = racer.body
	b.x = x
	b.feetY = world.terrain.groundY(x)
	b.floor = b.feetY
	b.vx = 0
	b.vy = 0
	b.grounded = true
	b.jumping = false
	b.ducking = false
	b.on = undefined
	b.mount = 0
	b.carried = 0
	b.stumble = 0
	b.held = 0
	b.facing = 1
}

/** The flash: they're the other side, waiting their turn, and the bus as far behind as it was. */
function through(world: World, run: PortalRun, portal: Portal) {
	const { bus } = world
	bus.frontX = portal.out - run.busGap
	bus.reach = 0
	if (portal.kind === 'grow') play('sneeze')
	if (portal.kind === 'launch') world.space.boomAt = world.ticks()
	// The camera straight there, not swept along the course.
	const lookAt = portal.kind === 'grow' ? portal.focus.x + 120 : portal.out
	world.setZoom(1)
	world.view.lead = CAMERA_LEAD
	world.setCamera(
		lookAt - VIEW_WIDTH * (portal.kind === 'grow' ? 0.5 : CAMERA_LEAD),
	)
	const floor = world.terrain.groundY(portal.out)
	world.setCameraY(Math.min(0, floor - CAMERA_HEADROOM))
	for (const racer of world.racers) {
		const held = run.held.get(racer.id)
		if (held) racer.body.floor = floor
	}
}

/** Sneezed out: flying from the nose down to the floor at `out`, `u` of the way, growing. */
function fly(
	world: World,
	racer: Racer,
	held: Held,
	u: number,
	portal: Portal,
) {
	const b = racer.body
	const { x, y } = sneezedTo(world, portal, held, u)
	b.vx = 0
	b.vy = 0
	b.x = x
	b.feetY = y
	b.grounded = false
	b.facing = 1
}

/** Where someone sneezed out is, `u` of the way from the nose to the floor. */
export function sneezedTo(
	world: Pick<World, 'terrain'>,
	portal: Portal,
	held: Held,
	u: number,
) {
	// Slow away from the nose, as the camera pulls back from it: so they
	// stay in view, growing, rather than flying off the screen.
	const along = u * u * u
	const landX = portal.out + slotOffset(held.slot) * 0.5 + held.over
	const landY = world.terrain.groundY(landX)
	return {
		x: portal.focus.x + (landX - portal.focus.x) * along,
		y:
			portal.focus.y +
			(landY - portal.focus.y) * along -
			SNEEZE_ARC * Math.sin(Math.PI * along),
	}
}

/** Their turn: let out, the other side, going as fast as they went in. */
function letOut(world: World, racer: Racer, held: Held, portal: Portal) {
	const b = racer.body
	if (portal.kind === 'launch') {
		thrownOut(world, racer, held, portal)
		return
	}
	const x =
		portal.kind === 'shrink'
			? portal.out + held.over
			: sneezedTo(world, portal, held, 1).x
	b.x = x
	b.feetY = world.terrain.groundY(x)
	b.floor = b.feetY
	b.vx = held.vx
	b.vy = 0
	b.grounded = true
	b.facing = 1
	b.on = undefined
	if (portal.kind === 'shrink') play('scan')
}

/**
 * Out of the rocket, as it blows up: thrown out into space, all over, on
 * their way, swimming, a space helmet on each of them.
 */
function thrownOut(world: World, racer: Racer, held: Held, portal: Portal) {
	const b = racer.body
	const { y: middle } = launchEnd(world, portal)
	const across = slotOffset(held.slot)
	b.x = portal.out + held.over + across * 1.5
	b.feetY =
		middle +
		Math.sign(across) * Math.min(3, Math.abs(across) / SLOT_GAP) * THROWN_SPREAD
	b.floor = b.feetY
	b.vx = THROWN_ON + (held.slot % 3) * 0.5
	b.vy = (held.slot % 2 ? 1 : -1) * 1.2
	b.grounded = false
	b.swimming = true
	b.facing = 1
	b.on = undefined
	b.hat = { kind: 'spaceHelmet' }
	b.lostHat = undefined
	if (held.slot === 0) world.popup('Wheee!', b.x, b.feetY - 70)
}

/**
 * How someone in a Portal is drawn this tick, if they're in one: where,
 * how big (1 their own size), or not at all, waiting their turn; and
 * whether they're `waiting` for everyone else to get to it.
 */
export function heldLook(world: World, racer: Racer) {
	const run = world.portal
	const portal = run && world.course.portals?.[run.index]
	const held = run?.held.get(racer.id)
	if (!run || !portal || !held) return undefined
	const b = racer.body
	// Aboard the rocket, out of sight, till they're thrown out of it.
	if (portal.kind === 'launch') return { hidden: true as const }
	// Waiting for everyone else to get there.
	if (run.zappedAt === undefined)
		return { x: b.x, feetY: b.feetY, scale: 1, waiting: true as const }
	const now = world.ticks()
	const t = now - run.zappedAt
	if (portal.kind === 'shrink') {
		if (t >= SHRINK.snap) return { hidden: true as const }
		const s = shrunk(t)
		const { x, y } = portal.focus
		return {
			x: x + (b.x - x) * s,
			feetY: y + (b.feetY - y) * s,
			scale: s,
		}
	}
	if (t < SNEEZE.snap) return { x: b.x, feetY: b.feetY, scale: 1 }
	const turn = turnOf(run, portal, held)
	if (now < turn) return { hidden: true as const }
	const u = Math.min(1, (now - turn) / SNEEZE.flight)
	return { x: b.x, feetY: b.feetY, scale: grown(u) }
}

/** How small someone being shrunk is, `t` ticks after the ray went off. */
const shrunk = (t: number) =>
	SMALLEST ** ease((t - SHRINK.charge) / (SHRINK.snap - SHRINK.charge - 18))
/** How big someone sneezed out is, `u` of the way down to the floor. */
const grown = (u: number) => SMALLEST ** ((1 - Math.min(1, u)) ** 2)

/**
 * How the camera's view of everything is changed, a Portal going off:
 * zoomed in `zoom` times on `focus` (a point in the world), shaken
 * `shake` px, and a white `flash` over it all, out of 1.
 */
export function portalView(world: World) {
	const run = world.portal
	const portal = run && world.course.portals?.[run.index]
	if (!run || !portal || run.zappedAt === undefined) return undefined
	const t = world.ticks() - run.zappedAt
	const snap = snapOf(portal)
	const flash =
		t < snap
			? Math.max(0, 1 - (snap - t) / FLASH_UP)
			: Math.max(0, 1 - (t - snap) / FLASH_DOWN)
	if (portal.kind === 'launch') {
		// The take-off, on the course: in close on its windows a while,
		// the countdown said, and a flash at the bang.
		const rocket = rocketFlight(world, portal, Math.min(t, snap))
		const into = (t - LAUNCH.windows) / 20
		const outOf = (LAUNCH.wobble + 10 - t) / 20
		const zoom = 1 + (WINDOW_ZOOM - 1) * ease(Math.min(into, outOf))
		const said = LAUNCH_WORDS.findLast((w) => t >= w.at && t < w.to)
		return {
			zoom,
			focus: { x: rocket.x, y: rocket.y },
			shake: t >= LAUNCH.wobble && t < snap ? (t % 4 < 2 ? 3 : -3) : 0,
			flash:
				t < snap
					? Math.max(0, 1 - (snap - t) / FLASH_UP)
					: Math.max(0, 1 - (t - snap) / FLASH_DOWN),
			words: said && {
				text: said.text,
				size: said.size,
				grow: Math.max(0, 1 - (t - said.at) / 6),
			},
		}
	}
	if (portal.kind === 'shrink') {
		return {
			zoom: t < snap ? 1 / shrunk(t - SHRINK.lag) : 1,
			focus: portal.focus,
			shake: t < SHRINK.charge ? (t % 4 < 2 ? 1 : -1) * (t / SHRINK.charge) : 0,
			flash,
		}
	}
	// Into the dark, quick; "Ah... Ah... AAH...", shaking, more and more.
	if (t < snap) {
		const ah = AH.findLast((a) => t >= a.at)
		return {
			zoom: 1,
			focus: portal.focus,
			shake: (t % 6 < 3 ? 1 : -1) * Math.round((t / snap) * 5),
			flash: 0,
			dark: Math.min(1, t / DARK_IN),
			words: ah && {
				text: ah.text,
				size: ah.size,
				// Each one bursting in, big, and settling.
				grow: Math.max(0, 1 - (t - ah.at) / 6),
			},
		}
	}
	// "CHOO!": out of the dark, into the sneeze.
	const since = t - snap
	const u = since / SNEEZE.flight
	return {
		zoom: u < 1 ? 1 / grown(u) : 1,
		focus: portal.focus,
		shake: since < 12 ? (since % 4 < 2 ? 6 : -6) * (1 - since / 12) : 0,
		flash: 0,
		dark: Math.max(0, 1 - since / DARK_OUT),
		words:
			since < CHOO.ticks
				? {
						text: CHOO.text,
						size: CHOO.size,
						grow: Math.max(0, 1 - since / 5),
						fade: Math.max(0, (since - CHOO.ticks * 0.5) / (CHOO.ticks * 0.5)),
					}
				: undefined,
	}
}

/**
 * Where the camera looks while a Portal's going off, if it's taken it over:
 * on the shrink ray, or on the nose, from the moment it goes off; sneezed,
 * on the giant's nose and the floor they're blown out onto, till the first
 * is down. Whether it has.
 */
export function portalCamera(world: World) {
	const run = world.portal
	const portal = run && world.course.portals?.[run.index]
	if (!run || !portal || run.zappedAt === undefined) return false
	const t = world.ticks() - run.zappedAt
	const snap = snapOf(portal)
	if (t >= snap + emergeOf(portal)) return false
	if (t >= snap) return true
	// The rocket's take-off: the camera after it, up and over.
	if (portal.kind === 'launch') {
		const camera = launchCamera(world, portal, t)
		world.setZoom(1)
		world.setCamera(camera.x)
		world.setCameraY(Math.min(0, camera.y))
		return true
	}
	// Onto it, zoomed back in to the usual, everyone held in it in the middle.
	const middle = portal.kind === 'shrink' ? portal.focus.x : portal.in + 70
	const floor = world.terrain.groundY(portal.in)
	const ease = 0.15
	world.setZoom(world.zoom() + (1 - world.zoom()) * ease)
	const camera = middle - (VIEW_WIDTH * world.zoom()) / 2
	world.setCamera(world.camera() + (camera - world.camera()) * ease)
	const cameraY = Math.min(0, floor + 120 - VIEW_HEIGHT)
	world.setCameraY(world.cameraY() + (cameraY - world.cameraY()) * ease)
	return true
}

/**
 * The shrink ray whose shrunk stretch `x` is in, if it's in one: from its
 * way in on to where the next sneeze lets everyone out.
 */
export function shrinkRayOver(course: { portals?: Portal[] }, x: number) {
	const portals = course.portals ?? []
	return portals.find((portal, i) => {
		if (portal.kind !== 'shrink') return false
		const back = portals.slice(i + 1).find((p) => p.kind === 'grow')
		return x >= portal.in && x < (back?.out ?? Number.POSITIVE_INFINITY)
	})
}

/**
 * Whether `x` is where everyone's shrunk: from a shrink ray's way in on to
 * where the next sneeze lets them out. Nobody else out running is in
 * there: the Pacers go into the ray, are shrunk away to nothing on its
 * plate (see `PACER_SHRINK`), and nobody joins.
 */
export const shrunkAt = (course: { portals?: Portal[] }, x: number) =>
	!!shrinkRayOver(course, x)

/**
 * Whether `x` is past a rocket's door: nobody else out running is past it.
 * Any Pacer who gets to it goes aboard, and that's the last of them; nobody
 * joins after.
 */
export const launchedAt = (course: { portals?: Portal[] }, x: number) =>
	!!course.portals?.some((p) => p.kind === 'launch' && x >= p.in)

/**
 * A Pacer into a shrink ray, on their own: stood on its plate, it charges
 * up for `charge` ticks, shrinks them down, as small as anyone gets, by
 * `shrunk`, and at `gone` they're gone. Quicker than for Players, with
 * nobody else to wait for, and no camera to dive in after them.
 */
export const PACER_SHRINK = { charge: 30, shrunk: 84, gone: 90 }

/** How small a Pacer being shrunk is, `t` ticks into it: as a Player shrinks, `shrunk`. */
export const pacerShrunk = (t: number) =>
	SMALLEST **
	ease((t - PACER_SHRINK.charge) / (PACER_SHRINK.shrunk - PACER_SHRINK.charge))

/**
 * How far a Portal going off has got, for drawing it: `t` ticks since it
 * went off, its flash at `snap`, and `since` ticks since then. The tick's
 * a signal: reading it keeps this up to date.
 */
export function portalTime(world: World) {
	const now = world.ticks()
	const run = world.portal
	const portal = run && world.course.portals?.[run.index]
	if (!run || !portal || run.zappedAt === undefined) return undefined
	const t = now - run.zappedAt
	const snap = snapOf(portal)
	return { portal, t, snap, since: t - snap }
}
