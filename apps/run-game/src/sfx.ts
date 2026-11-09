import { soundOn } from './settings'

/**
 * The game's sound effects: little chiptune blips, made on the spot with Web
 * Audio rather than loaded from files.
 */
export type Sound =
	| 'move'
	| 'select'
	| 'back'
	| 'count'
	| 'go'
	| 'jump'
	| 'fika'
	| 'cheer'
	| 'stumble'
	| 'squelch'
	| 'scooped'
	| 'finished'
	| 'stomp'
	| 'whoosh'
	| 'woof'
	| 'furby'

/** [frequency in Hz, length in seconds, wave] for each note, played one after another. */
type Note = [number, number, OscillatorType?]

const SOUNDS: Record<Sound, { notes: Note[]; volume: number; slide?: number }> =
	{
		move: { notes: [[660, 0.04, 'square']], volume: 0.05 },
		select: {
			notes: [
				[660, 0.05, 'square'],
				[990, 0.08, 'square'],
			],
			volume: 0.06,
		},
		back: {
			notes: [
				[660, 0.05, 'square'],
				[440, 0.08, 'square'],
			],
			volume: 0.06,
		},
		count: { notes: [[440, 0.15, 'square']], volume: 0.08 },
		go: { notes: [[880, 0.35, 'square']], volume: 0.08 },
		jump: { notes: [[300, 0.12, 'square']], volume: 0.05, slide: 2.2 },
		fika: {
			notes: [
				[784, 0.07, 'triangle'],
				[1047, 0.07, 'triangle'],
				[1319, 0.14, 'triangle'],
			],
			volume: 0.12,
		},
		cheer: {
			notes: [
				[523, 0.06, 'triangle'],
				[659, 0.1, 'triangle'],
			],
			volume: 0.1,
		},
		stumble: { notes: [[140, 0.18, 'sawtooth']], volume: 0.07, slide: 0.5 },
		squelch: { notes: [[110, 0.2, 'sine']], volume: 0.15, slide: 0.6 },
		scooped: { notes: [[700, 0.6, 'square']], volume: 0.07, slide: 0.15 },
		/** Bouncing off someone's head. */
		stomp: {
			notes: [
				[260, 0.05, 'square'],
				[520, 0.1, 'square'],
			],
			volume: 0.07,
			slide: 1.4,
		},
		/** Someone else scooped: quieter and shorter than when it's you. */
		whoosh: { notes: [[520, 0.25, 'square']], volume: 0.04, slide: 0.3 },
		/** A furby, landing on your head. */
		furby: {
			notes: [
				[1200, 0.05, 'triangle'],
				[1600, 0.05, 'triangle'],
				[900, 0.12, 'triangle'],
			],
			volume: 0.1,
		},
		/** A corgi, hopped on. */
		woof: {
			notes: [
				[520, 0.05, 'square'],
				[330, 0.09, 'square'],
			],
			volume: 0.06,
			slide: 0.8,
		},
		finished: {
			notes: [
				[523, 0.1, 'square'],
				[659, 0.1, 'square'],
				[784, 0.1, 'square'],
				[1047, 0.3, 'square'],
			],
			volume: 0.07,
		},
	}

let context: AudioContext | undefined

export function play(sound: Sound) {
	if (!soundOn()) return
	try {
		context ??= new AudioContext()
		if (context.state === 'suspended') void context.resume()
		const { notes, volume, slide } = SOUNDS[sound]
		let at = context.currentTime
		for (const [frequency, length, wave = 'square'] of notes) {
			const oscillator = context.createOscillator()
			const gain = context.createGain()
			oscillator.type = wave
			oscillator.frequency.setValueAtTime(frequency, at)
			if (slide)
				oscillator.frequency.exponentialRampToValueAtTime(
					frequency * slide,
					at + length,
				)
			gain.gain.setValueAtTime(volume, at)
			gain.gain.exponentialRampToValueAtTime(0.0001, at + length)
			oscillator.connect(gain).connect(context.destination)
			oscillator.start(at)
			oscillator.stop(at + length)
			at += length
		}
	} catch {
		// No Web Audio: the game's just quiet.
	}
}
