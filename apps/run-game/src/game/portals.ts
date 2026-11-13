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
 * side as they went in: in the same order, as far apart, as fast. The bus
 * too, as far behind them as it was.
 *
 * Plain state, like the body, on the world (`portal`), so a Remote Player
 * sees the same (see `RaceFrame`'s `portal`).
 */

/** Someone in a Portal: when they got in, how fast they were going, and where they stand in it. */
export interface Held {
	at: number
	vx: number
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
/** How small they get, shrunk, before the flash: and how small they start, sneezed out. */
export const SMALLEST = 1 / 24
/** How far apart, across, they stand in a Portal, and how far up a sneeze blows them. */
const SLOT_GAP = 16
const SNEEZE_ARC = 70
/** The flash at the snap: how long it takes to come up, and to go again. */
const FLASH_UP = 14
const FLASH_DOWN = 30

const snapOf = (portal: Portal) =>
	portal.kind === 'shrink' ? SHRINK.snap : SNEEZE.snap
/** How long after their turn someone's flying, sneezed out, before they're down and running. */
const emergeOf = (portal: Portal) =>
	portal.kind === 'shrink' ? 0 : SNEEZE.flight

/** Where someone in slot `slot` stands, across, from the middle. */
const slotOffset = (slot: number) =>
	(slot % 2 ? 1 : -1) * Math.ceil(slot / 2) * SLOT_GAP

/** Where in a Portal they're held: on the shrink ray's plate, or just inside the nose. */
function heldX(portal: Portal, slot: number) {
	const middle = portal.kind === 'shrink' ? portal.focus.x : portal.in + 70
	return middle + slotOffset(slot)
}

/** When someone's let out, the other side: as long after the first as they got in after them. */
const turnOf = (run: PortalRun, portal: Portal, held: Held) =>
	(run.zappedAt ?? 0) + snapOf(portal) + (held.at - run.firstAt)

/** When the bus comes on again, the other side: as far behind them as it was. */
const busTurn = (run: PortalRun, portal: Portal) =>
	(run.zappedAt ?? 0) +
	snapOf(portal) +
	((run.zappedAt ?? 0) - run.firstAt) +
	emergeOf(portal)

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
			if (portal.kind === 'shrink') {
				play('zap')
				world.popup('Shrink ray!', portal.focus.x, portal.focus.y - 110)
			} else {
				play('sniff')
				world.popup(
					'Ah...',
					portal.in + 70,
					world.terrain.groundY(portal.in) - 90,
				)
			}
		}
		return false
	}

	const t = now - run.zappedAt
	const snap = snapOf(portal)
	if (t < snap) {
		if (portal.kind === 'grow' && t === Math.round(snap * 0.45)) {
			play('sniff')
			world.popup(
				'Ah...',
				portal.in + 70,
				world.terrain.groundY(portal.in) - 110,
			)
		}
		if (portal.kind === 'shrink' && t === SHRINK.charge) play('whoosh')
		return true
	}
	if (t === snap) through(world, run, portal)

	for (const racer of world.racers) {
		const held = run.held.get(racer.id)
		if (!held) continue
		const turn = turnOf(run, portal, held)
		if (now < turn) {
			// Not their turn yet: waiting, out of sight, the other side.
			pin(world, racer, portal.kind === 'shrink' ? portal.out : portal.focus.x)
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
		slot: run.held.size,
	})
	if (run.held.size === 1) run.firstAt = world.ticks()
	if (portal.kind === 'shrink') world.popup('In you go!', b.x, b.feetY - 70)
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
	if (portal.kind === 'grow') {
		play('sneeze')
		world.popup('CHOO!', portal.focus.x + 40, portal.focus.y - 50)
	}
	// The camera straight there, not swept along the course.
	const lookAt = portal.kind === 'shrink' ? portal.out : portal.focus.x + 120
	world.setZoom(1)
	world.view.lead = CAMERA_LEAD
	world.setCamera(
		lookAt - VIEW_WIDTH * (portal.kind === 'shrink' ? CAMERA_LEAD : 0.5),
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
	const landX = portal.out + slotOffset(held.slot) * 0.5
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
	const x =
		portal.kind === 'shrink' ? portal.out : sneezedTo(world, portal, held, 1).x
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
 * How someone in a Portal is drawn this tick, if they're in one: where,
 * how big (1 their own size), or not at all, waiting their turn.
 */
export function heldLook(world: World, racer: Racer) {
	const run = world.portal
	const portal = run && world.course.portals?.[run.index]
	const held = run?.held.get(racer.id)
	if (!run || !portal || !held) return undefined
	const b = racer.body
	if (run.zappedAt === undefined) return { x: b.x, feetY: b.feetY, scale: 1 }
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
	if (portal.kind === 'shrink') {
		return {
			zoom: t < snap ? 1 / shrunk(t - SHRINK.lag) : 1,
			focus: portal.focus,
			shake: t < SHRINK.charge ? (t % 4 < 2 ? 1 : -1) * (t / SHRINK.charge) : 0,
			flash,
		}
	}
	// Ah... Ah...: the nose shaking, more and more.
	if (t < snap)
		return {
			zoom: 1,
			focus: portal.focus,
			shake: (t % 6 < 3 ? 1 : -1) * Math.round((t / snap) * 5),
			flash,
		}
	const u = (t - snap) / SNEEZE.flight
	return {
		zoom: u < 1 ? 1 / grown(u) : 1,
		focus: portal.focus,
		shake: 0,
		flash,
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
 * Whether `x` is where everyone's shrunk: from a shrink ray's way in on to
 * where the next sneeze lets them out. Nobody else out running is in
 * there: the Pacers go into the ray and are gone, and nobody joins.
 */
export function shrunkAt(course: { portals?: Portal[] }, x: number) {
	const portals = course.portals ?? []
	return portals.some((portal, i) => {
		if (portal.kind !== 'shrink') return false
		const back = portals.slice(i + 1).find((p) => p.kind === 'grow')
		return x >= portal.in && x < (back?.out ?? Number.POSITIVE_INFINITY)
	})
}

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
