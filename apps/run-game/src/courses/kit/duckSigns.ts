import { svgUrl } from './pixelArt'

/**
 * Signs by a Tunnel's way in, telling whoever's coming to duck: each
 * course's own, to go with it. (The Sewers' is in `sewerScenery`.)
 */

/**
 * A signpost on the sand before the Sphinx's way in: a board on a post,
 * DUCK! on it, and an arrow down, as a guide would put up: 44 by 64.
 */
export const duckPost = svgUrl(
	44,
	64,
	[
		// Its post, and its foot in the sand.
		'<rect x="20" y="30" width="5" height="34" fill="#7a5530"/>',
		'<rect x="16" y="60" width="13" height="4" fill="#c99b55"/>',
		// Its board, planks, bound top and bottom.
		'<rect x="0" y="2" width="44" height="30" fill="#b07a42"/>',
		'<rect x="0" y="12" width="44" height="1" fill="#8a5c2e"/>',
		'<rect x="0" y="22" width="44" height="1" fill="#8a5c2e"/>',
		'<rect x="0" y="0" width="44" height="3" fill="#5a3b1e"/>',
		'<rect x="0" y="31" width="44" height="3" fill="#5a3b1e"/>',
		// DUCK!, and an arrow down, painted.
		'<text x="16" y="21" font-family="monospace" font-weight="bold" font-size="11" text-anchor="middle" fill="#2b1a0c">DUCK!</text>',
		'<rect x="35" y="8" width="3" height="10" fill="#2b1a0c"/>',
		'<polygon points="31,17 42,17 36.5,26" fill="#2b1a0c"/>',
	].join(''),
)
