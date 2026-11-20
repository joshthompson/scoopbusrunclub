import { createController, createObjectSignal } from 'scoopjs'
import type { JSX } from 'solid-js'
import {
	FINISH_LINE,
	FINISH_LINE_HEIGHT,
	FINISH_LINE_WIDTH,
	FINISH_SIGN,
	PLAYGROUND_WALL,
	PLAY_CYPRESS,
	PLAY_CYPRESS_HEIGHT,
	PLAY_CYPRESS_WIDTH,
	PLAY_TREE,
	PLAY_TREE_HEIGHT,
	PLAY_TREE_WIDTH,
	START_LINE,
	START_LINE_WIDTH,
	START_SIGN,
	WALL_HEIGHT,
	WALL_WIDTH,
} from '../courses/kit/redLightScenery'
import { PATH_BACK, START_X, VIEW_HEIGHT, VIEW_WIDTH } from '../game/constants'
import type { World } from '../game/world'
import { ARENA_LEFT } from '../minigames/arena'
import {
	BALL_TICKS,
	DOLL_X,
	FINISH_X,
	FIRE_TICKS,
	type Light,
	type LightsShow,
	START_LINE_X,
	lightsOf,
} from '../minigames/redLightGreenLight'
import {
	BALL_SIZE,
	DOLL_BACK,
	DOLL_BALL,
	DOLL_EYES,
	DOLL_FIRE,
	DOLL_FRONT,
	DOLL_HEIGHT,
	DOLL_MOUTH,
	DOLL_SIDE,
	DOLL_SIDE_EYE,
	DOLL_WIDTH,
} from './art/doll'
import { paintPicture } from './paint/picture'

/** A pixel, as everything's drawn: 2 px. */
const CELL = 2
/** Her notes, as she sings: their colours. */
const NOTES = ['#e8423f', '#2fb5b0', '#8a5cc8', '#f58a2a']
/** How long a note takes to float up and away. */
const NOTE_RISES = 80
/** The traffic light: its box, and its lamps lit and dim. */
const LIGHT_BOX = '#3b3340'
const LIGHT_BOX_LIT = '#5a5062'
const RED_ON = '#ff4a3d'
const RED_OFF = '#5a2a2a'
const GREEN_ON = '#5be06a'
const GREEN_OFF = '#264a2c'
/** The dizzy stars, over whoever's been knocked flat. */
const DIZZY = '#ffe36a'
const INK = '#2b2722'

/** A rect, snapped to the 2 px grid. */
const rect = (
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	fill: string,
) => {
	ctx.fillStyle = fill
	ctx.fillRect(
		Math.round(x / CELL) * CELL,
		Math.round(y / CELL) * CELL,
		Math.max(CELL, Math.round(w / CELL) * CELL),
		Math.max(CELL, Math.round(h / CELL) * CELL),
	)
}

/**
 * Red Light, Green Light, drawn: its playground (a painted wall right
 * across the back, two trees, the start and finish lines and their signs,
 * a traffic light), the doll, her singing, her glare and her ball, and the
 * stars over whoever's been knocked flat. Nothing, if the world's not a
 * game of it.
 */
