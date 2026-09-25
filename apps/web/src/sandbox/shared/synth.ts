/**
 * A tiny Web Audio step sequencer, so the sandbox pages can have era-correct
 * background music without shipping (or licensing) an mp3.
 *
 * A song is a list of sections played in order and looped. Each section holds
 * tracks; a track is a voice and a pattern string, one token per step:
 *
 *   `C4`  play the note        `-`  rest        `_`  hold the previous note
 *   `x`   trigger (for drums)
 *
 * The scheduler runs a little ahead of the audio clock and reports every step
 * back on the same clock, which is what lets a page's visuals land on the beat
 * rather than roughly near it.
 */

export type Voice =
	| 'square'
	| 'triangle'
	| 'sawtooth'
	| 'sine'
	| 'whistle'
	| 'pluck'
	| 'bass'
	| 'kick'
	| 'snare'
	| 'hat'

export interface Track {
	voice: Voice
	pattern: string
	gain?: number
	/** Fraction of a step a note sounds for, before any `_` holds. */
	gate?: number
}

export interface Section {
	id: string
	/** Steps in this section; every track's pattern loops to fill it. */
	steps: number
	tracks: Track[]
}

export interface Song {
	bpm: number
	stepsPerBeat: number
	sections: Section[]
}

export interface StepEvent {
	sectionId: string
	sectionIndex: number
	/** Step within the section. */
	step: number
	/** Absolute step since the song started. */
	absoluteStep: number
	/** AudioContext time the step sounds at. */
	time: number
	/** Seconds from now until it sounds (can be slightly negative). */
	delay: number
}

const NOTE_INDEX: Record<string, number> = {
	C: 0,
	D: 2,
	E: 4,
	F: 5,
	G: 7,
	A: 9,
	B: 11,
}

