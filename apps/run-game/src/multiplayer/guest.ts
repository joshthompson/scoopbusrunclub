import { createEffect, createSignal, onCleanup } from 'solid-js'
import { type Controls, packControls } from '../input'
import { unlockedRunners } from '../runners/bonus'
import { type CustomRunner, customRunners } from '../runners/customRunners'
import { CLUB, type Playable, customPlayable } from '../runners/playable'
import { STORAGE_PREFIX } from '../saved/settings'
import type { Feed } from './Mirror'
import { openRoom } from './connection'
import type {
	PadMessage,
	PadMode,
	PadView,
	RaceFrame,
	RaceStart,
} from './protocol'

/**
 * A device's side of a Room it's joined, as a phone or a computer: saying
 * hello to its Host, sending what its Player's holding, and keeping up with
 * what the Host tells it to show, and the race, playing remotely.
 */

/** How often what's held is sent again, even unchanged: in case one went missing. */
const RESEND_MS = 200
/** How long to look for the Room before saying it can't be found. */
const FIND_MS = 20_000

/**
 * This device, the same every time, so dropping out and coming back gets the
 * same seat. Only ever sent to a Room's Host.
 */
function deviceId() {
	const key = `${STORAGE_PREFIX}device`
	try {
		const known = localStorage.getItem(key)
		if (known) return known
		const made = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
		localStorage.setItem(key, made)
		return made
	} catch {
		return `${Date.now()}-${Math.random()}`
	}
}

/** How this device played last time, to start on next time: `fallback` if it hasn't. */
export function lastMode(key: string, fallback: PadMode): PadMode {
	try {
		const mode = localStorage.getItem(`${STORAGE_PREFIX}${key}`)
		return mode === 'remote' || mode === 'controller' ? mode : fallback
	} catch {
		return fallback
	}
}
export function rememberMode(key: string, mode: PadMode) {
	try {
		localStorage.setItem(`${STORAGE_PREFIX}${key}`, mode)
	} catch {
		// Asked again next time, that's all.
	}
}

/** How long a Room's remembered for, for joining it again without asking how. */
const LAST_ROOM_MS = 6 * 60 * 60 * 1000

/**
 * The Room this device was last in, under `key`, and how it played there,
 * if it was in the last few hours: scanning its QR code again, or
 * reloading, goes straight back in, the same way.
 */
export function lastRoom(
	key: string,
): { code: string; mode: PadMode } | undefined {
	try {
		const saved = JSON.parse(
			localStorage.getItem(`${STORAGE_PREFIX}${key}`) ?? 'null',
		)
		if (
			typeof saved?.code === 'string' &&
			(saved.mode === 'remote' || saved.mode === 'controller') &&
			typeof saved.at === 'number' &&
			Date.now() - saved.at < LAST_ROOM_MS
		)
			return { code: saved.code, mode: saved.mode }
	} catch {
		// Nothing remembered.
	}
	return undefined
}
export function rememberRoom(
	key: string,
	room?: { code: string; mode: PadMode },
) {
	try {
		if (room)
			localStorage.setItem(
				`${STORAGE_PREFIX}${key}`,
				JSON.stringify({ ...room, at: Date.now() }),
			)
		else localStorage.removeItem(`${STORAGE_PREFIX}${key}`)
	} catch {
		// Asked again next time, that's all.
	}
}

/**
 * Into Room `code` again from scratch, as a new page: what Try Again and
 * Rejoin do. Joining again within the page doesn't do it: trystero knows a
 * page by one id for as long as it's open, and a Host still holding on to
 * a failed try from that id ignores it for up to half a minute. A new page
 * is a new id, new relay connections, and fresh TURN servers. Its link
 * (see `index.tsx`) comes back in, on a phone or a computer, and the same
 * seat's kept, by the device.
 */
export function joinAfresh(code: string) {
	const url = new URL(import.meta.env.BASE_URL, location.href)
	url.searchParams.set('pad', code)
	location.replace(url)
}

/**
 * What a device that's not in Room `code` yet says: still joining, not
 * found it, or found it but not got through. `failed` once it's worth
 * trying again.
 */
export function joiningMessage(
	code: string,
	link: { lost: () => boolean; blocked: () => boolean },
) {
	if (link.blocked())
		return {
			failed: true,
			title: `Can't connect to ${code}`,
			text: 'Found it, but couldn’t get through: your networks are keeping you apart. Try again, or join the same Wi-Fi as the big screen.',
		}
	if (link.lost())
		return {
			failed: true,
			title: `Can't find ${code}`,
			text: 'Check the code, and that the game’s open on the big screen.',
		}
	return {
		failed: false,
		title: `Joining ${code}…`,
		text: 'Finding the big screen.',
	}
}

