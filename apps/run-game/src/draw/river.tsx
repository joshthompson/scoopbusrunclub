import { createController } from 'scoopjs'
import {
	CROC_COLUMNS,
	CROC_ROWS,
	CROC_WATERLINE,
	crocodile,
} from '../courses/kit/nileScenery'
import type { Obstacle } from '../courses/types'
import { PATH_BACK, VERGE, VIEW_HEIGHT } from '../game/constants'
import { crocDip } from '../game/river'
import type { ObstacleState, World } from '../game/world'
import { paintPicture } from './paint/picture'

/**
 * A River across the course (see `Course['river']`), drawn: its water
 * behind the path, back across the field and bending away into the
 * distance, behind everyone on the path; and its water in front of them,
 * from its surface down, over the shins of whoever's wading, and over
 * its crocodiles but for their backs.
 */

const CELL = 2
/** How far on up past the Ground's far edge the water goes, bending away into the distance. */
const AWAY = 44
/** How far it bends off to the right, going away. */
const BEND = 70
/** On down past the bottom of the screen, for the camera looking down. */
const BELOW = 200
/** How the ripples go: how far apart their rows are, and how fast they drift. */
const RIPPLE_ROWS = 10
const RIPPLE_DRIFT = 0.15

/** Reeds and lily pads in the shallows: their greens, a bulrush, and a lotus flower. */
const REED = '#4f7f2a'
const REED_LIT = '#79a944'
const REED_DARK = '#355a1c'
const BULRUSH = '#7a4a24'
const PAD = '#5d9a3c'
const PAD_LIT = '#86bd5a'
const LOTUS = '#f4eef6'
const LOTUS_HEART = '#f2d14a'
/** How far out from each bank the shallows go, where things grow. */
const SHALLOWS = 64

/** A number from 0 up to 1 for `n`, the same every time: where things grow. */
const hash = (n: number) => {
	const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
	return s - Math.floor(s)
}
const cell = (px: number) => Math.round(px / CELL) * CELL

/**
 * The shore at each bank, `rows` tall from `from`: wet sand out into the
 * water, unevenly, further here and less there, and darker where the
 * water laps it.
 */
function shore(
	ctx: CanvasRenderingContext2D,
	width: number,
	from: number,
	rows: number,
	seed: number,
	bank: string,
	wet: string,
) {
	for (let y = 0; y < rows; y += CELL) {
		const out = (side: number) =>
			cell(
				CELL * 2 +
					(Math.sin((from + y) * 0.09 + seed + side) * 0.5 + 0.5) * 10 +
					hash(seed + side * 31 + y) * 4,
			)
		const left = out(0)
		const right = out(7)
		ctx.fillStyle = bank
		ctx.fillRect(-CELL, from + y, left + CELL, CELL)
		ctx.fillRect(width - right, from + y, right + CELL, CELL)
		ctx.fillStyle = wet
		ctx.fillRect(left, from + y, CELL, CELL)
		ctx.fillRect(width - right - CELL, from + y, CELL, CELL)
	}
}

/**
 * A tuft of reeds growing out of the shallows at `x`, its foot at `base`:
 * a few blades, some bent over at the top, and now and then a bulrush.
 */
function tuft(
	ctx: CanvasRenderingContext2D,
	x: number,
	base: number,
	seed: number,
) {
	const blades = 3 + Math.floor(hash(seed) * 3)
	for (let i = 0; i < blades; i++) {
		const bx = cell(x + (i - blades / 2) * CELL * 1.5)
		const tall = cell(CELL * (5 + hash(seed + i * 3) * 9))
		ctx.fillStyle = i % 3 === 0 ? REED_DARK : i % 3 === 1 ? REED : REED_LIT
		ctx.fillRect(bx, base - tall, CELL, tall)
		// Bent over at the top, this way or that.
		if (hash(seed + i * 7) > 0.55)
			ctx.fillRect(
				bx + (hash(seed + i) > 0.5 ? CELL : -CELL),
				base - tall - CELL,
				CELL,
				CELL * 2,
			)
	}
	if (hash(seed + 17) > 0.6) {
		const tall = cell(CELL * (12 + hash(seed + 19) * 4))
		const bx = cell(x)
		ctx.fillStyle = REED
		ctx.fillRect(bx, base - tall, CELL, tall)
		ctx.fillStyle = BULRUSH
		ctx.fillRect(bx - CELL / 2, base - tall - CELL * 4, CELL * 1.5, CELL * 4)
	}
}

