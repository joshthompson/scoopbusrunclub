import { audioContext, wake } from '../audio'
import { TICK_MS } from '../game/constants'
import type { World } from '../game/world'
import {
	GOOD_BY,
	MAX_ROUNDS,
	type RockShow,
	isLong,
	noteAt,
	notesBetween,
	roundStep,
	stepAt,
	tickAt,
} from '../minigames/lollapascoopza'
import { effectsOn, musicOn } from '../saved/settings'
import { INTRO_STEPS, LOOP_STEPS, SONGS, midiOf } from './lollapascoopza'
import { holdMusic } from './music'
import { isDrum, parse, playVoice } from './synth'

/**
 * Lollapascoopza's song, played in time with the game: the band from
 * "Go!", at the tempo the round's at, and each note of the riff as it's
 * played, the moment it is. The rest of the music's held quiet meanwhile
 * (see `holdMusic`), and comes back once it's over.
 *
 * Kept in step with the race's ticks rather than its own clock: each tick
 * is tied to a moment of the audio's, and the band's notes are lined up a
 * few ticks ahead by it, tied again if the two drift apart. Called every
 * tick it's drawn, by the track's drawing; not in a preview.
 */

const TICK_SECONDS = TICK_MS / 1000
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
/** `pitch` an octave up: in tune with anything the band's playing. */
function octaveOver(pitch: string) {
	const midi = midiOf(pitch) + 12
	return `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`
}
/** How far ahead the band's lined up, in ticks. */
const AHEAD = 9
/** How far behind the screen the sound's put, to have time to line it up; and how far the two can drift apart before they're tied again. */
const LATENCY = 0.03
const DRIFT = 0.05
/** How loud it is, as the rest of the music. */
const VOLUME = 0.32
/** How long the band plays on, after it's decided, before the music's let back. */
const OUTRO_TICKS = 150

/** Each song's band and intro, read and ready. */
const PARSED = SONGS.map((song) => ({
	band: song.band.map((track) => parse(track, LOOP_STEPS)),
	intro: song.intro.map((track) => parse(track, INTRO_STEPS)),
}))

export function createLollapascoopzaSong(world: World, show: RockShow) {
	let out: { context: AudioContext; master: GainNode } | undefined
	/** A tick, and the moment of the audio's it's played at. */
	let anchor: { tick: number; time: number } | undefined
	/** The next of the band's steps to line up. */
	let nextStep: number | undefined
	let lastTick = Number.NaN
	/** The notes of the riff played, so each's heard once, whoever else plays it. */
	const sounded = new Set<number>()
	/** Up to which tick notes let by have had their dud. */
	let duddedTo = 0
	let finale = false

	function output() {
		if (out) return out
		const context = audioContext()
		const master = context.createGain()
		master.gain.value = VOLUME
		const compressor = context.createDynamicsCompressor()
		compressor.threshold.value = -14
		compressor.ratio.value = 4
		master.connect(compressor).connect(context.destination)
		out = { context, master }
		return out
	}

	/** How long a step of the song is just then, in seconds. */
	const stepSeconds = (step: number) =>
		(tickAt(show.song, step + 1) - tickAt(show.song, step)) * TICK_SECONDS

	return function update() {
		if (world.preview || document.hidden) return
		const now = world.raceTicks()
		if (world.phase() !== 'running' || now <= 0) return
		// Paused, or drawn twice in a tick: nothing new. Paused long, the
		// music comes back, held no longer.
		if (now === lastTick) return
		if (now < lastTick) {
			anchor = undefined
			nextStep = undefined
		}
		lastTick = now
		const ended = show.endedAt
		if (ended !== undefined && now - ended > OUTRO_TICKS) return
		const music = musicOn()
		if (!music && !effectsOn()) return
		if (music) holdMusic(300)

		let context: AudioContext
		let master: GainNode
		try {
			;({ context, master } = output())
		} catch {
			// No Web Audio: the game's just quiet.
			return
		}
		wake(context)
		if (context.state !== 'running') return
		const ideal = context.currentTime + LATENCY
		if (
			!anchor ||
			Math.abs(anchor.time + (now - anchor.tick) * TICK_SECONDS - ideal) > DRIFT
		)
			anchor = { tick: now, time: ideal }
		const { tick: t0, time: s0 } = anchor
		const song = SONGS[show.song] ?? SONGS[0]
		const parsed = PARSED[show.song] ?? PARSED[0]
		const timeOf = (tick: number) => s0 + (tick - t0) * TICK_SECONDS

		// The band, a few ticks ahead, till it's decided.
		if (music && ended === undefined) {
			const to = Math.floor(stepAt(show.song, now + AHEAD))
			let step = nextStep ?? Math.ceil(stepAt(show.song, now))
			for (; step <= to; step++) {
				const time = timeOf(tickAt(show.song, step))
				if (time < context.currentTime) continue
				const tracks = step < 0 ? parsed.intro : parsed.band
				const at = step < 0 ? step + INTRO_STEPS : step % LOOP_STEPS
				for (const track of tracks) {
					const event = track.events[at]
					if (!event) continue
					playVoice(
						context,
						master,
						track.voice,
						event.note,
						time,
						isDrum(track.voice)
							? 0.1
							: stepSeconds(step) * (event.length - 1 + track.gate),
						track.gain,
					)
				}
				// A crash on each faster round's first beat.
				for (let r = 1; r < MAX_ROUNDS; r++)
					if (step === Math.ceil(roundStep(show.song, r)))
						playVoice(context, master, 'crash', 'C4', time, 0.1, 0.07)
			}
			nextStep = step
		}

		// The riff: each note as it's first played, now.
		const soon = context.currentTime + 0.005
		for (const step of show.played) {
			if (sounded.has(step)) continue
			sounded.add(step)
			const note = noteAt(show.song, step)
			if (!note) continue
			// A long note rings on as long as it's held for.
			const length = isLong(note)
				? stepSeconds(step) * note.length
				: Math.min(0.45, Math.max(0.16, stepSeconds(step) * 3))
			playVoice(
				context,
				master,
				song.leadVoice,
				note.pitch,
				soon,
				length,
				song.leadGain,
			)
			// A double note: its octave over it too, bigger.
			if (note.pair !== undefined)
				playVoice(
					context,
					master,
					song.leadVoice,
					octaveOver(note.pitch),
					soon,
					length,
					song.leadGain * 0.8,
				)
		}
		// Let by, by everyone: a dead string, plucked.
		if (ended === undefined && now - GOOD_BY > duddedTo) {
			for (const note of notesBetween(
				show.song,
				stepAt(show.song, duddedTo),
				stepAt(show.song, now - GOOD_BY),
			))
				if (!show.played.has(note.step))
					playVoice(context, master, 'pluck', song.home, soon, 0.05, 0.025)
			duddedTo = now - GOOD_BY
		}
		const gone = stepAt(show.song, now) - 64
		for (const step of sounded) if (step < gone) sounded.delete(step)

		// Decided: the band ends on a big chord, everything at once.
		if (ended !== undefined && !finale && music) {
			finale = true
			for (const hit of song.finale)
				playVoice(context, master, hit.voice, hit.note, soon, 1.8, hit.gain)
			playVoice(context, master, 'crash', 'C4', soon, 0.1, 0.08)
			playVoice(context, master, 'kick', 'C4', soon, 0.1, 0.3)
		}
	}
}
