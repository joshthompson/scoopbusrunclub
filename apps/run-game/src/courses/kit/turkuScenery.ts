import { paintedArt, pixelArt, pixelText, svgUrl } from './pixelArt'

/**
 * Turku's scenery, drawn in code: along the river Aura, its lindens and
 * benches; the Föri, the little ferry across it; and the lawn under
 * Posankka, the city's great pink pig-duck, at the finish.
 */

/** Inside an ellipse round `cx`, `cy`. */
const inEllipse = (
	x: number,
	y: number,
	cx: number,
	cy: number,
	rx: number,
	ry: number,
) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1

/** The grass it sits on, and its plaque. 52 by 6 cells, under it. */
export const posankkaLawn = pixelArt(52, 6, [
	[0, 0, 52, 6, '#6cae4e'],
	[0, 0, 52, 1, '#8ccc6a'],
	[2, 1, 3, 1, '#4f8a3a'],
	[40, 2, 3, 1, '#4f8a3a'],
	[44, 1, 6, 4, '#5a5f66'],
	[45, 2, 4, 1, '#c9ced0'],
])

/**
 * The Föri, orange, the little ferry across the Aura: its deck to stand
 * on, its wheelhouse in the middle, FÖRI on its side. 240 by 64, its deck
 * 34 down.
 */
export const FORI_WIDTH = 240
export const FORI_HEIGHT = 64
export const FORI_DECK = 34
/** Its middle, for its wheelhouse and its name. */
const FORI_MIDDLE = FORI_WIDTH / 2
/** Its rail's posts, every 15 along. */
const FORI_POSTS = Math.floor((FORI_WIDTH - 8) / 15) + 1
export const fori = svgUrl(
	FORI_WIDTH,
	FORI_HEIGHT,
	[
		// Its wheelhouse, and its rails.
		`<rect x="${FORI_MIDDLE - 18}" y="4" width="36" height="30" fill="#f3f1ea"/>`,
		`<rect x="${FORI_MIDDLE - 22}" y="0" width="44" height="6" fill="#f08a24"/>`,
		`<rect x="${FORI_MIDDLE - 14}" y="10" width="28" height="10" fill="#4f7896"/>`,
		`<rect x="${FORI_MIDDLE - 2}" y="10" width="2" height="10" fill="#f3f1ea"/>`,
		`<rect x="0" y="20" width="${FORI_WIDTH}" height="2" fill="#f3f1ea"/>`,
		...Array.from(
			{ length: FORI_POSTS },
			(_, i) =>
				`<rect x="${4 + i * 15}" y="20" width="2" height="14" fill="#f3f1ea"/>`,
		),
		// Its deck, and its hull, orange, in the water.
		`<rect x="0" y="34" width="${FORI_WIDTH}" height="4" fill="#8a6a46"/>`,
		`<rect x="0" y="38" width="${FORI_WIDTH}" height="18" fill="#f08a24"/>`,
		`<rect x="0" y="38" width="${FORI_WIDTH}" height="2" fill="#ffad5a"/>`,
		`<rect x="4" y="56" width="${FORI_WIDTH - 8}" height="8" fill="#c86a14"/>`,
		pixelText('FÖRI', FORI_MIDDLE - 22, 42, 2, '#ffffff'),
		// Its cable, guiding it across.
		'<rect x="0" y="52" width="4" height="4" fill="#3b3a3a"/>',
		`<rect x="${FORI_WIDTH - 4}" y="52" width="4" height="4" fill="#3b3a3a"/>`,
	].join(''),
)

/** The Föri's stop: its yellow sign, FÖRI, on a post. 16 by 34 cells. */
export const foriSign = svgUrl(
	32,
	68,
	[
		'<rect x="14" y="20" width="4" height="48" fill="#5a5f66"/>',
		'<rect x="0" y="0" width="32" height="22" fill="#f2c230"/>',
		'<rect x="0" y="0" width="32" height="2" fill="#ffe27a"/>',
		pixelText('FÖRI', 5, 6, 1, '#1e2328'),
		'<rect x="4" y="16" width="24" height="2" fill="#1e2328"/>',
	].join(''),
)

/**
 * Finland's flag on its pole, flying, white, its blue cross: out along the
 * quay to welcome the ferry in. 20 by 50 cells.
 */
export const finnishFlag = pixelArt(20, 50, [
	// Its pole, its gold top, and its foot.
	[1, 2, 2, 48, '#c9ced0'],
	[1, 2, 1, 48, '#ffffff'],
	[0, 0, 4, 2, '#e2c25a'],
	[0, 48, 4, 2, '#8a8478'],
	// The flag, flying, a fold in it.
	[3, 3, 17, 11, '#ffffff'],
	[3, 7, 17, 3, '#1b4fa0'],
	[8, 3, 3, 11, '#1b4fa0'],
	[14, 3, 1, 11, '#e4e8ec'],
	[14, 7, 1, 3, '#14408a'],
	[19, 3, 1, 1, '#e4e8ec'],
	[19, 13, 1, 1, '#e4e8ec'],
])

/** A linden, along the river: round, its trunk dark. 30 by 48 cells. */
export const linden = paintedArt(30, 48, (x, y) => {
	if (x > 13 && x < 17 && y > 28) return '#4a3524'
	if (inEllipse(x, y, 15, 17, 14, 16)) {
		if (inEllipse(x, y, 11, 11, 7, 6)) return '#78b25c'
		if (y > 26) return '#3f7a3a'
		return '#5a9a4a'
	}
	return undefined
})

/** A park bench, green slats, cast-iron feet. 24 by 12 cells. */
export const bench = pixelArt(24, 12, [
	[0, 0, 24, 2, '#3f6a3a'],
	[0, 3, 24, 2, '#3f6a3a'],
	[0, 7, 24, 2, '#3f6a3a'],
	[2, 0, 2, 12, '#2a2d31'],
	[20, 0, 2, 12, '#2a2d31'],
	[2, 9, 20, 1, '#2a2d31'],
])

/** A bike, parked, as everyone in Turku has. 22 by 13 cells. */
export const parkedBike: string = paintedArt(22, 13, (x, y) => {
	const wheel = (cx: number) => {
		const d = Math.hypot(x - cx, y - 8.5)
		return d > 3.2 && d < 4.4
	}
	if (wheel(4.5) || wheel(17.5)) return '#2a2d31'
	if (y > 7.5 && y < 8.5 && x > 4 && x < 18) return '#c8312b'
	if (Math.abs(y - (8 - (x - 6) * 0.9)) < 0.6 && x > 6 && x < 11)
		return '#c8312b'
	if (y > 2.5 && y < 3.5 && x > 10 && x < 16) return '#c8312b'
	if (x > 15.5 && x < 16.5 && y > 1 && y < 8) return '#c8312b'
	if (y < 2 && x > 14 && x < 19) return '#2a2d31'
	if (y > 2 && y < 3 && x > 8 && x < 12) return '#1e1e1e'
	return undefined
})
