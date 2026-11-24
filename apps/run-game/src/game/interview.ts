import { CLUB } from '../runners/playable'
import { cheats } from './cheats'
import { CAMERA_PAST_FINISH } from './constants'
import { droneOf, replayTimes } from './drone'
import { type Racer, type World, startingBody } from './world'

/**
 * Kristineberg's interview (see `CourseLook['bigScreen']`): once someone's
 * over the line first, a reporter (a club member who's not racing) runs in
 * from the right with a microphone, stops beside them, asks them a
 * question, and they answer it, dancing. The drone's filming, so it's on
 * the big screen. The race's result waits for it (see `interviewing`).
 *
 * All of it's worked out from where everyone is and when the winner got
 * in, a tick at a time, wherever it's drawn, so a Remote Player's screen
 * has it too, and the question and answer are picked from who won.
 */

/**
 * How long after the winner's in the reporter sets off, and how fast they
 * run; and, the long jump's replay on the big screen, how long before it
 * ends they set off, so it's not missed: about how long they take to get there.
 */
const SETS_OFF = 40
const RUNS = 5
const BEFORE_REPLAY_ENDS = 30
/** The most it can hold a Round or a race's result up for, whatever happens: from the winner getting in. */
const HOLDS_MOST = 900
/**
 * The long jump's replay, shown again after the interview, now and then:
 * how often, out of `ENCORE_OUT_OF`, and how long after the answer.
 */
const ENCORE_SOMETIMES = 2
const ENCORE_OUT_OF = 5
const ENCORE_AFTER = 20
/** Where the reporter starts: off the right of the screen; and stands: this far right of the winner. */
const STARTS_PAST = 40
const STANDS_BY = 46
/** Stood there: how long till they ask, how long the question's up, and the answer. */
const SETTLES = 8
const ASKING = 100
const ANSWERING = 120
/** The most ticks it catches up on at once. */
const CATCH_UP = 600

/** What the reporter might ask, and what the winner might say. */
const QUESTIONS = [
	'How does it feel?',
	'What a run! The secret?',
	'Any words for the fans?',
	'Did you see the bus?',
]
const ANSWERS = [
	'My legs are jelly!',
	'Kanelbullar. Lots of them.',
	'I just didn’t look back!',
	'Hi Mum!',
	'Same time next Saturday!',
	'Scoop Bus forever!',
]
/** Asked after a long jump in the sand, and said back. */
const JUMP_QUESTION = 'And that long jump?'
const JUMP_ANSWERS = ['I flew like a goose!', 'Eyes shut, feet first!']

/**
 * An interview, as of tick `at`: its reporter; who won and when they got
 * in; when the reporter got to them; and what's asked and answered.
 */
export interface Interview {
	reporter: Racer
	at: number
	winner?: Racer
	wonAt: number
	arrivedAt?: number
	question: string
	answer: string
}
const interviews = new WeakMap<World, Interview>()

/** A number from `text`, the same on every screen. */
const hash = (text: string) =>
	[...text].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 9973, 7)

/** A club member who's not racing: the same on every screen. */
function pickReporter(world: World) {
	const racing = new Set(world.racers.map((r) => r.runner.id))
	const free = CLUB.filter((m) => !racing.has(m.id))
	const seed = hash(world.racers.map((r) => r.id).join('') + world.course.id)
	return free[seed % free.length] ?? CLUB[0]
}

/** Where the reporter stands, parked, off the right of the screen. */
const parkedAt = (world: World) =>
	world.terrain.finishX + CAMERA_PAST_FINISH + STARTS_PAST

/** Tick `t` of it: who won, the reporter running in to them, and stood by them. */
function step(world: World, iv: Interview, t: number) {
	if (!iv.winner) {
		const winner = world.racers
			.filter((r) => r.out === 'finished')
			.sort((a, b) => a.outAt - b.outAt)[0]
		if (!winner) return
		iv.winner = winner
		iv.wonAt = t
		// What's asked, and said: about the long jump, if they had one, now and then.
		const pick = hash(winner.id + world.course.id)
		const jumped = droneOf(world)?.jump?.racer === winner.id && pick % 3 === 0
		iv.question = jumped ? JUMP_QUESTION : QUESTIONS[pick % QUESTIONS.length]
		iv.answer = jumped
			? JUMP_ANSWERS[pick % JUMP_ANSWERS.length]
			: ANSWERS[pick % ANSWERS.length]
		return
	}
	const b = iv.reporter.body
	const to = iv.winner.body.x + STANDS_BY
	b.facing = -1
	b.feetY = world.terrain.groundY(b.x)
	b.floor = b.feetY
	if (t < setsOff(world, iv)) return
	if (iv.arrivedAt === undefined && b.x - to > RUNS) {
		b.vx = -RUNS
		b.x -= RUNS
		return
	}
	iv.arrivedAt ??= t
	b.vx = 0
	b.x = to
}

