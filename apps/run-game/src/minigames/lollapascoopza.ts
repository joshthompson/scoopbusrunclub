import { START_X, TICK_MS } from '../game/constants'
import type { HatKind } from '../game/hats'
import type { Racer, World } from '../game/world'
import type { Controls } from '../input'
import {
	INTRO_STEPS,
	LOOP_STEPS,
	type RockSong,
	SONGS,
	midiOf,
} from '../music/lollapascoopza'
import { play } from '../sfx'
import { ARENA_WALLS, arenaCourse, inRandomOrder } from './arena'
import { clock } from './clock'
import {
	IDLE,
	type Minigame,
	type MinigameFrame,
	type MinigameRun,
} from './types'

/**
 * Lollapascoopza: a rock show. Everyone's up on a podium of their own on a
 * festival stage, and over each of them, hung from the lighting rig, their
 * own track of arrows, left, down, up and right, scrolling down it to a
 * line. Press each as it touches the line: played in time, it's a note of
 * the song's lead riff, and you strike a pose that way (a step left or
 * right, a hop, down in a crouch). Pressed by nobody, the note's not
 * played. A long note (see `HOLD_FROM`) has a tail: hold its arrow down
 * till the tail's gone past the line, or it's let go of. The song's one of
 * five (see `SONGS`), each at its own tempo, each game the next, round and
 * round, the first at random; and everyone's dressed for it (see
 * `OUTFITS`).
 *
 * Each note played scores 10 points, times the multiplier: two times over
 * after ten in a row, three after twenty, four after thirty, when their
 * track goes blue and glows; a miss or a wrong arrow, back to one. A long
 * note scores on as it's held, a point every 100 ms; and from halfway, a
 * double note, two arrows at once (see `isDouble`), 25. Every 15 seconds the band speeds up, by an
 * eighth of its tempo, for a minute. The highest score wins.
 *
 * Everything on the clock is the song's, worked out from the race's ticks
 * (`stepAt`, `tickAt`), and its notes are its lead riff's, so Remote
 * Players' screens need only which song, who's played what, who's holding
 * what, and their scores.
 */

// --- The song's timeline -------------------------------------------------

/** A round: 15 seconds, at one tempo. */
export const ROUND_TICKS = Math.round(15_000 / TICK_MS)
/** How long the song goes on: four rounds, a minute, faster each. */
export const MAX_ROUNDS = 4
/** Song `song`'s own tempo, in BPM: the intro's, and the first round's. */
const baseBpm = (song: number) => (SONGS[song] ?? SONGS[0]).bpm
/** Its round `r`'s (from 0): an eighth faster every 15 seconds. */
export const bpmOf = (song: number, round: number) =>
	baseBpm(song) * (1 + Math.max(0, round) / 8)
/** Bars in round `r`: as many as fit 15 seconds at its tempo. */
const barsOf = (song: number, round: number) =>
	(bpmOf(song, round) * 15) / 60 / 4
/** The intro: two bars, at the song's own tempo, before the riff comes in. */
export const introTicks = (song: number) =>
	Math.round(((INTRO_STEPS / 4) * 60_000) / baseBpm(song) / TICK_MS)

/** When round `r` starts, by the race's ticks. */
export const roundStart = (song: number, round: number) =>
	introTicks(song) + round * ROUND_TICKS
/** And at which of the song's steps. */
export const roundStep = (song: number, round: number) => {
	let step = 0
	for (let r = 0; r < round; r++) step += barsOf(song, r) * 16
	return step
}
/** Which round tick `tick`'s in: -1 the intro. */
export const roundAt = (song: number, tick: number) =>
	tick < introTicks(song)
		? -1
		: Math.floor((tick - introTicks(song)) / ROUND_TICKS)
/** When it's all over, at the latest. */
export const lastTick = (song: number) => roundStart(song, MAX_ROUNDS)

/**
 * Where song `song` is at `tick` ticks after "Go!", in steps (a sixteenth
 * note), from where the riff comes in: the intro's before that, below 0.
 * Not a whole number, between steps.
 */
