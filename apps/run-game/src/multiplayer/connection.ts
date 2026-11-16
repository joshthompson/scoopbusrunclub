import { type MessageAction, type Room, joinRoom } from 'trystero'
import { ask, isObject } from '../online/backend'
import { APP_ID, trysteroRoom } from './protocol'

/**
 * How a device gets into a Room: finding the others over Nostr relays, then
 * a WebRTC connection straight to them, through a TURN server if it can't
 * be made directly.
 */

/**
 * The Nostr relays a Room's found on. Left to itself, trystero picks five of
 * its own list by the app's id, and for ours two of those five were dead and
 * two more slow. These were each checked (November 2026) to take the
 * short-lived events trystero sends and pass them on within a second from
 * Stockholm, with no sign-up, proof of work or AUTH. Every device must use
 * the same list, or they may never meet. Trystero gives up on any that
 * starts refusing, and backs off from any that says it's had too many.
 */
const RELAYS = [
	'wss://nos.lol',
	'wss://relay.primal.net',
	'wss://nostr.mom',
	'wss://relay.snort.social',
	'wss://nostr.oxtr.dev',
	'wss://relay.sigit.io',
	'wss://purplerelay.com',
	'wss://nostr.sathoarder.com',
]

/**
 * A TURN server, as the backend hands them out (see `/api/run/ice-servers`):
 * a go-between for two devices that can't reach each other directly, such
 * as a phone on mobile data and a computer on Wi-Fi, or two phones on a
 * guest network that keeps its devices apart. Without one they never connect.
 */
interface IceServer {
	urls: string | string[]
	username?: string
	credential?: string
}

/** How long a Room waits for the TURN servers before joining without them. */
const ICE_WAIT_MS = 2500
/** How long the backend's TURN credentials are used for before asking again (they last longer). */
const ICE_FRESH_MS = 60 * 60 * 1000

let ice: { servers: IceServer[]; at: number } | undefined
let asking: Promise<IceServer[]> | undefined

const isIceServer = (value: unknown): value is IceServer =>
	isObject(value) &&
	(typeof value.urls === 'string' ||
		(Array.isArray(value.urls) &&
			value.urls.every((url) => typeof url === 'string')))

/**
 * The TURN servers, asked for once and kept: none if there's no backend, it
 * hasn't any, or it can't be reached, and a Room still works for most
 * devices without them. Worth calling before a Room's opened, to have them
 * ready.
 */
export function iceServers(): Promise<IceServer[]> {
	if (ice && Date.now() - ice.at < ICE_FRESH_MS)
		return Promise.resolve(ice.servers)
	asking ??= ask('/api/run/ice-servers')
		.then((answer) => {
			const servers =
				isObject(answer) && Array.isArray(answer.iceServers)
					? answer.iceServers.filter(isIceServer)
					: []
			// Only an answer's kept: no answer, and it's asked again next time.
			if (servers.length) ice = { servers, at: Date.now() }
			return servers.length ? servers : (ice?.servers ?? [])
		})
		.finally(() => {
			asking = undefined
		})
	return asking
}

/** The TURN servers, or after `ms`, whatever's known by then. */
const iceServersWithin = (ms: number) =>
	Promise.race([
		iceServers(),
		new Promise<IceServer[]>((resolve) =>
			setTimeout(() => resolve(ice?.servers ?? []), ms),
		),
	])

/** One of a Room's kinds of message, typed (trystero's own only take plain JSON). */
export interface RoomAction<T> {
	/** To `to`, or everyone. Dropped if the Room's not joined yet: nobody's there to hear it. */
	send: (data: T, to?: string | string[]) => void
	on: (handle: (data: T, peer: string) => void) => void
}

export interface GameRoom {
	action: <T>(name: string) => RoomAction<T>
	onPeerJoin: (handle: (peer: string) => void) => void
	onPeerLeave: (handle: (peer: string) => void) => void
	/**
	 * Another device in the Room was found, and a connection to it started,
	 * but it couldn't get through: their networks keep them apart, most
	 * likely, with no TURN server to go between them.
	 */
	onBlocked: (handle: () => void) => void
	leave: () => Promise<void>
}