export function createRedLightGreenLight(world: World) {
	const show = lightsOf(world)
	if (!show) return []
	const ground = world.terrain.groundY(START_X)
	const back = ground - PATH_BACK

	/** A picture that never moves, its top left at `x`, `y` on the screen. */
	const still = (
		id: string,
		type: string,
		src: string,
		x: number,
		y: number,
		width: number,
		height: number,
	) =>
		createController({
			init: () => ({
				id,
				type,
				...createObjectSignal(ARENA_LEFT + x, 'x'),
				...createObjectSignal(y, 'y'),
				...createObjectSignal({} as JSX.CSSProperties, 'style'),
				width: () => width,
				height: () => height,
			}),
			draw({ ctx, image }) {
				paintPicture(ctx, image, src, 0, 0, width, height)
			},
		})

	/** One picture over the whole arena: `type` says what it's in front of. */
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
				// Read the tick, so it's painted again every one.
				paint(ctx, image, world.ticks())
			},
		})

	const dollLeft = Math.round(DOLL_X - ARENA_LEFT - DOLL_WIDTH / 2)
	const dollFeet = back + 2
	const dollTop = dollFeet - DOLL_HEIGHT
	// By the finish line, this side of it: the doll's right up to the screen's edge.
	const lightX = Math.round(FINISH_X - ARENA_LEFT) - 64
	const finishX = Math.round(FINISH_X - ARENA_LEFT)
	const startX = Math.round(START_LINE_X - ARENA_LEFT)

	const furniture = [
		// The wall, with its mural, right across the back, and the trees in front of it.
		still(
			'lights-wall',
			'scenery',
			PLAYGROUND_WALL,
			0,
			back - WALL_HEIGHT,
			WALL_WIDTH,
			WALL_HEIGHT,
		),
		still(
			'lights-tree-left',
			'scenery',
			PLAY_TREE,
			6,
			back + 4 - PLAY_TREE_HEIGHT * CELL,
			PLAY_TREE_WIDTH * CELL,
			PLAY_TREE_HEIGHT * CELL,
		),
		still(
			'lights-cypress',
			'scenery',
			PLAY_CYPRESS,
			540,
			back + 4 - PLAY_CYPRESS_HEIGHT * CELL,
			PLAY_CYPRESS_WIDTH * CELL,
			PLAY_CYPRESS_HEIGHT * CELL,
		),
		still(
			'lights-tree-right',
			'scenery',
			PLAY_TREE,
			390,
			back + 4 - PLAY_TREE_HEIGHT * CELL,
			PLAY_TREE_WIDTH * CELL,
			PLAY_TREE_HEIGHT * CELL,
		),
		// Their signs, stood at the back of the path.
		still(
			'lights-start-sign',
			'scenery',
			START_SIGN.src,
			startX - (START_SIGN.width * CELL) / 2,
			back + 2 - START_SIGN.height * CELL,
			START_SIGN.width * CELL,
			START_SIGN.height * CELL,
		),
		still(
			'lights-finish-sign',
			'scenery',
			FINISH_SIGN.src,
			finishX - (FINISH_SIGN.width * CELL) / 2,
			back + 2 - FINISH_SIGN.height * CELL,
			FINISH_SIGN.width * CELL,
			FINISH_SIGN.height * CELL,
		),
		// The lines, painted across the floor, behind everyone.
		still(
			'lights-start-line',
			'boost',
			START_LINE,
			startX - START_LINE_WIDTH,
			back,
			START_LINE_WIDTH * CELL,
			FINISH_LINE_HEIGHT * CELL,
		),
		still(
			'lights-finish-line',
			'boost',
			FINISH_LINE,
			finishX - FINISH_LINE_WIDTH,
			back,
			FINISH_LINE_WIDTH * CELL,
			FINISH_LINE_HEIGHT * CELL,
		),
	]

	/** The doll, her traffic light and her singing, behind everyone. */
	const doll = layer('lights-doll', 'platform', (ctx, image, now) => {
		const t = world.raceTicks()
		const light = show.lightAt(t)
		const green = light.kind === 'green' || light.kind === 'fake'
		const racing = world.phase() === 'running' && !world.order()
		const lastShot = show.spots.reduce(
			(last, [, at]) => Math.max(last, at),
			-1000,
		)
		const firing = racing && t - lastShot >= 0 && t - lastShot < FIRE_TICKS
		const view = pose(light, firing)
		const sway = view === 'back' && racing ? Math.sin(t / 9) : 0
		const bounce =
			view === 'back' && racing ? (Math.floor(t / 8) % 2) * -CELL : 0
		// Trembling, glaring; flung back a little as she fires.
		const shake = view === 'front' && racing ? (t % 4 < 2 ? CELL : 0) : 0
		const recoil = firing ? Math.max(0, FIRE_TICKS - (t - lastShot)) / 4 : 0
		const x =
			dollLeft + Math.round(sway * 2) * CELL + shake + Math.round(recoil) * CELL
		const y = dollTop + bounce

		paintTrafficLight(ctx, lightX, back, green)

		const src =
			view === 'back'
				? DOLL_BACK
				: view === 'side'
					? DOLL_SIDE
					: view === 'fire'
						? DOLL_FIRE
						: DOLL_FRONT
		paintPicture(ctx, image, src, x, y, DOLL_WIDTH, DOLL_HEIGHT)

		// Her eyes: pupils, looking where she's looking.
		if (view === 'front' || view === 'fire') {
			const look = lookAt(show, x + DOLL_WIDTH / 2, y + 50, t)
			const wide = view === 'fire' ? 1 : 3
			const glare = light.kind === 'red' && light.since < 6 ? 1 : 0
			for (const [ex, ey] of DOLL_EYES) {
				const px = x + (ex - Math.floor(wide / 2) + look.x) * CELL
				const py = y + (ey - Math.floor(wide / 2) + look.y - glare) * CELL
				rect(ctx, px, py, wide * CELL, wide * CELL, INK)
				if (view === 'front') rect(ctx, px, py, CELL, CELL, '#ffffff')
			}
		} else if (view === 'side') {
			const [ex, ey] = DOLL_SIDE_EYE
			rect(
				ctx,
				x + (ex - 3) * CELL,
				y + (ey - 1) * CELL,
				CELL * 3,
				CELL * 3,
				INK,
			)
			rect(ctx, x + (ex - 3) * CELL, y + (ey - 1) * CELL, CELL, CELL, '#ffffff')
		}

		// Singing: notes floating up from her, while her back's turned.
		if (racing || world.phase() === 'countdown')
			if (green) paintNotes(ctx, x + DOLL_WIDTH - 14, y + 4, t)
		// A big "!" over her head as she glares.
		if (racing && light.kind === 'red' && light.since < 40 && !firing)
			paintBang(ctx, x + DOLL_WIDTH / 2, y - 14, light.since)
		// Her sweat flying as she turns.
		if (racing && light.kind === 'turn' && light.since / light.ticks > 0.3)
			paintSweat(ctx, x + DOLL_WIDTH / 2, y + 30, t)
	})

	/** The ball in the air, and the stars over whoever's down: in front of everyone. */
	const front = layer('lights-ball', 'furby', (ctx, image, now) => {
		const t = world.raceTicks()
		const mouthX = dollLeft + (DOLL_MOUTH[0] - 32) * CELL + DOLL_WIDTH / 2
		const mouthY = dollTop + DOLL_MOUTH[1] * CELL
		for (const [i, at] of show.spots) {
			const racer = show.racers[i]
			if (!racer) continue
			const b = racer.body
			const age = t - at
			if (age < 0 || age > BALL_TICKS + 24) continue
			const tx = b.x - ARENA_LEFT
			const ty = b.feetY - 34 * (b.scale ?? 1)
			if (age < BALL_TICKS) {
				const u = age / BALL_TICKS
				const at = (u: number) => ({
					x: mouthX + (tx - mouthX) * u,
					y: mouthY + (ty - mouthY) * u - Math.sin(Math.PI * u) * 34,
				})
				// Streaks behind it, where it's just been.
				for (const back of [0.08, 0.16, 0.24]) {
					if (u - back < 0) continue
					const p = at(u - back)
					rect(ctx, p.x - 2, p.y - 1, 6, 2, 'rgba(255, 255, 255, 0.55)')
				}
				const p = at(u)
				paintPicture(
					ctx,
					image,
					DOLL_BALL,
					Math.round((p.x - BALL_SIZE / 2) / CELL) * CELL,
					Math.round((p.y - BALL_SIZE / 2) / CELL) * CELL,
					BALL_SIZE,
					BALL_SIZE,
				)
			} else {
				// Landed: a burst where it hit, and the ball bouncing off.
				const s = age - BALL_TICKS
				if (s < 8) paintBurst(ctx, tx, ty, s)
				const bx = tx + s * 2.2
				const by = ty + 24 - Math.abs(Math.sin(s * 0.32)) * (30 - s)
				paintPicture(
					ctx,
					image,
					DOLL_BALL,
					Math.round((bx - BALL_SIZE / 2) / CELL) * CELL,
					Math.round((by - BALL_SIZE / 2) / CELL) * CELL,
					BALL_SIZE,
					BALL_SIZE,
				)
			}
		}
		// Dizzy stars, going round over whoever's been knocked flat: right
		// over them, a little above them as they lie.
		for (const racer of show.racers) {
			const b = racer.body
			if (b.trippedAt === undefined || t - b.trippedAt < 6) continue
			const scale = b.scale ?? 1
			const cx = b.x - ARENA_LEFT
			const cy = b.feetY - 30 * scale - 8
			for (let k = 0; k < 3; k++) {
				const a = t / 7 + (k * Math.PI * 2) / 3
				paintStar(
					ctx,
					cx + Math.cos(a) * (16 * scale + 4),
					cy + Math.sin(a) * 3,
				)
			}
		}
	})

	return [...furniture, doll, front]
}