/** What this device's Player goes by in Rooms, if they've said. */
export function savedPlayerName(): string {
	try {
		return localStorage.getItem(`${STORAGE_PREFIX}player-name`) ?? ''
	} catch {
		return ''
	}
}
export function savePlayerName(name: string) {
	try {
		if (name) localStorage.setItem(`${STORAGE_PREFIX}player-name`, name)
		else localStorage.removeItem(`${STORAGE_PREFIX}player-name`)
	} catch {
		// Kept till the page closes: the Host has it anyway.
	}
}

/**
 * Whether `runner` is who the Host says this device picked: a custom
 * runner's id there has the device's in it too.
 */
export const isPicked = (runner: Playable, character: string | undefined) =>
	!!character &&
	(runner.id === character ||
		(!!runner.custom && character.endsWith(`:${runner.custom.id}`)))

/**
 * One of the big screen's own runners, for a device that's joined to pick:
 * by its id there, with nothing of it sent back, so the Host runs them as
 * its own (see `pick` in `room`). Not this device's to change.
 */
export const hostPlayable = (runner: CustomRunner): Playable => ({
	...customPlayable(runner),
	custom: undefined,
})

/**
 * Who a device that's joined a Room can be: its own runners, newest first,
 * then the big screen's, then the club, then anyone unlocked here or there.
 */
export const joinedCharacters = (view: PadView | undefined): Playable[] => [
	...customRunners().map(customPlayable).reverse(),
	...(view?.hostRunners ?? []).map(hostPlayable),
	...CLUB,
	...unlockedRunners(view?.unlocked),
]

/** Not heard from the Host for this long (it says something four times a second): reconnecting. */
const QUIET_MS = 2500
/**
 * Still nothing after this long: the connection's started again from
 * scratch, and again this long after, if that didn't do it. Only once it's
 * been in touch: finding the Room to begin with can take a while.
 */
const REJOIN_MS = 6000
const REJOIN_AGAIN_MS = 15_000
/**
 * Not found yet after this long: looked for again from scratch, and again
 * this long after, till it is. A first try that went wrong (a relay that
 * dropped a message, a connection that never came up) isn't waited on for
 * good.
 */
const REFIND_MS = 12_000
/** And nothing for this long: the Room's closed, most likely. */
const GONE_MS = 45_000

