import { createController } from 'scoopjs'
import type { World } from '../game/world'
import { cellBatch } from './paint/cellBatch'

/**
 * Lava down a Gap (see `CourseLook['lava']`): its surface churning, a
 * glow over it, dark crust drifting about on it, bubbles swelling up and
 * popping, and every so often a spurt of it squirting up, blobs of it
 * flying and falling back in. Behind any bridge over it, in front of the
 * Gap's drop. All by the race's tick, so the same on every screen.
 */

const CELL = 2
/** Its colours: the surface, bright, the depths, crust on it, and a bubble's skin. */
const BRIGHT = '#ffd23a'
const LAVA = '#ff7a1a'
const HOT = '#ff9a2a'
const DEEP = '#c8321a'
const DEEPER = '#7a1a0e'
const CRUST = '#5a1a0e'
const CRUST_LIT = '#8a2a12'
const GLOW = 'rgba(255, 140, 40, 0.18)'
/** How far down it's drawn, under its surface, and how high its glow and spurts go over it. */
const DOWN = 420
const UP = 170
/** Its bubbles: how many, and how long each takes to swell and pop. */
const BUBBLES = 9
const BUBBLE_TICKS = 70
/** Its spurts: how many blobs each throws up, how often one goes, and how hard they fall. */
const SPURT_BLOBS = 9
export const SPURT_EVERY = 95
const SPURT_FALL = 0.3
/** Its crust: how many patches, and how slowly they drift. */
const CRUSTS = 6
const CRUST_DRIFT = 0.15

/** A fraction, the same every time, for `i` and `salt`. */
const hash = (i: number, salt: number) => {
	const x = Math.sin(i * 91.7 + salt * 47.3) * 24634.6345
	return x - Math.floor(x)
}
const snap = (n: number) => Math.round(n / CELL) * CELL

export function createLava(world: World) {
	return (world.course.look?.lava ?? []).map((pit, p) => {
		const width = pit.to - pit.from
		return createController({
			init: () => ({
				id: `lava-${p}`,
				type: 'scenery',
				x: () => pit.from,
				y: () => pit.level - UP,
				width: () => width,
				height: () => UP + DOWN,
			}),
			draw: ({ ctx }) => {
				const ticks = Math.max(0, world.ticks())
				const top = UP
				// Each colour's cells filled as one: no hairlines between them.
				const cells = cellBatch(ctx)
				// The glow over it, hot air shimmering.
				cells.fillStyle = GLOW
				cells.fillRect(0, top - 40, width, 40)
				cells.fillRect(0, top - 16, width, 16)
				// The lava itself, its surface heaving, in 2 px steps: bright
				// along the top, darker the deeper.
				for (let x = 0; x < width; x += CELL) {
					const heave = snap(
						Math.sin(x / 23 + ticks / 14) * 2 +
							Math.sin(x / 9 - ticks / 9) * 1.2,
					)
					const y = top + heave
					cells.fillStyle = BRIGHT
					cells.fillRect(x, y, CELL, CELL)
					cells.fillStyle = (x + ticks) % 7 < 3 ? HOT : LAVA
					cells.fillRect(x, y + CELL, CELL, 10)
					cells.fillStyle = DEEP
					cells.fillRect(x, y + CELL + 10, CELL, 40)
					cells.fillStyle = DEEPER
					cells.fillRect(x, y + CELL + 50, CELL, DOWN - 50)
				}
				cells.flush()
				// Crust, drifting about on it, cracked, glowing at its edges.
				for (let i = 0; i < CRUSTS; i++) {
					const long = 14 + Math.floor(hash(i, 1) * 5) * 4
					const at =
						(((hash(i, 2) * width + ticks * CRUST_DRIFT * (i % 2 ? 1 : -1)) %
							width) +
							width) %
						width
					// Kept off its walls.
					const x = snap(Math.min(at, width - long - CELL))
					cells.fillStyle = CRUST
					cells.fillRect(x, top + 2, long, CELL * 2)
					cells.fillStyle = CRUST_LIT
					cells.fillRect(x + CELL, top + 2, long - CELL * 4, CELL)
					cells.fillStyle = BRIGHT
					cells.fillRect(x + snap(long / 2), top + 2, CELL, CELL * 2)
				}
				cells.flush()
				// Bubbles, swelling up out of it, and popping.
				for (let i = 0; i < BUBBLES; i++) {
					const t =
						(ticks + Math.floor(hash(i, 3) * BUBBLE_TICKS)) % BUBBLE_TICKS
					const round = Math.floor(
						(ticks + Math.floor(hash(i, 3) * BUBBLE_TICKS)) / BUBBLE_TICKS,
					)
					const x = snap(hash(i, 4 + round) * (width - 20) + 10)
					const swell = t / BUBBLE_TICKS
					if (swell < 0.85) {
						const r = Math.round(2 + swell * 5)
						for (let dy = -r; dy <= 0; dy += CELL) {
							const half = snap(Math.sqrt(r * r - dy * dy))
							cells.fillStyle = dy === -r ? BRIGHT : HOT
							cells.fillRect(x - half, top + dy, half * 2 + CELL, CELL)
						}
					} else {
						// Popped: a ring of spatter, flying.
						const out = (swell - 0.85) * 60
						cells.fillStyle = BRIGHT
						for (const dx of [-1, 1])
							cells.fillRect(
								x + snap(dx * out),
								top - snap(out * 0.8),
								CELL,
								CELL,
							)
						cells.fillRect(x, top - snap(out * 1.2), CELL, CELL)
					}
				}
				// Spurts, squirting up out of it, blobs flying up and back in.
				const spurt = Math.floor(ticks / SPURT_EVERY)
				const since = ticks % SPURT_EVERY
				for (const s of [spurt, spurt - 1]) {
					const t = since + (spurt - s) * SPURT_EVERY
					const x0 = hash(s, 5) * (width - 60) + 30
					for (let i = 0; i < SPURT_BLOBS; i++) {
						const vy = 5 + hash(s * 13 + i, 6) * 5
						const vx = (hash(s * 13 + i, 7) - 0.5) * 2.4
						const y = -vy * t + 0.5 * SPURT_FALL * t * t
						if (y > 0) continue
						const x = snap(x0 + vx * t)
						const falling = vy - SPURT_FALL * t < 0
						cells.fillStyle = falling ? LAVA : BRIGHT
						cells.fillRect(x, top + snap(y), CELL * 2, CELL * 2)
						if (!falling) {
							cells.fillStyle = HOT
							cells.fillRect(x, top + snap(y) + CELL * 2, CELL * 2, CELL * 2)
						}
					}
					// Where it's coming up from: a heave in the surface.
					if (t < 30) {
						cells.fillStyle = BRIGHT
						cells.fillRect(
							snap(x0) - CELL * 3,
							top - CELL * 2,
							CELL * 8,
							CELL * 2,
						)
					}
				}
				cells.flush()
			},
		})
	})
}
