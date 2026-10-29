import bottom from '@/assets/halloween/patch/bottom.png'
import cornerNE from '@/assets/halloween/patch/corner-ne.png'
import cornerNW from '@/assets/halloween/patch/corner-nw.png'
import cornerSE from '@/assets/halloween/patch/corner-se.png'
import cornerSW from '@/assets/halloween/patch/corner-sw.png'
import left from '@/assets/halloween/patch/left.png'
import right from '@/assets/halloween/patch/right.png'
import top from '@/assets/halloween/patch/top.png'
import soil from '@/assets/halloween/pumpkin-patch.png'
import { css } from '@style/css'

/**
 * How deep the ragged strips along each side are, how long before they
 * repeat, and how big the rounded corners are, in px: the sizes
 * `scripts/gen-patch-edges.ts` draws them at.
 */
const EDGE = 8
const STRIP = 97
const CORNER = 24

/** Everything a mask layer needs, as one `mask` shorthand entry. */
function layer(image: string, position: string, size: string, repeat: string) {
	return `${image} ${position} / ${size} ${repeat}`
}

/** A solid block of mask, for the middle that isn't edge. */
const SOLID = 'linear-gradient(#000, #000)'

/** One element's mask, prefixed too for the browsers that still want it. */
function masked(...layers: string[]) {
	const mask = layers.join(', ')
	return { mask, '-webkit-mask': mask }
}

/**
 * Tilled ground for a `DirtBlock`: `pumpkin-patch.png` tiled across the whole
 * block, with its outline cut ragged so it runs out into the grass instead of
 * stopping square. Three masks, one inside the other, each cutting one thing,
 * since masks within one element can only add up: the top and bottom, then the
 * sides, then the corners rounded off. The soil being one background under all
 * three, its furrows run right up to the edge. A dark pixel rim follows
 * whatever shape that leaves, with a shadow under it, like the dirt's.
 */
export function PatchGround() {
	return (
		<div class={styles.ground}>
			<div
				class={styles.fill}
				style={masked(
					layer(`url(${top})`, 'left top', `${STRIP}px ${EDGE}px`, 'repeat-x'),
					layer(
						`url(${bottom})`,
						'left bottom',
						`${STRIP}px ${EDGE}px`,
						'repeat-x',
					),
					layer(
						SOLID,
						'center',
						`100% calc(100% - ${EDGE * 2}px)`,
						'no-repeat',
					),
				)}
			>
				<div
					class={styles.fill}
					style={masked(
						layer(
							`url(${left})`,
							'left top',
							`${EDGE}px ${STRIP}px`,
							'repeat-y',
						),
						layer(
							`url(${right})`,
							'right top',
							`${EDGE}px ${STRIP}px`,
							'repeat-y',
						),
						layer(
							SOLID,
							'center',
							`calc(100% - ${EDGE * 2}px) 100%`,
							'no-repeat',
						),
					)}
				>
					<div
						class={styles.fill}
						style={{
							'background-image': `url(${soil})`,
							...masked(
								layer(
									`url(${cornerNW})`,
									'left top',
									`${CORNER}px`,
									'no-repeat',
								),
								layer(
									`url(${cornerNE})`,
									'right top',
									`${CORNER}px`,
									'no-repeat',
								),
								layer(
									`url(${cornerSW})`,
									'left bottom',
									`${CORNER}px`,
									'no-repeat',
								),
								layer(
									`url(${cornerSE})`,
									'right bottom',
									`${CORNER}px`,
									'no-repeat',
								),
								// Everywhere else: a band across and a band down, which
								// between them cover all but the four corners.
								layer(
									SOLID,
									'center',
									`100% calc(100% - ${CORNER * 2}px)`,
									'no-repeat',
								),
								layer(
									SOLID,
									'center',
									`calc(100% - ${CORNER * 2}px) 100%`,
									'no-repeat',
								),
							),
						}}
					/>
				</div>
			</div>
		</div>
	)
}

const styles = {
	ground: css({
		position: 'absolute',
		inset: 0,
		zIndex: 1,
		// A pixel of dark brown all round, then a shadow beneath.
		filter:
			'drop-shadow(1px 0 0 #3d2315) drop-shadow(-1px 0 0 #3d2315) drop-shadow(0 1px 0 #3d2315) drop-shadow(0 -1px 0 #3d2315) drop-shadow(0 3px 0 rgba(0, 0, 0, 0.15))',
	}),
	fill: css({
		position: 'absolute',
		inset: 0,
	}),
}
