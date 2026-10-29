import { addDays, toISODate } from '@shared/calendar/dates'
import { createSignal } from 'solid-js'
import { assetVariants } from './assetVariants'
import { imageSize } from './imageSize'
import { snowyAsset } from './snow'

/**
 * Halloween mode runs from Halloween itself through the week after it: 31
 * October to 7 November, both days included.
 */
const HALLOWEEN_MONTH_DAY = '10-31'
const HALLOWEEN_MODE_DAYS = 8

/**
 * Every pumpkin in the halloween assets, so another one joins the patch just by
 * dropping `pumpkin6.png` next to the others. Matched on `pumpkin` and a
 * number, so the rest of the folder's spooky things don't end up on anyone's
 * head, and nor does `pumpkin-base.png`, which is the uncarved one.
 */
export const pumpkinAssets = Object.entries(
	import.meta.glob('../assets/halloween/pumpkin[0-9]*.png', {
		eager: true,
		import: 'default',
	}) as Record<string, string>,
)
	.sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
	.map(([, url]) => url)

/** How far round towards red a pumpkin can be turned, in degrees. */
const MAX_REDDENING = 15
/** How much darker or lighter than drawn a pumpkin can be. */
const BRIGHTNESS = [0.85, 1.15]

const tints = new Map<string, string>()

/**
 * A CSS filter turning a pumpkin a random bit redder, and darker or lighter, so
 * a patch of them isn't all the one orange. Picked once per image rather than per showing, so a
 * pumpkin is the same colour wherever it turns up, and holds still in the
 * header, which redraws it every tick. Goes on the whole pumpkin, its lit
 * inside too, so the light keeps matching the drawn pumpkins' painted faces.
 */
export function pumpkinTint(image: string): string {
	let tint = tints.get(image)
	if (!tint) {
		const reddening = Math.round(Math.random() * MAX_REDDENING)
		const [dimmest, brightest] = BRIGHTNESS
		const brightness = dimmest + Math.random() * (brightest - dimmest)
		tint = `hue-rotate(-${reddening}deg) brightness(${brightness.toFixed(2)})`
		tints.set(image, tint)
	}
	return tint
}

/**
 * A zombie's green: just enough to look unwell without losing their kit's own
 * colours.
 */
export const ZOMBIE_TINT = 'sepia(0.35) hue-rotate(55deg) saturate(1.3)'

/** Zombies shamble along at half their old speed, legs and all. */
export const ZOMBIE_PACE = 0.5

/**
 * What a course map marks a point with in Halloween mode, going by its name
 * (which comes in whatever language the course does): a pumpkin to start at, a
 * grave to finish at, both where they're the same place, and a ghost to turn
 * round at. Anything else, the km markers included, keeps its usual mark.
 */
export function halloweenPointEmoji(name: string): string | undefined {
	const label = name.toLowerCase()
	const start = /start|lähtö/.test(label)
	const finish = /finish|mål|maali/.test(label)
	if (start && finish) return '🎃 🪦'
	if (start) return '🎃'
	if (finish) return '🪦'
	if (/turn/.test(label)) return '👻'
	return undefined
}

/** Every ghost in the halloween assets, picked up the same way as the pumpkins. */
export const ghostAssets = Object.entries(
	import.meta.glob('../assets/halloween/ghost*.png', {
		eager: true,
		import: 'default',
	}) as Record<string, string>,
)
	.sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
	.map(([, url]) => url)

/**
 * A Halloween image's size once it has loaded, read off the image itself, so a
 * new pumpkin or ghost can be drawn at whatever size suits it without the
 * header needing to know. Only ask for it once Halloween mode is on, so the
 * rest of the year nobody downloads a pumpkin.
 */
export const halloweenAssetSize = imageSize

/** Whether a day falls in Halloween mode's week. */
export function isHalloweenWeek(today = toISODate(new Date())) {
	const halloween = `${today.slice(0, 4)}-${HALLOWEEN_MONTH_DAY}`
	return halloween <= today && today < addDays(halloween, HALLOWEEN_MODE_DAYS)
}

/** Switched on or off by hand, and then left alone by the calendar. */
const [forced, setForced] = createSignal<boolean>()

/**
 * Whether the header is in Halloween mode: its week, unless someone's said
 * otherwise. The date isn't a signal, so a page left open over midnight on the
 * 30th only turns spooky once something else re-reads this.
 */
export const isHalloween = () => forced() ?? isHalloweenWeek()

/** Switch Halloween mode on or off, whatever the date. */
export function setHalloween(on: boolean) {
	setForced(on)
}

declare global {
	interface Window {
		setHalloween: (on: boolean) => string
	}
}

/**
 * `setHalloween(true)` from the browser console to turn Halloween mode on out of
 * season, `setHalloween(false)` to turn it off in season. Brings its own
 * weather with it, so there's no need to `setWeather('halloween')` as well.
 * Sticks until reload.
 */
if (typeof window !== 'undefined') {
	window.setHalloween = (on: boolean) => {
		setHalloween(on)
		return `halloween: ${on ? 'on' : 'off'}`
	}
}

/**
 * `normal URL -> Halloween URL`: an asset gets a Halloween variant just by
 * dropping `foo-halloween.png` next to `foo.png`, the same way as `-snow`.
 */
const halloweenVariants = assetVariants('halloween')

/**
 * Swap an imported asset URL for whichever variant the season calls for: its
 * `-halloween` one in Halloween mode, else its `-snow` one while it's snowy.
 * Halloween wins when both apply — the bus stays in costume even on the rare
 * snowy Halloween. Assets without a variant are returned untouched, so this is
 * safe to use anywhere.
 *
 * Reads signals, so call it inside a reactive context (JSX, a memo, an
 * accessor) rather than at module scope.
 */
export function seasonalAsset(url: string): string {
	if (isHalloween()) {
		const variant = halloweenVariants.get(url)
		if (variant) return variant
	}
	return snowyAsset(url)
}
