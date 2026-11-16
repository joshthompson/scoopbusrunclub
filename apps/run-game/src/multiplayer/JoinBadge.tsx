import type { JSX } from 'solid-js'
import { QrCode } from './QrCode'
import { padLink } from './protocol'

/** How big the badge's QR code is, on the stage: small, but still scans across a room. */
export const JOIN_QR_SIZE = 84

/**
 * How to join, kept in the corner of the big screen once the Room's under
 * way: its QR code and Room Code. Anyone new is in from the next Round, and
 * anyone who's dropped out (a phone that locked, a closed tab) scans it
 * again to get straight back into their seat.
 */
export function JoinBadge(props: { code: string; style?: JSX.CSSProperties }) {
	return (
		<div style={{ ...styles.badge, ...props.style }}>
			<QrCode text={padLink(props.code)} size={JOIN_QR_SIZE} />
			<div style={styles.code}>{props.code}</div>
			<div style={styles.hint}>Scan to join</div>
		</div>
	)
}

const styles = {
	badge: {
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		gap: '3px',
		padding: '5px 5px 4px',
		background: 'var(--ink)',
		color: 'white',
		border: '3px solid white',
		'box-shadow': '0 0 0 2px var(--ink)',
		'font-family': 'var(--font-pixel)',
		'line-height': 1,
		'pointer-events': 'none',
	},
	code: {
		'padding-top': '3px',
		'font-size': '22px',
		'letter-spacing': '3px',
		// The letter spacing's after the last letter too: centred all the same.
		'margin-right': '-3px',
	},
	hint: { 'font-size': '10px', opacity: 0.8 },
} satisfies Record<string, JSX.CSSProperties>