export function noteToFrequency(note: string): number {
	const m = /^([A-G])([#b]?)(-?\d)$/.exec(note)
	if (!m) throw new Error(`Bad note ${note}`)
	const semitone = NOTE_INDEX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0)
	const octave = Number(m[3])
	const midi = (octave + 1) * 12 + semitone
	return 440 * 2 ** ((midi - 69) / 12)
}

interface ParsedTrack {
	voice: Voice
	gain: number
	gate: number
	/** Per step: a note to start (with its held length in steps), or null. */
	events: ({ note: string; length: number } | null)[]
}

function parseTrack(track: Track, steps: number): ParsedTrack {
	const tokens = track.pattern.trim().split(/\s+/)
	const events: ParsedTrack['events'] = []
	for (let i = 0; i < steps; i++) {
		const tok = tokens[i % tokens.length]
		if (tok === '-' || tok === '_') {
			events.push(null)
			continue
		}
		let length = 1
		for (let j = i + 1; j < steps && tokens[j % tokens.length] === '_'; j++) {
			length++
		}
		events.push({ note: tok, length })
	}
	return {
		voice: track.voice,
		gain: track.gain ?? 0.2,
		gate: track.gate ?? 0.85,
		events,
	}
}

let sharedContext: AudioContext | undefined
export function audioContext(): AudioContext {
	if (!sharedContext) sharedContext = new AudioContext()
	return sharedContext
}

let noiseBuffer: AudioBuffer | undefined
function noise(ctx: AudioContext): AudioBuffer {
	if (!noiseBuffer) {
		noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
		const data = noiseBuffer.getChannelData(0)
		for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
	}
	return noiseBuffer
}

function playVoice(
	ctx: AudioContext,
	out: AudioNode,
	voice: Voice,
	note: string,
	time: number,
	duration: number,
	gain: number,
) {
	const env = ctx.createGain()
	env.connect(out)

	switch (voice) {
		case 'kick': {
			const osc = ctx.createOscillator()
			osc.frequency.setValueAtTime(160, time)
			osc.frequency.exponentialRampToValueAtTime(45, time + 0.12)
			env.gain.setValueAtTime(gain, time)
			env.gain.exponentialRampToValueAtTime(0.001, time + 0.25)
			osc.connect(env)
			osc.start(time)
			osc.stop(time + 0.3)
			return
		}
		case 'snare': {
			const src = ctx.createBufferSource()
			src.buffer = noise(ctx)
			const filter = ctx.createBiquadFilter()
			filter.type = 'bandpass'
			filter.frequency.value = 1800
			filter.Q.value = 0.7
			env.gain.setValueAtTime(gain, time)
			env.gain.exponentialRampToValueAtTime(0.001, time + 0.15)
			src.connect(filter).connect(env)
			src.start(time)
			src.stop(time + 0.2)
			const body = ctx.createOscillator()
			body.frequency.setValueAtTime(220, time)
			body.frequency.exponentialRampToValueAtTime(120, time + 0.08)
			const benv = ctx.createGain()
			benv.gain.setValueAtTime(gain * 0.6, time)
			benv.gain.exponentialRampToValueAtTime(0.001, time + 0.1)
			body.connect(benv).connect(out)
			body.start(time)
			body.stop(time + 0.12)
			return
		}
		case 'hat': {
			const src = ctx.createBufferSource()
			src.buffer = noise(ctx)
			const filter = ctx.createBiquadFilter()
			filter.type = 'highpass'
			filter.frequency.value = 7000
			env.gain.setValueAtTime(gain, time)
			env.gain.exponentialRampToValueAtTime(0.001, time + 0.05)
			src.connect(filter).connect(env)
			src.start(time)
			src.stop(time + 0.06)
			return
		}
		case 'pluck': {
			// A banjo-ish pluck: bright start, fast decay through a closing filter.
			const osc = ctx.createOscillator()
			osc.type = 'sawtooth'
			osc.frequency.value = noteToFrequency(note)
			const filter = ctx.createBiquadFilter()
			filter.type = 'lowpass'
			filter.frequency.setValueAtTime(4000, time)
			filter.frequency.exponentialRampToValueAtTime(600, time + 0.15)
			env.gain.setValueAtTime(gain, time)
			env.gain.exponentialRampToValueAtTime(
				0.001,
				time + Math.max(0.15, duration),
			)
			osc.connect(filter).connect(env)
			osc.start(time)
			osc.stop(time + Math.max(0.15, duration) + 0.05)
			return
		}
		case 'whistle': {
			// A sine with a little vibrato and a soft attack.
			const osc = ctx.createOscillator()
			osc.type = 'sine'
			osc.frequency.value = noteToFrequency(note)
			const lfo = ctx.createOscillator()
			lfo.frequency.value = 6
			const lfoGain = ctx.createGain()
			lfoGain.gain.value = osc.frequency.value * 0.012
			lfo.connect(lfoGain).connect(osc.frequency)
			env.gain.setValueAtTime(0.0001, time)
			env.gain.exponentialRampToValueAtTime(gain, time + 0.025)
			env.gain.setValueAtTime(gain, time + duration - 0.03)
			env.gain.exponentialRampToValueAtTime(0.001, time + duration)
			osc.connect(env)
			osc.start(time)
			lfo.start(time)
			osc.stop(time + duration + 0.02)
			lfo.stop(time + duration + 0.02)
			return
		}
		case 'bass': {
			// A rave bass: two detuned saws through a filter that snaps shut.
			const freq = noteToFrequency(note)
			const filter = ctx.createBiquadFilter()
			filter.type = 'lowpass'
			filter.Q.value = 6
			filter.frequency.setValueAtTime(freq * 8, time)
			filter.frequency.exponentialRampToValueAtTime(freq * 1.5, time + 0.12)
			env.gain.setValueAtTime(gain, time)
			env.gain.setValueAtTime(gain, time + duration - 0.02)
			env.gain.exponentialRampToValueAtTime(0.001, time + duration)
			for (const detune of [-7, 7]) {
				const osc = ctx.createOscillator()
				osc.type = 'sawtooth'
				osc.frequency.value = freq
				osc.detune.value = detune
				osc.connect(filter)
				osc.start(time)
				osc.stop(time + duration + 0.02)
			}
			filter.connect(env)
			return
		}
		default: {
			const osc = ctx.createOscillator()
			osc.type = voice
			osc.frequency.value = noteToFrequency(note)
			env.gain.setValueAtTime(0.0001, time)
			env.gain.exponentialRampToValueAtTime(gain, time + 0.008)
			env.gain.setValueAtTime(gain, time + Math.max(0.01, duration - 0.02))
			env.gain.exponentialRampToValueAtTime(0.001, time + duration)
			osc.connect(env)
			osc.start(time)
			osc.stop(time + duration + 0.02)
		}
	}
}

export interface Player {
	start(): void
	stop(): void
	readonly playing: boolean
	/** Scale the tempo: 1 is as written, 2 is twice as fast. */
	setSpeed(speed: number): void
	/** Reported every step, a little before it sounds. */
	onStep(cb: (event: StepEvent) => void): () => void
}

export function createPlayer(
	song: Song,
	options: { volume?: number } = {},
): Player {
	const sections = song.sections.map((s) => ({
		id: s.id,
		steps: s.steps,
		tracks: s.tracks.map((t) => parseTrack(t, s.steps)),
	}))
	const totalSteps = sections.reduce((n, s) => n + s.steps, 0)

	let ctx: AudioContext | undefined
	let master: GainNode | undefined
	let timer: ReturnType<typeof setInterval> | undefined
	let speed = 1
	let nextStepTime = 0
	let absoluteStep = 0
	let playing = false
	const listeners = new Set<(event: StepEvent) => void>()

	const stepSeconds = () => 60 / song.bpm / song.stepsPerBeat / speed

	function locate(step: number) {
		let s = step % totalSteps
		for (let i = 0; i < sections.length; i++) {
			if (s < sections[i].steps)
				return { section: sections[i], index: i, step: s }
			s -= sections[i].steps
		}
		throw new Error('unreachable')
	}

	function scheduleStep(time: number) {
		if (!ctx || !master) return
		const { section, index, step } = locate(absoluteStep)
		for (const track of section.tracks) {
			const ev = track.events[step]
			if (!ev) continue
			const isDrum =
				track.voice === 'kick' ||
				track.voice === 'snare' ||
				track.voice === 'hat'
			const duration = isDrum
				? 0.1
				: stepSeconds() * (ev.length - 1 + track.gate)
			playVoice(ctx, master, track.voice, ev.note, time, duration, track.gain)
		}
		const event: StepEvent = {
			sectionId: section.id,
			sectionIndex: index,
			step,
			absoluteStep,
			time,
			delay: time - ctx.currentTime,
		}
		for (const cb of listeners) cb(event)
	}

	function tick() {
		if (!ctx) return
		const lookahead = 0.12
		while (nextStepTime < ctx.currentTime + lookahead) {
			scheduleStep(nextStepTime)
			nextStepTime += stepSeconds()
			absoluteStep++
		}
	}

	return {
		get playing() {
			return playing
		},
		start() {
			if (playing) return
			ctx = audioContext()
			if (ctx.state === 'suspended') ctx.resume()
			master = ctx.createGain()
			master.gain.value = options.volume ?? 0.5
			const comp = ctx.createDynamicsCompressor()
			master.connect(comp).connect(ctx.destination)
			absoluteStep = 0
			nextStepTime = ctx.currentTime + 0.05
			playing = true
			timer = setInterval(tick, 25)
			tick()
		},
		stop() {
			if (!playing) return
			playing = false
			if (timer) clearInterval(timer)
			timer = undefined
			if (master && ctx) {
				const m = master
				m.gain.setTargetAtTime(0, ctx.currentTime, 0.05)
				setTimeout(() => m.disconnect(), 400)
			}
			master = undefined
		},
		setSpeed(s) {
			speed = s
		},
		onStep(cb) {
			listeners.add(cb)
			return () => listeners.delete(cb)
		},
	}
}
