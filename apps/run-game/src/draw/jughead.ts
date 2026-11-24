import { createController, createObjectSignal } from 'scoopjs'
import type { JSX } from 'solid-js'
import {
	BATHROOM,
	BATHROOM_HEIGHT,
	BATHROOM_WIDTH,
	TUBE,
	WALL_FOOT_Y,
} from '../courses/kit/bathroomScenery'
import { VIEW_HEIGHT, VIEW_WIDTH } from '../game/constants'
import type { Racer, World } from '../game/world'
import { ARENA_LEFT } from '../minigames/arena'
import {
	FLOOR_Y,
	JET_HALF,
	JUG_CELL,
	JUG_ROWS,
	JUG_SINK,
	JUG_TALL,
	type Jet,
	MOUTH_HALF,
	PUDDLES_TILL,
	RISEN_AT,
	WARN_TICKS,
	WATER_FALL,
	depthIn,
	findHeadsBy,
	floodTopOf,
	jetAt,
	jetEnds,
	jugFootOf,
	jugheadOf,
	mouthOf,
	running,
	surfaceOf,
} from '../minigames/jughead'
import { paintPicture } from './paint/picture'
import { headFromFeetOf } from './sprites'

/** Everything's drawn a cell at a time: 2 px. */
const CELL = 2
/** How far apart, in ticks along it, an arc's blobs of water are: close, so it's smooth. */
const ARC_STEP = 0.5
/** Water: its body, lit and shaded edges, and deep down in a jug. */
const WATER = '#3f8fe0'
const WATER_LIT = '#a8dcff'
const WATER_SHADE = '#2a6cb8'
const WATER_DEEP = '#2f74c4'
const FOAM = '#e8f6ff'
/** The jug's glass: see-through inside, its walls lit and shaded, its lip, its foot, a shine. */
const GLASS_INSIDE = 'rgba(196, 228, 255, 0.35)'
const GLASS_LIT = '#d6ecf7'
const GLASS_SHADE = '#8fb4c8'
const GLASS_LIP = '#eef8fd'
const GLASS_FOOT = '#a8c8d8'
const GLASS_SHINE = '#ffffff'
/** The tube: its housing, chains; lit, and off; its glow, which is air. */
const HOUSING = '#5b5e5a'
const HOUSING_LIT = '#7d807a'
const TUBE_ON = '#f6fbe8'
const TUBE_OFF = '#8a8f86'
const TUBE_GLOW = 'rgba(246, 251, 220, 0.10)'
const CHAIN = '#4a4c48'
/**
 * The straps the jug's held on by: red, lit and shaded; how far up from
 * the jug's foot, in its rows, the band round it is; and how far either
 * side of their head's middle the headband goes.
 */
const BAND = '#d8342c'
const BAND_LIT = '#f47a70'
const BAND_SHADE = '#9c1f1a'
const RING_UP = 4
const BAND_HALF = 10
/** Spilt drops: how fast they fall, how many at most a tick and for how much spilt, and how big puddles grow and their most. */
const DROP_FALL = 0.3
const DROPS_A_TICK = 12
const DROPS_FOR = 1200
/** Spilt all at once, this much or more (bounced on): a burst of this many. */
const BURST_FROM = 0.04
const BURST_DROPS = 40
const PUDDLE_GROWS = 0.15
const PUDDLE_MOST = 26
/**
 * The flood: murky, see-through, over the floor and their legs; its top
 * lit, glints going along it; a stain under the pipe where a seam seeps.
 */
const FLOOD = 'rgba(78, 128, 140, 0.55)'
const FLOOD_TOP = '#9fcbd6'
const FLOOD_GLINT = '#e2f4f8'
const SEEP_STAIN = '#3c2a1e'
/**
 * Till the flood's come up off the bottom of the screen, it's puddles on
 * the floor: spilt ones, and these, in their own spots over it, each from its
 * own share of the way there, spreading till they've joined up over the
 * whole floor: this far either side, at most, and this flat.
 */
const POOLS = 14
const POOL_MOST = 120
const POOL_FLAT = 0.35

/** A ring, where a drop's gone into the flood: how long it spreads for. */
const RING_TICKS = 14
/** How far apart a seep's drops fall, across it; and how many are falling down each column of it at once. */
const SEEP_GAP = 4
const SEEP_DROPS = 4