export function stepAt(song: number, tick: number) {
	const intro = introTicks(song)
	if (tick < intro) return -INTRO_STEPS + (tick * INTRO_STEPS) / intro
	const round = roundAt(song, tick)
	return (
		roundStep(song, round) +
		((tick - roundStart(song, round)) * barsOf(song, round) * 16) / ROUND_TICKS
	)
}

/** When song `song`'s at `step`, in the race's ticks: not a whole number, between ticks. */
export function tickAt(song: number, step: number) {
	if (step < 0) return ((step + INTRO_STEPS) * introTicks(song)) / INTRO_STEPS
	let round = 0
	while (round < MAX_ROUNDS * 2 && roundStep(song, round + 1) <= step) round++
	return (
		roundStart(song, round) +
		((step - roundStep(song, round)) * ROUND_TICKS) / (barsOf(song, round) * 16)
	)
}

// --- Its notes ------------------------------------------------------------

/** The arrows, in the order they're across a track. */
export const LANES = ['left', 'down', 'up', 'right'] as const
export type Lane = 0 | 1 | 2 | 3

/** A note to play: which step of the song it's on (its id), its pitch, which arrow, and how many steps it's held. */
export interface Note {
	step: number
	pitch: string
	lane: Lane
	length: number
	/** A double note's second arrow. */
	pair?: Lane
}
/**
 * How long a note has to be, in steps, to be a long one: a half note. Its
 * arrow's held down from when it comes to the line till its tail's gone
 * past it.
 */
export const HOLD_FROM = 8
export const isLong = (note: Note) => note.length >= HOLD_FROM
/**
 * Double notes: two arrows at once, both to be pressed. From the third
 * round on, some of the riff's quarter notes (not its long ones) come
 * with a second arrow, two lanes over: picked from where they are in the
 * song, so every screen has the same.
 */
const DOUBLES_FROM = 2
const DOUBLE_SHARE = 0.45
export const isDouble = (note: Note) => note.pair !== undefined
/** The longest a note's held for, in steps: a bar. */
const LONGEST = 16

/** Which arrow `pitch` is in `song`: the lowest notes left, the highest right. */
const laneOf = (song: RockSong, pitch: string): Lane => {
	const midi = midiOf(pitch)
	const [down, up, right] = song.lanes
	return midi < down ? 0 : midi < up ? 1 : midi < right ? 2 : 3
}

/** Each song's riff's notes, once round, by step from its start. */
const RIFFS: Note[][] = SONGS.map((song) => {
	const tokens = song.lead.trim().split(/\s+/)
	return tokens.flatMap((token, step) => {
		if (token === '-' || token === '_') return []
		let length = 1
		while (tokens[step + length] === '_') length++
		return [{ step, pitch: token, lane: laneOf(song, token), length }]
	})
})

/**
 * The notes of song `song` (its place in `SONGS`) from step `from` up to,
 * not including, `to`: its riff round and round from step 0.
 */
export function notesBetween(song: number, from: number, to: number): Note[] {
	const riff = RIFFS[song] ?? RIFFS[0]
	const out: Note[] = []
	const first = Math.max(0, Math.ceil(from))
	for (
		let loop = Math.floor(first / LOOP_STEPS) * LOOP_STEPS;
		loop < to;
		loop += LOOP_STEPS
	)
		for (const note of riff) {
			const step = loop + note.step
			if (step < first || step >= to) continue
			const double =
				note.length >= 4 &&
				!isLong(note) &&
				tickAt(song, step) >= roundStart(song, DOUBLES_FROM) &&
				unit(step * 2654435761 + song) < DOUBLE_SHARE
			out.push({
				...note,
				step,
				pair: double ? (((note.lane + 2) % 4) as Lane) : undefined,
			})
		}
	return out
}

/** A number 0 to 1 from `n`, the same everywhere. */
const unit = (n: number) => {
	let x = Math.imul(n ^ 0x2c1b3c6d, 0x297a2d39)
	x = Math.imul(x ^ (x >>> 15), 0x85ebca6b)
	return ((x ^ (x >>> 13)) >>> 0) / 4294967296
}

