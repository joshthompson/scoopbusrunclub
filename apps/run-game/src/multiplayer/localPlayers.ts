import { onCleanup } from 'solid-js'
import {
	type Controls,
	connectedGamepads,
	gamepadControls,
	gamepadSelect,
	gamepadStart,
	keyDown,
	keyboardControls,
} from '../input'
import { play } from '../sfx'
import type { RoomMode } from './protocol'
import { type HostRoom, type Seat, localCharacters } from './room'
import { ROOM_MODES } from './roomModes'

/**
 * Local Players in the lobby: anyone at the Host's keyboard or gamepads
 * taking a seat by pressing jump on theirs, then picking who they'll be with
 * left and right, jump to say they're ready, and duck to change their mind
 * (or, not ready, to give their seat up). The Starter's jump starts the
 * Room instead, and their duck stops its countdown; on a gamepad, Start
 * starts it too, and Select goes through how it can go.
 */
export function createLocalPlayers(
	room: HostRoom,
	/** How the Room's set to go, for Select to go on from. */
	mode: () => RoomMode,
) {
	/** What each source held last frame, for telling a press from a hold. */
	const before = new Map<string, Controls>()
	const pressed = (key: string, now: Controls) => {
		const was = before.get(key) ?? now
		before.set(key, now)
		return {
			left: now.left && !was.left,
			right: now.right && !was.right,
			up: now.up && !was.up,
			down: now.down && !was.down,
		}
	}

	/** The next free runner from `seat`'s, `by` along the list. */
	function cycle(seat: Seat, by: number) {
		const all = localCharacters()
		const taken = room.taken(seat)
		const at = Math.max(
			0,
			all.findIndex((c) => c.id === seat.character),
		)
		for (let i = 1; i <= all.length; i++) {
			const next = all[(((at + by * i) % all.length) + all.length) % all.length]
			if (!taken.includes(next.id)) return next.id
		}
		return seat.character
	}

	function seatUp(seat: Omit<Seat, 'colour' | 'points' | 'ready' | 'waiting'>) {
		const added = room.addSeat(seat)
		if (!added) return play('back')
		play('select')
		const first = localCharacters().find((c) => !room.taken().includes(c.id))
		if (first) room.pick(added.id, first.id)
	}

	/** One seat's presses, once it's taken. */
	function steer(seat: Seat, press: Controls) {
		if (room.starter()?.id === seat.id) return steerAsStarter(seat, press)
		if (press.left || press.right) {
			if (seat.ready) return
			const next = cycle(seat, press.right ? 1 : -1)
			if (next && next !== seat.character) {
				room.pick(seat.id, next)
				play('move')
			}
		}
		if (press.up && !seat.ready && seat.character) {
			room.setReady(seat.id, true)
			play('select')
		}
		if (press.down) {
			play('back')
			if (seat.ready) room.setReady(seat.id, false)
			else room.removeSeat(seat.id)
		}
	}

	/** The Starter's: picking, then starting it rather than being ready. */
	function steerAsStarter(seat: Seat, press: Controls) {
		const starting = room.stage() === 'starting'
		if ((press.left || press.right) && !starting) {
			const next = cycle(seat, press.right ? 1 : -1)
			if (next && next !== seat.character) {
				room.pick(seat.id, next)
				play('move')
			}
		}
		if (press.up && !starting) play(room.startAs(seat.id) ? 'select' : 'back')
		if (press.down) {
			play('back')
			if (starting) room.cancelAs(seat.id)
			else room.removeSeat(seat.id)
		}
	}

	/** A gamepad's Start and Select, for its Player being the Starter. */
	function starterButtons(seat: Seat, index: number) {
		const key = `gamepad:${index}:menu`
		const now = { start: gamepadStart(index), select: gamepadSelect(index) }
		const was = menuBefore.get(key) ?? now
		menuBefore.set(key, now)
		if (room.starter()?.id !== seat.id || room.stage() !== 'lobby') return
		if (now.start && !was.start) play(room.startAs(seat.id) ? 'select' : 'back')
		if (now.select && !was.select) {
			const at = ROOM_MODES.findIndex((m) => m.mode === mode())
			play('move')
			room.chooseModeAs(seat.id, ROOM_MODES[(at + 1) % ROOM_MODES.length].mode)
		}
	}
	const menuBefore = new Map<string, { start: boolean; select: boolean }>()

	let frame = 0
	const poll = () => {
		frame = requestAnimationFrame(poll)
		const seatOf = (id: string) => room.seats.find((s) => s.id === id)

		for (const half of ['wasd', 'arrows'] as const) {
			const held = keyboardControls(half)()
			// Enter takes the arrows' seat too: it's next to them.
			if (half === 'arrows') held.up ||= keyDown('Enter')
			const press = pressed(half, held)
			const seat = seatOf(half)
			if (seat) steer(seat, press)
			else if (press.up) seatUp({ id: half, kind: half })
		}

		for (const index of connectedGamepads()) {
			const id = `gamepad:${index}`
			const press = pressed(id, gamepadControls(index)())
			const seat = seatOf(id)
			if (seat) {
				steer(seat, press)
				starterButtons(seat, index)
			} else if (press.up) seatUp({ id, kind: 'gamepad', gamepad: index })
		}
	}
	poll()
	onCleanup(() => cancelAnimationFrame(frame))

	return {
		/** Playing on the Host's own touch screen: a phone hosting. */
		joinOnTouch() {
			if (!room.seats.some((s) => s.id === 'touch'))
				seatUp({ id: 'touch', kind: 'touch' })
		},
		/** Left or right through the runners, for a seat's arrows clicked. */
		cycle(seat: Seat, by: number) {
			const next = cycle(seat, by)
			if (next) room.pick(seat.id, next)
		},
		/** Forgets what was held, so a key held over from before isn't a press. */
		reset() {
			before.clear()
			for (const half of ['wasd', 'arrows'] as const)
				before.set(half, keyboardControls(half)())
			for (const index of connectedGamepads())
				before.set(`gamepad:${index}`, gamepadControls(index)())
		},
	}
}
