import {
	type DrawPainting,
	createController,
	createObjectSignal,
} from 'scoopjs'
import type { JSX } from 'solid-js'
import {
	PAINT_CAN,
	PAINT_CAN_HEIGHT,
	PAINT_CAN_WIDTH,
} from '../courses/kit/warehouseScenery'
import { GROUND_Y, VIEW_HEIGHT, VIEW_WIDTH } from '../game/constants'
import type { World } from '../game/world'
import {
	CRUMBLE_TICKS,
	FALL_TICKS,
	HOIST_RAIL,
	MAIN_TOP,
	PAINT_LEFT,
	PAINT_TOP,
	PANELS,
	PANEL_BOTTOM,
	PANEL_TOP,
	PANEL_WIDTH,
	SPLAT_REACH,
	SPLAT_TICKS,
	WALL_BOTTOM,
	WALL_CELL,
	WALL_COLUMNS,
	WALL_LEFT,
	WALL_RIGHT,
	WALL_ROWS,
	WALL_TOP,
	WALL_WORTH,
	brushAt,
	paintOf,
} from '../minigames/paintbrush'
import { mixHex } from './art/hats'
import { cachedArt } from './canvasArt'
import { cellBatch, seeThrough } from './paint/cellBatch'
import { paintPicture } from './paint/picture'

/** A pixel, as everything's drawn: 2 px. */
const CELL = 2
/** How much of the world the screen shows, zoomed out. */
const SEEN_WIDTH = VIEW_WIDTH * 2
const SEEN_HEIGHT = VIEW_HEIGHT * 2
/** How far down the world the wall's drawn: to the back of the yard's path. */
const BOTTOM = 474
/** Where the roof's edge is, its gutter, and the brick from under it. */
const ROOF = PAINT_TOP + 12
const GUTTER = PAINT_TOP + 40
const BRICK_TOP = PAINT_TOP + 48

const SKY = '#b9c5cc'
const ROOF_METAL = '#6d747a'
const ROOF_RIB = '#848b91'
const ROOF_LIT = '#a1a9ae'
const RUST = '#7d5a44'
const GUTTER_LIT = '#c0c7cc'
const GUTTER_STEEL = '#9aa3aa'
const GUTTER_SHADE = '#5d656c'
const RAIL = '#3d4349'
const RAIL_LIT = '#5f666d'
const BRICK = '#8b4a3b'
const BRICK_LIT = '#9c5646'
const MORTAR = '#6f3a2f'
const PIER_SHADOW = '#5e3027'
const STONE = '#b7ab98'
const STONE_SHADE = '#8f8473'
const WHITE = '#f1efe8'
const WHITE_ROLLER = '#ebe8e0'
const PANEL_WHITE = '#f6f4ee'
const WHITE_GHOST_MORTAR = '#e6e2d8'
const FRAME = '#4d5459'
const FRAME_LIT = '#737b82'
const PLATE = '#f2c230'
const PLATE_SHADE = '#b68e1c'
const INK = '#2b2722'
/** The last games' paint, showing faintly through the white over it. */
const GHOSTS = ['#efdcda', '#dce4ee', '#ede6cd', '#dbe9da', '#e8dcec']
const CONCRETE = '#80817f'
const CONCRETE_LIT = '#9a9b98'
const CONCRETE_GRIME = '#6c6d6b'
const PIPE = '#5d656c'
const PIPE_LIT = '#8a939a'
const WEED = '#5e7d3a'
const WEED_LIT = '#7c9c4c'
const PLANK_BITS = ['#9b8a72', '#b5a48a', '#6f604d']
const DUST = '#c9bba3'

/** A number from a place, the same every time. */
const hash = (x: number, y: number) => {
	let h = Math.imul(x * 374761393 + y * 668265263, 1274126177)
	h ^= h >>> 13
	return ((h >>> 0) % 1000) / 1000
}
/** Snapped to the 2 px grid. */
const snap = (n: number) => Math.round(n / CELL) * CELL

/** "x2", in cells: on the plate under each panel. */
const TIMES_TWO = ['x.x.222', '.x....2', 'x.x.222', '....2..', '....222']

