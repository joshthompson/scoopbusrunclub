import { createSignal } from 'solid-js'
import { forgetCustomRunners } from './customRunners'
import { forgetHighScores } from './highScores'
import { forgetProgress } from './progress'

/** Everything the game keeps in this browser starts with this. */
export const STORAGE_PREFIX = 'scoopbus-run:'
const SETTINGS_KEY = `${STORAGE_PREFIX}settings`

interface Settings {
	sound: boolean
}

const DEFAULTS: Settings = { sound: true }

function load(): Settings {
	try {
		return {
			...DEFAULTS,
			...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}'),
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

export const soundOn = () => settings().sound
export const setSoundOn = (sound: boolean) => store({ ...settings(), sound })

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
}
