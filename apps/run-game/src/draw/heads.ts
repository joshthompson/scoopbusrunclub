import { createSignal } from 'solid-js'

/**
 * Where the top of someone's head is in a frame of theirs, as it's drawn:
 * found from the picture itself, so it's right for everyone there is,
 * members, guests and custom runners, and every pose they've got, run,
 * sat, stood or on skis. For a hat to sit on.
 */
export interface HeadTop {
	/** The middle of the top of their head, across the frame, in px. */
	x: number
	/** Its top, down the frame, in px. */
	y: number
	/** How wide their head is, near its top. */
	width: number
}

/** How opaque a pixel has to be to count as them. */
const SOLID = 100
/**
 * How far down from its very top their head's measured across, for its
 * middle: only the crown of it, a row of their pixels. Any further down,
 * long hair down the back of it pulls the middle back off their skull.
 */
const ACROSS = 2
/**
 * How many of their own pixels across a head is at least, lying along:
 * an arm, however thick, is less (see `scripts/make-swims.ts`).
 */
const HEAD_ACROSS = 4

/**
 * Pictures whose top isn't their head: someone in a costume over it, their
 * head showing out of a hole in it. Their head's found from the topmost of
 * the colours it's drawn in, by the picture's URL: Banana Girl's, out of
 * her banana, from her fringe, not the stalk on top of it.
 */
const costumed = new Map<string, Set<number>>()

/** `pictures` (a strip's or a picture of its own) with their head drawn in `colours`, in a costume. */
export function headShowsIn(pictures: string[], colours: string[]) {
	const keys = new Set(colours.map((c) => Number.parseInt(c.slice(1), 16)))
	for (const picture of pictures) costumed.set(picture.split('#')[0], keys)
}

/** Each frame at each size it's drawn: undefined while it's being found, null if it can't be. */
const found = new Map<string, HeadTop | null | undefined>()
/** Bumped as each is found, for anything drawn from them to catch up. */
const [measured, setMeasured] = createSignal(0)

/**
 * The top of the head in `frame`, drawn `width` by `height` as the engine
 * draws it: a strip's frame (`url#left,top,width,height`) at its height
 * and repeated along, from `left`; a picture of its own, stretched to fit.
 * Undefined till it's been found, which it is once, the first time it's
 * asked for, in the background.
 */
export function headTop(
	frame: string,
	width: number,
	height: number,
	lying = false,
): HeadTop | undefined {
	measured()
	const key = `${frame}|${width}|${height}|${lying}`
	if (!found.has(key)) {
		found.set(key, undefined)
		measure(frame, width, height, lying)
			.catch(() => null)
			.then((head) => {
				found.set(key, head)
				setMeasured((n) => n + 1)
			})
	}
	return found.get(key) ?? undefined
}

/**
 * The front of the head in `frame`, lying along, head first, facing left,
 * as a swimmer is: `x` its frontmost column, `y` the middle of the head
 * there, `width` how tall the head is there. For a hat to sit on, turned
 * a quarter round with them.
 */
export const headFront = (frame: string, width: number, height: number) =>
	headTop(frame, width, height, true)

/** Each frame at each size, both heads in it: see `headTops`. */
const foundBoth = new Map<string, HeadTop[] | null | undefined>()

/**
 * Both heads in `frame`, for someone with two (the Miner Twins): the
 * crowns of the two of them, upright, left first; lying along, the fronts
 * of their two heads, the top one first. Just the one, if only one's
 * found. Undefined till they've been found, as `headTop`.
 */
export function headTops(
	frame: string,
	width: number,
	height: number,
	lying = false,
): HeadTop[] | undefined {
	measured()
	const key = `${frame}|${width}|${height}|${lying}`
	if (!foundBoth.has(key)) {
		foundBoth.set(key, undefined)
		pixels(frame, width, height)
			.then((got) => (got ? bothHeads(got, lying) : null))
			.catch(() => null)
			.then((heads) => {
				foundBoth.set(key, heads)
				setMeasured((n) => n + 1)
			})
	}
	return foundBoth.get(key) ?? undefined
}

/** How far down from the topmost crown (or in from the frontmost face) another head's can be, in their own pixels, and still be a head. */
const OTHER_HEAD = 5

/**
 * The heads in a picture, found from its edge: the top of each column
 * (upright), or the front of each row (lying along). Runs of those near
 * enough the very top (or front) are each a head; the two nearest it are
 * theirs.
 */
