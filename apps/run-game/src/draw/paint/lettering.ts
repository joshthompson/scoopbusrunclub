/**
 * Lettering painted in a Draw Hook, laid out as CSS lays out words: in the
 * game's fonts, on lines as CSS fills them.
 */

/** `--font-pixel` in `styles.css`: Remi Pop, the game's lettering. */
export const FONT_PIXEL = '"Remi Pop", system-ui, sans-serif'

/** What the course's sign is lettered in, as the web app's is. */
export const FONT_SIGN = '"Jersey 10", sans-serif'

/**
 * Where text in `ctx`'s font goes down to its baseline, in a line
 * `lineHeight` high: as CSS puts it, the font's ascent and descent in the
 * middle of the line, whatever's left split above and below them.
 */
export function baselineIn(
	ctx: CanvasRenderingContext2D,
	lineHeight: number,
): number {
	const m = ctx.measureText('')
	const ascent = m.fontBoundingBoxAscent
	const descent = m.fontBoundingBoxDescent
	return (lineHeight - ascent - descent) / 2 + ascent
}

/**
 * Text in `ctx`'s font and fill, from `x` along, in a line `lineHeight`
 * high from `top` down.
 */
export function fillLine(
	ctx: CanvasRenderingContext2D,
	text: string,
	x: number,
	top: number,
	lineHeight: number,
) {
	ctx.textAlign = 'left'
	ctx.textBaseline = 'alphabetic'
	ctx.fillText(text, x, top + baselineIn(ctx, lineHeight))
}

/**
 * `text` broken onto lines no wider than `width` in `ctx`'s font, between
 * its words, as CSS wraps it: as many words on each as fit, and a word too
 * long for any line on one of its own.
 */
export function wrapLines(
	ctx: CanvasRenderingContext2D,
	text: string,
	width: number,
): string[] {
	const lines: string[] = []
	let line = ''
	for (const word of text.split(' ')) {
		const longer = line ? `${line} ${word}` : word
		if (line && ctx.measureText(longer).width > width) {
			lines.push(line)
			line = word
		} else line = longer
	}
	lines.push(line)
	return lines
}
