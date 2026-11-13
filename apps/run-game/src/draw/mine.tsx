import { createController, createObjectSignal } from 'scoopjs'
import { type JSX, createSignal } from 'solid-js'
import { seeded } from '../courses/kit/seeded'
import { railY } from '../game/carts'
import { onMole } from '../game/moles'
import { platformAt } from '../game/platforms'
import type { World } from '../game/world'
import { CART_HEIGHT, CART_WIDTH, MineCartArt } from './art/mineCart'

/**
 * The Caves' mine (see `Mine`): its rails, along the path and up the secret
 * line on its trestles to the gallery high in the rock, and the gallery
 * itself, hollowed out; its carts; and the ways the moles have dug through
 * the rock (see `moles`).
 */

const STEEL = '#9aa0a8'
const STEEL_DARK = '#5d636b'
const SLEEPER = '#5b3b22'
const TIMBER = '#8a5a32'
const TIMBER_DARK = '#5e3a1e'
const TIMBER_LIT = '#a8743f'
/** How far apart a rail's sleepers are, and a trestle's legs. */
const SLEEPERS = 14
const LEGS = 36

/**
 * Its rails and its gallery: drawn behind everyone, over the Cave's rock,
 * as the bus's bore is.
 */
export function createMine(world: World) {
	const mine = world.course.mine
	const look = world.course.look?.cave
	if (!mine || !look) return []
	const { groundY } = world.terrain
	const { secret } = mine
	const { gallery } = secret
	const random = seeded(7071)
	const left = mine.from - 40
	const right = mine.to + 40
	const ground = (x: number) => Math.round(groundY(x))
	const top =
		Math.min(ground(gallery.from), ground(gallery.to)) -
		gallery.floor -
		gallery.room -
		20
	const bottom = Math.max(ground(mine.from), ground(mine.to)) + 12
	const width = right - left
	const at = (x: number) => x - left
	const y = (value: number) => Math.round(value - top)
	/** The secret line's rail, `x` along. */
	const secretRail = (x: number) => railY(world, x, true)

	const rects: JSX.Element[] = []
	const rect = (x: number, yy: number, w: number, h: number, fill: string) =>
		rects.push(
			<rect
				x={Math.round(at(x))}
				y={y(yy)}
				width={Math.round(w)}
				height={Math.round(h)}
				fill={fill}
			/>,
		)

	// The gallery: hollowed out of the rock, its roof ragged, timbers
	// holding it up, lamps hung off them, and the glint of gold in its walls.
	const floorY = (x: number) => ground(x) - gallery.floor
	for (let x = gallery.from - 8; x < gallery.to + 8; x += 4) {
		const roof = floorY(x) - gallery.room + Math.round(random() * 3) * 2
		rect(x, roof, 4, floorY(x) + 6 - roof, look.wall)
		rect(x, roof - 2, 4, 2, look.seam)
	}
	for (let x = gallery.from + 60; x < gallery.to - 40; x += 130) {
		const floor = floorY(x)
		const beam = floor - gallery.room + 14
		rect(x - 26, beam, 4, floor - beam, TIMBER_DARK)
		rect(x + 22, beam, 4, floor - beam, TIMBER_DARK)
		rect(x - 30, beam - 6, 60, 6, TIMBER)
		rect(x - 30, beam - 6, 60, 2, TIMBER_LIT)
		// A lamp, hung off the beam, and its glow.
		rect(x - 1, beam, 2, 6, '#2b2b2b')
		rects.push(
			<circle cx={at(x)} cy={y(beam + 12)} r={22} fill="url(#mine-glow)" />,
		)
		rect(x - 3, beam + 6, 6, 8, '#3a3a3a')
		rect(x - 2, beam + 8, 4, 4, '#ffd76a')
	}
	for (let i = 0; i < (gallery.to - gallery.from) / 50; i++) {
		const x = gallery.from + random() * (gallery.to - gallery.from)
		const yy = floorY(x) - 10 - random() * (gallery.room - 26)
		rect(x, yy, 4, 2, '#f4cf47')
		rect(x + 2, yy - 2, 2, 2, '#fff2a8')
	}

	// The trestles the secret line climbs and comes back down on: legs down
	// to the floor, braced.
	for (let x = secret.from + LEGS; x < secret.to - LEGS / 2; x += LEGS) {
		if (x > gallery.from - 10 && x < gallery.to + 10) continue
		const rail = secretRail(x)
		const floor = ground(x)
		if (floor - rail < 24) continue
		rect(x - 2, rail + 4, 4, floor - rail - 4, TIMBER_DARK)
		rect(x - 1, rail + 4, 1, floor - rail - 4, TIMBER)
		for (let brace = rail + 30; brace < floor - 16; brace += 40)
			rect(x - LEGS / 2, brace, LEGS, 3, TIMBER_DARK)
	}

	// The rails: sleepers, and the rail over them. Along the path, and up
	// the secret line, to the buffers at the end.
	const railLine = (
		from: number,
		to: number,
		rail: (x: number) => number,
		step = 2,
	) => {
		for (let x = from; x < to; x += SLEEPERS)
			rect(x, Math.round(rail(x)) + 1, 6, 3, SLEEPER)
		let d = ''
		for (let x = from; x <= to; x += step)
			d += `${d ? 'L' : 'M'}${at(x)},${y(Math.round(rail(x)) - 1)}`
		rects.push(
			<>
				<path d={d} stroke={STEEL_DARK} stroke-width={3} fill="none" />
				<path
					d={d}
					stroke={STEEL}
					stroke-width={1}
					fill="none"
					transform="translate(0,-1)"
				/>
			</>,
		)
	}
	railLine(mine.from, mine.to, (x) => ground(x))
	railLine(secret.from, secret.to, secretRail)
	// The points: a lever beside them, and a sign before them, an arrow up
	// it, for the line up.
	rect(secret.from - 14, ground(secret.from) - 18, 3, 18, '#3a3a3a')
	rect(secret.from - 16, ground(secret.from) - 22, 7, 5, '#d8342c')
	const sign = secret.from - 60
	const signTop = ground(sign) - 58
	rect(sign - 2, signTop + 18, 4, 40, TIMBER_DARK)
	rect(sign - 12, signTop, 24, 22, TIMBER_DARK)
	rect(sign - 10, signTop + 2, 20, 18, '#f3c13a')
	for (const [x, y, w, h] of [
		[-1, 3, 2, 2],
		[-3, 5, 6, 2],
		[-5, 7, 10, 2],
		[-1, 9, 2, 8],
	])
		rect(sign + x, signTop + y, w, h, '#1d1d1d')
	// The buffers: a timber stop, striped.
	const stop = mine.to
	rect(stop - 4, ground(stop) - 22, 12, 22, TIMBER_DARK)
	rect(stop - 6, ground(stop) - 20, 4, 14, '#1d1d1d')
	rect(stop - 6, ground(stop) - 20, 4, 4, '#ffc21a')
	rect(stop - 6, ground(stop) - 12, 4, 4, '#ffc21a')

	return [
		createController({
			init: () => ({
				id: 'mine',
				type: 'mine',
				x: () => left,
				y: () => top,
				width: () => width,
				height: () => bottom - top,
				children: () => (
					<svg
						width={width}
						height={bottom - top}
						shape-rendering="crispEdges"
						aria-hidden="true"
						style={{ display: 'block', overflow: 'visible' }}
					>
						<defs>
							<radialGradient id="mine-glow">
								<stop offset="0%" stop-color="rgba(255, 214, 120, 0.45)" />
								<stop offset="100%" stop-color="rgba(255, 214, 120, 0)" />
							</radialGradient>
						</defs>
						{rects}
					</svg>
				),
			}),
		}),
	]
}

