/**
 * The leek polka, from the sheet: F sharp minor, crotchet 150, written in
 * 4/4 so every bar is two polka bars. Root–fifth bass in crotchets with a
 * pair of quavers to close, chord stabs on the off-beats, and the tune in
 * quavers and semiquavers on top. Eight bars of accompaniment first, then
 * the A strain twice and the B strain once, looped.
 */
import type { Song } from '../shared/synth'

/** One 4/4 bar is sixteen semiquaver steps. */
const BAR = 16

/** Bass for one bar: root, fifth, root, then the fifth twice as quavers. */
const bass = (root: string, fifth: string) =>
	`${root} _ _ _ ${fifth} _ _ _ ${root} _ _ _ ${fifth} _ ${fifth} _`

/** Chord stabs on every off-beat quaver. */
const stabs = (note: string) =>
	`- - ${note} - - - ${note} - - - ${note} - - - ${note} -`

const FSM = { bass: bass('F#2', 'C#2'), low: 'A3', high: 'C#4' }
const A = { bass: bass('A2', 'E2'), low: 'C#4', high: 'E4' }
const CS = { bass: bass('C#2', 'G#2'), low: 'G#3', high: 'B#3' }

type Chord = typeof FSM

const accompaniment = (chords: Chord[]) => [
	{
		voice: 'bass' as const,
		pattern: chords.map((c) => c.bass).join(' '),
		gain: 0.3,
		gate: 0.55,
	},
	{
		voice: 'pluck' as const,
		pattern: chords.map((c) => stabs(c.low)).join(' '),
		gain: 0.11,
		gate: 0.35,
	},
	{
		voice: 'pluck' as const,
		pattern: chords.map((c) => stabs(c.high)).join(' '),
		gain: 0.09,
		gate: 0.35,
	},
	{ voice: 'kick' as const, pattern: 'x - - -', gain: 0.38 },
	{ voice: 'snare' as const, pattern: '- - x -', gain: 0.13 },
	{ voice: 'hat' as const, pattern: '- x', gain: 0.035 },
]

const melody = (bars: string[]) => ({
	voice: 'sawtooth' as const,
	pattern: bars.join(' '),
	gain: 0.055,
	gate: 0.85,
})

/** The A strain: the tune everyone hums, ending on the pickup back in. */
const A_STRAIN = [
	'C#4 _ E4 _ F#4 _ _ G#4 A4 A4 G#4 F#4 F#4 G#4 A4 _',
	'G#4 _ E4 _ F#4 _ G#4 _ A4 _ G#4 F#4 G#4 _ A4 _',
	'C#4 _ E4 _ F#4 _ _ G#4 A4 A4 G#4 F#4 F#4 G#4 A4 _',
	'C#5 C#5 C#5 B4 A4 A4 A4 G#4 F#4 _ A4 _ G#4 F#4 G#4 A4',
	'C#5 _ C#5 B4 A4 _ G#4 F#4 G#4 _ A4 _ B4 _ _ _',
	'C#5 C#5 C#5 B4 A4 A4 A4 G#4 F#4 _ A4 _ G#4 F#4 G#4 A4',
	'C#5 _ C#5 B4 A4 _ G#4 F#4 F#4 _ E4 _ F#4 _ _ _',
	'F#4 _ _ _ - - - - - - - - - - C#4 E4',
]

/** The B strain: up on the A chord, then back down home. */
const B_STRAIN = [
	'E4 _ F#4 _ G#4 _ E4 E4 F#4 G#4 A4 A4 G#4 _ F#4 _',
	'G#4 _ E4 _ F#4 _ G#4 _ A4 _ G#4 F#4 G#4 _ A4 _',
	'C#5 C#5 C#5 B4 A4 A4 A4 G#4 F#4 G#4 A4 _ G#4 F#4 E4 _',
	'F#4 _ F#4 G#4 A4 _ G#4 F#4 G#4 _ E4 _ C#4 _ _ _',
	'E4 _ F#4 _ G#4 _ E4 E4 F#4 G#4 A4 A4 G#4 _ F#4 _',
	'G#4 _ E4 _ F#4 _ G#4 _ A4 _ G#4 F#4 G#4 _ A4 _',
	'C#5 C#5 C#5 B4 A4 A4 A4 G#4 F#4 G#4 A4 _ G#4 F#4 E4 _',
	'F#4 _ _ _ - - - - - - - - - - C#4 E4',
]

const A_CHORDS = [FSM, FSM, FSM, FSM, FSM, FSM, CS, FSM]
const B_CHORDS = [A, A, FSM, FSM, A, A, CS, FSM]

export const LEEK_SONG: Song = {
	bpm: 150,
	stepsPerBeat: 4,
	sections: [
		{
			id: 'intro',
			steps: BAR * 4,
			tracks: accompaniment([FSM, FSM, FSM, FSM]),
		},
		{
			id: 'a',
			steps: BAR * 8,
			tracks: [melody(A_STRAIN), ...accompaniment(A_CHORDS)],
		},
		{
			id: 'a2',
			steps: BAR * 8,
			tracks: [melody(A_STRAIN), ...accompaniment(A_CHORDS)],
		},
		{
			id: 'b',
			steps: BAR * 8,
			tracks: [melody(B_STRAIN), ...accompaniment(B_CHORDS)],
		},
	],
}
