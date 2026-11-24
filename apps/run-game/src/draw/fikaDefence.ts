import {
	type DrawPainting,
	createController,
	createObjectSignal,
} from 'scoopjs'
import type { JSX } from 'solid-js'
import pecking from '../assets/flyers/goose-pecking.png'
import standing from '../assets/flyers/goose-standing.png'
import wingsDown from '../assets/flyers/goose-wings-down.png'
import wingsUp from '../assets/flyers/goose-wings-up.png'
import {
	BIRCH,
	BIRCH_HEIGHT,
	BIRCH_WIDTH,
	FLAG,
	FLAGPOLE,
	FLAGPOLE_HEIGHT,
	FLAGPOLE_WIDTH,
	FLAG_HEIGHT,
	FLAG_WIDTH,
	LILAC,
	LILAC_HEIGHT,
	LILAC_WIDTH,
	MAYPOLE,
	MAYPOLE_HEIGHT,
	MAYPOLE_WIDTH,
	SAILBOAT,
	SAILBOAT_HEIGHT,
	SAILBOAT_WIDTH,
	STUGA,
	STUGA_GRASS,
	STUGA_GRASS_SHADE,
	STUGA_HEIGHT,
	STUGA_SKY_BOTTOM,
	STUGA_SKY_TOP,
	STUGA_WIDTH,
	WILDFLOWERS,
	WILDFLOWERS_HEIGHT,
	WILDFLOWERS_WIDTH,
} from '../courses/kit/stugaScenery'
import {
	GROUND_Y,
	PATH_BACK,
	PATH_FRONT,
	VIEW_HEIGHT,
	VIEW_WIDTH,
} from '../game/constants'
import { FIKA_SIZE } from '../game/fika'
import { TEAM_COLOURS } from '../game/teams'
import type { World } from '../game/world'
import { ARENA_LEFT } from '../minigames/arena'
import { TEAM_NAMES } from '../minigames/beachVolleyball'
import {
	MOOSE_FED_UP,
	MOOSE_MUNCHES,
	type Raider,
	SPREAD,
	TABLE_TOP,
	defenceOf,
	slotAt,
	tableMiddle,
} from '../minigames/fikaDefence'
import { fikaPicture } from './art/fika'
import {
	GULL,
	GULL_BEAK,
	GULL_HEIGHT,
	GULL_WIDTH,
	MOOSE,
	MOOSE_HEIGHT,
	MOOSE_MOUTH,
	MOOSE_WIDTH,
	SQUIRREL,
	SQUIRREL_HEIGHT,
	SQUIRREL_MOUTH,
	SQUIRREL_WIDTH,
} from './art/fikaRaiders'
import { mixHex } from './art/hats'
import { textCells, textRuns } from './art/memoryDunk'
import { cachedArt } from './canvasArt'
import { cellBatch, seeThrough } from './paint/cellBatch'
import { paintPicture } from './paint/picture'

/** A pixel, as everything's drawn: 2 px. */
const CELL = 2
const snap = (n: number) => Math.round(n / CELL) * CELL

/** A number from a place, the same every time. */
const hash = (x: number, y: number) => {
	let h = Math.imul(x * 374761393 + y * 668265263, 1274126177)
	h ^= h >>> 13
	return ((h >>> 0) % 1000) / 1000
}

// --- The place --------------------------------------------------------------------

/** Down the screen: the horizon, the shore, and the back of the path. */
const HORIZON = 262
const SHORE = 330
const LAWN_BOTTOM = GROUND_Y - PATH_BACK

const SEA_FAR = '#4f8fc4'
const SEA_NEAR = '#6fb0dc'
const SEA_GLINT = '#e8f6ff'
const ISLAND_FAR = '#7fa3a8'
const ISLAND_PINE = '#3f6a4c'
const ISLAND_PINE_LIT = '#557f5e'
const GRANITE = '#b8a8a0'
const GRANITE_LIT = '#d4c6bc'
const GRANITE_SHADE = '#94857e'
const LAWN_STRIPE = '#7cc056'
const SUN = '#fff4b8'

/**
 * The island, behind the lawn, painted once: the summer sky, paler down to
 * the horizon, and the sun; the sea out to it, other islands far off, low
 * and wooded with pines, a skerry or two; smooth pink granite along the
 * shore; and the lawn, mown in stripes, on down to the path.
 */
