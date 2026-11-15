import { createController } from 'scoopjs'
import { DEPTH_SLANT, PATH_BACK, PATH_FRONT } from '../game/constants'
import type { World } from '../game/world'

/**
 * A night race's show, along the course (see `CourseLook`'s `pyro`,
 * `searchlights` and `smoke`): fire bursting up at the start on "Go!",
 * searchlights sweeping the sky, and smoke rolling out over the road. All
 * painted in cells, stepped, as everything is; and by the tick, so it's
 * the same on every screen in a Round.
 */

/** A flame's or a puff's cell, in world pixels: big, it being big. */
const CELL = 4

/**
 * The start's pyrotechnics: a pair of cannons for each `pyro` along the
 * course, on its start line, one either side of the road, just off its
 * edges. On "Go!" they fire, in turn: fireballs, shooting up, slowing,
 * and bursting into smoke and sparks at the top.
 */

/** A fireball's cell, in world pixels: a sprite's, it being about a runner's size. */
const BALL_CELL = 2
/** How far along a start line runs, from the path's near edge to its far one (see `createBanner`). */
const LINE_SLANT = DEPTH_SLANT
/** How far off the path's edge each cannon stands, along the start line, beyond it. */
const OFF_EDGE = 8
/** How high a fireball goes, and how long it takes to get there, in ticks; then how long it takes to burst. */
const BALL_HIGH = 250
const BALL_RISE = 34
const BALL_BURST = 28
/** When each cannon fires, in ticks from "Go!": the far one a beat after the near one. */
const VOLLEYS = [0, 24, 48, 72]
const FAR_AFTER = 12
/** A fireball's colours, from its white-hot core out; and the smoke it leaves. */
const FLAME = ['#fff6c8', '#ffd23f', '#ff8c1a', '#e0382f']
const SMOKE_PUFF = '#4a4652'
/** The cannon it comes out of, stood on the ground, its mouth up. */
const CANNON = {
	width: 16,
	height: 14,
	body: '#2a2b33',
	lit: '#4a4c58',
	mouth: '#111116',
}

/** A number from 0 to 1 that's always the same for the same `a` and `b`: a flicker. */
const flicker = (a: number, b: number) => {
	const n = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453
	return n - Math.floor(n)
}

/** A round blob, `r` across from its middle, stepped in `cell`s. */
function disc(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	r: number,
	fill: string,
	cell = BALL_CELL,
) {
	const radius = Math.round(r / cell) * cell
	if (radius <= 0) return
	ctx.fillStyle = fill
	for (let dy = -radius; dy < radius; dy += cell) {
		const mid = dy + cell / 2
		const half =
			Math.round(Math.sqrt(Math.max(0, radius * radius - mid * mid)) / cell) *
			cell
		if (half > 0)
			ctx.fillRect(
				Math.round(cx / cell) * cell - half,
				Math.round(cy / cell) * cell + dy,
				half * 2,
				cell,
			)
	}
}

/** A fireball, its middle at `cx`, `cy`, `r` across: red round its edge, in to white. */
function fireball(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	r: number,
	jitter: number,
) {
	// A glow round it, lighting the air.
	disc(ctx, cx, cy, r * 1.9, '#ff8c1a14', 4)
	disc(ctx, cx, cy, r * 1.4, '#ff8c1a1c', 4)
	FLAME.toReversed().forEach((colour, ring) => {
		const share = 1 - ring * 0.24
		disc(ctx, cx + (ring % 2 ? jitter : 0), cy - ring, r * share, colour)
	})
}

/** How high a fireball fired `age` ticks ago is, over its cannon: fast, slowing to the top. */
const ballHeight = (age: number) => {
	const t = Math.min(age, BALL_RISE)
	const speed = (2 * BALL_HIGH) / BALL_RISE
	return speed * t - ((speed / BALL_RISE) * t * t) / 2
}

