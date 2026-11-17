import type { Course } from '../courses/types'
import { CART_HEIGHT, CART_WIDTH } from '../draw/art/mineCart'
import { collect } from '../saved/collected'
import { play } from '../sfx'
import { moveCoasterCart, placeCart, rideCoaster } from './coaster'
import { PICKUP_WORD } from './collectables'
import { CORGI_POINTS, GRAVITY, VIEW_HEIGHT } from './constants'
import { scored } from './step'
import type { Terrain } from './terrain'
import type { Racer, World } from './world'

/**
 * The Caves' mine carts (see `Mine`): waiting on the rails, ridden down the
 * line to its buffers, or stood at them, done with. Run into one and
 * you're in it, sat down, riding it, nothing to do but hold on.
 */

/**
 * - `waiting`: on the rails, heaped with ore, for someone to run into
 * - `ridden`: down the line, with someone in it
 * - `parked`: at the buffers, done with
 * - `scooped`: flying out of the scoop
 */
export type CartState = 'waiting' | 'ridden' | 'parked' | 'scooped'

export interface Cart {
	id: number
	/** The middle of it, and the rail under its wheels. */
	x: number
	feetY: number
	vx: number
	vy: number
	state: CartState
	/** Who's in it, by their racer's id, while it's `ridden`. */
	rider?: string
	/** On the secret line, up off the line along the floor: jumped up onto it. */
	secret: boolean
	/** Whoever's in it's been told they can jump it up onto the secret line. */
	told: boolean
	/** Up in the air, jumped (its `vy`, how fast it's going up or down). */
	air?: boolean
	/** Dropped off the secret line, down through it: not to land back on it. */
	through?: boolean
	/** Whoever's in it's been told they can drop down off the secret line. */
	toldDrop?: boolean
	/** On a coaster, hopping: how far up off its rail it is. */
	lift?: number
	/** On a coaster, jumped on its leap's run-up: across the gap (see `Coaster['leap']`). */
	launched?: boolean
	/** On a coaster, off the end of its leap's rail, not jumped: falling, `vx` and `vy` its speed. */
	off?: boolean
	/**
	 * Degrees, flying out of the scoop; ridden, how far it's tipped with
	 * its rail, up the secret line and back down; or on a Secret's coaster,
	 * the way it's heading (see `coaster.ts`).
	 */
	spin: number
	/** One of a Secret's coaster's carts, not the mine's (see `Coaster`). */
	coaster?: boolean
	/** On a coaster: how far along its track it's gone. */
	along?: number
}

/** How far up off the rail whoever's in one sits: on its floor, the tub over their legs. */
export const CART_SEAT = 12
/** How fast one goes, once it's got going, and how quickly it gets going. */
const CART_SPEED = 10
const CART_PUSH = 0.3
/** How close to one's middle you have to get to be in it, and how high over its lip you can be and still land in it. */
const BOARD_REACH = CART_WIDTH / 2
const BOARD_OVER = 16
/** How far before the secret line's start whoever's in a cart is told they can jump up onto it. */
const POINTS_TOLD = 520
/**
 * How hard a cart jumps, and how far up off its rail whoever's in it
 * reaches, sat down: for their head to bump a roof, not go through it.
 */
const CART_JUMP = 9
const RIDER_TOP = 50
/** Dropped off the secret line: pushed down off it, to fall clear of it, not along under it. */
const DROP_PUSH = 5
/** Out at the buffers: thrown up and on out of it. */
const BUFFER_HOP = 6
const BUFFER_KEEP = 0.9

/**
 * A course's carts, waiting at the start: its mine's, and its Secret's
 * coaster's, after them, all at the start of its track.
 */
export function createCarts(world: {
	course: Course
	terrain: Terrain
}): Cart[] {
	const cart = (id: number, x: number, feetY: number): Cart => ({
		id,
		x,
		feetY,
		vx: 0,
		vy: 0,
		state: 'waiting',
		secret: false,
		told: false,
		spin: 0,
	})
	const carts = (world.course.mine?.carts ?? []).map((x, id) =>
		cart(id, x, world.terrain.groundY(x)),
	)
	const coaster = world.course.secret?.coaster
	for (let i = 0; coaster && i < coaster.carts; i++) {
		const waiting = cart(carts.length, 0, 0)
		waiting.coaster = true
		placeCart(coaster, waiting, 0)
		carts.push(waiting)
	}
	return carts
}

/** The rail under a cart at `x`: along the Ground, or up the secret line, if it's on it. */
export function railY(world: World, x: number, secret: boolean) {
	const ground = world.terrain.groundY(x)
	const line = world.course.mine?.secret
	if (!secret || !line || x < line.from || x >= line.to) return ground
	return ground - line.height(x)
}

/** How far a cart on the rail at `x` is tipped with it, in degrees: nose up, going uphill. */
export function railTilt(world: World, x: number, secret: boolean) {
	const ahead = railY(world, x + 10, secret)
	const behind = railY(world, x - 10, secret)
	return (Math.atan2(ahead - behind, 20) * 180) / Math.PI
}

