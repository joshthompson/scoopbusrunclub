import { css } from '@style/css'

/**
 * Wrapper style for a graph, shared so every graph measures its width the same
 * way. Pair it with `createGraphWidth`'s ref.
 */
export const graphContainer = css({
	width: '100%',
	minWidth: 0,
	position: 'relative',
})

/**
 * The box GraphFrame draws into. It reserves the graph's height and holds the
 * SVG absolutely, which matters more than it looks: the SVG is sized in real
 * pixels from the measured container width, so if it stayed in flow it would
 * give an ancestor grid or flex item (FieldBlock is a grid) an intrinsic width
 * of its own and settle there — leaving the graph stuck too wide to fit on a
 * phone. Out of flow, it contributes no width and the measurement is honest.
 */
export const graphPlot = css({
	position: 'relative',
	width: '100%',
	minWidth: 0,
	touchAction: 'none',
	'& > svg': {
		position: 'absolute',
		top: 0,
		left: 0,
	},
})