/** One cannon's shots, `ticks` after "Go!", over its mouth at `x`, `mouth`. */
function paintShots(
	ctx: CanvasRenderingContext2D,
	x: number,
	mouth: number,
	ticks: number,
	seed: number,
) {
	for (const [n, fired] of VOLLEYS.entries()) {
		const age = ticks - fired
		if (age < 0 || age > BALL_RISE + BALL_BURST) continue
		const jitter = Math.round((flicker(age, seed + n) - 0.5) * 2) * BALL_CELL
		// The flash at its mouth, as it fires.
		if (age < 5) disc(ctx, x, mouth - 6, 14 - age * 2, FLAME[1])
		if (age <= BALL_RISE) {
			const r = 10 + 8 * (age / BALL_RISE) + jitter
			const y = mouth - 10 - ballHeight(age)
			// Its tail, flames trailing down behind it, thinning.
			for (let k = 4; k >= 1; k--) {
				const back = Math.max(0, age - k * 2)
				disc(
					ctx,
					x + (k % 2 ? jitter : -jitter),
					mouth - 10 - ballHeight(back) + k * 3,
					r * (1 - k * 0.2),
					k > 2 ? FLAME[3] : FLAME[2],
				)
			}
			fireball(ctx, x, y, r, jitter)
			continue
		}
		// Burst at the top: swelling out, its fire burning away to smoke,
		// sparks flung out of it.
		const burst = (age - BALL_RISE) / BALL_BURST
		const y = mouth - 10 - BALL_HIGH
		const r = 18 + 22 * burst
		const smoke = Math.round((1 - burst) * 140)
			.toString(16)
			.padStart(2, '0')
		disc(ctx, x, y - burst * 12, r, `${SMOKE_PUFF}${smoke}`)
		const fire = 1 - burst / 0.6
		if (fire > 0) fireball(ctx, x, y, r * fire, jitter)
		ctx.fillStyle = FLAME[1]
		for (let k = 0; k < 10; k++) {
			const angle = (k / 10) * Math.PI * 2 + flicker(k, seed + n)
			const out = r + burst * 30
			if (flicker(k, age) < burst * 0.7) continue
			ctx.fillRect(
				Math.round((x + Math.cos(angle) * out) / 2) * 2,
				Math.round((y + Math.sin(angle) * out + burst * burst * 30) / 2) * 2,
				2,
				2,
			)
		}
	}
}

export function createPyro(world: World) {
	const lines = world.course.look?.pyro ?? []
	return lines.flatMap((line, i) =>
		(['near', 'far'] as const).map((side) => {
			const near = side === 'near'
			const ground = world.terrain.groundY(line)
			// Just off the path's edge, on along the start line.
			const along = (LINE_SLANT * OFF_EDGE) / (PATH_BACK + PATH_FRONT)
			const x = near ? line - LINE_SLANT - along : line + LINE_SLANT + along
			const foot = near
				? ground + PATH_FRONT + OFF_EDGE
				: ground - PATH_BACK - OFF_EDGE
			const mouth = foot - CANNON.height
			const reach = BALL_HIGH + 80
			const wide = 80
			return createController({
				init: () => ({
					id: `pyro-${i}-${side}`,
					// The far one behind everyone on the road, the near one in front.
					type: near ? 'pyro' : 'pyro-back',
					x: () => x - wide,
					y: () => foot - reach,
					width: () => wide * 2,
					height: () => reach,
				}),
				draw: ({ ctx }) => {
					ctx.translate(wide - x, reach - foot)
					// The cannon, always there: a squat drum, its mouth up.
					const left = x - CANNON.width / 2
					ctx.fillStyle = CANNON.body
					ctx.fillRect(left, mouth, CANNON.width, CANNON.height)
					ctx.fillStyle = CANNON.lit
					ctx.fillRect(left, mouth + 4, CANNON.width, 2)
					ctx.fillRect(left - 2, mouth, CANNON.width + 4, 2)
					ctx.fillStyle = CANNON.mouth
					ctx.fillRect(left + 2, mouth, CANNON.width - 4, 2)
					const ticks = world.ticks()
					// Through the countdown, a pilot flame, flickering.
					if (world.phase() === 'countdown') {
						const lick = 2 + Math.round(flicker(ticks, i) * 2) * 2
						ctx.fillStyle = FLAME[2]
						ctx.fillRect(x - 2, mouth - lick, 4, lick)
						ctx.fillStyle = FLAME[1]
						ctx.fillRect(x - 2, mouth - 2, 4, 2)
						return
					}
					paintShots(
						ctx,
						x,
						mouth,
						world.raceTicks() - (near ? 0 : FAR_AFTER),
						i * 2 + (near ? 0 : 1),
					)
				},
			})
		}),
	)
}

/** How long a searchlight's beam is, and how wide at its far end. */
const BEAM_LONG = 720
const BEAM_WIDE = 84
/** A beam's cells: big, it being big, and faint. */
const BEAM_CELL = 4
/** How far it swings either way, from straight up, in radians. */
const SWING = 0.6
/** The searchlight's trailer, the yoke on it, and its lamp: in cells of 2. */
const UNIT = {
	body: '#26272e',
	lit: '#3c3e48',
	tyre: '#111114',
	lamp: '#4a4c58',
}

/**
 * Searchlights, at the far edge of the road, each on a little trailer,
 * its lamp turning to and fro at its own pace and a beam of light out of
 * it up into the sky: a stepped cone, see-through, as air is. Over the
 * scenery, behind everyone on the road.
 */