/**
 * The cart someone's riding, if they are, by where they are, so a Remote
 * Player's screen knows it too: to turn them with it.
 */
export const cartOf = (
	world: Pick<World, 'carts'>,
	b: { x: number; feetY: number; cart?: number },
) =>
	b.cart === undefined
		? undefined
		: world.carts.find(
				(c) =>
					c.state === 'ridden' &&
					Math.abs(c.x - b.x) < 30 &&
					Math.abs(c.feetY - b.feetY) < 30,
			)

/**
 * Anyone racing who's run into a waiting cart, or come down into it: in it,
 * and off down the line.
 */
export function boardCarts(world: World) {
	if (world.phase() !== 'running') return
	for (const racer of world.racers) {
		const b = racer.body
		if (racer.out || b.cart !== undefined || b.mount > 0 || b.carried > 0)
			continue
		const cart = world.carts.find(
			(c) =>
				c.state === 'waiting' &&
				Math.abs(b.x - c.x) < BOARD_REACH &&
				b.feetY > c.feetY - CART_HEIGHT - BOARD_OVER,
		)
		if (!cart) continue
		cart.state = 'ridden'
		cart.rider = racer.id
		cart.vx = Math.max(cart.vx, Math.abs(b.vx))
		b.cart = cart.id
		b.stumble = 0
		b.combo = 0
		collect('ride:minecart')
		world.addBonus('carts', CORGI_POINTS)
		world.popup(
			scored(world, PICKUP_WORD['ride:minecart'], `+${CORGI_POINTS}`),
			b.x,
			cart.feetY - CART_HEIGHT - 50,
		)
		play('whoosh')
	}
}

/**
 * Whether there's open air between the secret line and the line along the
 * floor at `x`, to drop down through: out of the gallery, in the chambers
 * either side of it, the roof up over the secret line.
 */
function openUnder(world: World, x: number) {
	const line = world.course.mine?.secret
	if (!line || x < line.from || x >= line.to) return false
	const roof = world.course.cave?.ceiling(x)
	return roof !== undefined && roof < railY(world, x, true) - RIDER_TOP
}

/**
 * Riding a cart, down the line: along the rails, faster and faster up to
 * its speed, sat down in it; jumped, up in the air, cart and all, and down
 * onto whichever rail's under it: up onto the secret line, off the line
 * along the floor, that's how to get on it; on the secret line, holding
 * down where there's nothing between it and the line along the floor,
 * dropped down off it onto that; and at the buffers, thrown out of it, on
 * their way again. `jump`: jump was pressed, this tick.
 */
export function rideCart(
	world: World,
	racer: Racer,
	jump: boolean,
	down = false,
) {
	const b = racer.body
	const cart = b.cart === undefined ? undefined : world.carts[b.cart]
	if (cart?.coaster) return rideCoaster(world, racer, cart, jump)
	const mine = world.course.mine
	if (!cart || !mine) {
		b.cart = undefined
		return
	}
	cart.vx = Math.min(CART_SPEED, cart.vx + CART_PUSH)
	// Coming up to the secret line: told they can jump up onto it.
	if (!cart.told && mine.secret.from - cart.x < POINTS_TOLD) {
		cart.told = true
		world.popup('Jump up to the top track!', cart.x, cart.feetY - 110)
	}
	if (jump && !cart.air) {
		cart.air = true
		cart.vy = -CART_JUMP
		play('jump')
	}
	// On the secret line, on its way back down: told they can drop off it.
	const dropping = cart.secret && !cart.air && openUnder(world, cart.x)
	if (
		dropping &&
		!cart.toldDrop &&
		cart.x > mine.secret.gallery.to &&
		cart.x < mine.secret.to - 200
	) {
		cart.toldDrop = true
		world.popup('↓ to drop down!', cart.x, cart.feetY - 90)
	}
	// Down, off it, onto the line along the floor.
	if (down && dropping) {
		cart.air = true
		cart.through = true
		cart.vy = DROP_PUSH
		play('whoosh')
	}
	if (cart.air) flyCart(world, cart)
	else {
		cart.x += cart.vx
		cart.feetY = railY(world, cart.x, cart.secret)
		cart.spin = railTilt(world, cart.x, cart.secret)
	}
	b.x = cart.x
	b.feetY = cart.feetY - CART_SEAT
	b.vx = cart.vx
	b.vy = cart.air ? cart.vy : 0
	b.grounded = true
	b.jumping = false
	b.on = undefined
	b.ducking = true
	b.facing = 1
	b.floor = b.feetY
	if (cart.air || cart.x < mine.to - CART_WIDTH / 2) return
	// The buffers: the cart stops dead, and out they're thrown, on their way.
	cart.x = mine.to - CART_WIDTH / 2
	cart.vx = 0
	cart.state = 'parked'
	cart.rider = undefined
	b.cart = undefined
	b.ducking = false
	b.grounded = false
	b.vy = -BUFFER_HOP
	b.vx = CART_SPEED * BUFFER_KEEP
	play('jump')
}

