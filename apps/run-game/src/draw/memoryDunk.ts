import { createController, createObjectSignal } from 'scoopjs'
import type { JSX } from 'solid-js'
import { VIEW_HEIGHT, VIEW_WIDTH } from '../game/constants'
import type { World } from '../game/world'
import { ARENA_LEFT } from '../minigames/arena'
import {
	FLOOR,
	OPEN,
	PLATFORM_COUNT,
	PLATFORM_WIDTH,
	SPLASH_TICKS,
	WARNING,
	WATERLINE,
	dunkShowOf,
	momentAt,
	platformLeft,
	sequenceOf,
	swingOf,
	timelineOf,
} from '../minigames/memoryDunk'
import {
	BOARD_DARK,
	BOARD_FRAME,
	BOARD_FRAME_LIT,
	CREAM,
	PLATFORM_COLOURS,
	SHAPE_NAMES,
	WOOD_DARK,
	WOOD_LIT,
	shapeRuns,
	textCells,
	textRuns,
} from './art/memoryDunk'
import { cellBatch, seeThrough } from './paint/cellBatch'

/** A pixel, as everything's drawn: 2 px. */
const CELL = 2
/** The sea in front, its foam, and how see-through it is over what's in it. */
const SEA = '#2f89b0'
const FOAM = '#e8f6fb'
const SEA_OVER = 0.6
/** How tall a platform is: its doors, then its body, down to just over the water. */
const DECK = 12
const BODY = 50
/** The board, hung up over the middle platforms. */
const BOARD = { x: 360, y: 28, w: 240, h: 124 }
/** Where the sea's horizon is, out beyond the platforms. */
const HORIZON = 236

/**
 * Memory Dunk, drawn: a seaside, the horizon with a pier, a lighthouse and
 * a sailboat, gulls and clouds going by; the four platforms with their
 * shapes and trapdoors that swing open; the board hung over them showing
 * the sequence and the time left; and the sea in front, over anyone
 * who's fallen in, with splashes. Nothing, if the world's not a game of it.
 */