/**
 * How long a connection that's found the device at the other end gets to
 * get through before it's taken as blocked. One that will is through in a
 * second or two, over a TURN server too: one that won't is never told it's
 * failed, and checks for as long as it's left to.
 */
const BLOCKED_MS = 8000

let warnedNoTurn = false

/**
 * Room `code`, joined once the TURN servers are in (or it's waited long
 * enough for them). Its actions and handlers can be set up straight away.
 *
 * Not trystero's `passive`, for guests, tempting as connecting them to the
 * Host alone is: a passive guest waits to hear the Host announce itself,
 * which it does only once a minute once it's settled, so anyone arriving
 * after the first few seconds could wait that long to get in.
 */
export function openRoom(code: string): GameRoom {
	let room: Room | undefined
	let left = false
	let blocked: (() => void) | undefined
	/**
	 * Every connection the Room's made, watched: trystero never says when
	 * one's found the other device but can't reach it (its own report of
	 * that comes long after a guest's started looking again). Closed with
	 * the Room, too, or trystero keeps them for the page, and joining again
	 * can come back on one that's gone quietly dead.
	 */
	const connections = new Set<RTCPeerConnection>()
	class Watched extends RTCPeerConnection {
		constructor(config?: RTCConfiguration) {
			super(config)
			// Only the open ones kept: a long party's Host makes many.
			for (const old of connections)
				if (old.connectionState === 'closed') connections.delete(old)
			connections.add(this)
			let timer: number | undefined
			/** Got through once: whatever happens to it later, it wasn't blocked. */
			let through = false
			const check = () => {
				const ice = this.iceConnectionState
				if (through) return
				if (ice === 'connected' || ice === 'completed' || ice === 'closed') {
					through = ice !== 'closed'
					window.clearTimeout(timer)
					return
				}
				if (ice === 'failed') {
					window.clearTimeout(timer)
					if (!left) blocked?.()
					return
				}
				// Checking: the other device answered, and they're trying to reach each other.
				if (ice === 'checking' && timer === undefined)
					timer = window.setTimeout(() => {
						if (!left && !through && this.iceConnectionState === 'checking')
							blocked?.()
					}, BLOCKED_MS)
			}
			this.addEventListener('iceconnectionstatechange', check)
		}
	}
	const actions = new Map<
		string,
		{ action?: MessageAction; handle?: (data: never, peer: string) => void }
	>()
	let peerJoin: ((peer: string) => void) | undefined
	let peerLeave: ((peer: string) => void) | undefined

	const wire = (name: string) => {
		const entry = actions.get(name)
		if (!room || !entry) return
		entry.action ??= room.makeAction(name)
		const handle = entry.handle
		if (handle)
			entry.action.onMessage = (data, { peerId }) =>
				handle(data as never, peerId)
	}

	const joined = iceServersWithin(ICE_WAIT_MS).then((turnConfig) => {
		if (left) return
		if (!turnConfig.length && !warnedNoTurn) {
			warnedNoTurn = true
			console.warn(
				'Multi Player: no TURN servers (see /api/run/ice-servers), so devices on different networks may never connect.',
			)
		}
		room = joinRoom(
			{
				appId: APP_ID,
				relayConfig: { urls: RELAYS },
				turnConfig,
				rtcPolyfill: Watched,
			},
			trysteroRoom(code),
		)
		room.onPeerJoin = (peer) => peerJoin?.(peer)
		room.onPeerLeave = (peer) => peerLeave?.(peer)
		for (const name of actions.keys()) wire(name)
	})

	return {
		action<T>(name: string): RoomAction<T> {
			actions.set(name, actions.get(name) ?? {})
			wire(name)
			return {
				send(data, to) {
					const action = actions.get(name)?.action
					// Sent to a peer that's just gone, say: nothing to be done.
					action?.send(data as never, { target: to ?? null }).catch(() => {})
				},
				on(handle) {
					const entry = actions.get(name)
					if (entry)
						entry.handle = handle as (data: never, peer: string) => void
					wire(name)
				},
			}
		},
		onPeerJoin(handle) {
			peerJoin = handle
		},
		onPeerLeave(handle) {
			peerLeave = handle
		},
		onBlocked(handle) {
			blocked = handle
		},
		async leave() {
			left = true
			await joined
			await room?.leave()
			for (const connection of connections) connection.close()
			connections.clear()
		},
	}
}
