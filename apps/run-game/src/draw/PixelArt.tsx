/**
 * One of the game's pictures, drawn `width` by `height` on the screen: pixel
 * art, so scaled up without blurring. Most are drawn a cell to a pixel, and
 * shown at twice that, the same as the runners.
 */
export function PixelArt(props: {
	src: string
	width: number
	height: number
}) {
	return (
		<img
			src={props.src}
			alt=""
			width={props.width}
			height={props.height}
			class="pixelated"
			draggable={false}
			style={{ display: 'block' }}
		/>
	)
}
