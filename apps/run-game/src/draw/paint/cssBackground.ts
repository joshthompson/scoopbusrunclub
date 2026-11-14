/**
 * The CSS backgrounds the game's art is written with (a Platform's face, in
 * the course's `look`), painted onto a canvas the way the DOM Renderer's
 * CSS draws them: a colour, a `var(--…)` of one, a picture repeated from the
 * box's corner, or a gradient, repeating or not.
 */

/** A colour as a canvas takes it: a `var(--…)` looked up in `styles.css`. */
export function cssColour(value: string): string {
	const named = /^var\((--[\w-]+)\)$/.exec(value.trim())
	if (!named) return value
	return (
		getComputedStyle(document.documentElement)
			.getPropertyValue(named[1])
			.trim() || value
	)
}

/** The picture `value` repeats, if it's a `url(…)`, for a Draw Hook to load. */
export function backgroundImage(value: string): string | undefined {
	return /^url\(\s*["']?(.*?)["']?\s*\)$/s.exec(value.trim())?.[1]
}

/** `value` split at its commas, but not at those in brackets. */
function topLevel(value: string, by: RegExp): string[] {
	const parts: string[] = []
	let depth = 0
	let part = ''
	for (const c of value) {
		if (c === '(') depth++
		if (c === ')') depth--
		if (depth === 0 && by.test(c)) {
			if (part.trim()) parts.push(part.trim())
			part = ''
		} else part += c
	}
	if (part.trim()) parts.push(part.trim())
	return parts
}

/** How CSS's `to …` directions point, as angles. */
const SIDES: Record<string, number> = {
	'to top': 0,
	'to right': 90,
	'to bottom': 180,
	'to left': 270,
}

/** A length along a gradient's line: px, or a percentage of the line. */
function along(length: string, line: number): number {
	if (length.endsWith('%')) return (Number.parseFloat(length) / 100) * line
	return Number.parseFloat(length)
}

/**
 * Fills (`x`, `y`) to (`x + width`, `y + height`) with the CSS background
 * `value`, in the box's own pixels. A `url(…)` is drawn from `picture`,
 * loaded already (see `backgroundImage`), or not at all.
 */
export function fillBackground(
	ctx: CanvasRenderingContext2D,
	value: string,
	box: { x: number; y: number; width: number; height: number },
	picture?: { image: CanvasImageSource; width: number; height: number },
) {
	const { x, y, width, height } = box
	if (backgroundImage(value) !== undefined) {
		if (!picture) return
		ctx.save()
		ctx.beginPath()
		ctx.rect(x, y, width, height)
		ctx.clip()
		for (let tx = x; tx < x + width; tx += picture.width)
			for (let ty = y; ty < y + height; ty += picture.height)
				ctx.drawImage(picture.image, tx, ty, picture.width, picture.height)
		ctx.restore()
		return
	}
	const gradient = /^(repeating-)?linear-gradient\((.*)\)$/s.exec(value.trim())
	if (!gradient) {
		ctx.fillStyle = cssColour(value)
		ctx.fillRect(x, y, width, height)
		return
	}
	const args = topLevel(gradient[2], /,/)
	let angle = 180
	if (args[0] in SIDES) angle = SIDES[args.shift() as string]
	else if (/deg$/.test(args[0]))
		angle = Number.parseFloat(args.shift() as string)
	// Its line, through the middle of the box, long enough that its ends
	// just reach the box's corners.
	const turn = (angle * Math.PI) / 180
	const dx = Math.sin(turn)
	const dy = -Math.cos(turn)
	const line = Math.abs(width * dx) + Math.abs(height * dy)
	const midX = x + width / 2
	const midY = y + height / 2
	// Its stops, in px along the line: a colour at up to two places, those
	// left out spread evenly between the ones either side, and none before
	// the one before it.
	const stops: { colour: string; at?: number }[] = []
	for (const arg of args) {
		const [colour, ...places] = topLevel(arg, /\s/)
		if (places.length === 0) stops.push({ colour })
		for (const place of places) stops.push({ colour, at: along(place, line) })
	}
	stops[0].at ??= 0
	stops[stops.length - 1].at ??= line
	for (let i = 1; i < stops.length; i++) {
		if (stops[i].at === undefined) {
			let next = i + 1
			while (stops[next].at === undefined) next++
			const from = stops[i - 1].at as number
			const to = stops[next].at as number
			for (let j = i; j < next; j++)
				stops[j].at = from + ((to - from) * (j - i + 1)) / (next - i + 1)
		}
		stops[i].at = Math.max(stops[i].at as number, stops[i - 1].at as number)
	}
	let placed = stops as { colour: string; at: number }[]
	if (gradient[1]) {
		// Repeating: the stops again and again, every `period`, all along it.
		const first = placed[0].at
		const period = placed[placed.length - 1].at - first
		if (period > 0) {
			const repeated: typeof placed = []
			const from = Math.floor(-first / period) - 1
			for (let k = from; first + k * period < line; k++)
				for (const stop of placed)
					repeated.push({ colour: stop.colour, at: stop.at + k * period })
			placed = repeated
		}
	}
	const fill = ctx.createLinearGradient(
		midX - (dx * line) / 2,
		midY - (dy * line) / 2,
		midX + (dx * line) / 2,
		midY + (dy * line) / 2,
	)
	// Those off either end of the line give their colour to its end: right
	// for stripes, whose colours don't change across each.
	const inside = placed.filter((stop) => stop.at >= 0 && stop.at <= line)
	const before = placed.filter((stop) => stop.at < 0).pop()
	const after = placed.find((stop) => stop.at > line)
	if (before && inside[0]?.at !== 0)
		fill.addColorStop(0, cssColour((inside[0] ?? after ?? before).colour))
	for (const stop of inside)
		fill.addColorStop(line ? stop.at / line : 0, cssColour(stop.colour))
	if (after && inside[inside.length - 1]?.at !== line)
		fill.addColorStop(
			1,
			cssColour((inside[inside.length - 1] ?? before ?? after).colour),
		)
	ctx.fillStyle = fill
	ctx.fillRect(x, y, width, height)
}
