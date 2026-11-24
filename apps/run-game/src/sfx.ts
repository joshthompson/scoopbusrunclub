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
	| 'neigh'
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
	/** Halloween Town's haunted house: bats bursting out, its window smashing, and its monster. */
	| 'bats'
	| 'smash'
	| 'roar'
	/** Everest's Yeti, calling out to whoever's coming at him in his den. */
	| 'yeti'
	/** The Caves' mine people, hello from all of them: "Hej hej!" */
	| 'miners'
	/** The Caves' stalactites: cracking off the roof and whistling down, and smashing on the floor. */
	| 'stalactite'
	| 'rubble'
	/** Huddinge's harvester: its chainsaw through the trunk, through each log, and the tree hitting the ground. */
	| 'chainsaw'
	| 'logCut'
	| 'timber'
	/**
	 * Dino Island's volcano: going off, roaring on, a meteor falling out of
	 * the burning sky and coming down far off, a lava bomb hurled out of it,
	 * and its crater's lava spurting up before it blows.
	 */
	| 'eruption'
	| 'rumble'
	| 'meteor'
	| 'meteorHit'
	| 'lavaBomb'
	| 'blorp'
	/** Into water: wading into a River or a pond, diving into the sea, or falling in off a cliff. */
	| 'splash'
	/** Someone else, or something, into water: a pacer, the egg, the hatchling. Quieter. */
	| 'splashOther'
	/** A Crab Hat's claws snapping shut: a Pinch, in Mr Claws. */
	| 'pinch'
	/** Two Pinches meeting, claw on claw: a Clash, a hard clack. */
	| 'clash'

/**
 * [frequency in Hz, length in seconds, wave, how loud, out of the sound's
 * `volume`, how far it slides, if not the sound's `slide`, in a `chord`,
 * how long after the sound starts it does, and how long it takes to swell
 * up to full, in seconds] for each note, played one after another; or, in
 * a `chord`, all at once, unless held back.
 *
 * A `noise` note is a hiss, the NES's noise channel's: white noise, with
 * everything over its frequency muffled away. Sliding down, it's a boom
 * dying away, or a rush going by; a rumble, low. Full at once, it cracks
 * like a whip: swelled up, even a few hundredths of a second, it's a whoosh.
 */
type Wave = OscillatorType | 'noise'
export type Note = [number, number, Wave?, number?, number?, number?, number?]

/** A sound: its notes, how loud, how far each slides, and whether they're a chord. */
export type SoundNotes = {
	notes: Note[]
	volume: number
	slide?: number
	chord?: boolean
}

/** A splash's notes: see `splash`. */
export const SPLASH: Note[] = [
	[180, 0.18, 'sine', 0.65, 3, 0, 0.01],
	[1800, 0.5, 'noise', 0.85, 0.4, 0, 0.035],
	[8000, 0.8, 'noise', 0.5, 0.55, 0.03, 0.07],
	[900, 0.06, 'sine', 0.12, 2, 0.14, 0.005],
	[1300, 0.05, 'sine', 0.1, 1.8, 0.22, 0.005],
	[700, 0.07, 'sine', 0.06, 2.2, 0.31, 0.005],
]

