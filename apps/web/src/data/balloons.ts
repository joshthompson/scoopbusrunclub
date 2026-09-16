import black0Asset from '@/assets/balloons/black-0.png'
import black1Asset from '@/assets/balloons/black-1.png'
import blue0Asset from '@/assets/balloons/blue-0.png'
import blue5Asset from '@/assets/balloons/blue-5.png'
import darkBlue0Asset from '@/assets/balloons/darkBlue-0.png'
import darkBlue7Asset from '@/assets/balloons/darkBlue-7.png'
import darkRed0Asset from '@/assets/balloons/darkRed-0.png'
import darkRed4Asset from '@/assets/balloons/darkRed-4.png'
import grassGreen0Asset from '@/assets/balloons/grassGreen-0.png'
import grassGreen9Asset from '@/assets/balloons/grassGreen-9.png'
import green0Asset from '@/assets/balloons/green-0.png'
import green2Asset from '@/assets/balloons/green-2.png'
import green5Asset from '@/assets/balloons/green-5.png'
import lightBlue0Asset from '@/assets/balloons/lightBlue-0.png'
import lightBlue2Asset from '@/assets/balloons/lightBlue-2.png'
import lime0Asset from '@/assets/balloons/lime-0.png'
import lime6Asset from '@/assets/balloons/lime-6.png'
import magenta0Asset from '@/assets/balloons/magenta-0.png'
import magenta8Asset from '@/assets/balloons/magenta-8.png'
import orange0Asset from '@/assets/balloons/orange-0.png'
import orange3Asset from '@/assets/balloons/orange-3.png'
import purple2Asset from '@/assets/balloons/purple-2.png'
import purple5Asset from '@/assets/balloons/purple-5.png'
import red0Asset from '@/assets/balloons/red-0.png'
import red5Asset from '@/assets/balloons/red-5.png'
import white0Asset from '@/assets/balloons/white-0.png'
import white1Asset from '@/assets/balloons/white-1.png'
import yellow0Asset from '@/assets/balloons/yellow-0.png'
import yellow1Asset from '@/assets/balloons/yellow-1.png'

export interface BalloonDigit {
	src: string
	/** Native art size, drawn at `RUNNER_SIZE` like the runners themselves. */
	width: number
	height: number
	/** The one colour the balloon is filled with, before its highlight. */
	color: string
}

/**
 * The colour a milestone is celebrated in, so anything themed off a balloon
 * matches it — the label on a result, the accent on a wrapped card.
 *
 * Sampled from the art itself, except for the four balloons drawn too pale to
 * be read as text on a near-white card. Those keep their own hue and are taken
 * down until they do, which is the one place the number's colour and its
 * balloons' colour are allowed to differ — the art beside them is what carries
 * the real shade. Their own value is noted alongside so the two stay tied.
 */
const BODY = {
	white: '#6B7280', // art is #e5e4e1
	purple: '#4c3381',
	red: '#f34a4a',
	black: '#000000',
	lightBlue: '#3B8FB5', // art is #aae5fb
	green: '#3C5C4F',
	orange: '#f88427',
	darkRed: '#8f2727',
	blue: '#2664cc',
	lime: '#5CA436', // art is #a4fa75
	darkBlue: '#152c77',
	magenta: '#b859b7',
	grassGreen: '#5f7e40',
	yellow: '#A17A00', // art is #fff66e
}

/**
 * Every colour of a digit is cut from the same stencil, so how big a balloon is
 * follows from the digit alone rather than being written out once per balloon.
 */
const SIZE = {
	0: { width: 22, height: 23 },
	1: { width: 20, height: 21 },
	2: { width: 18, height: 21 },
	3: { width: 18, height: 21 },
	4: { width: 22, height: 23 },
	5: { width: 22, height: 23 },
	6: { width: 22, height: 23 },
	7: { width: 22, height: 23 },
	8: { width: 22, height: 23 },
	9: { width: 22, height: 23 },
} satisfies Record<number, { width: number; height: number }>

type Digit = keyof typeof SIZE

/**
 * One colour's balloons, keyed by the digit each one spells, so that a
 * milestone below reads as the digits of its own number — `BLUE[5], BLUE[0],
 * BLUE[0]` for the 500. Asking for a digit this colour doesn't come in, or one
 * with no size recorded above, is a type error rather than a blank balloon.
 */
function balloons<D extends Digit>(
	color: string,
	art: Record<D, string>,
): Record<D, BalloonDigit> {
	return Object.fromEntries(
		Object.entries<string>(art).map(([digit, src]) => [
			digit,
			{ src, ...SIZE[Number(digit) as Digit], color },
		]),
	) as Record<D, BalloonDigit>
}

