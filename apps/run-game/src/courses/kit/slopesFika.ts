import { paintedArt } from './pixelArt'

/**
 * The Slopes' fika, drawn in code: from the waffle hut halfway down, a
 * heart waffle with cream and cloudberry jam, and a hot chocolate; and, it
 * being winter, a saffron bun and a gingerbread heart.
 */

const inCircle = (x: number, y: number, cx: number, cy: number, r: number) =>
	(x - cx) ** 2 + (y - cy) ** 2 <= r * r

/** A heart's shape, `size` across, its top left at `left`, `top`: two round lobes and a point. */
function inHeart(
	x: number,
	y: number,
	left: number,
	top: number,
	size: number,
) {
	const u = (x - left) / size
	const v = (y - top) / size
	if (inCircle(u, v, 0.28, 0.3, 0.25) || inCircle(u, v, 0.72, 0.3, 0.25))
		return true
	// Down to its point.
	return v >= 0.3 && v <= 0.95 && Math.abs(u - 0.5) <= (0.95 - v) * 0.78
}

/** A heart waffle, golden, its grid pressed into it, cream and cloudberry jam on top: 13 by 9. */
export const waffle = paintedArt(13, 9, (x, y) => {
	// Cloudberry jam, on the cream.
	if (inCircle(x, y, 7.5, 1.6, 1.4) || inCircle(x, y, 4.6, 2.4, 1))
		return y < 1.6 ? '#ffc04d' : '#f29a1f'
	// Whipped cream.
	if (inCircle(x, y, 6, 3, 2.4) || inCircle(x, y, 8.6, 3.4, 1.9))
		return y < 3 ? '#ffffff' : '#ece7dc'
	// The waffle: a heart, lying a little tipped, its grid.
	if (inHeart(x, y + 1.2, 0, 1, 13)) {
		if (y > 7.5) return '#9a5f22'
		const hole = Math.floor(x) % 2 === 1 && Math.floor(y) % 2 === 0
		return hole ? '#c07a2c' : '#e7ab4f'
	}
	return undefined
})

/** A red mug of hot chocolate, cream piled on top, a marshmallow, steam: 10 by 12. */
export const hotChocolate = paintedArt(10, 12, (x, y) => {
	// Steam.
	if ((x > 3 && x < 4 && y < 2) || (x > 4 && x < 5 && y > 1 && y < 3))
		return 'rgba(255,255,255,0.85)'
	if (x > 6 && x < 7 && y < 2.5) return 'rgba(255,255,255,0.85)'
	// A marshmallow, pink, on the cream.
	if (x > 5 && x < 7 && y > 2.5 && y < 4) return '#f7b6cf'
	// Cream, over the rim.
	if (inCircle(x, y, 3.2, 4.4, 1.6) || inCircle(x, y, 5.6, 4.6, 1.8))
		return y < 4.4 ? '#ffffff' : '#ebe5da'
	// The mug, and its handle.
	if (x > 0.5 && x < 7.5 && y > 4.5 && y < 11.5) {
		if (y > 10.5) return '#8f2420'
		if (x < 1.5) return '#e2574c'
		// A white heart on it.
		if (inHeart(x, y, 2.6, 6.6, 3)) return '#f6f7f8'
		return '#c8322b'
	}
	if (x > 7.5 && x < 9.5 && y > 5.5 && y < 9.5) {
		if (x > 8 && x < 9 && y > 6.5 && y < 8.5) return undefined
		return '#a82a24'
	}
	return undefined
})

/** A lussekatt: a saffron bun curled into an S, a raisin in each curl: 12 by 10. */
export const lussekatt = paintedArt(12, 10, (x, y) => {
	const curls: [number, number][] = [
		[3.4, 3.2],
		[8.6, 6.4],
	]
	for (const [cx, cy] of curls) {
		if (inCircle(x, y, cx, cy, 0.9)) return '#3a1d16'
		if (inCircle(x, y, cx, cy, 2.9)) {
			// Its spiral, darker where it's baked.
			const d = Math.hypot(x - cx, y - cy)
			const a = Math.atan2(y - cy, x - cx)
			const ring = (d + a / 2) % 2
			return ring < 0.7 ? '#d88a1c' : '#f6b733'
		}
	}
	// The bun's middle, joining the curls.
	if (x > 3 && x < 9 && y > 3.6 && y < 6.2)
		return y < 4.6 ? '#ffd15a' : '#f6b733'
	return undefined
})

