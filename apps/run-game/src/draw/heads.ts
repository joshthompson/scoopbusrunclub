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
): HeadTop | undefined {
	measured()
	const key = `${frame}|${width}|${height}`
	if (!found.has(key)) {
		found.set(key, undefined)
		measure(frame, width, height)
			.catch(() => null)
			.then((head) => {
				found.set(key, head)
				setMeasured((n) => n + 1)
			})
	}
	return found.get(key) ?? undefined
}

async function measure(frame: string, width: number, height: number) {
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
