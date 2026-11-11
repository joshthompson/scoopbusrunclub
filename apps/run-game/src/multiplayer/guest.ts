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
	const room: Room = joinRoom({ appId: APP_ID }, trysteroRoom(props.code))
	const pad = action<PadMessage>(room, 'pad')
	const input = action<number>(room, 'input')
	const fromHost = action<PadView>(room, 'view')
	const race = action<RaceStart>(room, 'race')
	const frames = action<RaceFrame>(room, 'frame')

	const [view, setView] = createSignal<PadView>()
	const [host, setHost] = createSignal<string>()
	/** The Host's left the Room. */
	const [gone, setGone] = createSignal(false)
	/** It's been looked for a while, and not found. */
	const [lost, setLost] = createSignal(false)

	const send = (message: PadMessage) => {
		const to = host()
		if (to) void pad.send(message, to)
	}

	// Every peer's said hello to: the Host's the one that answers. Other
	// devices in the Room are peers too, and say nothing back.
	room.onPeerJoin(
		(peer) =>
			void pad.send(
				{
					type: 'hello',
					device,
					mode: props.mode(),
					...(props.screen ? { screen: true } : {}),
				},
				peer,
			),
	)
	fromHost.on((next, peer) => {
		setHost(peer)
		setView(next)
		// Between Rounds: the last one's done with.
		if (next.stage !== 'round') setStart(undefined)
	})

	// Remote Play: the Round, as the Host sends it.
	const [start, setStart] = createSignal<RaceStart>()
	const feed: Feed = { frames: [] }
	race.on((next) => {
		feed.frames = []
		setStart(next)
	})
	frames.on((frame) => {
		if (frame.round !== start()?.round) return
		feed.frames.push(frame)
		// Never more than a second's worth, if it's not being played back.
		if (feed.frames.length > 30) feed.frames.splice(0, feed.frames.length - 30)
	})

	room.onPeerLeave((peer) => {
		if (peer === host()) setGone(true)
	})
	const notFound = window.setTimeout(() => !host() && setLost(true), FIND_MS)

	const sendHeld = () => {
		const to = host()
		if (to) void input.send(packControls(props.held()), to)
	}
	createEffect(sendHeld)
	const resend = window.setInterval(sendHeld, RESEND_MS)

	onCleanup(() => {
		window.clearTimeout(notFound)
		window.clearInterval(resend)
		void room.leave()
	})

	return {
		view,
		gone,
		lost,
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
