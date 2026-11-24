import { createController, createObjectSignal } from 'scoopjs'
import type { JSX } from 'solid-js'
import {
	RUNNER_SCALE,
	STAND_HEIGHT,
	START_X,
	VIEW_HEIGHT,
	VIEW_WIDTH,
} from '../game/constants'
import { type Racer, type World, bodyHeight } from '../game/world'
import { ARENA_LEFT } from '../minigames/arena'
import {
	FUSE_TALL,
	FUSE_TICKS,
	HOP_TICKS,
	NECK_DOWN,
	bombOf,
} from '../minigames/bombHat'
import {
	BOMB_HEADS,
	type BombHead,
	EXPLOSION_FRAMES,
	EXPLOSION_SIZE,
	FUSE_BENDS,
	SPARK_COLOURS,
	fuseCells,
	paintCord,
} from './art/bombHeads'
import { paintPicture } from './paint/picture'

/** A pixel, as everything's drawn: 2 px. */
const CELL = 2
/** How high a bomb arcs, hopping from one head to the next. */
const HOP_HIGH = 56
/** How long each frame of a blast lasts. */
const BLAST_FRAME_TICKS = 5
/** How many scraps of papier-mâché a bomb bursts into, and how they fly. */
const SCRAPS = 26
const SCRAP_GRAVITY = 0.32
/** How long the scraps lie about after, and then take to fade away. */
const SCRAPS_LIE = 420
const SCRAPS_FADE = 60
/** How long whoever's been blown up smokes for. */
const SMOKES_FOR = 420
/** Every cell of the fuse, in order from the collar: its bends, then on straight up, a long one, to be seen burning down from afar. */
const FUSE_PATH = fuseCells([...FUSE_BENDS, [15, -FUSE_TALL / CELL]])
/** Its cord's charred, just behind the spark, black, then ash. */
const FUSE_CHAR = '#1d1a18'
const FUSE_ASH = '#6e6660'
/** The spark's glow round it, air: see-through, flickering. */
const SPARK_GLOW = 'rgba(255, 215, 106, 0.35)'
/** The fuse's last seconds: shaking, blinking fast. */
const PANIC_TICKS = 180

/** A number from a seed, the same every time, 0 to 1. */
function hash(n: number) {
	let h = Math.imul(n * 374761393 + 668265263, 1274126177)
	h ^= h >>> 13
	h = Math.imul(h, 1103515245)
	return ((h >>> 0) % 10000) / 10000
}

/**
 * Bomb Hat, drawn, in front of everyone: the bomb on whoever has it on, a
 * creature's face, blinking, nervous as the fuse runs down, its fuse
 * burning, sparking; hopping from one head to the next, passed on; going
 * off, a blast, and its papier-mâché in scraps all over the path; and
 * smoke coming off whoever it went off on, sat in the leaves. Nothing, if
 * the world's not a game of it.
 */