/** A lily pad floating at `x`, `y`, and now and then a lotus flower on it. */
function pad(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	seed: number,
) {
	const at = cell(x)
	const wide = CELL * (4 + Math.floor(hash(seed) * 3))
	ctx.fillStyle = PAD
	ctx.fillRect(at, y, wide, CELL)
	ctx.fillStyle = PAD_LIT
	ctx.fillRect(at + CELL, y - CELL, wide - CELL * 2, CELL)
	if (hash(seed + 5) > 0.55) {
		ctx.fillStyle = LOTUS
		ctx.fillRect(at + CELL * 2, y - CELL * 3, CELL, CELL * 2)
		ctx.fillRect(at + CELL, y - CELL * 2, CELL * 3, CELL)
		ctx.fillStyle = LOTUS_HEART
		ctx.fillRect(at + CELL * 2, y - CELL * 2, CELL, CELL)
	}
}

/**
 * What grows in the shallows near each bank, between `from` and `to` down
 * the layer: tufts of reeds at `rows`, lily pads further out at `pads`.
 */
function shallows(
	ctx: CanvasRenderingContext2D,
	width: number,
	rows: number[],
	pads: number[],
	seed: number,
) {
	for (const [i, y] of pads.entries())
		for (const side of [0, 1]) {
			const s = seed + i * 13 + side * 101
			const off = 40 + hash(s) * 70
			pad(ctx, side ? width - off - CELL * 6 : off, y, s)
		}
	for (const [i, y] of rows.entries())
		for (const side of [0, 1]) {
			const s = seed + i * 29 + side * 211
			const off = 10 + hash(s) * (SHALLOWS - 20)
			tuft(ctx, side ? width - off : off, y, s)
			// Often another beside it: they grow in clumps.
			if (hash(s + 3) > 0.35) {
				const by = off + 10 + hash(s + 4) * 8
				tuft(ctx, side ? width - by : by, y + CELL * 2, s + 1)
			}
		}
}

/** Light on the water, a dash here and there, drifting with the current: over `width` by `height`, its rows `from` its top. */
function ripples(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	ticks: number,
	shine: string,
	from = 0,
) {
	ctx.fillStyle = shine
	for (let row = 0; from + row * RIPPLE_ROWS < height; row++) {
		const y = from + row * RIPPLE_ROWS
		// Each row its own pattern, and its own pace, nearer ones quicker.
		const gap = 90 + ((row * 37) % 50)
		const drift = (ticks * RIPPLE_DRIFT * (1 + (row % 3) * 0.3)) % gap
		for (let x = ((row * 29) % gap) - gap + drift; x < width; x += gap) {
			const long = 4 + ((row + Math.round(x)) % 3) * 2
			const at = Math.round(x / CELL) * CELL
			if (at + long > 0) ctx.fillRect(Math.max(0, at), y, long, CELL)
		}
	}
}

