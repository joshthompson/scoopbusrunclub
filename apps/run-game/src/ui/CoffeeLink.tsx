import type { JSX } from 'solid-js'
import { letterArt } from '../courses/kit/pixelArt'
import { play } from '../sfx'

const LINK = 'https://buymeacoffee.com/joshandalisa'

const INK = '#0d0c22'
/** The menus' yellow, not Buy Me a Coffee's, to sit with Back. */
const YELLOW = '#ffd23f'

/**
 * Buy Me a Coffee's cup, in pixels: its domed lid, a rim wider than the cup,
 * and the cup tapering down, white coffee sloshing in it under the lid. 18
 * by 24, drawn a pixel a cell to fit a menu item's line.
 */
const CUP = letterArt(
	[
		'......KKKKKK......',
		'....KKYYYYYYKK....',
		'...KYYYYYYYYYYK...',
		'..KKKKKKKKKKKKKK..',
		'.KYYYYYYYYYYYYYYK.',
		'.KYYYYYYYYYYYYYYK.',
		'.KKKKKKKKKKKKKKKK.',
		'..KYYYYYYYYYYYYK..',
		'..KYYYYYYYYYYYYK..',
		'..KYYYYYYYYYWWWK..',
		'..KWWWWYYWWWWWWK..',
		'..KWWWWWWWWWWWWK..',
		'...KWWWWWWWWWWK...',
		'...KWWWWWWWWWWK...',
		'...KWWWWWWWWWWK...',
		'...KWWWWWWWWWWK...',
		'...KWWWWWWWWWWK...',
		'...KWWWWWWWWWWK...',
		'....KWWWWWWWWK....',
		'....KWWWWWWWWK....',
		'....KWWWWWWWWK....',
		'....KWWWWWWWWK....',
		'....KWWWWWWWWK....',
		'....KKKKKKKKKK....',
	],
	{ K: INK, Y: YELLOW, W: 'white' },
)

/**
 * A link to Josh's Buy Me a Coffee page, the size and colour of a menu's
 * picked item (Back, under it), the cup where its arrow would be.
 */
export function CoffeeLink() {
	return (
		<a
			href={LINK}
			target="_blank"
			rel="noopener noreferrer"
			style={styles.button}
			onClick={() => play('select')}
		>
			<img
				src={CUP}
				alt=""
				width={18}
				height={24}
				class="pixelated"
				draggable={false}
				style={styles.cup}
			/>
			Buy me a coffee
		</a>
	)
}

const styles = {
	// As `Menu`'s item, picked.
	button: {
		display: 'flex',
		'align-items': 'center',
		gap: '10px',
		padding: '4px 16px 4px 8px',
		background: YELLOW,
		color: 'var(--ink)',
		border: '3px solid white',
		'box-shadow': '2px 2px 0 #b33a2a',
		'font-family': 'var(--font-pixel)',
		'font-size': '24px',
		'line-height': 1,
		'white-space': 'nowrap',
		'text-decoration': 'none',
	},
	// In the arrow's 22 px slot.
	cup: {
		display: 'block',
		margin: '0 2px',
	},
} satisfies Record<string, JSX.CSSProperties>
