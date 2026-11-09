import { guests } from '../guests'
import { DEFAULT_AVATAR, pickAny, randomAvatar } from '../looks'
import { MEMBERS, type Playable, lookSprite } from '../playable'
import { play } from '../sfx'
import {
	BUS_LEASH_MAX,
	CAMERA_LEAD,
	DAZED_SPEED,
	DAZED_TICKS,
	GRAVITY,
	HILL_PULL,
	HITBOX_HALF_WIDTH,
	MEMBER_SHARE,
	PACER_EVERY_SPREAD,
	PACER_EVERY_TICKS,
	PACER_FASTEST,
	PACER_SLOWEST,
	RUNNER_SCALE,
	START_X,
	STOMP_BOOST,
	STOMP_BOUNCE,
	STOMP_BOUNCE_HELD,
	STOMP_POINTS,
	STOMP_POINTS_MAX,
	VIEW_HEIGHT,
	VIEW_WIDTH,
} from './constants'
import { geeseWidth } from './geeseArt'
import { kidsWidth } from './kidsArt'
import { boost } from './step'
import type { Terrain } from './terrain'
import { type Pacer, type Racer, START_GAP, type World } from './world'

/**
 * The pack: everyone else out running Haga. They plod along slower than you,
 * hop the rocks and the mud, and get scooped if the bus catches them. Land on
 * one's head and you bounce off it, faster, for points.
 */

/** For anyone who isn't a club member. Nothing the pixel font can't letter. */
const NAMES = [
	'Anders',
	'Astrid',
	'Axel',
	'Ebba',
	'Elsa',
	'Erik',
	'Freja',
	'Frida',
	'Gustav',
	'Hanna',
	'Hugo',
	'Ida',
	'Ingrid',
	'Johan',
	'Karin',
	'Klara',
	'Lars',
	'Linnea',
	'Magnus',
	'Maja',
	'Nils',
	'Olof',
	'Oskar',
	'Saga',
	'Sven',
	'Tove',
	'Ulla',
	'Viktor',
	'Wilma',
]

/** How hard they hop a rock or a puddle. */
const HOP_SPEED = 8
/** How far ahead they see one coming, and hop. */
const HOP_LOOKAHEAD = 28
/** How quickly they get up to their pace. */
const PACER_GRIP = 0.05
/** Hills slow them down and speed them up, a bit: they're used to Haga. */
const PACER_HILL_PULL = HILL_PULL * 0.5
/** Landing this far into someone's head still counts as on top of it. */
const HEAD_GIVE = 6
/** And this far either side of the middle of them. */
const HEAD_REACH = HITBOX_HALF_WIDTH + 10
/**
 * How far off the left of the screen someone being scooped is still heard:
 * as far back as the bus ever gets (`BUS_LEASH_MAX`, less the runner's lead).
 */
export const SCOOP_HEARD = BUS_LEASH_MAX - VIEW_WIDTH * CAMERA_LEAD + 50

/** What `lineUp` needs: the world's still being made when it's called. */
interface Lineup {
	racers: { runner: Playable }[]
	terrain: Terrain
	pack: Pacer[]
	packSize: number
	packState: { nextId: number; nextJoin: number }
}

/**
 * Someone to join: now and then someone the club knows, a member or one of
 * its guests, as long as they're not running already (or racing).
 */
function newcomer(
	world: Lineup,
): Pick<Pacer, 'name' | 'member' | 'guest' | 'look' | 'sprite'> {
	const members = [...MEMBERS, ...guests()].filter(
		(m) =>
			!world.racers.some(
				(r) => r.runner.id === m.id || r.runner.name === m.name,
			) && !world.pack.some((p) => p.name === m.name),
	)
	if (members.length && Math.random() < MEMBER_SHARE) {
		const { id, name, member, sprite } = pickAny(members)
		return {
			name,
			member,
			guest: id.startsWith('guest:') ? id : undefined,
			sprite,
		}
	}
	const look = randomAvatar(DEFAULT_AVATAR)
	return { name: pickAny(NAMES), look, sprite: lookSprite(look) }
}

function join(world: Lineup, x: number) {
	world.pack.push({
		id: world.packState.nextId++,
		...newcomer(world),
		x,
		feetY: world.terrain.groundY(x),
		vx: 0,
		vy: 0,
		grounded: true,
		pace: PACER_SLOWEST + Math.random() * (PACER_FASTEST - PACER_SLOWEST),
		dazed: 0,
		scooped: false,
		spin: 0,
	})
}

/**
 * A few lined up behind you at the start, or behind the last Player in a
 * Round: nobody gets ahead of the line.
 */
export function lineUp(world: Lineup) {
	const last = START_X - (world.racers.length - 1) * START_GAP
	for (const offset of [-36, -72, -108, -150, -195].slice(0, world.packSize))
		join(world, last + offset + Math.round(Math.random() * 16))
	world.packState.nextJoin = PACER_EVERY_TICKS
}

/** One tick of the pack: joining, running, being bounced on, and leaving. */
export function stepPack(world: World) {
	const { pack, terrain, packState } = world
	const phase = world.phase()
	// On the start line until "Go!", like everyone.
	if (phase === 'countdown') return

	if (phase === 'running' && --packState.nextJoin <= 0) {
		packState.nextJoin = PACER_EVERY_TICKS + Math.random() * PACER_EVERY_SPREAD
		// Just off the screen ahead, to be caught up with.
		const x = world.camera() + world.viewWidth() + 80
		const running = pack.filter((p) => !p.scooped).length
		if (running < world.packSize && x < terrain.finishX - 300) join(world, x)
	}

	for (const pacer of pack) movePacer(world, pacer)
	for (const racer of world.racers) {
		if (phase === 'running' && !racer.out) bounceOffHeads(world, racer)
		if (racer.body.grounded) racer.body.combo = 0
	}

	// Gone: fallen off the bottom out of the scoop, or long over the line.
	// Anyone left behind stays until the bus gets them, on the screen or not.
	for (let i = pack.length - 1; i >= 0; i--) {
		const p = pack[i]
		if (p.feetY > VIEW_HEIGHT + 300 || p.x > terrain.finishX + 700)
			pack.splice(i, 1)
	}
}

