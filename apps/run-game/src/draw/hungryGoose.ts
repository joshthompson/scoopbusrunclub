import {
	type DrawPainting,
	createController,
	createObjectSignal,
} from 'scoopjs'
import type { JSX } from 'solid-js'
import flapDown from '../assets/flyers/goose-wings-down.png'
import flapUp from '../assets/flyers/goose-wings-up.png'
import {
	EGG,
	EGG_HEIGHT,
	EGG_WIDTH,
	GOLDEN_EGG,
	GOOSE,
	GOOSE_HEIGHT,
	GOOSE_WIDTH,
} from '../courses/kit/farmScenery'
import { RUNNER_SCALE, VIEW_HEIGHT } from '../game/constants'
import type { World } from '../game/world'
import { TEAM_NAMES } from '../minigames/beachVolleyball'
import {
	EGG_R,
	FIELD_LEFT,
	FIELD_TOP,
	GOOSE_STANDS,
	GOOSE_X,
	LAY_FLAP,
	NEST_COLOURS,
	RIM,
	SEEN_WIDTH,
	STEAL_TICKS,
	gooseOf,
	groundY,
	nestSpan,
} from '../minigames/hungryGoose'
import { textCells, textRuns } from './art/memoryDunk'
import { cellBatch } from './paint/cellBatch'
import { paintPicture } from './paint/picture'

/** A pixel, as everything's drawn: 2 px. */
const CELL = 2
const snap = (n: number) => Math.round(n / CELL) * CELL
/** How much of the world the screen shows, up and down, zoomed out. */
const SEEN_HEIGHT = VIEW_HEIGHT * 2

/** Straw: lit, its own, shaded, and the dark inside of the nest. */
const STRAW_LIT = '#ecd27a'
const STRAW = '#d4b056'
const STRAW_SHADE = '#a8843a'
const STRAW_DARK = '#6e5426'
/** The boards' posts and frames. */
const POST = '#7a5230'
const POST_LIT = '#a2703f'
const BOARD_EDGE = '#f6f1e6'
/** How high a nest's front is drawn, over the bottom of the eggs in it. */
const FRONT = 20

/** How high its board is over a nest, and how big, its lettering and its score. */
const BOARD_UP = 150
const BOARD_W = 132
const BOARD_H = 92
const NAME_CELL = 4
const SCORE_CELL = 7

/** How wide the bar over a thief is, filling as they get the egg out. */
const STEAL_BAR = 52

/** How often the goose honks, and pecks, stood there, and for how long. */
const HONK_EVERY = 170
const HONK_FOR = 22
const PECK_EVERY = 230
const PECK_FOR = 30

/** The clouds drifting over: [how far across, how high, how big, how fast]. */
const CLOUDS: [number, number, number, number][] = [
	[100, -420, 1.2, 0.12],
	[620, -330, 1.5, 0.08],
	[1100, -460, 1, 0.15],
	[1500, -250, 1.3, 0.1],
	[300, -180, 0.9, 0.18],
	[1800, -400, 1, 0.11],
	[860, -120, 0.8, 0.14],
]
/** Geese flying over, a V of them, every so often, and how long they take to cross; how big each is drawn, and how far apart. */
const FLOCK_EVERY = 1100
const FLOCK_CROSSES = 700
const FLOCK_SCALE = 4
const FLOCK_GAP = 60

/** A number from a place, the same every time. */
const hash = (x: number, y: number) => {
	let h = Math.imul(x * 374761393 + y * 668265263, 1274126177)
	h ^= h >>> 13
	return ((h >>> 0) % 1000) / 1000
}

/**
 * Hungry Hungry Goose, drawn: the giant goose on her mound, pecking and
 * honking now and then, flapping as she lays, turned the way she's facing;
 * each team's nest, a bowl of straw, its back behind the eggs lying in it
 * and its front over them, and a board on a post behind it with their
 * score; and the eggs, wherever they are, carried ones up over heads.
 * Nothing, if the world's not a game of it.
 */
