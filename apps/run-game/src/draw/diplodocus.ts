import { createController } from 'scoopjs'
import { NECK } from '../courses/kit/dinoIslandScenery'
import { platformAt } from '../game/platforms'
import type { World } from '../game/world'
import { cellBatch } from './paint/cellBatch'

/**
 * A diplodocus the path runs up and over (see `CourseLook['diplodocus']`):
 * its body, behind the path along its back, and its neck, from its chest
 * up to its head, a Platform, wherever that is, lifting up and forward as
 * someone's stood on it.
 *
 * The neck's drawn in sections, as a mine's track is laid along its curve:
 * a chain of rounded sections along a curve from the chest to the head,
 * each a little thinner than the last, each lit along its top and shaded
 * underneath, and creased where it overlaps the one before, like the folds
 * of a long neck. In the body's own big cells, on its grid, drawn again
 * whenever the head's moved.
 */

/** How thick its neck is at its chest, and at its head. */
const NECK_BASE = 84
const NECK_TOP = 44
/**
 * Where its neck comes up out of it: the middle of its chest, out in front
 * of its shoulders and down from its back, so the neck's rooted in the
 * chest, all of it, not stuck on top of the back behind it.
 */
const CHEST = { x: 44, y: 36 }
/** How far into its head's picture, from its left and down from its top, the neck joins it. */
const HEAD_JOIN = { x: 44, y: 22 }
/** How far on down under its line the ground under it's drawn. */
const FLOOR_DOWN = 500
/** How far apart its sections are, along it. */
const SECTION = 22
/** Its crease, where one section overlaps the last: how much of its back edge. */
const CREASE = 0.72
/**
 * How far up it, from its chest, it's plain skin, no rim or crease, so it
 * runs on out of its chest with no join; and its rim and creases from.
 */
const PLAIN = 0.3
const CREASED = 0.45

export function createDiplodocus(world: World) {
	const look = world.course.look?.diplodocus
	if (!look) return []
	const { body, shoulder } = look
	const head = () =>
		platformAt(
			world.terrain,
			world.platforms[look.head],
			Math.max(0, world.ticks()),
		)
	/** The neck's box: from its chest to as high and as far on as its head goes. */
	const top = shoulder.y - 420
	const left = shoulder.x - NECK_BASE
	const width = 480
	const height = shoulder.y + NECK_BASE - top
	const cell = NECK.cell
	/** Where its cells fall, so they line up with the body's. */
	const phase = {
		x: (((body.x - left) % cell) + cell) % cell,
		y: (((body.y - top) % cell) + cell) % cell,
	}
	/** Snapped onto the cell grid. */
	const snapX = (x: number) => Math.floor((x - phase.x) / cell) * cell + phase.x
	const snapY = (y: number) => Math.floor((y - phase.y) / cell) * cell + phase.y
	/** The neck's cells for the head where it is, kept: it goes back and forth along the same way. */
	const drawn = new Map<string, Map<string, string>>()

	function neck(headX: number, headY: number) {
		const key = `${Math.round(headX / cell)},${Math.round(headY / cell)}`
		const kept = drawn.get(key)
		if (kept) return kept
		const cells = new Map<string, string>()
		// A curve up out of its chest, rising, and bending forward into
		// its head.
		const x0 = shoulder.x + CHEST.x - left
		const y0 = shoulder.y + CHEST.y - top
		const x2 = headX + HEAD_JOIN.x - left
		const y2 = headY + HEAD_JOIN.y - top
		const x1 = x0 - 10
		const y1 = y2 + (y0 - y2) * 0.3
		const at = (t: number) => {
			const u = 1 - t
			return {
				x: u * u * x0 + 2 * u * t * x1 + t * t * x2,
				y: u * u * y0 + 2 * u * t * y1 + t * t * y2,
				dx: 2 * u * (x1 - x0) + 2 * t * (x2 - x1),
				dy: 2 * u * (y1 - y0) + 2 * t * (y2 - y1),
			}
		}
		const length = Math.hypot(x2 - x0, y2 - y0) + 1
		const sections = Math.max(2, Math.ceil(length / SECTION))
		// From its chest up to its head, each over the last.
		for (let k = 0; k <= sections; k++) {
			const t = k / sections
			const p = at(t)
			const along = Math.hypot(p.dx, p.dy) || 1
			const tx = p.dx / along
			const ty = p.dy / along
			const r = (NECK_BASE + (NECK_TOP - NECK_BASE) * t ** 0.8) / 2
			for (let cy = snapY(p.y - r); cy <= p.y + r; cy += cell)
				for (let cx = snapX(p.x - r); cx <= p.x + r; cx += cell) {
					const ox = cx + cell / 2 - p.x
					const oy = cy + cell / 2 - p.y
					const d = Math.hypot(ox, oy)
					if (d > r) continue
					// Across it, from its front (-1) to its back (1); and back
					// along it, to the section before.
					const across = (ox * ty - oy * tx) / r
					const back = -(ox * tx + oy * ty) / r
					let colour = NECK.skin
					// Its back's the side towards the light, up and behind;
					// plain skin down out of its chest.
					if (t > PLAIN) {
						if (across > 0.62) colour = NECK.lit
						else if (across < -0.55) colour = NECK.shade
					}
					// Creased where it laps over the one before.
					if (t > CREASED && back > CREASE && d > r * 0.7) colour = NECK.shade
					cells.set(`${cx},${cy}`, colour)
				}
		}
		drawn.set(key, cells)
		return cells
	}

	const { floor } = look
	const floorTop = Math.min(...floor.layers.map(([offset]) => offset)) - 40
	return [
		// The ground under it, as the path is either side: behind its legs.
		createController({
			init: () => ({
				id: 'diplodocus-floor',
				type: 'scenery',
				x: () => floor.from,
				y: () => floor.y + floorTop,
				width: () => floor.to - floor.from,
				height: () => FLOOR_DOWN - floorTop,
			}),
			draw({ ctx }) {
				// Each layer's columns filled as one: no hairlines between them.
				const cells = cellBatch(ctx)
				for (const [offset, fill, edge] of floor.layers) {
					cells.fillStyle = fill
					for (let x = 0; x < floor.to - floor.from; x += 2) {
						const top = offset - floorTop + (edge?.(floor.from + x) ?? 0)
						cells.fillRect(x, Math.round(top / 2) * 2, 2, FLOOR_DOWN - top)
					}
					cells.flush()
				}
			},
		}),
		createController({
			frames: [body.asset],
			init: () => ({
				id: 'diplodocus-body',
				type: 'scenery',
				x: () => body.x,
				y: () => body.y,
				width: () => body.width,
				height: () => body.height,
				style: () => ({ 'image-rendering': 'pixelated' }),
			}),
		}),
		createController({
			init: () => ({
				id: 'diplodocus-neck',
				type: 'scenery',
				x: () => left,
				y: () => top,
				width: () => width,
				height: () => height,
			}),
			draw({ ctx }) {
				const at = head()
				// Each colour's cells filled as one: no hairlines between them.
				const cells = cellBatch(ctx)
				for (const [where, colour] of neck(at.left, at.top)) {
					const [x, y] = where.split(',').map(Number)
					cells.fillStyle = colour
					cells.fillRect(x, y, cell, cell)
				}
				cells.flush()
			},
		}),
	]
}
