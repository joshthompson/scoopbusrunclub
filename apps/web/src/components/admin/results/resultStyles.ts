/**
 * Shared styling for the results pages.
 *
 * One object rather than per-component styles because the scrape panel, the
 * extracted-data view and the advanced upload form all sit inside the same
 * DirtBlock and need to look like one thing.
 */
import { css, cva } from '@style/css'

export const styles = {
	container: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '1.5rem',
	}),
	sectionTitle: css({
		fontSize: '1.25rem',
		fontWeight: 'bold',
		textTransform: 'uppercase',
		letterSpacing: '0.05em',
		m: 0,
		marginBottom: '0.5rem',
	}),
	intro: css({
		fontSize: '0.85rem',
		opacity: 0.8,
		m: 0,
		marginBottom: '1rem',
	}),
	groupTitle: css({
		fontSize: '1rem',
		fontWeight: 'bold',
		textTransform: 'uppercase',
		letterSpacing: '0.05em',
		m: 0,
		marginTop: '1.5rem',
		paddingTop: '0.75rem',
		borderTop: '1px solid var(--overlay-black-20)',
	}),
	/** Secondary half of a section heading, e.g. "of 40 run". */
	groupTitleMuted: css({
		fontWeight: 'normal',
		opacity: 0.6,
		textTransform: 'none',
		letterSpacing: 'normal',
	}),
	groupHint: css({
		fontSize: '0.75rem',
		opacity: 0.65,
		m: 0,
		marginBottom: '0.5rem',
	}),
	row: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '0.25rem',
		padding: '0.5rem 0',
		borderBottom: '1px solid var(--overlay-black-12)',
	}),
	rowHead: css({
		display: 'flex',
		alignItems: 'baseline',
		gap: '0.5rem',
		flexWrap: 'wrap',
	}),
	rowLabel: css({
		fontWeight: 'bold',
		fontSize: '0.9rem',
	}),
	rowLabelLink: css({
		fontWeight: 'bold',
		fontSize: '0.9rem',
		color: 'inherit',
		textDecoration: 'none',
		display: 'inline-flex',
		alignItems: 'baseline',
		gap: '0.25rem',
		_hover: { textDecoration: 'underline' },
	}),
	externalIcon: css({
		fontSize: '0.75rem',
		opacity: 0.6,
	}),
	rowSublabel: css({
		fontSize: '0.7rem',
		opacity: 0.6,
	}),
	rowControls: css({
		display: 'flex',
		alignItems: 'center',
		gap: '0.75rem',
		flexWrap: 'wrap',
	}),
	/** Styled to match AdminButton, since it stands in for one. */
	fileButton: cva({
		base: {
			flexShrink: 0,
			display: 'inline-flex',
			alignItems: 'center',
			padding: '0.3rem 0.9rem',
			border: '3px double var(--color-black)',
			borderRadius: '4px',
			cornerShape: 'notch',
			background: 'var(--overlay-black-15)',
			color: 'var(--color-white)',
			fontWeight: 'bold',
			fontSize: '0.7rem',
			textTransform: 'uppercase',
			letterSpacing: '0.03em',
			cursor: 'pointer',
			_hover: { background: 'var(--overlay-black-25)' },
			// The real input is invisible but still focusable, so show focus here.
			'&:focus-within': { background: 'var(--overlay-black-25)' },
		},
		variants: {
			disabled: {
				true: { opacity: 0.4, cursor: 'default', pointerEvents: 'none' },
			},
		},
	}),
	hiddenFileInput: css({
		position: 'absolute',
		width: '1px',
		height: '1px',
		opacity: 0,
		pointerEvents: 'none',
	}),
	/** Fixed width so the Skip box doesn't shift as filenames change. */
	fileName: cva({
		base: {
			flex: '0 1 26ch',
			minWidth: 0,
			fontSize: '0.75rem',
			textAlign: 'left',
			overflow: 'hidden',
			whiteSpace: 'nowrap',
		},
		variants: {
			empty: {
				true: { opacity: 0.5, fontStyle: 'italic' },
			},
		},
	}),
	rowStatus: css({
		fontSize: '0.75rem',
		m: 0,
		opacity: 0.85,
		textAlign: 'left',
	}),
	rowWarning: css({
		fontSize: '0.75rem',
		m: 0,
		color: 'var(--color-white)',
		opacity: 0.75,
		textAlign: 'left',
	}),
	rowError: css({
		fontSize: '0.75rem',
		m: 0,
		fontWeight: 'bold',
		color: 'var(--error-red)',
		textAlign: 'left',
	}),
	actions: css({
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: '1rem',
		flexWrap: 'wrap',
		marginTop: '1.5rem',
	}),
	actionButtons: css({
		display: 'flex',
		alignItems: 'center',
		gap: '0.75rem',
		marginLeft: 'auto',
	}),
	gateHint: css({
		fontSize: '0.75rem',
		opacity: 0.6,
		m: 0,
		marginTop: '0.5rem',
		textAlign: 'right',
	}),
	loading: css({
		textAlign: 'center',
		padding: '1rem',
	}),
	table: css({
		width: '100%',
		borderCollapse: 'collapse',
		marginTop: '0.5rem',
		'& th, & td': {
			padding: '0.375rem 0.5rem',
			textAlign: 'left',
			borderBottom: '1px solid var(--overlay-black-12)',
		},
		'& th': {
			fontWeight: 'bold',
			fontSize: '0.7rem',
			textTransform: 'uppercase',
			letterSpacing: '0.05em',
		},
		'& td': {
			fontSize: '0.8rem',
		},
	}),
	/** A row carrying something the database doesn't have yet. */
	newRow: css({
		fontWeight: 'bold',
		background: 'var(--overlay-black-10)',
	}),
	highlight: css({
		fontWeight: 'bold',
	}),
	highlightRow: css({
		fontWeight: 'bold',
		background: 'var(--overlay-black-15)',
	}),
	chips: css({
		display: 'flex',
		flexWrap: 'wrap',
		gap: '0.375rem',
		m: 0,
		marginTop: '0.5rem',
	}),
	chip: css({
		fontSize: '0.7rem',
		padding: '0.125rem 0.5rem',
		borderRadius: '3px',
		background: 'var(--overlay-black-15)',
	}),
	chipNew: css({
		fontSize: '0.7rem',
		fontWeight: 'bold',
		padding: '0.125rem 0.5rem',
		borderRadius: '3px',
		background: 'var(--overlay-black-25)',
		border: '1px solid var(--overlay-white-30)',
	}),
	subBlock: css({
		marginTop: '0.75rem',
		textAlign: 'left',
	}),
	subTitle: css({
		fontSize: '0.8rem',
		fontWeight: 'bold',
		m: 0,
	}),
	list: css({
		fontSize: '0.8rem',
		margin: '0.25rem 0 0',
		paddingLeft: '1.25rem',
		textAlign: 'left',
		'& li': { marginBottom: '0.125rem' },
	}),
	emptyState: css({
		fontSize: '0.75rem',
		opacity: 0.6,
		m: 0,
	}),

	// --- Scraper extension run ---

	topBar: css({
		display: 'flex',
		alignItems: 'center',
		gap: '1rem',
		flexWrap: 'wrap',
		justifyContent: 'center',
		padding: '0.75rem 0',
		borderTop: '1px solid var(--overlay-black-20)',
		borderBottom: '1px solid var(--overlay-black-20)',
	}),
	topBarHint: css({
		fontSize: '0.75rem',
		opacity: 0.7,
		m: 0,
		maxWidth: '48ch',
		textAlign: 'left',
	}),
	/** Numbered setup instructions on the install-the-extension state. */
	steps: css({
		textAlign: 'left',
		maxWidth: '60ch',
		margin: '0 auto 1rem',
		paddingLeft: '1.5rem',
		fontSize: '0.85rem',
		listStyle: 'decimal',
		listStylePosition: 'outside',
		'& li': { marginBottom: '0.35rem' },
		'& code': {
			background: 'var(--overlay-black-15)',
			padding: '0.05rem 0.3rem',
			borderRadius: '3px',
		},
	}),
	advancedLink: css({
		fontSize: '0.75rem',
		m: 0,
		marginTop: '0.75rem',
		'& a': {
			color: 'inherit',
			opacity: 0.75,
			_hover: { opacity: 1 },
		},
	}),
	advancedButton: css({
		display: 'inline-block',
		padding: '0.5rem 1.25rem',
		border: '3px double var(--color-black)',
		borderRadius: '4px',
		cornerShape: 'notch',
		background: 'var(--overlay-black-7)',
		color: 'var(--color-white)',
		textDecoration: 'none',
		fontWeight: 'bold',
		fontSize: '0.8rem',
		textTransform: 'uppercase',
		_hover: { background: 'var(--overlay-black-20)' },
	}),
	runPanel: css({
		textAlign: 'left',
	}),
	runBar: css({
		height: '8px',
		borderRadius: '4px',
		background: 'var(--overlay-black-20)',
		overflow: 'hidden',
		marginTop: '0.75rem',
	}),
	runBarFill: css({
		display: 'block',
		height: '100%',
		background: 'var(--grass-dark-green, #6a8f4a)',
		transition: 'width 0.25s',
	}),
	runCount: css({
		fontSize: '0.75rem',
		opacity: 0.75,
		m: 0,
		marginTop: '0.375rem',
		textAlign: 'left',
	}),
	runBlocked: css({
		fontSize: '0.8rem',
		fontWeight: 'bold',
		margin: '0.75rem 0 0',
		padding: '0.5rem 0.75rem',
		borderRadius: '4px',
		background: 'var(--overlay-black-20)',
		border: '1px solid var(--overlay-white-30)',
		textAlign: 'left',
	}),
	runList: css({
		listStyle: 'none',
		margin: '0.75rem 0 0',
		padding: 0,
		fontSize: '0.8rem',
	}),
	runItem: css({
		display: 'flex',
		alignItems: 'baseline',
		gap: '0.5rem',
		padding: '0.2rem 0',
		borderBottom: '1px solid var(--overlay-black-12)',
	}),
	runIcon: css({
		width: '1rem',
		flexShrink: 0,
		textAlign: 'center',
	}),
	runLabel: css({
		fontWeight: 'bold',
		flexShrink: 0,
	}),
	runDetail: css({
		opacity: 0.7,
		fontSize: '0.75rem',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
	}),
	runDetailBad: css({
		fontSize: '0.75rem',
		color: 'var(--error-red)',
		fontWeight: 'bold',
	}),
	outcome: css({
		textAlign: 'left',
		padding: '0.75rem',
		marginBottom: '1rem',
		borderRadius: '4px',
		background: 'var(--overlay-black-15)',
		border: '1px solid var(--overlay-white-20)',
	}),
	outcomeTitle: css({
		fontSize: '0.85rem',
		fontWeight: 'bold',
		m: 0,
	}),
	outcomeMessage: css({
		fontWeight: 'normal',
		opacity: 0.85,
	}),
	dismiss: css({
		marginTop: '0.5rem',
		padding: '0.15rem 0.6rem',
		fontSize: '0.7rem',
		fontWeight: 'bold',
		textTransform: 'uppercase',
		color: 'var(--color-white)',
		background: 'transparent',
		border: '1px solid var(--overlay-white-30)',
		borderRadius: '3px',
		cursor: 'pointer',
		_hover: { background: 'var(--overlay-white-10)' },
	}),
}