/** Joins Room `code`, until it's cleaned up. */
export function joinAsGuest(props: {
	code: string
	/** How it's playing, as it says when it says hello. */
	mode: () => PadMode
	/** A computer, showing the Room as the Host does. */
	screen?: boolean
	/** What its Player goes by, as it says when it says hello. */
	name?: () => string
	/** What its Player's holding. */
	held: () => Controls
}) {
	const device = deviceId()

	const [view, setView] = createSignal<PadView>()
	const [host, setHost] = createSignal<string>()
	/** The Host's left the Room, or hasn't been heard from in so long it must have. */
	const [gone, setGone] = createSignal(false)
	/** It's been looked for a while, and not found. */
	const [lost, setLost] = createSignal(false)
	/**
	 * Found, but not reached: their networks keep this device and the Room
	 * apart. Still tried again (see `REFIND_MS`), but not worth waiting on.
	 */
	const [blocked, setBlocked] = createSignal(false)
	/** The Room's been ended, and said so: nothing to get back in touch with. */
	const [ended, setEnded] = createSignal(false)
	/** Heard from before, but not for a moment: getting back in touch. */
	const [reconnecting, setReconnecting] = createSignal(false)

	// Remote Play: the Round, as the Host sends it.
	const [start, setStart] = createSignal<RaceStart>()
	const feed: Feed = { frames: [] }

	const startedAt = Date.now()
	/** Gone, cleaned up: nothing more to rejoin. */
	let closed = false
	/** When the Host was last heard from, if it has been. */
	let heardAt: number | undefined
	let rejoinedAt = 0
	/** When the start of a Round was last asked for again: not too often. */
	let resyncedAt = 0

	const hello = (): PadMessage => ({
		type: 'hello',
		device,
		mode: props.mode(),
		...(props.screen ? { screen: true } : {}),
		...(props.name ? { name: props.name() } : {}),
	})

	/**
	 * In the Room: every peer's said hello to, the Host's the one that
	 * answers. Other devices in the Room are peers too, and say nothing back.
	 * Started again, from scratch, if the Host goes quiet (see `REJOIN_MS`),
	 * or isn't found (see `REFIND_MS`).
	 */
	function connect() {
		const room = openRoom(props.code)
		const pad = room.action<PadMessage>('pad')
		const input = room.action<number>('input')
		const fromHost = room.action<PadView>('view')
		const race = room.action<RaceStart>('race')
		const frames = room.action<RaceFrame>('frame')

		room.onPeerJoin((peer) => pad.send(hello(), peer))
		fromHost.on((next, peer) => {
			if (closed) return
			if (next.ended) return endIt()
			heardAt = Date.now()
			setReconnecting(false)
			setGone(false)
			setLost(false)
			setBlocked(false)
			setHost(peer)
			setView(next)
			// Between Rounds: the last one's done with.
			if (next.stage !== 'round') setStart(undefined)
			// A Round on, playing it here, and its start never came (or went
			// missing): asked for again.
			else if (next.mode === 'remote' && next.status !== 'waiting')
				if (start()?.round !== next.round) resync()
		})
		race.on((next) => {
			feed.frames = []
			setStart(next)
		})
		frames.on((frame) => {
			const round = start()?.round
			// A Round's frames, but not its start: asked for again.
			if (frame.round !== round) {
				if (round === undefined || frame.round > round) resync()
				return
			}
			feed.frames.push(frame)
			// Never more than a second's worth, if it's not being played back.
			if (feed.frames.length > 30)
				feed.frames.splice(0, feed.frames.length - 30)
		})
		// The Host gone: most likely only for a moment, a blip, or the phone
		// locked. Back in touch once it's there again (see the watchdog).
		room.onPeerLeave((peer) => {
			if (peer === host()) setReconnecting(true)
		})
		room.onBlocked(() => {
			if (!heardAt) setBlocked(true)
		})
		return { room, pad, input }
	}
	let link = connect()

	function resync() {
		const now = Date.now()
		if (now - resyncedAt < 1000) return
		resyncedAt = now
		send({ type: 'resync' })
	}

	/** Out of the Room and back in again, from scratch: the same seat, by this device. */
	async function rejoin() {
		rejoinedAt = Date.now()
		const was = link
		await was.room.leave()
		if (closed) return
		link = connect()
	}

	const send = (message: PadMessage) => {
		if (closed) return
		const to = host()
		if (to) link.pad.send(message, to)
	}

	// Keeping in touch: quiet a moment, reconnecting; quiet a while, starting
	// again; quiet for good, gone. Not found to begin with, looked for again,
	// and in a while, lost (though still looked for).
	const watchdog = window.setInterval(() => {
		const now = Date.now()
		const quiet = now - (heardAt ?? startedAt)
		if (heardAt && quiet > QUIET_MS) setReconnecting(true)
		if (heardAt && quiet > REJOIN_MS && now - rejoinedAt > REJOIN_AGAIN_MS)
			void rejoin()
		if (!heardAt && now - Math.max(startedAt, rejoinedAt) > REFIND_MS)
			void rejoin()
		if (!heardAt && quiet > FIND_MS) setLost(true)
		if (heardAt && quiet > GONE_MS) setGone(true)
	}, 1000)
	// Back to the phone after it's been put down or locked: straight back in
	// touch, if it's lost it.
	const onVisible = () => {
		if (document.visibilityState !== 'visible') return
		if (heardAt && Date.now() - heardAt > QUIET_MS) void rejoin()
	}
	document.addEventListener('visibilitychange', onVisible)

	/** The Room ended: out of it, and no more looking for it. */
	function endIt() {
		closed = true
		setReconnecting(false)
		setEnded(true)
		window.clearInterval(watchdog)
		window.clearInterval(resend)
		void link.room.leave()
	}

	const sendHeld = () => {
		if (closed) return
		const to = host()
		if (to) link.input.send(packControls(props.held()), to)
	}
	createEffect(sendHeld)
	const resend = window.setInterval(sendHeld, RESEND_MS)

	onCleanup(() => {
		document.removeEventListener('visibilitychange', onVisible)
		// Ended, it's left already.
		if (closed) return
		closed = true
		window.clearInterval(watchdog)
		window.clearInterval(resend)
		void link.room.leave()
	})

	return {
		view,
		gone,
		ended,
		lost,
		blocked,
		reconnecting,
		/** The Round on now, playing remotely, and its frames as they come. */
		start,
		feed,
		send,
		/** Watching the big screen, or the race here. */
		switchMode(mode: PadMode) {
			send({ type: 'mode', mode })
		},
		/** Going by `name`, or, blank, their runner's. */
		rename(name: string) {
			send({ type: 'name', name })
		},
		/** Giving its seat up. */
		leave() {
			send({ type: 'leave' })
		},
	}
}