/**
 * The warehouse, as it never changes, in the world's own y (and across
 * the screen): a sliver of grey sky over its roof's corrugated edge, the
 * hoists' rail under it, the gutter; its brick, a pier at either end, a
 * drainpipe down one and floodlights on the other; up top, the three old
 * billboard panels, whitewashed, a "x2" plate under each, and a stone band
 * under them; below, the main wall's white, rolled on, the last games'
 * paint and the brick's mortar faintly through it; its concrete foot,
 * weeds along it.
 */
function paintWarehouse(ctx: CanvasRenderingContext2D) {
	ctx.translate(0, -PAINT_TOP)
	const cells = cellBatch(ctx)
	const rect = (x: number, y: number, w: number, h: number, c: string) => {
		cells.fillStyle = c
		cells.fillRect(x, y, w, h)
	}
	const W = SEEN_WIDTH
	// The sky, and the roof's edge, ribbed, rust run down it.
	rect(0, PAINT_TOP, W, ROOF - PAINT_TOP, SKY)
	rect(0, ROOF, W, GUTTER - ROOF, ROOF_METAL)
	rect(0, ROOF, W, CELL, ROOF_LIT)
	for (let x = 4; x < W; x += 12)
		rect(x, ROOF + 2, 4, GUTTER - ROOF - 2, ROOF_RIB)
	for (let x = 30; x < W; x += 140) {
		const long = 6 + Math.round(hash(x, 1) * 8) * 2
		rect(x, ROOF + 4, 2, long, RUST)
		rect(x + 2, ROOF + 6, 2, long - 4, RUST)
	}
	cells.flush()
	// The hoists' rail, along under the roof, and the gutter.
	rect(0, HOIST_RAIL - 6, W, 2, RAIL_LIT)
	rect(0, HOIST_RAIL - 4, W, 4, RAIL)
	rect(0, GUTTER, W, BRICK_TOP - GUTTER, GUTTER_STEEL)
	rect(0, GUTTER, W, CELL, GUTTER_LIT)
	rect(0, BRICK_TOP - CELL, W, CELL, GUTTER_SHADE)
	cells.flush()

	// Brick, all of it: courses 8 px, each brick 16 px, every other course
	// half a brick along, a few catching the light.
	rect(0, BRICK_TOP, W, WALL_BOTTOM - BRICK_TOP, BRICK)
	for (let y = BRICK_TOP; y < WALL_BOTTOM; y += 8) {
		rect(0, y + 6, W, 2, MORTAR)
		const off = ((y - BRICK_TOP) / 8) % 2 ? 8 : 0
		for (let x = off; x < W; x += 16) {
			rect(x, y, 2, 6, MORTAR)
			if (hash(x, y) < 0.12) rect(x + 2, y, 14, 2, BRICK_LIT)
		}
	}
	cells.flush()
	// A stone band along between the storeys.
	rect(0, MAIN_TOP - 18, W, 8, STONE)
	rect(0, MAIN_TOP - 12, W, 2, STONE_SHADE)
	// The piers' near edges lit, and their shadows on the wall either side.
	for (const [x, lit] of [
		[WALL_LEFT - 4, true],
		[WALL_RIGHT + 2, true],
		[WALL_LEFT - 2, false],
		[WALL_RIGHT, false],
	] as const)
		rect(
			x,
			BRICK_TOP,
			2,
			WALL_BOTTOM - BRICK_TOP,
			lit ? BRICK_LIT : PIER_SHADOW,
		)
	cells.flush()

	// The panels' frames, bolted to the brick, and their plates.
	for (const px of PANELS) {
		const h = PANEL_BOTTOM - PANEL_TOP
		rect(px - 6, PANEL_TOP - 6, PANEL_WIDTH + 12, h + 12, FRAME)
		rect(px - 6, PANEL_TOP - 6, PANEL_WIDTH + 12, 2, FRAME_LIT)
		rect(px - 6, PANEL_TOP - 6, 2, h + 12, FRAME_LIT)
		for (const [bx, by] of [
			[px - 4, PANEL_TOP - 4],
			[px + PANEL_WIDTH + 2, PANEL_TOP - 4],
			[px - 4, PANEL_BOTTOM + 2],
			[px + PANEL_WIDTH + 2, PANEL_BOTTOM + 2],
		])
			rect(bx, by, 2, 2, GUTTER_LIT)
		// Rust run down from its bottom corners.
		rect(px, PANEL_BOTTOM + 6, 2, 10, RUST)
		rect(px + PANEL_WIDTH - 2, PANEL_BOTTOM + 6, 2, 14, RUST)
		const plateX = px + PANEL_WIDTH / 2 - 12
		const plateY = PANEL_BOTTOM + 14
		rect(plateX, plateY, 24, 16, PLATE)
		rect(plateX, plateY + 14, 24, 2, PLATE_SHADE)
		TIMES_TWO.forEach((row, ry) => {
			for (let rx = 0; rx < row.length; rx++)
				if (row[rx] !== '.')
					rect(plateX + 5 + rx * CELL, plateY + 3 + ry * CELL, CELL, CELL, INK)
		})
	}
	cells.flush()

	// The white: every cell of it there is to paint, rolled on in strips.
	for (let r = 0; r < WALL_ROWS; r++)
		for (let c = 0; c < WALL_COLUMNS; c++) {
			const worth = WALL_WORTH[r * WALL_COLUMNS + c]
			if (!worth) continue
			const x = WALL_LEFT + c * WALL_CELL
			const y = WALL_TOP + r * WALL_CELL
			rect(
				x,
				y,
				WALL_CELL,
				WALL_CELL,
				worth > 1 ? PANEL_WHITE : Math.floor(x / 44) % 2 ? WHITE : WHITE_ROLLER,
			)
		}
	cells.flush()
	// Through it, faintly: the brick's mortar, and blots of the old paint.
	const white = (x: number, y: number) => {
		const c = Math.floor((x - WALL_LEFT) / WALL_CELL)
		const r = Math.floor((y - WALL_TOP) / WALL_CELL)
		return (
			c >= 0 &&
			r >= 0 &&
			c < WALL_COLUMNS &&
			r < WALL_ROWS &&
			WALL_WORTH[r * WALL_COLUMNS + c] === 1
		)
	}
	for (let y = BRICK_TOP; y < WALL_BOTTOM; y += 8)
		for (let x = WALL_LEFT; x < WALL_RIGHT; x += CELL)
			if (white(x, y + 6) && hash(x >> 3, y) < 0.35)
				rect(x, y + 6, CELL, CELL, WHITE_GHOST_MORTAR)
	for (let k = 0; k < 18; k++) {
		const bx = WALL_LEFT + 60 + hash(k, 11) * (WALL_RIGHT - WALL_LEFT - 120)
		const by = MAIN_TOP + 40 + hash(k, 12) * (WALL_BOTTOM - MAIN_TOP - 80)
		const size = 28 + hash(k, 13) * 40
		const colour = GHOSTS[k % GHOSTS.length]
		for (let y = snap(by - size); y < by + size; y += CELL)
			for (let x = snap(bx - size); x < bx + size; x += CELL) {
				const d = Math.hypot((x - bx) / size, (y - by) / (size * 0.7))
				const edge = d + (hash(x >> 2, y >> 2) - 0.5) * 0.5
				if (edge < 1 && white(x, y) && hash(x, y) < 0.7)
					rect(x, y, CELL, CELL, colour)
			}
	}
	cells.flush()

	// A drainpipe down the left pier, off the gutter; floodlights on the right one.
	rect(64, GUTTER, 8, BOTTOM - GUTTER, PIPE)
	rect(64, GUTTER, 2, BOTTOM - GUTTER, PIPE_LIT)
	for (let y = GUTTER + 60; y < BOTTOM; y += 90) rect(60, y, 16, 4, PIPE)
	rect(60, BOTTOM - 6, 18, 6, PIPE)
	for (const ly of [-300, 60]) {
		rect(W - 58, ly, 20, 4, RAIL)
		rect(W - 54, ly + 4, 14, 12, RAIL)
		rect(W - 52, ly + 16, 10, 4, '#fff3b0')
	}
	cells.flush()

	// Its concrete foot, grimy, weeds along it.
	rect(0, WALL_BOTTOM, W, BOTTOM - WALL_BOTTOM, CONCRETE)
	rect(0, WALL_BOTTOM, W, CELL, CONCRETE_LIT)
	rect(0, WALL_BOTTOM + 22, W, 2, CONCRETE_GRIME)
	rect(0, WALL_BOTTOM + 24, W, 2, CONCRETE_LIT)
	for (let x = 0; x < W; x += CELL)
		if (hash(x, 7) < 0.18)
			rect(
				x,
				WALL_BOTTOM + 4 + Math.floor(hash(x, 9) * 18) * CELL,
				CELL,
				CELL,
				CONCRETE_GRIME,
			)
	rect(0, BOTTOM - 4, W, 4, CONCRETE_GRIME)
	for (let x = 20; x < W; x += 70) {
		const tx = x + Math.round(hash(x, 3) * 20) * CELL
		rect(tx, BOTTOM - 8, 2, 8, WEED)
		rect(tx - 4, BOTTOM - 4, 2, 4, WEED)
		rect(tx + 4, BOTTOM - 6, 2, 6, WEED_LIT)
	}
	cells.flush()
}