/** Song `song`'s note on `step`, if there is one. */
export const noteAt = (song: number, step: number) =>
	notesBetween(song, step, step + 1)[0]

// --- Playing them ---------------------------------------------------------

/** How far off a note's tick a press can be, either way, in ticks, for each grade. */
export const PERFECT_BY = 3
export const GREAT_BY = 6
export const GOOD_BY = 9

/** How a press went: on a note, how close; `MISS`, a note let by; `STRAY`, a wrong arrow. */
export const PERFECT = 0
export const GREAT = 1
export const GOOD = 2
export const MISS = 3
export const STRAY = 4
export const GRADE_WORDS = ['Perfect', 'Great', 'Good', 'Miss', 'Oops']
/** Whether a grade's a bad one. */
export const isBad = (grade: number) => grade === MISS || grade === STRAY

/**
 * Scoring: `NOTE_POINTS` a note played, `DOUBLE_POINTS` a double note,
 * times the multiplier, which goes up one every `STREAK_STEP` notes in a
 * row, to `MOST_MULTIPLIER` (when their track goes blue, glowing); a miss
 * or a wrong arrow, back to one. A long note held scores on as it's held,
 * a point every 100 ms, times the multiplier; let go of, it just stops.
 */
export const NOTE_POINTS = 10
export const DOUBLE_POINTS = 25
const HOLD_POINTS_A_TICK = TICK_MS / 100
export const STREAK_STEP = 10
export const MOST_MULTIPLIER = 4
export const multiplierOf = (combo: number) =>
	Math.min(MOST_MULTIPLIER, 1 + Math.floor(combo / STREAK_STEP))
/** A score, as it's said: whole points. */
export const pointsOf = (r: { score: number }) => Math.floor(r.score)

/** How long a pose lasts, after a press. */
export const MOVE_TICKS = 14

/** How the song's going for one of them. */
export interface Rocker {
	/** Where their podium is, along the stage, and their track over it: its middle. */
	x: number
	/** Their score; notes played, and notes there were, all game. */
	score: number
	hits: number
	played: number
	/** Notes in a row, and the most they got in a row. */
	combo: number
	best: number
	/** The last grade they got (see `PERFECT`…), and when. */
	grade: number
	gradeAt: number
	/** The last arrow they pressed, and when: the pose they strike. */
	move: Lane
	moveAt: number
	/** The steps of the notes they've played lately: gone off their track. */
	notesHit: Set<number>
	/** The long note they've last been holding, if any: its step, the step its tail ends on, and how it's gone. */
	hold?: Hold
}

/** A long note: being held, let go of (it stops scoring), or held all the way. */
export const HOLDING = 0
export const DROPPED = 1
export const HELD_ON = 2
export interface Hold {
	step: number
	end: number
	lane: Lane
	state: number
}

/** What's to be drawn of a game of it. */
export interface RockShow {
	/** Which song, its place in `SONGS`. */
	song: number
	rockers: Map<string, Rocker>
	/** The steps of notes anyone's played lately, to be heard once each. */
	played: Set<number>
	/** The floor of the stage, and the podiums' tops, where everyone's stood. */
	ground: number
	podiumTop: number
	/** How wide each podium is, and each track over one. */
	podiumWidth: number
	trackWidth: number
	/** When it was decided, by the race's ticks, the song stopping. */
	endedAt?: number
}
const shows = new WeakMap<World, RockShow>()

/** `world`'s game of Lollapascoopza, for drawing, if it's one. */
export const rockOf = (world: World) => shows.get(world)

/** How tall a podium is. */
export const PODIUM_TALL = 44
/** How long the news of the band speeding up is up. */
export const NEWS_TICKS = 70

export const lollapascoopza: Minigame = {
	id: 'lollapascoopza',
	name: 'Lollapascoopza',
	tagline: 'Hit the notes, rock out',
	blurb:
		'Rock out! Press each arrow as it hits the line to play the song, hold the long ones, and hit double arrows together. Ten in a row doubles your points, up to four times, and your track glows blue. Highest score wins!',
	tune: 'lollapascoopza',
	// Everyone's score's over their track, their multiplier under it.
	pills: false,
	collectables: [],
	course: arenaCourse(
		'lollapascoopza',
		'Lollapascoopza',
		'Hit the arrows in time. Highest score wins!',
		// A festival stage at night: all drawn (see `draw/rockStage`).
		{
			palette: {
				'--sky-blue-top': '#0a0620',
				'--sky-blue-bottom': '#2a1450',
				'--grass-green': '#120c22',
			},
			far: [],
			near: [],
			horizonTrees: false,
			ground: [],
		},
	),
	start: startLollapascoopza,
}

