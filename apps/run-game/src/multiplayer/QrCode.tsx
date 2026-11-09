import { renderSVG } from 'uqr'

/** `text` as a QR code, `size` px square, dark on white. */
export function QrCode(props: { text: string; size: number }) {
	const svg = () =>
		renderSVG(props.text, {
			border: 2,
			whiteColor: '#fff',
			blackColor: '#0f1f29',
		})
	return (
		<div
			class="pixelated"
			style={{
				width: `${props.size}px`,
				height: `${props.size}px`,
				'line-height': 0,
			}}
			// The SVG sizes itself to its container.
			innerHTML={svg().replace('<svg ', '<svg width="100%" height="100%" ')}
		/>
	)
}
