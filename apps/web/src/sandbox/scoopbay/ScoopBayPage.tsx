/**
 * Scoop Bay: an auction site as it looked in 1999, listing mostly Furbys.
 */
import { For, Show, createMemo, createSignal, onCleanup } from 'solid-js'
import { BarePage } from '../shared/BarePage'
import { Furby } from './Furby'
import {
	type Category,
	type Listing,
	generateListings,
	money,
	nineties,
	timeLeft,
} from './listings'
import styles from './scoopbay.module.css'

const CATEGORY_LABEL: Record<Category, string> = {
	furby: 'Furbys',
	gear: 'Running Gear',
	misc: 'Everything Else',
}

export default function ScoopBayPage() {
	const [listings, setListings] = createSignal(generateListings())
	const [now, setNow] = createSignal(Date.now())
	const [category, setCategory] = createSignal<Category | 'all'>('all')
	const [query, setQuery] = createSignal('')
	const [openId, setOpenId] = createSignal<number | null>(null)
	const [bidInput, setBidInput] = createSignal('')
	const [bidMessage, setBidMessage] = createSignal<string | null>(null)
	const [visitor] = createSignal(Math.floor(Math.random() * 90000 + 10000))

	const timer = setInterval(() => setNow(Date.now()), 30_000)
	onCleanup(() => clearInterval(timer))

	const visible = createMemo(() => {
		const q = query().trim().toLowerCase()
		return listings().filter(
			(l) =>
				(category() === 'all' || l.category === category()) &&
				(q === '' || l.title.toLowerCase().includes(q)),
		)
	})

	const counts = createMemo(() => {
		const c: Record<Category, number> = { furby: 0, gear: 0, misc: 0 }
		for (const l of listings()) c[l.category]++
		return c
	})

	const open = createMemo(() => listings().find((l) => l.id === openId()))

	const goHome = () => {
		setOpenId(null)
		setBidMessage(null)
		setBidInput('')
	}

	const show = (id: number) => {
		setOpenId(id)
		setBidMessage(null)
		setBidInput('')
	}

	const minimumBid = (l: Listing) =>
		Math.round((l.price + Math.max(0.5, l.price * 0.05)) * 100) / 100

	const placeBid = (l: Listing) => {
		const amount = Number.parseFloat(bidInput())
		if (!Number.isFinite(amount)) {
			setBidMessage('Please enter a bid amount using numbers, like 12.50.')
			return
		}
		if (amount < minimumBid(l)) {
			setBidMessage(
				`Your bid must be at least ${money(minimumBid(l))}. This is an auction, not a parkrun; there are rules.`,
			)
			return
		}
		setListings((list) =>
			list.map((item) =>
				item.id === l.id
					? {
							...item,
							price: amount,
							bids: [
								...item.bids,
								{ who: 'you (0)', amount, when: Date.now() },
							],
						}
					: item,
			),
		)
		setBidMessage(
			`Congratulations! You are the current high bidder at ${money(amount)}. You will receive an e-mail if you are outbid, provided you have an e-mail.`,
		)
		setBidInput('')
	}

	const Picture = (props: { listing: Listing; size: number }) => (
		<Show
			when={props.listing.furby}
			fallback={
				<div
					class={styles.emojiPic}
					style={{
						width: `${props.size}px`,
						height: `${props.size}px`,
						'font-size': `${props.size * 0.6}px`,
					}}
				>
					{props.listing.emoji}
				</div>
			}
		>
			{(look) => <Furby look={look()} size={props.size} />}
		</Show>
	)

	return (
		<BarePage
			title="Scoop Bay - Your Personal Trading Community"
			class={styles.page}
		>
			<div class={styles.wrap}>
				<table class={styles.header}>
					<tbody>
						<tr>
							<td class={styles.logoCell}>
								<button type="button" class={styles.logo} onClick={goHome}>
									<span class={styles.l1}>s</span>
									<span class={styles.l2}>c</span>
									<span class={styles.l3}>o</span>
									<span class={styles.l4}>o</span>
									<span class={styles.l1}>p</span>
									<span class={styles.l2}>B</span>
									<span class={styles.l3}>a</span>
									<span class={styles.l4}>y</span>
								</button>
							</td>
							<td class={styles.tabsCell}>
								<div class={styles.tabs}>
									<For
										each={[
											'Browse',
											'Sell',
											'Services',
											'Search',
											'Help',
											'Community',
										]}
									>
										{(t) => (
											<button type="button" class={styles.tab} onClick={goHome}>
												{t}
											</button>
										)}
									</For>
								</div>
								<div class={styles.subnav}>
									<a
										href="/sandbox/scoopbay"
										onClick={(e) => {
											e.preventDefault()
											goHome()
										}}
									>
										home
									</a>{' '}
									| <span>my scoopBay</span> | <span>site map</span> |{' '}
									<span>sign in</span> |{' '}
									<a href="/sandbox">back to scoopbus.run</a>
								</div>
							</td>
						</tr>
					</tbody>
				</table>

				<div class={styles.welcome}>
					<b>Welcome to Scoop Bay!</b> Your Personal Trading Community™
					&nbsp;·&nbsp;
					{listings().length} items listed,{' '}
					{Math.round((counts().furby / listings().length) * 100)}% of them
					Furbys
				</div>

				<Show
					when={open()}
					fallback={
						<table class={styles.body}>
							<tbody>
								<tr>
									<td class={styles.side}>
										<div class={styles.sideBox}>
											<div class={styles.sideTitle}>Categories</div>
											<ul class={styles.cats}>
												<li>
													<button
														type="button"
														class={styles.link}
														onClick={() => setCategory('all')}
													>
														All items
													</button>{' '}
													({listings().length})
												</li>
												<For each={['furby', 'gear', 'misc'] as Category[]}>
													{(c) => (
														<li>
															<button
																type="button"
																class={styles.link}
																onClick={() => setCategory(c)}
															>
																{CATEGORY_LABEL[c]}
															</button>{' '}
															({counts()[c]})
															<Show when={c === 'furby'}>
																<ul class={styles.subcats}>
																	<li>Haunted</li>
																	<li>Speaks Swedish</li>
																	<li>Won't Shut Up</li>
																	<li>Mint in Box</li>
																</ul>
															</Show>
														</li>
													)}
												</For>
											</ul>
										</div>
										<div class={styles.sideBox}>
											<div class={styles.sideTitle}>Search</div>
											<input
												class={styles.search}
												value={query()}
												onInput={(e) => setQuery(e.currentTarget.value)}
												placeholder="furby"
											/>
											<div class={styles.tiny}>
												<label>
													<input type="checkbox" /> search titles <b>and</b>{' '}
													descriptions
												</label>
											</div>
										</div>
										<div class={styles.sideBox}>
											<div class={styles.sideTitle}>Stats</div>
											<div class={styles.tiny}>
												You are visitor number
												<div class={styles.counter}>
													{String(visitor()).padStart(7, '0')}
												</div>
												<p>
													Scoop Bay has 4,000,000 registered users, of whom 12
													have run a parkrun.
												</p>
											</div>
										</div>
									</td>
									<td class={styles.main}>
										<div class={styles.sectionTitle}>Featured Items</div>
										<table class={styles.featured}>
											<tbody>
												<tr>
													<For each={listings().filter((l) => l.featured)}>
														{(l) => (
															<td>
																<button
																	type="button"
																	class={styles.featuredItem}
																	onClick={() => show(l.id)}
																>
																	<Picture listing={l} size={80} />
																	<span class={styles.link}>{l.title}</span>
																</button>
																<div class={styles.tiny}>
																	{money(l.price)} · {l.bids.length} bids
																</div>
															</td>
														)}
													</For>
												</tr>
											</tbody>
										</table>

										<div class={styles.sectionTitle}>
											{category() === 'all'
												? 'Current Auctions'
												: CATEGORY_LABEL[category() as Category]}
											<span class={styles.count}>
												{' '}
												{visible().length} items found
											</span>
										</div>
										<table class={styles.list}>
											<thead>
												<tr>
													<th>Item</th>
													<th class={styles.right}>Price</th>
													<th class={styles.right}>Bids</th>
													<th class={styles.right}>Ends PDT</th>
												</tr>
											</thead>
											<tbody>
												<For each={visible()}>
													{(l) => (
														<tr>
															<td>
																<span
																	class={styles.pic}
																	title="This item has a picture!"
																>
																	📷
																</span>{' '}
																<button
																	type="button"
																	class={styles.link}
																	onClick={() => show(l.id)}
																>
																	{l.title}
																</button>
															</td>
															<td class={styles.right}>{money(l.price)}</td>
															<td class={styles.right}>
																{l.bids.length || '-'}
															</td>
															<td class={styles.right}>
																{timeLeft(l.endsAt, now())}
															</td>
														</tr>
													)}
												</For>
												<Show when={visible().length === 0}>
													<tr>
														<td colspan="4" class={styles.empty}>
															No items found. Try searching for "furby", it
															usually works.
														</td>
													</tr>
												</Show>
											</tbody>
										</table>
									</td>
								</tr>
							</tbody>
						</table>
					}
				>
					{(l) => (
						<div class={styles.item}>
							<div class={styles.crumbs}>
								<button type="button" class={styles.link} onClick={goHome}>
									Listings
								</button>{' '}
								&gt; {CATEGORY_LABEL[l().category]} &gt; Item #{l().id}
							</div>
							<h1 class={styles.itemTitle}>{l().title}</h1>
							<div class={styles.itemNumber}>Item #{l().id}</div>

							<table class={styles.details}>
								<tbody>
									<tr>
										<td class={styles.label}>Currently</td>
										<td>
											<b>{money(l().price)}</b> (started at{' '}
											{money(l().startPrice)})
										</td>
										<td class={styles.label}>First bid</td>
										<td>{money(l().startPrice)}</td>
									</tr>
									<tr>
										<td class={styles.label}>Quantity</td>
										<td>1</td>
										<td class={styles.label}># of bids</td>
										<td>
											{l().bids.length}{' '}
											<span class={styles.link}>(bid history)</span>
										</td>
									</tr>
									<tr>
										<td class={styles.label}>Time left</td>
										<td>
											<b class={styles.red}>{timeLeft(l().endsAt, now())}</b>
										</td>
										<td class={styles.label}>Location</td>
										<td>{l().location}</td>
									</tr>
									<tr>
										<td class={styles.label}>Started</td>
										<td>{nineties(l().startedAt)}</td>
										<td class={styles.label}>Ends</td>
										<td>{nineties(l().endsAt)}</td>
									</tr>
									<tr>
										<td class={styles.label}>Seller</td>
										<td>
											<span class={styles.link}>{l().seller}</span> (
											{l().feedback}) <span class={styles.star}>★</span>
											<br />
											<span class={styles.tiny}>
												<span class={styles.link}>
													(view comments in seller's Feedback Profile)
												</span>{' '}
												|{' '}
												<span class={styles.link}>
													(view seller's other auctions)
												</span>{' '}
												|{' '}
												<span class={styles.link}>(ask seller a question)</span>
											</span>
										</td>
										<td class={styles.label}>High bid</td>
										<td>
											{l().bids.length > 0
												? l().bids[l().bids.length - 1].who
												: '-'}
										</td>
									</tr>
									<tr>
										<td class={styles.label}>Payment</td>
										<td colspan="3">
											Money Order/Cashiers Checks, Personal Checks, Swish,
											finish tokens (no)
										</td>
									</tr>
									<tr>
										<td class={styles.label}>Shipping</td>
										<td colspan="3">
											Seller ships internationally. Buyer pays shipping. Furby
											travels in the cabin, not the hold.
										</td>
									</tr>
								</tbody>
							</table>

							<div class={styles.sectionTitle}>Description</div>
							<div class={styles.description}>
								<div class={styles.itemPicture}>
									<Picture listing={l()} size={200} />
									<div class={styles.tiny}>(actual item, scanned)</div>
								</div>
								<For each={l().description}>{(p) => <p>{p}</p>}</For>
								<p class={styles.shout}>!!! PLEASE BID !!!</p>
							</div>

							<div class={styles.sectionTitle}>Bidding</div>
							<div class={styles.bidding}>
								<Show when={bidMessage()}>
									<div class={styles.notice}>{bidMessage()}</div>
								</Show>
								<p>
									<b>{l().title}</b> (Item #{l().id})
								</p>
								<p>
									Current bid: <b>{money(l().price)}</b>
									<br />
									Bid increment: {money(Math.max(0.5, l().price * 0.05))}
									<br />
									Minimum bid: <b>{money(minimumBid(l()))}</b>
								</p>
								<table>
									<tbody>
										<tr>
											<td>Your maximum bid:</td>
											<td>
												<input
													class={styles.bidInput}
													value={bidInput()}
													onInput={(e) => setBidInput(e.currentTarget.value)}
													placeholder={minimumBid(l()).toFixed(2)}
												/>{' '}
												<span class={styles.tiny}>
													(Binding contract! Bids cannot be retracted, unlike a
													parkrun entry.)
												</span>
											</td>
										</tr>
										<tr>
											<td>Your User ID:</td>
											<td>
												<input class={styles.bidInput} value="you" readOnly />
											</td>
										</tr>
										<tr>
											<td>Your Password:</td>
											<td>
												<input
													class={styles.bidInput}
													type="password"
													value="hunter2"
													readOnly
												/>
											</td>
										</tr>
									</tbody>
								</table>
								<button
									type="button"
									class={styles.button}
									onClick={() => placeBid(l())}
								>
									Review bid
								</button>{' '}
								<button type="button" class={styles.button} onClick={goHome}>
									Back to listings
								</button>
							</div>

							<Show when={l().bids.length > 0}>
								<div class={styles.sectionTitle}>Bid history</div>
								<table class={styles.list}>
									<thead>
										<tr>
											<th>User</th>
											<th class={styles.right}>Bid amount</th>
											<th class={styles.right}>Date of bid</th>
										</tr>
									</thead>
									<tbody>
										<For each={[...l().bids].reverse()}>
											{(b) => (
												<tr>
													<td>{b.who}</td>
													<td class={styles.right}>{money(b.amount)}</td>
													<td class={styles.right}>{nineties(b.when)}</td>
												</tr>
											)}
										</For>
									</tbody>
								</table>
							</Show>
						</div>
					)}
				</Show>

				<div class={styles.footer}>
					<div>
						<span class={styles.link}>Announcements</span> |{' '}
						<span class={styles.link}>Register</span> |{' '}
						<span class={styles.link}>Scoop Bay Store</span> |{' '}
						<span class={styles.link}>SafeHarbor</span> |{' '}
						<span class={styles.link}>Feedback Forum</span> |{' '}
						<span class={styles.link}>About Scoop Bay</span> |{' '}
						<a href="/sandbox">Scoop Bus Run Club</a>
					</div>
					<p>
						Copyright © 1995-1999 Scoop Bay Inc. All Rights Reserved. Designated
						trademarks and brands are the property of their respective owners.
						Use of this Web site constitutes acceptance of the Scoop Bay User
						Agreement and Privacy Policy. Furby is a registered trademark of
						somebody, probably.
					</p>
					<p>This page is best viewed at 800x600 with 256 colours.</p>
				</div>
			</div>
		</BarePage>
	)
}
