import {
	FALLING_LEAF_SIZE,
	FALLING_LEAVES,
} from '../courses/kit/autumnForestScenery'
import { VIEW_HEIGHT, VIEW_WIDTH } from '../game/constants'
import type { World } from '../game/world'
import type { ImageOf } from './paint/bands'
import { paintPicture } from './paint/picture'

/**
 * Leaves coming down, over the whole screen, in an autumn forest: a few at
 * a time, red, orange, gold and brown, swaying and turning over as they
 * fall, blown back a little, and going by as the course does, as nearly as
 * the path. Where each is goes by the tick and the camera, so every screen
 * sees the same ones, and they stop when the game does.
 */

/** A cell, in the screen's pixels. */
const CELL = 2
/** How far they go off either side and the top before coming round again. */
const MARGIN = 40
const SPAN_X = VIEW_WIDTH + MARGIN * 2
const SPAN_Y = VIEW_HEIGHT + MARGIN * 2
/** How much they go by with the course: nearly as much as the path, being near. */
const ALONG = 0.85

/** A number from a seed, the same every time, 0 to 1. */
const hash = (n: number) => {
	let h = Math.imul(n * 2654435761 + 97, 1597334677)
	h ^= h >>> 15
	return ((h >>> 0) % 10000) / 10000
}

const wrap = (n: number, span: number) => ((n % span) + span) % span

/** Leaves, painted over the whole screen: in the screen's own pixels, from its top left. */
export function paintLeaves(
	ctx: CanvasRenderingContext2D,
	image: ImageOf,
	world: World,
) {
	const leaves = world.course.look?.leaves
	if (!leaves) return
	const t = Math.max(0, world.ticks())
	const camera = world.camera() * ALONG
	const cameraY = world.cameraY() * ALONG
	for (let i = 0; i < leaves.count; i++) {
		const s = 31 + i * 13
		const fall = t * (0.45 + 0.55 * hash(s)) + hash(s + 1) * SPAN_Y
		const sway =
			Math.sin(t / (40 + 30 * hash(s + 2)) + i) * (10 + 24 * hash(s + 3))
		const x =
			wrap(hash(s + 4) * SPAN_X - fall * 0.35 + sway - camera, SPAN_X) - MARGIN
		const y = wrap(fall - cameraY, SPAN_Y) - MARGIN
		const kind = FALLING_LEAVES[i % FALLING_LEAVES.length]
		// Face-on, tilted, edge-on, tilted, and round again.
		const turn = Math.floor(t / (10 + 8 * hash(s + 5)) + i) % 4
		paintPicture(
			ctx,
			image,
			kind[turn === 3 ? 1 : turn],
			Math.round(x / CELL) * CELL,
			Math.round(y / CELL) * CELL,
			FALLING_LEAF_SIZE,
			FALLING_LEAF_SIZE,
		)
	}
}