export function createHungryGoose(world: World) {
	if (world.minigame?.id !== 'hungry-goose') return []
	const show = gooseOf(world)
	if (!show) return []

	/** One picture over the whole field, in the world's own x and y. */
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
				...createObjectSignal(FIELD_LEFT, 'x'),
				...createObjectSignal(FIELD_TOP, 'y'),
				...createObjectSignal({} as JSX.CSSProperties, 'style'),
				width: () => SEEN_WIDTH,
				height: () => SEEN_HEIGHT,
			}),
			draw({ ctx, image }) {
				// Read the tick, so it's painted again every one.
				const now = world.ticks()
				ctx.save()
				ctx.translate(-FIELD_LEFT, -FIELD_TOP)
				paint(ctx, now, image)
				ctx.restore()
			},
		})

	/** An egg, its middle at `x`, `y`: turned a quarter at a time as it rolls. */
	const egg = (
		ctx: CanvasRenderingContext2D,
		image: DrawPainting['image'],
		x: number,
		y: number,
		golden: boolean,
		spin: number,
	) => {
		const quarter = ((Math.round(spin / (Math.PI / 2)) % 4) + 4) % 4
		ctx.save()
		ctx.translate(snap(x), snap(y))
		ctx.rotate((quarter * Math.PI) / 2)
		paintPicture(
			ctx,
			image,
			golden ? GOLDEN_EGG : EGG,
			-EGG_WIDTH / 2,
			-EGG_HEIGHT / 2 - 1,
			EGG_WIDTH,
			EGG_HEIGHT,
		)
		ctx.restore()
	}

	// Up in the sky: big clouds drifting by, and now and then a V of geese
	// flying over, the giant one's little cousins.
	const sky = layer('goose-sky', 'scenery', (ctx, now, image) => {
		const cells = cellBatch(ctx)
		const wide = SEEN_WIDTH + 600
		for (const [x0, y, size, speed] of CLOUDS) {
			const x = FIELD_LEFT - 300 + ((((x0 + now * speed) % wide) + wide) % wide)
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
			cells.fillStyle = '#dceaf3'
			cells.fillRect(snap(x), snap(y + 4.4 * c), snap(12 * c), snap(0.6 * c))
		}
		cells.flush()
		const t = now % FLOCK_EVERY
		if (t >= FLOCK_CROSSES) return
		const lead = FIELD_LEFT - 200 + ((SEEN_WIDTH + 400) * t) / FLOCK_CROSSES
		const w = 18 * FLOCK_SCALE
		const h = 14 * FLOCK_SCALE
		for (let k = 0; k < 5; k++) {
			const back = Math.ceil(k / 2)
			const side = k % 2 ? -1 : 1
			const x = lead - back * FLOCK_GAP
			const y =
				-360 + side * back * FLOCK_GAP * 0.5 + Math.sin((now + k * 9) / 14) * 3
			const up = Math.floor((now + k * 5) / 10) % 2 === 0
			// Flying right: their pictures face left.
			ctx.save()
			ctx.translate(snap(x), snap(y))
			ctx.scale(-1, 1)
			paintPicture(ctx, image, up ? flapUp : flapDown, -w / 2, -h / 2, w, h)
			ctx.restore()
		}
	})

	// Behind everyone: the goose, the nests' boards and backs, and every egg
	// that's not carried; and the nests' fronts, over the eggs in them.
	const behind = layer('goose-field', 'boost', (ctx, now, image) => {
		// The goose: flapping, laying; honking now and then; pecking; stood.
		const laying = now - show.laidAt < LAY_FLAP
		const honking = (now + 40) % HONK_EVERY < HONK_FOR
		const pecking = (now + 100) % PECK_EVERY < PECK_FOR
		const pose = laying
			? GOOSE.lay
			: honking
				? GOOSE.honk
				: pecking
					? GOOSE.peck
					: GOOSE.stand
		ctx.save()
		ctx.translate(GOOSE_X, 0)
		// Facing right, turned round: her picture faces left.
		if (show.facing > 0) ctx.scale(-1, 1)
		paintPicture(
			ctx,
			image,
			pose,
			-GOOSE_WIDTH / 2,
			GOOSE_STANDS - GOOSE_HEIGHT + 6,
			GOOSE_WIDTH,
			GOOSE_HEIGHT,
		)
		ctx.restore()

		const cells = cellBatch(ctx)
		const rect = (x: number, y: number, w: number, h: number, c: string) => {
			cells.fillStyle = c
			cells.fillRect(snap(x), snap(y), snap(w), snap(h))
		}
		for (const team of [0, 1]) {
			const { from, to } = nestSpan(team)
			const ground = groundY(from)
			const mid = (from + to) / 2
			// Its board, on a post: the team's colour, their name, and their score.
			const top = ground - BOARD_UP - BOARD_H
			rect(mid - 4, ground - BOARD_UP, 8, BOARD_UP - RIM, POST)
			rect(mid - 4, ground - BOARD_UP, 2, BOARD_UP - RIM, POST_LIT)
			rect(mid - BOARD_W / 2 - 6, top - 6, BOARD_W + 12, BOARD_H + 12, POST)
			rect(mid - BOARD_W / 2, top, BOARD_W, BOARD_H, NEST_COLOURS[team])
			rect(mid - BOARD_W / 2, top, BOARD_W, 4, BOARD_EDGE)
			const name = TEAM_NAMES[team].toUpperCase()
			for (const [x, y, w] of textRuns(name))
				rect(
					mid - (textCells(name) * NAME_CELL) / 2 + x * NAME_CELL,
					top + 10 + y * NAME_CELL,
					w * NAME_CELL,
					NAME_CELL,
					BOARD_EDGE,
				)
			const score = `${show.nests[team]}`
			for (const [x, y, w] of textRuns(score))
				rect(
					mid - (textCells(score) * SCORE_CELL) / 2 + x * SCORE_CELL,
					top + 40 + y * SCORE_CELL,
					w * SCORE_CELL,
					SCORE_CELL,
					'#ffffff',
				)
			// The back of its bowl of straw, woven, in shadow, darkest at the bottom.
			rect(from + 4, ground - RIM - 6, to - from - 8, RIM + 6, STRAW_SHADE)
			rect(from + 4, ground - RIM - 6, to - from - 8, 2, STRAW)
			rect(from + 10, ground - 14, to - from - 20, 14, STRAW_DARK)
			for (let x = from + 8; x < to - 8; x += 10)
				for (let y = ground - RIM; y < ground - 16; y += 8)
					rect(
						x + (hash(x, y) < 0.5 ? 0 : 4),
						y,
						6,
						2,
						hash(y, x) < 0.5 ? STRAW : STRAW_DARK,
					)
			// Each board on its own: its colour'd go over the other's lettering.
			cells.flush()
		}

		// Every egg not carried, and the golden ones glinting.
		for (const e of show.eggs) {
			if (e.carrier !== undefined) continue
			egg(ctx, image, e.x, e.y, e.golden, e.spin)
			if (e.golden && (now + e.id * 13) % 50 < 6) {
				ctx.fillStyle = '#fffbe0'
				ctx.fillRect(snap(e.x) + 4, snap(e.y) - EGG_R - 4, 2, 6)
				ctx.fillRect(snap(e.x) + 2, snap(e.y) - EGG_R - 2, 6, 2)
			}
		}

		// The front of each bowl, over the bottom of what's in it: its rims
		// either end, straw, lit along its top, ends sticking out.
		for (const team of [0, 1]) {
			const { from, to } = nestSpan(team)
			const ground = groundY(from)
			rect(from, ground - FRONT, to - from, FRONT, STRAW)
			rect(from, ground - FRONT, to - from, 2, STRAW_LIT)
			rect(from, ground - 4, to - from, 4, STRAW_SHADE)
			for (const x of [from - 4, to - 8]) {
				rect(x, ground - RIM - 4, 12, RIM + 4, STRAW)
				rect(x, ground - RIM - 4, 12, 2, STRAW_LIT)
			}
			for (let x = from + 4; x < to - 4; x += 8) {
				const n = hash(x, team)
				rect(
					x,
					ground - FRONT - 4 + Math.round(n * 3) * 2,
					2,
					6,
					n < 0.5 ? STRAW_LIT : STRAW_SHADE,
				)
			}
		}
		cells.flush()
	})

	// In front: the eggs being carried, up over heads; and over anyone
	// stealing one, how near they are to getting it.
	const carriedEggs = layer('goose-carried', 'furby', (ctx, now, image) => {
		for (const e of show.eggs)
			if (e.carrier !== undefined) egg(ctx, image, e.x, e.y, e.golden, 0)
		for (const [i, since] of show.stealing) {
			const racer = world.racers[i]
			if (!racer) continue
			const b = racer.body
			const share = Math.min(1, (now - since) / STEAL_TICKS)
			const x = snap(b.x - STEAL_BAR / 2)
			const y = snap(b.feetY - racer.runner.sprite.height * RUNNER_SCALE - 34)
			ctx.fillStyle = '#1d1c1f'
			ctx.fillRect(x - 4, y - 4, STEAL_BAR + 8, 16)
			ctx.fillStyle = '#ffd23f'
			ctx.fillRect(x, y, snap(STEAL_BAR * share), 8)
		}
	})

	return [sky, behind, carriedEggs]
}
