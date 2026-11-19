/**
 * Makes everyone's dive and swim poses, for diving in and swimming under
 * the sea off Dino Island (see `src/game/swim.ts`), from their stand poses
 * with their arms taken off by hand (see `swimBodies.ts`): their own body,
 * redrawn with arms that fit it, in their own skin and sleeves.
 *
 * Diving: stood tall, arms up from their shoulders either side of their
 * head, hands together over it, facing left; the game turns it over, head
 * first. Swimming: lying along, head first, face down, facing left, a
 * front crawl in two frames: the near arm reaching on ahead past the head
 * while the far one's back at the hip, then the other way round, the legs
 * kicking. Anyone with no arms (an egg, the Miner Twins' shared shirt)
 * dives as they stand, and swims kicking.
 *
 * Usage: pnpm --filter @scoopbus/run-game make-swims [who…]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { PNG } from 'pngjs'
import { SWIM_AHEAD } from '../src/runners/swimAhead'
import { BODIES, type Body } from './swimBodies'

const assets = path.resolve(import.meta.dirname, '../src/assets')
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'))

type Rgba = [number, number, number, number]
type Point = [number, number]

/** A picture, a colour a pixel, empty where it's undefined. */
class Canvas {
	readonly pixels: (Rgba | undefined)[]
	constructor(
		readonly width: number,
		readonly height: number,
	) {
		this.pixels = new Array(width * height)
	}
	get(x: number, y: number) {
		if (x < 0 || y < 0 || x >= this.width || y >= this.height) return undefined
		return this.pixels[y * this.width + x]
	}
	set(x: number, y: number, c: Rgba | undefined) {
		if (x < 0 || y < 0 || x >= this.width || y >= this.height) return
		this.pixels[y * this.width + x] = c
	}
	png() {
		const png = new PNG({ width: this.width, height: this.height })
		this.pixels.forEach((c, i) => {
			if (c) for (let k = 0; k < 4; k++) png.data[i * 4 + k] = c[k]
		})
		return PNG.sync.write(png)
	}
}

const LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

/**
 * A stand pose, and its colours lettered as they first come, row by row
 * (as the grids in `swimBodies.ts` are written).
 */
function readStand(file: string) {
	const png = PNG.sync.read(readFileSync(path.join(assets, file)))
	const canvas = new Canvas(png.width, png.height)
	const palette = new Map<string, Rgba>()
	const seen = new Map<string, string>()
	for (let y = 0; y < png.height; y++)
		for (let x = 0; x < png.width; x++) {
			const i = (y * png.width + x) * 4
			if (png.data[i + 3] < 128) continue
			const c: Rgba = [png.data[i], png.data[i + 1], png.data[i + 2], 255]
			const key = c.join(',')
			if (!seen.has(key)) {
				const letter = LETTERS[seen.size]
				seen.set(key, letter)
				palette.set(letter, c)
			}
			canvas.set(x, y, c)
		}
	return { canvas, palette }
}

/** Their body, arms off: their stand pose, its rows redrawn as `body` says. */
function bodyOf(body: Body) {
	const { canvas: stand, palette } = readStand(body.stand)
	const colour = (letter: string) => {
		const c = palette.get(letter)
		if (!c) throw new Error(`${body.who}: no colour ${letter}`)
		return c
	}
	let canvas = stand
	if (body.grid) {
		canvas = new Canvas(body.grid[0].length, body.grid.length)
		body.grid.forEach((row, y) =>
			[...row].forEach((l, x) => {
				if (l !== '.') canvas.set(x, y, colour(l))
			}),
		)
	}
	for (const { rows, cols } of body.clear ?? [])
		for (let y = rows[0]; y <= rows[1]; y++)
			for (let x = cols[0]; x <= cols[1]; x++) canvas.set(x, y, undefined)
	for (const [y, from, to, letter] of body.fill ?? [])
		for (let x = from; x <= to; x++) canvas.set(x, y, colour(letter))
	return { canvas, colour }
}

