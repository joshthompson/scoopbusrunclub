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
}

const DIGITS = {
	black0: { src: black0Asset, width: 22, height: 23 },
	black1: { src: black1Asset, width: 20, height: 21 },
	purple2: { src: purple2Asset, width: 18, height: 21 },
	purple5: { src: purple5Asset, width: 22, height: 23 },
	red0: { src: red0Asset, width: 22, height: 23 },
	red5: { src: red5Asset, width: 22, height: 23 },
	green0: { src: green0Asset, width: 22, height: 23 },
	green2: { src: green2Asset, width: 18, height: 21 },
	green5: { src: green5Asset, width: 22, height: 23 },
	blue0: { src: blue0Asset, width: 22, height: 23 },
	blue5: { src: blue5Asset, width: 22, height: 23 },
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
