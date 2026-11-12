import type { CharacterSpriteProps } from '@/utils/createRunnerFrames'
import { createSignal } from 'solid-js'
import { ask, isObject, stringIn } from '../online/backend'
import { type Playable, lookSprite } from './playable'

/**
 * The Scoop Bus's guests: people who've run with the club, with a look made
 * for them on the website. Fetched from the website's backend once, at the
 * start, and kept only in memory, to run in the background: in the pack on
 * the course, and behind the menus.
 */

const [guests, setGuests] = createSignal<Playable[]>([])

/** The guests with a look, as runners: none until they've loaded, or if they can't be. */
export { guests }

/** A guest from the backend, as a runner: undefined without a look this game can draw. */
function asRunner(guest: unknown): Playable | undefined {
	const id = stringIn(guest, '_id')
	const name = stringIn(guest, 'name')
	const avatar = isObject(guest) ? guest.avatar : undefined
	if (!id || !name || !isObject(avatar) || !('head' in avatar)) return undefined
	const look = avatar as unknown as CharacterSpriteProps
	try {
		return { id: `guest:${id}`, name, look, sprite: lookSprite(look) }
	} catch {
		// Drawn on the website some way this game can't: they sit this one out.
		return undefined
	}
}

/**
 * Fetch them, once. Without a backend to ask, with no connection, or with
 * an answer that isn't a list of them, there are just none.
 */
export async function loadGuests() {
	const all = await ask('/api/guests')
	if (!Array.isArray(all)) return
	setGuests(all.map(asRunner).filter((guest) => guest !== undefined))
}
