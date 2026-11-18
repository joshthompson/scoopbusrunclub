import { letterArt } from './pixelArt'

/** A rock's dark cracks between its stones, its shadowed underside, its face and its lit top. */
const ROCK_CRACK = '#3d3b40'
const ROCK_SHADE = '#514e55'
const ROCK_FACE = '#68656b'
const ROCK_LIT = '#939395'

/**
 * The rock in the way on most courses, two pebbles at its foot: 28 by 15,
 * drawn at twice that, as chunky as the game's other pixel art. It's grey,
 * so each course's `look.rock` filter recolours it.
 */
export const ROCK = {
	asset: letterArt(
		[
			'.......LLL..................',
			'.....LLLLLLLLL..............',
			'....LLLLLLLLLLLLLLL.........',
			'...LLLLLLLLLLLLLLMMMM.......',
			'..MLLLLLLLLLLLLLLLMMMM......',
			'..MMMLLLLLLLLLLLLMMMMMM.....',
			'.MMMMMMMMLLMMMLLMMMMMMM.....',
			'.MMMLLMMMMMMMMMMMLLMMMMLLL..',
			'MMMMMLLMMMMMMMMMMMMMMMoLLLL.',
			'SMMMMMMMMMMMMMMMMMMMMoLLLLMM',
			'SSMMMMMMMMMMLLLLLLMMMoMLLMMM',
			'.SSMMMMMMMMLLLLMMMoMoMMMMMMS',
			'..SSSSSSSSSMMMMMMMSoSSSSSSSS',
			'....SSSSSSoMMMMMMSSo.oSSSSS.',
			'..........oSSSSSSSo.........',
		],
		{ o: ROCK_CRACK, S: ROCK_SHADE, M: ROCK_FACE, L: ROCK_LIT },
	),
	width: 56,
	height: 30,
}

/** How tall a rock is to run into: a pixel shorter than it's drawn, its peak just over the top. */
export const ROCK_BOX_HEIGHT = 29