export function createMemoryDunk(world: World) {
	if (world.minigame?.id !== 'memory-dunk') return []
	const show = dunkShowOf(world)
	if (!show) return []

	/** One picture over the whole arena: `type` says what it's in front of. */
	const layer = (
		id: string,
		type: string,
		paint: (ctx: CanvasRenderingContext2D, now: number) => void,
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
			draw({ ctx }) {
				// Read the tick, so it's painted again every one.
				paint(ctx, world.ticks())
			},
		})

	/** Cells in `colour`, snapped to the 2 px grid. */
	const snap = (n: number) => Math.round(n / CELL) * CELL

	const backdrop = layer('dunk-seaside', 'scenery', (ctx, now) => {
		const cells = cellBatch(ctx)
		const rect = (x: number, y: number, w: number, h: number, c: string) => {
			cells.fillStyle = c
			cells.fillRect(snap(x), snap(y), snap(w), snap(h))
		}
		// The sea beyond, paler the further off, to the near water's edge.
		rect(0, HORIZON, VIEW_WIDTH, 22, '#9bd3e8')
		rect(0, HORIZON + 22, VIEW_WIDTH, 36, '#6dbbd8')
		rect(0, HORIZON + 58, VIEW_WIDTH, 50, '#49a5cb')
		rect(0, HORIZON + 108, VIEW_WIDTH, VIEW_HEIGHT - HORIZON - 108, SEA)
		// Glints on it, coming and going.
		for (let i = 0; i < 46; i++) {
			const y = HORIZON + 6 + ((i * 37) % 150)
			const x = (i * 211 + ((i * i * 13) % 97)) % VIEW_WIDTH
			if ((Math.floor(now / 24) + i) % 4 === 0) continue
			rect(x, y, 10 + (i % 3) * 4, 2, y < HORIZON + 58 ? '#c7e8f4' : '#8fcfe6')
		}
		cells.flush()

		// The sun, and clouds drifting.
		const sun = shapeRuns('circle', 22)
		cells.fillStyle = '#ffe98a'
		for (const [x, y, w] of sun)
			cells.fillRect(800 + x * CELL, 40 + y * CELL, w * CELL, CELL)
		const cloud = (x: number, y: number, size: number) => {
			const across = ((((x + now * 0.06 * size) % 1200) + 1200) % 1200) - 120
			rect(across, y + 8 * size, 56 * size, 8 * size, '#ffffff')
			rect(across + 8 * size, y + 2 * size, 24 * size, 8 * size, '#ffffff')
			rect(across + 28 * size, y + 5 * size, 20 * size, 6 * size, '#ffffff')
			rect(across, y + 14 * size, 56 * size, 2 * size, '#e1eef6')
		}
		cloud(120, 60, 1.5)
		cloud(520, 30, 1)
		cloud(820, 150, 1)
		cells.flush()

		// The lighthouse on its rock, far off to the left, red and white.
		const lx = 70
		rect(lx - 26, HORIZON - 6, 64, 8, '#7a8794')
		rect(lx - 16, HORIZON - 12, 44, 6, '#8e9aa6')
		for (let i = 0; i < 8; i++) {
			const w = 22 - i
			rect(
				lx + (22 - w) / 2 - 4,
				HORIZON - 14 - i * 8,
				w,
				8,
				i % 2 ? '#d8423a' : '#f6f1e6',
			)
		}
		rect(lx - 2, HORIZON - 80, 22, 8, '#2b3846')
		rect(lx + 2, HORIZON - 88, 14, 8, '#ffe98a')
		rect(lx - 2, HORIZON - 92, 22, 4, '#2b3846')
		// A pier, out along the horizon on the right, with a lifeguard tower.
		const pier = 560
		rect(pier, HORIZON - 14, VIEW_WIDTH - pier, 6, '#86654a')
		rect(pier, HORIZON - 14, VIEW_WIDTH - pier, 2, '#a98160')
		for (let x = pier + 6; x < VIEW_WIDTH; x += 28)
			rect(x, HORIZON - 8, 4, 22, '#5a4330')
		rect(pier + 250, HORIZON - 40, 4, 26, '#6b4f38')
		rect(pier + 290, HORIZON - 40, 4, 26, '#6b4f38')
		rect(pier + 244, HORIZON - 52, 56, 14, '#f6f1e6')
		rect(pier + 244, HORIZON - 50, 56, 4, '#d8423a')
		rect(pier + 238, HORIZON - 58, 68, 6, '#d8423a')
		// A sailboat, drifting along the horizon.
		const bx = snap(((now * 0.04 + 300) % 1100) - 80)
		rect(bx, HORIZON + 8, 40, 6, '#f6f1e6')
		rect(bx + 4, HORIZON + 14, 32, 4, '#c8553d')
		rect(bx + 20, HORIZON - 30, 2, 38, '#6b4f38')
		for (let i = 0; i < 10; i++)
			rect(bx + 22, HORIZON - 28 + i * 3, 2 + (i * 3) / 1.6, 4, '#ffffff')
		cells.flush()

		// Gulls, flapping across the sky.
		for (let i = 0; i < 4; i++) {
			const x =
				((((now * (0.5 + i * 0.12) + i * 260) % 1100) + 1100) % 1100) - 70
			const y = 90 + i * 34 + Math.round(Math.sin(now / 40 + i * 2) * 3) * 2
			const up = Math.floor(now / 12 + i * 3) % 2 === 0
			cells.fillStyle = '#ffffff'
			for (let k = 0; k < 5; k++) {
				const dy = up ? Math.abs(k - 2) - 2 : 2 - Math.abs(k - 2)
				cells.fillRect(snap(x) + k * CELL, snap(y) + dy * CELL, CELL, CELL)
			}
			cells.fillStyle = '#8a98a4'
			cells.fillRect(snap(x), snap(y) + (up ? -2 : 2) * CELL, CELL, CELL)
		}
		cells.flush()
	})

	/** The timeline's now, and the sequence. */
	const nowOf = () => momentAt(timelineOf(world, show))

	const platforms = layer('dunk-platforms', 'boost', (ctx, now) => {
		const m = nowOf()
		const seq = sequenceOf(show.seed, m.round)
		const cells = cellBatch(ctx)
		const rect = (x: number, y: number, w: number, h: number, c: string) => {
			cells.fillStyle = c
			cells.fillRect(snap(x), snap(y), snap(w), snap(h))
		}
		// Rattling, all of them at once, the last moments before the doors go.
		const rattle =
			m.phase === 'move' && m.length - m.t <= WARNING && !world.order()
				? Math.floor(now / 2) % 2
					? 2
					: -2
				: 0

		for (let p = 0; p < PLATFORM_COUNT; p++) {
			const c = PLATFORM_COLOURS[p]
			const x0 = platformLeft(p) - ARENA_LEFT
			const W = PLATFORM_WIDTH
			// Its legs, down into the sea.
			for (const lx of [x0 + 12, x0 + W - 20]) {
				rect(
					lx,
					FLOOR + DECK + BODY - 4,
					8,
					WATERLINE + 50 - FLOOR - DECK - BODY,
					WOOD_DARK,
				)
				rect(
					lx,
					FLOOR + DECK + BODY - 4,
					2,
					WATERLINE + 50 - FLOOR - DECK - BODY,
					WOOD_LIT,
				)
			}
			rect(x0 + 12, FLOOR + DECK + BODY + 8, W - 24, 4, WOOD_DARK)
			// Its body, with the shape on its face.
			const top = FLOOR + DECK
			rect(x0, top, W, BODY, c.shade)
			rect(x0 + 6, top + 4, W - 12, BODY - 8, c.base)
			rect(x0 + 6, top + 4, W - 12, 2, c.lit)
			rect(x0 + 6, top + BODY - 6, W - 12, 2, c.shade)
			const size = 18
			const sx = x0 + (W - size * CELL) / 2
			const sy = top + (BODY - size * CELL) / 2
			// The shape's shadow, then the shape, in cream.
			for (const [rx, ry, rw] of shapeRuns(SHAPE_NAMES[p], size))
				rect(sx + rx * CELL, sy + ry * CELL + 2, rw * CELL, CELL, c.shade)
			for (const [rx, ry, rw] of shapeRuns(SHAPE_NAMES[p], size))
				rect(sx + rx * CELL, sy + ry * CELL, rw * CELL, CELL, CREAM)
			// Its deck: two doors, hinged at either end.
			const swing = swingOf(m, p, seq)
			const dx = x0 + rattle
			if (swing <= 0) {
				rect(dx, FLOOR, W, DECK, c.base)
				rect(dx, FLOOR, W, 2, c.lit)
				rect(dx, FLOOR + DECK - 2, W, 2, c.shade)
				for (let sxm = 16; sxm < W; sxm += 16)
					rect(dx + sxm, FLOOR + 2, 2, DECK - 4, c.shade)
				rect(dx + W / 2 - 2, FLOOR, 4, DECK, c.shade)
			} else {
				// The hole, dark, and the doors hanging down from either end.
				rect(x0 + 12, FLOOR, W - 24, DECK, '#0e1d2b')
				const angle = (Math.min(1, swing) * Math.PI) / 2
				for (const dir of [1, -1]) {
					const hinge = dir > 0 ? x0 + 6 : x0 + W - 6
					for (let t = 0; t <= 52; t += 2) {
						const px = hinge + dir * t * Math.cos(angle)
						const py = FLOOR + t * Math.sin(angle)
						rect(px - 6, py, 12, 12, c.lit)
					}
					for (let t = 0; t <= 52; t += 2) {
						const px = hinge + dir * t * Math.cos(angle)
						const py = FLOOR + t * Math.sin(angle)
						rect(px - 6 + (dir > 0 ? 0 : 10), py, 2, 12, c.shade)
					}
				}
			}
			cells.flush()
		}
		drawBoard(cells, m, seq, now)
		cells.flush()
	})

	/** Lettering, centred on `cx`, its top at `y`, `cell` px a cell. */
	const lettering = (
		cells: ReturnType<typeof cellBatch>,
		text: string,
		cx: number,
		y: number,
		cell: number,
		colour: string,
	) => {
		const left = snap(cx - (textCells(text) * cell) / 2)
		cells.fillStyle = colour
		for (const [x, ry, w] of textRuns(text))
			cells.fillRect(left + x * cell, y + ry * cell, w * cell, cell)
	}

	/** The board: what it's up to, and what's to be remembered or done. */
	function drawBoard(
		cells: ReturnType<typeof cellBatch>,
		m: ReturnType<typeof nowOf>,
		seq: number[],
		now: number,
	) {
		const { x, y, w, h } = BOARD
		const rect = (
			rx: number,
			ry: number,
			rw: number,
			rh: number,
			c: string,
		) => {
			cells.fillStyle = c
			cells.fillRect(snap(rx), snap(ry), snap(rw), snap(rh))
		}
		// Hung by chains from the top of the screen.
		for (const cx of [x + 28, x + w - 32])
			for (let cy = 0; cy < y; cy += 6) {
				rect(cx, cy, 4, 4, '#9aa6b0')
				rect(cx, cy + 4, 4, 2, '#5f6b76')
			}
		rect(x, y, w, h, BOARD_FRAME)
		rect(x, y, w, 2, BOARD_FRAME_LIT)
		rect(x, y + h - 4, w, 4, '#2d1e12')
		rect(x + 6, y + 6, w - 12, h - 12, BOARD_DARK)
		const cx = x + w / 2
		const done = !!world.order()
		// Which round, and which shape.
		lettering(
			cells,
			`ROUND ${m.round}`,
			x + 20 + (textCells(`ROUND ${m.round}`) * 2) / 2,
			y + 12,
			2,
			'#9fc4e0',
		)
		if (!done && (m.phase === 'move' || m.phase === 'open')) {
			const label = `${m.step + 1}/${m.n}`
			lettering(
				cells,
				label,
				x + w - 14 - (textCells(label) * 2) / 2,
				y + 12,
				2,
				'#9fc4e0',
			)
		}
		// The middle of it.
		const shape = (p: number, blink: boolean) => {
			if (blink) return
			const size = 28
			const c = PLATFORM_COLOURS[p]
			const sx = snap(cx - (size * CELL) / 2)
			const sy = y + 32
			for (const [rx, ry, rw] of shapeRuns(SHAPE_NAMES[p], size))
				rect(
					sx + rx * CELL,
					sy + ry * CELL,
					rw * CELL,
					CELL,
					ry < 3 ? c.lit : ry > size - 4 ? c.shade : c.base,
				)
		}
		if (done) lettering(cells, 'THE END', cx, y + 44, 4, CREAM)
		else if (m.phase === 'ready')
			lettering(cells, 'READY', cx, y + 44, 4, CREAM)
		else if (m.phase === 'watch') {
			if (m.t < 40 && m.shown < 0 && m.seen === 0)
				lettering(cells, 'WATCH!', cx, y + 44, 4, '#ffd23f')
			else if (m.shown >= 0) shape(seq[m.shown], false)
		} else if (m.phase === 'move') {
			if (m.step === 0 && m.t < 36)
				lettering(cells, 'GO!', cx, y + 40, 6, '#ffd23f')
			else lettering(cells, '?', cx, y + 40, 6, CREAM)
		} else if (m.phase === 'open')
			shape(seq[m.step], Math.floor(now / 6) % 2 === 0 && m.t > 8)
		else lettering(cells, 'CLEAR!', cx, y + 44, 4, '#7ccf6c')
		// One dot a shape: seen, done, or to come.
		const dot = m.n > 20 ? 4 : 6
		const pitch = m.n > 20 ? 6 : 10
		const row = x + (w - m.n * pitch) / 2 + (pitch - dot) / 2
		for (let i = 0; i < m.n; i++) {
			const reached =
				m.phase === 'watch' || m.phase === 'ready'
					? i < m.seen
					: m.phase === 'clear' || i < m.step
			const current = (m.phase === 'move' || m.phase === 'open') && i === m.step
			rect(
				row + i * pitch,
				y + h - 32,
				dot,
				dot,
				current ? CREAM : reached ? '#7ccf6c' : '#2f4a66',
			)
		}
		// The time left to be in place, draining.
		if (!done && m.phase === 'move') {
			const left = 1 - m.t / m.length
			const urgent = m.length - m.t <= WARNING
			const colour =
				left > 0.5 ? '#7ccf6c' : left > 0.25 ? '#fadf6a' : '#e24a3b'
			rect(x + 12, y + h - 22, w - 24, 8, '#0b1826')
			if (!urgent || Math.floor(now / 4) % 2 === 0)
				rect(x + 12, y + h - 22, (w - 24) * left, 8, colour)
		} else if (m.phase === 'open') {
			rect(x + 12, y + h - 22, w - 24, 8, '#0b1826')
			rect(x + 12, y + h - 22, (w - 24) * (1 - m.t / OPEN), 8, '#e24a3b')
		}
	}

	/** The surface of the sea at `x` across the screen, rippling. */
	const surface = (x: number, now: number) =>
		Math.round(
			(WATERLINE +
				2 * Math.sin(x / 37 + now / 20) +
				Math.sin(x / 13 - now / 11)) /
				CELL,
		) * CELL

	const sea = layer('dunk-sea', 'foreground', (ctx, now) => {
		// The sea, over everything under its edge, see-through, with foam along it.
		const cells = cellBatch(ctx)
		cells.fillStyle = seeThrough(SEA, SEA_OVER)
		for (let x = 0; x < VIEW_WIDTH; x += CELL * 2) {
			const top = surface(x, now)
			cells.fillRect(x, top, CELL * 2, VIEW_HEIGHT - top)
		}
		cells.fillStyle = FOAM
		for (let x = 0; x < VIEW_WIDTH; x += CELL * 2)
			if ((x / (CELL * 2) + Math.floor(now / 16)) % 5 !== 0)
				cells.fillRect(x, surface(x, now) - CELL, CELL * 2, CELL)
		// Crests on the water, coming and going.
		for (let i = 0; i < 9; i++) {
			const shown = (now / 50 + i * 0.37) % 1
			if (shown > 0.7) continue
			const x = snap(30 + i * 108 + shown * 20)
			const y = WATERLINE + 14 + (i % 3) * 12
			cells.fillRect(x, y, 14, CELL)
			cells.fillRect(x + 4, y - CELL, 6, CELL)
		}
		cells.flush()
	})

	/** Splashes, in front of the sea: a column of white water, drops flung out, a ring of foam. */
	const splashes = layer('dunk-splashes', 'foreground', (ctx, now) => {
		for (const splash of show.splashes) {
			const t = now - splash.at
			if (t < 0 || t >= SPLASH_TICKS) continue
			const x = splash.x - ARENA_LEFT
			const fade = 1 - t / SPLASH_TICKS
			ctx.fillStyle = FOAM
			if (t < 14) {
				ctx.globalAlpha = 0.9
				const tall = Math.round((t < 6 ? t * 6 : (14 - t) * 4.5) / CELL) * CELL
				ctx.fillRect(
					Math.round(x / CELL) * CELL - 6,
					WATERLINE - tall,
					12,
					tall,
				)
			}
			ctx.globalAlpha = fade
			for (let k = 0; k < 10; k++) {
				const out = ((k * 7) % 10) / 9 - 0.5
				const up = 5 + ((k * 5) % 4)
				const dx = x + out * 6 * t
				const dy = WATERLINE - (up * t - 0.35 * t * t)
				if (dy > WATERLINE) continue
				const size = k % 3 ? CELL : CELL * 2
				ctx.fillRect(
					Math.round(dx / CELL) * CELL,
					Math.round(dy / CELL) * CELL,
					size,
					size,
				)
			}
			const ring = Math.round((12 + t * 1.6) / CELL) * CELL
			ctx.fillRect(Math.round(x / CELL) * CELL - ring - 6, WATERLINE, 8, CELL)
			ctx.fillRect(Math.round(x / CELL) * CELL + ring - 2, WATERLINE, 8, CELL)
			ctx.globalAlpha = 1
		}
	})

	return [backdrop, platforms, sea, splashes]
}