function paintIsland(ctx: CanvasRenderingContext2D) {
	const cells = cellBatch(ctx)
	const rect = (x: number, y: number, w: number, h: number, c: string) => {
		cells.fillStyle = c
		cells.fillRect(snap(x), snap(y), snap(w), snap(h))
	}
	const W = VIEW_WIDTH
	// The sky, in steps, paler to the horizon.
	const steps = 12
	for (let k = 0; k < steps; k++) {
		const top = (HORIZON * k) / steps
		rect(
			0,
			top,
			W,
			HORIZON / steps + CELL,
			mixHex(STUGA_SKY_TOP, STUGA_SKY_BOTTOM, k / (steps - 1)),
		)
	}
	// The sun, high on the left, a halo round it.
	const sun = { x: 150, y: 70 }
	for (let y = -30; y <= 30; y += CELL)
		for (let x = -30; x <= 30; x += CELL) {
			const d = Math.hypot(x, y)
			if (d < 20) rect(sun.x + x, sun.y + y, CELL, CELL, SUN)
			else if (d < 28) rect(sun.x + x, sun.y + y, CELL, CELL, '#f4f8e4')
		}
	// The sea, deeper blue out at the horizon, lighter near.
	const bands = 6
	for (let k = 0; k < bands; k++) {
		const top = HORIZON + ((SHORE - HORIZON) * k) / bands
		rect(
			0,
			top,
			W,
			(SHORE - HORIZON) / bands + CELL,
			mixHex(SEA_FAR, SEA_NEAR, k / (bands - 1)),
		)
	}
	// Islands far off, on the horizon: hazy, low, wooded.
	const islands: [number, number, number][] = [
		[40, 150, 10],
		[300, 90, 6],
		[640, 220, 14],
		[900, 120, 8],
	]
	for (const [x0, w, high] of islands)
		for (let x = 0; x < w; x += CELL) {
			const u = x / w
			const h = Math.round(
				(high * Math.sin(u * Math.PI) ** 0.6 +
					(hash(Math.floor((x0 + x) / 6), 1) > 0.5 ? 3 : 0)) /
					CELL,
			)
			rect(x0 + x, HORIZON - h * CELL, CELL, h * CELL + CELL, ISLAND_FAR)
		}
	// A nearer island, its pines dark against the sea, granite along its edge.
	const near = { x: 690, w: 200, base: HORIZON + 22 }
	for (let x = 0; x < near.w; x += CELL) {
		const u = x / near.w
		const hump = 26 * Math.sin(u * Math.PI) ** 0.7
		const pines =
			hash(Math.floor((near.x + x) / 8), 4) * 14 * Math.sin(u * Math.PI)
		const spike = (x / CELL) % 4 < 2 ? 2 : 0
		const top = near.base - hump - pines - spike
		rect(
			near.x + x,
			top,
			CELL,
			near.base - top,
			x % 10 < 4 ? ISLAND_PINE_LIT : ISLAND_PINE,
		)
		rect(
			near.x + x,
			near.base - 6,
			CELL,
			8,
			u < 0.2 || u > 0.8 ? GRANITE_SHADE : GRANITE,
		)
	}
	// A little skerry, nearer still, bare granite.
	for (let x = 0; x < 70; x += CELL) {
		const h = 10 * Math.sin((x / 70) * Math.PI) ** 0.6
		rect(220 + x, HORIZON + 40 - h, CELL, h + 2, x < 26 ? GRANITE_LIT : GRANITE)
	}
	// The shore: smooth granite slabs, lit along their tops.
	for (let x = 0; x < W; x += CELL) {
		const h =
			8 +
			Math.round((Math.sin(x / 47) * 4 + Math.sin(x / 13 + 1) * 2) / CELL) *
				CELL
		rect(x, SHORE - h, CELL, h + 8, GRANITE)
		rect(x, SHORE - h, CELL, CELL, GRANITE_LIT)
		if (hash(Math.floor(x / 4), 2) < 0.15)
			rect(x, SHORE - h + 4, CELL, 4, GRANITE_SHADE)
	}
	// The lawn, mown in stripes, on down to the path.
	rect(0, SHORE, W, LAWN_BOTTOM - SHORE, STUGA_GRASS)
	for (let k = 0; k < 6; k++)
		rect(0, SHORE + 6 + k * 24, W, 10, k % 2 ? STUGA_GRASS : LAWN_STRIPE)
	// Tufts here and there.
	for (let y = SHORE + 8; y < LAWN_BOTTOM - 4; y += 10)
		for (let x = 0; x < W; x += 14) {
			const n = hash(x, y)
			if (n < 0.12)
				rect(x + Math.floor(n * 60), y, CELL, CELL * 2, STUGA_GRASS_SHADE)
		}
	cells.flush()
}

