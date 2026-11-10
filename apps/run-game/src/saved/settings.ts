import { createSignal } from 'solid-js'
import { forgetCustomRunners } from '../runners/customRunners'
import { forgetCollected } from './collected'
import { forgetHighScores } from './highScores'
import { forgetProgress } from './progress'

/** Everything the game keeps in this browser starts with this. */
export const STORAGE_PREFIX = 'scoopbus-run:'
const SETTINGS_KEY = `${STORAGE_PREFIX}settings`

interface Settings {
	/** Sound effects: jumps, fika, being scooped. */
	effects: boolean
	/** The music: the beat, and each course's tune over it. */
	music: boolean
	/** The runner last picked, by their id: highlighted first next time. */
	lastRunner?: string
	/** And the run last chosen: Endless, or a course's id. */
	lastRun?: string
}

const DEFAULTS: Settings = { effects: true, music: true }

/**
 * What's kept, as it is now. Before effects and music were apart, one
 * `sound` setting was both: it's carried over to each.
 */
function load(): Settings {
	try {
		const { sound, ...kept } = JSON.parse(
			localStorage.getItem(SETTINGS_KEY) ?? '{}',
		) as Partial<Settings> & { sound?: boolean }
		const was = typeof sound === 'boolean' ? sound : undefined
		return {
			...DEFAULTS,
			...(was === undefined ? {} : { effects: was, music: was }),
			...kept,
		}
	} catch {
		return DEFAULTS
	}
}

const [settings, setSettings] = createSignal<Settings>(load())

function store(next: Settings) {
	setSettings(next)
	try {
		localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
	} catch {
		// Storage off: kept until the page is closed.
	}
}

export const effectsOn = () => settings().effects
export const setEffectsOn = (effects: boolean) =>
	store({ ...settings(), effects })
export const musicOn = () => settings().music
export const setMusicOn = (music: boolean) => store({ ...settings(), music })

export const lastRunner = () => settings().lastRunner
export const rememberRunner = (lastRunner: string) =>
	store({ ...settings(), lastRunner })
export const lastRun = () => settings().lastRun
export const rememberRun = (lastRun: string) =>
	store({ ...settings(), lastRun })

/** Forgets everything the game's kept here: settings, custom runners, Endless progress and high scores. */
export function clearLocalData() {
	try {
		for (const key of Object.keys(localStorage))
			if (key.startsWith(STORAGE_PREFIX)) localStorage.removeItem(key)
	} catch {
		// Nothing stored to clear.
	}
	setSettings(DEFAULTS)
	forgetCustomRunners()
	forgetProgress()
	forgetHighScores()
	forgetCollected()
}