export function createSearchlights(world: World) {
	const lights = world.course.look?.searchlights
	if (!lights) return []
	return lights.at.map((x, i) => {
		const ground = world.terrain.groundY(x) - PATH_BACK
		const colour = lights.colours[i % lights.colours.length]
		/** Where its lamp's lens is: the beam comes out of it. */
		const lens = ground - 22
		const reach = BEAM_LONG + 40
		return createController({
			init: () => ({
				id: `searchlight-${i}`,
				type: 'searchlight',
				x: () => x - reach,
				y: () => lens - reach,
				width: () => reach * 2,
				height: () => reach + (ground - lens) + 4,
			}),
			draw: ({ ctx }) => {
				ctx.translate(reach - x, reach - lens)
				const time = world.ticks() / 60
				const swing = Math.sin(time * (0.35 + (i % 3) * 0.12) + i * 1.9) * SWING
				const tipX = x + Math.sin(swing) * BEAM_LONG
				const tipY = lens - Math.cos(swing) * BEAM_LONG
				// The beam, a row of cells at a time up from the lens: wide and
				// faint, and its brighter heart.
				for (const [share, alpha] of [
					[1, '14'],
					[0.45, '1e'],
				] as const) {
					ctx.fillStyle = `${colour}${alpha}`
					for (let y = lens - BEAM_CELL; y > tipY; y -= BEAM_CELL) {
						const t = (lens - y) / (lens - tipY)
						const middle = x + (tipX - x) * t
						const half = (2 + ((BEAM_WIDE / 2) * t) / Math.cos(swing)) * share
						const left = Math.round((middle - half) / BEAM_CELL) * BEAM_CELL
						const right = Math.round((middle + half) / BEAM_CELL) * BEAM_CELL
						if (right > left) ctx.fillRect(left, y, right - left, BEAM_CELL)
					}
				}
				// The trailer, on its wheels, at the road's far edge.
				ctx.fillStyle = UNIT.tyre
				ctx.fillRect(x - 12, ground - 4, 6, 4)
				ctx.fillRect(x + 6, ground - 4, 6, 4)
				ctx.fillStyle = UNIT.body
				ctx.fillRect(x - 14, ground - 10, 28, 6)
				ctx.fillStyle = UNIT.lit
				ctx.fillRect(x - 14, ground - 10, 28, 2)
				// Its yoke, and the lamp in it, turned with the beam.
				ctx.fillStyle = UNIT.body
				ctx.fillRect(x - 8, ground - 16, 2, 6)
				ctx.fillRect(x + 6, ground - 16, 2, 6)
				const lean = Math.round(Math.sin(swing) * 3) * 2
				ctx.fillStyle = UNIT.lamp
				ctx.fillRect(x - 6 + lean / 2, lens - 2, 12, 10)
				ctx.fillStyle = UNIT.lit
				ctx.fillRect(x - 6 + lean / 2, lens + 6, 12, 2)
				// Its lens, lit, and a glow round it.
				ctx.fillStyle = `${colour}40`
				ctx.fillRect(x - 8 + lean, lens - 6, 16, 6)
				ctx.fillStyle = colour
				ctx.fillRect(x - 6 + lean, lens - 4, 12, 2)
				ctx.fillStyle = '#ffffff'
				ctx.fillRect(x - 2 + lean, lens - 4, 4, 2)
			},
		})
	})
}

/** How many puffs each smoke machine has out at once, and how long one lasts. */
const PUFFS = 7
const PUFF_TICKS = 300
/** How far a puff drifts, back across the road and up off it, as it goes. */
const PUFF_DRIFT = 260
/** Smoke, lit faintly by the lights it's under. */
const SMOKE = ['#d9dcff', '#b9c4ff', '#e4d2ff']

/**
 * Smoke, rolling out of each smoke machine and drifting back along the
 * road, growing as it goes and thinning away: over everyone in it, low.
 */
export function createSmoke(world: World) {
	const machines = world.course.look?.smoke ?? []
	return machines.map((x, i) => {
		const ground = world.terrain.groundY(x)
		const top = ground - 120
		return createController({
			init: () => ({
				id: `smoke-${i}`,
				type: 'smoke',
				x: () => x - PUFF_DRIFT - 80,
				y: () => top,
				width: () => PUFF_DRIFT + 160,
				height: () => 160,
			}),
			draw: ({ ctx }) => {
				const ticks = world.ticks()
				const origin = PUFF_DRIFT + 80
				for (let k = 0; k < PUFFS; k++) {
					const age = (ticks + (k * PUFF_TICKS) / PUFFS + i * 41) % PUFF_TICKS
					const life = age / PUFF_TICKS
					const radius = Math.round((10 + life * 46) / CELL) * CELL
					const cx = Math.round((origin - life * PUFF_DRIFT) / CELL) * CELL
					const cy =
						Math.round((ground - top - 18 - life * 34 - radius * 0.3) / CELL) *
						CELL
					const alpha = Math.round(
						(life < 0.15 ? life / 0.15 : 1 - (life - 0.15) / 0.85) * 70,
					)
					if (alpha <= 2) continue
					ctx.fillStyle = `${SMOKE[(k + i) % SMOKE.length]}${alpha
						.toString(16)
						.padStart(2, '0')}`
					// A round puff, stepped in cells.
					for (let dy = -radius; dy < radius; dy += CELL) {
						const half =
							Math.round(Math.sqrt(radius * radius - dy * dy) / CELL) * CELL
						if (half > 0) ctx.fillRect(cx - half, cy + dy, half * 2, CELL)
					}
				}
			},
			drawReach: { left: 80, right: 80, top: 40 },
		})
	})
}
