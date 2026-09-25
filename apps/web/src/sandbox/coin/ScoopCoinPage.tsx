/**
 * ScoopCoin: a crypto exchange for the club, where every member is a token
 * and the only fundamental is Saturday morning.
 */
import busEmoji from '@/assets/emoji/bus.png'
import {
	For,
	Show,
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
	onMount,
} from 'solid-js'
import { BarePage } from '../shared/BarePage'
import styles from './coin.module.css'
import {
	type Candle,
	type Token,
	createMarket,
	fmtPrice,
	orderBook,
	pct,
} from './market'

const TIMEFRAMES = ['1 lap', '5k', '1 parkrun', '1 wk']

function Chart(props: { token: Token }) {
	let canvas!: HTMLCanvasElement
	let wrap!: HTMLDivElement

	const draw = () => {
		const dpr = window.devicePixelRatio || 1
		const w = wrap.clientWidth
		const h = wrap.clientHeight
		if (w === 0 || h === 0) return
		canvas.width = w * dpr
		canvas.height = h * dpr
		canvas.style.width = `${w}px`
		canvas.style.height = `${h}px`
		const ctx = canvas.getContext('2d')
		if (!ctx) return
		ctx.scale(dpr, dpr)
		ctx.clearRect(0, 0, w, h)

		const candles: Candle[] = props.token.candles
		const padRight = 64
		const padTop = 12
		const volH = Math.round(h * 0.18)
		const priceH = h - volH - padTop - 8
		const plotW = w - padRight
		const n = candles.length
		const slot = plotW / n
		const bodyW = Math.max(2, slot * 0.6)

		let lo = Number.POSITIVE_INFINITY
		let hi = 0
		let maxV = 1
		for (const c of candles) {
			lo = Math.min(lo, c.l)
			hi = Math.max(hi, c.h)
			maxV = Math.max(maxV, c.v)
		}
		const span = hi - lo || hi * 0.01
		lo -= span * 0.08
		hi += span * 0.08
		const y = (p: number) => padTop + ((hi - p) / (hi - lo)) * priceH

		// grid
		ctx.strokeStyle = 'rgba(255,255,255,0.06)'
		ctx.fillStyle = '#848e9c'
		ctx.font = '11px system-ui, sans-serif'
		ctx.textAlign = 'left'
		ctx.lineWidth = 1
		for (let i = 0; i <= 5; i++) {
			const p = lo + ((hi - lo) * i) / 5
			const yy = Math.round(y(p)) + 0.5
			ctx.beginPath()
			ctx.moveTo(0, yy)
			ctx.lineTo(plotW, yy)
			ctx.stroke()
			ctx.fillText(fmtPrice(p), plotW + 6, yy + 4)
		}

		// candles + volume
		candles.forEach((c, i) => {
			const x = i * slot + slot / 2
			const up = c.c >= c.o
			const color = up ? '#0ecb81' : '#f6465d'
			ctx.strokeStyle = color
			ctx.fillStyle = color
			ctx.beginPath()
			ctx.moveTo(x, y(c.h))
			ctx.lineTo(x, y(c.l))
			ctx.stroke()
			const top = y(Math.max(c.o, c.c))
			const bot = y(Math.min(c.o, c.c))
			ctx.fillRect(x - bodyW / 2, top, bodyW, Math.max(1, bot - top))
			ctx.globalAlpha = 0.35
			const vh = (c.v / maxV) * volH
			ctx.fillRect(x - bodyW / 2, h - 8 - vh, bodyW, vh)
			ctx.globalAlpha = 1
		})

		// last price line
		const last = candles[n - 1].c
		const ly = Math.round(y(last)) + 0.5
		const up = last >= candles[n - 1].o
		ctx.setLineDash([4, 4])
		ctx.strokeStyle = up ? '#0ecb81' : '#f6465d'
		ctx.beginPath()
		ctx.moveTo(0, ly)
		ctx.lineTo(plotW, ly)
		ctx.stroke()
		ctx.setLineDash([])
		ctx.fillStyle = up ? '#0ecb81' : '#f6465d'
		ctx.fillRect(plotW + 2, ly - 9, padRight - 4, 18)
		ctx.fillStyle = '#0b0e11'
		ctx.fillText(fmtPrice(last), plotW + 6, ly + 4)
	}

	onMount(() => {
		const ro = new ResizeObserver(draw)
		ro.observe(wrap)
		onCleanup(() => ro.disconnect())
	})

	createEffect(() => {
		// Touch every candle field so the effect re-runs on each tick.
		for (const c of props.token.candles) void (c.c + c.h + c.l + c.v)
		draw()
	})

	return (
		<div ref={wrap} class={styles.chartWrap}>
			<canvas ref={canvas} class={styles.chart} />
		</div>
	)
}