/** When the reporter sets off: a moment after the winner's in, and not till the long jump's replay's nearly done, if it's on. */
function setsOff(world: World, iv: Interview) {
	const at = iv.wonAt + SETS_OFF
	const drone = droneOf(world)
	if (!drone?.jump || drone.state === 'down') return at
	return Math.max(at, replayTimes(drone.jump).end - BEFORE_REPLAY_ENDS)
}

/** `world`'s interview, if its course has a big screen, brought up to its tick. */
export function interviewOf(world: World) {
	if (!world.course.look?.bigScreen) return undefined
	const now = world.ticks()
	let iv = interviews.get(world)
	if (!iv || now < iv.at) {
		const body = startingBody(world.terrain, parkedAt(world))
		body.facing = -1
		iv = {
			reporter: {
				id: 'reporter',
				runner: pickReporter(world),
				body,
				controls: () => ({ left: false, right: false, up: false, down: false }),
				outAt: 0,
			},
			// A tick behind, so it's stepped this one: who's won, if anyone has.
			at: now - 1,
			wonAt: 0,
			question: QUESTIONS[0],
			answer: ANSWERS[0],
		}
		interviews.set(world, iv)
	}
	const from = Math.max(iv.at, now - CATCH_UP)
	for (let t = from + 1; t <= now; t++) step(world, iv, t)
	iv.at = now
	return iv
}

/** What's being said just now, and by whom, if anything. */
export function saying(iv: Interview, now: number) {
	if (iv.arrivedAt === undefined || !iv.winner) return undefined
	const since = now - iv.arrivedAt - SETTLES
	if (since < 0) return undefined
	if (since < ASKING) return { who: iv.reporter, text: iv.question, since }
	if (since < ASKING + ANSWERING)
		return { who: iv.winner, text: iv.answer, since: since - ASKING }
	return undefined
}

/** A tick of the world, for its interview: stepped with it, on the Host, whether or not it's drawn. */
export function stepInterview(world: World) {
	interviewOf(world)
}

/** When it's over, once the reporter's got there: the answer given. */
export const interviewEnds = (iv: Interview) =>
	iv.arrivedAt === undefined
		? undefined
		: iv.arrivedAt + SETTLES + ASKING + ANSWERING

/** Whether `racer`'s won and still being interviewed, or about to be: the result waits. */
export function interviewing(world: World, racer: Racer) {
	const iv = interviewOf(world)
	return !!iv && iv.winner === racer && underway(world, iv)
}

/** Whether a winner's still being interviewed, or about to be: a Round waits, its winner's interview not cut off. */
export function interviewUnderway(world: World) {
	const iv = interviewOf(world)
	return !!iv?.winner && underway(world, iv)
}

/**
 * The long jump's replay, again, after the interview, if it's shown again
 * (now and then, picked from who won and how far they jumped, the same on
 * every screen; or always, with `cheats.alwaysEncore`): when it starts and
 * ends, and, played back, the first tick shown, and when the landing is.
 */
export function encoreTimes(world: World) {
	const iv = interviewOf(world)
	const drone = droneOf(world)
	if (!iv?.winner || !drone?.jump || drone.state === 'down') return undefined
	const ends = interviewEnds(iv)
	if (ends === undefined) return undefined
	const pick = hash(`${iv.winner.id}${drone.jump.metres}`)
	if (!cheats.alwaysEncore && pick % ENCORE_OUT_OF >= ENCORE_SOMETIMES)
		return undefined
	const first = replayTimes(drone.jump)
	const start = ends + ENCORE_AFTER
	return {
		from: first.from,
		start,
		end: start + (first.end - first.start),
		landing: start + (first.landing - first.start),
	}
}

/** Whether it's still to come, or going on, the replay again after it too: never for longer than `HOLDS_MOST`. */
function underway(world: World, iv: Interview) {
	const now = world.ticks()
	if (now - iv.wonAt > HOLDS_MOST) return false
	const ends = interviewEnds(iv)
	if (ends === undefined || now < ends) return true
	const encore = encoreTimes(world)
	return !!encore && now < encore.end
}