const SOUNDS: Record<Sound, SoundNotes> = {
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
	/** A horse, calling to be ridden: a whinny, high and shaking, falling away. */
	neigh: {
		notes: [
			[880, 0.06, 'sawtooth'],
			[980, 0.06, 'sawtooth'],
			[860, 0.06, 'sawtooth'],
			[940, 0.06, 'sawtooth'],
			[760, 0.08, 'sawtooth'],
			[520, 0.14, 'sawtooth'],
		],
		volume: 0.04,
		slide: 0.85,
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
	/**
	 * "Lub", and "dub": big, deep thumps, a sub-bass boom under a punchier
	 * tone an octave up, which a laptop's speakers can play, and a knock
	 * on top to start each one off.
	 */
	heartbeat: {
		notes: [
			[52, 0.42, 'sine', 1],
			[104, 0.26, 'triangle', 0.55],
			[190, 0.06, 'sine', 0.35],
		],
		// All three at once peak at a little over 1: as loud as it gets.
		volume: 0.6,
		slide: 0.55,
		chord: true,
	},
	heartbeatDub: {
		notes: [
			[44, 0.32, 'sine', 1],
			[88, 0.2, 'triangle', 0.5],
			[160, 0.05, 'sine', 0.3],
		],
		volume: 0.5,
		slide: 0.55,
		chord: true,
	},
	/** Wings, flapping, a lot of them at once: a flutter, up high. */
	bats: {
		notes: [
			[1400, 0.03, 'square'],
			[1100, 0.03, 'square'],
			[1500, 0.03, 'square'],
			[1200, 0.03, 'square'],
			[1600, 0.03, 'square'],
			[1300, 0.05, 'square'],
		],
		volume: 0.04,
	},
	/** Glass, breaking: a crack, and the bits tinkling down. */
	smash: {
		notes: [
			[2200, 0.04, 'sawtooth'],
			[1800, 0.03, 'square'],
			[2600, 0.03, 'square'],
			[2000, 0.03, 'square'],
			[2900, 0.05, 'triangle'],
			[2400, 0.08, 'triangle'],
		],
		volume: 0.06,
	},
	/** The monster: a long, low roar, falling. */
	roar: { notes: [[110, 0.7, 'sawtooth']], volume: 0.1, slide: 0.5 },
	/** The Yeti: a friendly growl, hrr-roo-aarr, up and then falling away. */
	yeti: {
		notes: [
			[85, 0.12, 'sawtooth'],
			[130, 0.18, 'sawtooth'],
			[175, 0.45, 'sawtooth'],
		],
		volume: 0.09,
		slide: 0.6,
	},
	/** The mine people: "hej hej!", cheerful, two of them at once, near enough. */
	miners: {
		notes: [
			[392, 0.08, 'square'],
			[523, 0.13, 'square'],
			[392, 0.08, 'square'],
			[523, 0.18, 'square'],
		],
		volume: 0.05,
	},
	/** A crack, and a whistle falling as it drops: about as long as it takes to fall. */
	stalactite: {
		notes: [
			[1400, 0.03, 'square'],
			[700, 0.03, 'square'],
			[1900, 0.34, 'sine'],
		],
		volume: 0.07,
		slide: 0.4,
	},
	/** It hitting the floor: a crack of rock, and a dull crunch. */
	rubble: {
		notes: [
			[900, 0.03, 'square'],
			[180, 0.05, 'square'],
			[90, 0.3, 'sine'],
		],
		volume: 0.22,
		slide: 0.5,
	},
	/**
	 * A chainsaw biting into a trunk: its motor revving up, then a rough
	 * buzz, warbling as it cuts, for as long as it takes to saw through.
	 */
	chainsaw: {
		notes: [
			[90, 0.12, 'sawtooth'],
			[140, 0.08, 'sawtooth'],
			[165, 0.04, 'sawtooth'],
			[150, 0.04, 'sawtooth'],
			[165, 0.04, 'sawtooth'],
			[150, 0.04, 'sawtooth'],
			[165, 0.04, 'sawtooth'],
			[150, 0.04, 'sawtooth'],
			[165, 0.04, 'sawtooth'],
			[150, 0.04, 'sawtooth'],
			[165, 0.04, 'sawtooth'],
			[150, 0.04, 'sawtooth'],
		],
		volume: 0.035,
	},
	/** Its saw, through a log: a quick, rough buzz. */
	logCut: {
		notes: [
			[170, 0.035, 'sawtooth'],
			[155, 0.035, 'sawtooth'],
			[170, 0.035, 'sawtooth'],
			[155, 0.035, 'sawtooth'],
			[170, 0.035, 'sawtooth'],
			[155, 0.035, 'sawtooth'],
		],
		volume: 0.03,
	},
	/** A tree hitting the ground: a crack of branches, and a deep thud, dying away. */
	timber: {
		notes: [
			[1100, 0.03, 'square'],
			[600, 0.03, 'square'],
			[85, 0.55, 'sine'],
		],
		volume: 0.3,
		slide: 0.55,
	},
	/**
	 * The volcano blowing: a crack, a huge boom dying away a long while, and
	 * a deep shudder under it.
	 */
	eruption: {
		notes: [
			[3200, 2.4, 'noise', 1, 0.03],
			[64, 2, 'sine', 0.9, 0.45],
			[1400, 0.06, 'square', 0.25, 0.4],
		],
		volume: 0.3,
		chord: true,
	},
	/** It roaring on: a low rumble, rolling. */
	rumble: {
		notes: [
			[260, 1.6, 'noise', 1, 0.5],
			[46, 1.4, 'sine', 0.6, 0.8],
		],
		volume: 0.11,
		chord: true,
	},
	/** A meteor falling out of the sky: a long whistle down, and a rush of air. */
	meteor: {
		notes: [
			[1500, 2.2, 'sine', 0.5, 0.3],
			[5000, 2.2, 'noise', 0.7, 0.15],
		],
		volume: 0.05,
		chord: true,
	},
	/** It coming down, far off: a muffled boom. */
	meteorHit: {
		notes: [
			[700, 1.1, 'noise', 1, 0.12],
			[70, 0.9, 'sine', 0.8, 0.5],
		],
		volume: 0.16,
		chord: true,
	},
	/** A lava bomb, hurled out: a fwoomp. */
	lavaBomb: {
		notes: [
			[500, 0.3, 'noise', 1, 2.2],
			[150, 0.3, 'sine', 0.7, 0.4],
		],
		volume: 0.08,
		chord: true,
	},
	/** Lava spurting up in the crater: a thick blorp, and it spattering back. */
	blorp: {
		notes: [
			[150, 0.12, 'sine', 1, 2.4],
			[900, 0.18, 'noise', 0.5, 0.4],
		],
		volume: 0.12,
	},
	/**
	 * Into water: a bloop as they go under, rising, the way water does, in a
	 * sploosh, low and swelling up, not cracking (that's a whip); the spray
	 * over it, an airy hiss, bright and lingering, and a few bubbles coming
	 * up in it.
	 */
	splash: { notes: SPLASH, volume: 0.16, chord: true },
	/** Someone else's splash, or the egg's: the same, but quieter, as for `whoosh`. */
	splashOther: { notes: SPLASH, volume: 0.08, chord: true },
	pinch: {
		notes: [
			[3000, 0.02, 'noise', 1],
			[1400, 0.04, 'square', 0.5],
		],
		volume: 0.07,
		slide: 0.6,
	},
	clash: {
		notes: [
			[6000, 0.05, 'noise', 1],
			[1900, 0.12, 'square', 0.6],
			[2533, 0.12, 'square', 0.45],
		],
		volume: 0.07,
		slide: 0.9,
		chord: true,
	},
}

/** A second of white noise, made once, looped for a `noise` note. */
let noiseBuffer: AudioBuffer | undefined
function noise(context: BaseAudioContext) {
	if (noiseBuffer?.sampleRate === context.sampleRate) return noiseBuffer
	noiseBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate)
	const data = noiseBuffer.getChannelData(0)
	for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
	return noiseBuffer
}

