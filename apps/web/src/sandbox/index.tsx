/**
 * The sandbox: pages people suggested that may or may not stay. Everything
 * lives under this folder and `/sandbox/…`, so scrapping one is deleting
 * its folder and its line here.
 *
 * The throwback pages own the whole viewport (no Scoop Bus header or nav);
 * `isBareSandboxPath` is how `App` knows to step aside for them.
 */
import { BackSignButton } from '@/components/BackSignButton'
import { FieldBlock } from '@/components/ui/FieldBlock'
import { A, Route } from '@solidjs/router'
import { css } from '@style/css'
import { For, lazy } from 'solid-js'
import { ScoopmojiPage } from './scoopmoji/ScoopmojiPage'

const ScoopBayPage = lazy(() => import('./scoopbay/ScoopBayPage'))
const ScoopCoinPage = lazy(() => import('./coin/ScoopCoinPage'))
const ScoopDancePage = lazy(() => import('./dance/ScoopDancePage'))
const BadgerPage = lazy(() => import('./badger/BadgerPage'))

const PROJECTS = [
	{
		href: '/sandbox/scoopmoji',
		title: 'Scoopmoji',
		blurb:
			'Every member as a sticker, with a WhatsApp sticker pack to download.',
		bare: false,
	},
	{
		href: '/sandbox/scoopbay',
		title: 'Scoop Bay',
		blurb: 'An online auction site from 1999. Mostly Furbys.',
		bare: true,
	},
	{
		href: '/sandbox/coin',
		title: 'ScoopCoin',
		blurb:
			'A crypto exchange where every member is a token. Not financial advice.',
		bare: true,
	},
	{
		href: '/sandbox/dance',
		title: 'ScoopDance',
		blurb: 'The whole club dancing in rows, with music, like it is 1999.',
		bare: true,
	},
	{
		href: '/sandbox/badger',
		title: 'Badger Badger Badger',
		blurb: 'Scoop bus, Scoop bus, Scoop bus, fika, fika.',
		bare: true,
	},
]

/** Paths that draw their own page from edge to edge. */
export function isBareSandboxPath(pathname: string): boolean {
	return PROJECTS.some(
		(p) => p.bare && (pathname === p.href || pathname.startsWith(`${p.href}/`)),
	)
}

export function SandboxIndexPage() {
	return (
		<div class={styles.container}>
			<FieldBlock title="Sandbox" signType="purple">
				<div class={styles.prose}>
					<p>
						Things people have suggested. None of them are finished, some of
						them are not sensible, and the ones with music make sound.
					</p>
					<ul class={styles.list}>
						<For each={PROJECTS}>
							{(p) => (
								<li>
									<A href={p.href} class={styles.link}>
										{p.title}
									</A>
									<span class={styles.blurb}>{p.blurb}</span>
								</li>
							)}
						</For>
					</ul>
				</div>
			</FieldBlock>
			<BackSignButton class={styles.backSign} />
		</div>
	)
}

export function SandboxRoutes() {
	return (
		<>
			<Route path="/sandbox" component={SandboxIndexPage} />
			<Route path="/sandbox/scoopmoji" component={ScoopmojiPage} />
			<Route path="/sandbox/scoopbay" component={ScoopBayPage} />
			<Route path="/sandbox/coin" component={ScoopCoinPage} />
			<Route path="/sandbox/dance" component={ScoopDancePage} />
			<Route path="/sandbox/badger" component={BadgerPage} />
		</>
	)
}

const styles = {
	container: css({
		width: 'calc(100% - 2rem)',
		maxWidth: '700px',
		margin: '1rem auto',
		display: 'flex',
		flexDirection: 'column',
		gap: '2rem',
	}),
	prose: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '1rem',
		fontSize: '1.05rem',
	}),
	list: css({
		listStyle: 'none',
		padding: 0,
		margin: 0,
		display: 'flex',
		flexDirection: 'column',
		gap: '0.75rem',
	}),
	link: css({
		fontWeight: 'bold',
		textDecoration: 'underline',
		display: 'block',
	}),
	blurb: css({
		fontSize: '0.9rem',
		opacity: 0.85,
	}),
	backSign: css({
		margin: '0 auto',
		display: 'block',
	}),
}