/** The carts: on the rails, tipped up and down the trestles with them. */
export function createMineCarts(world: World) {
	return world.carts.map((cart) => {
		const [loaded, setLoaded] = createSignal(true)
		return createController({
			init: () => ({
				id: `cart-${cart.id}`,
				// In front of whoever's in it: sat down inside, over their legs.
				type: 'cart',
				...createObjectSignal(cart.x - CART_WIDTH / 2, 'x'),
				...createObjectSignal(cart.feetY - CART_HEIGHT, 'y'),
				...createObjectSignal(0, 'rotation'),
				width: () => CART_WIDTH,
				height: () => CART_HEIGHT,
				origin: () => ({ x: CART_WIDTH / 2, y: CART_HEIGHT }),
				children: () => <MineCartArt loaded={loaded()} />,
			}),
			onEnterFrame({ $ }) {
				$.setX(cart.x - CART_WIDTH / 2)
				$.setY(cart.feetY - CART_HEIGHT)
				setLoaded(cart.state === 'waiting')
				if (cart.state === 'scooped') {
					$.setRotation(cart.spin * 14)
					return
				}
				// Along the rail under it.
				const ahead = railY(world, cart.x + 10, cart.secret)
				const behind = railY(world, cart.x - 10, cart.secret)
				$.setRotation((Math.atan2(ahead - behind, 20) * 180) / Math.PI)
			},
		})
	})
}

/** How often the ways dug are redrawn, in ticks. */
const TRAIL_EVERY = 3
/** How big a mole's hole through the rock is, round it and whoever's on it, and how far up from their feet its middle is. */
const HOLE = 34
const HOLE_UP = 38

/**
 * The ways moles have dug through the rock: along the very line each hopped,
 * wherever it was in the rock, the rock hollowed out round it. There for
 * everyone to see, for the rest of the race.
 */
