/**
 * The sandbox: pages people suggested that may or may not stay. Everything
 * lives under this folder and `/sandbox/…`, so scrapping one is deleting
 * its folder and its line here.
 *
 * Each folder's `thumbnail.webp` is a 640 × 400 screenshot of the page,
 * shown on its card in the index.
 *
 * The throwback pages own the whole viewport (no Scoop Bus header or nav);
 * `isBareSandboxPath` is how `App` knows to step aside for them.
 */
import { BackSignButton } from '@/components/BackSignButton'
import { FieldBlock } from '@/components/ui/FieldBlock'
import { A, Route } from '@solidjs/router'
import { css } from '@style/css'
import { For, lazy } from 'solid-js'
import badgerThumbnail from './badger/thumbnail.webp'
import coinThumbnail from './coin/thumbnail.webp'
import danceThumbnail from './dance/thumbnail.webp'
import leekThumbnail from './leek/thumbnail.webp'
import scoopbayThumbnail from './scoopbay/thumbnail.webp'
import { ScoopmojiPage } from './scoopmoji/ScoopmojiPage'
import scoopmojiThumbnail from './scoopmoji/thumbnail.webp'
import zomboThumbnail from './zombo/thumbnail.webp'

const ScoopBayPage = lazy(() => import('./scoopbay/ScoopBayPage'))
const ScoopCoinPage = lazy(() => import('./coin/ScoopCoinPage'))
const ScoopDancePage = lazy(() => import('./dance/ScoopDancePage'))
const BadgerPage = lazy(() => import('./badger/BadgerPage'))
const ZomboPage = lazy(() => import('./zombo/ZomboPage'))
const LeekScoopPage = lazy(() => import('./leek/LeekScoopPage'))

const PROJECTS = [
	{
		href: '/sandbox/scoopmoji',
		thumbnail: scoopmojiThumbnail,
		title: 'Scoopmoji',
		blurb:
			'Every member as a sticker, with a WhatsApp sticker pack to download.',
		bare: false,
	},
	{
		href: '/sandbox/scoopbay',
		thumbnail: scoopbayThumbnail,
		title: 'Scoop Bay',
		blurb: 'An online auction site from 1999. Mostly Furbys.',
		bare: true,
	},
	{
		href: '/sandbox/coin',
		thumbnail: coinThumbnail,
		title: 'ScoopCoin',
		blurb:
			'A crypto exchange where every member is a token. Not financial advice.',
		bare: true,
	},
	{
		href: '/sandbox/dance',
		thumbnail: danceThumbnail,
		title: 'ScoopDance',
		blurb: 'The whole club dancing in rows, with music, like it is 1999.',
		bare: true,
	},
	{
		href: '/sandbox/badger',
		thumbnail: badgerThumbnail,
		title: 'Badger Badger Badger',
		blurb: 'Scoop bus, Scoop bus, Scoop bus, fika, fika.',
		bare: true,
	},
	{
		href: '/sandbox/zombo',
		thumbnail: zomboThumbnail,
		title: 'Welcome to Scoop Bus',
		blurb:
			'This is Scoop Bus. You can do anything at Scoop Bus. Anything at all.',
		bare: true,
	},
	{
		href: '/sandbox/leekscoop',
		thumbnail: leekThumbnail,
		title: 'Leek Scoop',
		blurb: 'Everyone spins leek here.',
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
					<ul class={styles.grid}>
						<For each={PROJECTS}>
							{(p) => (
								<li>
									<A href={p.href} class={styles.card}>
										<img
											src={p.thumbnail}
											alt=""
											width={640}
											height={400}
											loading="lazy"
											class={styles.thumbnail}
										/>
										<span class={styles.title}>{p.title}</span>
										<span class={styles.blurb}>{p.blurb}</span>
									</A>
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
			<Route path="/sandbox/zombo" component={ZomboPage} />
			<Route path="/sandbox/leekscoop" component={LeekScoopPage} />
		</>
	)
}

const styles = {
	container: css({
		width: 'calc(100% - 2rem)',
		maxWidth: '1000px',
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
	grid: css({
		listStyle: 'none',
		padding: 0,
		margin: 0,
		display: 'grid',
		gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
		gap: '1rem',
	}),
	card: css({
		height: '100%',
		display: 'flex',
		flexDirection: 'column',
		gap: '0.25rem',
		padding: '0.5rem 0.5rem 0.75rem',
		border: '3px double var(--dirt-darker-brown)',
		borderRadius: '6px',
		background: 'var(--overlay-white-40)',
		color: 'inherit',
		textDecoration: 'none',
		transition: 'transform 0.15s',
		_hover: { transform: 'scale(1.03) rotate(-1deg)' },
	}),
	thumbnail: css({
		display: 'block',
		width: '100%',
		height: 'auto',
		aspectRatio: '16 / 10',
		marginBottom: '0.25rem',
		borderRadius: '3px',
		// Screenshots shrunk to fit, not pixel art: smooth them.
		imageRendering: 'auto',
	}),
	title: css({
		fontWeight: 'bold',
		textDecoration: 'underline',
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
