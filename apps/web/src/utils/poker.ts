/**
 * Scoop Bus Poker: every member's result at one parkrun is a playing card, and
 * the event as a whole is dealt a hand.
 *
 *  - The card's value is the seconds of the finish time: 23:14 and 18:14 are
 *    both a 14.
 *  - The card's suit is the minutes: 23:14 is a 23, 18:14 an 18. Suits alternate
 *    red and black by minute.
 *  - The finishing position is what makes a straight.
 *
 * Only one hand is awarded per event: the highest in {@link HAND_ORDER}, which
 * is deliberately not the regular poker order. Where the same hand type can be
 * made more than one way, the highest-scoring way is the one shown.
 */

import type { RunResultItem } from './api'
import { parseTimeToSeconds } from './misc'

export interface PokerCard {
	parkrunId: string
	name: string
	/** Finishing position at the event. */
	position: number
	/** The suit: whole minutes of the finish time. */
	minutes: number
	/** The value: the seconds of the finish time, 0–59. */
	seconds: number
	/** The time as it was reported, for display. */
	time: string
}

export type HandType =
	| 'royalFlush'
	| 'straightFlush'
	| 'straight'
	| 'flush'
	| 'xOfAKind'
	| 'fourOfAKind'
	| 'fullHouse'
	| 'threeOfAKind'
	| 'twoPairs'
	| 'onePair'
	| 'highCard'

export interface HandInfo {
	type: HandType
	name: string
	description: string
	/** How the multiplier reads on the page, e.g. "×100" or "×15 + X/10". */
	multiplierLabel: string
}

/** Highest first. This is the club's order, not the casino's. */
export const HAND_ORDER: HandType[] = [
	'royalFlush',
	'straightFlush',
	'straight',
	'flush',
	'xOfAKind',
	'fourOfAKind',
	'fullHouse',
	'threeOfAKind',
	'twoPairs',
	'onePair',
	'highCard',
]

export const HAND_INFO: Record<HandType, HandInfo> = {
	royalFlush: {
		type: 'royalFlush',
		name: 'Royal Flush',
		description:
			'1st, 2nd, 3rd, 4th and 5th place all taken by Scoop Bus members.',
		multiplierLabel: '×100',
	},
	straightFlush: {
		type: 'straightFlush',
		name: 'Straight Flush',
		description:
			'Five consecutive finishing positions, all finishing within the same minute.',
		multiplierLabel: '×50',
	},
	straight: {
		type: 'straight',
		name: 'Straight',
		description: 'Five consecutive finishing positions.',
		multiplierLabel: '×25',
	},
	flush: {
		type: 'flush',
		name: 'Flush',
		description: 'Five members finishing within the same minute.',
		multiplierLabel: '×20',
	},
	xOfAKind: {
		type: 'xOfAKind',
		name: 'X of a Kind',
		description:
			'Five or more members finishing on the same second. Shown as the number, e.g. "5 of a Kind".',
		multiplierLabel: '×15 + X/10',
	},
	fourOfAKind: {
		type: 'fourOfAKind',
		name: 'Four of a Kind',
		description: 'Four members finishing on the same second.',
		multiplierLabel: '×10',
	},
	fullHouse: {
		type: 'fullHouse',
		name: 'Full House',
		description: 'Three members on one second, and two more on another.',
		multiplierLabel: '×8',
	},
	threeOfAKind: {
		type: 'threeOfAKind',
		name: 'Three of a Kind',
		description: 'Three members finishing on the same second.',
		multiplierLabel: '×6',
	},
	twoPairs: {
		type: 'twoPairs',
		name: 'Two Pairs',
		description: 'Two separate pairs of members sharing a finishing second.',
		multiplierLabel: '×3',
	},
	onePair: {
		type: 'onePair',
		name: 'One Pair',
		description: 'Two members finishing on the same second.',
		multiplierLabel: '×2',
	},
	highCard: {
		type: 'highCard',
		name: 'High Card',
		description: 'No hand made — the single highest card on the day.',
		multiplierLabel: '×1',
	},
}

/** The hand types that can be earned as a celebration. High Card never is. */
export const CELEBRATION_HANDS = HAND_ORDER.filter((t) => t !== 'highCard')