/**
 * `sound`'s notes, played into `destination` from now: the context's own
 * speakers, or, to listen to it offline, an `OfflineAudioContext`'s.
 */
export function voice(
	context: BaseAudioContext,
	destination: AudioNode,
	sound: Sound,
) {
	voiceNotes(context, destination, SOUNDS[sound])
}

/** `sound`'s notes, how loud and the rest, as `voice` plays them. */
export function notesOf(sound: Sound): SoundNotes {
	return SOUNDS[sound]
}

/**
 * Notes played as `voice` plays a sound's: for trying out a sound that isn't
 * one yet, as the dev pages' splash audition does.
 */
export function voiceNotes(
	context: BaseAudioContext,
	destination: AudioNode,
	{ notes, volume, slide: slides, chord }: SoundNotes,
) {
	let at = context.currentTime
	for (const [
		frequency,
		length,
		wave = 'square',
		loud = 1,
		slide = slides,
		after = 0,
		swell = 0,
	] of notes) {
		const start = chord ? at + after : at
		const gain = context.createGain()
		// A hiss, through a filter muffling all over `frequency`; or a tone.
		let source: AudioScheduledSourceNode
		let pitch: AudioParam
		if (wave === 'noise') {
			const hiss = context.createBufferSource()
			hiss.buffer = noise(context)
			hiss.loop = true
			const muffle = context.createBiquadFilter()
			muffle.type = 'lowpass'
			hiss.connect(muffle).connect(gain)
			// From anywhere in the noise: two from the same place at once, a
			// moment apart (a splash's slap and spray), ring like a comb.
			hiss.start(start, Math.random())
			source = hiss
			pitch = muffle.frequency
		} else {
			const oscillator = context.createOscillator()
			oscillator.type = wave
			oscillator.connect(gain)
			oscillator.start(start)
			source = oscillator
			pitch = oscillator.frequency
		}
		pitch.setValueAtTime(frequency, start)
		if (slide)
			pitch.exponentialRampToValueAtTime(frequency * slide, start + length)
		if (swell) {
			gain.gain.setValueAtTime(0, start)
			gain.gain.linearRampToValueAtTime(volume * loud, start + swell)
		} else gain.gain.setValueAtTime(volume * loud, start)
		gain.gain.exponentialRampToValueAtTime(0.0001, start + length)
		gain.connect(destination)
		source.stop(start + length)
		if (!chord) at += length
	}
}

/** Told of every sound played, sound on or off: a Room's Host passes them on. */
let overheard: ((sound: Sound) => void) | undefined
export function overhear(listener: ((sound: Sound) => void) | undefined) {
	overheard = listener
}

/** How many quiet goings-on are under way just now (see `hush`). */
let hushed = 0
/** `fn` done without a sound: a minigame's preview, its game played silently. */
export function hush<T>(fn: () => T): T {
	hushed++
	try {
		return fn()
	} finally {
		hushed--
	}
}

export function play(sound: Sound) {
	if (hushed) return
	overheard?.(sound)
	// Not while the tab's hidden: held, they'd all play at once on coming back.
	if (!effectsOn() || document.hidden) return
	try {
		const context = audioContext()
		wake(context)
		voice(context, context.destination, sound)
	} catch {
		// No Web Audio: the game's just quiet.
	}
}