function movePacer(world: World, p: Pacer) {
	const { terrain } = world
	if (p.scooped) {
		p.x += p.vx
		p.feetY += p.vy
		p.vy += GRAVITY
		p.spin++
		return
	}

	if (p.dazed > 0) p.dazed--
	if (p.grounded) {
		const pace = p.dazed > 0 ? DAZED_SPEED : p.pace
		p.vx += (pace - p.vx) * PACER_GRIP + terrain.slope(p.x) * PACER_HILL_PULL
		if (p.dazed === 0 && hopAhead(world, p.x)) {
			p.vy = -HOP_SPEED
			p.grounded = false
		}
	}
	p.x += p.vx

	const ground = terrain.groundY(p.x)
	if (p.grounded) p.feetY = ground
	else {
		p.vy += GRAVITY
		p.feetY += p.vy
		if (p.feetY >= ground && p.vy >= 0) {
			p.feetY = ground
			p.vy = 0
			p.grounded = true
		}
	}
}

/**
 * A rock, a hurdle, a puddle, a pothole or geese just ahead of `x`. Branches they
 * just run under: they're shorter than you.
 */
function hopAhead(world: World, x: number) {
	return world.obstacles.some(({ obstacle: o, used }) => {
		const edge =
			o.kind === 'rock'
				? o.x - 20
				: o.kind === 'hurdle'
					? o.x - 16
					: o.kind === 'mud' || o.kind === 'pothole'
						? o.x - o.width / 2
						: o.kind === 'kids'
							? o.x - kidsWidth(o.count) / 2
							: o.kind === 'geese' && !used
								? o.x - geeseWidth(o.count) / 2
								: undefined
		return edge !== undefined && edge > x && edge - x < HOP_LOOKAHEAD
	})
}

/** How long a Player stumbles after another bounces on their head: a little. */
const STOMPED_TICKS = 18
/** And how long before anyone can bounce on them again. */
const STOMPED_GUARD = 60

/** Coming down on someone's head: bounce off it, faster, and score. */
function bounceOffHeads(world: World, racer: Racer) {
	const b = racer.body
	if (b.grounded || b.vy <= 0 || b.carried > 0) return
	/** Where their feet were last tick. */
	const was = b.feetY - b.vy

	for (const p of world.pack) {
		if (p.scooped || p.dazed > 0) continue
		if (Math.abs(b.x - p.x) > HEAD_REACH) continue
		const head = p.feetY - p.sprite.height * RUNNER_SCALE + HEAD_GIVE
		// From above it, onto it.
		if (was > head || b.feetY < head) continue

		p.dazed = DAZED_TICKS
		bounceOff(world, racer, head, p.x)
		// One head a tick.
		return
	}

	// Another Player's head: a bounce for you, a stumble for them.
	for (const other of world.racers) {
		const o = other.body
		if (
			other === racer ||
			other.out ||
			o.stomped > 0 ||
			o.mount > 0 ||
			o.carried > 0
		)
			continue
		if (Math.abs(b.x - o.x) > HEAD_REACH) continue
		const height = o.ducking
			? other.runner.sprite.height * RUNNER_SCALE * 0.55
			: other.runner.sprite.height * RUNNER_SCALE
		const head = o.feetY - height + HEAD_GIVE
		if (was > head || b.feetY < head) continue

		o.stomped = STOMPED_GUARD
		o.stumble = Math.max(o.stumble, STOMPED_TICKS)
		o.vx *= 0.5
		bounceOff(world, racer, head, o.x)
		return
	}
}

/**
 * Off a head whose top is at `head`, at `x`: up, faster, and points, doubling
 * for each more before landing. Corgis' heads too.
 */
export function bounceOff(world: World, racer: Racer, head: number, x: number) {
	const b = racer.body
	b.feetY = head
	b.vy = -(racer.controls().up ? STOMP_BOUNCE_HELD : STOMP_BOUNCE)
	b.vx = boost(b.vx, b.facing, STOMP_BOOST)

	const points = Math.min(STOMP_POINTS_MAX, STOMP_POINTS * 2 ** b.combo)
	b.combo++
	world.addBonus('heads', points)
	const combo = b.combo > 1 ? ` ×${b.combo}` : ''
	world.popup(
		world.round ? (combo ? `Boing!${combo}` : 'Boing!') : `+${points}${combo}`,
		x,
		head - 10,
	)
	play('stomp')
}

/** Whoever the bus has caught up with goes flying, the same as you would. */
export function scoopPack(world: World) {
	const { bus } = world
	const camera = world.camera()
	for (const p of world.pack) {
		if (p.scooped || bus.frontX < p.x - HITBOX_HALF_WIDTH) continue
		p.scooped = true
		p.grounded = false
		p.vx = Math.max(bus.speed, 2) + 2 + Math.random() * 2
		p.vy = -13 - Math.random() * 3
		p.spin = 0
		bus.scooping = 10
		// Heard, but not announced: "Scooped …!" is for players, not the pack.
		// Just off the screen behind still counts: the bus isn't far back.
		if (p.x > camera - SCOOP_HEARD && p.x < camera + world.viewWidth())
			play('whoosh')
	}
}