/** Which of her poses she's in, by where she is in her cycle. */
function pose(
	light: Light,
	firing: boolean,
): 'back' | 'side' | 'front' | 'fire' {
	if (firing) return 'fire'
	const u = light.since / Math.max(1, light.ticks)
	switch (light.kind) {
		case 'green':
			return 'back'
		case 'fake':
			return 'side'
		case 'turn':
			return u < 0.35 ? 'back' : u < 0.7 ? 'side' : 'front'
		case 'red':
			return 'front'
		case 'away':
			return u < 0.3 ? 'front' : u < 0.65 ? 'side' : 'back'
	}
}

/**
 * Where her pupils look, in cells off middle: at the nearest of whoever's
 * moving, if anyone is; or sweeping the field, looking for someone.
 */
function lookAt(show: LightsShow, fromX: number, fromY: number, t: number) {
	let nearest: { dx: number; dy: number } | undefined
	let best = Number.POSITIVE_INFINITY
	for (const racer of show.racers) {
		const b = racer.body
		if (racer.out || b.trippedAt !== undefined || show.crossedAt.has(racer.id))
			continue
		if (b.grounded && Math.abs(b.vx) < 1.4) continue
		const dx = b.x - ARENA_LEFT - fromX
		if (Math.abs(dx) < best) {
			best = Math.abs(dx)
			nearest = { dx, dy: b.feetY - 30 * (b.scale ?? 1) - fromY }
		}
	}
	if (nearest)
		return {
			x: Math.max(-2, Math.min(2, Math.round(nearest.dx / 150))),
			y: Math.max(-1, Math.min(1, Math.round(nearest.dy / 150))),
		}
	// Nobody moving: eyes sweeping from side to side.
	return { x: Math.round(2 * Math.sin(t / 16)), y: 0 }
}

