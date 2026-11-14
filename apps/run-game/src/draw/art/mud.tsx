import type { DrawPainting } from 'scoopjs'
import mudAsset from '../../assets/obstacles/mud.png'
import type { Obstacle } from '../../courses/types'
import type { World } from '../../game/world'
import { cachedArt } from '../canvasArt'
import { filtered } from '../paint/css'

/** A puddle of mud, following the ground under it. */

type Mud = Extract<Obstacle, { kind: 'mud' }>

/**
 * Mud's art, `assets/obstacles/mud.png`: its left end, a middle that repeats,
 * and its right end, side by side, in cells twice the size of a screen pixel.
 */
const MUD_CAP = 24
const MUD_TILE = 32
const MUD_ART_HEIGHT = 28
/** How tall a puddle's drawing is, its art's middle row on the Ground's line. */
const MUD_DRAWN = 40 + MUD_ART_HEIGHT

/** How wide a puddle's drawn: whole columns, and both its ends. */
const mudWidth = (o: Mud) => Math.max(2 * MUD_CAP, Math.round(o.width / 4) * 4)

/**
 * How far a puddle's drawing gets out of its box, `o.width` across, for
 * its Draw Hook's `drawReach`: half its art above, as far below, and the
 * whole columns past its right end.
 */
export const mudReach = (o: Mud) => ({
	top: MUD_ART_HEIGHT / 2,
	bottom: MUD_ART_HEIGHT / 2,
	right: Math.max(0, mudWidth(o) - o.width),
})

/**
 * A puddle's art, a column 4 px wide at a time, each on the Ground under it,
 * so the puddle lies along the slope: its ends, and as much of its middle
 * as it takes between them. How wide it's drawn, and each column's `x`, the
 * pixel along the art it's `from`, and how far down it's drawn.
 */
function mudColumns(world: World, o: Mud) {
	const width = mudWidth(o)
	const left = o.x - width / 2
	const top = world.terrain.groundY(o.x) - 20
	const columns: { x: number; from: number; ground: number }[] = []
	for (let x = 0; x < width; x += 4) {
		const from =
			x < MUD_CAP
				? x
				: x >= width - MUD_CAP
					? MUD_CAP + MUD_TILE + x - (width - MUD_CAP)
					: MUD_CAP + ((x - MUD_CAP) % MUD_TILE)
		// Its middle row on the Ground's line, the drawing starting half the art higher.
		const ground = Math.round(world.terrain.groundY(left + x + 2) - top)
		columns.push({ x, from, ground })
	}
	return { width, columns }
}

/**
 * A muddy puddle across the path, its columns drawn onto one canvas, so
 * it's scaled as one picture, without seams between them.
 */
export function MudArt(props: { world: World; obstacle: Mud }) {
	const { width, columns } = mudColumns(props.world, props.obstacle)
	const canvas = (
		<canvas
			width={width}
			height={MUD_DRAWN}
			style={{
				display: 'block',
				'margin-top': `${-MUD_ART_HEIGHT / 2}px`,
				'image-rendering': 'pixelated',
			}}
		/>
	) as HTMLCanvasElement
	const art = new Image()
	art.onload = () => {
		const context = canvas.getContext('2d')
		if (!context) return
		context.imageSmoothingEnabled = false
		// The art's in cells of 2 px: half as many of its own pixels.
		for (const { x, from, ground } of columns)
			context.drawImage(
				art,
				from / 2,
				0,
				2,
				MUD_ART_HEIGHT / 2,
				x,
				ground,
				4,
				MUD_ART_HEIGHT,
			)
	}
	art.src = mudAsset
	return canvas
}

/**
 * `MudArt`, painted in a Draw Hook, from (0, 0) of `ctx`, recoloured by
 * `filter` (the course's, over the mud) as the page's `filter` does it: put
 * together once, and kept.
 */
export function paintMud(
	ctx: CanvasRenderingContext2D,
	image: DrawPainting['image'],
	world: World,
	o: Mud,
	filter: string | undefined,
) {
	const loaded = image(mudAsset)
	if (!loaded) return
	const width = mudWidth(o)
	const art = cachedArt(
		`mud:${o.x}:${o.width}:${filter ?? ''}`,
		width,
		MUD_DRAWN,
		(art) => {
			art.imageSmoothingEnabled = false
			const mud = filtered(mudAsset, loaded, filter)
			const { columns } = mudColumns(world, o)
			// Its pixels, wherever `filtered` has put them, at its density.
			const at = (n: number) => (mud.pad + n) * mud.density
			for (const { x, from, ground } of columns)
				art.drawImage(
					mud.art,
					at(from / 2),
					at(0),
					2 * mud.density,
					(MUD_ART_HEIGHT / 2) * mud.density,
					x,
					ground,
					4,
					MUD_ART_HEIGHT,
				)
		},
		// Pixel art, as the page draws it: a pixel of its canvas to each of
		// the page's, so no sharper for the screen's density.
		1,
	)
	ctx.drawImage(art, 0, -MUD_ART_HEIGHT / 2, width, MUD_DRAWN)
}
