import type { CharacterSpriteProps } from '@/utils/createRunnerFrames'
import { createSignal } from 'solid-js'
import type { Playable } from '../runners/playable'
import { STORAGE_PREFIX } from './storagePrefix'

/**
 * Who you are on the online high score tables, kept in this browser: the name
 * your scores go under and the runner whose head goes by them, chosen the
 * first time a score's sent and changeable in Options. And a random id, so
 * the tables keep you to one entry each and can point yours out to you.
 */

const STORAGE_KEY = `${STORAGE_PREFIX}identity`

/** Whose head goes by a score: a club member's, or a look's. */
export type ScoreIcon = { member: string } | { look: CharacterSpriteProps }

export interface Identity {
	/** Random, made the first time it's needed: never shown. */
	playerId: string
	name?: string
	/** The runner picked, by their id, to start on next time it's changed. */
	runnerId?: string
	icon?: ScoreIcon
}

export const MAX_NAME_LENGTH = 16

const newPlayerId = () =>
	crypto.randomUUID?.() ??
	`${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`

function load(): Identity {
	try {
		const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
		if (typeof stored?.playerId === 'string') return stored
	} catch {
		// Nothing kept, or it's unreadable: start again.
	}
	return { playerId: newPlayerId() }
}

const [identity, setIdentityState] = createSignal<Identity>(load())
export { identity }

function store(next: Identity) {
	setIdentityState(next)
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
	} catch {
		// Storage off: kept until the page is closed.
	}
}

/** Whether a name's been chosen yet. */
export const named = () => !!identity().name && !!identity().icon

/** A runner's head, as a score's icon: a member's, or their look's. */
export function iconOf(runner: Playable): ScoreIcon | undefined {
	if (runner.member) return { member: runner.member }
	if (runner.look) return { look: runner.look }
	return undefined
}

/** Score under this name, with this runner's head. */
export function setIdentity(name: string, runner: Playable) {
	store({
		...identity(),
		name: name.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH),
		runnerId: runner.id,
		icon: iconOf(runner),
	})
}

/** For "Clear local data": a new player altogether. */
export function forgetIdentity() {
	setIdentityState({ playerId: newPlayerId() })
}
