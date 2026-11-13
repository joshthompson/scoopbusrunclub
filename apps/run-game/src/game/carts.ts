import type { Course } from '../courses/types'
import { CART_HEIGHT, CART_WIDTH } from '../draw/art/mineCart'
import { collect } from '../saved/collected'
import { play } from '../sfx'
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
	/** Sent up the secret line at the points: up was held, going into them. */
	secret: boolean
	/** Been through the points, one way or the other. */
	switched: boolean
	/** Whoever's in it's been told they can switch them. */
	told: boolean
	/** Degrees, flying out of the scoop. */
	spin: number
}

/** How far up off the rail whoever's in one sits: on its floor, the tub over their legs. */
export const CART_SEAT = 12
/** How fast one goes, once it's got going, and how quickly it gets going. */
const CART_SPEED = 10
const CART_PUSH = 0.3
/** How close to one's middle you have to get to be in it, and how high over its lip you can be and still land in it. */
const BOARD_REACH = CART_WIDTH / 2
const BOARD_OVER = 16
/**
 * How far before the points whoever's in a cart is told they can switch
 * them, and from how far before them holding up does.
 */
const POINTS_TOLD = 420
const POINTS_REACH = 200
/** Out at the buffers: thrown up and on out of it. */
const BUFFER_HOP = 6
const BUFFER_KEEP = 0.9

/** A course's carts, waiting at the start. */
export function createCarts(world: {
	course: Course
	terrain: Terrain
}): Cart[] {
	return (world.course.mine?.carts ?? []).map((x, id) => ({
		id,
		x,
		feetY: world.terrain.groundY(x),
		vx: 0,
		vy: 0,
		state: 'waiting',
		secret: false,
		switched: false,
		told: false,
		spin: 0,
	}))
}

/** The rail under a cart at `x`: along the Ground, or up the secret line, if it's on it. */
export function railY(world: World, x: number, secret: boolean) {
	const ground = world.terrain.groundY(x)
	const line = world.course.mine?.secret
	if (!secret || !line || x < line.from || x >= line.to) return ground
	return ground - line.height(x)
}

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
 * Riding a cart, down the line: along the rails, faster and faster up to
 * its speed, sat down in it; at the points, up the secret line if they're
 * holding `up` going into them; and at the buffers, thrown out of it, on
 * their way again.
 */
export function rideCart(world: World, racer: Racer, up: boolean) {
	const b = racer.body
	const cart = b.cart === undefined ? undefined : world.carts[b.cart]
	const mine = world.course.mine
	if (!cart || !mine) {
		b.cart = undefined
		return
	}
	cart.vx = Math.min(CART_SPEED, cart.vx + CART_PUSH)
	cart.x += cart.vx
	const toPoints = mine.secret.from - cart.x
	// Coming up to the points: told they can switch them.
	if (!cart.told && toPoints < POINTS_TOLD) {
		cart.told = true
		world.popup('Hold ↑ to go up!', cart.x, cart.feetY - 110)
	}
	// Holding up going into them: they're switched, up the secret line.
	if (!cart.switched && up && toPoints < POINTS_REACH) cart.secret = true
	if (!cart.switched && cart.x >= mine.secret.from) {
		cart.switched = true
		if (cart.secret) {
			play('scan')
			world.popup('Up the secret line!', cart.x, cart.feetY - 110)
		}
	}
	cart.feetY = railY(world, cart.x, cart.secret)
	b.x = cart.x
	b.feetY = cart.feetY - CART_SEAT
	b.vx = cart.vx
	b.vy = 0
	b.grounded = true
	b.jumping = false
	b.on = undefined
	b.ducking = true
	b.facing = 1
	b.floor = b.feetY
	if (cart.x < mine.to - CART_WIDTH / 2) return
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
 * Carts with nobody in them any more (their rider's out, scooped off the
 * back of it): on down the line to the buffers on their own. And any the
 * bus reaches, flying, as anything does.
 */
export function stepCarts(world: World) {
	const mine = world.course.mine
	if (!mine) return
	for (const cart of world.carts) {
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
			cart.x = Math.min(mine.to - CART_WIDTH / 2, cart.x + cart.vx)
			cart.feetY = railY(world, cart.x, cart.secret)
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
