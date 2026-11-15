import { PATH_BACK, VERGE } from '../../game/constants'
import { cachedArt } from '../canvasArt'
import { type Loaded, filtered } from '../paint/css'
import { FONT_PIXEL, baselineIn, wrapLines } from '../paint/lettering'

/**
 * What a piece of scenery has on it besides its picture, painted by its
 * Draw Hook: a name carved in a tombstone, and the field made up under
 * something on a hill.
 */

/** How far past either end of it a footing's grass runs on down the slope. */
const FOOTING_SHOULDER = 60
/** How far into the verge a footing's grass goes, so no sky shows between them. */
const FOOTING_OVERLAP = 4

/**
 * How far a footing's grass gets out of its scenery's box, for the Draw
 * Hook's `drawReach`: `FOOTING_SHOULDER` past either end, and down to the
 * verge, as far as the hill falls away under it. That's only known once its
 * picture's loaded and its size is: under Haga's Copper Tents, the only
 * footing, it's 40 px, and this leaves a little over.
 */
export const FOOTING_REACH = {
	left: FOOTING_SHOULDER,
	right: FOOTING_SHOULDER,
	bottom: 48,
}

/**
 * A footing's grass, as an SVG path, in columns 2 px wide from
 * `FOOTING_SHOULDER` left of the scenery to as far right of it, from the
 * scenery's foot (`base`, in the world) down: and how far down it goes.
 */
function footingColumns(
	groundY: (x: number) => number,
	x: number,
	width: number,
	base: number,
) {
	const foot = Math.round(base)
	const rects: string[] = []
	let deepest = 0
	for (let at = -FOOTING_SHOULDER; at < width + FOOTING_SHOULDER; at += 2) {
		const top = at < 0 ? -at / 2 : at > width ? (at - width) / 2 : 0
		const verge = groundY(x - width / 2 + at + 1) - PATH_BACK - VERGE
		const bottom = Math.round(verge - foot) + FOOTING_OVERLAP
		if (bottom <= top) continue
		rects.push(`M${at + FOOTING_SHOULDER} ${Math.round(top)}h2V${bottom}h-2Z`)
		deepest = Math.max(deepest, bottom)
	}
	return { path: rects.join(''), deepest }
}

/** A carved name's colour, and the light along each letter's bottom edge. */
const CARVED_INK = '#383838'
const CARVED_LIT = '#a6a6a6'
/** Its lines, this much of its letters' size apart. */
const CARVED_LINE_HEIGHT = 0.95

/** How big a carved name's letters are: smaller, the longer its longest word. */
function carvedSize(name: string) {
	const longest = Math.max(...name.split(' ').map((w) => w.length))
	return longest > 6 ? 9 : longest > 4 ? 11 : 13
}

/**
 * A name carved in a tombstone's panel, `x`, `y`, `width` and `height` in
 * its box, as on the website's tombstone sign: dark, lit along each
 * letter's bottom edge, smaller the longer it is. In capitals, each line in
 * the middle, the lines in the middle of the panel, and a word too long for
 * a line broken wherever it has to be.
 */
function paintCarved(
	ctx: CanvasRenderingContext2D,
	name: string,
	[x, y, width, height]: number[],
) {
	const size = carvedSize(name)
	const lineHeight = size * CARVED_LINE_HEIGHT
	ctx.font = `${size}px ${FONT_PIXEL}`
	const lines = wrapLines(ctx, name.toUpperCase(), width).flatMap((line) =>
		breakAnywhere(ctx, line, width),
	)
	const top = y + (height - lines.length * lineHeight) / 2
	ctx.textAlign = 'center'
	ctx.textBaseline = 'alphabetic'
	const baseline = baselineIn(ctx, lineHeight)
	lines.forEach((line, i) => {
		const at = top + i * lineHeight + baseline
		ctx.fillStyle = CARVED_LIT
		ctx.fillText(line, x + width / 2, at + 1)
		ctx.fillStyle = CARVED_INK
		ctx.fillText(line, x + width / 2, at)
	})
}

/** A line too wide for `width`, broken between its letters, as `overflow-wrap: anywhere` does. */
function breakAnywhere(
	ctx: CanvasRenderingContext2D,
	line: string,
	width: number,
): string[] {
	if (ctx.measureText(line).width <= width) return [line]
	const lines: string[] = []
	let part = ''
	for (const letter of line) {
		if (part && ctx.measureText(part + letter).width > width) {
			lines.push(part.trimEnd())
			part = letter.trimStart()
		} else part += letter
	}
	if (part) lines.push(part)
	return lines
}

/**
 * Paints a footing's grass in a Draw Hook, under scenery `x` along: the
 * field made up under something wide on a hill, from its foot down to the
 * verge wherever the ground falls away under it, and sloping off past its
 * ends (the Copper Tents, levelled on the top of Haga's hill), in the
 * verge's green, so it's all one field. From its box, `width` by `height`,
 * its foot at `base` in the world. Its columns are built once its size is
 * known, and `green` looked up once.
 */
export function footingPainter(
	groundY: (x: number) => number,
	x: number,
	green: () => string,
) {
	let field: { width: number; base: number; path: Path2D } | undefined
	let fill: string | undefined
	return (
		ctx: CanvasRenderingContext2D,
		width: number,
		height: number,
		base: number,
	) => {
		if (field?.width !== width || field.base !== base)
			field = {
				width,
				base,
				path: new Path2D(footingColumns(groundY, x, width, base).path),
			}
		fill ??= green()
		ctx.fillStyle = fill
		ctx.translate(-FOOTING_SHOULDER, height)
		ctx.fill(field.path)
	}
}

/**
 * A tombstone in a Draw Hook, `scale` times its picture's size, with `name`
 * carved in its `panel`: painted once and kept, by `key`, then recoloured
 * through its `filter`, name and all.
 * Painted again once its font's loaded, rather than kept in the one it
 * fell back on.
 */
export function paintTombstone(
	ctx: CanvasRenderingContext2D,
	loaded: Loaded,
	tombstone: {
		key: string
		name: string
		panel: [number, number, number, number]
		scale: number
		filter?: string
	},
) {
	const { name, scale } = tombstone
	const width = loaded.width * scale
	const height = loaded.height * scale
	const lettered = document.fonts.check(`${carvedSize(name)}px ${FONT_PIXEL}`)
	const key = `carved:${tombstone.key}:${name}:${lettered}`
	const stone = cachedArt(key, width, height, (art) => {
		art.imageSmoothingEnabled = false
		art.drawImage(loaded.image, 0, 0, width, height)
		paintCarved(
			art,
			name,
			tombstone.panel.map((n) => n * scale),
		)
	})
	const out = filtered(key, { image: stone, width, height }, tombstone.filter)
	ctx.drawImage(
		out.art,
		-out.pad,
		-out.pad,
		out.width + out.pad * 2,
		out.height + out.pad * 2,
	)
}
