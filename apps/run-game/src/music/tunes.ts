import { SONGS } from './lollapascoopza'
import type { Track } from './synth'

/**
 * The music: one steady beat, always playing, and over it a tune for the
 * menus and one for each course, its own bass line and melody. They all go at
 * the beat's tempo, a bar of 16 steps at a time, so one tune can fade into
 * the next on any bar.
 *
 * Each track is a pattern of one token a step (see `synth.ts`): `C4` a note,
 * `-` a rest, `_` the note before held on. A tune's tracks are written a bar
 * to a line, 16 bars long, about half a minute, so it's a while before it
 * comes round again: its tune, the tune again with a new turn to it, a
 * middle bit on other chords, and the tune once more to bring it home. A
 * shorter pattern, a bell occasionally, goes round again to fill it. Change
 * a note, and that's the tune changed.
 */

export const BPM = 128
export const STEPS_PER_BEAT = 4
export const STEPS_PER_BAR = 16

export interface Tune {
	/** How long it is before it goes round again, in bars. */
	bars: number
	tracks: Track[]
	/**
	 * How loud the beat under it is, out of its usual: hardly there under a
	 * choir. Full, if not said.
	 */
	beat?: number
}

/** Bars, a line each, as one pattern. */
const bars = (...lines: string[]) => lines.join(' ')

/**
 * The beat under everything, the same whatever's on: a kick on every beat, a
 * snare on two and four, and a hat between.
 */
export const BEAT: Tune = {
	bars: 1,
	tracks: [
		{ voice: 'kick', pattern: 'x - - - x - - - x - - - x - - -', gain: 0.26 },
		{ voice: 'snare', pattern: '- - - - x - - - - - - - x - - -', gain: 0.07 },
		{ voice: 'hat', pattern: '- - x - - - x - - - x - - - x -', gain: 0.035 },
	],
}

/**
 * Dino Island's tune, in E minor, the same melody over the same chords in
 * three versions, one for each stretch of it (see `Course['tunes']`): a
 * jungle's, plucked over a bouncing bass, through the forest; a volcano's,
 * on a distorted guitar, from when it blows; and the sea's, whistled over
 * a soft bass, bubbles dripping, under it. So one fades into the next
 * mid-tune.
 */