export function createBombHat(world: World) {
	const show = bombOf(world)
	if (!show) return []
	const ground = world.terrain.groundY(START_X)

	/** Where the bomb sits on `racer`: the middle of the top of their head, and their shoulders. */
	function neckOf(racer: Racer) {
		const b = racer.body
		const tall =
			racer.runner.sprite.height * RUNNER_SCALE * (bodyHeight(b) / STAND_HEIGHT)
		return { x: b.x - ARENA_LEFT, y: b.feetY - tall + NECK_DOWN }
	}

	function paintBomb(
		ctx: CanvasRenderingContext2D,
		image: Parameters<typeof paintPicture>[1],
		head: BombHead,
		at: { x: number; y: number },
		facing: 1 | -1,
		now: number,
	) {
		const { bomb } = show as NonNullable<typeof show>
		const lit = show?.burning() ?? false
		const left = show?.fuseLeft() ?? 1
		const panicking = lit && left * FUSE_TICKS <= PANIC_TICKS
		// Blinking, occasionally; quicker and quicker as it runs down.
		const every = panicking ? 26 : 120 - bomb.kind * 7
		const phase = (now + bomb.kind * 31) % every
		const eyes =
			phase < 2 || (phase >= 6 && phase < 8)
				? head.half
				: phase < 6
					? head.shut
					: head.open
		// Shaking, at the last.
		const shake = panicking ? (Math.floor(now / 2) % 2 ? CELL : -CELL) : 0
		const x = Math.round((at.x + shake) / CELL) * CELL
		const y = Math.round(at.y / CELL) * CELL
		ctx.save()
		ctx.translate(x, y)
		// Its art faces left: turned round, facing right.
		if (facing === 1) ctx.scale(-1, 1)
		const top = -head.neck.y
		const leftEdge = -head.neck.x
		paintPicture(ctx, image, eyes, leftEdge, top, head.width, head.height)
		paintFuse(
			ctx,
			leftEdge + head.fuse.x,
			top + head.fuse.y,
			lit ? left : 1,
			lit,
			now,
		)
		ctx.restore()
	}

	/** Its fuse, burnt down to `left` of it, out of the collar at `x`, `y`; and lit, sparking at its end. */
	function paintFuse(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		left: number,
		lit: boolean,
		now: number,
	) {
		const cells = Math.max(1, Math.ceil(FUSE_PATH.length * left))
		/** A cell of it, `across` and `down` from the collar. */
		const cell = (across: number, down: number, colour: string) => {
			ctx.fillStyle = colour
			ctx.fillRect(x + across * CELL - CELL, y + down * CELL, CELL, CELL)
		}
		paintCord(ctx, x, y, FUSE_PATH.slice(0, cells))
		if (!lit) return
		// Burning: charred black just behind the spark, ash before that.
		const [across, down] = FUSE_PATH[cells - 1]
		const [backX, backY] = FUSE_PATH[Math.max(0, cells - 2)]
		cell(backX, backY, FUSE_ASH)
		cell(backX + 1, backY + 1, FUSE_ASH)
		cell(across, down, FUSE_CHAR)
		cell(across + 1, down, FUSE_CHAR)
		cell(across, down + 1, FUSE_CHAR)
		cell(across + 1, down + 1, FUSE_CHAR)
		// The spark at its end: a glow round it, swelling and shrinking,
		// and a big flickering star, white-hot in its middle.
		const sx = x + across * CELL
		const sy = y + down * CELL + CELL / 2
		const flick = Math.floor(now / 3) % SPARK_COLOURS.length
		const big = Math.floor(now / 4) % 2 === 0
		const glow = (big ? 6 : 5) * CELL
		ctx.fillStyle = SPARK_GLOW
		for (let row = -glow; row < glow; row += CELL) {
			const half =
				Math.round(Math.sqrt(glow * glow - (row + CELL / 2) ** 2) / CELL) * CELL
			ctx.fillRect(sx - half, sy + row, half * 2, CELL)
		}
		const arm = (big ? 4 : 3) * CELL
		ctx.fillStyle = SPARK_COLOURS[(flick + 2) % SPARK_COLOURS.length]
		ctx.fillRect(sx - arm, sy - CELL / 2, arm * 2, CELL)
		ctx.fillRect(sx - CELL / 2, sy - arm, CELL, arm * 2)
		ctx.fillStyle = SPARK_COLOURS[(flick + 1) % SPARK_COLOURS.length]
		ctx.fillRect(sx - CELL * 2, sy - CELL, CELL * 4, CELL * 2)
		ctx.fillRect(sx - CELL, sy - CELL * 2, CELL * 2, CELL * 4)
		// Its diagonals, by turns.
		const diagonal = big ? 3 * CELL : 2 * CELL
		for (const [dx, dy] of [
			[-1, -1],
			[1, -1],
			[-1, 1],
			[1, 1],
		])
			ctx.fillRect(
				sx + dx * diagonal - CELL / 2,
				sy + dy * diagonal - CELL / 2,
				CELL,
				CELL,
			)
		ctx.fillStyle = SPARK_COLOURS[0]
		ctx.fillRect(sx - CELL, sy - CELL, CELL * 2, CELL * 2)
		// Bits flying off it, up and out, falling away.
		for (let i = 0; i < 6; i++) {
			const life = 18
			const t = (now + i * 3) % life
			const seed = Math.floor((now + i * 3) / life) * 7 + i
			const vx = (hash(seed) - 0.5) * 3
			const vy = -1.5 - hash(seed + 1) * 1.5
			ctx.fillStyle = SPARK_COLOURS[1 + (i % (SPARK_COLOURS.length - 1))]
			ctx.fillRect(
				Math.round((sx + vx * t) / CELL) * CELL,
				Math.round((sy + vy * t + 0.12 * t * t) / CELL) * CELL,
				CELL,
				CELL,
			)
		}
	}

	/** A bomb's papier-mâché, burst all over: each scrap flying, then lying on the path, then fading. */
	function paintScraps(
		ctx: CanvasRenderingContext2D,
		blast: { x: number; y: number; at: number; kind: number },
		index: number,
		since: number,
	) {
		const head = BOMB_HEADS[blast.kind % BOMB_HEADS.length]
		const fade =
			since < SCRAPS_LIE
				? 1
				: Math.max(0, 1 - (since - SCRAPS_LIE) / SCRAPS_FADE)
		if (fade <= 0) return
		ctx.save()
		ctx.globalAlpha = fade
		for (let i = 0; i < SCRAPS; i++) {
			const seed = index * 101 + i * 7
			const angle = -Math.PI * (0.1 + 0.8 * hash(seed))
			const speed = 3 + 5 * hash(seed + 1)
			const vx = Math.cos(angle) * speed
			const vy = Math.sin(angle) * speed
			// Where it comes to rest: on the path, somewhere across it.
			const rest = ground - 12 + Math.round(hash(seed + 2) * 24)
			// When it gets there, falling: solving y = y0 + vy t + g t² / 2 for the path.
			const drop = rest - blast.y
			const lands =
				(-vy + Math.sqrt(vy * vy + 2 * SCRAP_GRAVITY * drop)) / SCRAP_GRAVITY
			const t = Math.min(since, lands)
			const sx = blast.x - ARENA_LEFT + vx * t
			const sy = blast.y + vy * t + (SCRAP_GRAVITY * t * t) / 2
			const flying = since < lands
			// Tumbling, flying: long one way, then the other.
			const wide = flying ? Math.floor(since / 4 + i) % 2 === 0 : i % 3 !== 0
			// Bits of the face and bits of its paper: two cells by one, or three by two.
			const big = i % 4 === 0
			const long = (big ? 3 : 2) * CELL
			const short = (big ? 2 : 1) * CELL
			const px = Math.round(sx / CELL) * CELL
			const py = Math.round(sy / CELL) * CELL
			ctx.fillStyle = head.scraps[i % head.scraps.length]
			ctx.fillRect(px, py, wide ? long : short, wide ? short : long)
			// Lying flat, a shade under it.
			if (!flying) {
				ctx.fillStyle = 'rgba(40, 24, 10, 0.35)'
				ctx.fillRect(
					px,
					py + (wide ? short : long),
					wide ? long : short,
					CELL / 2,
				)
			}
		}
		ctx.restore()
	}

	/** Smoke coming up off whoever's been blown up, from their head, thinning, then none. */
	function paintSmoke(
		ctx: CanvasRenderingContext2D,
		racer: Racer,
		since: number,
	) {
		if (since >= SMOKES_FOR) return
		const at = neckOf(racer)
		const strength = Math.min(1, 2 * (1 - since / SMOKES_FOR))
		// Puffs off the top of their head, rising, swelling and thinning.
		for (let i = 0; i < 5; i++) {
			const t = ((since + i * 16) % 80) / 80
			const sway = Math.sin(t * 5 + i * 2) * 6
			const size = Math.round(2 + t * 3) * CELL
			const px = at.x + sway + (i % 2 ? 3 : -3) - size / 2
			const py = at.y - NECK_DOWN + 8 - t * 54 - size / 2
			const alpha = 0.85 * strength * (1 - t * 0.8)
			// Pale, to show against the leaves; darker, fresh.
			const grey = Math.round(120 + 80 * t)
			ctx.fillStyle = `rgba(${grey}, ${grey - 4}, ${grey - 8}, ${alpha.toFixed(3)})`
			const x = Math.round(px / CELL) * CELL
			const y = Math.round(py / CELL) * CELL
			// Rounded off: a cell in at each corner.
			ctx.fillRect(x + CELL, y, size - CELL * 2, size)
			ctx.fillRect(x, y + CELL, CELL, size - CELL * 2)
			ctx.fillRect(x + size - CELL, y + CELL, CELL, size - CELL * 2)
		}
	}

	return [
		createController({
			init: () => ({
				id: 'bomb-hat',
				type: 'furby',
				...createObjectSignal(ARENA_LEFT, 'x'),
				...createObjectSignal(0, 'y'),
				...createObjectSignal({} as JSX.CSSProperties, 'style'),
				width: () => VIEW_WIDTH,
				height: () => VIEW_HEIGHT,
			}),
			draw({ ctx, image }) {
				// Read the tick, so it's painted again every one.
				const now = world.ticks()
				const race = world.raceTicks()
				const { bomb, blasts, blownAt, racers } = show
				// Scraps lying about, and smoke off whoever it went off on.
				blasts.forEach((blast, i) =>
					paintScraps(ctx, blast, i, Math.max(0, race - blast.at)),
				)
				for (const racer of racers) {
					const at = blownAt.get(racer.id)
					if (at !== undefined) paintSmoke(ctx, racer, race - at)
				}
				// The bomb, on whoever has it on; hopping from the last to them, passed.
				const holder = bomb.holder >= 0 ? racers[bomb.holder] : undefined
				if (holder) {
					const head = BOMB_HEADS[bomb.kind % BOMB_HEADS.length]
					const b = holder.body
					let at = neckOf(holder)
					// Bobbing as they run, the weight of it.
					if (b.grounded && Math.abs(b.vx) > 0.5)
						at = { x: at.x, y: at.y + (Math.floor(now / 6) % 2) * CELL }
					const hop = race - bomb.passedAt
					const from = bomb.from >= 0 ? racers[bomb.from] : undefined
					if (from && hop >= 0 && hop < HOP_TICKS) {
						const u = hop / HOP_TICKS
						const was = neckOf(from)
						at = {
							x: was.x + (at.x - was.x) * u,
							y: was.y + (at.y - was.y) * u - Math.sin(Math.PI * u) * HOP_HIGH,
						}
					}
					paintBomb(ctx, image, head, at, b.facing, now)
				}
				// The blasts, over everything.
				for (const blast of blasts) {
					const since = race - blast.at
					const frame = Math.floor(since / BLAST_FRAME_TICKS)
					if (since < 0 || frame >= EXPLOSION_FRAMES.length) continue
					paintPicture(
						ctx,
						image,
						EXPLOSION_FRAMES[frame],
						Math.round((blast.x - ARENA_LEFT - EXPLOSION_SIZE / 2) / CELL) *
							CELL,
						Math.round((blast.y - EXPLOSION_SIZE / 2) / CELL) * CELL,
						EXPLOSION_SIZE,
						EXPLOSION_SIZE,
					)
				}
			},
		}),
	]
}
