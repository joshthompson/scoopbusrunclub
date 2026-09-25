/**
 * ScoopCoin's market: a handful of tokens on a random walk, with candles,
 * an order book and a trade tape derived from the walk. Nothing here is
 * real, which puts it level with most exchanges.
 */
import { CLUB_MEMBERS } from '@shared/members'
import { createStore, produce } from 'solid-js/store'
import { seededRandom } from '../shared/random'

export interface Candle {
	t: number
	o: number
	h: number
	l: number
	c: number
	v: number
}

export interface Token {
	symbol: string
	name: string
	price: number
	open24: number
	high24: number
	low24: number
	volume24: number
	/** Per-tick volatility. */
	vol: number
	candles: Candle[]
	/** Members' tokens carry their sprite colour. */
	color: string
}

export interface Trade {
	id: number
	symbol: string
	price: number
	size: number
	side: 'buy' | 'sell'
	t: number
}

export interface Headline {
	id: number
	text: string
	t: number
}

export interface Wallet {
	cash: number
	holdings: Record<string, number>
}

/** One candle every few seconds; the UI calls it "1 lap". */
export const CANDLE_MS = 4000
export const HISTORY = 90
export const TICK_MS = 500

const WALLET_KEY = 'sandbox:scoopcoin:wallet'
const STARTING_CASH = 10_000

const NEWS_UP = [
	'{sym} rallies {pct}% after a course PB at Haga',
	'{sym} surges {pct}% on rumours of a flat course',
	'{sym} up {pct}% as tail walker confirms "everyone finished"',
	'Whales accumulate {sym} (+{pct}%) ahead of Saturday',
	'{sym} jumps {pct}%: cinnamon bun supply secured',
	'{sym} climbs {pct}% after negative split confirmed',
]

const NEWS_DOWN = [
	'{sym} slides {pct}% after a hilly course announcement',
	'{sym} down {pct}% on reports of a headwind on the Sunset loop',
	'{sym} drops {pct}%: barcode forgotten at home',
	'{sym} falls {pct}% as run director declares "parkrun\'s not a race"',
	'{sym} sheds {pct}% amid unexpected fika stop mid-run',
	'Sell-off in {sym} (-{pct}%) after a positive split',
]

const EVERGREEN = [
	'Analysts: "number go up, unless it rains"',
	'SCOOP Foundation announces roadmap: turn left at the bus',
	'FIKA/SCOOP pair now tradeable; liquidity provided by a thermos',
	'Regulators confirm parkrun is not a race; markets unmoved',
	'DNF token hits all-time low, holders "just walking it in"',
	'Staking rewards paid in finish tokens (not redeemable)',
	'Breaking: PB token halving scheduled for the next flat course',
]

function loadWallet(): Wallet {
	try {
		const raw = localStorage.getItem(WALLET_KEY)
		if (raw) return JSON.parse(raw) as Wallet
	} catch {}
	return { cash: STARTING_CASH, holdings: {} }
}

function saveWallet(w: Wallet) {
	try {
		localStorage.setItem(WALLET_KEY, JSON.stringify(w))
	} catch {}
}

function buildToken(
	symbol: string,
	name: string,
	price: number,
	vol: number,
	color: string,
	seed: number,
): Token {
	const rng = seededRandom(seed)
	const candles: Candle[] = []
	let p = price * (0.7 + rng.next() * 0.6)
	const now = Date.now()
	for (let i = HISTORY; i > 0; i--) {
		const o = p
		let h = o
		let l = o
		let c = o
		for (let k = 0; k < 8; k++) {
			c *= Math.exp((rng.next() - 0.5) * vol * 2)
			h = Math.max(h, c)
			l = Math.min(l, c)
		}
		candles.push({ t: now - i * CANDLE_MS, o, h, l, c, v: rng.int(50, 900) })
		p = c
	}
	const last = candles[candles.length - 1].c
	return {
		symbol,
		name,
		price: last,
		open24: candles[0].o,
		high24: Math.max(...candles.map((c) => c.h)),
		low24: Math.min(...candles.map((c) => c.l)),
		volume24: candles.reduce((n, c) => n + c.v, 0),
		vol,
		candles: [...candles, { t: now, o: last, h: last, l: last, c: last, v: 0 }],
		color,
	}
}

const MEMBER_COLORS: Record<string, string> = {
	josh: '#e0382f',
	keith: '#414443',
	claire: '#9a54bf',
	lyra: '#a377bc',
	adam: '#2f7fb8',
	anna: '#f2a33a',
	eline: '#2ec27e',
	rick: '#f4c542',
	sophie: '#f5a3c7',
	august: '#77a15d',
	alisa: '#d8382b',
	link: '#8e5bbf',
	otherJosh: '#e0382f',
	mikael: '#3aa3d6',
	mia: '#333333',
	david: '#81bbbe',
}

function memberSymbol(name: string) {
	if (name === 'Other Josh') return 'OJ'
	return name.toUpperCase().slice(0, 5)
}

