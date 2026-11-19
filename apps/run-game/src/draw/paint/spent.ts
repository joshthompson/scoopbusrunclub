import type { DrawPainting } from 'scoopjs'
import { cachedArt, screenDensity } from '../canvasArt'
import { type PictureShadow, pictureName } from './picture'

/**
 * A Ride that's been ridden and let go of, left on the track: worn out, so
 * nobody thinks of hopping on it again (and nobody can: only a waiting one
 * is mounted, see `corgis`). Every Ride gets it from its own picture sat,
 * bent into a new pose here, rather than a pose of its own to draw: its head
 * and neck let down onto the ground, a pale, washed-out tone over it, and
 * panting, with sweat dropping off it (see `paintPanting`).
 */
export type SpentLook =
	| {
			kind: 'droop'
			/** The column of cells, from the left, where its neck starts: all of it from there on is let down. */
			from: number
			/** How many cells its head and neck are let down by. */
			droop: number
			/** Where its face is once it's down, in cells from its top left: the panting goes from there. */
			face: readonly [number, number]
	  }
	/** Let down flat: a blood cell, deflated, squashed down onto the floor. */
	| { kind: 'deflate'; face: readonly [number, number] }
	/** Turned over, wheels up: a skateboard, kicked over and left. */
	| { kind: 'flip' }

const CELL = 2
/** The pale, tired wash over it: a flat grey-blue, thin enough to leave its colours showing. */
const WASH = 'rgba(170, 180, 200, 0.42)'
/** The cells over which its neck bends down, rather than stepping. */
const BEND = 3

/** The picture as a spent Ride is, painted into a canvas as big as it. */
function paintShape(
	image: CanvasImageSource & { width: number; height: number },
	look: SpentLook,
	width: number,
	height: number,
) {
	const density = screenDensity()
	const canvas = document.createElement('canvas')
	canvas.width = Math.ceil(width * density)
	canvas.height = Math.ceil(height * density)
	const ctx = canvas.getContext('2d')
	if (!ctx) return canvas
	ctx.scale(density, density)
	ctx.imageSmoothingEnabled = false
	const columns = width / CELL
	if (look.kind === 'flip') {
		ctx.translate(0, height)
		ctx.scale(1, -1)
		ctx.drawImage(image, 0, 0, width, height)
		return canvas
	}
	if (look.kind === 'deflate') {
		// Squashed to a little over half as tall, on the floor.
		const flat = Math.round((height * 0.55) / CELL) * CELL
		ctx.drawImage(image, 0, height - flat, width, flat)
	} else {
		// A column of cells at a time, each let down by how far along its
		// neck it is: the picture's lower edge cuts off whatever goes under
		// the ground, so the head ends up resting on it.
		for (let column = 0; column < columns; column++) {
			const along = Math.min(1, Math.max(0, (column - look.from + 1) / BEND))
			const down = Math.round(look.droop * along) * CELL
			ctx.drawImage(
				image,
				(column / columns) * image.width,
				0,
				image.width / columns,
				image.height,
				column * CELL,
				down,
				CELL,
				height,
			)
		}
	}
	// Washed out, over only what's drawn.
	ctx.globalCompositeOperation = 'source-atop'
	ctx.fillStyle = WASH
	ctx.fillRect(0, 0, width, height)
	return canvas
}

/**
 * `src` as a spent Ride, `width` by `height` at `x`, `y`, with its `shadow`
 * (or outline), if it has one. Made once and kept. Nothing till it's loaded.
 */
export function paintSpent(
	ctx: CanvasRenderingContext2D,
	image: DrawPainting['image'],
	src: string,
	x: number,
	y: number,
	width: number,
	height: number,
	look: SpentLook,
	shadow?: PictureShadow,
) {
	const loaded = image(src)
	if (!loaded) return
	let pad = 0
	for (const [dx, dy] of shadow?.offsets ?? [])
		pad = Math.max(pad, Math.abs(dx), Math.abs(dy))
	const shape = JSON.stringify(look)
	const art = cachedArt(
		`spent:${pictureName(src)}:${width}x${height}:${shape}:${shadow?.key ?? ''}`,
		width + pad * 2,
		height + pad * 2,
		(art) => {
			art.imageSmoothingEnabled = false
			const bent = paintShape(
				loaded.image as CanvasImageSource & { width: number; height: number },
				look,
				width,
				height,
			)
			if (shadow?.offsets.length) {
				for (const [dx, dy] of shadow.offsets)
					art.drawImage(bent, pad + dx, pad + dy, width, height)
				art.globalCompositeOperation = 'source-in'
				art.fillStyle = shadow.colour
				art.fillRect(0, 0, width + pad * 2, height + pad * 2)
				art.globalCompositeOperation = 'source-over'
			}
			art.drawImage(bent, pad, pad, width, height)
		},
	)
	ctx.drawImage(art, x - pad, y - pad, width + pad * 2, height + pad * 2)
}

/** How long each sweat drop takes to fall, and each puff of breath to rise and thin out, in ticks. */
const DROP_TICKS = 70
const PUFF_TICKS = 56

/**
 * A spent Ride panting: puffs of breath, white and thinning as they go up
 * and off from its face, and drops of sweat running down it. `face` is
 * where its mouth is, in cells; `ticks` is how far through the race it is.
 */
export function paintPanting(
	ctx: CanvasRenderingContext2D,
	look: SpentLook,
	ticks: number,
) {
	if (look.kind === 'flip') return
	const [fx, fy] = look.face
	const mouthX = fx * CELL
	const mouthY = fy * CELL
	// Breath, in short pants: a puff, a pause, a puff.
	for (let i = 0; i < 3; i++) {
		const age = (ticks + i * 19) % (PUFF_TICKS + 20)
		if (age > PUFF_TICKS) continue
		const through = age / PUFF_TICKS
		const size = (2 + Math.floor(through * 3)) * CELL
		ctx.fillStyle = `rgba(255, 255, 255, ${(0.95 - through * 0.75).toFixed(2)})`
		ctx.fillRect(
			Math.round((mouthX + 2 + through * 14) / CELL) * CELL,
			Math.round((mouthY - 2 - through * 18) / CELL) * CELL,
			size,
			size,
		)
	}
	// Sweat: a drop from its brow, running down, two at once.
	for (let i = 0; i < 2; i++) {
		const age = (ticks + i * 35) % DROP_TICKS
		const through = age / DROP_TICKS
		ctx.fillStyle = `rgba(63, 143, 208, ${through > 0.8 ? ((1 - through) / 0.2).toFixed(2) : '1'})`
		const dropX = Math.round((mouthX - 6 - i * 10) / CELL) * CELL
		const dropY = Math.round((mouthY - 12 + through * 16) / CELL) * CELL
		ctx.fillRect(dropX, dropY, CELL, 2 * CELL)
		ctx.fillStyle = `rgba(232, 247, 255, ${through > 0.8 ? ((1 - through) / 0.2).toFixed(2) : '1'})`
		ctx.fillRect(dropX, dropY, CELL, CELL)
	}
}
