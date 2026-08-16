import { A, useLocation } from '@solidjs/router'
import { css } from '@style/css'
import { For, Show, createEffect, createMemo, createSignal, on } from 'solid-js'
import { Emoji } from './ui/Emoji'

interface NavItem {
	href: string
	/** Short label shown under the icon in the bar */
	label: string
	/** Full label shown in the "More" sheet */
	fullLabel: string
	emoji: string
}

/** Wrapped points at last year until December, matching the Explore block */
function wrappedYear(): number {
	const now = new Date()
	return now.getFullYear() - (now.getMonth() === 11 ? 0 : 1)
}

/** How many real links fit in the bar before the rest move into the "More" sheet */
const VISIBLE_COUNT = 4

function navItems(): NavItem[] {
	return [
		{ href: '/', label: 'Results', fullLabel: 'Latest Results', emoji: '🏃' },
		{
			href: '/calendar',
			label: 'Calendar',
			fullLabel: 'Club Calendar',
			emoji: '📅',
		},
		{
			href: '/map',
			label: 'Map',
			fullLabel: 'Scoop Bus Tourism Map',
			emoji: '🗺️',
		},
		{
			href: '/everyone',
			label: 'Journey',
			fullLabel: 'Our Journey Together',
			emoji: '🚶',
		},
		// Everything below here lands in the "More" sheet
		{
			href: '/largestclubs',
			label: 'Largest Clubs',
			fullLabel: 'Largest Clubs',
			emoji: '🏆',
		},
		{
			href: '/connections',
			label: 'Web',
			fullLabel: 'The Connection Web',
			emoji: '🕸️',
		},
		{
			href: `/wrapped/${wrappedYear()}`,
			label: 'Wrapped',
			fullLabel: 'Scoop Bus Wrapped',
			emoji: '🎁',
		},
		{ href: '/about', label: 'About', fullLabel: 'About the Club', emoji: 'ℹ️' },
		{ href: '/faq', label: 'FAQ', fullLabel: 'FAQ', emoji: '❓' },
	]
}

/**
 * App-style navigation bar pinned to the bottom of the screen on mobile.
 * Hidden by CSS on wider screens, where the sidebar covers the same ground.
 */
export function MobileNav() {
	const location = useLocation()
	const [menuOpen, setMenuOpen] = createSignal(false)

	const items = createMemo(navItems)

	// Everything fits while there are five or fewer links; beyond that the
	// overflow moves behind the burger so the bar keeps five slots.
	const barItems = createMemo(() =>
		items().length > 5 ? items().slice(0, VISIBLE_COUNT) : items(),
	)
	const menuItems = createMemo(() =>
		items().length > 5 ? items().slice(VISIBLE_COUNT) : [],
	)

	const isActive = (href: string) => {
		if (href === '/') return location.pathname === '/'
		return (
			location.pathname === href || location.pathname.startsWith(`${href}/`)
		)
	}

	const menuHasActive = createMemo(() =>
		menuItems().some((i) => isActive(i.href)),
	)

	// Navigating away should always leave the sheet closed
	createEffect(
		on(
			() => location.pathname,
			() => setMenuOpen(false),
			{ defer: true },
		),
	)

	return (
		<nav class={styles.nav}>
			<Show when={menuOpen()}>
				{/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop is a convenience, Escape-free by design */}
				<div class={styles.backdrop} onClick={() => setMenuOpen(false)} />
				<div class={styles.sheet}>
					<For each={menuItems()}>
						{(item) => (
							<A
								href={item.href}
								class={styles.sheetItem}
								classList={{ [styles.sheetItemActive]: isActive(item.href) }}
								onClick={() => setMenuOpen(false)}
							>
								<span class={styles.sheetIcon}>
									<Emoji emoji={item.emoji} animation="none" />
								</span>
								{item.fullLabel}
							</A>
						)}
					</For>
				</div>
			</Show>

			<div class={styles.bar}>
				<For each={barItems()}>
					{(item) => (
						<A
							href={item.href}
							class={styles.item}
							classList={{ [styles.itemActive]: isActive(item.href) }}
							onClick={() => setMenuOpen(false)}
						>
							<span class={styles.icon}>
								<Emoji emoji={item.emoji} animation="none" />
							</span>
							<span class={styles.label}>{item.label}</span>
						</A>
					)}
				</For>
				<Show when={menuItems().length > 0}>
					<button
						type="button"
						class={styles.item}
						classList={{
							[styles.itemActive]: menuOpen() || menuHasActive(),
						}}
						aria-expanded={menuOpen()}
						aria-label="More pages"
						onClick={() => setMenuOpen((open) => !open)}
					>
						<span class={styles.burger}>
							<span />
							<span />
							<span />
						</span>
						<span class={styles.label}>More</span>
					</button>
				</Show>
			</div>
		</nav>
	)
}