export function createMarket() {
	let seed = Date.now() % 100_000
	const tokens: Token[] = [
		buildToken('SCOOP', 'ScoopCoin', 42.069, 0.006, '#f0b90b', seed++),
		buildToken('FIKA', 'Fika Token', 3.5, 0.012, '#c68642', seed++),
		buildToken('PB', 'Personal Best', 1337, 0.004, '#0ecb81', seed++),
		buildToken('DNF', 'Did Not Finish', 0.0042, 0.03, '#f6465d', seed++),
		buildToken('HAGA', 'Haga Loop', 5.0, 0.008, '#77a15d', seed++),
		...Object.entries(CLUB_MEMBERS).map(([key, m]) =>
			buildToken(
				memberSymbol(m.name),
				`${m.name} Token`,
				0.5 + ((seededRandom(seed++).next() * 300) | 0),
				0.008 + seededRandom(seed++).next() * 0.012,
				MEMBER_COLORS[key] ?? '#888',
				seed++,
			),
		),
	]

	const [state, setState] = createStore({
		tokens,
		trades: [] as Trade[],
		news: [{ id: 0, text: EVERGREEN[0], t: Date.now() }] as Headline[],
		wallet: loadWallet(),
	})

	let tradeId = 1
	let newsId = 1
	let evergreenIndex = 1
	let lastEvergreen = Date.now()

	function tick() {
		const now = Date.now()
		setState(
			produce((s) => {
				for (const token of s.tokens) {
					// Random walk with a whisper of mean reversion toward the 24h open.
					const drift = (Math.log(token.open24) - Math.log(token.price)) * 0.002
					let step = (Math.random() - 0.5) * token.vol * 2 + drift
					// Every so often, news.
					if (Math.random() < 0.004) {
						const up = Math.random() < 0.5
						const pct = 4 + Math.random() * 10
						step += (up ? 1 : -1) * Math.log(1 + pct / 100)
						const pool = up ? NEWS_UP : NEWS_DOWN
						s.news.unshift({
							id: newsId++,
							text: pool[Math.floor(Math.random() * pool.length)]
								.replace('{sym}', token.symbol)
								.replace('{pct}', pct.toFixed(1)),
							t: now,
						})
					}
					token.price = Math.max(0.000001, token.price * Math.exp(step))
					token.high24 = Math.max(token.high24, token.price)
					token.low24 = Math.min(token.low24, token.price)

					const last = token.candles[token.candles.length - 1]
					if (now - last.t >= CANDLE_MS) {
						token.candles.push({
							t: now,
							o: token.price,
							h: token.price,
							l: token.price,
							c: token.price,
							v: 0,
						})
						if (token.candles.length > HISTORY + 1) token.candles.shift()
						token.open24 = token.candles[0].o
					} else {
						last.c = token.price
						last.h = Math.max(last.h, token.price)
						last.l = Math.min(last.l, token.price)
						const size = Math.random() * 40
						last.v += size
						token.volume24 += size
					}

					if (Math.random() < 0.35) {
						s.trades.unshift({
							id: tradeId++,
							symbol: token.symbol,
							price: token.price,
							size: Math.round(Math.random() * 500) / 100 + 0.01,
							side: step >= 0 ? 'buy' : 'sell',
							t: now,
						})
					}
				}
				if (s.trades.length > 200) s.trades.length = 200
				if (now - lastEvergreen > 15_000) {
					lastEvergreen = now
					s.news.unshift({
						id: newsId++,
						text: EVERGREEN[evergreenIndex++ % EVERGREEN.length],
						t: now,
					})
				}
				if (s.news.length > 30) s.news.length = 30
			}),
		)
	}

	const timer = setInterval(tick, TICK_MS)

	function token(symbol: string) {
		return state.tokens.find((t) => t.symbol === symbol)
	}

	function trade(symbol: string, side: 'buy' | 'sell', amount: number) {
		const t = token(symbol)
		if (!t || !(amount > 0)) return 'Enter an amount.'
		const total = amount * t.price
		if (side === 'buy') {
			if (total > state.wallet.cash)
				return 'Insufficient funds. Have you tried volunteering?'
			setState('wallet', 'cash', (c) => c - total)
			setState('wallet', 'holdings', symbol, (h) => (h ?? 0) + amount)
		} else {
			const held = state.wallet.holdings[symbol] ?? 0
			if (amount > held + 1e-9)
				return `You only hold ${held.toFixed(4)} ${symbol}.`
			setState('wallet', 'cash', (c) => c + total)
			setState('wallet', 'holdings', symbol, held - amount)
		}
		saveWallet(state.wallet)
		setState('trades', (list) => [
			{
				id: tradeId++,
				symbol,
				price: t.price,
				size: amount,
				side,
				t: Date.now(),
			},
			...list,
		])
		return null
	}

	function reset() {
		setState('wallet', { cash: STARTING_CASH, holdings: {} })
		saveWallet(state.wallet)
	}

	return {
		state,
		token,
		trade,
		reset,
		dispose: () => clearInterval(timer),
	}
}

export type Market = ReturnType<typeof createMarket>

/** An order book around the price, regenerated whenever the price moves. */
export function orderBook(price: number, seedFrom: number) {
	const rng = seededRandom(Math.floor(seedFrom * 1000))
	const asks: { price: number; size: number }[] = []
	const bids: { price: number; size: number }[] = []
	let a = price
	let b = price
	for (let i = 0; i < 10; i++) {
		a *= 1 + 0.0004 + rng.next() * 0.0012
		b *= 1 - 0.0004 - rng.next() * 0.0012
		asks.push({ price: a, size: rng.next() * 40 + 0.5 })
		bids.push({ price: b, size: rng.next() * 40 + 0.5 })
	}
	return { asks: asks.reverse(), bids }
}

export function fmtPrice(n: number) {
	if (n >= 1000)
		return n.toLocaleString(undefined, {
			maximumFractionDigits: 2,
			minimumFractionDigits: 2,
		})
	if (n >= 1) return n.toFixed(2)
	if (n >= 0.01) return n.toFixed(4)
	return n.toFixed(6)
}

export function pct(from: number, to: number) {
	return ((to - from) / from) * 100
}