/** A number from a seed, the same every time, 0 to 1. */
function hash(n: number) {
	let h = Math.imul(n * 374761393 + 668265263, 1274126177)
	h ^= h >>> 13
	h = Math.imul(h, 1103515245)
	return ((h >>> 0) % 10000) / 10000
}

const snap = (n: number) => Math.round(n / CELL) * CELL

/**
 * Jughead, drawn. Behind it all, the bathroom, and its fluorescent tube,
 * flickering. Behind everyone: the water, streams down out of the spouts
 * (dripping first, a warning), arcs out of the toilet, sinks and urinal,
 * splashing on the floor, puddling. In front: everyone's glass jug on
 * their head, the water in it sloshing, splashing as it's filled, and
 * drops spilt out of it, flying off and splatting on the floor.
 */
export function createJughead(world: World) {
	const found = jugheadOf(world)
	if (!found) return []
	const show = found
	// The jugs go on heads where they're drawn, and so does the water.
	findHeadsBy((racer) => headFromFeetOf(racer.body))
	const across = (x: number) => x - ARENA_LEFT

	/** One picture over the whole screen: `type` says what it's in front of. */
	const layer = (
		id: string,
		type: string,
		paint: (
			ctx: CanvasRenderingContext2D,
			image: Parameters<typeof paintPicture>[1],
			now: number,
		) => void,
	) =>
		createController({
			init: () => ({
				id,
				type,
				...createObjectSignal(ARENA_LEFT, 'x'),
				...createObjectSignal(0, 'y'),
				...createObjectSignal({} as JSX.CSSProperties, 'style'),
				width: () => VIEW_WIDTH,
				height: () => VIEW_HEIGHT,
			}),
			draw({ ctx, image }) {
				ctx.imageSmoothingEnabled = false
				// Read the tick, so it's painted again every one.
				paint(ctx, image, world.ticks())
			},
		})

	// Drops spilt out of jugs (or splashed up wading), flying; and how full each was last time, to see what's been spilt.
	const drops: {
		x: number
		y: number
		vx: number
		vy: number
		small?: boolean
	}[] = []
	// Rings spreading on the flood, where drops went in.
	const rings: { x: number; at: number }[] = []
	const wasFull = new Map<string, number>()
	/** Where the floor's flooding from: spots all over it, each with how big it gets and from when. */
	const pools = Array.from({ length: POOLS }, (_, i) => ({
		x: ((i + 0.15 + hash(i * 7 + 1) * 0.7) * VIEW_WIDTH) / POOLS,
		y: WALL_FOOT_Y + 6 + hash(i * 7 + 2) * (VIEW_HEIGHT - WALL_FOOT_Y - 12),
		grows: 0.65 + hash(i * 7 + 3) * 0.6,
		from: hash(i * 7 + 4) * 0.45,
	}))
	/** The floor's cells under water just now, row by row from the wall's foot: puddles, then the flood. */
	const floorCols = VIEW_WIDTH / CELL
	const floorRows = Math.ceil((VIEW_HEIGHT - WALL_FOOT_Y) / CELL)
	const wet = new Uint8Array(floorCols * floorRows)
	// Puddles on the floor, by where they are, a cell at a time, and how big.
	const puddles = new Map<number, number>()
	const puddle = (x: number, by: number) => {
		const at = snap(across(x) / 8) * 8
		puddles.set(at, Math.min(PUDDLE_MOST, (puddles.get(at) ?? 0) + by))
	}
	let lastTick = -1

	const room = layer('jug-room', 'scenery', (ctx, image, now) => {
		paintPicture(ctx, image, BATHROOM, 0, 0, BATHROOM_WIDTH, BATHROOM_HEIGHT)
		paintTube(ctx, now)
	})

	const water = layer('jug-water', 'boost', (ctx, _image, now) => {
		const race = world.raceTicks()
		paintPuddles(ctx)
		paintFloodBehind(ctx)
		for (const jet of show.jets) paintJet(ctx, jet, race, now)
	})

	// The flood in front of them, over their legs; under the jugs.
	const flood = layer('jug-flood', 'hat', (ctx, _image, now) =>
		paintFloodFront(ctx, now),
	)

	const jugs = layer('jug-jugs', 'furby', (ctx, _image, now) => {
		const race = world.raceTicks()
		// Once a tick: what's been spilt, flying off as drops; drops falling.
		if (now !== lastTick) {
			lastTick = now
			stepDrops()
		}
		for (const racer of show.racers) paintJug(ctx, racer, now)
		// Splashing up out of whoever's catching.
		for (const jet of show.jets) {
			if (!running(jet, race) || jet.kind === 'seep') continue
			const end = jetEnds(jet, show.racers, race, surfaceOf(show))
			if (end.racer) paintSplash(ctx, end.at.x, end.at.y, jet, now, 3)
		}
		for (const d of drops) {
			const x = snap(across(d.x))
			const y = snap(d.y)
			if (d.small) {
				ctx.fillStyle = FOAM
				ctx.fillRect(x, y, CELL, CELL)
				continue
			}
			// Spilt: big drops, lit on top, stretched falling fast.
			ctx.fillStyle = WATER
			ctx.fillRect(x, y, CELL * 2, d.vy > 2 ? CELL * 3 : CELL * 2)
			ctx.fillStyle = WATER_LIT
			ctx.fillRect(x, y, CELL, CELL)
		}
	})

	/** Drops off every jug that's lost some since last tick, off its high side; and every drop, falling, splatting. */
	function stepDrops() {
		for (const racer of show.racers) {
			const jug = show.jugs.get(racer.id)
			if (!jug) continue
			const before = wasFull.get(racer.id) ?? jug.fill
			wasFull.set(racer.id, jug.fill)
			const lost = before - jug.fill
			if (lost > 0.0003) {
				const tipped = Math.sign(jug.tilt) || racer.body.facing
				const top = mouthOf(racer).y
				// A lot at once (bounced on): a burst, out of both sides, higher.
				const burst = lost >= BURST_FROM
				const n = Math.min(
					burst ? BURST_DROPS : DROPS_A_TICK,
					Math.ceil(lost * DROPS_FOR),
				)
				for (let i = 0; i < n; i++) {
					const side = burst && i % 2 ? -tipped : tipped
					drops.push({
						x: racer.body.x + side * (6 + Math.random() * 6),
						y: top + Math.random() * 6,
						vx:
							side * (0.8 + Math.random() * (burst ? 3.4 : 2.2)) +
							racer.body.vx * 0.5,
						vy: -(0.8 + Math.random() * (burst ? 4.5 : 2.4)),
					})
				}
			}
			// Wading: splashing up round their legs, more the faster.
			const b = racer.body
			const pace = Math.abs(b.vx)
			if (
				wetUnder(b.x) &&
				b.grounded &&
				pace > 0.6 &&
				Math.random() < 0.3 + pace * 0.25
			)
				drops.push({
					x: b.x + (Math.random() - 0.3) * 10 * Math.sign(b.vx),
					y: Math.min(FLOOR_Y, surfaceOf(show)) - CELL,
					vx: (Math.random() - 0.5) * 2 + b.vx * 0.4,
					vy: -(0.8 + Math.random() * 1.6),
					small: true,
				})
		}
		const surface = surfaceOf(show)
		const flooded = isFlooded()
		// Under it, the puddles are gone.
		if (show.flood >= RISEN_AT) puddles.clear()
		for (let i = drops.length - 1; i >= 0; i--) {
			const d = drops[i]
			d.vy += DROP_FALL
			d.x += d.vx
			d.y += d.vy
			if (d.y >= surface && d.vy > 0) {
				if (flooded) {
					if (!d.small || Math.random() < 0.3)
						rings.push({ x: d.x, at: lastTick })
				} else puddle(d.x, PUDDLE_GROWS)
				drops.splice(i, 1)
			}
		}
		for (let i = rings.length - 1; i >= 0; i--)
			if (lastTick - rings[i].at > RING_TICKS) rings.splice(i, 1)
		// Streams on the floor, puddling.
		if (flooded) return
		const race = world.raceTicks()
		for (const jet of show.jets) {
			if (!running(jet, race)) continue
			const end = jetEnds(jet, show.racers, race, surface)
			if (!end.racer) puddle(end.at.x, PUDDLE_GROWS * 0.3)
		}
	}

	/** Whether the puddles have all joined up, and it's coming up off the bottom of the screen. */
	const isFlooded = () => show.flood >= PUDDLES_TILL
	/** Whether the floor's wet, under their feet, `x` in the world. */
	function wetUnder(x: number) {
		if (isFlooded()) return true
		const col = Math.floor(across(x) / CELL)
		const row = Math.floor((FLOOR_Y - WALL_FOOT_Y) / CELL)
		return col >= 0 && col < floorCols && wet[row * floorCols + col] === 1
	}

	/**
	 * Puddles on the floor, till it's all one flood: spilt ones, and the
	 * flood's coming up in spots all over it, spreading as it rises till
	 * they've joined up. Each a flat oval, flat on the floor; all of them
	 * painted as one, so where they meet they're one puddle, lit along
	 * their far edges.
	 */
	function paintPuddles(ctx: CanvasRenderingContext2D) {
		wet.fill(0)
		if (show.flood >= RISEN_AT) return
		const share = show.flood / PUDDLES_TILL
		// Not under the flood coming up in front: that's painted over them.
		const under = Math.min(
			floorRows,
			Math.floor((snap(floodTopOf(show)) - WALL_FOOT_Y) / CELL),
		)
		const pool = (x: number, y: number, half: number) => {
			if (half < CELL * 2) return
			const tall = Math.max(CELL, half * POOL_FLAT)
			const from = Math.max(0, Math.floor((y - tall - WALL_FOOT_Y) / CELL))
			const to = Math.min(
				under - 1,
				Math.floor((y + tall - WALL_FOOT_Y) / CELL),
			)
			for (let row = from; row <= to; row++) {
				const dy = (WALL_FOOT_Y + row * CELL - y) / tall
				const w = half * Math.sqrt(Math.max(0, 1 - dy * dy))
				const left = Math.max(0, Math.round((x - w) / CELL))
				const right = Math.min(floorCols, Math.round((x + w) / CELL))
				if (right > left)
					wet.fill(1, row * floorCols + left, row * floorCols + right)
			}
		}
		for (const p of pools) {
			const grown = Math.min(4, Math.max(0, (share - p.from) / (1 - p.from)))
			pool(p.x, p.y, grown * POOL_MOST * p.grows)
		}
		for (const [x, size] of puddles)
			pool(x, FLOOR_Y + 4, size + share * POOL_MOST * 0.6)
		// Painted a row at a time, in runs; lit along their far edges.
		for (let row = 0; row < floorRows; row++) {
			const y = WALL_FOOT_Y + row * CELL
			let start = -1
			for (let col = 0; col <= floorCols; col++) {
				const isWet = col < floorCols && wet[row * floorCols + col] === 1
				if (isWet && start < 0) start = col
				if (!isWet && start >= 0) {
					ctx.fillStyle = FLOOD
					ctx.fillRect(start * CELL, y, (col - start) * CELL, CELL)
					start = -1
				}
			}
			ctx.fillStyle = FLOOD_TOP
			for (let col = 0; col < floorCols; col++)
				if (
					wet[row * floorCols + col] === 1 &&
					(row === 0 || wet[(row - 1) * floorCols + col] === 0)
				)
					ctx.fillRect(col * CELL, y, CELL, CELL)
		}
	}

	/** The flood behind them: from where it's come up the wall, over the floor, to its near top. */
	function paintFloodBehind(ctx: CanvasRenderingContext2D) {
		if (show.flood < RISEN_AT) return
		const wall = WALL_FOOT_Y - snap(show.flood - RISEN_AT)
		const top = snap(floodTopOf(show))
		ctx.fillStyle = FLOOD
		ctx.fillRect(0, wall, VIEW_WIDTH, top - wall)
		// Its line up the wall.
		ctx.fillStyle = FLOOD_TOP
		ctx.fillRect(0, wall, VIEW_WIDTH, CELL)
	}

	/**
	 * The flood in front of them, from its top down over their legs: its top
	 * lit, glints drifting along it; wakes either side of anyone wading;
	 * rings spreading where drops have gone in.
	 */
	function paintFloodFront(ctx: CanvasRenderingContext2D, now: number) {
		if (!isFlooded()) return
		const top = snap(floodTopOf(show))
		if (top < VIEW_HEIGHT) {
			ctx.fillStyle = FLOOD
			ctx.fillRect(0, top, VIEW_WIDTH, VIEW_HEIGHT - top)
			ctx.fillStyle = FLOOD_TOP
			ctx.fillRect(0, top, VIEW_WIDTH, CELL)
			ctx.fillStyle = FLOOD_GLINT
			for (let x = 0; x < VIEW_WIDTH; x += CELL * 4) {
				const drift = Math.floor((x + now * 0.4) / 16)
				if (hash(drift) < 0.22)
					ctx.fillRect(snap(x), top, CELL * (2 + (drift % 2)), CELL)
			}
		}
		// Wakes: the water heaped either side of their legs, more ahead.
		for (const racer of show.racers) {
			if (depthIn(show, racer) < CELL) continue
			const b = racer.body
			const x = snap(across(b.x))
			const ahead = b.vx === 0 ? 0 : Math.sign(b.vx)
			const push = Math.min(3, Math.abs(b.vx))
			ctx.fillStyle = FLOOD_GLINT
			ctx.fillRect(x - CELL * 4, top - CELL, CELL * 8, CELL)
			if (ahead && push > 0.6) {
				const front = x + ahead * (CELL * 5)
				ctx.fillRect(
					ahead > 0 ? front : front - CELL * 2,
					top - CELL * 2,
					CELL * 2,
					CELL,
				)
				ctx.fillStyle = FLOOD_TOP
				for (let k = 1; k <= Math.round(push); k++)
					ctx.fillRect(x - ahead * (CELL * (4 + k * 3)), top, CELL * 2, CELL)
			}
		}
		// Rings, spreading out, where the water is: on the floor, till it's
		// come up over it.
		const level = snap(surfaceOf(show))
		ctx.fillStyle = FLOOD_GLINT
		for (const ring of rings) {
			const age = now - ring.at
			const out = snap(CELL + age * 0.8)
			const x = snap(across(ring.x))
			ctx.fillRect(x - out - CELL, level, CELL * 2, CELL)
			ctx.fillRect(x + out, level, CELL * 2, CELL)
			if (age < 4) ctx.fillRect(x, level - CELL * 2, CELL, CELL * 2)
		}
	}

	/** The fluorescent tube, hung on its chains, flickering: now and then off a moment, or stuttering. */
	function paintTube(ctx: CanvasRenderingContext2D, now: number) {
		const left = snap(TUBE.x - TUBE.width / 2)
		const stutter = now % 900 < 50 && now % 6 < 3
		const blink = now % 337 < 4 || (now % 337 > 9 && now % 337 < 12)
		const on = !stutter && !blink
		ctx.fillStyle = CHAIN
		for (const x of [left + 10, left + TUBE.width - 12])
			for (let y = 58; y < TUBE.y - 4; y += 4) ctx.fillRect(x, y, CELL, CELL)
		if (on) {
			ctx.fillStyle = TUBE_GLOW
			for (const grow of [40, 24, 12])
				ctx.fillRect(
					left - grow,
					TUBE.y - grow / 2,
					TUBE.width + grow * 2,
					grow + 8,
				)
		}
		ctx.fillStyle = HOUSING
		ctx.fillRect(left, TUBE.y - 4, TUBE.width, 6)
		ctx.fillStyle = HOUSING_LIT
		ctx.fillRect(left, TUBE.y - 4, TUBE.width, CELL)
		ctx.fillStyle = on ? TUBE_ON : TUBE_OFF
		ctx.fillRect(left + 4, TUBE.y + 2, TUBE.width - 8, CELL * 2)
		// One end's gone dark, the way they do.
		ctx.fillStyle = '#4a4f46'
		ctx.fillRect(left + 4, TUBE.y + 2, 6, CELL * 2)
	}

	/**
	 * A jet: dripping out of its spout, before it runs, a warning; running,
	 * a stream straight down, wobbling, light running down it, or an arc,
	 * to wherever it ends, in a jug or on the floor, splashing there.
	 */
	function paintJet(
		ctx: CanvasRenderingContext2D,
		jet: Jet,
		race: number,
		now: number,
	) {
		const x = across(jet.x)
		if (jet.kind === 'seep') {
			paintSeep(ctx, jet, now)
			return
		}
		if (jet.kind === 'drip' || race < jet.from) {
			if (race < jet.from - WARN_TICKS) return
			// Drops, one after another, falling from it.
			const every = jet.kind === 'drip' ? 34 : 12
			for (let k = 0; k < 4; k++) {
				const age = (now + k * every) % (every * 4)
				const y = jet.y + (WATER_FALL * age * age) / 2
				if (y > surfaceOf(show)) continue
				ctx.fillStyle = WATER
				ctx.fillRect(snap(x), snap(y), CELL, CELL * 2)
				ctx.fillStyle = WATER_LIT
				ctx.fillRect(snap(x), snap(y), CELL, CELL)
			}
			ctx.fillStyle = WATER
			ctx.fillRect(snap(x) - CELL, jet.y, CELL * 2, CELL)
			return
		}
		if (!running(jet, race)) return
		const end = jetEnds(jet, show.racers, race, surfaceOf(show))
		const half = JET_HALF[jet.kind] * Math.max(1, jet.strength * 0.9)
		// Its head, still falling, just started.
		const since = race - jet.from
		const reach = jet.vx === 0 && jet.vy === 0 ? since * 2 : since * 1.2
		const t = Math.min(end.t, reach)
		if (jet.vx === 0) {
			const top = jet.y
			// Into a jug: on a little, behind its lip, so there's no gap as
			// their head bobs.
			const into = end.racer && t >= end.t ? CELL * 2 : 0
			const bottom = Math.min(end.at.y, jetAt(jet, t).y) + into
			const w = snap(half * 2)
			for (let y = snap(top); y < bottom; y += CELL * 4) {
				const wobble = hash(Math.floor((y + now * 3) / 8)) < 0.3 ? CELL : 0
				const h = Math.min(CELL * 4, bottom - y)
				ctx.fillStyle = WATER
				ctx.fillRect(snap(x - half) + wobble, y, w, h)
				ctx.fillStyle = WATER_SHADE
				ctx.fillRect(snap(x - half) + wobble + w - CELL, y, CELL, h)
				ctx.fillStyle = WATER_LIT
				ctx.fillRect(snap(x - half) + wobble, y, CELL, h)
			}
			// Light running down it.
			ctx.fillStyle = FOAM
			for (let k = 0; k < 3; k++) {
				const y = top + ((now * 6 + k * 41) % Math.max(1, bottom - top))
				ctx.fillRect(snap(x), snap(y), CELL, CELL * 2)
			}
		} else {
			// An arc: round blobs of water, close along it, each where what left
			// its spout then has got to, so a swaying fountain bends as it
			// swings; shaded under, lit along the top, foam running out along
			// it, and frothing where it bursts out.
			const r = Math.max(CELL * 1.5, half)
			const along: { x: number; y: number }[] = []
			for (let s = 0; s <= t; s += ARC_STEP) {
				const at = jetAt(jet, s, race)
				along.push({ x: across(at.x), y: at.y })
			}
			for (const at of along) paintBlob(ctx, at.x, at.y + CELL, r, WATER_SHADE)
			for (const at of along) paintBlob(ctx, at.x, at.y, r, WATER)
			ctx.fillStyle = WATER_LIT
			for (const at of along)
				ctx.fillRect(snap(at.x - r * 0.5), snap(at.y - r + CELL), snap(r), CELL)
			ctx.fillStyle = FOAM
			for (let k = 0; k < 6 && t > 0; k++) {
				const s = (now * 0.9 + (k * t) / 6) % t
				const at = jetAt(jet, s, race)
				ctx.fillRect(
					snap(across(at.x) - CELL),
					snap(at.y - CELL),
					CELL * 2,
					CELL,
				)
			}
			if (jet.kind === 'fountain') {
				const froth = r + CELL * (1 + (Math.floor(now / 4) % 2))
				paintBlob(ctx, x, jet.y, froth, FOAM)
				paintBlob(ctx, x, jet.y + CELL, froth - CELL, WATER_LIT)
			}
			// Bits breaking off it.
			for (let k = 0; k < 5; k++) {
				const s = t * ((now * 0.02 + k * 0.21) % 1)
				const at = jetAt(jet, s, race)
				ctx.fillStyle = FOAM
				ctx.fillRect(
					snap(across(at.x) + (hash(k + now) - 0.5) * 12),
					snap(at.y + (hash(k * 3 + now) - 0.5) * 12),
					CELL,
					CELL,
				)
			}
		}
		if (!end.racer && t >= end.t)
			paintSplash(ctx, end.at.x, end.at.y, jet, now, 5)
	}

	/**
	 * A seam along the pipe, seeping: a wet stain along its underside, beads
	 * hanging off it, and drops falling all along it, each its own pace,
	 * into whichever jug's under it, or the floor.
	 */
	function paintSeep(ctx: CanvasRenderingContext2D, jet: Jet, now: number) {
		const half = snap(JET_HALF[jet.kind])
		const left = snap(across(jet.x)) - half
		// The seam, wet: dark along the pipe's underside, glistening under.
		ctx.fillStyle = SEEP_STAIN
		ctx.fillRect(
			left - CELL * 2,
			jet.y - CELL * 2,
			half * 2 + CELL * 4,
			CELL * 2,
		)
		ctx.fillStyle = WATER_SHADE
		ctx.fillRect(left - CELL, jet.y, half * 2 + CELL * 2, CELL)
		const floor = surfaceOf(show)
		for (let c = 0; c * SEEP_GAP <= half * 2; c++) {
			const seed = jet.id * 31 + c
			const x = left + c * SEEP_GAP
			// Down to the first jug under it, or the floor.
			let end = floor
			for (const racer of show.racers) {
				const mouth = mouthOf(racer)
				if (Math.abs(across(mouth.x) - x) <= MOUTH_HALF && mouth.y < end)
					end = mouth.y
			}
			// Drops one after another, evenly, each column its own pace: a
			// bead swelling under the seam, then off, stretching as it falls,
			// and a splash where it lands.
			const falls = Math.sqrt((2 * Math.max(CELL, end - jet.y)) / WATER_FALL)
			const every = Math.round(falls / SEEP_DROPS + 4 + hash(seed + 7) * 10)
			const age =
				(now + Math.floor(hash(seed + 3) * every * SEEP_DROPS)) % every
			ctx.fillStyle = WATER
			ctx.fillRect(x, jet.y + CELL, CELL, age > every / 2 ? CELL * 2 : CELL)
			for (let k = 0; k * every < falls + every; k++) {
				const t = age + k * every
				const y = jet.y + CELL * 2 + (WATER_FALL * t * t) / 2
				if (y > end) {
					if (y - end < CELL * 4) {
						ctx.fillStyle = FOAM
						ctx.fillRect(x - CELL, snap(end) - CELL, CELL, CELL)
						ctx.fillRect(x + CELL, snap(end) - CELL * 2, CELL, CELL)
					}
					continue
				}
				ctx.fillStyle = WATER
				ctx.fillRect(x, snap(y), CELL, t > 18 ? CELL * 3 : CELL * 2)
				ctx.fillStyle = WATER_LIT
				ctx.fillRect(x, snap(y), CELL, CELL)
			}
		}
	}

	/** A round blob of `fill`, `r` px across from its middle at `x`, `y`: rows of cells, on the grid. */
	function paintBlob(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		r: number,
		fill: string,
	) {
		ctx.fillStyle = fill
		for (let dy = -r; dy <= r; dy += CELL) {
			const w = Math.sqrt(Math.max(0, r * r - dy * dy))
			if (w < CELL / 2) continue
			ctx.fillRect(snap(x - w), snap(y + dy), Math.max(CELL, snap(w * 2)), CELL)
		}
	}

	/** Water splashing up where a jet lands, `x`, `y` in the world. */
	function paintSplash(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		jet: Jet,
		now: number,
		size: number,
	) {
		for (let k = 0; k < size + JET_HALF[jet.kind]; k++) {
			const life = 10
			const age = (now + k * 3) % life
			const seed = Math.floor((now + k * 3) / life) * 13 + k + jet.id * 7
			const vx = (hash(seed) - 0.5) * 3.2
			const vy = -1 - hash(seed + 1) * 2.4
			ctx.fillStyle = k % 3 === 0 ? FOAM : WATER_LIT
			ctx.fillRect(
				snap(across(x) + vx * age),
				snap(y + vy * age + 0.3 * age * age),
				CELL,
				CELL,
			)
		}
	}

	/**
	 * `racer`'s jug, on their head, bobbing as they run: its glass see-
	 * through, the water in it to how full it is, its surface tipped as
	 * it's sloshing, lit along the top; its walls, lip and foot, and a shine.
	 */
	function paintJug(ctx: CanvasRenderingContext2D, racer: Racer, now: number) {
		const jug = show.jugs.get(racer.id)
		if (!jug) return
		const b = racer.body
		// On the top of their head, as it's drawn just now, bobbing with it as
		// they run: or, till they've been drawn, where it'd be.
		const foot = jugFootOf(racer)
		const bottom = snap(foot.y)
		const top = bottom - JUG_TALL
		const middle = snap(across(foot.x))
		const inside = JUG_ROWS.length - 2
		const level = jug.fill * inside
		const tip = jug.tilt * inside
		JUG_ROWS.forEach((wide, row) => {
			const y = top + row * JUG_CELL
			const left = snap(middle - (wide * JUG_CELL) / 2)
			if (row === 0) {
				ctx.fillStyle = GLASS_LIP
				ctx.fillRect(left, y, wide * JUG_CELL, JUG_CELL)
				ctx.fillStyle = GLASS_SHADE
				ctx.fillRect(left + (wide - 1) * JUG_CELL, y, JUG_CELL, JUG_CELL)
				return
			}
			if (row === JUG_ROWS.length - 1) {
				ctx.fillStyle = GLASS_FOOT
				ctx.fillRect(left, y, wide * JUG_CELL, JUG_CELL)
				ctx.fillStyle = GLASS_LIT
				ctx.fillRect(left, y, JUG_CELL * 2, JUG_CELL)
				return
			}
			// Inside: the glass, and water, as high as it comes in each column.
			const fromBottom = JUG_ROWS.length - 1 - row - 0.5
			for (let c = 1; c < wide - 1; c++) {
				const u = (c - (wide - 1) / 2) / ((wide - 1) / 2)
				const surface = level + tip * u
				const x = left + c * JUG_CELL
				if (fromBottom <= surface) {
					const top = fromBottom > surface - 1
					ctx.fillStyle = top ? WATER_LIT : fromBottom < 2 ? WATER_DEEP : WATER
				} else ctx.fillStyle = GLASS_INSIDE
				ctx.fillRect(x, y, JUG_CELL, JUG_CELL)
			}
			ctx.fillStyle = GLASS_LIT
			ctx.fillRect(left, y, JUG_CELL, JUG_CELL)
			ctx.fillStyle = GLASS_SHADE
			ctx.fillRect(left + (wide - 1) * JUG_CELL, y, JUG_CELL, JUG_CELL)
			// A shine down its left, on the glass.
			if (row >= 5 && row <= 11) {
				ctx.fillStyle = GLASS_SHINE
				ctx.fillRect(left + JUG_CELL * 2, y, JUG_CELL, JUG_CELL)
			}
		})
		paintStraps(ctx, middle, top, bottom, b.facing)
	}

	/**
	 * The jug strapped on: a sweatband round their head, just under its foot,
	 * tied at the back, its ends hanging; a strap up each side from it to a
	 * band round the jug, low on its body.
	 */
	function paintStraps(
		ctx: CanvasRenderingContext2D,
		middle: number,
		top: number,
		bottom: number,
		facing: 1 | -1,
	) {
		const ring = JUG_ROWS.length - RING_UP
		const ringY = top + ring * JUG_CELL
		const ringHalf = (JUG_ROWS[ring] * JUG_CELL) / 2
		// The band round the jug.
		ctx.fillStyle = BAND
		ctx.fillRect(middle - ringHalf, ringY, ringHalf * 2, CELL)
		ctx.fillStyle = BAND_LIT
		ctx.fillRect(middle - ringHalf, ringY, CELL, CELL)
		ctx.fillStyle = BAND_SHADE
		ctx.fillRect(middle + ringHalf - CELL, ringY, CELL, CELL)
		// The straps, down from it, either side, to the headband.
		for (const side of [-1, 1]) {
			const from = middle + side * (ringHalf - CELL)
			const to = middle + side * (BAND_HALF - CELL)
			for (let y = ringY + CELL; y < bottom; y += CELL) {
				const share = (y - ringY) / Math.max(CELL, bottom - ringY)
				ctx.fillStyle = side < 0 ? BAND : BAND_SHADE
				ctx.fillRect(
					snap(from + (to - from) * share) - (side < 0 ? 0 : CELL),
					y,
					CELL,
					CELL,
				)
			}
		}
		// The headband, lit along its top, round their forehead.
		ctx.fillStyle = BAND
		ctx.fillRect(middle - BAND_HALF, bottom, BAND_HALF * 2, CELL * 2)
		ctx.fillStyle = BAND_LIT
		ctx.fillRect(middle - BAND_HALF, bottom, BAND_HALF * 2, CELL)
		ctx.fillStyle = BAND_SHADE
		ctx.fillRect(middle - BAND_HALF, bottom + CELL, CELL, CELL)
		// Tied at the back, its ends hanging down behind.
		const back = facing > 0 ? middle - BAND_HALF - CELL : middle + BAND_HALF
		ctx.fillStyle = BAND
		ctx.fillRect(back, bottom, CELL, CELL * 2)
		ctx.fillRect(back - facing * CELL, bottom + CELL * 2, CELL, CELL * 2)
		ctx.fillStyle = BAND_SHADE
		ctx.fillRect(back - facing * CELL * 2, bottom + CELL * 3, CELL, CELL * 2)
	}

	return [room, water, flood, jugs]
}