/** The traffic light on its pole, stood on the path's back edge at `x`: its green lamp lit when she's singing, red when she's not. */
function paintTrafficLight(
	ctx: CanvasRenderingContext2D,
	x: number,
	foot: number,
	green: boolean,
) {
	const boxW = 24
	const boxH = 56
	const pole = 40
	const left = Math.round(x / CELL) * CELL
	rect(ctx, left + boxW / 2 - 2, foot - pole, 4, pole, '#5a5062')
	const top = foot - pole - boxH
	rect(ctx, left, top, boxW, boxH, LIGHT_BOX)
	rect(ctx, left, top, 2, boxH, LIGHT_BOX_LIT)
	rect(ctx, left, top, boxW, 2, LIGHT_BOX_LIT)
	const lamp = (cy: number, on: boolean, lit: string, dim: string) => {
		rect(ctx, left + 4, cy + 2, 16, 12, on ? lit : dim)
		rect(ctx, left + 6, cy, 12, 16, on ? lit : dim)
		if (on) rect(ctx, left + 8, cy + 4, 4, 2, '#ffffff')
	}
	lamp(top + 6, !green, RED_ON, RED_OFF)
	lamp(top + 32, green, GREEN_ON, GREEN_OFF)
}

/** A music note, 4 cells by 7, in `fill`, its top left at `x`, `y`. */
function paintNote(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	fill: string,
) {
	rect(ctx, x + 6, y, 2, 10, fill)
	rect(ctx, x + 8, y, 4, 2, fill)
	rect(ctx, x + 8, y + 4, 2, 2, fill)
	rect(ctx, x, y + 10, 8, 4, fill)
	rect(ctx, x + 2, y + 14, 4, 2, fill)
}

/** Notes drifting up and sideways from `x`, `y`, one after another, each a different colour. */
function paintNotes(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	t: number,
) {
	for (let k = 0; k < 3; k++) {
		const age = (t + k * (NOTE_RISES / 3)) % NOTE_RISES
		const u = age / NOTE_RISES
		const nx = x + Math.sin(u * 7 + k * 2) * 8 + u * 22
		const ny = y - u * 60
		if (u > 0.9) continue
		paintNote(
			ctx,
			nx,
			ny,
			NOTES[(Math.floor((t + k * 27) / NOTE_RISES) + k) % NOTES.length],
		)
	}
}

/** A big "!" popping over her head: red, bouncing as it comes. */
function paintBang(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	since: number,
) {
	const hop = since < 8 ? (8 - since) * 2 : 0
	const top = y - hop
	rect(ctx, x - 4, top - 24, 8, 16, '#e8423f')
	rect(ctx, x - 4, top - 24, 2, 16, '#ff7a6a')
	rect(ctx, x - 4, top - 4, 8, 6, '#e8423f')
}

/** Drops of sweat flying off her head as she turns. */
function paintSweat(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	t: number,
) {
	for (const side of [-1, 1]) {
		const u = ((t + (side > 0 ? 5 : 0)) % 12) / 12
		rect(
			ctx,
			x + side * (44 + u * 12),
			y - 10 + u * 16,
			4,
			6,
			'rgba(160, 220, 255, 0.85)',
		)
	}
}

/** A little star, 5 cells across, its middle at `x`, `y`. */
function paintStar(ctx: CanvasRenderingContext2D, x: number, y: number) {
	rect(ctx, x - 1, y - 4, 2, 8, DIZZY)
	rect(ctx, x - 4, y - 1, 8, 2, DIZZY)
}

/** A burst where a ball hit: spikes going out and fading, for `age` ticks. */
function paintBurst(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	age: number,
) {
	const r = 8 + age * 3
	for (let k = 0; k < 8; k++) {
		const a = (k / 8) * Math.PI * 2
		rect(
			ctx,
			x + Math.cos(a) * r,
			y + Math.sin(a) * r,
			4,
			4,
			k % 2 ? '#ffffff' : '#ffd23a',
		)
	}
}