/**
 * A cart in the air, jumped: on, and up and down, its rider's head bumping
 * any roof over it; down onto whichever rail it comes down on, from over
 * it: the secret line, where it's under it, or the line along the floor.
 * Into the buffers, it stops dead, and drops.
 */
function flyCart(world: World, cart: Cart) {
	const mine = world.course.mine
	if (!mine) return
	const end = mine.to - CART_WIDTH / 2
	const was = cart.feetY
	cart.x = Math.min(end, cart.x + cart.vx)
	if (cart.x >= end) cart.vx = 0
	cart.vy += GRAVITY
	cart.feetY += cart.vy
	// Up into a roof: the cave's, or the gallery's, if it's up in that;
	// or, under the secret line, its underside: no jumping up through it.
	const { gallery } = mine.secret
	const floor = world.terrain.groundY(cart.x)
	const inGallery =
		cart.x > gallery.from &&
		cart.x < gallery.to &&
		was < floor - gallery.floor + 4
	const upper = railY(world, cart.x, true)
	const roofs = [
		inGallery
			? floor - gallery.floor - gallery.room
			: world.course.cave?.ceiling(cart.x),
		!cart.secret && upper < floor && was > upper + 2 ? upper + 6 : undefined,
	].filter((roof): roof is number => roof !== undefined && roof < was)
	const roof = roofs.length ? Math.max(...roofs) : undefined
	const top =
		roof === undefined ? 0 : roof === upper + 6 ? CART_HEIGHT : RIDER_TOP
	if (cart.vy < 0 && roof !== undefined && cart.feetY - top < roof) {
		cart.feetY = roof + top
		cart.vy = 0
	}
	cart.spin = Math.max(
		-30,
		Math.min(30, (Math.atan2(cart.vy, Math.max(2, cart.vx)) * 180) / Math.PI),
	)
	if (cart.vy <= 0) return
	// Down onto a rail it's come down past: the highest of them.
	const rails = (cart.through ? [false] : [false, true])
		.map((secret) => ({ secret, y: railY(world, cart.x, secret) }))
		.filter(({ y }) => was <= y && cart.feetY >= y)
		.sort((a, b) => a.y - b.y)
	const rail = rails[0]
	if (!rail) return
	if (rail.secret && !cart.secret) {
		play('scan')
		world.popup('Up the secret line!', cart.x, rail.y - 110)
	}
	cart.secret = rail.secret
	cart.feetY = rail.y
	cart.vy = 0
	cart.air = false
	cart.through = false
	cart.spin = railTilt(world, cart.x, cart.secret)
	play('stomp')
}

/**
 * Carts with nobody in them any more (their rider's out, scooped off the
 * back of it): on down the line to the buffers on their own. And any the
 * bus reaches, flying, as anything does.
 */
export function stepCarts(world: World) {
	const mine = world.course.mine
	for (const cart of world.carts) {
		if (cart.coaster) {
			stepCoasterCart(world, cart)
			continue
		}
		if (!mine) continue
		if (cart.state === 'scooped') {
			if (cart.feetY > VIEW_HEIGHT + 300) continue
			cart.x += cart.vx
			cart.vy += GRAVITY
			cart.feetY += cart.vy
			cart.spin++
			continue
		}
		if (cart.state === 'ridden') {
			const rider = world.racers.find((r) => r.id === cart.rider)
			if (rider && !rider.out && rider.body.cart === cart.id) continue
			cart.rider = undefined
			if (rider) rider.body.cart = undefined
			// Still in the air, if they were scooped out of it jumping.
			if (cart.air) {
				flyCart(world, cart)
				continue
			}
			cart.x = Math.min(mine.to - CART_WIDTH / 2, cart.x + cart.vx)
			cart.feetY = railY(world, cart.x, cart.secret)
			cart.spin = railTilt(world, cart.x, cart.secret)
			if (cart.x >= mine.to - CART_WIDTH / 2) cart.state = 'parked'
			continue
		}
		// Waiting, or done with: the bus scoops them, as it does anything.
		if (world.bus.frontX >= cart.x - CART_WIDTH / 2) {
			cart.state = 'scooped'
			cart.vx = Math.max(world.bus.speed, 2) + 2 + Math.random() * 2
			cart.vy = -12 - Math.random() * 3
			cart.spin = 0
			world.bus.scooping = 10
		}
	}
}

/**
 * A coaster's cart: waiting, or parked at the end, deep under the course,
 * where the bus never gets to it; ridden, and its rider's out, scooped up
 * out of it, on along the track on its own.
 */
function stepCoasterCart(world: World, cart: Cart) {
	if (cart.state !== 'ridden') return
	const rider = world.racers.find((r) => r.id === cart.rider)
	if (rider && !rider.out && rider.body.cart === cart.id) return
	cart.rider = undefined
	if (rider) rider.body.cart = undefined
	if (moveCoasterCart(world, cart)) cart.state = 'parked'
}