/** Every pixel on the way from `a` to `b`, both ends too. */
function line([x0, y0]: Point, [x1, y1]: Point): Point[] {
	const points: Point[] = []
	const dx = Math.abs(x1 - x0)
	const dy = -Math.abs(y1 - y0)
	const sx = x0 < x1 ? 1 : -1
	const sy = y0 < y1 ? 1 : -1
	let err = dx + dy
	let x = x0
	let y = y0
	for (;;) {
		points.push([x, y])
		if (x === x1 && y === y1) break
		const e2 = 2 * err
		if (e2 >= dy) {
			err += dy
			x += sx
		}
		if (e2 <= dx) {
			err += dx
			y += sy
		}
	}
	return points
}

/** Joins lines end to end, each one's first point dropped where it starts on the last one's end. */
const joined = (...lines: Point[][]) =>
	lines.flatMap((points, i) => (i ? points.slice(1) : points))

/** How to colour someone's arm. */
interface ArmLook {
	skin: Rgba
	sleeve?: Rgba
	sleeveLength: number
	/** The colour of the pixel just above the hand: a wristband. */
	wrist?: Rgba
	hand: number
	/** How thick, and the colour of each line of it after the first, `offset` from it. */
	width: number
	shade?: Rgba
}

/**
 * An arm along `points`, from its shoulder: its sleeve as far as it goes,
 * then skin, a band at the wrist, and its hand. As thick as it is, each
 * line after the first `offset` on, in shade. The near arm's over
 * whatever's there; the far one only where nothing is, behind them.
 */
function arm(
	canvas: Canvas,
	points: Point[],
	look: ArmLook,
	near: boolean,
	offset: Point,
) {
	const hand = points.length - look.hand
	const colourAt = (i: number) => {
		if (i >= hand) return look.skin
		if (look.wrist && i === hand - 1) return look.wrist
		if (look.sleeve && i < look.sleeveLength) return look.sleeve
		return look.skin
	}
	for (let k = look.width - 1; k >= 0; k--)
		points.forEach(([x, y], i) => {
			const px = x + offset[0] * k
			const py = y + offset[1] * k
			if (!near && canvas.get(px, py)) return
			const c = colourAt(i)
			canvas.set(px, py, k && look.shade && i < hand ? look.shade : c)
		})
}

function armLook(body: Body, colour: (l: string) => Rgba): ArmLook {
	const arms = body.arms || undefined
	return {
		skin: colour(arms?.skin ?? 'a'),
		sleeve: arms?.sleeve ? colour(arms.sleeve) : undefined,
		sleeveLength: arms?.sleeveLength ?? 0,
		wrist: arms?.wrist ? colour(arms.wrist) : undefined,
		hand: arms?.hand ?? 1,
		width: arms?.width ?? 1,
		shade: arms?.shade ? colour(arms.shade) : undefined,
	}
}

/** The ends of their shoulders, near and far: either end of their top row of shirt, unless they're said. */
function shoulders(body: Body, canvas: Canvas) {
	const y = body.shoulder
	const row = [...Array(canvas.width).keys()].filter((x) => canvas.get(x, y))
	const arms = body.arms || undefined
	return {
		near: [arms?.from?.[0] ?? Math.min(...row), y] as Point,
		far: [arms?.from?.[1] ?? Math.max(...row), y] as Point,
	}
}