/** A pepparkaka: a gingerbread heart, iced round its edge: 11 by 10. */
export const pepparkaka = paintedArt(11, 10, (x, y) => {
	if (!inHeart(x, y, 0, 0.4, 11)) return undefined
	const inner = inHeart(x, y, 1.4, 1.8, 8.2)
	if (!inner) return '#8c4a1c'
	// Icing, a line inside its edge, and a dot in the middle.
	const icing = !inHeart(x, y, 2.4, 2.8, 6.2)
	if (icing && Math.floor(x + y) % 2 === 0) return '#ffffff'
	if (inCircle(x, y, 5.5, 4.8, 0.8)) return '#ffffff'
	return y < 3 ? '#c87a3a' : '#b5652b'
})

/**
 * A waffle tower, hidden in the waffle hut: three heart waffles stacked,
 * cream between them, cloudberry jam and a cloudberry on top, a little
 * Swedish flag stuck in it: 14 by 18.
 */
export const waffleTower = paintedArt(14, 18, (x, y) => {
	// The flag, on its stick.
	if (x > 9 && x < 10 && y < 6) return '#6b4a2b'
	if (x > 10 && x < 14 && y < 3)
		return y > 1 && y < 2 ? '#fecc00' : x > 11 && x < 12 ? '#fecc00' : '#006aa7'
	// A cloudberry on top, and jam.
	if (inCircle(x, y, 6, 3.6, 1.4)) return y < 3.4 ? '#ffc04d' : '#f29a1f'
	if (y > 4.6 && y < 6 && x > 3 && x < 10) return '#f29a1f'
	// Three waffles, cream between: each lower one a little wider.
	const layers: [top: number, half: number][] = [
		[6, 4.5],
		[10, 5.5],
		[14, 6.5],
	]
	for (const [top, half] of layers) {
		if (y > top - 1 && y < top && Math.abs(x - 7) < half - 0.5) return '#ffffff'
		if (y >= top && y < top + 3 && Math.abs(x - 7) < half) {
			if (y > top + 2) return '#9a5f22'
			return (Math.floor(x) + Math.floor(y)) % 2 ? '#c07a2c' : '#e7ab4f'
		}
	}
	// The plate.
	if (y >= 17 && x > 0 && x < 14) return y < 17.5 ? '#f6f7f8' : '#cfd6df'
	return undefined
})

/**
 * A bowl of tomato soup, up on the waffle hut's roof: red, a swirl of
 * cream in it, a basil leaf, steam rising, and bread on the side: 13 by 11.
 */
export const tomatoSoup = paintedArt(13, 11, (x, y) => {
	// Steam.
	if ((x > 4 && x < 5 && y < 2) || (x > 5 && x < 6 && y > 1 && y < 3))
		return 'rgba(255,255,255,0.85)'
	if (x > 7 && x < 8 && y < 2.5) return 'rgba(255,255,255,0.85)'
	// A basil leaf, and the cream, swirled.
	if (inCircle(x, y, 7.6, 4.2, 0.9)) return '#3f9b4a'
	if (y > 4 && y < 5 && x > 3 && x < 6.5) return '#fff4ec'
	// The soup, red, lit along its top.
	if (y > 3.5 && y < 5.5 && x > 1 && x < 11)
		return y < 4.5 ? '#e5503a' : '#c8322b'
	// Its bowl: white, a blue band round it, its foot.
	if (y >= 5.5 && y < 9 && Math.abs(x - 6) < 5.5 - (y - 5.5) * 0.7) {
		if (y > 6.5 && y < 7.5) return '#2d6fd0'
		return x < 4 ? '#ffffff' : '#e6ebf2'
	}
	if (y >= 9 && y < 10 && x > 4 && x < 8) return '#cfd6df'
	// Bread, on the side.
	if (x > 10 && x < 13 && y > 6 && y < 10) return y < 7 ? '#8a5a2b' : '#e8c58a'
	return undefined
})
