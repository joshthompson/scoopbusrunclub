import { createSignal } from 'solid-js'
import { forgetCustomRunners } from '../runners/customRunners'
import { forgetCollected } from './collected'
import { forgetFinished } from './finished'
import { forgetSpecialGoals } from './goals'
import { forgetHighScores } from './highScores'
import { forgetIdentity } from './identity'
import { forgetMedals } from './medals'
import { forgetProgress } from './progress'
import { forgetUnlockedRunners } from './unlocked'

import { STORAGE_PREFIX } from './storagePrefix'

export { STORAGE_PREFIX }
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
	/**
	 * The menus' music, picked in Options: a tune's id, or `random`. Not
	 * picked, the theme till a course has been run, and then whatever was
	 * last on.
	 */
	menuTune?: string
	/** The bus's artwork, picked in Options: the new one, unless the classic one's picked. */
	bus?: BusArtwork
	/** How many bots play a minigame with you, from Single Player, picked on its panel (see `botsFor`). */
	soloBots?: number
}

/** The bus's artwork: the new bus, or the classic one, as on the website. */
export type BusArtwork = 'new' | 'classic'

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

export const menuTune = () => settings().menuTune
export const setMenuTune = (menuTune: string) =>
	store({ ...settings(), menuTune })

export const busArtwork = (): BusArtwork => settings().bus ?? 'new'
export const setBusArtwork = (bus: BusArtwork) => store({ ...settings(), bus })

/** How many bots you play a minigame against, from Single Player, as picked: three, till one is. */
export const soloBots = () => settings().soloBots ?? 3
export const setSoloBots = (soloBots: number) =>
	store({ ...settings(), soloBots })

export const lastRunner = () => settings().lastRunner
export const rememberRunner = (lastRunner: string) =>
	store({ ...settings(), lastRunner })
export const lastRun = () => settings().lastRun
export const rememberRun = (lastRun: string) =>
	store({ ...settings(), lastRun })

/** Forgets everything the game's kept here: settings, custom runners, Endless progress, high scores and high score name. */
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
	forgetFinished()
	forgetHighScores()
	forgetMedals()
	forgetSpecialGoals()
	forgetCollected()
	forgetIdentity()
	forgetUnlockedRunners()
}