export function createMoleTrails(world: World) {
	const { cave } = world.course
	const look = world.course.look?.cave
	if (world.course.ride !== 'mole' || !cave || !look) return []
	const { terrain } = world
	const left = cave.from
	const width = cave.to - cave.from
	/** As high as the rock goes over the path, and down to the floor. */
	let top = Number.POSITIVE_INFINITY
	let bottom = Number.NEGATIVE_INFINITY
	for (let x = cave.from; x < cave.to; x += 16) {
		const ground = terrain.groundY(x)
		top = Math.min(top, ground - 420)
		bottom = Math.max(bottom, ground)
	}
	top = Math.round(top)
	bottom = Math.round(bottom)
	// The rock, where a hole can be: the Cave's, from its Ceiling up, and
	// its solid shelves.
	let rock = ''
	for (let x = cave.from; x < cave.to; x += 4) {
		const ceiling = cave.ceiling(x + 2)
		if (ceiling === undefined) continue
		const surface = Math.max(top, cave.surface(x + 2) ?? top)
		if (ceiling > surface)
			rock += `M${x - left},${Math.round(surface - top)}h4V${Math.round(ceiling - top)}h-4Z`
	}
	for (const platform of world.platforms) {
		if (!platform.solid) continue
		const at = platformAt(terrain, platform, 0)
		rock += `M${Math.round(at.left - left)},${Math.round(at.top - top)}H${Math.round(at.right - left)}v${platform.solid}H${Math.round(at.left - left)}Z`
	}

	/**
	 * The holes dug, a 4 px column at a time, as the bus's bore is: in each,
	 * the spans of it dug out, top to bottom, merged as they overlap.
	 */
	const dug = new Map<number, [number, number][]>()
	/** Dig out round `x`, `y`: every column within a hole's reach of it, its edges a little ragged. */
	const dig = (x: number, y: number) => {
		for (
			let c = Math.floor((x - HOLE) / 4);
			c <= Math.floor((x + HOLE) / 4);
			c++
		) {
			const across = c * 4 + 2 - x
			const half = Math.sqrt(HOLE * HOLE - across * across)
			if (!(half > 2)) continue
			const rough = (n: number) =>
				(Math.abs(Math.sin(c * 12.9898 + n * 78.233)) * 43758.5453) % 1 < 0.5
					? 0
					: 2
			const span: [number, number] = [
				Math.round((y - half) / 2) * 2 - rough(Math.round(y / 8)),
				Math.round((y + half) / 2) * 2 + rough(Math.round(y / 8) + 1),
			]
			const spans = dug.get(c) ?? []
			const merged: [number, number][] = []
			for (const s of [...spans, span].sort((a, b) => a[0] - b[0])) {
				const last = merged[merged.length - 1]
				if (last && s[0] <= last[1]) last[1] = Math.max(last[1], s[1])
				else merged.push([s[0], s[1]])
			}
			dug.set(c, merged)
		}
	}
	/** Where each racer was last dug round, to dig on from: the gaps between ticks too. */
	const was = world.racers.map(() => undefined as [number, number] | undefined)
	const [holes, setHoles] = createSignal('')
	const [rims, setRims] = createSignal('')
	/** Dug further since they were last drawn. */
	let dirty = false
	return [
		createController({
			init: () => ({
				id: 'mole-trails',
				type: 'mole-trail',
				x: () => left,
				y: () => top,
				width: () => width,
				height: () => bottom - top,
				children: () => (
					<svg
						width={width}
						height={bottom - top}
						shape-rendering="crispEdges"
						aria-hidden="true"
						style={{ display: 'block' }}
					>
						<defs>
							<clipPath id="mole-rock">
								<path d={rock} />
							</clipPath>
						</defs>
						{/* Broken rock round its edges, and the hole, the back wall through it. */}
						<g clip-path="url(#mole-rock)">
							<path d={rims()} fill={look.seam} />
							<path d={holes()} fill={look.wall} />
						</g>
					</svg>
				),
			}),
			onEnterFrame() {
				world.racers.forEach((racer, i) => {
					const b = racer.body
					if (!onMole(world, b) || racer.out) {
						was[i] = undefined
						return
					}
					const x = b.x - left
					const y = b.feetY - HOLE_UP - top
					const from = was[i]
					if (from && Math.abs(from[0] - x) < 2 && Math.abs(from[1] - y) < 2)
						return
					// Along from where it was, so a fast drop leaves no gaps.
					const steps = from
						? Math.max(1, Math.ceil(Math.hypot(x - from[0], y - from[1]) / 6))
						: 1
					for (let k = 1; k <= steps; k++)
						dig(
							from ? from[0] + ((x - from[0]) * k) / steps : x,
							from ? from[1] + ((y - from[1]) * k) / steps : y,
						)
					was[i] = [x, y]
					dirty = true
				})
				// Redrawn every few ticks, not every one: it's as long as the Cave.
				if (!dirty || world.ticks() % TRAIL_EVERY) return
				dirty = false
				let hole = ''
				let rim = ''
				for (const [c, spans] of dug)
					for (const [from, to] of spans) {
						hole += `M${c * 4},${from}h4V${to}h-4Z`
						rim += `M${c * 4},${from - 4}h4v4h-4ZM${c * 4},${to}h4v2h-4Z`
					}
				setHoles(hole)
				setRims(rim)
			},
		}),
	]
}
