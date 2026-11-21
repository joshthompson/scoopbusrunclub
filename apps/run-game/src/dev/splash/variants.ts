import { type SoundNotes, notesOf } from '../../sfx'

/**
 * Every splash sound tried so far, and a few ideas, for the dev pages'
 * splash audition (/run/dev/splash) and its blind test
 * (/run/dev/splash-blind). The one in the game is `splash` itself, so it
 * stays whatever `sfx.ts` has now.
 */
export type Variant = SoundNotes & {
	id: string
	name: string
	about: string
	group: 'now' | 'noDrum' | 'earlier' | 'alternative' | 'new'
}

export const GROUPS: Record<Variant['group'], string> = {
	now: 'In the game now',
	noDrum: 'Airier without the drum (tester: “remove drum sound”)',
	earlier: 'Earlier versions',
	alternative: 'Alternatives from last time',
	new: 'New ideas',
}

export const VARIANTS: Variant[] = [
	{
		id: 'current',
		name: 'Airier',
		about:
			'Low bloop, a 1.8 kHz sploosh swelling in, a bright 8 kHz spray lingering, three bubbles.',
		group: 'now',
		...notesOf('splash'),
	},
	{
		id: 'no-drum',
		name: 'Airier, no drum',
		about:
			'The low bloop gone, and the sploosh higher (2.4 kHz) and falling less, so it doesn’t thud: all spray, with the three bubbles.',
		group: 'noDrum',
		volume: 0.16,
		chord: true,
		notes: [
			[2400, 0.5, 'noise', 0.75, 0.6, 0, 0.04],
			[8000, 0.85, 'noise', 0.55, 0.55, 0.03, 0.07],
			[900, 0.06, 'sine', 0.1, 2, 0.14, 0.005],
			[1300, 0.05, 'sine', 0.08, 1.8, 0.22, 0.005],
			[700, 0.07, 'sine', 0.05, 2.2, 0.31, 0.005],
		],
	},
	{
		id: 'soft-plop',
		name: 'Airier, soft plop',
		about:
			'As without the drum, but with a small, quiet plop where the drum was: higher (520 Hz) and over in a tenth of a second.',
		group: 'noDrum',
		volume: 0.16,
		chord: true,
		notes: [
			[520, 0.09, 'sine', 0.25, 1.7, 0, 0.01],
			[2400, 0.5, 'noise', 0.75, 0.6, 0, 0.04],
			[8000, 0.85, 'noise', 0.55, 0.55, 0.03, 0.07],
			[900, 0.06, 'sine', 0.1, 2, 0.14, 0.005],
			[1300, 0.05, 'sine', 0.08, 1.8, 0.22, 0.005],
			[700, 0.07, 'sine', 0.05, 2.2, 0.31, 0.005],
		],
	},
	{
		id: 'spray-only',
		name: 'Airier, spray only',
		about:
			'Nothing but the hiss: the sploosh and the bright spray, no bloop and no bubbles.',
		group: 'noDrum',
		volume: 0.17,
		chord: true,
		notes: [
			[2400, 0.5, 'noise', 0.8, 0.6, 0, 0.04],
			[8000, 0.85, 'noise', 0.6, 0.55, 0.03, 0.07],
		],
	},
	{
		id: 'previous',
		name: 'Previous pick',
		about: 'The same shape, with a darker 4.5 kHz spray and more bloop.',
		group: 'earlier',
		volume: 0.16,
		chord: true,
		notes: [
			[180, 0.18, 'sine', 0.8, 3, 0, 0.01],
			[1800, 0.5, 'noise', 1, 0.4, 0, 0.035],
			[4500, 0.6, 'noise', 0.3, 0.5, 0.05, 0.06],
			[900, 0.06, 'sine', 0.12, 2, 0.14, 0.005],
			[1300, 0.05, 'sine', 0.1, 1.8, 0.22, 0.005],
			[700, 0.07, 'sine', 0.06, 2.2, 0.31, 0.005],
		],
	},
	{
		id: 'whip',
		name: 'The whip',
		about: 'Every hiss starts at full volume instantly, so it cracks.',
		group: 'earlier',
		volume: 0.12,
		chord: true,
		notes: [
			[200, 0.14, 'sine', 1, 3.5],
			[3000, 0.08, 'noise', 1, 1.6],
			[5000, 0.5, 'noise', 0.9, 0.25, 0.02],
			[2500, 0.75, 'noise', 0.35, 0.4, 0.05],
			[1600, 0.05, 'sine', 0.14, 1.8, 0.12],
			[2200, 0.04, 'sine', 0.11, 1.6, 0.19],
			[1300, 0.05, 'sine', 0.08, 2, 0.27],
		],
	},
	{
		id: 'slap',
		name: 'Slap and five bubbles',
		about:
			'Committed on 18 November: a sharp slap, then a run of high bubbles.',
		group: 'earlier',
		volume: 0.12,
		chord: true,
		notes: [
			[140, 0.16, 'sine', 1, 4],
			[2400, 0.06, 'noise', 0.9, 2.5],
			[4200, 0.55, 'noise', 0.7, 0.3, 0.03],
			[1500, 0.04, 'sine', 0.35, 1.8, 0.2],
			[2100, 0.035, 'sine', 0.3, 1.6, 0.29],
			[1200, 0.045, 'sine', 0.3, 2, 0.36],
			[2600, 0.03, 'sine', 0.22, 1.5, 0.45],
			[1700, 0.035, 'sine', 0.18, 1.7, 0.53],
		],
	},
	{
		id: 'original',
		name: 'The original',
		about: 'A falling hiss and a short bloop.',
		group: 'earlier',
		volume: 0.1,
		chord: true,
		notes: [
			[6000, 0.45, 'noise', 1, 0.12],
			[220, 0.12, 'sine', 0.8, 2.2],
		],
	},
	{
		id: 'airier-still',
		name: 'Airier still',
		about: 'A 10 kHz spray lasting a full second, less bloop.',
		group: 'alternative',
		volume: 0.16,
		chord: true,
		notes: [
			[200, 0.16, 'sine', 0.5, 3, 0, 0.01],
			[2200, 0.45, 'noise', 0.65, 0.45, 0, 0.04],
			[10000, 1, 'noise', 0.65, 0.5, 0.03, 0.09],
			[900, 0.06, 'sine', 0.1, 2, 0.14, 0.005],
			[1300, 0.05, 'sine', 0.08, 1.8, 0.22, 0.005],
			[700, 0.07, 'sine', 0.05, 2.2, 0.31, 0.005],
		],
	},
	{
		id: 'airy-light',
		name: 'Airy and light',
		about: 'Mostly spray, a small bloop, two bubbles.',
		group: 'alternative',
		volume: 0.16,
		chord: true,
		notes: [
			[220, 0.12, 'sine', 0.35, 2.8, 0, 0.01],
			[2000, 0.4, 'noise', 0.6, 0.45, 0, 0.04],
			[9000, 0.9, 'noise', 0.6, 0.5, 0.02, 0.08],
			[1100, 0.05, 'sine', 0.08, 1.8, 0.16, 0.005],
			[1500, 0.04, 'sine', 0.06, 1.7, 0.26, 0.005],
		],
	},
	{
		id: 'deeper',
		name: 'Deeper, slower sploosh',
		about: 'A lower 1.2 kHz sploosh that swells in more slowly.',
		group: 'alternative',
		volume: 0.18,
		chord: true,
		notes: [
			[150, 0.22, 'sine', 0.9, 3, 0, 0.015],
			[1200, 0.6, 'noise', 1, 0.45, 0, 0.06],
			[3500, 0.65, 'noise', 0.22, 0.5, 0.08, 0.08],
			[800, 0.07, 'sine', 0.1, 2, 0.18, 0.005],
			[1100, 0.06, 'sine', 0.08, 1.8, 0.28, 0.005],
		],
	},
	{
		id: 'bubblier',
		name: 'Bubblier',
		about: 'Five bubbles coming up through the tail.',
		group: 'alternative',
		volume: 0.16,
		chord: true,
		notes: [
			[200, 0.16, 'sine', 0.8, 3, 0, 0.01],
			[1600, 0.4, 'noise', 0.9, 0.4, 0, 0.03],
			[4000, 0.5, 'noise', 0.25, 0.5, 0.04, 0.05],
			[600, 0.07, 'sine', 0.2, 2.2, 0.08, 0.005],
			[950, 0.06, 'sine', 0.17, 2, 0.15, 0.005],
			[750, 0.07, 'sine', 0.14, 2.1, 0.21, 0.005],
			[1200, 0.05, 'sine', 0.11, 1.8, 0.28, 0.005],
			[850, 0.06, 'sine', 0.08, 2, 0.36, 0.005],
		],
	},
	{
		id: 'belly-flop',
		name: 'Belly flop',
		about:
			'A bigger, heavier hit for falling off a cliff: a deep thump, a long wash, spray raining back down.',
		group: 'new',
		volume: 0.17,
		chord: true,
		notes: [
			[110, 0.28, 'sine', 1, 2.6, 0, 0.008],
			[900, 0.7, 'noise', 1, 0.5, 0, 0.05],
			[6000, 1.1, 'noise', 0.45, 0.45, 0.06, 0.12],
			[600, 0.08, 'sine', 0.12, 2, 0.3, 0.005],
			[850, 0.07, 'sine', 0.1, 1.9, 0.42, 0.005],
			[500, 0.09, 'sine', 0.08, 2.2, 0.55, 0.005],
		],
	},
	{
		id: 'little-plop',
		name: 'Little plop',
		about:
			'Small and quick, for wading in or for someone else: a bloop and a short hiss.',
		group: 'new',
		volume: 0.16,
		chord: true,
		notes: [
			[260, 0.1, 'sine', 0.7, 3, 0, 0.006],
			[2500, 0.25, 'noise', 0.55, 0.45, 0, 0.025],
			[7000, 0.35, 'noise', 0.3, 0.5, 0.02, 0.05],
			[1100, 0.05, 'sine', 0.08, 1.8, 0.12, 0.005],
		],
	},
	{
		id: 'wave-wash',
		name: 'Wave wash',
		about:
			'No bloop: a soft rush that swells and falls away, like diving into the sea.',
		group: 'new',
		volume: 0.16,
		chord: true,
		notes: [
			[1400, 0.8, 'noise', 1, 0.5, 0, 0.12],
			[7000, 1, 'noise', 0.45, 0.4, 0.05, 0.18],
			[160, 0.2, 'sine', 0.35, 2.5, 0, 0.02],
		],
	},
]

/**
 * The blind test's order: shuffled once, and kept, so a number's the same
 * sound for everyone, whenever they open it.
 */
export const BLIND_ORDER = [
	'belly-flop',
	'original',
	'deeper',
	'bubblier',
	'previous',
	'whip',
	'airier-still',
	'airy-light',
	'wave-wash',
	'little-plop',
	'current',
	'slap',
	// Added after the first round, on the end, so 1 to 12 stay the same sounds.
	'soft-plop',
	'spray-only',
	'no-drum',
].map((id) => {
	const variant = VARIANTS.find((v) => v.id === id)
	if (!variant) throw new Error(`No splash variant "${id}"`)
	return variant
})
