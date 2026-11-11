import type { Track } from './synth'

/**
 * The music: one steady beat, always playing, and over it a tune for the
 * menus and one for each course, its own bass line and melody. They all go at
 * the beat's tempo, a bar of 16 steps at a time, so one tune can fade into
 * the next on any bar.
 *
 * Each track is a pattern of one token a step (see `synth.ts`): `C4` a note,
 * `-` a rest, `_` the note before held on. A tune's tracks are written a bar
 * to a line, four bars long; a shorter pattern goes round again to fill it.
 * Change a note, and that's the tune changed.
 */

export const BPM = 128
export const STEPS_PER_BEAT = 4
export const STEPS_PER_BAR = 16

export interface Tune {
	/** How long it is before it goes round again, in bars. */
	bars: number
	tracks: Track[]
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

/** The menus': bright, in C, round and round while you pick. */
const MENU: Tune = {
	bars: 4,
	tracks: [
		{
			voice: 'bass',
			pattern: bars(
				'C2 - C3 - C2 - C3 - C2 - C3 - C2 - C3 -',
				'A1 - A2 - A1 - A2 - A1 - A2 - A1 - A2 -',
				'F1 - F2 - F1 - F2 - F1 - F2 - F1 - F2 -',
				'G1 - G2 - G1 - G2 - G1 - G2 - G1 - G2 -',
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
			),
			gain: 0.045,
			gate: 0.6,
		},
	],
}

/** Each course's, by its id. */
export const TUNES: Record<string, Tune> = {
	menu: MENU,

	// A sunny Saturday morning: G major, skipping along.
	haga: {
		bars: 4,
		tracks: [
			{
				voice: 'bass',
				pattern: bars(
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
				),
				gain: 0.045,
				gate: 0.6,
			},
		],
	},

	// Through the woods: D dorian, a folky pluck.
	huddinge: {
		bars: 4,
		tracks: [
			{
				voice: 'sub',
				pattern: bars(
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
				),
				gain: 0.08,
			},
		],
	},

	// Round the track: E minor, driving.
	kristineberg: {
		bars: 4,
		tracks: [
			{
				voice: 'bass',
				pattern: bars(
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
				),
				gain: 0.045,
				gate: 0.6,
			},
		],
	},

	// The old town: A harmonic minor, on a lute.
	'gamla-stan': {
		bars: 4,
		tracks: [
			{
				voice: 'sub',
				pattern: bars(
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
				),
				gain: 0.08,
			},
		],
	},

	// Across the sand: E Phrygian dominant, a snake charmer's.
	pyramids: {
		bars: 4,
		tracks: [
			{
				voice: 'bass',
				pattern: bars(
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
				),
				gain: 0.045,
				gate: 0.6,
			},
		],
	},

	// Along the wall: C pentatonic, plucked like a guzheng, a bell now and then.
	'great-wall': {
		bars: 4,
		tracks: [
			{
				voice: 'sub',
				pattern: bars(
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
				),
				gain: 0.08,
			},
			{
				voice: 'bell',
				pattern: bars(
					'C6 - - - - - - - - - - - - - - -',
					'- - - - - - - - - - - - - - - -',
				),
				gain: 0.03,
			},
		],
	},

	// Up the mountain: A minor pentatonic, pan pipes over a charango.
	'machu-picchu': {
		bars: 4,
		tracks: [
			{
				voice: 'pluck',
				pattern: bars(
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
				),
				gain: 0.07,
			},
		],
	},

	// Among the graves: D minor, creeping, a bell tolling.
	'halloween-town': {
		bars: 4,
		tracks: [
			{
				voice: 'sub',
				pattern: bars(
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

	// Silly and bouncy: F major, high up.
	'furby-fields': {
		bars: 4,
		tracks: [
			{
				voice: 'square',
				pattern: bars(
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
				),
				gain: 0.03,
				gate: 0.6,
			},
		],
	},

	// Roof to roof at night: A minor sevenths, funky.
	'city-rooftop': {
		bars: 4,
		tracks: [
			{
				voice: 'bass',
				pattern: bars(
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
				),
				gain: 0.03,
				gate: 0.7,
			},
		],
	},

	// Underground: D minor, low and slow, water dripping.
	caves: {
		bars: 4,
		tracks: [
			{
				voice: 'sub',
				pattern: bars(
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
				),
				gain: 0.09,
			},
			{
				voice: 'bell',
				pattern: bars(
					'- - - - - - - - - - - A5 - - - -',
					'- - - - - - - - - - - - - - D6 -',
				),
				gain: 0.035,
			},
		],
	},

	// Down the drain: E minor, a dripping, plodding bass, and a creepy
	// whistle overhead.
	sewers: {
		bars: 4,
		tracks: [
			{
				voice: 'bass',
				pattern: bars(
					'E2 - - E2 - - G2 - E2 - - B1 - - D2 -',
					'E2 - - E2 - - G2 - A2 - - G2 - F#2 -',
					'C2 - - C2 - - E2 - C2 - - G1 - - B1 -',
					'B1 - - B1 - - D#2 - F#2 - - D#2 - B1 -',
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
				),
				gain: 0.08,
			},
			{
				voice: 'whistle',
				pattern: bars(
					'- - - - - - - - - - - - - - E6 -',
					'- - - - - - B5 - - - - - - - - -',
					'- - - - - - - - - - - - - - G6 -',
					'- - - - - - F#5 - - - - - D#6 - -',
				),
				gain: 0.03,
			},
		],
	},
	// On the ferry to Turku: D major, a dansband's, an oom-pah bass and a
	// bouncing tune, as in the dance bar on every crossing.
	'scoop-line': {
		bars: 4,
		tracks: [
			{
				voice: 'bass',
				pattern: bars(
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
	// like the waves and a bright melody gliding over it.
	cliff: {
		bars: 4,
		tracks: [
			{
				voice: 'bass',
				pattern: bars(
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
	// climbing a little higher every bar, and a singing bowl ringing out.
	everest: {
		bars: 4,
		tracks: [
			{
				voice: 'sub',
				pattern: bars(
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
}

/** A course with no tune of its own yet gets Haga's. */
export const tuneFor = (id: string) => TUNES[id] ?? TUNES.haga