/** Height of the bar itself, before the device's safe-area inset */
export const MOBILE_NAV_HEIGHT = 58

const styles = {
	nav: css({
		display: 'none',
		'@media (max-width: 768px)': {
			display: 'block',
		},
	}),
	bar: css({
		position: 'fixed',
		left: 0,
		bottom: 0,
		// Viewport units, not right:0 — pages that overflow horizontally would
		// otherwise stretch the bar past the screen and hide the last slots.
		width: '100vw',
		zIndex: 300,
		display: 'flex',
		alignItems: 'stretch',
		height: 'calc(58px + env(safe-area-inset-bottom))',
		paddingBottom: 'env(safe-area-inset-bottom)',
		background: 'var(--dirt-control)',
		borderTop: '4px solid var(--color-black)',
		boxShadow: '0 -4px 0 var(--overlay-black-25)',
	}),
	item: css({
		flex: 1,
		minWidth: 0,
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		gap: '2px',
		border: 'none',
		borderTop: '3px solid transparent',
		background: 'transparent',
		color: 'var(--color-white)',
		textDecoration: 'none',
		cursor: 'pointer',
		padding: '2px 0',
		_active: { background: 'var(--overlay-white-10)' },
	}),
	itemActive: css({
		background: 'var(--overlay-white-15)',
		borderTopColor: 'var(--green-brand)',
	}),
	icon: css({
		fontSize: '1.5rem',
		lineHeight: 1,
		display: 'block',
	}),
	label: css({
		fontSize: '0.6rem',
		fontWeight: 'bold',
		textTransform: 'uppercase',
		letterSpacing: '0.03em',
		maxWidth: '100%',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
	}),
	burger: css({
		height: '1.5rem',
		display: 'flex',
		flexDirection: 'column',
		justifyContent: 'center',
		gap: '3px',
		'& span': {
			display: 'block',
			width: '20px',
			height: '3px',
			background: 'var(--color-white)',
		},
	}),
	backdrop: css({
		position: 'fixed',
		left: 0,
		top: 0,
		width: '100vw',
		height: '100dvh',
		zIndex: 290,
		background: 'var(--overlay-black-50)',
	}),
	sheet: css({
		position: 'fixed',
		left: '0.5rem',
		width: 'calc(100vw - 1rem)',
		bottom: 'calc(62px + env(safe-area-inset-bottom) + 0.5rem)',
		zIndex: 300,
		display: 'flex',
		flexDirection: 'column',
		background: 'var(--dirt-control)',
		border: '4px solid var(--color-black)',
		borderRadius: '8px',
		cornerShape: 'notch',
		overflow: 'hidden',
	}),
	sheetItem: css({
		display: 'flex',
		alignItems: 'center',
		gap: '0.75rem',
		padding: '0.75rem 1rem',
		color: 'var(--color-white)',
		fontWeight: 'bold',
		textDecoration: 'none',
		borderBottom: '2px solid var(--overlay-black-25)',
		_last: { borderBottom: 'none' },
		_active: { background: 'var(--overlay-white-10)' },
	}),
	sheetItemActive: css({
		background: 'var(--overlay-white-15)',
	}),
	sheetIcon: css({
		fontSize: '1.5rem',
		lineHeight: 1,
	}),
}