/**
 * What everyone wears for each song (its place in `SONGS`): a hat, put on
 * them (the Room gives them theirs back after), and what's hung round
 * their neck, drawn with the stage (see `draw/lollapascoopza`). The
 * Anthem, a punk's spiked leather cap; Bus Stop Bounce, a giant clock
 * on a gold chain; Fika Metal, an electric guitar; Night Bus Rave, a disco
 * ball over the head; and Cool Scoop Swing, a saxophone and the Spirit of
 * Jazz's hat. With no hat said, they keep their own on.
 */
export type NeckWear = 'guitar' | 'sax' | 'clock'
export const OUTFITS: { hat?: HatKind; neck?: NeckWear }[] = [
	{ hat: 'punkCap' },
	{ neck: 'clock' },
	{ neck: 'guitar' },
	{ hat: 'discoBall' },
	{ hat: 'jazzHat', neck: 'sax' },
]

/**
 * The song this screen last played: the next game plays the next one,
 * round and round, so it's a different one each time; the first, one at
 * random. A preview's doesn't count.
 */
let lastSong: number | undefined
function nextSong(world: World) {
	const next =
		lastSong === undefined
			? Math.floor(Math.random() * SONGS.length)
			: (lastSong + 1) % SONGS.length
	if (!world.preview) lastSong = next
	return next
}

/** A number 0 to 1 from `n`, the same everywhere. */
const hash = (n: number) => {
	let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b)
	x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35)
	return ((x ^ (x >>> 16)) >>> 0) / 4294967296
}
const hashText = (text: string) => {
	let h = 7
	for (const c of text) h = Math.imul(h, 31) + c.charCodeAt(0)
	return h
}

