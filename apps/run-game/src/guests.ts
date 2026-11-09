import type { CharacterSpriteProps } from '@/utils/createRunnerFrames'
import { createSignal } from 'solid-js'
import { type Playable, lookSprite } from './playable'

/**
 * The Scoop Bus's guests: people who've run with the club, with a look made
 * for them on the website. Fetched from the website's backend once, at the
 * start, and kept only in memory, to run in the background: in the pack on
 * the course, and behind the menus.
 */

const CONVEX_URL = (import.meta.env.VITE_CONVEX_URL as string | undefined) ?? ''

/** A guest, as the backend has them: only those with a look are any use. */
interface Guest {
	_id: string
	name: string
	avatar?: Record<string, unknown>
}

const [guests, setGuests] = createSignal<Playable[]>([])

/** The guests with a look, as runners: none until they've loaded, or if they can't be. */
export { guests }

/** Fetch them, once. Without a backend to ask, or with no connection, there are just none. */
export async function loadGuests() {
	if (!CONVEX_URL) return
	try {
		const response = await fetch(`${CONVEX_URL}/api/guests`)
		if (!response.ok) return
		const all: Guest[] = await response.json()
		setGuests(
			all
				.filter((guest) => guest.avatar && 'head' in guest.avatar)
				.map((guest) => ({
					id: `guest:${guest._id}`,
					name: guest.name,
					sprite: lookSprite(guest.avatar as unknown as CharacterSpriteProps),
				})),
		)
	} catch {
		// Offline, or the backend's down: the club runs without them.
	}
}
