/**
 * The Scoop Bus lounge loop: a slow, smooth, slightly cheesy groove under
 * the announcer, in the spirit of the scratchy soundtrack it nods to.
 * Sixteen bars over Am7, Dm7, G7 and Cmaj7, looped forever.
 */
import type { Song } from '../shared/synth'

const BAR = 8

/** Four bars of a chord, as a pattern of `steps` tokens. */
const hold = (note: string, steps: number) =>
	[note, ...Array<string>(steps - 1).fill('_')].join(' ')

const chord = (root: string, third: string, seventh: string) => ({
	root: hold(root, BAR * 2),
	third: hold(third, BAR * 2),
	seventh: hold(seventh, BAR * 2),
})

const AM = chord('A3', 'C4', 'G4')
const DM = chord('D3', 'F4', 'C4')
const G = chord('G3', 'B3', 'F4')
const C = chord('C4', 'E4', 'B4')

const pad = (pick: (c: typeof AM) => string) =>
	[AM, DM, G, C].map(pick).join(' ')

export const ZOMBO_SONG: Song = {
	bpm: 88,
	stepsPerBeat: 2,
	sections: [
		{
			id: 'loop',
			steps: BAR * 8,
			tracks: [
				{
					voice: 'bass',
					pattern: [
						'A2 - - A2 - - E2 - A2 - - A2 - G2 - -',
						'D2 - - D2 - - A2 - D2 - - D2 - C3 - -',
						'G2 - - G2 - - D2 - G2 - - G2 - F2 - -',
						'C3 - - C3 - - G2 - C3 - - C3 - B2 - -',
					].join(' '),
					gain: 0.26,
					gate: 0.7,
				},
				{ voice: 'sine', pattern: pad((c) => c.root), gain: 0.1, gate: 0.98 },
				{
					voice: 'sine',
					pattern: pad((c) => c.third),
					gain: 0.07,
					gate: 0.98,
				},
				{
					voice: 'triangle',
					pattern: pad((c) => c.seventh),
					gain: 0.045,
					gate: 0.98,
				},
				{
					voice: 'whistle',
					pattern: [
						'- - E5 _ _ - C5 _ - - - - - - - -',
						'- - F5 _ - E5 - D5 _ _ _ - - - - -',
						'- - D5 _ _ - B4 _ - - G4 _ _ - - -',
						'- - C5 _ _ _ _ _ _ _ - - - - - -',
					].join(' '),
					gain: 0.16,
					gate: 0.9,
				},
				{ voice: 'kick', pattern: 'x - - - - - x -', gain: 0.3 },
				{ voice: 'hat', pattern: '- x', gain: 0.045 },
				{ voice: 'snare', pattern: '- - - - x - - -', gain: 0.08 },
			],
		},
	],
}