function bothHeads(
	{ solid, w, h, scale }: { solid: Solid; w: number; h: number; scale: number },
	lying: boolean,
): HeadTop[] {
	const across = lying ? h : w
	const along = lying ? w : h
	const at = (i: number, j: number) => (lying ? solid(j, i) : solid(i, j))
	/** Each column's top (or each row's front): undefined, none there. */
	const edge: (number | undefined)[] = []
	for (let i = 0; i < across; i++) {
		let found: number | undefined
		for (let j = 0; j < along && found === undefined; j++)
			if (at(i, j)) found = j
		edge.push(found)
	}
	const nearest = Math.min(...edge.filter((e) => e !== undefined))
	if (!Number.isFinite(nearest)) return []
	const near = nearest + OTHER_HEAD * scale
	const runs: { from: number; to: number; edge: number }[] = []
	for (let i = 0; i < across; i++) {
		const e = edge[i]
		if (e === undefined || e > near) continue
		const last = runs[runs.length - 1]
		if (last && i - last.to <= Math.ceil(scale)) {
			last.to = i
			last.edge = Math.min(last.edge, e)
		} else runs.push({ from: i, to: i, edge: e })
	}
	return runs
		.sort((a, b) => a.edge - b.edge)
		.slice(0, 2)
		.sort((a, b) => a.from - b.from)
		.map((run) => {
			const middle = (run.from + run.to + 1) / 2
			const size = run.to + 1 - run.from
			return lying
				? { x: run.edge, y: middle, width: size }
				: { x: middle, y: run.edge, width: size }
		})
}

type Solid = (x: number, y: number) => boolean

/** A frame drawn as the engine draws it, and whether each of its pixels is solid. */
async function pixels(frame: string, width: number, height: number) {
	const [url, crop] = frame.split('#')
	const image = new Image()
	image.src = url
	await image.decode()
	const w = Math.round(width)
	const h = Math.round(height)
	if (!w || !h) return null
	const canvas = document.createElement('canvas')
	canvas.width = w
	canvas.height = h
	const ctx = canvas.getContext('2d', { willReadFrequently: true })
	if (!ctx) return null
	ctx.imageSmoothingEnabled = false
	if (crop) {
		const [left, top] = crop.split(',').map(Number)
		const scale = h / image.naturalHeight
		const tile = image.naturalWidth * scale
		let x = left
		while (x > 0) x -= tile
		for (; x < w; x += tile) ctx.drawImage(image, x, top, tile, h)
	} else ctx.drawImage(image, 0, 0, w, h)
	const { data } = ctx.getImageData(0, 0, w, h)
	const solid: Solid = (x, y) => data[(y * w + x) * 4 + 3] > SOLID
	return { solid, w, h, scale: h / image.naturalHeight }
}

async function measure(
	frame: string,
	width: number,
	height: number,
	lying: boolean,
) {
	const [url, crop] = frame.split('#')
	const image = new Image()
	image.src = url
	await image.decode()
	const w = Math.round(width)
	const h = Math.round(height)
	if (!w || !h) return null
	const canvas = document.createElement('canvas')
	canvas.width = w
	canvas.height = h
	const ctx = canvas.getContext('2d', { willReadFrequently: true })
	if (!ctx) return null
	ctx.imageSmoothingEnabled = false
	if (crop) {
		// `background-size: auto 100%`, repeated, from `left`, `top`.
		const [left, top] = crop.split(',').map(Number)
		const scale = h / image.naturalHeight
		const tile = image.naturalWidth * scale
		let x = left
		while (x > 0) x -= tile
		for (; x < w; x += tile) ctx.drawImage(image, x, top, tile, h)
	} else ctx.drawImage(image, 0, 0, w, h)
	const { data } = ctx.getImageData(0, 0, w, h)
	// In a costume, only their head counts: the colours it's drawn in.
	const head = costumed.get(url)
	const solid = (x: number, y: number) => {
		const i = (y * w + x) * 4
		if (data[i + 3] <= SOLID) return false
		return !head || head.has((data[i] << 16) | (data[i + 1] << 8) | data[i + 2])
	}
	// Lying along, head first: from its front, the left, across. An arm
	// reaching on ahead of it, or along under the chin, is thinner than a
	// head: only the tallest run of them down a column counts, and only if
	// it's as tall as a head.
	if (lying) {
		const tallest = (x: number) => {
			let best = { top: 0, bottom: -1 }
			let from = -1
			for (let y = 0; y <= h; y++) {
				if (y < h && solid(x, y)) {
					if (from < 0) from = y
					continue
				}
				if (from >= 0 && y - from > best.bottom + 1 - best.top)
					best = { top: from, bottom: y - 1 }
				from = -1
			}
			return best
		}
		const least = HEAD_ACROSS * (h / image.naturalHeight)
		for (let x = 0; x < w; x++) {
			const run = tallest(x)
			if (run.bottom + 1 - run.top < least) continue
			let { top, bottom } = run
			for (let dx = 1; dx < ACROSS && x + dx < w; dx++) {
				const next = tallest(x + dx)
				if (next.bottom < top || next.top > bottom) continue
				top = Math.min(top, next.top)
				bottom = Math.max(bottom, next.bottom)
			}
			return { x, y: (top + bottom + 1) / 2, width: bottom + 1 - top }
		}
	}
	for (let y = 0; y < h; y++) {
		let row = false
		for (let x = 0; x < w && !row; x++) row = solid(x, y)
		if (!row) continue
		// The crown of their head: its middle's their skull's.
		let left = w
		let right = -1
		for (let dy = 0; dy < ACROSS && y + dy < h; dy++)
			for (let x = 0; x < w; x++)
				if (solid(x, y + dy)) {
					left = Math.min(left, x)
					right = Math.max(right, x)
				}
		return { x: (left + right + 1) / 2, y, width: right + 1 - left }
	}
	return null
}
