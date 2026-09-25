/** Tiny pixel maps for the things the club's sprite sheets don't have. */

export function pixelArt(
	rows: string[],
	palette: Record<string, string>,
	scale = 1,
): string {
	const h = rows.length
	const w = Math.max(...rows.map((r) => r.length))
	const canvas = document.createElement('canvas')
	canvas.width = w * scale
	canvas.height = h * scale
	const ctx = canvas.getContext('2d')
	if (!ctx) throw new Error('No 2d context')
	rows.forEach((row, y) => {
		for (let x = 0; x < row.length; x++) {
			const color = palette[row[x]]
			if (!color) continue
			ctx.fillStyle = color
			ctx.fillRect(x * scale, y * scale, scale, scale)
		}
	})
	return canvas.toDataURL('image/png')
}

/** A kanelbulle. Fika is not fika without one. */
export const KANELBULLE = [
	'.....bbbbbb.....',
	'...bbbbbbbbbb...',
	'..bbbddddddbbb..',
	'.bbbdbbbbbbdbbb.',
	'.bbdbbddddbbwbb.',
	'bbdbbddbbbddbdbb',
	'bbdbbdbbbbbdbdbb',
	'bbdwbdbwbbbdbdbb',
	'bbdbbdbbbbddbdbb',
	'bbdbbddbbbdbbdbb',
	'bbdbbbddddbbbdbb',
	'.bbdwbbbbbbbdbb.',
	'.bbbddbbbbddbbb.',
	'..bbbbddddbbbb..',
	'...bbbbbbbbbb...',
	'.....bbbbbb.....',
]

export const KANELBULLE_PALETTE = {
	b: '#c9803a',
	d: '#7a3e0f',
	w: '#ffffff',
}

/** Coffee, black, in the club's cup. */
export const COFFEE = [
	'....s....s....',
	'...s....s.....',
	'....s....s....',
	'..............',
	'.wwwwwwwwwww..',
	'.wccccccccccw.',
	'.wccccccccccww',
	'.wccccccccccwww',
	'.wccccccccccw.w',
	'.wccccccccccwww',
	'.wccccccccccww',
	'..wwwwwwwwww..',
	'...wwwwwwww...',
	'..ggggggggggg.',
]

export const COFFEE_PALETTE = {
	s: '#bbbbbb',
	w: '#f4f4f4',
	c: '#3b2314',
	g: '#77a15d',
}
