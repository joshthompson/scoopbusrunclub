import { createEffect, createRoot, createSignal } from 'solid-js'
import { audioContext } from '../audio'
import { musicOn } from '../saved/settings'
import { type Parsed, isDrum, parse, playVoice } from './synth'
import {
	BEAT,
	BPM,
	STEPS_PER_BAR,
	STEPS_PER_BEAT,
	type Tune,
	tuneFor,
} from './tunes'

/**
 * The game's music, while it's on: the beat, playing all the time, never
 * starting over, and over it the tune for whatever's on, the menus' or a
 * course's. A new tune comes in on the next bar, fading in over half a bar as
 * the last one fades out, so it's never out of step.
 */

/** How loud it all is, under the sound effects. */
const VOLUME = 0.32
/** How many bars one tune takes to fade into the next: two beats. */
const FADE_BARS = 0.5
/** How far ahead notes are lined up, in seconds, and how often that's topped up. */
const LOOKAHEAD = 0.15
const TICK_MS = 25

const STEP_SECONDS = 60 / BPM / STEPS_PER_BEAT

/** A tune, read and ready, in its own fader. */
interface Layer {
	id: string
	tracks: Parsed[]
	steps: number
	/** The step it came in on, and the one it's gone by, faded out. */
	from: number
	until?: number
	fader: GainNode
}

const read = (tune: Tune) => {
	const steps = tune.bars * STEPS_PER_BAR
	return { steps, tracks: tune.tracks.map((track) => parse(track, steps)) }
}

const beat = read(BEAT)

/** Which tune's wanted: the menus', or a course's, by its id. */
let wanted = 'menu'
let playing:
	| {
			context: AudioContext
			master: GainNode
			timer: ReturnType<typeof setInterval>
			/** The next step to line up, counted from when the music started, and when it sounds. */
			step: number
			at: number
			layers: Layer[]
	  }
	| undefined

/** Whether anything's been pressed yet: browsers won't play a note before. */
const [unlocked, setUnlocked] = createSignal(false)

/** Something pressed or tapped: the music can start. */
export function unlockMusic() {
	setUnlocked(true)
}

/** Whether a course's tune has been on yet: till then, the menus have their own. */
let courseHeard = false

/**
 * The menus' tune, when the game's just opened. Once a course has been run,
 * the menus keep whatever tune was last on.
 */
export function playMenu() {
	if (!courseHeard) playTune('menu')
}

/** The tune to play, `menu` or a course's id: faded into on the next bar. */
export function playTune(id: string) {
	if (id !== 'menu') courseHeard = true
	wanted = id
	if (!playing) return
	const current = playing.layers.find((layer) => layer.until === undefined)
	if (current?.id === id) return
	const { step, at, context } = playing
	// The next bar, if there's time to get it lined up; the one after if not.
	let bar = Math.ceil(step / STEPS_PER_BAR) * STEPS_PER_BAR
	if (bar - step < 2) bar += STEPS_PER_BAR
	const start = at + (bar - step) * STEP_SECONDS
	const fade = FADE_BARS * STEPS_PER_BAR * STEP_SECONDS
	for (const layer of playing.layers) {
		if (layer.until !== undefined) continue
		const gain = layer.fader.gain
		gain.cancelScheduledValues(start)
		gain.setValueAtTime(gain.value, Math.max(context.currentTime, start - 0.01))
		gain.linearRampToValueAtTime(0, start + fade)
		layer.until = bar + FADE_BARS * STEPS_PER_BAR
	}
	playing.layers.push(layer(id, bar, start, fade))
}

/** A new layer for tune `id`, coming in at step `from`, at `start`, over `fade` seconds. */
function layer(id: string, from: number, start: number, fade: number): Layer {
	if (!playing) throw new Error('No music playing')
	const fader = playing.context.createGain()
	fader.gain.setValueAtTime(fade ? 0 : 1, playing.context.currentTime)
	if (fade) {
		fader.gain.setValueAtTime(0, start)
		fader.gain.linearRampToValueAtTime(1, start + fade)
	}
	fader.connect(playing.master)
	return { id, ...read(tuneFor(id)), from, fader }
}

function start() {
	if (playing) return
	try {
		const context = audioContext()
		if (context.state === 'suspended') void context.resume()
		const master = context.createGain()
		master.gain.setValueAtTime(0, context.currentTime)
		master.gain.linearRampToValueAtTime(VOLUME, context.currentTime + 0.4)
		const compressor = context.createDynamicsCompressor()
		compressor.threshold.value = -14
		compressor.ratio.value = 4
		master.connect(compressor).connect(context.destination)
		playing = {
			context,
			master,
			timer: setInterval(tick, TICK_MS),
			step: 0,
			at: context.currentTime + 0.05,
			layers: [],
		}
		playing.layers.push(layer(wanted, 0, 0, 0))
		tick()
	} catch {
		// No Web Audio: the game's just quiet.
	}
}

function stop() {
	if (!playing) return
	const { context, master, timer } = playing
	clearInterval(timer)
	master.gain.cancelScheduledValues(context.currentTime)
	master.gain.setValueAtTime(master.gain.value, context.currentTime)
	master.gain.linearRampToValueAtTime(0, context.currentTime + 0.3)
	setTimeout(() => master.disconnect(), 500)
	playing = undefined
}

/** Lines up the notes due in the next moment. */
function tick() {
	if (!playing) return
	const { context } = playing
	// Fallen behind, the page hidden a while: on from now, not every note missed at once.
	if (playing.at < context.currentTime - 0.05) {
		const missed = Math.ceil((context.currentTime - playing.at) / STEP_SECONDS)
		playing.step += missed
		playing.at += missed * STEP_SECONDS
	}
	while (playing.at < context.currentTime + LOOKAHEAD) {
		line(playing.step, playing.at)
		playing.step++
		playing.at += STEP_SECONDS
	}
	// Faded right out: gone.
	for (const layer of playing.layers.filter(
		(layer) => layer.until !== undefined && layer.until <= (playing?.step ?? 0),
	)) {
		setTimeout(() => layer.fader.disconnect(), 1000)
		playing.layers.splice(playing.layers.indexOf(layer), 1)
	}
}

/** Step `step`'s notes, at `time`: the beat's, and every tune's that's playing. */
function line(step: number, time: number) {
	if (!playing) return
	const { context, master } = playing
	const notes = (tracks: Parsed[], at: number, out: AudioNode) => {
		for (const track of tracks) {
			const event = track.events[at]
			if (!event) continue
			const duration = isDrum(track.voice)
				? 0.1
				: STEP_SECONDS * (event.length - 1 + track.gate)
			playVoice(
				context,
				out,
				track.voice,
				event.note,
				time,
				duration,
				track.gain,
			)
		}
	}
	notes(beat.tracks, step % beat.steps, master)
	for (const layer of playing.layers) {
		if (step < layer.from || (layer.until !== undefined && step >= layer.until))
			continue
		notes(layer.tracks, (step - layer.from) % layer.steps, layer.fader)
	}
}

/** What's playing, for checking it from the console: the tunes, and how loud each is. */
export function musicNow() {
	if (!playing) return undefined
	return {
		step: playing.step,
		state: playing.context.state,
		layers: playing.layers.map((layer) => ({
			id: layer.id,
			gain: Math.round(layer.fader.gain.value * 100) / 100,
			from: layer.from,
			until: layer.until,
		})),
	}
}

// On once something's been pressed, while the Music option's on.
createRoot(() =>
	createEffect(() => {
		if (unlocked() && musicOn()) start()
		else stop()
	}),
)
