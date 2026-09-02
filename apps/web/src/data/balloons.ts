import black0Asset from '@/assets/balloons/black-0.png'
import black1Asset from '@/assets/balloons/black-1.png'
import blue0Asset from '@/assets/balloons/blue-0.png'
import blue5Asset from '@/assets/balloons/blue-5.png'
import green0Asset from '@/assets/balloons/green-0.png'
import green2Asset from '@/assets/balloons/green-2.png'
import green5Asset from '@/assets/balloons/green-5.png'
import purple2Asset from '@/assets/balloons/purple-2.png'
import purple5Asset from '@/assets/balloons/purple-5.png'
import red0Asset from '@/assets/balloons/red-0.png'
import red5Asset from '@/assets/balloons/red-5.png'

export interface BalloonDigit {
	src: string
	/** Native art size, drawn at `RUNNER_SIZE` like the runners themselves. */
	width: number
	height: number
	/** The one colour the balloon is filled with, before its highlight. */
	color: string
}

/** Sampled from the art itself, so anything themed off a balloon matches it. */
const BODY = {
	black: '#000000',
	purple: '#4c3381',
	red: '#f34a4a',
	green: '#3C5C4F',
	blue: '#2664cc',
}

const DIGITS = {
	black0: { src: black0Asset, width: 22, height: 23, color: BODY.black },
	black1: { src: black1Asset, width: 20, height: 21, color: BODY.black },
	purple2: { src: purple2Asset, width: 18, height: 21, color: BODY.purple },
	purple5: { src: purple5Asset, width: 22, height: 23, color: BODY.purple },
	red0: { src: red0Asset, width: 22, height: 23, color: BODY.red },
	red5: { src: red5Asset, width: 22, height: 23, color: BODY.red },
	green0: { src: green0Asset, width: 22, height: 23, color: BODY.green },
	green2: { src: green2Asset, width: 18, height: 21, color: BODY.green },
	green5: { src: green5Asset, width: 22, height: 23, color: BODY.green },
	blue0: { src: blue0Asset, width: 22, height: 23, color: BODY.blue },
	blue5: { src: blue5Asset, width: 22, height: 23, color: BODY.blue },
} satisfies Record<string, BalloonDigit>

/**
 * The parkrun milestones we fly balloons for, each spelled out left to right in
 * the order the digits are read. Add a milestone here and both the header and
 * the results card pick it up — the art it needs is
 * `assets/balloons/{colour}-{digit}.png`.
 */
export const MILESTONE_BALLOONS: Record<number, BalloonDigit[]> = {
	10: [DIGITS.black1, DIGITS.black0],
	25: [DIGITS.purple2, DIGITS.purple5],
	50: [DIGITS.red5, DIGITS.red0],
	100: [DIGITS.black1, DIGITS.black0, DIGITS.black0],
	250: [DIGITS.green2, DIGITS.green5, DIGITS.green0],
	500: [DIGITS.blue5, DIGITS.blue0, DIGITS.blue0],
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
 * past — so a 200th run keeps the black of the 100 behind it, and everything
 * between 250 and 500 stays green.
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
