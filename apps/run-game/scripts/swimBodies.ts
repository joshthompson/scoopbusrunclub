/**
 * Everyone's body, arms off, for their dive and swim poses (see
 * `make-swims.ts`): their stand pose, its arms cleared off and what they
 * hung over filled back in, by hand. Colours are written as letters,
 * lettered as they first come in the stand pose, row by row, left to
 * right (`a` the first, `b` the next).
 */
export interface Body {
	who: string
	/** Their stand pose, and where their dive and two swim frames go: in `src/assets`. */
	stand: string
	dive: string
	swim: [string, string]
	/** Their body drawn whole, row by row, in place of the stand pose. */
	grid?: string[]
	/** What's cleared off it, their arms: rows and columns, both ends in. */
	clear?: { rows: [number, number]; cols: [number, number] }[]
	/** Then filled back in: a row, from and to (both in), and its colour. */
	fill?: [row: number, from: number, to: number, colour: string][]
	/** Their arms, as they're drawn back on; none, if they've none. */
	arms:
		| false
		| {
				skin: string
				/** Their sleeves, and how far down their arms they come: all the way to the hand, if `LONG`. */
				sleeve?: string
				sleeveLength?: number
				/** A band at the wrist. */
				wrist?: string
				/** How long their hand is, at the end of the arm (1, if not said). */
				hand?: number
				/** How thick their arms are (1, if not said), and the shade of the lines after the first. */
				width?: number
				shade?: string
				/** Where their shoulders are, near and far, if not either end of their top row of shirt. */
				from?: [near: number, far: number]
				/** Their far arm left as it stands: holding on to something. */
				far?: false
		  }
	/** Their head: its top row, and its left and right, which the arms go up either side of. */
	head: { top: number; left: number; right: number }
	/** The top row of their shirt: their shoulders. */
	shoulder: number
	/**
	 * Their legs that kick, swimming: from a row (to another, if not to
	 * the bottom), between two columns, each frame kicked over this many
	 * columns to the left (back towards the front of them).
	 */
	legs: {
		top: number
		bottom?: number
		cols: [number, number]
		by: [number, number]
	}[]
	/** How long their arms are, swimming, reaching ahead or back. */
	reach: number
}

/** A member: their pictures by name. */
const member = (
	who: string,
	body: Omit<Body, 'who' | 'stand' | 'dive' | 'swim'>,
): Body => ({
	who,
	stand: `stand/${who}.png`,
	dive: `dive/${who}.png`,
	swim: [`swim/${who}-1.png`, `swim/${who}-2.png`],
	...body,
})

/** A bonus runner: their pictures in their own folder. */
const bonus = (
	who: string,
	body: Omit<Body, 'who' | 'stand' | 'dive' | 'swim'>,
): Body => ({
	who,
	stand: `runners/${who}/stand.png`,
	dive: `runners/${who}/dive.png`,
	swim: [`runners/${who}/swim-1.png`, `runners/${who}/swim-2.png`],
	...body,
})

/** The members' stand poses' arms: a hand forward and an arm down their back, over rows 8 to 15. */
const ARMS = {
	rows: [8, 15] as [number, number],
	cols: [5, 16] as [number, number],
}
/** Their shirt, rows `from` to `to`, columns `left` to `right`. */
const shirt = (
	from: number,
	to: number,
	left: number,
	right: number,
	letter: string,
) =>
	Array.from(
		{ length: to - from + 1 },
		(_, i): [number, number, number, string] => [from + i, left, right, letter],
	)
/** Sleeves all the way down to the hand. */
const LONG = 99
/** The members' legs: the far one from row 21, kicked over to the near one and back. */
const legs = (
	top = 21,
	cols: [number, number] = [11, 13],
	by: [number, number] = [1, 3],
) => [{ top, cols, by }]