/** The clouds drifting over: [how far across, how high, how big, how fast]. */
const CLOUDS: [number, number, number, number][] = [
	[80, 40, 1.2, 0.1],
	[420, 90, 0.9, 0.14],
	[760, 30, 1.4, 0.07],
	[1050, 120, 0.8, 0.12],
]
/** How long the sailboat takes to cross, and how far down the sea it is. */
const SAIL_CROSSES = 5400
const SAIL_Y = HORIZON + 34

/**
 * Fika Defence's island, drawn: the sea and the sky behind; the stuga, a
 * birch, a midsummer pole, lilacs, and a flagpole flying the Swedish
 * flag; each team's table's board, its name and its count; the fika on
 * the tables; the raiders, coming and going, with whatever they've got;
 * fika dropped on the lawn, and carried over heads; and wildflowers along
 * the front. Nothing, if the world's not a game of it.
 */
export function createFikaDefence(world: World) {
	if (world.minigame?.id !== 'fika-defence') return []
	const show = defenceOf(world)
	if (!show) return []

	/** One picture over the whole screen, in the world's own x and y. */
	const layer = (
		id: string,
		type: string,
		paint: (
			ctx: CanvasRenderingContext2D,
			now: number,
			image: DrawPainting['image'],
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
				// Read the tick, so it's painted again every one.
				const now = world.ticks()
				ctx.save()
				ctx.translate(-ARENA_LEFT, 0)
				paint(ctx, now, image)
				ctx.restore()
			},
		})

	/** A picture, its bottom middle at `x`, `y`, turned round if it's facing right (they all face left). */
	const sprite = (
		ctx: CanvasRenderingContext2D,
		image: DrawPainting['image'],
		src: string,
		x: number,
		y: number,
		w: number,
		h: number,
		facing = -1,
	) => {
		ctx.save()
		ctx.translate(snap(x), snap(y))
		if (facing > 0) ctx.scale(-1, 1)
		paintPicture(ctx, image, src, -w / 2, -h, w, h)
		ctx.restore()
	}
	/** A bit of fika, its bottom middle at `x`, `y`. */
	const fika = (
		ctx: CanvasRenderingContext2D,
		image: DrawPainting['image'],
		item: number,
		x: number,
		y: number,
	) => {
		const kind = SPREAD[item] ?? SPREAD[0]
		const { width, height } = FIKA_SIZE[kind]
		paintPicture(
			ctx,
			image,
			fikaPicture(kind),
			snap(x - width / 2),
			snap(y - height),
			width,
			height,
		)
	}

	// --- Behind it all -----------------------------------------------------------------

	const island = layer('fika-island', 'scenery', (ctx) => {
		ctx.drawImage(
			cachedArt('fika-island', VIEW_WIDTH, LAWN_BOTTOM, paintIsland, 1),
			ARENA_LEFT,
			0,
			VIEW_WIDTH,
			LAWN_BOTTOM,
		)
	})

	// The sky and the sea moving: clouds drifting, the sea glinting, a
	// sailboat crossing; and the stuga and the rest, the flag flying.
	const scene = layer('fika-scene', 'scenery', (ctx, now, image) => {
		const x0 = ARENA_LEFT
		const cells = cellBatch(ctx)
		const wide = VIEW_WIDTH + 400
		for (const [cx, y, size, speed] of CLOUDS) {
			const x = x0 - 200 + ((((cx + now * speed) % wide) + wide) % wide)
			const c = size * 8
			const puff = (dx: number, dy: number, w: number, h: number) => {
				cells.fillStyle = '#ffffff'
				cells.fillRect(
					snap(x + dx * c),
					snap(y + dy * c),
					snap(w * c),
					snap(h * c),
				)
			}
			puff(0, 2, 12, 3)
			puff(2, 0.5, 5, 3)
			puff(6, -0.5, 4, 4)
			puff(9, 1, 2.5, 2.5)
			cells.fillStyle = '#dceef8'
			cells.fillRect(snap(x), snap(y + 4.4 * c), snap(12 * c), snap(0.6 * c))
		}
		// Glints on the water, coming and going.
		for (let k = 0; k < 26; k++) {
			const gx = Math.floor(hash(k, 7) * VIEW_WIDTH)
			const gy = HORIZON + 6 + Math.floor(hash(k, 9) * (SHORE - HORIZON - 22))
			const on = (now + k * 23) % 90 < 40
			if (!on) continue
			cells.fillStyle = SEA_GLINT
			cells.fillRect(snap(x0 + gx), snap(gy), 6 + (k % 3) * 2, CELL)
		}
		cells.flush()
		// The sailboat, crossing slowly, rocking a little.
		const sail = ((now % SAIL_CROSSES) / SAIL_CROSSES) * (VIEW_WIDTH + 80) - 40
		const bob = Math.floor(now / 40) % 2 ? 0 : CELL
		paintPicture(
			ctx,
			image,
			SAILBOAT,
			snap(x0 + sail),
			SAIL_Y - SAILBOAT_HEIGHT + bob,
			SAILBOAT_WIDTH,
			SAILBOAT_HEIGHT,
		)
		// The garden: a flagpole and its flag, a birch, the stuga between
		// lilacs, a midsummer pole, another birch.
		const at = (x: number) => x0 + x
		paintPicture(
			ctx,
			image,
			FLAGPOLE,
			at(96),
			404 - FLAGPOLE_HEIGHT,
			FLAGPOLE_WIDTH,
			FLAGPOLE_HEIGHT,
		)
		paintPicture(
			ctx,
			image,
			FLAG[Math.floor(now / 9) % FLAG.length],
			at(96 + FLAGPOLE_WIDTH - 4),
			404 - FLAGPOLE_HEIGHT + 10,
			FLAG_WIDTH,
			FLAG_HEIGHT,
		)
		paintPicture(
			ctx,
			image,
			BIRCH,
			at(196),
			396 - BIRCH_HEIGHT,
			BIRCH_WIDTH,
			BIRCH_HEIGHT,
		)
		paintPicture(
			ctx,
			image,
			LILAC,
			at(318),
			394 - LILAC_HEIGHT,
			LILAC_WIDTH,
			LILAC_HEIGHT,
		)
		paintPicture(
			ctx,
			image,
			STUGA,
			at(380),
			392 - STUGA_HEIGHT,
			STUGA_WIDTH,
			STUGA_HEIGHT,
		)
		paintPicture(
			ctx,
			image,
			LILAC,
			at(560),
			396 - LILAC_HEIGHT,
			LILAC_WIDTH,
			LILAC_HEIGHT,
		)
		paintPicture(
			ctx,
			image,
			MAYPOLE,
			at(600),
			398 - MAYPOLE_HEIGHT,
			MAYPOLE_WIDTH,
			MAYPOLE_HEIGHT,
		)
		paintPicture(
			ctx,
			image,
			BIRCH,
			at(836),
			404 - BIRCH_HEIGHT,
			BIRCH_WIDTH,
			BIRCH_HEIGHT,
		)
	})

	// --- The tables, their fika and the raiders ------------------------------------

	/** Each table's board, up on a post behind it: its team's colour, name, and count. */
	const BOARD_W = 84
	const BOARD_H = 58
	const BOARD_TOP = TABLE_TOP - 116
	const behind = layer('fika-tables', 'boost', (ctx, now, image) => {
		const cells = cellBatch(ctx)
		const rect = (x: number, y: number, w: number, h: number, c: string) => {
			cells.fillStyle = c
			cells.fillRect(snap(x), snap(y), snap(w), snap(h))
		}
		for (const team of [0, 1]) {
			const mid = tableMiddle(team)
			const count = show.tables[team].filter((s) => s >= 0).length
			rect(
				mid - 4,
				BOARD_TOP + BOARD_H,
				8,
				TABLE_TOP - BOARD_TOP - BOARD_H,
				'#7a5230',
			)
			rect(
				mid - 4,
				BOARD_TOP + BOARD_H,
				2,
				TABLE_TOP - BOARD_TOP - BOARD_H,
				'#a2703f',
			)
			rect(
				mid - BOARD_W / 2 - 4,
				BOARD_TOP - 4,
				BOARD_W + 8,
				BOARD_H + 8,
				'#7a5230',
			)
			rect(mid - BOARD_W / 2, BOARD_TOP, BOARD_W, BOARD_H, TEAM_COLOURS[team])
			rect(mid - BOARD_W / 2, BOARD_TOP, BOARD_W, 4, '#f6f1e6')
			const name = TEAM_NAMES[team].toUpperCase()
			for (const [x, y, w] of textRuns(name))
				rect(
					mid - (textCells(name) * 3) / 2 + x * 3,
					BOARD_TOP + 7 + y * 3,
					w * 3,
					3,
					'#f6f1e6',
				)
			const n = `${count}`
			for (const [x, y, w] of textRuns(n))
				rect(
					mid - (textCells(n) * 4) / 2 + x * 4,
					BOARD_TOP + 29 + y * 4,
					w * 4,
					4,
					'#ffffff',
				)
			// Each board on its own: its colour'd go over the other's lettering.
			cells.flush()
		}

		// The gulls' shadows, on the table or the lawn under them, darker as they come down.
		for (const r of show.raiders) {
			if (r.kind !== 'gull' || (r.stage !== 'circling' && r.stage !== 'diving'))
				continue
			const onTable = [0, 1].some((t) => Math.abs(r.x - tableMiddle(t)) < 104)
			const floor = onTable ? TABLE_TOP : GROUND_Y
			const near = Math.max(0, Math.min(1, 1 - (floor - r.y) / 300))
			const w = snap(14 + near * 22)
			ctx.fillStyle = seeThrough('#1d1d1d', 0.15 + near * 0.3)
			ctx.fillRect(snap(r.x - w / 2), floor - 2, w, 4)
			ctx.fillRect(snap(r.x - w / 2 + 4), floor - 4, w - 8, 2)
		}

		// The fika on each table, the back row first.
		for (const team of [0, 1])
			for (const back of [true, false])
				show.tables[team].forEach((item, slot) => {
					if (item < 0) return
					const at = slotAt(team, slot)
					if (at.back !== back) return
					fika(ctx, image, item, at.x, at.y)
				})

		// Fika dropped on the lawn.
		for (const l of show.loose)
			if (l.carrier === undefined) fika(ctx, image, l.item, l.x, l.y)

		// The raiders on the ground and the tables, and whatever they've got.
		for (const r of show.raiders)
			if (r.kind !== 'gull') raider(ctx, image, r, now)
	})

	/** Raider `r`, drawn as it is just now: walking, pecking, climbing, flying off. */
	function raider(
		ctx: CanvasRenderingContext2D,
		image: DrawPainting['image'],
		r: Raider,
		now: number,
	) {
		const age = now - r.since
		/** Whatever it's got, held in its mouth, `forward` of its middle the way it's facing, `dy` down from its feet. */
		const loot = (forward: number, dy: number) => {
			if (r.loot === undefined) return
			fika(ctx, image, r.loot, r.x + r.facing * forward, r.y + dy)
		}
		switch (r.kind) {
			case 'goose': {
				if (r.stage === 'fleeing') {
					const up = Math.floor(now / 6) % 2 === 0
					sprite(
						ctx,
						image,
						up ? wingsUp : wingsDown,
						r.x,
						r.y,
						36,
						28,
						r.facing,
					)
					break
				}
				const pecks = r.stage === 'stealing' && Math.floor(age / 10) % 2 === 1
				const bob =
					r.stage === 'stealing' ? 0 : Math.floor(now / 8) % 2 ? 0 : CELL
				sprite(
					ctx,
					image,
					pecks ? pecking : standing,
					r.x,
					r.y - bob,
					36,
					32,
					r.facing,
				)
				loot(16, -12)
				break
			}
			case 'squirrel': {
				const frame =
					Math.floor(now / 4) % 2 ? SQUIRREL.stretch : SQUIRREL.bunch
				if (r.stage === 'climbing') {
					// Up the table leg, head first.
					ctx.save()
					ctx.translate(snap(r.x), snap(r.y))
					ctx.rotate(Math.PI / 2)
					if (r.facing > 0) ctx.scale(1, -1)
					paintPicture(
						ctx,
						image,
						frame,
						-SQUIRREL_WIDTH / 2,
						-SQUIRREL_HEIGHT / 2,
						SQUIRREL_WIDTH,
						SQUIRREL_HEIGHT,
					)
					ctx.restore()
					break
				}
				const still = r.stage === 'stealing'
				sprite(
					ctx,
					image,
					still ? SQUIRREL.bunch : frame,
					r.x,
					r.y,
					SQUIRREL_WIDTH,
					SQUIRREL_HEIGHT,
					r.facing,
				)
				loot(
					SQUIRREL_WIDTH / 2 - SQUIRREL_MOUTH.x,
					-SQUIRREL_HEIGHT + SQUIRREL_MOUTH.y + 8,
				)
				break
			}
			case 'moose': {
				// Head down over the table a while before each mouthful, and chewing after.
				const into = age % MOOSE_MUNCHES
				const eating =
					r.stage === 'stealing' && (into >= MOOSE_MUNCHES - 40 || into < 24)
				const src = eating
					? MOOSE.eat
					: r.stage === 'stealing'
						? MOOSE.walk[0]
						: MOOSE.walk[Math.floor(now / 14) % 2]
				sprite(ctx, image, src, r.x, r.y, MOOSE_WIDTH, MOOSE_HEIGHT, r.facing)
				// Something in its mouth, munching.
				if (eating && into < 24 && age > 24) {
					const mx = r.x + r.facing * (MOOSE_WIDTH / 2 - MOOSE_MOUTH.x)
					ctx.fillStyle = '#c8955a'
					ctx.fillRect(
						snap(mx) - 2,
						snap(r.y - MOOSE_HEIGHT + MOOSE_MOUTH.y),
						6,
						4,
					)
				}
				// How fed up it is with being shoved: a bar over it, filling.
				if (r.shoo > 0 && r.stage !== 'leaving') {
					const bar = 64
					const x = snap(r.x - bar / 2)
					const y = snap(r.y - MOOSE_HEIGHT - 18)
					ctx.fillStyle = '#1d1c1f'
					ctx.fillRect(x - 4, y - 4, bar + 8, 14)
					ctx.fillStyle = '#ffd23f'
					ctx.fillRect(x, y, snap(bar * Math.min(1, r.shoo / MOOSE_FED_UP)), 6)
				}
				break
			}
		}
	}

	// In front: the gulls, swooping over everyone; and the fika being carried.
	const front = layer('fika-front', 'furby', (ctx, now, image) => {
		for (const r of show.raiders) {
			if (r.kind !== 'gull') continue
			const diving = r.stage === 'diving'
			const flap = Math.floor(now / (r.stage === 'circling' ? 9 : 5)) % 2
			const src = diving ? GULL.dive : flap ? GULL.up : GULL.down
			sprite(ctx, image, src, r.x, r.y, GULL_WIDTH, GULL_HEIGHT, r.facing)
			if (r.loot !== undefined)
				fika(
					ctx,
					image,
					r.loot,
					r.x + r.facing * (GULL_WIDTH / 2 - GULL_BEAK.x),
					r.y - GULL_HEIGHT + GULL_BEAK.y + 16,
				)
		}
		for (const l of show.loose)
			if (l.carrier !== undefined) fika(ctx, image, l.item, l.x, l.y)
	})

	// Wildflowers along the front of the lawn, in front of the path.
	const flowers = layer('fika-flowers', 'foreground', (ctx, _now, image) => {
		for (let k = 0; k < 18; k++) {
			const x = ARENA_LEFT + 14 + k * 54 + Math.floor(hash(k, 3) * 20)
			const y = GROUND_Y + PATH_FRONT + 12 + Math.floor(hash(k, 5) * 20)
			paintPicture(
				ctx,
				image,
				WILDFLOWERS[k % WILDFLOWERS.length],
				snap(x),
				snap(y),
				WILDFLOWERS_WIDTH,
				WILDFLOWERS_HEIGHT,
			)
		}
	})

	return [island, scene, behind, front, flowers]
}
