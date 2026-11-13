import { createEffect, createSignal, onCleanup } from 'solid-js'
import { type Room, joinRoom } from 'trystero'
import { type Controls, packControls } from '../input'
import type { Playable } from '../runners/playable'
import { STORAGE_PREFIX } from '../saved/settings'
import type { Feed } from './Mirror'
import {
	APP_ID,
	type PadMessage,
	type PadMode,
	type PadView,
	type RaceFrame,
	type RaceStart,
	action,
	trysteroRoom,
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

/**
 * Whether `runner` is who the Host says this device picked: a custom
 * runner's id there has the device's in it too.
 */
export const isPicked = (runner: Playable, character: string | undefined) =>
	!!character &&
	(runner.id === character ||
		(!!runner.custom && character.endsWith(`:${runner.custom.id}`)))

/** Not heard from the Host for this long (it says something four times a second): reconnecting. */
const QUIET_MS = 2500
/**
 * Still nothing after this long: the connection's started again from
 * scratch, and again this long after, if that didn't do it. Only once it's
 * been in touch: finding the Room to begin with can take a while.
 */
const REJOIN_MS = 6000
const REJOIN_AGAIN_MS = 15_000
/** And nothing for this long: the Room's closed, most likely. */
const GONE_MS = 45_000

/** Joins Room `code`, until it's cleaned up. */
export function joinAsGuest(props: {
	code: string
	/** How it's playing, as it says when it says hello. */
	mode: () => PadMode
	/** A computer, showing the Room as the Host does. */
	screen?: boolean
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
	})

	/**
	 * In the Room: every peer's said hello to, the Host's the one that
	 * answers. Other devices in the Room are peers too, and say nothing back.
	 * Started again, from scratch, if the Host goes quiet (see `REJOIN_MS`).
	 */
	function connect() {
		const room: Room = joinRoom({ appId: APP_ID }, trysteroRoom(props.code))
		const pad = action<PadMessage>(room, 'pad')
		const input = action<number>(room, 'input')
		const fromHost = action<PadView>(room, 'view')
		const race = action<RaceStart>(room, 'race')
		const frames = action<RaceFrame>(room, 'frame')

		room.onPeerJoin((peer) => void pad.send(hello(), peer))
		fromHost.on((next, peer) => {
			heardAt = Date.now()
			setReconnecting(false)
			setGone(false)
			setLost(false)
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
		const to = host()
		if (to) void link.pad.send(message, to)
	}

	// Keeping in touch: quiet a moment, reconnecting; quiet a while, starting
	// again; quiet for good, gone. Not found to begin with, lost.
	const watchdog = window.setInterval(() => {
		const now = Date.now()
		const quiet = now - (heardAt ?? startedAt)
		if (heardAt && quiet > QUIET_MS) setReconnecting(true)
		if (heardAt && quiet > REJOIN_MS && now - rejoinedAt > REJOIN_AGAIN_MS)
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

	const sendHeld = () => {
		const to = host()
		if (to) void link.input.send(packControls(props.held()), to)
	}
	createEffect(sendHeld)
	const resend = window.setInterval(sendHeld, RESEND_MS)

	onCleanup(() => {
		closed = true
		window.clearInterval(watchdog)
		window.clearInterval(resend)
		document.removeEventListener('visibilitychange', onVisible)
		void link.room.leave()
	})

	return {
		view,
		gone,
		lost,
		reconnecting,
		/** The Round on now, playing remotely, and its frames as they come. */
		start,
		feed,
		send,
		/** Watching the big screen, or the race here. */
		switchMode(mode: PadMode) {
			send({ type: 'mode', mode })
		},
		/** Giving its seat up. */
		leave() {
			send({ type: 'leave' })
		},
	}
}
