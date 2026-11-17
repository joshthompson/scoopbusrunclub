import type { CharacterSpriteProps } from '@/utils/createRunnerFrames'
import { createSignal } from 'solid-js'

/** A runner someone's made for themselves, with the website's custom racer form. */
export interface CustomRunner {
	id: string
	name: string
	avatar: CharacterSpriteProps
}

/**
 * The longest a runner's name can be: short enough for the select screen's
 * cards and the name over their head.
 */
export const MAX_RUNNER_NAME_LENGTH = 12

/** A runner's name, cut down to `MAX_RUNNER_NAME_LENGTH`. */
export const runnerName = (name: string) =>
	name.slice(0, MAX_RUNNER_NAME_LENGTH).trimEnd()

/** Kept in this browser only: they're nobody else's business. */
const STORAGE_KEY = 'scoopbus-run:runners'

function isCustomRunner(value: unknown): value is CustomRunner {
	const runner = value as CustomRunner
	return (
		typeof runner?.id === 'string' &&
		typeof runner.name === 'string' &&
		typeof runner.avatar?.head === 'object'
	)
}

function load(): CustomRunner[] {
	try {
		const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
		// Named before names were cut down to 12: cut down now.
		return Array.isArray(stored)
			? stored
					.filter(isCustomRunner)
					.map((runner) => ({ ...runner, name: runnerName(runner.name) }))
			: []
	} catch {
		return []
	}
}

const [runners, setRunners] = createSignal<CustomRunner[]>(load())

function store(next: CustomRunner[]) {
	setRunners(next)
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
	} catch {
		// Storage off or full: they're kept until the page is closed.
	}
}

/** This browser's custom runners, oldest first. */
export const customRunners = runners

/** Adds a new runner, or replaces the one with the same id. */
export function saveCustomRunner(runner: CustomRunner) {
	const all = runners()
	store(
		all.some((r) => r.id === runner.id)
			? all.map((r) => (r.id === runner.id ? runner : r))
			: [...all, runner],
	)
}

/** Forgets them all, once their storage has been cleared (see `clearLocalData`). */
export function forgetCustomRunners() {
	setRunners([])
}

export function deleteCustomRunner(id: string) {
	store(runners().filter((r) => r.id !== id))
}

export function newRunnerId() {
	return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}