/** `#rrggbb` as its channels. */
const channels = (hex: string) =>
	[1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16))

/**
 * Paintbrush, drawn: the warehouse wall, and the paint on it, everyone's,
 * a cell at a time, each colour a little lighter or darker here and
 * there, as paint goes on; the paint cans; the rotten planks crumbling
 * and falling; bursts of paint off heads; and a glow round a big brush.
 * Nothing, if the world's not a game of it.
 */
export function createPaintbrush(world: World) {
	if (world.minigame?.id !== 'paintbrush') return []
	const show = paintOf(world)
	if (!show) return []

	// Each colour's tones, as channels: its own, lighter, and darker.
	const tones = show.colours.map((c) => [
		channels(c),
		channels(mixHex(c, '#ffffff', 0.14)),
		channels(mixHex(c, '#000000', 0.1)),
	])
	/** Which tone each cell's painted in, by where it is. */
	const toneOf = new Uint8Array(WALL_COLUMNS * WALL_ROWS).map((_, i) => {
		const n = hash(i % WALL_COLUMNS, Math.floor(i / WALL_COLUMNS))
		return n < 0.7 ? 0 : n < 0.85 ? 1 : 2
	})
	const canvas = document.createElement('canvas')
	canvas.width = WALL_COLUMNS
	canvas.height = WALL_ROWS
	const paintCtx = canvas.getContext('2d')
	const pixels = paintCtx?.createImageData(WALL_COLUMNS, WALL_ROWS)
	/** What's been put in `pixels` so far, to change only what's changed. */
	const drawn = new Uint8Array(WALL_COLUMNS * WALL_ROWS)

	/** One picture over the whole arena, `type` saying what it's in front of, drawn in the world's own x and y. */
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
				...createObjectSignal(PAINT_LEFT, 'x'),
				...createObjectSignal(PAINT_TOP, 'y'),
				...createObjectSignal({} as JSX.CSSProperties, 'style'),
				width: () => SEEN_WIDTH,
				height: () => SEEN_HEIGHT,
			}),
			draw({ ctx, image }) {
				// Read the tick, so it's painted again every one.
				const now = world.ticks()
				ctx.save()
				ctx.translate(-PAINT_LEFT, -PAINT_TOP)
				paint(ctx, now, image)
				ctx.restore()
			},
		})

	const wall = createController({
		init: () => ({
			id: 'paintbrush-wall',
			type: 'scenery',
			...createObjectSignal(PAINT_LEFT, 'x'),
			...createObjectSignal(PAINT_TOP, 'y'),
			...createObjectSignal({} as JSX.CSSProperties, 'style'),
			width: () => SEEN_WIDTH,
			height: () => BOTTOM - PAINT_TOP,
		}),
		draw({ ctx }) {
			world.ticks()
			const height = BOTTOM - PAINT_TOP
			ctx.drawImage(
				cachedArt(
					'paintbrush-warehouse',
					SEEN_WIDTH,
					height,
					paintWarehouse,
					1,
				),
				0,
				0,
				SEEN_WIDTH,
				height,
			)
			if (!paintCtx || !pixels) return
			let changed = false
			for (let i = 0; i < show.cells.length; i++) {
				const v = show.cells[i]
				if (v === drawn[i]) continue
				drawn[i] = v
				changed = true
				const at = i * 4
				if (!v) {
					pixels.data[at + 3] = 0
					continue
				}
				const [r, g, b] = tones[v - 1][toneOf[i]]
				pixels.data[at] = r
				pixels.data[at + 1] = g
				pixels.data[at + 2] = b
				pixels.data[at + 3] = 255
			}
			if (changed) paintCtx.putImageData(pixels, 0, 0)
			ctx.imageSmoothingEnabled = false
			ctx.drawImage(
				canvas,
				WALL_LEFT,
				WALL_TOP - PAINT_TOP,
				WALL_COLUMNS * WALL_CELL,
				WALL_ROWS * WALL_CELL,
			)
		},
	})

	// Behind everyone: the paint cans, glowing, bobbing; dust off a plank
	// that's going, and its bits falling once it's gone.
	const behind = layer('paintbrush-cans', 'boost', (ctx, now, image) => {
		for (const can of show.cans) {
			const bob = Math.round(Math.sin((now - can.at) / 12)) * CELL
			const pulse = 0.25 + 0.15 * Math.sin(now / 8)
			ctx.fillStyle = `rgba(255, 236, 140, ${pulse.toFixed(3)})`
			ctx.beginPath()
			ctx.arc(can.x, can.y - PAINT_CAN_HEIGHT / 2 + bob, 22, 0, Math.PI * 2)
			ctx.fill()
			paintPicture(
				ctx,
				image,
				PAINT_CAN.src,
				snap(can.x - PAINT_CAN_WIDTH / 2),
				can.y - PAINT_CAN_HEIGHT - 2 + bob,
				PAINT_CAN_WIDTH,
				PAINT_CAN_HEIGHT,
			)
		}
		const cells = cellBatch(ctx)
		for (const plank of show.planks) {
			const p = world.platforms[plank.index]
			const top = GROUND_Y - p.height
			if (plank.since !== undefined && plank.gone === undefined) {
				// Dust trickling off its underside, more as it goes.
				const t = now - plank.since
				for (let k = 0; k < 10; k++) {
					if (hash(k, Math.floor((t + k * 7) / 12)) > t / CRUMBLE_TICKS + 0.3)
						continue
					const fall = (t * 2 + k * 23) % 60
					cells.fillStyle = DUST
					cells.fillRect(
						snap(p.x + 8 + hash(k, 5) * (p.width - 16)),
						top + 18 + snap(fall),
						CELL * 2,
						CELL * 2,
					)
				}
			}
			if (plank.gone !== undefined && now - plank.gone < FALL_TICKS) {
				// Its bits, tumbling down.
				const t = now - plank.gone
				for (let k = 0; k < 7; k++) {
					cells.fillStyle = PLANK_BITS[k % PLANK_BITS.length]
					const x =
						p.x + (k + 0.5) * (p.width / 7) + (hash(k, 3) - 0.5) * t * 1.2
					const y = top + 0.25 * t * t + hash(k, 4) * 6
					cells.fillRect(snap(x), snap(y), 8 + (k % 3) * 4, 6)
				}
			}
		}
		cells.flush()
	})

	// In front of everyone: bursts of paint flying off heads, and the glow
	// of a big brush round its bristles.
	const front = layer('paintbrush-splats', 'furby', (ctx, now) => {
		const cells = cellBatch(ctx)
		for (const s of show.splats) {
			const t = now - s.at
			if (t < 0 || t >= SPLAT_TICKS) continue
			cells.fillStyle = show.colours[s.who] ?? '#ffffff'
			for (let k = 0; k < 12; k++) {
				const angle = (k / 12) * Math.PI * 2 + hash(k, s.at) * 0.5
				const speed = 2 + hash(s.at, k) * 3
				const x = s.x + Math.cos(angle) * speed * t
				const y = s.y + Math.sin(angle) * speed * t + 0.08 * t * t
				const size = t < SPLAT_TICKS / 2 ? 8 : 4
				cells.fillRect(snap(x), snap(y), size, size)
			}
		}
		cells.flush()
		world.racers.forEach((racer, i) => {
			const left = show.bigUntil[i] - now
			if (!(left > 0)) return
			// Flickering out, as it runs out.
			if (left < 40 && Math.floor(now / 4) % 2) return
			const at = brushAt(racer)
			ctx.fillStyle = seeThrough(show.colours[i], 0.35)
			ctx.beginPath()
			ctx.arc(at.x, at.y, SPLAT_REACH * 0.75, 0, Math.PI * 2)
			ctx.fill()
		})
	})

	return [wall, behind, front]
}
