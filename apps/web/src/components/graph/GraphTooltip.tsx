import { css } from '@style/css'
import type { JSX } from 'solid-js'

/**
 * Tooltip anchored above the graph's hover cursor, clamped to the viewport so
 * it stays readable at either edge. Positioned fixed, outside the SVG, so it
 * can overflow the graph bounds.
 */
export function GraphTooltip(props: {
	/** The graph's SVG element, used to convert local x to page coordinates. */
	svg: SVGSVGElement | undefined
	/** SVG-local x of the cursor. */
	x: number
	/** SVG-local y the tooltip sits above. */
	anchorY: number
	width?: number
	children: JSX.Element
}) {
	const PADDING = 8

	const style = () => {
		const width = props.width ?? 240
		const rect = props.svg?.getBoundingClientRect()
		const left = Math.max(
			PADDING,
			Math.min(
				(rect?.left ?? 0) + props.x - width / 2,
				window.innerWidth - width - PADDING,
			),
		)
		return {
			position: 'fixed' as const,
			left: `${left}px`,
			top: `${(rect?.top ?? 0) + props.anchorY - PADDING}px`,
			width: `${width}px`,
			transform: 'translateY(-100%)',
		}
	}

	return (
		<div class={styles.tooltip} style={style()}>
			{props.children}
		</div>
	)
}

const styles = {
	tooltip: css({
		position: 'fixed',
		background: 'var(--color-black)',
		color: 'var(--color-white)',
		fontSize: '0.75rem',
		fontWeight: 'normal',
		lineHeight: '1.3',
		p: '0.35rem 0.5rem',
		borderRadius: '4px',
		cornerShape: 'notch',
		pointerEvents: 'none',
		zIndex: 1000,
		textAlign: 'center',
		whiteSpace: 'normal',
	}),
}
