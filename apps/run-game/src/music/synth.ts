/**
 * The music's instruments, and its patterns: a tiny Web Audio synth, the same
 * as the website's sandbox pages have (see `sandbox/shared/synth.ts`), so
 * the game's music is made on the spot rather than shipped as files.
 *
 * A track is a voice and a pattern, one token per step:
 *
 *   `C4`  play the note    `-`  rest    `_`  hold the note before
 *   `x`   hit (for drums)
 */

export type Voice =
	| 'square'
	| 'triangle'
	| 'sawtooth'
	| 'sine'
	/** A sine with vibrato and a soft start: a whistle, or pan pipes. */
	| 'whistle'
	/** Bright, and dying away fast: a banjo, a lute. */
	| 'pluck'
	/** Two detuned saws through a filter that snaps shut. */
	| 'bass'
	/** A soft, round sine bass. */
	| 'sub'
	/** Struck, and ringing on: a bell, or a drip. */
	| 'bell'
	| 'kick'
	| 'snare'
	| 'hat'

export interface Track {
	voice: Voice
	pattern: string
	/** How loud, about 0.05 for a tune to 0.3 for a kick. */
	gain?: number
	/** How much of a step a note sounds for, before any `_` holds it on. */
	gate?: number
}

/** A pattern read, ready to play: per step, a note to start and how many steps it's held, or nothing. */
export interface Parsed {
	voice: Voice
	gain: number
	gate: number
	events: ({ note: string; length: number } | null)[]
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

export function noteToFrequency(note: string) {
	const match = /^([A-G])([#b]?)(-?\d)$/.exec(note)
	if (!match) throw new Error(`Bad note ${note}`)
	const semitone =
		NOTE_INDEX[match[1]] + (match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0)
	const midi = (Number(match[3]) + 1) * 12 + semitone
	return 440 * 2 ** ((midi - 69) / 12)
}

/** A track's pattern, `steps` long: shorter patterns go round again to fill it. */
export function parse(track: Track, steps: number): Parsed {
	const tokens = track.pattern.trim().split(/\s+/)
	const events: Parsed['events'] = []
	for (let i = 0; i < steps; i++) {
		const token = tokens[i % tokens.length]
		if (token === '-' || token === '_') {
			events.push(null)
			continue
		}
		let length = 1
		for (let j = i + 1; j < steps && tokens[j % tokens.length] === '_'; j++)
			length++
		events.push({ note: token, length })
	}
	return {
		voice: track.voice,
		gain: track.gain ?? 0.2,
		gate: track.gate ?? 0.85,
		events,
	}
}

export const isDrum = (voice: Voice) =>
	voice === 'kick' || voice === 'snare' || voice === 'hat'

let noiseBuffer: AudioBuffer | undefined
function noise(ctx: AudioContext) {
	if (!noiseBuffer) {
		noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
		const data = noiseBuffer.getChannelData(0)
		for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
	}
	return noiseBuffer
}

/** One note (or hit) on `voice`, at `time`, into `out`. */
export function playVoice(
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
			osc.frequency.setValueAtTime(150, time)
			osc.frequency.exponentialRampToValueAtTime(45, time + 0.12)
			env.gain.setValueAtTime(gain, time)
			env.gain.exponentialRampToValueAtTime(0.001, time + 0.22)
			osc.connect(env)
			osc.start(time)
			osc.stop(time + 0.25)
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
			env.gain.exponentialRampToValueAtTime(0.001, time + 0.14)
			src.connect(filter).connect(env)
			src.start(time)
			src.stop(time + 0.16)
			return
		}
		case 'hat': {
			const src = ctx.createBufferSource()
			src.buffer = noise(ctx)
			const filter = ctx.createBiquadFilter()
			filter.type = 'highpass'
			filter.frequency.value = 7000
			env.gain.setValueAtTime(gain, time)
			env.gain.exponentialRampToValueAtTime(0.001, time + 0.04)
			src.connect(filter).connect(env)
			src.start(time)
			src.stop(time + 0.05)
			return
		}
		case 'pluck': {
			const osc = ctx.createOscillator()
			osc.type = 'sawtooth'
			osc.frequency.value = noteToFrequency(note)
			const filter = ctx.createBiquadFilter()
			filter.type = 'lowpass'
			filter.frequency.setValueAtTime(3600, time)
			filter.frequency.exponentialRampToValueAtTime(500, time + 0.15)
			const ring = Math.max(0.15, duration)
			env.gain.setValueAtTime(gain, time)
			env.gain.exponentialRampToValueAtTime(0.001, time + ring)
			osc.connect(filter).connect(env)
			osc.start(time)
			osc.stop(time + ring + 0.05)
			return
		}
		case 'whistle': {
			const osc = ctx.createOscillator()
			osc.type = 'sine'
			osc.frequency.value = noteToFrequency(note)
			const lfo = ctx.createOscillator()
			lfo.frequency.value = 6
			const depth = ctx.createGain()
			depth.gain.value = osc.frequency.value * 0.012
			lfo.connect(depth).connect(osc.frequency)
			env.gain.setValueAtTime(0.0001, time)
			env.gain.exponentialRampToValueAtTime(gain, time + 0.03)
			env.gain.setValueAtTime(gain, time + Math.max(0.035, duration - 0.03))
			env.gain.exponentialRampToValueAtTime(0.001, time + duration)
			osc.connect(env)
			osc.start(time)
			lfo.start(time)
			osc.stop(time + duration + 0.02)
			lfo.stop(time + duration + 0.02)
			return
		}
		case 'bass': {
			const frequency = noteToFrequency(note)
			const filter = ctx.createBiquadFilter()
			filter.type = 'lowpass'
			filter.Q.value = 5
			filter.frequency.setValueAtTime(frequency * 7, time)
			filter.frequency.exponentialRampToValueAtTime(
				frequency * 1.5,
				time + 0.12,
			)
			env.gain.setValueAtTime(gain, time)
			env.gain.setValueAtTime(gain, time + Math.max(0.02, duration - 0.02))
			env.gain.exponentialRampToValueAtTime(0.001, time + duration)
			for (const detune of [-7, 7]) {
				const osc = ctx.createOscillator()
				osc.type = 'sawtooth'
				osc.frequency.value = frequency
				osc.detune.value = detune
				osc.connect(filter)
				osc.start(time)
				osc.stop(time + duration + 0.02)
			}
			filter.connect(env)
			return
		}
		case 'sub': {
			const osc = ctx.createOscillator()
			osc.type = 'sine'
			osc.frequency.value = noteToFrequency(note)
			env.gain.setValueAtTime(0.0001, time)
			env.gain.exponentialRampToValueAtTime(gain, time + 0.02)
			env.gain.setValueAtTime(gain, time + Math.max(0.03, duration - 0.05))
			env.gain.exponentialRampToValueAtTime(0.001, time + duration)
			osc.connect(env)
			osc.start(time)
			osc.stop(time + duration + 0.02)
			return
		}
		case 'bell': {
			// A sine and two quieter, out-of-tune overtones, dying away.
			const frequency = noteToFrequency(note)
			const ring = Math.max(0.9, duration)
			env.gain.setValueAtTime(gain, time)
			env.gain.exponentialRampToValueAtTime(0.001, time + ring)
			for (const [ratio, level] of [
				[1, 1],
				[2.76, 0.3],
				[5.4, 0.1],
			]) {
				const osc = ctx.createOscillator()
				osc.type = 'sine'
				osc.frequency.value = frequency * ratio
				const partial = ctx.createGain()
				partial.gain.value = level
				osc.connect(partial).connect(env)
				osc.start(time)
				osc.stop(time + ring + 0.05)
			}
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