export default function ScoopCoinPage() {
	const market = createMarket()
	onCleanup(market.dispose)

	const [symbol, setSymbol] = createSignal('SCOOP')
	const [timeframe, setTimeframe] = createSignal(TIMEFRAMES[0])
	const [side, setSide] = createSignal<'buy' | 'sell'>('buy')
	const [amount, setAmount] = createSignal('')
	const [message, setMessage] = createSignal<string | null>(null)
	const [connected, setConnected] = createSignal(false)
	const [now, setNow] = createSignal(Date.now())
	const clock = setInterval(() => setNow(Date.now()), 1000)
	onCleanup(() => clearInterval(clock))

	const token = createMemo(
		() => market.token(symbol()) ?? market.state.tokens[0],
	)
	const change = () => pct(token().open24, token().price)
	const book = createMemo(() => orderBook(token().price, token().price))
	const trades = createMemo(() =>
		market.state.trades.filter((t) => t.symbol === symbol()).slice(0, 18),
	)
	const wallet = () => market.state.wallet
	const equity = createMemo(() => {
		let total = wallet().cash
		for (const [sym, qty] of Object.entries(wallet().holdings)) {
			const t = market.token(sym)
			if (t) total += qty * t.price
		}
		return total
	})
	const positions = createMemo(() =>
		Object.entries(wallet().holdings)
			.filter(([, qty]) => qty > 1e-9)
			.map(([sym, qty]) => ({ sym, qty, token: market.token(sym) })),
	)

	const submit = () => {
		if (!connected()) {
			setMessage('Connect a wallet first. It is free, and imaginary.')
			return
		}
		const err = market.trade(symbol(), side(), Number.parseFloat(amount()))
		setMessage(
			err ??
				`${side() === 'buy' ? 'Bought' : 'Sold'} ${amount()} ${symbol()} at ${fmtPrice(token().price)}`,
		)
		if (!err) setAmount('')
	}

	const setPercent = (p: number) => {
		if (side() === 'buy') {
			setAmount(((wallet().cash * p) / token().price).toFixed(4))
		} else {
			setAmount(((wallet().holdings[symbol()] ?? 0) * p).toFixed(4))
		}
	}

	const ago = (t: number) => {
		const s = Math.max(0, Math.floor((now() - t) / 1000))
		if (s < 60) return `${s}s ago`
		return `${Math.floor(s / 60)}m ago`
	}

	return (
		<BarePage title="ScoopCoin — Trade the bus" class={styles.page}>
			<header class={styles.top}>
				<div class={styles.brand}>
					<img src={busEmoji} alt="" class={styles.brandIcon} />
					<span>
						Scoop<b>Coin</b>
					</span>
				</div>
				<nav class={styles.nav}>
					<span class={styles.navActive}>Trade</span>
					<span>Markets</span>
					<span>Earn</span>
					<span>Fika</span>
					<span>NFTs (finish tokens)</span>
				</nav>
				<div class={styles.topRight}>
					<span class={styles.equity}>
						$
						{equity().toLocaleString(undefined, {
							maximumFractionDigits: 2,
							minimumFractionDigits: 2,
						})}
					</span>
					<button
						type="button"
						class={styles.connect}
						onClick={() => setConnected((c) => !c)}
					>
						{connected() ? '0xSC00P…BU5' : 'Connect Wallet'}
					</button>
				</div>
			</header>

			<div class={styles.tape}>
				<div class={styles.tapeInner}>
					<For each={[...market.state.tokens, ...market.state.tokens]}>
						{(t) => (
							<button
								type="button"
								class={styles.tapeItem}
								onClick={() => setSymbol(t.symbol)}
							>
								<b>{t.symbol}</b> {fmtPrice(t.price)}{' '}
								<span
									class={pct(t.open24, t.price) >= 0 ? styles.up : styles.down}
								>
									{pct(t.open24, t.price) >= 0 ? '+' : ''}
									{pct(t.open24, t.price).toFixed(2)}%
								</span>
							</button>
						)}
					</For>
				</div>
			</div>

			<div class={styles.news}>
				<span class={styles.newsTag}>NEWS</span>
				<span class={styles.newsText}>{market.state.news[0]?.text}</span>
			</div>

			<main class={styles.grid}>
				<aside class={styles.markets}>
					<div class={styles.panelTitle}>Markets</div>
					<div class={styles.marketHead}>
						<span>Pair</span>
						<span>Price</span>
						<span>24h</span>
					</div>
					<div class={styles.marketList}>
						<For each={market.state.tokens}>
							{(t) => (
								<button
									type="button"
									class={`${styles.marketRow} ${t.symbol === symbol() ? styles.marketActive : ''}`}
									onClick={() => setSymbol(t.symbol)}
								>
									<span>
										<i class={styles.dot} style={{ background: t.color }} />
										{t.symbol}
										<small>/USD</small>
									</span>
									<span>{fmtPrice(t.price)}</span>
									<span
										class={
											pct(t.open24, t.price) >= 0 ? styles.up : styles.down
										}
									>
										{pct(t.open24, t.price).toFixed(2)}%
									</span>
								</button>
							)}
						</For>
					</div>
				</aside>

				<section class={styles.chartPanel}>
					<div class={styles.chartHead}>
						<div class={styles.pair}>
							<i class={styles.dotBig} style={{ background: token().color }} />
							<div>
								<div class={styles.pairName}>
									{token().symbol}
									<span>/USD</span>
								</div>
								<div class={styles.pairSub}>{token().name}</div>
							</div>
						</div>
						<div
							class={`${styles.bigPrice} ${change() >= 0 ? styles.up : styles.down}`}
						>
							{fmtPrice(token().price)}
						</div>
						<dl class={styles.stats}>
							<div>
								<dt>24h change</dt>
								<dd class={change() >= 0 ? styles.up : styles.down}>
									{change() >= 0 ? '+' : ''}
									{change().toFixed(2)}%
								</dd>
							</div>
							<div>
								<dt>24h high</dt>
								<dd>{fmtPrice(token().high24)}</dd>
							</div>
							<div>
								<dt>24h low</dt>
								<dd>{fmtPrice(token().low24)}</dd>
							</div>
							<div>
								<dt>24h volume</dt>
								<dd>
									{Math.round(token().volume24).toLocaleString()}{' '}
									{token().symbol}
								</dd>
							</div>
						</dl>
					</div>
					<div class={styles.timeframes}>
						<For each={TIMEFRAMES}>
							{(tf) => (
								<button
									type="button"
									class={`${styles.tf} ${tf === timeframe() ? styles.tfActive : ''}`}
									onClick={() => setTimeframe(tf)}
								>
									{tf}
								</button>
							)}
						</For>
						<span class={styles.tfNote}>Candles: 1 lap of Haga ≈ {4}s</span>
					</div>
					<Chart token={token()} />
				</section>

				<aside class={styles.side}>
					<div class={styles.panelTitle}>Order book</div>
					<div class={styles.book}>
						<For each={book().asks}>
							{(o) => (
								<div class={styles.bookRow}>
									<span class={styles.down}>{fmtPrice(o.price)}</span>
									<span>{o.size.toFixed(3)}</span>
									<i
										class={styles.askBar}
										style={{ width: `${Math.min(100, o.size * 2.5)}%` }}
									/>
								</div>
							)}
						</For>
						<div
							class={`${styles.bookMid} ${change() >= 0 ? styles.up : styles.down}`}
						>
							{fmtPrice(token().price)} {change() >= 0 ? '↑' : '↓'}
						</div>
						<For each={book().bids}>
							{(o) => (
								<div class={styles.bookRow}>
									<span class={styles.up}>{fmtPrice(o.price)}</span>
									<span>{o.size.toFixed(3)}</span>
									<i
										class={styles.bidBar}
										style={{ width: `${Math.min(100, o.size * 2.5)}%` }}
									/>
								</div>
							)}
						</For>
					</div>

					<div class={styles.panelTitle}>Spot</div>
					<div class={styles.form}>
						<div class={styles.sideToggle}>
							<button
								type="button"
								class={side() === 'buy' ? styles.buyActive : ''}
								onClick={() => setSide('buy')}
							>
								Buy
							</button>
							<button
								type="button"
								class={side() === 'sell' ? styles.sellActive : ''}
								onClick={() => setSide('sell')}
							>
								Sell
							</button>
						</div>
						<label class={styles.field}>
							<span>Price</span>
							<input value={fmtPrice(token().price)} readOnly />
							<em>USD</em>
						</label>
						<label class={styles.field}>
							<span>Amount</span>
							<input
								value={amount()}
								onInput={(e) => setAmount(e.currentTarget.value)}
								placeholder="0.00"
								inputmode="decimal"
							/>
							<em>{token().symbol}</em>
						</label>
						<div class={styles.percents}>
							<For each={[0.25, 0.5, 0.75, 1]}>
								{(p) => (
									<button type="button" onClick={() => setPercent(p)}>
										{p * 100}%
									</button>
								)}
							</For>
						</div>
						<div class={styles.total}>
							Total ≈ $
							{(
								Number.parseFloat(amount() || '0') * token().price || 0
							).toFixed(2)}
						</div>
						<div class={styles.avail}>
							Available:{' '}
							{side() === 'buy'
								? `$${wallet().cash.toFixed(2)}`
								: `${(wallet().holdings[symbol()] ?? 0).toFixed(4)} ${symbol()}`}
						</div>
						<button
							type="button"
							class={`${styles.submit} ${side() === 'buy' ? styles.submitBuy : styles.submitSell}`}
							onClick={submit}
						>
							{side() === 'buy' ? 'Buy' : 'Sell'} {token().symbol}
						</button>
						<Show when={message()}>
							<div class={styles.message}>{message()}</div>
						</Show>
					</div>
				</aside>

				<section class={styles.bottom}>
					<div class={styles.panelTitle}>Recent trades · {symbol()}</div>
					<div class={styles.trades}>
						<For each={trades()}>
							{(t) => (
								<div class={styles.tradeRow}>
									<span class={t.side === 'buy' ? styles.up : styles.down}>
										{fmtPrice(t.price)}
									</span>
									<span>{t.size.toFixed(4)}</span>
									<span>{ago(t.t)}</span>
								</div>
							)}
						</For>
					</div>
				</section>

				<section class={styles.bottom}>
					<div class={styles.panelTitle}>
						Positions
						<button type="button" class={styles.reset} onClick={market.reset}>
							reset wallet
						</button>
					</div>
					<div class={styles.positions}>
						<div class={styles.posRow}>
							<span>USD</span>
							<span>{wallet().cash.toFixed(2)}</span>
							<span />
						</div>
						<For each={positions()}>
							{(p) => (
								<div class={styles.posRow}>
									<span>{p.sym}</span>
									<span>{p.qty.toFixed(4)}</span>
									<span>≈ ${(p.qty * (p.token?.price ?? 0)).toFixed(2)}</span>
								</div>
							)}
						</For>
						<Show when={positions().length === 0}>
							<div class={styles.emptyPos}>
								No positions. Connect a wallet and buy the dip (the Sunset
								loop).
							</div>
						</Show>
					</div>
				</section>
			</main>

			<footer class={styles.footer}>
				<span>ScoopCoin is not a financial product, a currency, or a bus.</span>
				<a href="/sandbox">← back to scoopbus.run</a>
			</footer>
		</BarePage>
	)
}