function startLollapascoopza(world: World): MinigameRun {
	const { racers } = world
	const ground = world.terrain.groundY(START_X)
	const podiumTop = ground - PODIUM_TALL
	const { left, right } = ARENA_WALLS
	const solo = racers.length === 1
	const slot = Math.min(150, (right - left) / racers.length)
	const middle = (left + right) / 2
	const rockers = new Map<string, Rocker>()
	const show: RockShow = {
		// On the Host; a Remote Player's screen is told (see `apply`).
		song: nextSong(world),
		rockers,
		played: new Set(),
		ground,
		podiumTop,
		podiumWidth: Math.min(96, Math.floor((slot - 8) / 4) * 4),
		trackWidth: Math.min(136, Math.floor((slot - 6) / 4) * 4),
	}
	shows.set(world, show)

	// Dressed for the song.
	const outfit = OUTFITS[show.song]
	if (outfit?.hat)
		for (const racer of racers) racer.body.hat = { kind: outfit.hat }

	inRandomOrder(racers).forEach((racer, i) => {
		rockers.set(racer.id, {
			x: Math.round(middle + (i - (racers.length - 1) / 2) * slot),
			score: 0,
			hits: 0,
			played: 0,
			combo: 0,
			best: 0,
			grade: -1,
			gradeAt: -99,
			move: 0,
			moveAt: -99,
			notesHit: new Set(),
		})
	})
	const rockerOf = (racer: Racer) => rockers.get(racer.id) as Rocker
	const notes = (from: number, to: number) => notesBetween(show.song, from, to)

	/** Which notes each of them has had judged, played or let by, by step. */
	const judged = new Map<string, Set<number>>()
	const judgedBy = (racer: Racer) => {
		let set = judged.get(racer.id)
		if (!set) {
			set = new Set()
			judged.set(racer.id, set)
		}
		return set
	}
	/** What each was holding last tick, so a press is told from a hold. */
	const was = new Map<string, Controls>()
	/** Up to which tick notes have been looked at, to be let by. */
	let sweptTo = 0

	function grade(racer: Racer, g: number, tick: number, worth = NOTE_POINTS) {
		const r = rockerOf(racer)
		r.grade = g
		r.gradeAt = tick
		if (g === STRAY) r.combo = 0
		else if (g === MISS) {
			r.combo = 0
			r.played++
		} else {
			r.combo++
			r.best = Math.max(r.best, r.combo)
			r.played++
			r.hits++
			r.score += worth * multiplierOf(r.combo)
		}
	}

	/** Each of them's double notes half played: the arrows of each pressed so far, by its step. */
	const halves = new Map<string, Map<number, Set<Lane>>>()
	const halvesOf = (racer: Racer) => {
		let map = halves.get(racer.id)
		if (!map) {
			map = new Map()
			halves.set(racer.id, map)
		}
		return map
	}

	/** `racer` pressing `lane` on `tick`: the nearest note of that arrow's, if near enough. */
	function press(racer: Racer, lane: Lane, tick: number) {
		const r = rockerOf(racer)
		r.move = lane
		r.moveAt = tick
		const done = judgedBy(racer)
		let best: Note | undefined
		let off = Number.POSITIVE_INFINITY
		for (const note of notes(
			stepAt(show.song, tick - GOOD_BY) - 1,
			stepAt(show.song, tick + GOOD_BY) + 1,
		)) {
			if ((note.lane !== lane && note.pair !== lane) || done.has(note.step))
				continue
			const by = Math.abs(tickAt(show.song, note.step) - tick)
			if (by <= GOOD_BY && by < off) {
				best = note
				off = by
			}
		}
		if (!best) {
			// Pressed with nothing near to play: wrong, if there's anything
			// at all to play just now; just dancing about, if not.
			const near = notes(
				stepAt(show.song, tick) - 4,
				stepAt(show.song, tick) + 4,
			)
			if (near.length) grade(racer, STRAY, tick)
			return
		}
		// A double: played once both its arrows are.
		if (best.pair !== undefined) {
			const half = halvesOf(racer)
			const pressed = half.get(best.step) ?? new Set<Lane>()
			pressed.add(lane)
			half.set(best.step, pressed)
			if (pressed.size < 2) return
			half.delete(best.step)
		}
		done.add(best.step)
		r.notesHit.add(best.step)
		show.played.add(best.step)
		// A long one: to be held now, till its tail's past.
		if (isLong(best))
			r.hold = {
				step: best.step,
				end: best.step + best.length,
				lane,
				state: HOLDING,
			}
		grade(
			racer,
			off <= PERFECT_BY ? PERFECT : off <= GREAT_BY ? GREAT : GOOD,
			tick,
			best.pair !== undefined ? DOUBLE_POINTS : NOTE_POINTS,
		)
	}

	/**
	 * `racer`'s long note, if they're holding one: scoring as it's held,
	 * till its tail's end; let go of, it stops.
	 */
	function holding(racer: Racer, held: Controls, tick: number) {
		const r = rockerOf(racer)
		const h = r.hold
		if (!h || h.state !== HOLDING) return
		if (!held[LANES[h.lane]]) {
			h.state = DROPPED
			return
		}
		if (tick >= tickAt(show.song, h.end)) {
			h.state = HELD_ON
			return
		}
		if (tick > tickAt(show.song, h.step))
			r.score += HOLD_POINTS_A_TICK * multiplierOf(r.combo)
	}

	/** The notes gone past the line too far to be played, since last time: missed by whoever didn't. */
	function sweep(tick: number) {
		const to = tick - GOOD_BY
		if (to <= sweptTo) return
		for (const note of notes(stepAt(show.song, sweptTo), stepAt(show.song, to)))
			for (const racer of racers) {
				const done = judgedBy(racer)
				if (done.has(note.step)) continue
				done.add(note.step)
				halvesOf(racer).delete(note.step)
				grade(racer, MISS, tickAt(show.song, note.step) + GOOD_BY)
			}
		sweptTo = to
		// Forgetting what's long gone.
		const gone = stepAt(show.song, to) - 32
		for (const set of judged.values())
			for (const step of set) if (step < gone) set.delete(step)
		for (const r of rockers.values())
			for (const step of r.notesHit) if (step < gone) r.notesHit.delete(step)
		for (const step of show.played) if (step < gone) show.played.delete(step)
	}

	/** Over: the song's done; the highest score first. */
	function decide(tick: number) {
		if (world.order()) return
		if (tick < lastTick(show.song)) return
		const order = [...racers].sort((a, b) => {
			const ra = rockerOf(a)
			const rb = rockerOf(b)
			return rb.score - ra.score || rb.hits - ra.hits
		})
		world.setOrder(order)
		world.decidedAt = world.ticks()
		show.endedAt = tick
		const winner = rockerOf(order[0])
		world.popup(
			solo ? `${pointsOf(winner)} points!` : `${order[0].runner.name} rocks!`,
			winner.x,
			podiumTop - 110,
		)
		play('finished')
	}

	/** Their body put on their podium, posed as the song has them. */
	function place(racer: Racer, tick: number) {
		const r = rockerOf(racer)
		const b = racer.body
		b.held = 2
		b.vx = 0
		b.vy = 0
		b.grounded = true
		b.x = r.x
		b.feetY = podiumTop
		b.tilt = 0
		b.ducking = false
		b.standStill = true
		b.celebrating = !!world.order()
		// Facing in, to the middle of the stage, standing about.
		b.facing = r.x <= middle ? 1 : -1
		if (b.celebrating) {
			b.standStill = false
			return
		}
		const since = tick - r.moveAt
		if (since >= 0 && since < MOVE_TICKS && world.phase() === 'running') {
			const swing = Math.sin((Math.PI * since) / MOVE_TICKS)
			switch (r.move) {
				case 0:
				case 3: {
					// A step that way, leaning into it, mid-stride.
					const way = r.move === 0 ? -1 : 1
					b.facing = way
					b.x = r.x + Math.round(way * 6 * swing)
					b.tilt = way * 12 * swing
					b.standStill = false
					b.vx = way * 2
					break
				}
				case 1:
					// Down in a crouch.
					b.ducking = true
					break
				case 2:
					// A hop.
					b.feetY = podiumTop - Math.round(14 * swing)
					break
			}
		}
		// Got it wrong: a wobble.
		const wrong = tick - r.gradeAt
		if ((r.grade === MISS || r.grade === STRAY) && wrong >= 0 && wrong < 16)
			b.tilt = (b.tilt ?? 0) + Math.sin(wrong * 1.2) * 8 * (1 - wrong / 16)
	}

	/** How each bot plays: how good it is, out of 1. */
	const skillOf = (racer: Racer) => 0.74 + 0.24 * hash(hashText(racer.id))

	return {
		id: 'lollapascoopza',
		// Till the band speeds up again.
		ticksLeft: () => {
			const now = world.raceTicks()
			return Math.max(
				0,
				Math.min(
					lastTick(show.song),
					roundStart(show.song, Math.max(0, roundAt(show.song, now)) + 1),
				) - now,
			)
		},
		chip: (racer) => `${pointsOf(rockerOf(racer))}`,
		score: (racer) => rockerOf(racer).score,
		timeNote: (racer) =>
			world.order() ? `${pointsOf(rockerOf(racer))} points` : undefined,
		note: (racer) => {
			const r = rockerOf(racer)
			if (!world.order()) return `${pointsOf(r)} points so far`
			return `${pointsOf(r)} points, best streak ${r.best}, ${percent(r.hits, r.played)}% hit`
		},
		done: () => !!world.order(),
		out: () => false,
		// A bot: each note, played or not, a little off, decided once from the
		// note and who it is, so it holds its press from then for a few
		// ticks. Worse the faster it goes, as anyone is; and now and then,
		// the wrong arrow.
		bot: (racer) => {
			if (world.phase() !== 'running') return IDLE
			const now = world.raceTicks()
			const skill = skillOf(racer)
			const round = Math.max(0, roundAt(show.song, now))
			const seed = hashText(racer.id)
			const held = { ...IDLE }
			// Those near the line, and long ones still going past it.
			for (const note of notes(
				stepAt(show.song, now - 20) - LONGEST,
				stepAt(show.song, now + 20) + 1,
			)) {
				const roll = (k: number) => hash(seed + note.step * 7919 + k)
				if (roll(1) > skill - 0.07 * round) continue
				const spread = 3 + 2.4 * round
				const off = Math.round((roll(2) + roll(3) - 1) * spread)
				const at = Math.round(tickAt(show.song, note.step)) + off
				// A long one, held, till its tail's past: now and then let go
				// too soon, more the worse they are and the faster it goes.
				const until = isLong(note)
					? Math.round(tickAt(show.song, note.step + note.length)) -
						(roll(5) < 0.08 + (1 - skill) * 0.6 + 0.04 * round
							? Math.round(roll(6) * 30) + 5
							: 0)
					: at + 3
				if (now < at || now >= until) continue
				const lane =
					roll(4) < 0.04 ? (((note.lane + 1) % 4) as Lane) : note.lane
				held[LANES[lane]] = true
				// A double: its second arrow too, now and then forgotten.
				if (note.pair !== undefined && roll(7) > 0.1)
					held[LANES[note.pair]] = true
			}
			return held
		},
		step() {
			const now = world.raceTicks()
			if (world.phase() !== 'running') {
				for (const racer of racers) place(racer, now)
				return
			}
			if (!world.order()) {
				for (const racer of racers) {
					const held = racer.controls()
					const before = was.get(racer.id) ?? IDLE
					was.set(racer.id, { ...held })
					LANES.forEach((lane, i) => {
						if (held[lane] && !before[lane]) press(racer, i as Lane, now)
					})
					holding(racer, held, now)
				}
				sweep(now)
				decide(now)
			}
			for (const racer of racers) place(racer, now)
		},
		frame(): MinigameFrame {
			const recent = stepAt(show.song, world.raceTicks()) - 16
			return {
				rock: racers.map((racer) => {
					const r = rockerOf(racer)
					return [
						r.x,
						Math.round(r.score * 10),
						r.best,
						r.hits,
						r.played,
						r.combo,
						-1,
						r.grade,
						r.gradeAt,
						r.move,
						r.moveAt,
						r.hold?.step ?? -1,
						r.hold?.end ?? -1,
						r.hold?.state ?? -1,
					]
				}),
				rockHits: racers.map((racer) =>
					[...rockerOf(racer).notesHit].filter((step) => step >= recent),
				),
				rockSong: show.song,
				rockEnd: show.endedAt ?? -1,
			}
		},
		apply(a) {
			if (a.rockSong !== undefined) show.song = a.rockSong
			racers.forEach((racer, i) => {
				const f = a.rock?.[i]
				if (!f) return
				const r = rockerOf(racer)
				r.x = f[0]
				r.score = f[1] / 10
				;[r.best, r.hits, r.played, r.combo] = f.slice(2, 6)
				r.grade = f[7]
				r.gradeAt = f[8]
				r.move = f[9] as Lane
				r.moveAt = f[10]
				r.hold =
					f[11] === undefined || f[11] < 0
						? undefined
						: {
								step: f[11],
								end: f[12],
								lane: noteAt(show.song, f[11])?.lane ?? 0,
								state: f[13],
							}
				for (const step of a.rockHits?.[i] ?? []) {
					r.notesHit.add(step)
					show.played.add(step)
				}
				place(racer, world.raceTicks())
			})
			show.endedAt =
				a.rockEnd === undefined || a.rockEnd < 0 ? undefined : a.rockEnd
			// Forgetting what's long gone.
			const gone = stepAt(show.song, world.raceTicks()) - 32
			for (const r of rockers.values())
				for (const step of r.notesHit) if (step < gone) r.notesHit.delete(step)
			for (const step of show.played) if (step < gone) show.played.delete(step)
		},
	}
}

/** `of` out of `outOf`, as a whole percentage. */
const percent = (of: number, outOf: number) =>
	outOf > 0 ? Math.max(0, Math.round((100 * of) / outOf)) : 0
