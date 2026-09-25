/**
 * The badger loop: an original four-on-the-floor rave riff, in sections that
 * mirror the animation. Twelve members, fika, twelve members, fika, then the
 * race that isn't one.
 */
import type { Song } from '../shared/synth'

const KICK = 'x -'
const HAT = '- x'
const SNARE = '- - x -'

const badgers = (id: string) => ({
	id,
	steps: 24,
	tracks: [
		{
			voice: 'bass' as const,
			pattern:
				'E2 E2 E2 E2 G2 G2 A2 A2 E2 E2 E2 E2 D2 D2 B1 B1 E2 E2 E2 E2 G2 G2 A2 A2',
			gain: 0.28,
			gate: 0.55,
		},
		{
			voice: 'square' as const,
			pattern: 'E4 - - - G4 - A4 - E4 - - - D4 - B3 - E4 - - - G4 - A4 -',
			gain: 0.07,
			gate: 0.5,
		},
		{ voice: 'kick' as const, pattern: KICK, gain: 0.55 },
		{ voice: 'hat' as const, pattern: HAT, gain: 0.07 },
		{ voice: 'snare' as const, pattern: SNARE, gain: 0.22 },
	],
})

const fika = (id: string) => ({
	id,
	steps: 8,
	tracks: [
		{
			voice: 'bass' as const,
			pattern: 'C2 C2 C2 C2 D2 D2 D2 D2',
			gain: 0.28,
			gate: 0.55,
		},
		{
			voice: 'square' as const,
			pattern: 'C5 - E5 - D5 - F#5 -',
			gain: 0.08,
			gate: 0.5,
		},
		{ voice: 'kick' as const, pattern: KICK, gain: 0.55 },
		{ voice: 'hat' as const, pattern: HAT, gain: 0.07 },
		{ voice: 'snare' as const, pattern: SNARE, gain: 0.22 },
	],
})

export const BADGER_SONG: Song = {
	bpm: 140,
	stepsPerBeat: 2,
	sections: [
		badgers('badgers'),
		fika('fika'),
		badgers('badgers2'),
		fika('fika2'),
		{
			id: 'race',
			steps: 16,
			tracks: [
				{
					voice: 'bass',
					pattern: 'A2 A2 A2 A2 B2 B2 B2 B2 C3 C3 C3 C3 D3 D3 D3 D3',
					gain: 0.28,
					gate: 0.55,
				},
				{
					voice: 'sawtooth',
					pattern: 'A4 _ - - B4 _ - - C5 _ - - D5 _ - -',
					gain: 0.06,
					gate: 0.9,
				},
				{ voice: 'kick', pattern: KICK, gain: 0.55 },
				{ voice: 'hat', pattern: HAT, gain: 0.07 },
			],
		},
		{
			id: 'notarace',
			steps: 8,
			tracks: [
				{ voice: 'bass', pattern: 'E2 _ _ _ _ _ _ _', gain: 0.3, gate: 0.95 },
				{
					voice: 'sawtooth',
					pattern: 'E5 _ _ _ _ _ _ _',
					gain: 0.07,
					gate: 0.95,
				},
				{ voice: 'kick', pattern: 'x - - - - - - -', gain: 0.6 },
				{ voice: 'snare', pattern: '- x x x x x x x', gain: 0.18 },
			],
		},
	],
}