/** The water behind the path: from its surface back to the Ground's far edge, and on away. */
export function createRiver(world: World) {
	const { river } = world.course
	const look = world.course.look?.river
	if (!river || !look) return []
	const width = river.to - river.from
	/** The Ground's far edge, the field behind it from there. */
	const far = river.level - PATH_BACK - VERGE
	const top = far - AWAY
	return [
		createController({
			init: () => ({
				id: 'river',
				type: 'river',
				x: () => river.from,
				y: () => top,
				width: () => width,
				height: () => river.level - top,
			}),
			drawReach: { right: BEND },
			draw: ({ ctx }) => {
				ctx.imageSmoothingEnabled = false
				// Away up the field, bending off to the right as it goes, a
				// little narrower.
				for (let y = 0; y < AWAY; y += CELL) {
					const away = (AWAY - y) / AWAY
					const shift = Math.round((BEND * away * away) / CELL) * CELL
					const narrower = Math.round((width * 0.12 * away) / CELL) * CELL
					ctx.fillStyle = look.water
					ctx.fillRect(shift + narrower, y, width - narrower * 2, CELL)
					// Hazier the further off.
					ctx.save()
					ctx.globalAlpha *= 0.25 * away
					ctx.fillStyle = look.shine
					ctx.fillRect(shift + narrower, y, width - narrower * 2, CELL)
					ctx.restore()
					// Its banks, wet sand, either side.
					ctx.fillStyle = look.bank
					ctx.fillRect(shift + narrower - CELL, y, CELL, CELL)
					ctx.fillRect(shift + width - narrower, y, CELL, CELL)
				}
				// Behind the path, back to the field.
				ctx.fillStyle = look.water
				ctx.fillRect(0, AWAY, width, river.level - far)
				ripples(ctx, width, river.level - top, world.ticks(), look.shine, AWAY)
				// Its shores, and reeds and lily pads in the shallows.
				const rows = river.level - far
				shore(ctx, width, AWAY, rows, 3, look.bank, look.wet)
				shallows(
					ctx,
					width,
					[AWAY + 8, AWAY + 18, AWAY + 30, AWAY + rows - 2],
					[AWAY + 14, AWAY + 30],
					41,
				)
			},
		}),
	]
}

/** The water in front of the path, from its surface down: over everyone in it. */
export function createRiverFront(world: World) {
	const { river } = world.course
	const look = world.course.look?.river
	if (!river || !look) return []
	const width = river.to - river.from
	const height = VIEW_HEIGHT - river.level + BELOW
	return [
		createController({
			init: () => ({
				id: 'river-front',
				type: 'river-front',
				x: () => river.from,
				y: () => river.level,
				width: () => width,
				height: () => height,
			}),
			draw: ({ ctx }) => {
				ctx.imageSmoothingEnabled = false
				// Not quite clear: legs and crocodiles show through it, dimly.
				ctx.save()
				ctx.globalAlpha *= 0.86
				const fill = ctx.createLinearGradient(0, 0, 0, 90)
				fill.addColorStop(0, look.water)
				fill.addColorStop(1, look.deep)
				ctx.fillStyle = fill
				ctx.fillRect(0, 0, width, height)
				ctx.restore()
				// Its surface, lit, along the top.
				ctx.fillStyle = look.shine
				ctx.fillRect(0, 0, width, CELL)
				ripples(ctx, width, 60, world.ticks(), look.shine, 5)
				// Its shores, and reeds and lily pads in the shallows.
				shore(ctx, width, 0, height, 9, look.bank, look.wet)
				shallows(ctx, width, [12, 26, 46, 72, 104], [20, 38, 60], 77)
			},
			drawReach: { left: CELL, right: CELL },
		}),
	]
}

/** How long a crocodile takes to bob up and down, lying there, in ticks. */
const BOB = 90

/**
 * A crocodile in the River, lying across the way: only its back, eyes and
 * nostrils out of the water, the rest under it, under the water in front.
 * Bobbing a little; dipped under whoever's just bounced on it (see
 * `crocDip`). By the race's tick, so the same on every screen.
 */
export function createCrocodile(
	world: World,
	state: ObstacleState,
	o: Extract<Obstacle, { kind: 'crocodile' }>,
	id: string,
) {
	const { river } = world.course
	const width = CROC_COLUMNS * CELL
	const height = CROC_ROWS * CELL
	const top =
		(river?.level ?? world.terrain.groundY(o.x)) - CROC_WATERLINE * CELL
	/** Each its own beat, so they don't all bob together. */
	const beat = Math.round(o.x) % BOB
	return createController({
		init: () => ({
			id,
			type: 'hazard',
			x: () => Math.round(o.x - width / 2),
			y: () => top,
			width: () => width,
			height: () => height,
		}),
		drawReach: { bottom: 8 },
		draw: ({ ctx, image }) => {
			const ticks = world.ticks()
			const bob =
				Math.sin(((ticks + beat) / BOB) * Math.PI * 2) > 0.3 ? 0 : CELL
			const since = state.flown === undefined ? undefined : ticks - state.flown
			const down = Math.round(bob + crocDip(since))
			paintPicture(ctx, image, crocodile, 0, down, width, height)
		},
	})
}