export const BODIES: Body[] = [
	member('adam', {
		clear: [{ rows: [8, 16], cols: [5, 16] }],
		fill: [...shirt(8, 11, 8, 13, 'd'), ...shirt(12, 16, 8, 12, 'd')],
		arms: { skin: 'b', sleeve: 'd', sleeveLength: 2 },
		head: { top: 1, left: 8, right: 11 },
		shoulder: 8,
		legs: legs(22, [12, 13]),
		reach: 9,
	}),
	member('alisa', {
		clear: [ARMS],
		fill: [...shirt(8, 9, 9, 13, 'e'), ...shirt(10, 15, 9, 12, 'e')],
		arms: { skin: 'f', sleeve: 'e', sleeveLength: LONG },
		head: { top: 1, left: 9, right: 12 },
		shoulder: 8,
		legs: legs(),
		reach: 9,
	}),
	member('anna', {
		clear: [ARMS],
		fill: [
			...shirt(8, 8, 8, 13, 'e'),
			...shirt(9, 10, 7, 13, 'e'),
			...shirt(11, 15, 7, 12, 'e'),
		],
		arms: { skin: 'b', sleeve: 'e', sleeveLength: LONG },
		head: { top: 1, left: 8, right: 11 },
		shoulder: 8,
		legs: legs(),
		reach: 9,
	}),
	member('august', {
		// Without his buggy, in the sea: just him, stood straight.
		grid: [
			'..........aa...........',
			'.........aaaa..........',
			'.........bbba..........',
			'.........bbbc..........',
			'.........cccc..........',
			'.........cdcc..........',
			'..........ccb..........',
			'..........ebe..........',
			'.........eeeee.........',
			'.........eeeee.........',
			'.........eeeee.........',
			'.........eeeee.........',
			'.........eeeee.........',
			'.........eeeee.........',
			'.........eeeee.........',
			'.........eeeee.........',
			'.........eeeee.........',
			'........ffffff.........',
			'........ffffff.........',
			'........ffffff.........',
			'........ff..ff.........',
			'........ff..ff.........',
			'........ff..ff.........',
			'........ff..ff.........',
			'........ff..ff.........',
			'........ff..ff.........',
			'........ff..ff.........',
			'........ff..ff.........',
			'.......eee.eee.........',
			'.......eee.eee.........',
		],
		arms: { skin: 'b', sleeve: 'e', sleeveLength: 1 },
		head: { top: 0, left: 9, right: 12 },
		shoulder: 8,
		legs: legs(20, [11, 13], [1, 2]),
		reach: 9,
	}),
	member('claire', {
		clear: [ARMS],
		fill: [
			...shirt(8, 8, 8, 13, 'b'),
			...shirt(9, 10, 7, 13, 'b'),
			...shirt(11, 15, 7, 12, 'b'),
		],
		arms: { skin: 'c', sleeve: 'b', sleeveLength: LONG },
		head: { top: 1, left: 8, right: 11 },
		shoulder: 8,
		legs: legs(20),
		reach: 9,
	}),
	member('eline', {
		clear: [ARMS],
		fill: [...shirt(8, 9, 9, 13, 'd'), ...shirt(10, 15, 9, 12, 'd')],
		arms: { skin: 'e', sleeve: 'd', sleeveLength: 1 },
		head: { top: 1, left: 9, right: 12 },
		shoulder: 8,
		legs: legs(),
		reach: 9,
	}),
	member('josh', {
		// A vest: his arms bare from the shoulder.
		clear: [ARMS],
		fill: shirt(8, 15, 8, 12, 'e'),
		arms: { skin: 'b' },
		head: { top: 1, left: 8, right: 11 },
		shoulder: 8,
		legs: legs(),
		reach: 9,
	}),
	member('keith', {
		clear: [ARMS],
		fill: shirt(8, 15, 8, 12, 'd'),
		arms: { skin: 'b', sleeve: 'e', sleeveLength: 2 },
		head: { top: 0, left: 7, right: 10 },
		shoulder: 8,
		legs: legs(),
		reach: 9,
	}),
	member('lyra', {
		// Little: her hand forward, off her dress.
		clear: [{ rows: [19, 20], cols: [5, 14] }],
		fill: shirt(19, 20, 8, 11, 'c'),
		arms: { skin: 'b', sleeve: 'c', sleeveLength: 2 },
		head: { top: 11, left: 8, right: 11 },
		shoulder: 18,
		legs: legs(26, [11, 13], [1, 2]),
		reach: 7,
	}),
	member('mikael', {
		clear: [ARMS],
		fill: [
			...shirt(8, 8, 9, 12, 'd'),
			...shirt(9, 10, 9, 13, 'd'),
			...shirt(11, 15, 9, 12, 'd'),
		],
		arms: { skin: 'b', sleeve: 'd', sleeveLength: 2 },
		head: { top: 1, left: 9, right: 12 },
		shoulder: 8,
		legs: legs(20),
		reach: 9,
	}),
	member('otherJosh', {
		clear: [ARMS],
		// His shirt, faded down it, a shade a row.
		fill: [
			...shirt(8, 9, 8, 13, 'e'),
			[10, 8, 12, 'f'],
			[11, 8, 12, 'g'],
			[12, 8, 12, 'h'],
			[13, 8, 12, 'i'],
			[14, 8, 12, 'j'],
			[15, 8, 12, 'k'],
		],
		arms: { skin: 'b', sleeve: 'e', sleeveLength: 2 },
		head: { top: 1, left: 8, right: 11 },
		shoulder: 8,
		legs: legs(),
		reach: 9,
	}),
	member('rick', {
		clear: [ARMS],
		fill: [
			...shirt(8, 8, 9, 12, 'e'),
			...shirt(9, 10, 9, 13, 'e'),
			...shirt(11, 15, 9, 12, 'e'),
		],
		arms: { skin: 'b', sleeve: 'e', sleeveLength: 2 },
		head: { top: 1, left: 9, right: 12 },
		shoulder: 8,
		legs: legs(),
		reach: 9,
	}),
	member('sophie', {
		clear: [ARMS],
		// Her shirt, its logo kept.
		fill: [
			...shirt(8, 9, 9, 13, 'd'),
			[10, 9, 9, 'd'],
			[10, 10, 11, 'e'],
			[10, 12, 13, 'd'],
			...shirt(11, 15, 9, 12, 'd'),
		],
		arms: { skin: 'f', sleeve: 'd', sleeveLength: 1 },
		head: { top: 1, left: 9, right: 12 },
		shoulder: 8,
		legs: legs(),
		reach: 9,
	}),

	bonus('banana-girl', {
		// Her near arm, down the front of her suit, a banana-yellow sleeve.
		clear: [{ rows: [13, 19], cols: [5, 5] }],
		arms: { skin: 'g', sleeve: 'k', sleeveLength: LONG, from: [6, 15] },
		head: { top: 0, left: 6, right: 16 },
		shoulder: 12,
		legs: [{ top: 22, cols: [12, 14], by: [1, 2] }],
		reach: 9,
	}),
	bonus('bat-person', {
		// His near arm, bare, two wide; his bat stays perched on his far shoulder.
		clear: [
			{ rows: [8, 9], cols: [5, 6] },
			{ rows: [10, 15], cols: [3, 5] },
		],
		arms: { skin: 'd', width: 2, shade: 'g', from: [7, 13] },
		head: { top: 0, left: 6, right: 12 },
		shoulder: 8,
		legs: [{ top: 21, cols: [11, 16], by: [1, 2] }],
		reach: 9,
	}),
	bonus('bonnie-bottle', {
		// Her arms off the front of her: the bottle filled back in behind
		// them, the drink, its label, its orange stripe and bolt, its grip.
		clear: [{ rows: [9, 18], cols: [7, 14] }],
		fill: [
			[9, 7, 7, 'l'],
			[9, 8, 13, 'm'],
			[9, 14, 14, 'o'],
			[10, 7, 7, 'l'],
			[10, 8, 11, 'm'],
			[10, 12, 12, 'l'],
			[10, 13, 14, 'o'],
			[11, 7, 13, 'r'],
			[11, 14, 14, 's'],
			[12, 7, 10, 't'],
			[12, 11, 11, 'u'],
			[12, 12, 14, 't'],
			[13, 7, 13, 'r'],
			[13, 14, 14, 's'],
			[14, 8, 12, 'l'],
			[14, 13, 13, 'o'],
			[15, 8, 12, 'l'],
			[15, 13, 13, 'o'],
			[16, 7, 7, 'l'],
			[16, 8, 10, 'm'],
			[16, 11, 12, 'l'],
			[16, 13, 14, 'o'],
			[17, 7, 7, 'l'],
			[17, 8, 10, 'm'],
			[17, 11, 12, 'l'],
			[17, 13, 14, 'o'],
			[18, 8, 12, 'o'],
			[18, 13, 13, 'v'],
		],
		// Strong arms, two wide, her pink wristbands on.
		arms: { skin: 'p', width: 2, shade: 'q', wrist: 'e', from: [8, 13] },
		head: { top: 0, left: 7, right: 14 },
		shoulder: 9,
		legs: [{ top: 19, cols: [10, 12], by: [-1, 1] }],
		reach: 9,
	}),
	bonus('bushy', {
		// His near arm, a branch, its white glove; his far one keeps hold
		// of his flag, always.
		clear: [{ rows: [20, 22], cols: [5, 7] }],
		fill: [
			[16, 8, 8, 'x'],
			[17, 7, 7, 'x'],
			[18, 7, 7, 'x'],
			[19, 7, 7, 'y'],
		],
		arms: {
			skin: 'k',
			hand: 2,
			sleeve: 'l',
			sleeveLength: LONG,
			far: false,
			from: [6, 15],
		},
		head: { top: 1, left: 2, right: 17 },
		shoulder: 14,
		legs: [{ top: 21, cols: [11, 13], by: [-1, 1] }],
		reach: 10,
	}),
	bonus('det-munch', {
		// Her magnifying glass put away, and the hand that held it.
		clear: [
			{ rows: [10, 15], cols: [0, 7] },
			{ rows: [16, 16], cols: [0, 6] },
		],
		arms: {
			skin: 'b',
			sleeve: 'o',
			sleeveLength: LONG,
			width: 2,
			shade: 'p',
			from: [9, 20],
		},
		head: { top: 0, left: 3, right: 16 },
		shoulder: 10,
		legs: [{ top: 23, cols: [13, 17], by: [-1, 1] }],
		reach: 10,
	}),
	bonus('furby-queen', {
		// Her hand, out of her robe, put back in it.
		fill: [
			[14, 7, 7, 'm'],
			[15, 7, 7, 'm'],
			[16, 7, 7, 'm'],
		],
		arms: { skin: 'p', sleeve: 'l', sleeveLength: LONG, from: [7, 15] },
		head: { top: 0, left: 3, right: 16 },
		shoulder: 14,
		legs: [{ top: 21, bottom: 26, cols: [11, 12], by: [1, 2] }],
		reach: 9,
	}),
	bonus('hatchling', {
		// An egg, no arms: it dives as it stands, and swims with its legs,
		// a frog's kick, out and in.
		arms: false,
		head: { top: 3, left: 5, right: 17 },
		shoulder: 8,
		legs: [
			{ top: 16, bottom: 17, cols: [2, 5], by: [0, -1] },
			{ top: 18, cols: [2, 7], by: [0, -1] },
			{ top: 16, bottom: 17, cols: [17, 21], by: [0, 1] },
			{ top: 18, cols: [16, 21], by: [0, 1] },
		],
		reach: 0,
	}),
	bonus('ms-crocodile', {
		// Her arms, green, down either side of her.
		clear: [
			{ rows: [9, 16], cols: [7, 7] },
			{ rows: [9, 12], cols: [13, 13] },
		],
		arms: { skin: 'i', sleeve: 'a', sleeveLength: LONG, from: [8, 12] },
		head: { top: 0, left: 3, right: 13 },
		shoulder: 9,
		legs: [{ top: 21, bottom: 26, cols: [11, 12], by: [1, 2] }],
		reach: 9,
	}),
	bonus('skeleton', {
		// Its arm bones, down either side of its ribs.
		clear: [
			{ rows: [9, 14], cols: [7, 7] },
			{ rows: [15, 16], cols: [6, 6] },
			{ rows: [9, 14], cols: [14, 14] },
			{ rows: [15, 16], cols: [15, 15] },
		],
		arms: { skin: 'a' },
		// A gap either side of its skull, so its arm bones show up apart from it.
		head: { top: 0, left: 7, right: 12 },
		shoulder: 8,
		legs: [{ top: 19, cols: [11, 13], by: [1, 2] }],
		reach: 9,
	}),
	bonus('spirit-of-jazz', {
		// His near arm, down his pinstripes; his hands as pale as his face.
		clear: [{ rows: [9, 16], cols: [7, 7] }],
		arms: { skin: 'b', sleeve: 'g', sleeveLength: LONG, from: [8, 12] },
		head: { top: 1, left: 8, right: 12 },
		shoulder: 9,
		legs: [{ top: 21, bottom: 26, cols: [11, 12], by: [1, 2] }],
		reach: 9,
	}),
	bonus('the-miner', {
		// Two of them in one shirt, and no arms: they dive as they stand,
		// and swim kicking.
		arms: false,
		head: { top: 1, left: 8, right: 28 },
		shoulder: 10,
		legs: [
			{ top: 21, bottom: 26, cols: [11, 12], by: [-1, 1] },
			{ top: 21, bottom: 26, cols: [25, 26], by: [-1, 1] },
		],
		reach: 0,
	}),
	bonus('viking', {
		// His axe put away, and the hand that held it, its bracer and
		// forearm; his tunic and belt filled back in. His shield stays on
		// his back.
		clear: [
			{ rows: [12, 28], cols: [0, 4] },
			{ rows: [16, 16], cols: [5, 7] },
			{ rows: [17, 17], cols: [5, 5] },
		],
		fill: [
			[12, 9, 10, 'j'],
			[13, 8, 9, 'j'],
			[14, 6, 9, 'j'],
			[15, 6, 8, 'j'],
			[16, 6, 7, 'c'],
		],
		arms: { skin: 'd', sleeve: 'j', sleeveLength: 3, from: [6, 13] },
		head: { top: 1, left: 4, right: 12 },
		shoulder: 9,
		legs: [{ top: 20, cols: [10, 13], by: [-1, 1] }],
		reach: 9,
	}),
	bonus('yeti', {
		// His great arms, either side of him: his chest filled back in.
		clear: [{ rows: [7, 18], cols: [3, 18] }],
		fill: [
			...shirt(7, 15, 7, 13, 'b'),
			...shirt(7, 15, 14, 14, 'c'),
			[16, 7, 11, 'b'],
			[16, 12, 14, 'c'],
			[17, 7, 10, 'b'],
			[17, 11, 14, 'c'],
			[18, 7, 14, 'c'],
		],
		arms: {
			skin: 'd',
			hand: 2,
			sleeve: 'b',
			sleeveLength: LONG,
			width: 3,
			shade: 'c',
			from: [7, 14],
		},
		head: { top: 0, left: 5, right: 11 },
		shoulder: 7,
		legs: [{ top: 19, cols: [11, 16], by: [1, 3] }],
		reach: 9,
	}),
]
