import type { Track, Voice } from './synth'
import type { Tune } from './tunes'

/**
 * Lollapascoopza's songs: five a band could play on a festival stage, punk,
 * hip hop, metal, EDM and jazz, one for each game, in turn (see
 * `minigames/lollapascoopza`), each at its own tempo, with its own count-in. Each one's lead riff is the minigame's notes, every
 * note an arrow to press in time (see `minigames/lollapascoopza`): pressed,
 * it's played, so the riff is only as good as whoever's playing it. Under
 * it the band, drums, bass and chords (a rhythm guitar, a rock band's;
 * synths, or vibes), carry on whatever.
 *
 * Each is sixteen bars, round and round, a verse then a chorus, written at
 * the game's own tempo, 128 BPM, for the menus to play (see `TUNES`); the
 * minigame plays them itself, faster and faster. Its riff moves in eighths
 * at the most, never closer, so it can be played, fast.
 */

/** Bars, a line each, as one pattern. */
const bars = (...lines: string[]) => lines.join(' ')

const NOTE_INDEX: Record<string, number> = {
	C: 0,
	D: 2,
	E: 4,
	F: 5,
	G: 7,
	A: 9,
	B: 11,
}
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/** A note's MIDI number: `A4` is 69. */
export function midiOf(note: string) {
	const [, name, accidental, octave] = /^([A-G])([#b]?)(-?\d)$/.exec(note) ?? []
	return (
		(Number(octave) + 1) * 12 +
		NOTE_INDEX[name] +
		(accidental === '#' ? 1 : accidental === 'b' ? -1 : 0)
	)
}
/** `note` moved `semitones` up (or down). */
const shift = (note: string, semitones: number) => {
	const midi = midiOf(note) + semitones
	return `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`
}
/** An octave up. */
const up = (note: string) => shift(note, 12)

/** A bar of something, from a chord's root: in the verse, or the chorus; and the chord, for what's in it. */
type BarOf = (root: string, chorus: boolean, chord: string) => string

/** A part of the band, over the chords: its voice, how loud, how much of each step it sounds, and a bar of it. */
interface Part {
	voice: Voice
	gain: number
	gate: number
	bar: BarOf
}

/** A note of the last big hit: its voice, its note, and how loud. */
interface Hit {
	voice: Voice
	note: string
	gain: number
}

/** One of the songs, ready to play. */
export interface RockSong {
	/** Its tune's id, in `TUNES`. */
	id: string
	name: string
	/** Its own tempo, in BPM, to begin with: the band speeds up from it (see `minigames/lollapascoopza`). */
	bpm: number
	/** Its lead riff: the notes. */
	lead: string
	/**
	 * Which arrow each note is, by its pitch: below the first, left; below
	 * the second, down; below the third, up; the rest, right. Low to high,
	 * as up a guitar's neck.
	 */
	lanes: [number, number, number]
	leadVoice: Voice
	leadGain: number
	/** The band, round and round under it; and its intro, two bars. */
	band: Track[]
	intro: Track[]
	/** The chord it ends on, for the last big hit: its root. */
	home: string
	/** The last big hit, once it's over: everything at once on its home chord. */
	finale: Hit[]
	/** It played as one of the game's tunes, at its tempo, the menus' beat under it. */
	tune: Tune
}

/** How long each song is before it goes round again, in steps: 16 bars of 16. */
export const LOOP_STEPS = 256
/** Its intro, before the riff comes in: two bars. */
export const INTRO_STEPS = 32

/**
 * A song from its chords (a bar each; `Am/D`, half a bar of each), the
 * root of each, and a bar of each part from a root.
 */
function song(spec: {
	id: string
	name: string
	bpm: number
	chords: string[]
	roots: Record<string, string>
	lead: string
	lanes: [number, number, number]
	leadVoice: Voice
	leadGain: number
	bass: BarOf
	rhythm: BarOf
	/** The chords' voice, if not a distorted guitar, how loud, and how much of each step; the bass's, if not a bass synth's. */
	chordVoice?: Voice
	chordGain?: number
	chordGate?: number
	bassVoice?: Voice
	bassGain?: number
	bassGate?: number
	/** More parts over the chords: vibes, a pad. */
	parts?: Part[]
	/** The drums; a ride cymbal too, a jazz drummer's; and how loud the kick and snare are, if not a rock drummer's. */
	drums: { kick: BarOf; snare: BarOf; hat: BarOf; ride?: BarOf }
	kickGain?: number
	snareGain?: number
	/** The snare's voice, if not a snare's: a clap. */
	snareVoice?: Voice
	/** What the last big hit is, if not the guitar and bass on its home chord. */
	finale?: (home: string) => Hit[]
	/** Its own intro, two bars, from its home chord's root, if not a rock band's count-in. */
	intro?: (home: string) => Track[]
	/** Whether the drummer fills, a roll on the snare, into the chorus and back round: a rock drummer does. */
	fills?: boolean
}): RockSong {
	const chordVoice = spec.chordVoice ?? 'guitar'
	const chordGain = spec.chordGain ?? 0.02
	const chordGate = spec.chordGate ?? 0.55
	const bassVoice = spec.bassVoice ?? 'bass'
	const bassGain = spec.bassGain ?? 0.11
	const bassGate = spec.bassGate ?? 0.7
	const kickGain = spec.kickGain ?? 0.28
	const snareVoice = spec.snareVoice ?? 'snare'
	const snareGain = spec.snareGain ?? 0.1
	/** A bar of `part` for each chord, split chords half of each. */
	const over = (part: BarOf) =>
		bars(
			...spec.chords.map((chord, i) => {
				const chorus = i >= 8
				const [a, b] = chord.split('/')
				if (!b) return part(spec.roots[a], chorus, a)
				const first = part(spec.roots[a], chorus, a).split(' ').slice(0, 8)
				const second = part(spec.roots[b], chorus, b).split(' ').slice(8)
				return [...first, ...second].join(' ')
			}),
		)
	const drum = (part: BarOf) => over((_, chorus) => part('', chorus, ''))
	// Into the chorus and back round: a fill, on the snare.
	const snare = drum(spec.drums.snare)
		.split(' ')
		.map((hit, i) => {
			const bar = Math.floor(i / 16)
			const at = i % 16
			if (spec.fills !== false && (bar === 7 || bar === 15) && at >= 10)
				return at % 2 === 0 || at >= 12 ? 'x' : '-'
			return hit
		})
		.join(' ')
	const crash = bars(
		...spec.chords.map((_, i) =>
			i === 0 || i === 8 || i === 12
				? 'x - - - - - - - - - - - - - - -'
				: '- - - - - - - - - - - - - - - -',
		),
	)
	const bass = over(spec.bass)
	const rhythm = over(spec.rhythm)
	const parts = (spec.parts ?? []).map((part) => ({
		voice: part.voice,
		pattern: over(part.bar),
		gain: part.gain,
		gate: part.gate,
	}))
	const ride = spec.drums.ride
		? [{ voice: 'ride' as Voice, pattern: drum(spec.drums.ride), gain: 0.03 }]
		: []
	const home = spec.roots[spec.chords[0].split('/')[0]]
	/** The chords' first note, chugged in the intro: the guitar's on the root itself. */
	const introChord =
		chordVoice === 'guitar'
			? home
			: (/[A-G][#b]?-?\d/.exec(
					spec.rhythm(home, true, spec.chords[0].split('/')[0]),
				)?.[0] ?? home)
	return {
		id: spec.id,
		name: spec.name,
		bpm: spec.bpm,
		lead: spec.lead,
		lanes: spec.lanes,
		leadVoice: spec.leadVoice,
		leadGain: spec.leadGain,
		home,
		finale: spec.finale?.(home) ?? [
			{ voice: 'guitar', note: home, gain: 0.03 },
			{ voice: 'bass', note: home, gain: 0.12 },
		],
		band: [
			{ voice: 'kick', pattern: drum(spec.drums.kick), gain: kickGain },
			{ voice: snareVoice, pattern: snare, gain: snareGain },
			{ voice: 'hat', pattern: drum(spec.drums.hat), gain: 0.03 },
			...ride,
			{ voice: 'crash', pattern: crash, gain: 0.05 },
			{ voice: bassVoice, pattern: bass, gain: bassGain, gate: bassGate },
			{ voice: chordVoice, pattern: rhythm, gain: chordGain, gate: chordGate },
			...parts,
		],
		// The drummer counting it in on the hats, then a roll up to the
		// riff, the band chugging on its first chord: or its own.
		intro: spec.intro?.(home) ?? [
			{
				voice: 'kick',
				pattern: bars(
					'x - - - x - - - x - - - x - - -',
					'x - - - x - - - x - x - x - x -',
				),
				gain: kickGain,
			},
			{
				voice: 'snare',
				pattern: bars(
					'- - - - - - - - - - - - - - - -',
					'x - - - x - x - x x x x x x x x',
				),
				gain: snareGain,
			},
			{
				voice: 'hat',
				pattern: bars(
					'x - - - x - - - x - - - x - - -',
					'- - - - - - - - - - - - - - - -',
				),
				gain: 0.05,
			},
			{
				voice: bassVoice,
				pattern: bars(
					Array(8).fill(`${home} -`).join(' '),
					Array(8).fill(`${home} -`).join(' '),
				),
				gain: bassGain,
				gate: bassGate,
			},
			{
				voice: chordVoice,
				pattern: bars(
					`${introChord} ${Array(15).fill('_').join(' ')}`,
					Array(16)
						.fill(0)
						.map((_, i) => (i < 8 ? (i % 2 ? '-' : introChord) : introChord))
						.join(' '),
				),
				gain: chordGain,
				gate: chordGate,
			},
		],
		tune: {
			bars: spec.chords.length,
			tracks: [
				{
					voice: bassVoice,
					pattern: bass,
					gain: bassGain * 0.9,
					gate: bassGate,
				},
				{
					voice: chordVoice,
					pattern: rhythm,
					gain: chordGain * 0.8,
					gate: chordGate,
				},
				...parts.map((part) => ({ ...part, gain: part.gain * 0.8 })),
				{ voice: 'crash', pattern: crash, gain: 0.04 },
				{
					voice: spec.leadVoice,
					pattern: spec.lead,
					gain: spec.leadGain * 0.8,
					gate: 0.9,
				},
				// An octave up, quieter, to sing over it.
				{
					voice: 'square',
					pattern: spec.lead.replace(/[A-G][#b]?\d/g, up),
					gain: 0.012,
					gate: 0.6,
				},
			],
		},
	}
}

/** A chord's third over its root, in semitones: minor (`m`), or major. */
const thirdOf = (chord: string) => (/^[A-G][#b]?m(?!aj)/.test(chord) ? 3 : 4)
/** Its seventh's: a major seventh's, a dominant or minor seventh's, or a sixth chord's sixth. */
const seventhOf = (chord: string) =>
	chord.includes('maj7') ? 11 : chord.endsWith('6') ? 9 : 10
/** A bar of nothing. */
const REST = '- - - - - - - - - - - - - - - -'

/**
 * Lollapascoopza Anthem: the festival's own, punk, in E, fast, at 172.
 * Power chords hammered in eighths, palm-muted in the verse and ringing
 * open an octave up in the chorus, the bass on the root with them; a rock
 * beat in the verse and the punk beat in the chorus, the kick on every
 * beat and the snare on every off-beat. The verse is sung up the chord and
 * down; the chorus shouts the festival's name, LOL-LA-PA-SCOOP-ZA, and
 * each half ends on a long note to hold.
 */
const ANTHEM = song({
	id: 'lollapascoopza',
	name: 'Lollapascoopza Anthem',
	bpm: 172,
	chords: [
		'E',
		'B',
		'C#m',
		'A',
		'E',
		'B',
		'C#m',
		'A/B',
		'A',
		'E',
		'B',
		'E',
		'A',
		'E',
		'B',
		'E',
	],
	roots: { E: 'E2', B: 'B1', 'C#m': 'C#2', A: 'A1' },
	lead: bars(
		'E4 _ _ _ E4 _ _ _ G#4 _ _ _ B4 _ _ _',
		'B4 _ _ _ A4 _ G#4 _ F#4 _ _ _ _ _ _ _',
		'C#5 _ _ _ C#5 _ _ _ B4 _ _ _ G#4 _ _ _',
		'A4 _ _ _ B4 _ _ _ C#5 _ _ _ B4 _ _ _',
		'E4 _ _ _ E4 _ _ _ G#4 _ _ _ B4 _ _ _',
		'D#5 _ _ _ C#5 _ B4 _ F#4 _ _ _ - - - -',
		'C#5 _ B4 _ C#5 _ _ _ E5 _ _ _ C#5 _ _ _',
		'B4 _ _ _ _ _ _ _ _ _ _ _ - - - -',
		'E5 _ _ _ E5 _ _ _ E5 _ C#5 _ E5 _ _ _',
		'B4 _ _ _ _ _ _ _ G#4 _ _ _ B4 _ _ _',
		'D#5 _ _ _ D#5 _ _ _ D#5 _ C#5 _ B4 _ _ _',
		'E5 _ _ _ _ _ _ _ - - - - - - - -',
		'E5 _ _ _ E5 _ _ _ E5 _ C#5 _ E5 _ _ _',
		'G#5 _ _ _ F#5 _ _ _ E5 _ _ _ B4 _ _ _',
		'C#5 _ _ _ D#5 _ _ _ F#5 _ _ _ D#5 _ _ _',
		'E5 _ _ _ _ _ _ _ _ _ _ _ - - - -',
	),
	lanes: [69, 73, 76],
	leadVoice: 'guitar',
	leadGain: 0.03,
	// The root in eighths, with the guitar.
	bass: (r) => Array(8).fill(`${r} -`).join(' '),
	// Downstrokes: chugged in the verse, open and an octave up in the chorus.
	rhythm: (r, chorus) =>
		chorus
			? Array(8)
					.fill(`${up(r)} _`)
					.join(' ')
			: Array(8).fill(`${r} -`).join(' '),
	drums: {
		kick: (_, chorus) =>
			chorus
				? 'x - - - x - - - x - - - x - - -'
				: 'x - - - - - - - x - x - - - - -',
		snare: (_, chorus) =>
			chorus
				? '- - x - - - x - - - x - - - x -'
				: '- - - - x - - - - - - - x - - -',
		hat: (_, chorus) => (chorus ? REST : 'x - x - x - x - x - x - x - x -'),
		// The chorus on the crash-ride, washing.
		ride: (_, chorus) => (chorus ? 'x - x - x - x - x - x - x - x -' : REST),
	},
})

/**
 * Bus Stop Bounce: sunny, bouncy hip hop in F major, at 100. A horn
 * section blowing the riff, call and response, its long notes held; funky
 * guitar chopping the chords in sixteenths; a bass line popping up the
 * octave and back; a bouncing kick, a clap on two and four with a snare
 * under it, busy hats, an open hat on the off-beats in the chorus and the
 * horns stabbing there; a record crackling faintly under it all. No fills:
 * the beat just rides.
 */
const HIP_HOP = song({
	id: 'lollapascoopza:hiphop',
	name: 'Bus Stop Bounce',
	bpm: 100,
	chords: [
		'F',
		'Bb',
		'Gm7',
		'C7',
		'F',
		'Bb',
		'Gm7',
		'C7',
		'F',
		'Bb',
		'Gm7',
		'C7',
		'F',
		'Bb',
		'Gm7',
		'C7',
	],
	roots: { F: 'F2', Bb: 'A#1', Gm7: 'G1', C7: 'C2' },
	lead: bars(
		'A4 _ C5 _ - - C5 _ D5 _ C5 _ A4 _ _ _',
		'Bb4 _ D5 _ F5 _ _ _ D5 _ F5 _ G5 _ _ _',
		'F5 _ _ D5 _ _ Bb4 _ - - G4 _ Bb4 _ D5 _',
		'C5 _ _ _ _ _ _ _ E5 _ G5 _ Bb5 _ _ _',
		'A5 _ G5 _ F5 _ - - C5 _ F5 _ A5 _ _ _',
		'G5 _ F5 _ D5 _ - - Bb4 _ D5 _ F5 _ _ _',
		'G5 _ _ F5 _ _ D5 _ G5 _ _ F5 _ _ D5 _',
		'E5 _ _ _ _ _ _ _ _ _ _ _ - - - -',
		'F5 _ F5 _ A5 _ _ _ G5 _ F5 _ D5 _ C5 _',
		'D5 _ _ _ F5 _ _ _ - - D5 _ F5 _ G5 _',
		'Bb5 _ _ _ A5 _ G5 _ F5 _ _ _ D5 _ _ _',
		'E5 _ G5 _ C6 _ _ _ _ _ _ _ - - - -',
		'F5 _ F5 _ A5 _ _ _ G5 _ F5 _ D5 _ C5 _',
		'D5 _ _ _ F5 _ _ _ - - G5 _ A5 _ Bb5 _',
		'A5 _ G5 _ F5 _ D5 _ G5 _ _ _ A5 _ _ _',
		'G5 _ _ _ E5 _ _ _ F5 _ _ _ _ _ _ _',
	),
	lanes: [72, 77, 81],
	leadVoice: 'brass',
	leadGain: 0.05,
	// Popping up the octave and back; busier in the chorus, up to the
	// fifth and the seventh.
	bass: (r, chorus) => {
		const o = up(r)
		return chorus
			? `${r} - ${r} ${o} - ${r} - ${shift(r, 7)} ${r} - ${r} ${o} - ${shift(r, 10)} - -`
			: `${r} - - ${o} - - ${r} - ${r} - - ${o} - ${r} - -`
	},
	bassGain: 0.1,
	bassGate: 0.55,
	// The guitar, chopping the chord's third in sixteenths, the chicken
	// scratch; on the beat more in the chorus.
	rhythm: (r, chorus, chord) => {
		const n = shift(r, 24 + thirdOf(chord))
		return chorus
			? `${n} - ${n} - - ${n} - ${n} - ${n} - - ${n} - ${n} -`
			: `- - ${n} - - ${n} - ${n} - - ${n} - - ${n} - ${n}`
	},
	chordVoice: 'pluck',
	chordGain: 0.045,
	chordGate: 0.35,
	parts: [
		// The guitar's fifth, with its third.
		{
			voice: 'pluck',
			gain: 0.035,
			gate: 0.35,
			bar: (r, chorus) => {
				const n = shift(r, 31)
				return chorus
					? `${n} - ${n} - - ${n} - ${n} - ${n} - - ${n} - ${n} -`
					: `- - ${n} - - ${n} - ${n} - - ${n} - - ${n} - ${n}`
			},
		},
		// The horns stabbing in the chorus: the chord's third and fifth.
		...[thirdOf, () => 7].map(
			(by): Part => ({
				voice: 'brass',
				gain: 0.022,
				gate: 0.8,
				bar: (r, chorus, chord) => {
					const n = shift(r, 24 + by(chord))
					return chorus ? `- - - - - - ${n} _ - - - - ${n} _ - -` : REST
				},
			}),
		),
		// A snare under the clap, for its crack.
		{
			voice: 'snare',
			gain: 0.05,
			gate: 1,
			bar: () => '- - - - x - - - - - - - x - - -',
		},
		// The open hat on the off-beats, in the chorus.
		{
			voice: 'openHat',
			gain: 0.025,
			gate: 1,
			bar: (_, chorus) => (chorus ? '- - x - - - x - - - x - - - x -' : REST),
		},
		// The record, crackling faintly.
		{
			voice: 'vinyl',
			gain: 0.008,
			gate: 1,
			bar: () => 'x x x x x x x x x x x x x x x x',
		},
	],
	drums: {
		kick: (_, chorus) =>
			chorus
				? 'x - - x - - x - - - x - - x - -'
				: 'x - - - - - x - - - x - - - - -',
		snare: () => '- - - - x - - - - - - - x - - -',
		hat: (_, chorus) =>
			chorus
				? 'x x x x x x x x x x x x x x x x'
				: 'x - x x x - x - x - x x x - x -',
	},
	snareVoice: 'clap',
	kickGain: 0.32,
	snareGain: 0.11,
	fills: false,
	// The horns announcing it, the hats ticking and a clap; then the beat
	// and the bass come in, the horns blowing it in.
	intro: (home) => {
		const horn = (by: number) => {
			const n = shift(home, 24 + by)
			return bars(
				`${n} _ - - - - ${n} _ - - - - - - - -`,
				`${n} _ - - ${n} _ - - ${n} _ - - ${n} _ _ _`,
			)
		}
		return [
			...[4, 7].map((by) => ({
				voice: 'brass' as Voice,
				pattern: horn(by),
				gain: 0.03,
				gate: 0.8,
			})),
			{
				voice: 'hat',
				pattern: bars(
					'x - x - x - x - x - x - x - x -',
					'x - x x x - x x x - x x x x x x',
				),
				gain: 0.03,
			},
			{
				voice: 'kick',
				pattern: bars(REST, 'x - - - - - x - - - x - - - - -'),
				gain: 0.32,
			},
			{
				voice: 'clap',
				pattern: bars(
					'- - - - - - - - - - - - x - - -',
					'- - - - x - - - - - - - x - x x',
				),
				gain: 0.11,
			},
			{
				voice: 'bass',
				pattern: bars(
					REST,
					`${home} - - ${up(home)} - - ${home} - ${home} - - ${up(home)} - ${home} - -`,
				),
				gain: 0.1,
				gate: 0.55,
			},
			{
				voice: 'vinyl',
				pattern: Array(32).fill('x').join(' '),
				gain: 0.008,
			},
		]
	},
	finale: (home) => [
		{ voice: 'brass', note: shift(home, 24), gain: 0.04 },
		{ voice: 'brass', note: shift(home, 28), gain: 0.035 },
		{ voice: 'brass', note: shift(home, 31), gain: 0.035 },
		{ voice: 'bass', note: home, gain: 0.1 },
		{ voice: 'clap', note: 'C4', gain: 0.11 },
	],
})

/**
 * Fika Metal: heavy metal in D minor, galloping, fast, at 156. The bass
 * and guitar gallop together, the kick drum's double in the chorus, and
 * the riff climbs to a scream at the top, each half let ring at its end.
 */
const METAL = song({
	id: 'lollapascoopza:metal',
	name: 'Fika Metal',
	bpm: 156,
	chords: [
		'Dm',
		'Bb',
		'C',
		'Dm',
		'Dm',
		'Bb',
		'A',
		'A',
		'Gm',
		'Bb',
		'Dm',
		'C',
		'Bb',
		'C',
		'A',
		'Dm',
	],
	roots: { Dm: 'D2', Bb: 'A#1', C: 'C2', A: 'A1', Gm: 'G1' },
	lead: bars(
		'D4 _ _ _ D4 _ F4 _ A4 _ _ _ D5 _ _ _',
		'C5 _ _ _ Bb4 _ A4 _ F4 _ _ _ _ _ _ _',
		'E4 _ _ _ G4 _ C5 _ E5 _ _ _ D5 _ C5 _',
		'D5 _ _ _ A4 _ F4 _ D4 _ _ _ _ _ _ _',
		'D4 _ D4 _ F4 _ D4 _ G4 _ D4 _ A4 _ _ _',
		'Bb4 _ _ _ A4 _ G4 _ F4 _ _ _ D4 _ _ _',
		'C#5 _ _ _ E5 _ _ _ A5 _ _ _ G5 _ E5 _',
		'C#5 _ _ _ A4 _ _ _ E4 _ _ _ _ _ _ _',
		'G5 _ _ _ F5 _ D5 _ Bb4 _ _ _ D5 _ _ _',
		'F5 _ _ _ D5 _ Bb4 _ F4 _ _ _ Bb4 _ _ _',
		'A5 _ _ _ F5 _ D5 _ A4 _ _ _ D5 _ F5 _',
		'G5 _ _ _ E5 _ C5 _ G4 _ _ _ _ _ _ _',
		'F5 _ _ _ F5 _ G5 _ F5 _ _ _ D5 _ _ _',
		'E5 _ _ _ E5 _ F5 _ G5 _ _ _ E5 _ _ _',
		'A5 _ _ _ G5 _ F5 _ E5 _ _ _ C#5 _ _ _',
		'D5 _ _ _ A4 _ _ _ D4 _ _ _ _ _ _ _',
	),
	lanes: [65, 70, 76],
	leadVoice: 'guitar',
	leadGain: 0.03,
	// The gallop: an eighth and two sixteenths, over and over.
	bass: (r) => Array(4).fill(`${r} - ${r} ${r}`).join(' '),
	rhythm: (r, chorus) => {
		const g = up(r)
		return chorus
			? `${g} _ _ _ ${g} _ _ _ ${g} _ ${g} _ ${g} _ _ _`
			: Array(4).fill(`${g} - ${g} ${g}`).join(' ')
	},
	drums: {
		kick: (_, chorus) =>
			chorus
				? 'x x x x x x x x x x x x x x x x'
				: 'x - x - x - x - x - x - x - x -',
		snare: () => '- - - - x - - - - - - - x - - -',
		hat: () => 'x - x - x - x - x - x - x - x -',
	},
	// The guitar and bass galloping on its home chord, the kick under them,
	// then a roll in.
	intro: (home) => {
		const gallop = Array(8).fill(`${home} - ${home} ${home}`).join(' ')
		return [
			{
				voice: 'guitar',
				pattern: Array(8)
					.fill(`${up(home)} - ${up(home)} ${up(home)}`)
					.join(' '),
				gain: 0.02,
				gate: 0.55,
			},
			{ voice: 'bass', pattern: gallop, gain: 0.11, gate: 0.7 },
			{
				voice: 'kick',
				pattern: bars(
					'x - x - x - x - x - x - x - x -',
					'x x x x x x x x x x x x x x x x',
				),
				gain: 0.28,
			},
			{
				voice: 'snare',
				pattern: bars(REST, '- - - - - - - - x x x x x x x x'),
				gain: 0.1,
			},
			{
				voice: 'crash',
				pattern: bars(`x ${Array(15).fill('-').join(' ')}`, REST),
				gain: 0.05,
			},
		]
	},
})

/**
 * Night Bus Rave: EDM in A minor, four to the floor at 128. Off-beat bass
 * and hats, supersaw chords stabbing through the verse, a snare roll up
 * into the drop, and in it the chords held wide and the hook in eighths,
 * jumping up the octave; long notes to ride out each phrase.
 */
const EDM = song({
	id: 'lollapascoopza:edm',
	name: 'Night Bus Rave',
	bpm: 128,
	chords: [
		'Am',
		'F',
		'C',
		'G',
		'Am',
		'F',
		'C',
		'G',
		'Am',
		'F',
		'C',
		'G',
		'Am',
		'F',
		'C',
		'G',
	],
	roots: { Am: 'A1', F: 'F1', C: 'C2', G: 'G1' },
	lead: bars(
		'A4 _ _ _ C5 _ E5 _ A5 _ _ _ G5 _ E5 _',
		'F5 _ _ _ E5 _ C5 _ A4 _ _ _ _ _ _ _',
		'G4 _ _ _ C5 _ E5 _ G5 _ _ _ E5 _ C5 _',
		'D5 _ _ _ B4 _ G4 _ B4 _ _ _ _ _ _ _',
		'A4 _ C5 _ E5 _ C5 _ A5 _ _ _ E5 _ _ _',
		'F5 _ _ _ A5 _ F5 _ C5 _ _ _ A4 _ _ _',
		'G4 _ _ _ C5 _ _ _ E5 _ _ _ G5 _ _ _',
		'B5 _ _ _ G5 _ _ _ D5 _ _ _ _ _ _ _',
		'E5 _ E5 _ A5 _ E5 _ C6 _ _ _ B5 _ A5 _',
		'A5 _ _ _ F5 _ _ _ C5 _ F5 _ A5 _ _ _',
		'G5 _ G5 _ C6 _ G5 _ E5 _ _ _ D5 _ C5 _',
		'D5 _ _ _ G5 _ _ _ B5 _ _ _ _ _ _ _',
		'E5 _ E5 _ A5 _ E5 _ C6 _ _ _ B5 _ A5 _',
		'A5 _ _ _ C6 _ _ _ A5 _ F5 _ C5 _ _ _',
		'E5 _ G5 _ C6 _ _ _ B5 _ _ _ G5 _ _ _',
		'A5 _ _ _ E5 _ _ _ A4 _ _ _ _ _ _ _',
	),
	lanes: [72, 77, 81],
	leadVoice: 'supersaw',
	leadGain: 0.045,
	// On the off-beats; rolling, in the drop.
	bass: (r, chorus) => {
		const b = up(r)
		return chorus
			? Array(4).fill(`- ${b} ${b} ${b}`).join(' ')
			: Array(4).fill(`- - ${b} -`).join(' ')
	},
	bassGate: 0.6,
	bassGain: 0.1,
	// Stabs, three and three and two, in the verse; held, in the drop.
	rhythm: (r, chorus) => {
		const g = shift(r, 24)
		return chorus
			? `${g} _ _ _ _ _ _ _ ${g} _ _ _ _ _ _ _`
			: `${g} - - ${g} - - ${g} - - ${g} - - ${g} - ${g} -`
	},
	chordVoice: 'supersaw',
	chordGain: 0.02,
	chordGate: 0.5,
	parts: [
		{
			voice: 'supersaw',
			gain: 0.016,
			gate: 0.5,
			bar: (r, chorus, chord) => {
				const g = shift(r, 24 + thirdOf(chord))
				return chorus
					? `${g} _ _ _ _ _ _ _ ${g} _ _ _ _ _ _ _`
					: `${g} - - ${g} - - ${g} - - ${g} - - ${g} - ${g} -`
			},
		},
	],
	drums: {
		kick: () => 'x - - - x - - - x - - - x - - -',
		snare: () => '- - - - x - - - - - - - x - - -',
		hat: (_, chorus) =>
			chorus
				? 'x x x x x x x x x x x x x x x x'
				: '- - x - - - x - - - x - - - x -',
	},
	kickGain: 0.32,
	snareGain: 0.09,
	// The build: the stabs and the kick, the hats and snare speeding up,
	// the kick dropping out for the last two beats before it all comes in.
	intro: (home) => {
		const g = shift(home, 24)
		const stabs = `${g} - - ${g} - - ${g} - - ${g} - - ${g} - ${g} -`
		return [
			{ voice: 'supersaw', pattern: bars(stabs, stabs), gain: 0.02, gate: 0.5 },
			{
				voice: 'kick',
				pattern: bars(
					'x - - - x - - - x - - - x - - -',
					'x - - - x - - - - - - - - - - -',
				),
				gain: 0.32,
			},
			{
				voice: 'snare',
				pattern: bars(
					'x - - - x - - - x - - - x - x -',
					'x - x - x - x - x x x x x x x x',
				),
				gain: 0.08,
			},
			{
				voice: 'hat',
				pattern: bars(
					'- - x - - - x - - - x - - - x -',
					'x x x x x x x x x x x x x x x x',
				),
				gain: 0.03,
			},
		]
	},
	finale: (home) => [
		{ voice: 'supersaw', note: shift(home, 24), gain: 0.04 },
		{ voice: 'supersaw', note: shift(home, 27), gain: 0.03 },
		{ voice: 'bass', note: up(home), gain: 0.12 },
	],
})

/**
 * Cool Scoop Swing: jazz in F, swung, at a brisk 140. A walking bass, the
 * ride's "ding, ding-a ding", brushes on the snare, vibes comping the
 * chords (their thirds and sevenths), and the riff on a saxophone, a bebop
 * line round the changes, each half held out at the end. No rock fills.
 */
const JAZZ = song({
	id: 'lollapascoopza:jazz',
	name: 'Cool Scoop Swing',
	bpm: 140,
	chords: [
		'F6',
		'D7',
		'Gm7',
		'C7',
		'F6',
		'D7',
		'Gm7/C7',
		'F6',
		'Bb7',
		'Bb7',
		'F6',
		'D7',
		'Gm7',
		'C7',
		'F6/D7',
		'Gm7/C7',
	],
	roots: { F6: 'F2', D7: 'D2', Gm7: 'G2', C7: 'C2', Bb7: 'A#1' },
	lead: bars(
		'A4 _ _ _ C5 _ D5 _ F5 _ _ _ D5 _ _ _',
		'F#4 _ _ _ A4 _ C5 _ D5 _ _ _ _ _ _ _',
		'G4 _ _ _ Bb4 _ D5 _ F5 _ _ _ E5 _ D5 _',
		'C5 _ _ _ Bb4 _ G4 _ E4 _ _ _ - - - -',
		'F4 _ _ _ A4 _ C5 _ D5 _ C5 _ A4 _ _ _',
		'D5 _ _ _ C5 _ A4 _ F#4 _ _ _ A4 _ _ _',
		'Bb4 _ _ _ D5 _ _ _ E5 _ _ _ G5 _ _ _',
		'F5 _ _ _ D5 _ C5 _ A4 _ _ _ _ _ _ _',
		'D5 _ _ _ F5 _ G#5 _ F5 _ _ _ D5 _ _ _',
		'C5 _ _ _ D5 _ F5 _ G#5 _ _ _ - - - -',
		'A5 _ _ _ F5 _ D5 _ C5 _ _ _ A4 _ _ _',
		'F#5 _ _ _ D5 _ C5 _ A4 _ _ _ _ _ _ _',
		'G5 _ _ _ F5 _ D5 _ Bb4 _ _ _ D5 _ _ _',
		'E5 _ _ _ G5 _ _ _ Bb5 _ _ _ G5 _ E5 _',
		'F5 _ _ _ A5 _ _ _ F#5 _ _ _ D5 _ _ _',
		'G5 _ _ _ D5 _ _ _ E5 _ _ _ _ _ _ _',
	),
	lanes: [67, 72, 77],
	leadVoice: 'sax',
	leadGain: 0.05,
	// Walking: a note a beat, up the chord.
	bass: (r, _, chord) =>
		[0, thirdOf(chord), 7, 9].map((by) => `${shift(r, by)} - - -`).join(' '),
	bassVoice: 'sub',
	bassGain: 0.17,
	bassGate: 0.85,
	// The vibes: its third and seventh, on one and the and of two, the
	// Charleston, in the verse; pushed, off the beat, in the chorus.
	rhythm: (r, chorus, chord) => {
		const n = shift(r, 24 + thirdOf(chord))
		return chorus
			? `- - - - - - ${n} - - - - - - - ${n} -`
			: `${n} - - - - - ${n} - - - - - - - - -`
	},
	chordVoice: 'bell',
	chordGain: 0.03,
	chordGate: 0.9,
	parts: [
		{
			voice: 'bell',
			gain: 0.026,
			gate: 0.9,
			bar: (r, chorus, chord) => {
				const n = shift(r, 24 + seventhOf(chord))
				return chorus
					? `- - - - - - ${n} - - - - - - - ${n} -`
					: `${n} - - - - - ${n} - - - - - - - - -`
			},
		},
	],
	drums: {
		kick: () => 'x - - - - - - - x - - - - - - -',
		snare: (_, chorus) =>
			chorus
				? '- - - - - - - x - - - - - - x -'
				: '- - - - - - - - - - - - - - - -',
		hat: () => '- - - - x - - - - - - - x - - -',
		ride: () => 'x - - - x - - x x - - - x - - x',
	},
	kickGain: 0.12,
	snareGain: 0.05,
	fills: false,
	// The bass walking up to it on its own, the ride and hats with it, and
	// two cracks on the snare to bring the band in.
	intro: (home) => [
		{
			voice: 'sub',
			pattern: bars(
				[0, 2, 4, 5].map((by) => `${shift(home, by)} - - -`).join(' '),
				[7, 4, 2, -1].map((by) => `${shift(home, by)} - - -`).join(' '),
			),
			gain: 0.17,
			gate: 0.85,
		},
		{
			voice: 'ride',
			pattern: bars(
				'x - - - x - - x x - - - x - - x',
				'x - - - x - - x x - - - x - - x',
			),
			gain: 0.03,
		},
		{
			voice: 'hat',
			pattern: bars(
				'- - - - x - - - - - - - x - - -',
				'- - - - x - - - - - - - x - - -',
			),
			gain: 0.03,
		},
		{
			voice: 'snare',
			pattern: bars(REST, '- - - - - - - - - - - - x - x -'),
			gain: 0.06,
		},
	],
	finale: (home) => [
		{ voice: 'sax', note: shift(home, 36), gain: 0.05 },
		{ voice: 'bell', note: shift(home, 24), gain: 0.03 },
		{ voice: 'bell', note: shift(home, 28), gain: 0.03 },
		{ voice: 'bell', note: shift(home, 33), gain: 0.03 },
		{ voice: 'sub', note: home, gain: 0.17 },
	],
})

/** Every song, played in turn. Only ever changed in place or added to on the end: a game's song is sent to phones by its place. */
export const SONGS: RockSong[] = [ANTHEM, HIP_HOP, METAL, EDM, JAZZ]
