import { audioContext, wake } from './audio'
import { effectsOn } from './saved/settings'

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
	| 'scan'
	| 'cheer'
	| 'stumble'
	| 'squelch'
	| 'scooped'
	| 'fallen'
	| 'groan'
	| 'finished'
	| 'stomp'
	| 'whoosh'
	| 'woof'
	| 'bleat'
	| 'honk'
	| 'furby'
	| 'trick'
	| 'grind'
	/** Karolinska's: the shrink ray, a giant's sniff and sneeze, a Germ popping, and a heartbeat. */
	| 'zap'
	| 'sniff'
	| 'sneeze'
	| 'pop'
	| 'heartbeat'
	| 'heartbeatDub'

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
		/** A barcode scanned: the scanner's beep. */
		scan: { notes: [[1760, 0.16, 'square']], volume: 0.05 },
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
		/** Down a Gap: a long whistle, falling away. */
		fallen: { notes: [[1200, 0.9, 'triangle']], volume: 0.08, slide: 0.12 },
		/** Into a Zombie: a low moan. */
		groan: { notes: [[150, 0.5, 'sawtooth']], volume: 0.06, slide: 0.7 },
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
		/** Geese, run into and flying off. */
		honk: {
			notes: [
				[370, 0.08, 'sawtooth'],
				[300, 0.12, 'sawtooth'],
			],
			volume: 0.05,
			slide: 0.85,
		},
		woof: {
			notes: [
				[520, 0.05, 'square'],
				[330, 0.09, 'square'],
			],
			volume: 0.06,
			slide: 0.8,
		},
		/** A mountain goat, calling to be ridden: a wavering bleat. */
		bleat: {
			notes: [
				[620, 0.07, 'sawtooth'],
				[560, 0.07, 'sawtooth'],
				[640, 0.07, 'sawtooth'],
				[540, 0.12, 'sawtooth'],
			],
			volume: 0.045,
			slide: 0.9,
		},
		/** A trick landed: a bright run up, and a ding. */
		trick: {
			notes: [
				[659, 0.05, 'square'],
				[880, 0.05, 'square'],
				[1175, 0.05, 'square'],
				[1568, 0.16, 'triangle'],
			],
			volume: 0.07,
		},
		/** Down onto a rail: a metal scrape. */
		grind: {
			notes: [
				[1900, 0.04, 'sawtooth'],
				[1400, 0.22, 'sawtooth'],
			],
			volume: 0.025,
			slide: 0.92,
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
		/** The shrink ray going off: a rising warble, then a long falling zap. */
		zap: {
			notes: [
				[220, 0.12, 'square'],
				[330, 0.12, 'square'],
				[440, 0.12, 'square'],
				[1800, 0.9, 'sawtooth'],
			],
			volume: 0.05,
			slide: 0.2,
		},
		/** A giant breathing in: "Ah...", a long rising hiss. */
		sniff: { notes: [[180, 0.5, 'triangle']], volume: 0.1, slide: 2.4 },
		/** "CHOO!": a burst, falling away. */
		sneeze: {
			notes: [
				[900, 0.06, 'sawtooth'],
				[300, 0.5, 'sawtooth'],
			],
			volume: 0.08,
			slide: 0.3,
		},
		/** A Germ popped. */
		pop: { notes: [[520, 0.08, 'square']], volume: 0.08, slide: 2.5 },
		/** "Lub", and "dub": low thumps. */
		heartbeat: { notes: [[70, 0.16, 'sine']], volume: 0.32, slide: 0.6 },
		heartbeatDub: { notes: [[60, 0.12, 'sine']], volume: 0.24, slide: 0.6 },
	}

/** Told of every sound played, sound on or off: a Room's Host passes them on. */
let overheard: ((sound: Sound) => void) | undefined
export function overhear(listener: ((sound: Sound) => void) | undefined) {
	overheard = listener
}

export function play(sound: Sound) {
	overheard?.(sound)
	// Not while the tab's hidden: held, they'd all play at once on coming back.
	if (!effectsOn() || document.hidden) return
	try {
		const context = audioContext()
		wake(context)
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
