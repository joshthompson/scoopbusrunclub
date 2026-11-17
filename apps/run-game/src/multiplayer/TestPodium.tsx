import { createSignal, onCleanup, onMount } from 'solid-js'
import { podiumPlayers } from '../debug'
import { HAT_RULES, type HatKind } from '../game/hats'
import { type Controls, NOTHING_HELD, keyboardControls } from '../input'
import { UNLOCKABLES } from '../runners/bonus'
import { CLUB } from '../runners/playable'
import { Podium } from './Podium'
import { COLOURS, type Seat } from './room'

/**
 * A Podium to try out, from the console (`testPodium()` in `debug.ts`):
 * 4 to 8 Players (or as many as it's told), made up, the club's members as them (now and then a
 * runner or two there is to unlock, too, as if someone had), points and
 * all, and some in a hat, as if they'd finished the last Round in one.
 * You're on the arrows, someone else can have WASD, and everyone else
 * runs about by themselves. Back to the title from either button, or
 * when its countdown runs out.
 */

/** Hats someone might have finished in: any but a Pumpkin, which needs carving. */
const HATS = (Object.keys(HAT_RULES) as HatKind[]).filter(
	(k) => k !== 'pumpkin',
)

/** How long it stays up, in seconds, before it's back to the title. */
const STAYS_UP = 90

function made(): Seat[] {
	const count = podiumPlayers ?? 4 + Math.floor(Math.random() * 5)
	const shuffled = <T,>(all: T[]) => [...all].sort(() => Math.random() - 0.5)
	// Now and then, one to three of them a runner to unlock: unlocked or
	// not in this browser, to see them on the Podium.
	const unlocked =
		Math.random() < 0.4 ? Math.min(count, 1 + Math.floor(Math.random() * 3)) : 0
	const who = [
		...shuffled(UNLOCKABLES).slice(0, unlocked),
		...shuffled(CLUB).slice(0, count - unlocked),
	]
	// Points, each a few under the one before, now and then level.
	let points = 14 + Math.floor(Math.random() * 20)
	const seats = who.map(
		(runner, i): Seat => ({
			id: `test-${i}`,
			kind: i === 0 ? 'arrows' : i === 1 ? 'wasd' : 'phone',
			colour: COLOURS[i % COLOURS.length],
			character: runner.id,
			ready: true,
			points,
			waiting: false,
			// About half of them in a hat.
			hat:
				Math.random() < 0.5
					? { kind: HATS[Math.floor(Math.random() * HATS.length)] }
					: undefined,
		}),
	)
	for (const seat of seats) {
		seat.points = points
		const gap = Math.random() < 0.15 ? 0 : 1 + Math.floor(Math.random() * 4)
		points = Math.max(0, points - gap)
	}
	// Not in the order they came: who's where is shuffled.
	return seats.sort(() => Math.random() - 0.5)
}

/**
 * Someone running about by themselves: off one way or the other, or stood
 * still, a while each, a jump now and then, and now and then, running, a
 * slide.
 */
function wanderer(): () => Controls {
	let doing: Controls = NOTHING_HELD
	let until = 0
	let jumpUntil = 0
	let slideUntil = 0
	return () => {
		const now = performance.now()
		if (now > until) {
			const roll = Math.random()
			doing = {
				...NOTHING_HELD,
				left: roll < 0.35,
				right: roll > 0.65,
			}
			until = now + 400 + Math.random() * 1400
		}
		if (now > jumpUntil + 200 && Math.random() < 0.012)
			jumpUntil = now + 150 + Math.random() * 300
		const running = doing.left || doing.right
		if (running && now > slideUntil + 600 && Math.random() < 0.006)
			slideUntil = now + 300 + Math.random() * 600
		return {
			...doing,
			up: now < jumpUntil,
			down: running && now < slideUntil,
		}
	}
}

export default function TestPodium(props: { onLeave: () => void }) {
	const seats = made()
	const bots = new Map(seats.map((seat) => [seat.id, wanderer()]))
	const [lobbyIn, setLobbyIn] = createSignal(STAYS_UP)
	onMount(() => {
		const timer = setInterval(() => {
			const left = lobbyIn() - 1
			if (left <= 0) props.onLeave()
			else setLobbyIn(left)
		}, 1000)
		onCleanup(() => clearInterval(timer))
	})
	return (
		<Podium
			title="Test Room"
			rounds={3 + Math.floor(Math.random() * 6)}
			seats={seats}
			placings={[]}
			lobbyIn={lobbyIn()}
			onLobby={props.onLeave}
			onEnd={props.onLeave}
			endLabel="Back to the title"
			controlsFor={(seat) =>
				seat.kind === 'arrows' || seat.kind === 'wasd'
					? keyboardControls(seat.kind)
					: (bots.get(seat.id) ?? (() => NOTHING_HELD))
			}
		/>
	)
}
