/**
 * The ScoopDance tune: an original jaunty whistle-and-banjo number at a
 * hamster's tempo. Whistled melody over an oom-pah bass, offbeat strums,
 * and a brushed kit.
 */
import type { Song } from '../shared/synth'

const MELODY_A =
	'D5 F#5 A5 F#5 D5 F#5 A5 _ B5 A5 F#5 D5 E5 _ - - ' +
	'E5 G5 B5 G5 E5 G5 B5 _ A5 G5 F#5 E5 D5 _ - -'
const MELODY_B =
	'A5 A5 B5 A5 F#5 D5 F#5 A5 B5 _ A5 _ F#5 _ - - ' +
	'G5 G5 A5 G5 E5 C#5 E5 G5 F#5 _ E5 _ D5 _ - -'

// Chords per bar (8 steps): D D G A | D D G A, twice.
const BASS_D = 'D3 - A2 - D3 - A2 -'
const BASS_G = 'G2 - D3 - G2 - D3 -'
const BASS_A = 'A2 - E3 - A2 - E3 -'
const STRUM_D = '- F#4 - F#4 - F#4 - F#4'
const STRUM_G = '- G4 - G4 - G4 - G4'
const STRUM_A = '- E4 - E4 - E4 - E4'

const BASS = [
	BASS_D,
	BASS_D,
	BASS_G,
	BASS_A,
	BASS_D,
	BASS_D,
	BASS_G,
	BASS_A,
].join(' ')
const STRUM = [
	STRUM_D,
	STRUM_D,
	STRUM_G,
	STRUM_A,
	STRUM_D,
	STRUM_D,
	STRUM_G,
	STRUM_A,
].join(' ')

export const DANCE_SONG: Song = {
	bpm: 190,
	stepsPerBeat: 2,
	sections: [
		{
			id: 'main',
			steps: 64,
			tracks: [
				{
					voice: 'whistle',
					pattern: `${MELODY_A} ${MELODY_B}`,
					gain: 0.22,
					gate: 0.9,
				},
				{ voice: 'pluck', pattern: BASS, gain: 0.28, gate: 0.6 },
				{ voice: 'pluck', pattern: STRUM, gain: 0.12, gate: 0.4 },
				{ voice: 'kick', pattern: 'x - - - x - - -', gain: 0.5 },
				{ voice: 'snare', pattern: '- - x - - - x -', gain: 0.25 },
				{ voice: 'hat', pattern: 'x x x x x x x x', gain: 0.08 },
			],
		},
	],
}