function dive(body: Body) {
	const { canvas, colour } = bodyOf(body)
	if (!body.arms) return canvas
	const arms = body.arms
	const look = armLook(body, colour)
	const { top } = body.head
	const near = body.head.left - 1
	const far = body.head.right + 1
	const from = shoulders(body, canvas)
	// Out from each shoulder, along it, to beside the head; up to its top;
	// then in over it to meet, hands together.
	let y = top - 2
	let nx = near
	let fx = far
	const nearIn: Point[] = []
	const farIn: Point[] = []
	while (fx - nx > 2) {
		nx++
		fx--
		nearIn.push([nx, y])
		farIn.push([fx, y])
		y--
	}
	const upFrom = ([x, y]: Point, side: number): Point[] =>
		joined(
			line([x, y - 1], [side, y - 1]),
			line([side, y - 1], [side, top - 1]),
		)
	const nearArm = joined(upFrom(from.near, near), nearIn)
	const farArm = joined(upFrom(from.far, far), farIn)
	const hands: Point[] = []
	for (const hy of [y, y - 1])
		for (let x = nx; x <= fx; x++) hands.push([x, hy])
	const reach = Math.max(0, -(y - 1))
	const out = new Canvas(canvas.width, canvas.height + reach)
	for (let py = 0; py < canvas.height; py++)
		for (let px = 0; px < canvas.width; px++)
			out.set(px, py + reach, canvas.get(px, py))
	const down = (points: Point[]) =>
		points.map(([x, py]): Point => [x, py + reach])
	// Thick arms thicken outwards, away from the head.
	const handless = { ...look, hand: 0 }
	if (arms.far !== false) arm(out, down(farArm), handless, false, [1, 0])
	arm(out, down(nearArm), handless, true, [-1, 0])
	for (const [x, hy] of down(hands)) out.set(x, hy, look.skin)
	return out
}

/**
 * A swim frame: their body turned to lie along, head first (to the left),
 * face down, its legs kicked; an arm reaching ahead past the head, the
 * other back at the hip.
 */
function swim(body: Body, frame: 0 | 1) {
	const { canvas: stood, colour } = bodyOf(body)
	// Its legs, each kicked over as far as it does this frame.
	const kicked = new Canvas(stood.width, stood.height)
	const moving = (x: number, y: number) =>
		body.legs.find(
			(leg) =>
				y >= leg.top &&
				y <= (leg.bottom ?? stood.height) &&
				x >= leg.cols[0] &&
				x <= leg.cols[1],
		)
	for (let y = 0; y < stood.height; y++)
		for (let x = 0; x < stood.width; x++)
			if (!moving(x, y)) kicked.set(x, y, stood.get(x, y))
	// A far leg, kicked: behind whatever it goes over.
	for (let y = 0; y < stood.height; y++)
		for (let x = 0; x < stood.width; x++) {
			const leg = moving(x, y)
			const c = stood.get(x, y)
			const to = x - (leg?.by[frame] ?? 0)
			if (leg && c && !kicked.get(to, y)) kicked.set(to, y, c)
		}
	// Turned a quarter round anticlockwise: its top to the left, its front
	// down; room ahead of its head for an arm reaching on past it.
	const w = stood.width
	const out = new Canvas(stood.height + SWIM_AHEAD, stood.width)
	const turn = ([x, y]: Point): Point => [y + SWIM_AHEAD, w - 1 - x]
	for (let y = 0; y < stood.height; y++)
		for (let x = 0; x < w; x++) {
			const [tx, ty] = turn([x, y])
			out.set(tx, ty, kicked.get(x, y))
		}
	if (!body.arms) return out
	const arms = body.arms
	const look = armLook(body, colour)
	const from = shoulders(body, stood)
	const nearShoulder = turn(from.near)
	const farShoulder = turn(from.far)
	const ahead = (start: Point, dy: number): Point[] =>
		line(start, [
			Math.max(0, start[0] - body.reach - SWIM_AHEAD),
			start[1] + dy,
		])
	const back = (start: Point, dy: number): Point[] =>
		line(start, [start[0] + body.reach - 1, start[1] + dy])
	// Thick arms thicken down, the near one's underside in shade; the far
	// one's up.
	const nearFirst = frame === 0
	if (arms.far !== false)
		arm(
			out,
			nearFirst ? back(farShoulder, -1) : ahead(farShoulder, -1),
			look,
			false,
			[0, -1],
		)
	arm(
		out,
		nearFirst ? ahead(nearShoulder, 2) : back(nearShoulder, 2),
		look,
		true,
		[0, 1],
	)
	return out
}

for (const body of BODIES) {
	if (only.length && !only.includes(body.who)) continue
	writeFileSync(path.join(assets, body.dive), dive(body).png())
	body.swim.forEach((file, i) =>
		writeFileSync(path.join(assets, file), swim(body, i as 0 | 1).png()),
	)
	console.log(`${body.who}: ${body.dive}, ${body.swim.join(', ')}`)
}