export interface PokerHand {
	type: HandType
	/** "Full House", or "5 of a Kind" for an X of a Kind. */
	label: string
	/** The cards making up the hand, in display order. */
	cards: PokerCard[]
	/** Sum of minutes + seconds across the hand's cards. */
	baseScore: number
	multiplier: number
	score: number
}

export interface EventHand {
	event: string
	eventName: string
	eventNumber: number
	date: string
	/** Every member's card at this event, by finishing position. */
	cards: PokerCard[]
	/** The best hand dealt. Null only when nobody had a parseable time. */
	hand: PokerHand | null
}

/** Cache key for one event, matching how the results feed groups results. */
export function eventHandKey(event: string, eventNumber: number | string) {
	return `${event}#${eventNumber}`
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

export function resultToCard(result: RunResultItem): PokerCard | null {
	const total = parseTimeToSeconds(result.time)
	if (!Number.isFinite(total)) return null
	return {
		parkrunId: result.parkrunId,
		name: result.runnerName,
		position: result.position,
		minutes: Math.floor(total / 60),
		seconds: total % 60,
		time: result.time,
	}
}

/** A card's worth towards the base score. */
export function cardValue(card: PokerCard): number {
	return card.minutes + card.seconds
}

/** Suits alternate: even minutes are black, odd minutes are red. */
export function cardColor(card: PokerCard): 'red' | 'black' {
	return card.minutes % 2 === 0 ? 'black' : 'red'
}

/** "23:14" — the suit and value as they're printed in the card corner. */
export function cardLabel(card: PokerCard): string {
	return `${card.minutes}:${String(card.seconds).padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// Hand evaluation
// ---------------------------------------------------------------------------

function sum(cards: PokerCard[]): number {
	return cards.reduce((acc, c) => acc + cardValue(c), 0)
}

export const X_OF_A_KIND_BASE_MULTIPLIER = 15

function multiplierFor(type: HandType, size: number): number {
	switch (type) {
		case 'royalFlush':
			return 100
		case 'straightFlush':
			return 50
		case 'straight':
			return 25
		case 'flush':
			return 20
		case 'xOfAKind':
			return X_OF_A_KIND_BASE_MULTIPLIER + size / 10
		case 'fourOfAKind':
			return 10
		case 'fullHouse':
			return 8
		case 'threeOfAKind':
			return 6
		case 'twoPairs':
			return 3
		case 'onePair':
			return 2
		case 'highCard':
			return 1
	}
}

function makeHand(type: HandType, cards: PokerCard[]): PokerHand {
	const baseScore = sum(cards)
	const multiplier = multiplierFor(type, cards.length)
	return {
		type,
		label:
			type === 'xOfAKind' ? `${cards.length} of a Kind` : HAND_INFO[type].name,
		cards,
		baseScore,
		multiplier,
		// Two decimals at most: a 7.5 multiplier can leave a half point.
		score: Math.round(baseScore * multiplier * 100) / 100,
	}
}

/** The single best of several ways of making the same hand. */
function best(type: HandType, candidates: PokerCard[][]): PokerHand | null {
	let top: PokerHand | null = null
	for (const cards of candidates) {
		const hand = makeHand(type, cards)
		if (!top || hand.score > top.score) top = hand
	}
	return top
}

/** Cards sharing a value, largest sum first within each group. */
function groupBySeconds(cards: PokerCard[]): PokerCard[][] {
	const groups = new Map<number, PokerCard[]>()
	for (const card of cards) {
		const group = groups.get(card.seconds) ?? []
		group.push(card)
		groups.set(card.seconds, group)
	}
	return [...groups.values()].map((g) =>
		[...g].sort((a, b) => cardValue(b) - cardValue(a)),
	)
}

/** Every run of five consecutive finishing positions. */
function straightWindows(cards: PokerCard[]): PokerCard[][] {
	const sorted = [...cards].sort((a, b) => a.position - b.position)
	const windows: PokerCard[][] = []
	for (let i = 0; i + 4 < sorted.length; i++) {
		if (sorted[i + 4].position === sorted[i].position + 4) {
			windows.push(sorted.slice(i, i + 5))
		}
	}
	return windows
}

function findRoyalFlush(cards: PokerCard[]): PokerHand | null {
	const podium = cards
		.filter((c) => c.position >= 1 && c.position <= 5)
		.sort((a, b) => a.position - b.position)
	if (podium.length !== 5) return null
	return makeHand('royalFlush', podium)
}

function findStraightFlush(cards: PokerCard[]): PokerHand | null {
	return best(
		'straightFlush',
		straightWindows(cards).filter((w) =>
			w.every((c) => c.minutes === w[0].minutes),
		),
	)
}

function findStraight(cards: PokerCard[]): PokerHand | null {
	return best('straight', straightWindows(cards))
}

function findFlush(cards: PokerCard[]): PokerHand | null {
	const byMinute = new Map<number, PokerCard[]>()
	for (const card of cards) {
		const group = byMinute.get(card.minutes) ?? []
		group.push(card)
		byMinute.set(card.minutes, group)
	}
	const candidates: PokerCard[][] = []
	for (const group of byMinute.values()) {
		if (group.length < 5) continue
		// More than five in the minute: the five highest values make the hand.
		candidates.push(
			[...group].sort((a, b) => cardValue(b) - cardValue(a)).slice(0, 5),
		)
	}
	return best('flush', candidates)
}

function findXOfAKind(cards: PokerCard[]): PokerHand | null {
	return best(
		'xOfAKind',
		groupBySeconds(cards).filter((g) => g.length >= 5),
	)
}

function findOfAKind(
	type: 'fourOfAKind' | 'threeOfAKind' | 'onePair',
	size: number,
	cards: PokerCard[],
): PokerHand | null {
	return best(
		type,
		groupBySeconds(cards)
			.filter((g) => g.length >= size)
			.map((g) => g.slice(0, size)),
	)
}

function findFullHouse(cards: PokerCard[]): PokerHand | null {
	const groups = groupBySeconds(cards)
	const candidates: PokerCard[][] = []
	for (const triple of groups) {
		if (triple.length < 3) continue
		for (const pair of groups) {
			if (pair === triple || pair.length < 2) continue
			candidates.push([...triple.slice(0, 3), ...pair.slice(0, 2)])
		}
	}
	return best('fullHouse', candidates)
}

function findTwoPairs(cards: PokerCard[]): PokerHand | null {
	const pairs = groupBySeconds(cards)
		.filter((g) => g.length >= 2)
		.map((g) => g.slice(0, 2))
	const candidates: PokerCard[][] = []
	for (let i = 0; i < pairs.length; i++) {
		for (let j = i + 1; j < pairs.length; j++) {
			candidates.push([...pairs[i], ...pairs[j]])
		}
	}
	return best('twoPairs', candidates)
}

function findHighCard(cards: PokerCard[]): PokerHand | null {
	if (cards.length === 0) return null
	let top = cards[0]
	for (const card of cards) {
		if (cardValue(card) > cardValue(top)) top = card
	}
	return makeHand('highCard', [top])
}

/**
 * The best hand in a set of cards, walking {@link HAND_ORDER} from the top.
 * Falls through to High Card whenever there's at least one card.
 */
export function evaluateHand(cards: PokerCard[]): PokerHand | null {
	return (
		findRoyalFlush(cards) ??
		findStraightFlush(cards) ??
		findStraight(cards) ??
		findFlush(cards) ??
		findXOfAKind(cards) ??
		findOfAKind('fourOfAKind', 4, cards) ??
		findFullHouse(cards) ??
		findOfAKind('threeOfAKind', 3, cards) ??
		findTwoPairs(cards) ??
		findOfAKind('onePair', 2, cards) ??
		findHighCard(cards)
	)
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/**
 * Deal every event in the results its hand. Keyed by {@link eventHandKey}.
 */
export function buildEventHands(
	results: RunResultItem[],
): Map<string, EventHand> {
	const events = new Map<string, EventHand>()
	for (const result of results) {
		const key = eventHandKey(result.event, result.eventNumber)
		let entry = events.get(key)
		if (!entry) {
			entry = {
				event: result.event,
				eventName: result.eventName,
				eventNumber: result.eventNumber,
				date: result.date,
				cards: [],
				hand: null,
			}
			events.set(key, entry)
		}
		const card = resultToCard(result)
		if (card) entry.cards.push(card)
	}
	for (const entry of events.values()) {
		entry.cards.sort((a, b) => a.position - b.position)
		entry.hand = evaluateHand(entry.cards)
	}
	return events
}

/**
 * The cards of an event in display order: the hand first, then the rest by
 * finishing position. The page dims the ones that aren't in the hand.
 */
export function orderedCards(
	entry: EventHand,
): { card: PokerCard; inHand: boolean }[] {
	const inHand = new Set(entry.hand?.cards.map((c) => c.parkrunId) ?? [])
	return [
		...(entry.hand?.cards ?? []).map((card) => ({ card, inHand: true })),
		...entry.cards
			.filter((c) => !inHand.has(c.parkrunId))
			.map((card) => ({ card, inHand: false })),
	]
}

// ---------------------------------------------------------------------------
// Weeks
// ---------------------------------------------------------------------------

/** The Monday of the week holding a YYYY-MM-DD date, as YYYY-MM-DD. */
export function weekStartOf(date: string): string {
	const d = new Date(`${date}T00:00:00`)
	const day = (d.getDay() + 6) % 7 // Monday = 0
	d.setDate(d.getDate() - day)
	return toDateString(d)
}

function toDateString(d: Date): string {
	const y = d.getFullYear()
	const m = String(d.getMonth() + 1).padStart(2, '0')
	const day = String(d.getDate()).padStart(2, '0')
	return `${y}-${m}-${day}`
}

/** The most recent date anyone has a result for, or null with no results. */
export function latestResultDate(hands: Map<string, EventHand>): string | null {
	let latest = ''
	for (const entry of hands.values()) {
		if (entry.date > latest) latest = entry.date
	}
	return latest || null
}

/**
 * The events in the same Monday-to-Sunday week as `date`, best hand first.
 * Passing a Saturday gets that Saturday's parkruns, along with anything else
 * that week (a Sunday junior, a Christmas Day special).
 */
export function handsInWeek(
	hands: Map<string, EventHand>,
	date: string,
): EventHand[] {
	const start = weekStartOf(date)
	return [...hands.values()]
		.filter((entry) => weekStartOf(entry.date) === start)
		.sort((a, b) => (b.hand?.score ?? 0) - (a.hand?.score ?? 0))
}

/**
 * The events of the most recent week with results — "this week" as far as the
 * poker table is concerned, even when that Saturday was a while ago.
 */
export function latestWeekHands(hands: Map<string, EventHand>): EventHand[] {
	const latest = latestResultDate(hands)
	return latest ? handsInWeek(hands, latest) : []
}

/**
 * The events on one day, best hand first. Any day with results works: the
 * Saturdays, but also a Christmas Day or New Year's Day special.
 */
export function handsOnDate(
	hands: Map<string, EventHand>,
	date: string,
): EventHand[] {
	return [...hands.values()]
		.filter((entry) => entry.date === date)
		.sort((a, b) => (b.hand?.score ?? 0) - (a.hand?.score ?? 0))
}

/** Every day that has results, newest first. */
export function resultDates(hands: Map<string, EventHand>): string[] {
	const dates = new Set<string>()
	for (const entry of hands.values()) dates.add(entry.date)
	return [...dates].sort((a, b) => b.localeCompare(a))
}

/** True for a YYYY-MM-DD string that is a real calendar date. */
export function isValidDate(date: string | undefined): date is string {
	if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
	const d = new Date(`${date}T00:00:00`)
	return !Number.isNaN(d.getTime()) && toDateString(d) === date
}

/** The poker page for the day a result was run. */
export function pokerRoute(date: string): string {
	return `/poker/${date}`
}

/**
 * How a score was arrived at, for a tooltip:
 * `(31+12 + 43+12) × 2 (one pair multiplier)`.
 */
export function scoreWorking(hand: PokerHand): string {
	const cards = hand.cards.map((c) => `${c.minutes}+${c.seconds}`).join(' + ')
	return `(${cards}) × ${hand.multiplier} (${hand.label.toLowerCase()} multiplier)`
}

/** Format a hand score, keeping a decimal only when the multiplier left one. */
export function formatScore(score: number): string {
	return Number.isInteger(score)
		? score.toLocaleString('en-GB')
		: score.toLocaleString('en-GB', { maximumFractionDigits: 2 })
}