const DINO_CHORDS = [
	'Em',
	'Em',
	'C',
	'D',
	'Em',
	'Em',
	'C',
	'B',
	'Am',
	'C',
	'G',
	'D',
	'Em',
	'Em',
	'C',
	'D',
] as const
/** Each chord's bar of bass: its root bouncing, its fifth, and up to its third. */
const DINO_BASS: Record<(typeof DINO_CHORDS)[number], string> = {
	Em: 'E2 - - E2 - - B1 - E2 - - E2 - - G2 -',
	C: 'C2 - - C2 - - G1 - C2 - - C2 - - E2 -',
	D: 'D2 - - D2 - - A1 - D2 - - D2 - - F#2 -',
	B: 'B1 - - B1 - - F#1 - B1 - - B1 - - D#2 -',
	Am: 'A1 - - A1 - - E2 - A1 - - A1 - - C2 -',
	G: 'G1 - - G1 - - D2 - G1 - - G1 - - B1 -',
}
const DINO_BASS_LINE = bars(...DINO_CHORDS.map((chord) => DINO_BASS[chord]))
const DINO_MELODY = bars(
	'E5 - G5 - B5 _ _ - A5 - G5 - E5 _ _ -',
	'D5 - E5 - G5 _ _ - E5 _ _ _ - - - -',
	'E5 - G5 - C6 _ _ - B5 - G5 - E5 _ _ -',
	'F#5 - A5 - D6 _ _ - C6 - A5 - F#5 _ _ -',
	'E5 - G5 - B5 _ _ - A5 - G5 - E5 _ _ -',
	'D5 - E5 - G5 _ _ - B5 _ _ _ - - - -',
	'C6 - B5 - G5 _ _ - E5 - G5 - C6 _ _ -',
	'B5 _ _ _ D#6 _ _ _ F#6 _ _ _ - - - -',
	'A5 _ _ - C6 _ _ - E6 _ _ _ D6 - C6 -',
	'G5 _ _ - C6 _ _ - E6 _ _ _ D6 - C6 -',
	'B5 _ _ - D6 _ _ - G6 _ _ _ F#6 - E6 -',
	'F#6 _ _ _ E6 _ _ _ D6 _ _ _ A5 _ _ -',
	'E5 - G5 - B5 _ _ - A5 - G5 - E5 _ _ -',
	'D5 - E5 - G5 _ _ - E5 _ _ _ - - - -',
	'E5 - G5 - C6 _ _ - B5 - G5 - E5 _ _ -',
	'F#5 - A5 - D6 _ _ - B5 _ _ _ E5 _ _ -',
)
/** The melody an octave down, for a guitar to chug. */
const DINO_LOW_MELODY = DINO_MELODY.replace(
	/([A-G]#?)(\d)/g,
	(_, note, octave) => `${note}${Number(octave) - 1}`,
)

const DINO_JUNGLE: Tune = {
	bars: 16,
	tracks: [
		{ voice: 'bass', pattern: DINO_BASS_LINE, gain: 0.12, gate: 0.5 },
		{ voice: 'pluck', pattern: DINO_MELODY, gain: 0.05, gate: 0.6 },
		{
			voice: 'bell',
			pattern: bars(
				'- - - - - - - - - - - - - - B5 -',
				'- - - - - - - - - - - - - - E6 -',
			),
			gain: 0.025,
		},
	],
}
const DINO_VOLCANO: Tune = {
	bars: 16,
	tracks: [
		{ voice: 'bass', pattern: DINO_BASS_LINE, gain: 0.14, gate: 0.4 },
		{ voice: 'guitar', pattern: DINO_LOW_MELODY, gain: 0.024, gate: 0.85 },
	],
}
const DINO_SEA: Tune = {
	bars: 16,
	beat: 0.4,
	tracks: [
		{ voice: 'sub', pattern: DINO_BASS_LINE, gain: 0.12, gate: 0.7 },
		{ voice: 'whistle', pattern: DINO_MELODY, gain: 0.035, gate: 0.9 },
		{
			voice: 'bell',
			pattern: bars(
				'- - - - - - B6 - - - - - - - E7 -',
				'- - - - - - - - - - G6 - - - - -',
			),
			gain: 0.02,
		},
	],
}

/**
 * Rocket Launch's tune, in D minor, the same melody over the same chords in
 * three versions, one for each stretch of it (see `Course['tunes']`): the
 * launch's, a plucked arpeggio over a driving bass, from the pad to the
 * blast-off; space's, floaty, a whistle over a soft bass, bells twinkling,
 * for the drift past the asteroids; and the alien base's, a guitar and
 * stabbing saws, for the boss. So one fades into the next mid-tune.
 */
const ROCKET_CHORD = {
	Dm: { low: 'D2', tones: ['D4', 'F4', 'A4'] },
	Bb: { low: 'Bb1', tones: ['Bb3', 'D4', 'F4'] },
	F: { low: 'F2', tones: ['F3', 'A3', 'C4'] },
	C: { low: 'C2', tones: ['G3', 'C4', 'E4'] },
	Gm: { low: 'G1', tones: ['G3', 'Bb3', 'D4'] },
	A: { low: 'A1', tones: ['A3', 'C#4', 'E4'] },
} as const
type RocketChord = keyof typeof ROCKET_CHORD

/** Its 16 bars' chords: the tune twice, a middle bit on G minor and A, and the tune again. */
const ROCKET_CHORDS: RocketChord[] = [
	...(['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'F', 'C'] as const),
	...(['Gm', 'Bb', 'F', 'A', 'Dm', 'Bb', 'F', 'C'] as const),
]

/** A pattern, a bar of it from each chord. */
const rocketBars = (
	bar: (chord: (typeof ROCKET_CHORD)[RocketChord]) => string,
) => bars(...ROCKET_CHORDS.map((name) => bar(ROCKET_CHORD[name])))

/** A note an octave up, or down. */
const octave = (note: string, by: number) =>
	note.replace(/\d$/, (o) => String(Number(o) + by))

/** The bass driving: its root on the beat, the octave on the off-beats. */
const ROCKET_BASS = rocketBars(({ low }) => {
	const high = octave(low, 1)
	return `${low} - ${low} ${high} ${low} - ${low} ${high} ${low} - ${low} ${high} ${low} ${high} ${low} -`
})
/** A soft held bass, for out in space. */
const ROCKET_SUB = rocketBars(
	({ low }) => `${low} _ _ _ _ _ _ _ ${octave(low, 1)} _ _ _ _ _ _ _`,
)
/** An arpeggio running up each chord and back, a note a step. */
const ROCKET_ARP = rocketBars(({ tones }) => {
	const [a, b, c] = tones.map((n) => octave(n, 1))
	const d = octave(a, 1)
	return [a, b, c, d, c, b, a, b, a, b, c, d, c, b, c, b].join(' ')
})
/** The same, a note every other step, to twinkle. */
const ROCKET_TWINKLE = rocketBars(({ tones }) => {
	const [a, b, c] = tones.map((n) => octave(n, 2))
	return `${a} - ${b} - ${c} - ${octave(a, 1)} - ${c} - ${b} - ${a} - ${b} -`
})
/** Stabbing chords, on the off-beats. */
const ROCKET_STAB = (which: number) =>
	rocketBars(
		({ tones }) =>
			`- - ${tones[which]} - - - ${tones[which]} - - - ${tones[which]} - - ${tones[which]} - -`,
	)

const ROCKET_MELODY = bars(
	'A5 - D6 - F6 _ _ - E6 - D6 - A5 _ _ -',
	'Bb5 - D6 - F6 _ _ - D6 - Bb5 - F5 _ _ -',
	'A5 - C6 - F6 _ _ - E6 - C6 - A5 _ _ -',
	'G5 - C6 - E6 _ _ - D6 - C6 - G5 _ _ _',
	'A5 - D6 - F6 _ _ - E6 - D6 - F6 _ A6 -',
	'Bb5 - D6 - F6 _ _ - A6 - F6 - D6 _ Bb5 -',
	'A5 - C6 - F6 _ _ - G6 - A6 _ C7 _ _ -',
	'G6 _ _ _ E6 _ _ _ D6 - C6 - G5 _ _ _',
	'G5 _ _ - Bb5 _ _ - D6 _ _ _ C6 - Bb5 -',
	'Bb5 _ _ - D6 _ _ - F6 _ _ _ E6 - D6 -',
	'C6 _ _ - F6 _ _ - A6 _ _ _ G6 - F6 -',
	'E6 _ _ - A6 _ _ - C#7 _ _ _ - - - -',
	'A5 - D6 - F6 _ _ - E6 - D6 - A5 _ _ -',
	'Bb5 - D6 - F6 _ _ - D6 - Bb5 - F5 _ _ -',
	'A5 - C6 - F6 _ _ - E6 - C6 - A5 _ _ -',
	'G5 - C6 - E6 _ _ - G6 - E6 - C6 _ D6 -',
)
/** The melody two octaves down, for a guitar to chug. */
const ROCKET_LOW_MELODY = ROCKET_MELODY.replace(
	/([A-G][#b]?)(\d)/g,
	(_, note, o) => `${note}${Number(o) - 2}`,
)

const ROCKET_LAUNCH: Tune = {
	bars: 16,
	tracks: [
		{ voice: 'bass', pattern: ROCKET_BASS, gain: 0.12, gate: 0.45 },
		{ voice: 'pluck', pattern: ROCKET_ARP, gain: 0.026, gate: 0.5 },
		{ voice: 'square', pattern: ROCKET_MELODY, gain: 0.034, gate: 0.7 },
		{
			voice: 'bell',
			pattern: bars(
				'- - - - - - - - - - - - - - A6 -',
				'- - - - - - - - - - - - - - D7 -',
			),
			gain: 0.02,
		},
	],
}
const ROCKET_SPACE: Tune = {
	bars: 16,
	beat: 0.5,
	tracks: [
		{ voice: 'sub', pattern: ROCKET_SUB, gain: 0.12, gate: 0.9 },
		{ voice: 'bell', pattern: ROCKET_TWINKLE, gain: 0.022 },
		{ voice: 'whistle', pattern: ROCKET_MELODY, gain: 0.035, gate: 0.9 },
	],
}
const ROCKET_BOSS: Tune = {
	bars: 16,
	tracks: [
		{ voice: 'bass', pattern: ROCKET_BASS, gain: 0.14, gate: 0.35 },
		{ voice: 'guitar', pattern: ROCKET_LOW_MELODY, gain: 0.024, gate: 0.85 },
		...[0, 1, 2].map(
			(which): Track => ({
				voice: 'supersaw',
				pattern: ROCKET_STAB(which),
				gain: 0.016,
				gate: 0.4,
			}),
		),
		{ voice: 'supersaw', pattern: ROCKET_MELODY, gain: 0.03, gate: 0.8 },
	],
}

/** The menus': bright, in C, round and round while you pick. */
const MENU: Tune = {
	bars: 16,
	tracks: [
		{
			voice: 'bass',
			pattern: bars(
				'C2 - C3 - C2 - C3 - C2 - C3 - C2 - C3 -',
				'A1 - A2 - A1 - A2 - A1 - A2 - A1 - A2 -',
				'F1 - F2 - F1 - F2 - F1 - F2 - F1 - F2 -',
				'G1 - G2 - G1 - G2 - G1 - G2 - G1 - G2 -',
				'C2 - C3 - C2 - C3 - C2 - C3 - C2 - C3 -',
				'A1 - A2 - A1 - A2 - A1 - A2 - A1 - A2 -',
				'F1 - F2 - F1 - F2 - F1 - F2 - F1 - F2 -',
				'G1 - G2 - G1 - G2 - G1 - G2 - G1 - G2 -',
				'F1 - F2 - F1 - F2 - F1 - F2 - F1 - F2 -',
				'G1 - G2 - G1 - G2 - G1 - G2 - G1 - G2 -',
				'E1 - E2 - E1 - E2 - E1 - E2 - E1 - E2 -',
				'A1 - A2 - A1 - A2 - A1 - A2 - A1 - A2 -',
				'C2 - C3 - C2 - C3 - C2 - C3 - C2 - C3 -',
				'A1 - A2 - A1 - A2 - A1 - A2 - A1 - A2 -',
				'F1 - F2 - F1 - F2 - F1 - F2 - F1 - F2 -',
				'G1 - G2 - G1 - G2 - G1 - G2 - A1 - B1 -',
			),
			gain: 0.12,
			gate: 0.5,
		},
		{
			voice: 'square',
			pattern: bars(
				'E5 - G5 - C6 _ _ - G5 - E5 - G5 _ _ -',
				'A5 - G5 - E5 _ _ - C5 - E5 - A4 _ _ -',
				'F5 - A5 - C6 _ _ - A5 - F5 - A5 _ _ -',
				'G5 - F5 - D5 _ _ - B4 - D5 - G5 _ _ _',
				'E5 - G5 - C6 _ _ - D6 - E6 - D6 _ C6 -',
				'A5 - C6 - E6 _ _ - C6 - A5 - E5 _ _ -',
				'F5 - A5 - C6 _ _ - D6 - C6 - A5 _ F5 -',
				'G5 - A5 - B5 _ _ - D6 - B5 - G5 _ _ _',
				'A5 _ _ - G5 - F5 - C5 - F5 - A5 _ _ -',
				'B5 _ _ - A5 - G5 - D5 - G5 - B5 _ _ -',
				'G5 _ _ - E5 - B4 - E5 - G5 - B5 _ _ -',
				'C6 _ _ - B5 - A5 - E5 - A5 - C6 _ B5 -',
				'E5 - G5 - C6 _ _ - G5 - E5 - G5 _ _ -',
				'A5 - G5 - E5 _ _ - C5 - E5 - A4 _ _ -',
				'F5 - A5 - C6 _ _ - D6 - C6 - A5 _ _ -',
				'G5 - F5 - D5 - B4 - G4 - B4 - D5 _ F5 -',
			),
			gain: 0.045,
			gate: 0.6,
		},
	],
}

/** Midnattsloppet's chords, a bar each, or two in a bar: each its bass note and the three notes of it. */
const MIDNATT_CHORD = {
	Am: { root: 'A', low: 'A1', tones: ['A3', 'C4', 'E4'] },
	F: { root: 'F', low: 'F1', tones: ['F3', 'A3', 'C4'] },
	C: { root: 'C', low: 'C2', tones: ['G3', 'C4', 'E4'] },
	G: { root: 'G', low: 'G1', tones: ['G3', 'B3', 'D4'] },
	Em: { root: 'E', low: 'E1', tones: ['G3', 'B3', 'E4'] },
	E: { root: 'E', low: 'E1', tones: ['G#3', 'B3', 'E4'] },
} as const
type MidnattChord = keyof typeof MIDNATT_CHORD

/**
 * Its 16 bars' chords, each for how many steps: the tune twice, then off
 * to F and G and E minor, and the tune once more, turning on E at the end
 * to bring it back round to A minor.
 */
const MIDNATT_BARS: [MidnattChord, number][][] = [
	...(['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G'] as const).map(
		(chord): [MidnattChord, number][] => [[chord, 16]],
	),
	...(['F', 'G', 'Em', 'Am', 'Am', 'F', 'C'] as const).map(
		(chord): [MidnattChord, number][] => [[chord, 16]],
	),
	[
		['G', 8],
		['E', 8],
	],
]

/**
 * A pattern over its chords: `beat` gives each beat's four steps, from its
 * chord and where in the bar it is.
 */
const overChords = (
	beat: (chord: (typeof MIDNATT_CHORD)[MidnattChord], step: number) => string,
) =>
	MIDNATT_BARS.map((bar) =>
		bar
			.flatMap(([chord, steps]) =>
				Array.from({ length: steps / 4 }, (_, i) =>
					beat(MIDNATT_CHORD[chord], i * 4),
				),
			)
			.join(' '),
	).join(' ')

/** Each chord held, the `which` note of it, for as long as it lasts. */
const heldChord = (which: number) =>
	overChords((chord, step) =>
		step === 0 ? `${chord.tones[which]} _ _ _` : '_ _ _ _',
	)

/** A note an octave up. */
const up = (note: string) => note.replace(/\d$/, (o) => String(Number(o) + 1))

/**
 * The tune, the same in every version: up through A minor and down again,
 * twice, the second time higher; up to the top over F and G; and home.
 */
const MIDNATT_MELODY = bars(
	'A4 _ _ - C5 - E5 _ _ - D5 - C5 _ B4 -',
	'C5 _ _ - A4 - F4 _ _ _ - - A4 - C5 -',
	'E5 _ _ - G5 - E5 _ _ - D5 - C5 _ D5 -',
	'D5 _ _ _ B4 _ _ - G4 _ _ - - - - -',
	'A4 _ _ - C5 - E5 _ _ - A5 - G5 _ E5 -',
	'F5 _ _ - E5 - C5 _ _ - A4 - C5 _ F5 -',
	'G5 _ _ - E5 - C5 _ _ - E5 - G5 _ A5 -',
	'B5 _ _ _ A5 _ G5 _ D5 _ _ _ - - - -',
	'A5 _ _ _ _ _ G5 - F5 _ _ - E5 - F5 -',
	'G5 _ _ _ _ _ F5 - D5 _ _ - B4 - D5 -',
	'E5 _ _ _ G5 _ _ - B5 _ _ - G5 - E5 -',
	'A5 _ _ _ _ _ _ _ E5 _ _ - C5 - E5 -',
	'A4 _ _ - C5 - E5 _ _ - D5 - C5 _ B4 -',
	'C5 _ _ - A4 - F4 _ _ _ - - A4 - C5 -',
	'E5 _ _ - G5 - C6 _ _ - B5 - G5 _ E5 -',
	'D5 _ _ - B4 - G4 _ G#4 _ _ _ B4 _ _ -',
)

/**
 * The DJ's, in the streets: a bass pumping on the off-beats, supersaw
 * chords stabbing, a plucked arpeggio running up them, and the tune on top.
 */
const MIDNATT_EDM: Tune = {
	bars: 16,
	tracks: [
		{
			voice: 'bass',
			pattern: overChords((chord) => `- - ${chord.root}2 -`),
			gain: 0.13,
			gate: 0.6,
		},
		...[0, 1, 2].map(
			(which): Track => ({
				voice: 'supersaw',
				pattern: overChords((chord, step) =>
					step % 8 === 0
						? `${chord.tones[which]} - - ${chord.tones[which]}`
						: `- - ${chord.tones[which]} -`,
				),
				gain: 0.022,
				gate: 0.45,
			}),
		),
		{
			voice: 'pluck',
			pattern: overChords((chord, step) => {
				const [a, b, c] = chord.tones.map(up)
				return step % 8 === 0 ? `${a} ${b} ${c} ${b}` : `${c} ${b} ${a} ${b}`
			}),
			gain: 0.03,
			gate: 0.5,
		},
		{ voice: 'supersaw', pattern: MIDNATT_MELODY, gain: 0.045, gate: 0.8 },
	],
}

/**
 * The rock band's, at the docks: power chords chugging on the guitar, the
 * bass with it, the snare cracking harder, and the tune on lead guitar.
 */
const MIDNATT_ROCK: Tune = {
	bars: 16,
	tracks: [
		{
			voice: 'bass',
			pattern: overChords((chord) => `${chord.low} - ${chord.low} -`),
			gain: 0.1,
			gate: 0.8,
		},
		{
			voice: 'guitar',
			pattern: overChords((chord) => {
				const note = up(chord.low)
				return `${note} ${note} - ${note}`
			}),
			gain: 0.032,
			gate: 0.7,
		},
		{ voice: 'snare', pattern: '- - - - x - - - - - - - x - - x', gain: 0.07 },
		{ voice: 'hat', pattern: 'x - x - x - x - x - x - x - x -', gain: 0.03 },
		{ voice: 'guitar', pattern: MIDNATT_MELODY, gain: 0.022, gate: 0.9 },
	],
}

/**
 * The choir's, up at Sofiakyrkan: the beat all but gone, the chords sung
 * and held, a deep bass under them, a bell occasionally, and the tune sung
 * over it all.
 */
const MIDNATT_CHOIR: Tune = {
	bars: 16,
	beat: 0.12,
	tracks: [
		{
			voice: 'sub',
			pattern: overChords((chord, step) =>
				step === 0 ? `${chord.low.replace(/1$/, '2')} _ _ _` : '_ _ _ _',
			),
			gain: 0.09,
			gate: 0.95,
		},
		...[0, 1, 2].map(
			(which): Track => ({
				voice: 'choir',
				pattern: heldChord(which),
				gain: 0.03,
				gate: 0.95,
			}),
		),
		{
			voice: 'bell',
			pattern: bars(
				'A5 - - - - - - - - - - - - - - -',
				'- - - - - - - - - - - - - - - -',
			),
			gain: 0.03,
		},
		{ voice: 'choir', pattern: MIDNATT_MELODY, gain: 0.045, gate: 0.95 },
	],
}

/** Each course's, by its id. */
export const TUNES: Record<string, Tune> = {
	menu: MENU,

	// A sunny Saturday morning: G major, skipping along, and off to C and B
	// minor in the middle.
	haga: {
		bars: 16,
		tracks: [
			{
				voice: 'bass',
				pattern: bars(
					'G1 - - G1 - - G2 - G1 - - G1 - - D2 -',
					'D2 - - D2 - - D3 - D2 - - D2 - - A1 -',
					'E2 - - E2 - - E3 - E2 - - E2 - - B1 -',
					'C2 - - C2 - - C3 - D2 - - D2 - - D3 -',
					'G1 - - G1 - - G2 - G1 - - G1 - - D2 -',
					'D2 - - D2 - - D3 - D2 - - D2 - - A1 -',
					'E2 - - E2 - - E3 - E2 - - E2 - - B1 -',
					'C2 - - C2 - - D2 - G1 - - G1 - - G2 -',
					'C2 - - C2 - - C3 - C2 - - C2 - - G1 -',
					'D2 - - D2 - - D3 - D2 - - D2 - - A1 -',
					'B1 - - B1 - - B2 - B1 - - B1 - - F#1 -',
					'A1 - - A1 - - A2 - D2 - - D2 - - D3 -',
					'G1 - - G1 - - G2 - G1 - - G1 - - D2 -',
					'D2 - - D2 - - D3 - D2 - - D2 - - A1 -',
					'E2 - - E2 - - E3 - E2 - - E2 - - B1 -',
					'C2 - - C2 - - C3 - D2 - - D2 - - D3 -',
				),
				gain: 0.12,
				gate: 0.5,
			},
			{
				voice: 'square',
				pattern: bars(
					'B4 - D5 - G5 - D5 - B4 - D5 - G5 _ A5 -',
					'F#5 _ E5 - D5 - A4 - D5 - E5 - F#5 _ _ -',
					'G5 - E5 - B4 - E5 - G5 - B5 - A5 _ G5 -',
					'E5 - G5 - E5 - C5 - D5 _ _ - - - - -',
					'B4 - D5 - G5 - B5 - D6 - B5 - G5 _ A5 -',
					'F#5 _ A5 - D6 - A5 - F#5 - E5 - D5 _ _ -',
					'G5 - B5 - E6 - B5 - G5 - E5 - G5 _ A5 -',
					'E5 - C5 - E5 - F#5 - G5 _ _ - - - - -',
					'E5 _ _ - G5 - C6 _ _ - B5 - A5 - G5 -',
					'F#5 _ _ - A5 - D6 _ _ - C6 - B5 - A5 -',
					'B5 _ _ - F#5 - D5 _ _ - F#5 - B5 - D6 -',
					'C6 _ _ - B5 - A5 - E5 - F#5 _ A5 - - -',
					'B4 - D5 - G5 - D5 - B4 - D5 - G5 _ A5 -',
					'F#5 _ E5 - D5 - A4 - D5 - E5 - F#5 _ _ -',
					'G5 - E5 - B4 - E5 - G5 - B5 - D6 _ C6 -',
					'B5 - A5 - G5 - E5 - D5 _ _ - F#5 - A5 -',
				),
				gain: 0.045,
				gate: 0.6,
			},
		],
	},

	// Through the woods: D dorian, a folky pluck, out into F and A minor in
	// the middle.
	huddinge: {
		bars: 16,
		tracks: [
			{
				voice: 'sub',
				pattern: bars(
					'D2 _ _ - D2 - A2 - D2 _ _ - D2 - C2 -',
					'C2 _ _ - C2 - G2 - C2 _ _ - C2 - E2 -',
					'D2 _ _ - D2 - A2 - D2 _ _ - D2 - C2 -',
					'G1 _ _ - G1 - D2 - G1 _ _ - B1 - C2 -',
					'D2 _ _ - D2 - A2 - D2 _ _ - D2 - C2 -',
					'C2 _ _ - C2 - G2 - C2 _ _ - C2 - E2 -',
					'D2 _ _ - D2 - A2 - D2 _ _ - D2 - C2 -',
					'G1 _ _ - G1 - D2 - G1 _ _ - B1 - C2 -',
					'F2 _ _ - F2 - C3 - F2 _ _ - F2 - E2 -',
					'C2 _ _ - C2 - G2 - C2 _ _ - C2 - B1 -',
					'G1 _ _ - G1 - D2 - G1 _ _ - G1 - B1 -',
					'A1 _ _ - A1 - E2 - A1 _ _ - C2 - E2 -',
					'D2 _ _ - D2 - A2 - D2 _ _ - D2 - C2 -',
					'C2 _ _ - C2 - G2 - C2 _ _ - C2 - E2 -',
					'D2 _ _ - D2 - A2 - D2 _ _ - D2 - C2 -',
					'G1 _ _ - G1 - D2 - G1 _ _ - B1 - C2 -',
				),
				gain: 0.2,
			},
			{
				voice: 'pluck',
				pattern: bars(
					'D5 - F5 - A5 - G5 - F5 - E5 - D5 - - -',
					'E5 - G5 - C6 - B5 - G5 - E5 - C5 - - -',
					'F5 - A5 - D6 - C6 - A5 - G5 - F5 - E5 -',
					'D5 - B4 - G4 - B4 - D5 _ _ - E5 _ _ -',
					'A5 - F5 - D5 - F5 - A5 - C6 - D6 - - -',
					'C6 - G5 - E5 - G5 - C6 - E6 - D6 - C6 -',
					'D6 - C6 - A5 - F5 - D5 - F5 - A5 - G5 -',
					'D5 - G5 - B5 - A5 - G5 _ _ - B4 _ C5 _',
					'C6 - A5 - F5 - A5 - C6 - D6 - C6 - A5 -',
					'G5 - E5 - C5 - E5 - G5 - A5 - G5 - E5 -',
					'D5 - G5 - B5 - D6 - B5 - G5 - D5 - B4 -',
					'C5 - E5 - A5 - C6 - B5 - A5 - G5 - E5 -',
					'D5 - F5 - A5 - G5 - F5 - E5 - D5 - - -',
					'E5 - G5 - C6 - B5 - G5 - E5 - C5 - - -',
					'F5 - A5 - D6 - C6 - A5 - G5 - F5 - E5 -',
					'D5 - B4 - G4 - B4 - D5 _ _ - E5 _ _ -',
				),
				gain: 0.08,
			},
		],
	},

	// Round the track: E minor, driving, and a long-held middle over A minor.
	kristineberg: {
		bars: 16,
		tracks: [
			{
				voice: 'bass',
				pattern: bars(
					'E2 E2 E3 E2 E2 E2 E3 E2 E2 E2 E3 E2 E2 E2 E3 E2',
					'C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2',
					'D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2',
					'B1 B1 B2 B1 B1 B1 B2 B1 B1 B1 B2 B1 B1 B1 B2 B1',
					'E2 E2 E3 E2 E2 E2 E3 E2 E2 E2 E3 E2 E2 E2 E3 E2',
					'C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2',
					'D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2',
					'B1 B1 B2 B1 B1 B1 B2 B1 B1 B1 B2 B1 B1 B1 B2 B1',
					'A1 A1 A2 A1 A1 A1 A2 A1 A1 A1 A2 A1 A1 A1 A2 A1',
					'E2 E2 E3 E2 E2 E2 E3 E2 E2 E2 E3 E2 E2 E2 E3 E2',
					'C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2',
					'D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2',
					'E2 E2 E3 E2 E2 E2 E3 E2 E2 E2 E3 E2 E2 E2 E3 E2',
					'C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2 C2 C2 C3 C2',
					'D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2 D2 D2 D3 D2',
					'B1 B1 B2 B1 B1 B1 B2 B1 B1 B1 B2 B1 B1 B1 B2 B1',
				),
				gain: 0.1,
				gate: 0.45,
			},
			{
				voice: 'square',
				pattern: bars(
					'B4 - - B4 - - E5 - - - G5 - F#5 - E5 -',
					'C5 - - C5 - - E5 - - - G5 - A5 - G5 -',
					'D5 - - D5 - - F#5 - - - A5 - B5 - A5 -',
					'B5 _ _ - A5 - G5 - F#5 _ _ - D#5 _ _ -',
					'E5 - - E5 - - G5 - - - B5 - A5 - G5 -',
					'E5 - - E5 - - G5 - - - C6 - B5 - G5 -',
					'F#5 - - F#5 - - A5 - - - D6 - C6 - A5 -',
					'B5 _ _ - D#6 - F#6 - B5 _ _ - - - - -',
					'A5 _ _ _ _ _ C6 _ _ _ B5 _ A5 _ E5 _',
					'G5 _ _ _ _ _ B5 _ _ _ A5 _ G5 _ E5 _',
					'E5 _ _ _ _ _ G5 _ _ _ C6 _ B5 _ G5 _',
					'F#5 _ _ _ A5 _ _ _ D6 _ _ _ C6 _ A5 _',
					'B4 - - B4 - - E5 - - - G5 - F#5 - E5 -',
					'C5 - - C5 - - E5 - - - G5 - A5 - G5 -',
					'D5 - - D5 - - F#5 - - - A5 - B5 - A5 -',
					'B5 _ _ - A5 - G5 - F#5 _ _ - D#5 _ _ -',
				),
				gain: 0.045,
				gate: 0.6,
			},
		],
	},

	// The old town: A harmonic minor, on a lute, with a turn through F and C
	// in the middle.
	'gamla-stan': {
		bars: 16,
		tracks: [
			{
				voice: 'sub',
				pattern: bars(
					'A1 _ _ _ E2 _ _ _ A1 _ _ _ E2 _ _ _',
					'D2 _ _ _ A2 _ _ _ D2 _ _ _ A2 _ _ _',
					'E2 _ _ _ B1 _ _ _ E2 _ _ _ B1 _ _ _',
					'A1 _ _ _ E2 _ _ _ A1 _ _ _ - - - -',
					'A1 _ _ _ E2 _ _ _ A1 _ _ _ E2 _ _ _',
					'D2 _ _ _ A2 _ _ _ D2 _ _ _ A2 _ _ _',
					'E2 _ _ _ B1 _ _ _ E2 _ _ _ B1 _ _ _',
					'A1 _ _ _ E2 _ _ _ A1 _ _ _ - - - -',
					'F1 _ _ _ C2 _ _ _ F1 _ _ _ C2 _ _ _',
					'C2 _ _ _ G2 _ _ _ C2 _ _ _ G2 _ _ _',
					'D2 _ _ _ A2 _ _ _ D2 _ _ _ A2 _ _ _',
					'E2 _ _ _ B1 _ _ _ E2 _ _ _ G#1 _ _ _',
					'A1 _ _ _ E2 _ _ _ A1 _ _ _ E2 _ _ _',
					'D2 _ _ _ A2 _ _ _ D2 _ _ _ A2 _ _ _',
					'E2 _ _ _ B1 _ _ _ E2 _ _ _ B1 _ _ _',
					'A1 _ _ _ E2 _ _ _ A1 _ _ _ - - - -',
				),
				gain: 0.2,
			},
			{
				voice: 'pluck',
				pattern: bars(
					'A4 - C5 - E5 - A5 - G#5 - A5 - E5 - C5 -',
					'D5 - F5 - A5 - D6 - C6 - A5 - F5 - D5 -',
					'E5 - G#5 - B5 - E6 - D6 - B5 - G#5 - E5 -',
					'A5 _ _ - E5 _ _ - C5 - B4 - A4 _ _ -',
					'E5 - A5 - C6 - E6 - D6 - C6 - B5 - A5 -',
					'F5 - A5 - D6 - F6 - E6 - D6 - C6 - A5 -',
					'G#5 - B5 - E6 - D6 - B5 - G#5 - E5 - G#5 -',
					'A5 _ _ - C6 _ _ - B5 - G#5 - E5 _ _ -',
					'A5 _ _ - G5 - F5 - C5 - F5 - A5 - C6 -',
					'E6 _ _ - D6 - C6 - G5 - C6 - E6 - G5 -',
					'F5 _ _ - E5 - D5 - A4 - D5 - F5 - A5 -',
					'G#5 _ _ - A5 - B5 - D6 - C6 - B5 _ G#5 _',
					'A4 - C5 - E5 - A5 - G#5 - A5 - E5 - C5 -',
					'D5 - F5 - A5 - D6 - C6 - A5 - F5 - D5 -',
					'E5 - G#5 - B5 - E6 - D6 - B5 - G#5 - E5 -',
					'A5 _ _ - E5 _ _ - C5 - B4 - A4 _ _ -',
				),
				gain: 0.08,
			},
		],
	},

	// Across the sand: E Phrygian dominant, a snake charmer's, and down the
	// steps of A minor, G, F and E in the middle.
	pyramids: {
		bars: 16,
		tracks: [
			{
				voice: 'bass',
				pattern: bars(
					'E2 - E2 - E2 - F2 - E2 - E2 - E2 - D2 -',
					'F2 - F2 - F2 - G#2 - F2 - F2 - E2 - - -',
					'E2 - E2 - E2 - F2 - E2 - E2 - E2 - D2 -',
					'D2 - D2 - D2 - D2 - E2 - E2 - E2 - E2 -',
					'E2 - E2 - E2 - F2 - E2 - E2 - E2 - D2 -',
					'F2 - F2 - F2 - G#2 - F2 - F2 - E2 - - -',
					'E2 - E2 - E2 - F2 - E2 - E2 - E2 - D2 -',
					'D2 - D2 - D2 - D2 - E2 - E2 - E2 - E2 -',
					'A1 - A1 - A1 - C2 - A1 - A1 - A1 - B1 -',
					'G1 - G1 - G1 - B1 - G1 - G1 - G1 - A1 -',
					'F1 - F1 - F1 - A1 - F1 - F1 - F1 - E1 -',
					'E2 - E2 - E2 - F2 - E2 - E2 - E2 - D2 -',
					'E2 - E2 - E2 - F2 - E2 - E2 - E2 - D2 -',
					'F2 - F2 - F2 - G#2 - F2 - F2 - E2 - - -',
					'E2 - E2 - E2 - F2 - E2 - E2 - E2 - D2 -',
					'D2 - D2 - D2 - D2 - E2 - E2 - E2 - E2 -',
				),
				gain: 0.11,
				gate: 0.5,
			},
			{
				voice: 'square',
				pattern: bars(
					'E5 - F5 - G#5 - F5 - E5 - - - B4 - - -',
					'F5 - G#5 - A5 - G#5 - F5 - E5 - F5 - - -',
					'G#5 - A5 - B5 - C6 - B5 - A5 - G#5 - F5 -',
					'E5 - D5 - C5 - B4 - C5 - B4 - E4 _ _ -',
					'B4 - C5 - E5 - F5 - G#5 - F5 - E5 - - -',
					'A5 - G#5 - F5 - E5 - F5 - G#5 - A5 _ _ -',
					'B5 - C6 - B5 - A5 - G#5 - F5 - E5 - F5 -',
					'A5 - G#5 - F5 - D5 - E5 _ _ - - - - -',
					'C6 _ _ - B5 - A5 - E5 _ _ - A5 - C6 -',
					'B5 _ _ - A5 - G5 - D5 _ _ - G5 - B5 -',
					'A5 _ _ - G5 - F5 - C5 _ _ - F5 - A5 -',
					'G#5 _ _ - F5 - E5 - B4 _ _ - D5 - F5 -',
					'E5 - F5 - G#5 - F5 - E5 - - - B4 - - -',
					'F5 - G#5 - A5 - G#5 - F5 - E5 - F5 - - -',
					'G#5 - A5 - B5 - C6 - B5 - A5 - G#5 - F5 -',
					'E5 - D5 - C5 - B4 - C5 - B4 - E4 _ _ -',
				),
				gain: 0.045,
				gate: 0.6,
			},
		],
	},

	// Along the wall: C pentatonic, plucked like a guzheng, a bell occasionally,
	// and a higher, slower middle over A minor.
	'great-wall': {
		bars: 16,
		tracks: [
			{
				voice: 'sub',
				pattern: bars(
					'C2 _ _ - G2 _ _ - C2 _ _ - G2 _ _ -',
					'A1 _ _ - E2 _ _ - A1 _ _ - E2 _ _ -',
					'G1 _ _ - D2 _ _ - G1 _ _ - D2 _ _ -',
					'C2 _ _ - G2 _ _ - C2 _ _ - - - - -',
					'C2 _ _ - G2 _ _ - C2 _ _ - G2 _ _ -',
					'A1 _ _ - E2 _ _ - A1 _ _ - E2 _ _ -',
					'G1 _ _ - D2 _ _ - G1 _ _ - D2 _ _ -',
					'C2 _ _ - G2 _ _ - C2 _ _ - - - - -',
					'A1 _ _ - E2 _ _ - A1 _ _ - E2 _ _ -',
					'D2 _ _ - A2 _ _ - D2 _ _ - A2 _ _ -',
					'C2 _ _ - G2 _ _ - C2 _ _ - G2 _ _ -',
					'G1 _ _ - D2 _ _ - G1 _ _ - D2 _ _ -',
					'C2 _ _ - G2 _ _ - C2 _ _ - G2 _ _ -',
					'A1 _ _ - E2 _ _ - A1 _ _ - E2 _ _ -',
					'G1 _ _ - D2 _ _ - G1 _ _ - D2 _ _ -',
					'C2 _ _ - G2 _ _ - C2 _ _ - - - - -',
				),
				gain: 0.2,
			},
			{
				voice: 'pluck',
				pattern: bars(
					'E5 - G5 - A5 - G5 - E5 - D5 - C5 - - -',
					'A5 - C6 - A5 - G5 - E5 - G5 - A5 - - -',
					'G5 - E5 - D5 - E5 - G5 - A5 - G5 _ D5 -',
					'E5 - D5 - C5 - D5 - E5 _ _ - C5 _ _ -',
					'G5 - A5 - C6 - A5 - G5 - E5 - D5 - - -',
					'C6 - E6 - D6 - C6 - A5 - C6 - E6 - - -',
					'D6 - C6 - A5 - G5 - D5 - E5 - G5 _ A5 -',
					'C6 - A5 - G5 - E5 - D5 _ _ - C5 _ _ -',
					'A5 _ _ - C6 _ _ - E6 - D6 - C6 - A5 -',
					'D6 _ _ - C6 - A5 - G5 _ _ - A5 - D6 -',
					'E6 _ _ - D6 - C6 - G5 - A5 - C6 - E6 -',
					'D6 _ _ - C6 - A5 - G5 _ _ - - - - -',
					'E5 - G5 - A5 - G5 - E5 - D5 - C5 - - -',
					'A5 - C6 - A5 - G5 - E5 - G5 - A5 - - -',
					'G5 - E5 - D5 - E5 - G5 - A5 - G5 _ D5 -',
					'E5 - D5 - C5 - D5 - E5 _ _ - C5 _ _ -',
				),
				gain: 0.08,
			},
			{
				voice: 'bell',
				pattern: bars(
					'C6 - - - - - - - - - - - - - - -',
					'- - - - - - - - - - - - - - - -',
					'G5 - - - - - - - - - - - - - - -',
					'- - - - - - - - - - - - - - - -',
					'E6 - - - - - - - - - - - - - - -',
					'- - - - - - - - - - - - - - - -',
					'D6 - - - - - - - - - - - - - - -',
					'- - - - - - - - - - - - - - - -',
				),
				gain: 0.03,
			},
		],
	},

	// Up the mountain: A minor pentatonic, pan pipes over a charango, and a
	// middle that climbs from D minor.
	'machu-picchu': {
		bars: 16,
		tracks: [
			{
				voice: 'pluck',
				pattern: bars(
					'A2 - E3 - A2 - E3 - A2 - E3 - A2 - E3 -',
					'C3 - G3 - C3 - G3 - C3 - G3 - C3 - G3 -',
					'G2 - D3 - G2 - D3 - G2 - D3 - G2 - D3 -',
					'A2 - E3 - A2 - E3 - A2 - E3 - A2 - E3 -',
					'A2 - E3 - A2 - E3 - A2 - E3 - A2 - E3 -',
					'C3 - G3 - C3 - G3 - C3 - G3 - C3 - G3 -',
					'G2 - D3 - G2 - D3 - G2 - D3 - G2 - D3 -',
					'A2 - E3 - A2 - E3 - A2 - E3 - A2 - E3 -',
					'D3 - A3 - D3 - A3 - D3 - A3 - D3 - A3 -',
					'A2 - E3 - A2 - E3 - A2 - E3 - A2 - E3 -',
					'C3 - G3 - C3 - G3 - C3 - G3 - C3 - G3 -',
					'G2 - D3 - G2 - D3 - G2 - D3 - G2 - D3 -',
					'A2 - E3 - A2 - E3 - A2 - E3 - A2 - E3 -',
					'C3 - G3 - C3 - G3 - C3 - G3 - C3 - G3 -',
					'G2 - D3 - G2 - D3 - G2 - D3 - G2 - D3 -',
					'A2 - E3 - A2 - E3 - A2 - E3 - A2 - E3 -',
				),
				gain: 0.08,
			},
			{
				voice: 'whistle',
				pattern: bars(
					'A4 _ C5 - D5 - E5 _ _ - D5 - C5 - A4 -',
					'E5 _ G5 - A5 - G5 _ _ - E5 - D5 - C5 -',
					'D5 _ E5 - G5 - E5 _ _ - D5 - B4 - G4 -',
					'A4 _ _ - C5 - B4 - A4 _ _ _ _ _ _ -',
					'E5 _ D5 - C5 - A4 _ _ - C5 - D5 - E5 -',
					'G5 _ A5 - C6 - A5 _ _ - G5 - E5 - G5 -',
					'D5 _ E5 - G5 - A5 _ _ - G5 - E5 - D5 -',
					'E5 _ _ - D5 - C5 - A4 _ _ _ _ _ _ -',
					'A5 _ _ _ G5 - A5 - D6 _ _ _ C6 - A5 -',
					'C6 _ _ _ A5 - G5 - E5 _ _ _ D5 - C5 -',
					'E5 _ _ _ G5 - A5 - C6 _ _ _ D6 - E6 -',
					'D6 _ _ _ C6 - A5 - G5 _ _ _ _ _ _ -',
					'A4 _ C5 - D5 - E5 _ _ - D5 - C5 - A4 -',
					'E5 _ G5 - A5 - G5 _ _ - E5 - D5 - C5 -',
					'D5 _ E5 - G5 - E5 _ _ - D5 - B4 - G4 -',
					'A4 _ _ - C5 - B4 - A4 _ _ _ _ _ _ -',
				),
				gain: 0.07,
			},
		],
	},

	// Among the graves: D minor, creeping, a bell tolling, and a middle that
	// slips down to E flat.
	'halloween-town': {
		bars: 16,
		tracks: [
			{
				voice: 'sub',
				pattern: bars(
					'D2 _ _ _ - - D2 - D2 _ _ _ - - A1 -',
					'Bb1 _ _ _ - - Bb1 - Bb1 _ _ _ - - F1 -',
					'G1 _ _ _ - - G1 - G1 _ _ _ - - D2 -',
					'A1 _ _ _ - - A1 - A1 _ _ _ - - C#2 -',
					'D2 _ _ _ - - D2 - D2 _ _ _ - - A1 -',
					'Bb1 _ _ _ - - Bb1 - Bb1 _ _ _ - - F1 -',
					'G1 _ _ _ - - G1 - G1 _ _ _ - - D2 -',
					'A1 _ _ _ - - A1 - A1 _ _ _ - - C#2 -',
					'G1 _ _ _ - - G1 - G1 _ _ _ - - D2 -',
					'D2 _ _ _ - - D2 - D2 _ _ _ - - A1 -',
					'Eb2 _ _ _ - - Eb2 - Eb2 _ _ _ - - Bb1 -',
					'A1 _ _ _ - - A1 - A1 _ _ _ - - C#2 -',
					'D2 _ _ _ - - D2 - D2 _ _ _ - - A1 -',
					'Bb1 _ _ _ - - Bb1 - Bb1 _ _ _ - - F1 -',
					'G1 _ _ _ - - G1 - G1 _ _ _ - - D2 -',
					'A1 _ _ _ - - A1 - A1 _ _ _ - - C#2 -',
				),
				gain: 0.22,
			},
			{
				voice: 'triangle',
				pattern: bars(
					'D5 - - F5 - - A5 - G#5 - - - A5 _ _ -',
					'D6 - - Bb5 - - F5 - E5 - - - F5 _ _ -',
					'G5 - - Bb5 - - D6 - C#6 - - - D6 _ _ -',
					'E5 - F5 - E5 - C#5 - A4 _ _ - - - - -',
					'A5 - - G5 - - F5 - E5 - - - D5 _ _ -',
					'F5 - - D5 - - Bb4 - A4 - - - Bb4 _ _ -',
					'Bb5 - - A5 - - G5 - D5 - - - G5 _ _ -',
					'A5 - G5 - F5 - E5 - C#5 _ _ - A4 _ _ -',
					'G5 - - Bb5 - - D6 - - - Bb5 - G5 _ _ -',
					'F5 - - A5 - - D6 - - - A5 - F5 _ _ -',
					'Eb5 - - G5 - - Bb5 - - - G5 - Eb6 _ _ -',
					'C#6 - - A5 - - E5 - - - C#5 - A4 _ _ -',
					'D5 - - F5 - - A5 - G#5 - - - A5 _ _ -',
					'D6 - - Bb5 - - F5 - E5 - - - F5 _ _ -',
					'G5 - - Bb5 - - D6 - C#6 - - - D6 _ _ -',
					'E5 - F5 - E5 - C#5 - A4 _ _ - - - - -',
				),
				gain: 0.08,
			},
			{
				voice: 'bell',
				pattern: bars(
					'D4 - - - - - - - - - - - - - - -',
					'- - - - - - - - - - - - - - - -',
				),
				gain: 0.04,
			},
		],
	},

	// Silly and bouncy: F major, high up, and a hoppier middle from D minor.
	'furby-fields': {
		bars: 16,
		tracks: [
			{
				voice: 'square',
				pattern: bars(
					'F2 - - F3 - - F2 - C3 - - C3 - - F2 -',
					'Bb1 - - Bb2 - - Bb1 - F2 - - F2 - - Bb1 -',
					'C2 - - C3 - - C2 - G2 - - G2 - - C2 -',
					'F2 - - F3 - - F2 - C3 - - C3 - - F2 -',
					'F2 - - F3 - - F2 - C3 - - C3 - - F2 -',
					'Bb1 - - Bb2 - - Bb1 - F2 - - F2 - - Bb1 -',
					'C2 - - C3 - - C2 - G2 - - G2 - - C2 -',
					'F2 - - F3 - - F2 - C3 - - C3 - - F2 -',
					'D2 - - D3 - - D2 - A2 - - A2 - - D2 -',
					'G1 - - G2 - - G1 - D2 - - D2 - - G1 -',
					'Bb1 - - Bb2 - - Bb1 - F2 - - F2 - - Bb1 -',
					'C2 - - C3 - - C2 - G2 - - G2 - - E2 -',
					'F2 - - F3 - - F2 - C3 - - C3 - - F2 -',
					'Bb1 - - Bb2 - - Bb1 - F2 - - F2 - - Bb1 -',
					'C2 - - C3 - - C2 - G2 - - G2 - - C2 -',
					'F2 - - F3 - - F2 - C3 - - C3 - - F2 -',
				),
				gain: 0.06,
				gate: 0.5,
			},
			{
				voice: 'square',
				pattern: bars(
					'C6 A5 F5 A5 C6 - - - D6 C6 A5 C6 F6 - - -',
					'D6 Bb5 F5 Bb5 D6 - - - F6 D6 Bb5 D6 F6 - - -',
					'E6 C6 G5 C6 E6 - - - G6 E6 C6 E6 G6 - - -',
					'F6 - E6 - D6 - C6 - A5 - G5 - F5 _ _ -',
					'A5 C6 F6 C6 A5 - - - C6 A5 F5 A5 C6 - - -',
					'Bb5 D6 F6 D6 Bb5 - - - D6 Bb5 F5 Bb5 D6 - - -',
					'C6 E6 G6 E6 C6 - - - E6 C6 G5 C6 E6 - - -',
					'F6 - C6 - A5 - F5 - C6 - - - F6 _ _ -',
					'F6 - F6 - E6 - D6 - A5 - - - D6 - - -',
					'G6 - G6 - F6 - D6 - Bb5 - - - D6 - - -',
					'F6 - D6 - Bb5 - D6 - F6 - - - D6 - - -',
					'E6 - G6 - E6 - C6 - G5 - A5 - Bb5 - C6 -',
					'C6 A5 F5 A5 C6 - - - D6 C6 A5 C6 F6 - - -',
					'D6 Bb5 F5 Bb5 D6 - - - F6 D6 Bb5 D6 F6 - - -',
					'E6 C6 G5 C6 E6 - - - G6 E6 C6 E6 G6 - - -',
					'F6 - E6 - D6 - C6 - A5 - G5 - F5 _ _ -',
				),
				gain: 0.03,
				gate: 0.6,
			},
		],
	},

	// Roof to roof at night: A minor sevenths, funky, and a smoother middle
	// round D minor, G and C.
	'city-rooftop': {
		bars: 16,
		tracks: [
			{
				voice: 'bass',
				pattern: bars(
					'A1 - A2 - - A1 - G2 - A1 - - E2 - G2 -',
					'D2 - D3 - - D2 - C3 - D2 - - A2 - C3 -',
					'F1 - F2 - - F1 - E2 - F1 - - C2 - E2 -',
					'E1 - E2 - - E1 - D2 - E1 - - B1 - D2 -',
					'A1 - A2 - - A1 - G2 - A1 - - E2 - G2 -',
					'D2 - D3 - - D2 - C3 - D2 - - A2 - C3 -',
					'F1 - F2 - - F1 - E2 - F1 - - C2 - E2 -',
					'E1 - E2 - - E1 - D2 - E1 - - B1 - D2 -',
					'D2 - D3 - - D2 - C3 - D2 - - A2 - C3 -',
					'G1 - G2 - - G1 - F2 - G1 - - D2 - F2 -',
					'C2 - C3 - - C2 - B2 - C2 - - G2 - B2 -',
					'E1 - E2 - - E1 - D2 - E1 - - B1 - D2 -',
					'A1 - A2 - - A1 - G2 - A1 - - E2 - G2 -',
					'D2 - D3 - - D2 - C3 - D2 - - A2 - C3 -',
					'F1 - F2 - - F1 - E2 - F1 - - C2 - E2 -',
					'E1 - E2 - - E1 - D2 - E1 - - B1 - D2 -',
				),
				gain: 0.12,
				gate: 0.5,
			},
			{
				voice: 'sawtooth',
				pattern: bars(
					'- - E5 - G5 - - A5 - - G5 - E5 - - -',
					'- - F#5 - A5 - - C6 - - A5 - F#5 - - -',
					'- - A5 - C6 - - E6 - - C6 - A5 - - -',
					'- - G#5 - B5 - - D6 - - B5 - G#5 _ _ -',
					'- - C6 - B5 - - A5 - - G5 - E5 - G5 -',
					'- - A5 - C6 - - D6 - - C6 - A5 - F#5 -',
					'- - C6 - E6 - - F6 - - E6 - C6 - A5 -',
					'- - B5 - D6 - - E6 - - D6 - B5 - G#5 -',
					'F5 _ _ - A5 - C6 _ _ - E6 _ D6 - C6 -',
					'B5 _ _ - D6 - F6 _ _ - E6 _ D6 - B5 -',
					'E6 _ _ - C6 - G5 _ _ - B5 _ C6 - E6 -',
					'D6 _ _ - B5 - G#5 _ _ - E5 _ _ _ - -',
					'- - E5 - G5 - - A5 - - G5 - E5 - - -',
					'- - F#5 - A5 - - C6 - - A5 - F#5 - - -',
					'- - A5 - C6 - - E6 - - C6 - A5 - - -',
					'- - G#5 - B5 - - D6 - - B5 - G#5 _ _ -',
				),
				gain: 0.03,
				gate: 0.7,
			},
		],
	},

	// Underground: D minor, low and slow, water dripping, and deeper still
	// in the middle, down through G minor and E flat.
	caves: {
		bars: 16,
		tracks: [
			{
				voice: 'sub',
				pattern: bars(
					'D2 _ _ _ _ _ _ _ A1 _ _ _ _ _ _ _',
					'D2 _ _ _ _ _ _ _ A1 _ _ _ _ _ _ _',
					'Bb1 _ _ _ _ _ _ _ F1 _ _ _ _ _ _ _',
					'A1 _ _ _ _ _ _ _ E1 _ _ _ _ _ _ _',
					'D2 _ _ _ _ _ _ _ A1 _ _ _ _ _ _ _',
					'D2 _ _ _ _ _ _ _ A1 _ _ _ _ _ _ _',
					'Bb1 _ _ _ _ _ _ _ F1 _ _ _ _ _ _ _',
					'A1 _ _ _ _ _ _ _ E1 _ _ _ _ _ _ _',
					'G1 _ _ _ _ _ _ _ D2 _ _ _ _ _ _ _',
					'F1 _ _ _ _ _ _ _ C2 _ _ _ _ _ _ _',
					'Eb2 _ _ _ _ _ _ _ Bb1 _ _ _ _ _ _ _',
					'A1 _ _ _ _ _ _ _ E1 _ _ _ _ _ _ _',
					'D2 _ _ _ _ _ _ _ A1 _ _ _ _ _ _ _',
					'D2 _ _ _ _ _ _ _ A1 _ _ _ _ _ _ _',
					'Bb1 _ _ _ _ _ _ _ F1 _ _ _ _ _ _ _',
					'A1 _ _ _ _ _ _ _ E1 _ _ _ _ _ _ _',
				),
				gain: 0.22,
			},
			{
				voice: 'pluck',
				pattern: bars(
					'D4 - - - F4 - - - A4 - - - G4 - - -',
					'F4 - - - E4 - - - D4 - - - A3 - - -',
					'Bb3 - - - D4 - - - F4 - - - E4 - - -',
					'E4 - - - C#4 - - - A3 _ _ _ _ _ _ -',
					'A4 - - - F4 - - - D4 - - - E4 - - -',
					'F4 - - - A4 - - - D5 - - - C5 - - -',
					'D5 - - - Bb4 - - - F4 - - - A4 - - -',
					'G4 - - - E4 - - - C#4 _ _ _ A3 _ _ -',
					'G4 - - - Bb4 - - - D5 - - - C5 - - -',
					'A4 - - - F4 - - - C5 - - - A4 - - -',
					'G4 - - - Bb4 - - - Eb5 - - - D5 - - -',
					'C#5 - - - E5 - - - A4 _ _ _ _ _ _ -',
					'D4 - - - F4 - - - A4 - - - G4 - - -',
					'F4 - - - E4 - - - D4 - - - A3 - - -',
					'Bb3 - - - D4 - - - F4 - - - E4 - - -',
					'E4 - - - C#4 - - - A3 _ _ _ _ _ _ -',
				),
				gain: 0.09,
			},
			{
				voice: 'bell',
				pattern: bars(
					'- - - - - - - - - - - A5 - - - -',
					'- - - - - - - - - - - - - - D6 -',
					'- - - - - F5 - - - - - - - - - -',
					'- - - - - - - - - - - - - - - -',
					'- - - - - - - - - - - A5 - - - -',
					'- - - - - - - - - - - - - - D6 -',
					'- - - D6 - - - - - - - - - - - -',
					'- - - - - - - - - E6 - - - - - -',
				),
				gain: 0.035,
			},
		],
	},

	// Down the drain: E minor, a dripping, plodding bass, and a creepy
	// whistle overhead, and a middle that sinks through A minor and F.
	sewers: {
		bars: 16,
		tracks: [
			{
				voice: 'bass',
				pattern: bars(
					'E2 - - E2 - - G2 - E2 - - B1 - - D2 -',
					'E2 - - E2 - - G2 - A2 - - G2 - - F#2 -',
					'C2 - - C2 - - E2 - C2 - - G1 - - B1 -',
					'B1 - - B1 - - D#2 - F#2 - - D#2 - - B1 -',
					'E2 - - E2 - - G2 - E2 - - B1 - - D2 -',
					'E2 - - E2 - - G2 - A2 - - G2 - - F#2 -',
					'C2 - - C2 - - E2 - C2 - - G1 - - B1 -',
					'B1 - - B1 - - D#2 - F#2 - - D#2 - - B1 -',
					'A1 - - A1 - - C2 - A1 - - E1 - - G1 -',
					'E2 - - E2 - - G2 - E2 - - B1 - - D2 -',
					'F2 - - F2 - - A2 - F2 - - C2 - - E2 -',
					'B1 - - B1 - - D#2 - F#2 - - D#2 - - B1 -',
					'E2 - - E2 - - G2 - E2 - - B1 - - D2 -',
					'E2 - - E2 - - G2 - A2 - - G2 - - F#2 -',
					'C2 - - C2 - - E2 - C2 - - G1 - - B1 -',
					'B1 - - B1 - - D#2 - F#2 - - D#2 - - B1 -',
				),
				gain: 0.12,
				gate: 0.5,
			},
			{
				voice: 'pluck',
				pattern: bars(
					'- - B4 - - - - - - - G4 - - - - -',
					'- - A4 - - - - - - - B4 - - - - -',
					'- - G4 - - - - - - - E4 - - - - -',
					'- - F#4 - - - - - - - D#4 - - - - -',
					'- - E5 - - - - - - - B4 - - - - -',
					'- - C5 - - - - - - - E5 - - - - -',
					'- - E5 - - - - - - - C5 - - - - -',
					'- - D#5 - - - - - - - B4 - - - - -',
					'- - C5 - - - - - - - E5 - - - - -',
					'- - B4 - - - - - - - G4 - - - - -',
					'- - A4 - - - - - - - C5 - - - - -',
					'- - F#4 - - - - - - - A4 - - - - -',
					'- - B4 - - - - - - - G4 - - - - -',
					'- - A4 - - - - - - - B4 - - - - -',
					'- - G4 - - - - - - - E4 - - - - -',
					'- - F#4 - - - - - - - D#4 - - - - -',
				),
				gain: 0.08,
			},
			{
				voice: 'whistle',
				pattern: bars(
					'- - - - - - - - - - - - - - E6 -',
					'- - - - - - B5 - - - - - - - - -',
					'- - - - - - - - - - - - - - G6 -',
					'- - - - - - F#5 - - - - - D#6 - - -',
					'- - - - - - - - - - - - - - B5 -',
					'- - - - - - E6 - - - - - - - - -',
					'- - - - - - - - - - - - - - E6 -',
					'- - - - - - B5 - - - - - F#6 - - -',
					'- - - - - - - - - - - - - - A5 -',
					'- - - - - - G6 - - - - - - - - -',
					'- - - - - - - - - - - - - - F6 -',
					'- - - - - - D#6 - - - - - B5 - - -',
					'- - - - - - - - - - - - - - E6 -',
					'- - - - - - B5 - - - - - - - - -',
					'- - - - - - - - - - - - - - G6 -',
					'- - - - - - F#5 - - - - - D#6 - - -',
				),
				gain: 0.03,
			},
		],
	},
	// On the ferry to Turku: D major, a dansband's, an oom-pah bass and a
	// bouncing tune, as in the dance bar on every crossing, and a swaying
	// middle from G.
	'scoop-line': {
		bars: 16,
		tracks: [
			{
				voice: 'bass',
				pattern: bars(
					'D2 - A2 - D2 - A2 - D2 - A2 - D2 - F#2 -',
					'G1 - D2 - G1 - D2 - G1 - D2 - G1 - B1 -',
					'A1 - E2 - A1 - E2 - A1 - E2 - A1 - C#2 -',
					'D2 - A2 - D2 - A2 - D2 - - - A1 - - -',
					'D2 - A2 - D2 - A2 - D2 - A2 - D2 - F#2 -',
					'G1 - D2 - G1 - D2 - G1 - D2 - G1 - B1 -',
					'A1 - E2 - A1 - E2 - A1 - E2 - A1 - C#2 -',
					'D2 - A2 - D2 - A2 - D2 - - - A1 - - -',
					'G1 - D2 - G1 - D2 - G1 - D2 - G1 - B1 -',
					'D2 - A2 - D2 - A2 - D2 - A2 - D2 - F#2 -',
					'E2 - B2 - E2 - B2 - E2 - B2 - E2 - G2 -',
					'A1 - E2 - A1 - E2 - A1 - E2 - A1 - C#2 -',
					'D2 - A2 - D2 - A2 - D2 - A2 - D2 - F#2 -',
					'G1 - D2 - G1 - D2 - G1 - D2 - G1 - B1 -',
					'A1 - E2 - A1 - E2 - A1 - E2 - A1 - C#2 -',
					'D2 - A2 - D2 - A2 - D2 - - - A1 - - -',
				),
				gain: 0.12,
				gate: 0.45,
			},
			{
				voice: 'square',
				pattern: bars(
					'F#5 - F#5 - A5 - F#5 - E5 - D5 - E5 _ _ -',
					'D5 - D5 - G5 - B5 - A5 - G5 - F#5 _ _ -',
					'E5 - E5 - A5 - C#6 - B5 - A5 - G5 - E5 -',
					'F#5 - A5 - D6 _ _ - A5 - F#5 - D5 _ _ -',
					'A5 - A5 - F#5 - A5 - B5 - A5 - F#5 _ _ -',
					'B5 - B5 - D6 - B5 - A5 - G5 - B5 _ _ -',
					'C#6 - C#6 - A5 - E5 - G5 - F#5 - E5 - C#5 -',
					'D5 - F#5 - A5 - D6 _ _ - - - - - - -',
					'B5 _ _ - A5 - G5 - D5 _ _ - G5 - B5 -',
					'A5 _ _ - F#5 - D5 - A4 _ _ - D5 - F#5 -',
					'G5 _ _ - E5 - B4 - E5 - G5 - B5 - G5 -',
					'A5 _ _ - C#6 - E6 _ _ - C#6 - A5 - G5 -',
					'F#5 - F#5 - A5 - F#5 - E5 - D5 - E5 _ _ -',
					'D5 - D5 - G5 - B5 - A5 - G5 - F#5 _ _ -',
					'E5 - E5 - A5 - C#6 - B5 - A5 - G5 - E5 -',
					'F#5 - A5 - D6 _ _ - A5 - F#5 - D5 _ _ -',
				),
				gain: 0.04,
				gate: 0.6,
			},
			{
				voice: 'bell',
				pattern: bars(
					'- - - - - - - - - - - - - - A5 -',
					'- - - - - - - - - - - - - - B5 -',
					'- - - - - - - - - - - - - - C#6 -',
					'- - - - - - - - D6 - - - - - - -',
				),
				gain: 0.025,
			},
		],
	},
	// Off the cliff and out to sea: G major, soaring, a bass that rocks
	// like the waves and a bright melody gliding over it, and a long, high
	// swell through C, D and B minor in the middle.
	cliff: {
		bars: 16,
		tracks: [
			{
				voice: 'bass',
				pattern: bars(
					'G1 - - G2 - - D2 - G1 - - G2 - - B1 -',
					'E1 - - E2 - - B1 - E1 - - E2 - - G1 -',
					'C2 - - C3 - - G2 - C2 - - C3 - - E2 -',
					'D2 - - D3 - - A2 - D2 - - F#2 - - A2 -',
					'G1 - - G2 - - D2 - G1 - - G2 - - B1 -',
					'E1 - - E2 - - B1 - E1 - - E2 - - G1 -',
					'C2 - - C3 - - G2 - C2 - - C3 - - E2 -',
					'D2 - - D3 - - A2 - D2 - - F#2 - - A2 -',
					'C2 - - C3 - - G2 - C2 - - C3 - - E2 -',
					'D2 - - D3 - - A2 - D2 - - D3 - - F#2 -',
					'B1 - - B2 - - F#2 - B1 - - B2 - - D2 -',
					'E2 - - E3 - - B2 - E2 - - E3 - - G2 -',
					'G1 - - G2 - - D2 - G1 - - G2 - - B1 -',
					'E1 - - E2 - - B1 - E1 - - E2 - - G1 -',
					'C2 - - C3 - - G2 - C2 - - C3 - - E2 -',
					'D2 - - D3 - - A2 - D2 - - F#2 - - A2 -',
				),
				gain: 0.12,
				gate: 0.5,
			},
			{
				voice: 'square',
				pattern: bars(
					'B5 _ _ - D6 _ _ - G6 _ _ _ _ _ - -',
					'G6 - F#6 - E6 _ _ - B5 _ _ _ _ _ - -',
					'C6 - E6 - G6 _ _ - E6 - C6 - G5 _ _ -',
					'A5 - B5 - C6 - D6 _ _ _ F#5 _ _ _ - -',
					'D6 _ _ - B5 _ _ - G5 _ _ _ _ _ - -',
					'G6 _ _ - E6 _ _ - B5 _ _ _ _ _ - -',
					'G5 - C6 - E6 _ _ - G6 - E6 - C6 _ _ -',
					'D6 - C6 - B5 - A5 _ _ _ D6 _ _ _ - -',
					'E6 _ _ _ _ _ G6 _ _ _ C6 _ _ _ - -',
					'F#6 _ _ _ _ _ D6 _ _ _ A5 _ _ _ - -',
					'F#6 - E6 - D6 _ _ - B5 _ _ _ F#5 _ _ -',
					'G5 - B5 - E6 _ _ _ _ _ D6 _ _ _ - -',
					'B5 _ _ - D6 _ _ - G6 _ _ _ _ _ - -',
					'G6 - F#6 - E6 _ _ - B5 _ _ _ _ _ - -',
					'C6 - E6 - G6 _ _ - E6 - C6 - G5 _ _ -',
					'A5 - B5 - C6 - D6 _ _ _ F#5 _ _ _ - -',
				),
				gain: 0.03,
				gate: 0.7,
			},
			{
				voice: 'bell',
				pattern: bars(
					'- - - - - - - - - - - - - - D6 -',
					'- - - - - - - - - - - - - - B5 -',
				),
				gain: 0.03,
			},
		],
	},

	// Up Everest: D minor pentatonic over a low drone, a bansuri's line
	// climbing a little higher every bar, and a singing bowl ringing out,
	// then a breath on the way down, and a middle through B flat and C.
	everest: {
		bars: 16,
		tracks: [
			{
				voice: 'sub',
				pattern: bars(
					'D2 _ _ _ _ _ _ _ A1 _ _ _ _ _ _ _',
					'D2 _ _ _ _ _ _ _ C2 _ _ _ _ _ _ _',
					'D2 _ _ _ _ _ _ _ A1 _ _ _ _ _ _ _',
					'F2 _ _ _ _ _ _ _ G2 _ _ _ A2 _ _ _',
					'D2 _ _ _ _ _ _ _ A1 _ _ _ _ _ _ _',
					'D2 _ _ _ _ _ _ _ C2 _ _ _ _ _ _ _',
					'D2 _ _ _ _ _ _ _ A1 _ _ _ _ _ _ _',
					'F2 _ _ _ _ _ _ _ G2 _ _ _ A2 _ _ _',
					'Bb1 _ _ _ _ _ _ _ F2 _ _ _ _ _ _ _',
					'C2 _ _ _ _ _ _ _ G2 _ _ _ _ _ _ _',
					'D2 _ _ _ _ _ _ _ A1 _ _ _ _ _ _ _',
					'G1 _ _ _ _ _ _ _ A1 _ _ _ _ _ _ _',
					'D2 _ _ _ _ _ _ _ A1 _ _ _ _ _ _ _',
					'D2 _ _ _ _ _ _ _ C2 _ _ _ _ _ _ _',
					'D2 _ _ _ _ _ _ _ A1 _ _ _ _ _ _ _',
					'F2 _ _ _ _ _ _ _ G2 _ _ _ A2 _ _ _',
				),
				gain: 0.13,
			},
			{
				voice: 'pluck',
				pattern: bars(
					'D3 - A3 - D4 - A3 - D3 - A3 - D4 - A3 -',
					'D3 - A3 - D4 - A3 - C3 - G3 - C4 - G3 -',
					'D3 - A3 - D4 - A3 - D3 - A3 - D4 - A3 -',
					'F3 - C4 - F4 - C4 - G3 - D4 - A3 - E4 -',
					'D3 - A3 - D4 - A3 - D3 - A3 - D4 - A3 -',
					'D3 - A3 - D4 - A3 - C3 - G3 - C4 - G3 -',
					'D3 - A3 - D4 - A3 - D3 - A3 - D4 - A3 -',
					'F3 - C4 - F4 - C4 - G3 - D4 - A3 - E4 -',
					'Bb2 - F3 - Bb3 - F3 - Bb2 - F3 - Bb3 - F3 -',
					'C3 - G3 - C4 - G3 - C3 - G3 - C4 - G3 -',
					'D3 - A3 - D4 - A3 - D3 - A3 - D4 - A3 -',
					'G3 - D4 - G4 - D4 - A3 - E4 - A4 - E4 -',
					'D3 - A3 - D4 - A3 - D3 - A3 - D4 - A3 -',
					'D3 - A3 - D4 - A3 - C3 - G3 - C4 - G3 -',
					'D3 - A3 - D4 - A3 - D3 - A3 - D4 - A3 -',
					'F3 - C4 - F4 - C4 - G3 - D4 - A3 - E4 -',
				),
				gain: 0.05,
			},
			{
				voice: 'whistle',
				pattern: bars(
					'D5 _ _ - F5 - G5 _ A5 _ _ _ G5 - F5 -',
					'G5 _ _ - A5 - C6 _ A5 _ _ _ G5 - F5 -',
					'A5 _ _ - C6 - D6 _ C6 _ _ _ A5 - G5 -',
					'C6 _ _ - D6 - F6 _ E6 _ _ _ D6 _ _ -',
					'D6 _ _ - C6 - A5 _ G5 _ _ _ F5 - D5 -',
					'F5 _ _ - G5 - A5 _ G5 _ _ _ F5 - D5 -',
					'A5 _ _ - G5 - F5 _ D5 _ _ _ F5 - G5 -',
					'A5 _ _ - C6 - D6 _ C6 _ _ _ A5 _ _ -',
					'F5 _ _ _ _ _ D5 _ F5 _ G5 _ _ _ _ _',
					'G5 _ _ _ _ _ E5 _ G5 _ C6 _ _ _ _ _',
					'A5 _ _ _ _ _ F5 _ A5 _ D6 _ _ _ _ _',
					'D6 _ _ _ _ _ B5 _ A5 _ _ _ _ _ _ -',
					'D5 _ _ - F5 - G5 _ A5 _ _ _ G5 - F5 -',
					'G5 _ _ - A5 - C6 _ A5 _ _ _ G5 - F5 -',
					'A5 _ _ - C6 - D6 _ C6 _ _ _ A5 - G5 -',
					'C6 _ _ - D6 - F6 _ E6 _ _ _ D6 _ _ -',
				),
				gain: 0.06,
			},
			{
				voice: 'bell',
				pattern: bars(
					'D6 - - - - - - - - - - - - - - -',
					'- - - - - - - - A5 - - - - - - -',
				),
				gain: 0.035,
			},
		],
	},

	// Karolinska: A minor, a fantastic voyage. A heart's "lub-dub" for a
	// bass, arpeggios bubbling over it like air through the lungs, and the
	// hospital's chime, "ding, dong, ding, dong", as on its tannoy. Then the
	// whistle has the tune a while, and the middle lifts through F, G and C.
	karolinska: {
		bars: 16,
		tracks: [
			{
				voice: 'sub',
				pattern: bars(
					'A1 - A1 - - - - - A1 - A1 - - - - -',
					'F1 - F1 - - - - - F1 - F1 - - - - -',
					'D2 - D2 - - - - - D2 - D2 - - - - -',
					'E1 - E1 - - - - - E1 - E1 - - - G#1 -',
					'A1 - A1 - - - - - A1 - A1 - - - - -',
					'F1 - F1 - - - - - F1 - F1 - - - - -',
					'D2 - D2 - - - - - D2 - D2 - - - - -',
					'E1 - E1 - - - - - E1 - E1 - - - G#1 -',
					'F1 - F1 - - - - - F1 - F1 - - - - -',
					'G1 - G1 - - - - - G1 - G1 - - - - -',
					'C2 - C2 - - - - - C2 - C2 - - - - -',
					'E1 - E1 - - - - - E1 - E1 - - - G#1 -',
					'A1 - A1 - - - - - A1 - A1 - - - - -',
					'F1 - F1 - - - - - F1 - F1 - - - - -',
					'D2 - D2 - - - - - D2 - D2 - - - - -',
					'E1 - E1 - - - - - E1 - E1 - - - G#1 -',
				),
				gain: 0.22,
			},
			{
				voice: 'pluck',
				pattern: bars(
					'A4 C5 E5 A5 E5 C5 A4 C5 E5 A5 C6 A5 E5 C5 A4 C5',
					'F4 A4 C5 F5 C5 A4 F4 A4 C5 F5 A5 F5 C5 A4 F4 A4',
					'D4 F4 A4 D5 A4 F4 D4 F4 A4 D5 F5 D5 A4 F4 D4 F4',
					'E4 G#4 B4 E5 B4 G#4 E4 G#4 B4 E5 G#5 E5 B4 G#4 E4 B4',
					'A4 C5 E5 A5 E5 C5 A4 C5 E5 A5 C6 A5 E5 C5 A4 C5',
					'F4 A4 C5 F5 C5 A4 F4 A4 C5 F5 A5 F5 C5 A4 F4 A4',
					'D4 F4 A4 D5 A4 F4 D4 F4 A4 D5 F5 D5 A4 F4 D4 F4',
					'E4 G#4 B4 E5 B4 G#4 E4 G#4 B4 E5 G#5 E5 B4 G#4 E4 B4',
					'F4 A4 C5 F5 C5 A4 F4 A4 C5 F5 A5 F5 C5 A4 F4 A4',
					'G4 B4 D5 G5 D5 B4 G4 B4 D5 G5 B5 G5 D5 B4 G4 B4',
					'C5 E5 G5 C6 G5 E5 C5 E5 G5 C6 E6 C6 G5 E5 C5 E5',
					'E4 G#4 B4 E5 B4 G#4 E4 G#4 B4 E5 G#5 E5 B4 G#4 E4 B4',
					'A4 C5 E5 A5 E5 C5 A4 C5 E5 A5 C6 A5 E5 C5 A4 C5',
					'F4 A4 C5 F5 C5 A4 F4 A4 C5 F5 A5 F5 C5 A4 F4 A4',
					'D4 F4 A4 D5 A4 F4 D4 F4 A4 D5 F5 D5 A4 F4 D4 F4',
					'E4 G#4 B4 E5 B4 G#4 E4 G#4 B4 E5 G#5 E5 B4 G#4 E4 B4',
				),
				gain: 0.03,
			},
			{
				voice: 'bell',
				pattern: bars(
					'E6 - - - C6 - - - D6 - - - G5 _ _ -',
					'- - - - - - - - - - - - - - - -',
					'G5 - - - D6 - - - E6 - - - C6 _ _ -',
					'- - - - - - - - B5 - - - G#5 - - -',
					'- - - - - - - - - - - - - - - -',
					'- - - - - - - - - - - - - - - -',
					'- - - - - - - - - - - - - - - -',
					'- - - - - - - - B5 - - - G#5 - - -',
					'- - - - - - - - - - - - - - - -',
					'- - - - - - - - - - - - - - - -',
					'E6 - - - C6 - - - D6 - - - G5 _ _ -',
					'- - - - - - - - - - - - - - - -',
					'E6 - - - C6 - - - D6 - - - G5 _ _ -',
					'- - - - - - - - - - - - - - - -',
					'G5 - - - D6 - - - E6 - - - C6 _ _ -',
					'- - - - - - - - B5 - - - G#5 - - -',
				),
				gain: 0.035,
			},
			{
				voice: 'whistle',
				pattern: bars(
					'- - - - - - - - - - - - E5 _ A5 _',
					'C6 _ _ _ B5 _ A5 _ F5 _ _ _ - - - -',
					'- - - - - - - - - - - - D5 _ F5 _',
					'A5 _ _ _ G#5 _ B5 _ E6 _ _ _ - - - -',
					'A5 _ _ _ C6 _ _ _ E6 _ _ _ D6 _ C6 _',
					'A5 _ _ _ _ _ _ _ C6 _ A5 _ F5 _ _ _',
					'D5 _ F5 _ A5 _ D6 _ C6 _ _ _ A5 _ F5 _',
					'E5 _ _ _ G#5 _ _ _ B5 _ _ _ E6 _ _ _',
					'C6 _ _ _ _ _ _ _ A5 _ _ _ F5 _ _ _',
					'D6 _ _ _ _ _ _ _ B5 _ _ _ G5 _ _ _',
					'E6 _ _ _ _ _ D6 _ C6 _ _ _ G5 _ _ _',
					'G#5 _ _ _ B5 _ _ _ E6 _ _ _ D6 _ B5 _',
					'- - - - - - - - - - - - E5 _ A5 _',
					'C6 _ _ _ B5 _ A5 _ F5 _ _ _ - - - -',
					'- - - - - - - - - - - - D5 _ F5 _',
					'A5 _ _ _ G#5 _ B5 _ E6 _ _ _ - - - -',
				),
				gain: 0.045,
			},
		],
	},

	// Down The Slopes: après-ski, bright, in G, an oompah of a bass under a
	// chorus to sing along to, arpeggios sparkling over it, sleigh bells,
	// and a middle from C to sway to with your mug in the air.
	slopes: {
		bars: 16,
		tracks: [
			{
				voice: 'bass',
				pattern: bars(
					'G2 - D3 - G2 - D3 - G2 - D3 - G2 - B2 -',
					'D2 - A2 - D2 - A2 - D2 - A2 - D2 - F#2 -',
					'E2 - B2 - E2 - B2 - E2 - B2 - E2 - G2 -',
					'C2 - G2 - C2 - G2 - D2 - A2 - D2 - F#2 -',
					'G2 - D3 - G2 - D3 - G2 - D3 - G2 - B2 -',
					'D2 - A2 - D2 - A2 - D2 - A2 - D2 - F#2 -',
					'E2 - B2 - E2 - B2 - E2 - B2 - E2 - G2 -',
					'C2 - G2 - C2 - G2 - D2 - A2 - D2 - F#2 -',
					'C2 - G2 - C2 - G2 - C2 - G2 - C2 - E2 -',
					'G2 - D3 - G2 - D3 - G2 - D3 - G2 - B2 -',
					'A1 - E2 - A1 - E2 - A1 - E2 - A1 - C2 -',
					'D2 - A2 - D2 - A2 - D2 - A2 - D2 - F#2 -',
					'G2 - D3 - G2 - D3 - G2 - D3 - G2 - B2 -',
					'D2 - A2 - D2 - A2 - D2 - A2 - D2 - F#2 -',
					'E2 - B2 - E2 - B2 - E2 - B2 - E2 - G2 -',
					'C2 - G2 - C2 - G2 - D2 - A2 - D2 - F#2 -',
				),
				gain: 0.12,
				gate: 0.5,
			},
			{
				voice: 'pluck',
				pattern: bars(
					'G4 B4 D5 G5 D5 B4 G4 B4 G4 B4 D5 G5 D5 B4 G4 B4',
					'F#4 A4 D5 F#5 D5 A4 F#4 A4 F#4 A4 D5 F#5 D5 A4 F#4 A4',
					'E4 G4 B4 E5 B4 G4 E4 G4 E4 G4 B4 E5 B4 G4 E4 G4',
					'E4 G4 C5 E5 C5 G4 E4 G4 F#4 A4 D5 F#5 D5 A4 F#4 A4',
					'G4 B4 D5 G5 D5 B4 G4 B4 G4 B4 D5 G5 D5 B4 G4 B4',
					'F#4 A4 D5 F#5 D5 A4 F#4 A4 F#4 A4 D5 F#5 D5 A4 F#4 A4',
					'E4 G4 B4 E5 B4 G4 E4 G4 E4 G4 B4 E5 B4 G4 E4 G4',
					'E4 G4 C5 E5 C5 G4 E4 G4 F#4 A4 D5 F#5 D5 A4 F#4 A4',
					'E4 G4 C5 E5 C5 G4 E4 G4 E4 G4 C5 E5 C5 G4 E4 G4',
					'D4 G4 B4 D5 B4 G4 D4 G4 D4 G4 B4 D5 B4 G4 D4 G4',
					'E4 A4 C5 E5 C5 A4 E4 A4 E4 A4 C5 E5 C5 A4 E4 A4',
					'F#4 A4 D5 F#5 D5 A4 F#4 A4 F#4 A4 C5 F#5 D5 A4 F#4 A4',
					'G4 B4 D5 G5 D5 B4 G4 B4 G4 B4 D5 G5 D5 B4 G4 B4',
					'F#4 A4 D5 F#5 D5 A4 F#4 A4 F#4 A4 D5 F#5 D5 A4 F#4 A4',
					'E4 G4 B4 E5 B4 G4 E4 G4 E4 G4 B4 E5 B4 G4 E4 G4',
					'E4 G4 C5 E5 C5 G4 E4 G4 F#4 A4 D5 F#5 D5 A4 F#4 A4',
				),
				gain: 0.03,
			},
			{
				voice: 'square',
				pattern: bars(
					'B5 - D6 - G6 _ _ - F#6 - E6 - D6 _ _ -',
					'A5 - D6 - F#6 _ _ - E6 - D6 - A5 _ _ -',
					'G5 - B5 - E6 _ _ - D6 - B5 - G5 _ _ -',
					'C6 - E6 - G6 _ _ - E6 - D6 _ _ _ - -',
					'D6 - B5 - G5 _ _ - A5 - B5 - D6 _ _ -',
					'A5 - F#5 - D6 _ _ - E6 - F#6 - D6 _ _ -',
					'E6 - D6 - B5 _ _ - G5 - B5 - E6 _ _ -',
					'E6 - D6 - C6 - B5 - A5 - B5 - A5 _ _ _',
					'E6 _ _ - E6 - D6 - C6 _ _ - G5 _ _ -',
					'D6 _ _ - D6 - C6 - B5 _ _ - G5 _ _ -',
					'C6 _ _ - C6 - B5 - A5 _ _ - E5 _ _ -',
					'F#5 - A5 - D6 _ _ - C6 - B5 - A5 _ _ -',
					'B5 - D6 - G6 _ _ - F#6 - E6 - D6 _ _ -',
					'A5 - D6 - F#6 _ _ - E6 - D6 - A5 _ _ -',
					'G5 - B5 - E6 _ _ - D6 - B5 - G5 _ _ -',
					'C6 - E6 - G6 _ _ - E6 - D6 _ _ _ - -',
				),
				gain: 0.028,
				gate: 0.7,
			},
			{
				voice: 'bell',
				pattern: bars(
					'- - G6 - - - G6 - - - G6 - - - G6 -',
					'- - A6 - - - A6 - - - A6 - - - D7 -',
				),
				gain: 0.022,
			},
		],
	},

	// Midnattsloppet: one tune, in A minor, in three versions, for whoever's
	// playing it as you pass (see `Course['tunes']`): the DJ's, in the
	// streets; the rock band's, at the docks; and the choir's, up at
	// Sofiakyrkan. Each the same melody over the same chords, so one can
	// fade into the next mid-tune.
	midnattsloppet: MIDNATT_EDM,
	'midnattsloppet:rock': MIDNATT_ROCK,
	'midnattsloppet:choir': MIDNATT_CHOIR,
	'dino-island': DINO_JUNGLE,
	'dino-island:volcano': DINO_VOLCANO,
	'dino-island:sea': DINO_SEA,
	'rocket-launch': ROCKET_LAUNCH,
	'rocket-launch:space': ROCKET_SPACE,
	'rocket-launch:boss': ROCKET_BOSS,
	// Lollapascoopza's songs, for the menus: the minigame plays them itself.
	...Object.fromEntries(SONGS.map((song) => [song.id, song.tune])),
}

/** A course with no tune of its own yet gets Haga's. */
export const tuneFor = (id: string) => TUNES[id] ?? TUNES.haga