const WHITE = balloons(BODY.white, { 0: white0Asset, 1: white1Asset })
const PURPLE = balloons(BODY.purple, { 2: purple2Asset, 5: purple5Asset })
const RED = balloons(BODY.red, { 0: red0Asset, 5: red5Asset })
const BLACK = balloons(BODY.black, { 0: black0Asset, 1: black1Asset })
const LIGHT_BLUE = balloons(BODY.lightBlue, {
	0: lightBlue0Asset,
	2: lightBlue2Asset,
})
const GREEN = balloons(BODY.green, {
	0: green0Asset,
	2: green2Asset,
	5: green5Asset,
})
const ORANGE = balloons(BODY.orange, { 0: orange0Asset, 3: orange3Asset })
const DARK_RED = balloons(BODY.darkRed, { 0: darkRed0Asset, 4: darkRed4Asset })
const BLUE = balloons(BODY.blue, { 0: blue0Asset, 5: blue5Asset })
const LIME = balloons(BODY.lime, { 0: lime0Asset, 6: lime6Asset })
const DARK_BLUE = balloons(BODY.darkBlue, {
	0: darkBlue0Asset,
	7: darkBlue7Asset,
})
const MAGENTA = balloons(BODY.magenta, { 0: magenta0Asset, 8: magenta8Asset })
const GRASS_GREEN = balloons(BODY.grassGreen, {
	0: grassGreen0Asset,
	9: grassGreen9Asset,
})
const YELLOW = balloons(BODY.yellow, { 0: yellow0Asset, 1: yellow1Asset })

/**
 * The parkrun milestones we fly balloons for, each spelled out left to right in
 * the order the digits are read. Add a milestone here and both the header and
 * the results card pick it up — the art it needs is
 * `assets/balloons/{colour}-{digit}.png`, and a colour arriving for the first
 * time also wants its `BODY` entry and its `balloons()` line above.
 *
 * Between them these cover every milestone the calendar generates up to the
 * 1000th bar the 750th, which falls out of the 250-step rather than the 100-one
 * and has no shirt of its own. It and everything past the 1000th are still
 * marked, just without balloons — see `milestoneColor`.
 */
export const MILESTONE_BALLOONS: Record<number, BalloonDigit[]> = {
	10: [WHITE[1], WHITE[0]],
	25: [PURPLE[2], PURPLE[5]],
	50: [RED[5], RED[0]],
	100: [BLACK[1], BLACK[0], BLACK[0]],
	200: [LIGHT_BLUE[2], LIGHT_BLUE[0], LIGHT_BLUE[0]],
	250: [GREEN[2], GREEN[5], GREEN[0]],
	300: [ORANGE[3], ORANGE[0], ORANGE[0]],
	400: [DARK_RED[4], DARK_RED[0], DARK_RED[0]],
	500: [BLUE[5], BLUE[0], BLUE[0]],
	600: [LIME[6], LIME[0], LIME[0]],
	700: [DARK_BLUE[7], DARK_BLUE[0], DARK_BLUE[0]],
	800: [MAGENTA[8], MAGENTA[0], MAGENTA[0]],
	900: [GRASS_GREEN[9], GRASS_GREEN[0], GRASS_GREEN[0]],
	1000: [YELLOW[1], YELLOW[0], YELLOW[0], YELLOW[0]],
}

/**
 * The backdrop a milestone's own card wears in the stories view: its balloons'
 * own colour, taken deep enough that the art stays the brightest thing on the
 * slide and white text over it holds up.
 *
 * Which way to take it depends on the balloon. The bright ones — red, orange,
 * lime, magenta, yellow — sit happily on a deep version of themselves, but the
 * purple, green and blue balloons are dark to begin with, so their grounds go
 * darker still rather than meeting them halfway: matched in hue, separated in
 * weight. The two with no colour of their own share the graphite — black on
 * black is nothing, and the white 10s show up best on the same slate the 100s
 * stand on.
 *
 * A milestone left out here falls back to the wrapped deck's own palette.
 */
export const MILESTONE_GRADIENTS: Record<number, string> = {
	10: 'linear-gradient(160deg, #7C8595, #2A2F38)',
	25: 'linear-gradient(160deg, #3A2463, #180E2E)',
	50: 'linear-gradient(160deg, #C4423C, #6B1A22)',
	100: 'linear-gradient(160deg, #8A93A3, #23272E)',
	200: 'linear-gradient(160deg, #2E7FA6, #0E3450)',
	250: 'linear-gradient(160deg, #1B3A30, #0B1D17)',
	300: 'linear-gradient(160deg, #C4611A, #6B2E0A)',
	400: 'linear-gradient(160deg, #7E2323, #3A0E0E)',
	500: 'linear-gradient(160deg, #17356F, #0A1A3C)',
	600: 'linear-gradient(160deg, #46862C, #16300D)',
	700: 'linear-gradient(160deg, #1B2F6B, #080F2E)',
	800: 'linear-gradient(160deg, #8E3A8D, #3C123B)',
	900: 'linear-gradient(160deg, #4E6B33, #1E2D13)',
	1000: 'linear-gradient(160deg, #A98C14, #46370A)',
}

/** Whether a run total is one we have balloons for. */
export function isBalloonMilestone(
	totalRuns: number | undefined,
): totalRuns is number {
	return totalRuns !== undefined && totalRuns in MILESTONE_BALLOONS
}

/**
 * The colour to celebrate a run total in: its own balloons' if it's one we fly
 * balloons for, and otherwise the colour of the last major milestone it went
 * past — so a 750th run keeps the dark blue of the 700 behind it, and
 * everything past the 1000th stays yellow.
 *
 * Undefined below the first milestone, for the caller to fall back from.
 */
export function milestoneColor(totalRuns: number): string | undefined {
	const passed = Object.keys(MILESTONE_BALLOONS)
		.map(Number)
		.filter((milestone) => milestone <= totalRuns)

	return passed.length > 0
		? MILESTONE_BALLOONS[Math.max(...passed)][0].color
		: undefined
}
