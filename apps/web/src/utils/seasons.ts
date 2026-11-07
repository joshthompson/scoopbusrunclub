import { createSignal } from 'solid-js'
import { assetVariants } from './assetVariants'
import { snowyAsset } from './snow'

/**
 * The site's special seasons, all in one place. Each has a window of dates it
 * switches itself on for, and its own asset variants: `foo-<name>.png` next to
 * `foo.png` is all it takes to dress something up for it. At most one is on at
 * a time: their dates don't overlap, and `setSeason()` picks just the one.
 *
 * Everything else about a season (Halloween's pumpkins, zombies and weather)
 * lives in its own file and asks `isOn()` whether to show.
 */
type SeasonName = 'halloween' | 'christmas'

interface Season {
	name: SeasonName
	/** Whether the site is in this season's mode: its dates, unless someone's said otherwise. */
	isOn: () => boolean
	/** Whether a moment falls within the season's dates. */
	isInSeason: (now?: Date) => boolean
	/** `normal URL -> season URL`, for every `foo-<name>.png` next to a `foo.png`. */
	variants: Map<string, string>
}

/**
 * The season picked by hand, or `'none'` for none at all, and then left alone
 * by the calendar.
 */
const [forced, setForced] = createSignal<SeasonName | 'none'>()

/** The longest a `setTimeout` can wait, about 24 days. */
const MAX_TIMEOUT = 2 ** 31 - 1

/**
 * A season running from `start(year)` up to `end(year)`, in the visitor's own
 * time. `end` may fall in the next year, for a season that runs over New Year.
 */
function createSeason(options: {
	name: SeasonName
	start: (year: number) => Date
	end: (year: number) => Date
}): Season {
	const { name, start, end } = options

	/** The season's windows that could be going on, or next to start or end, around `now`. */
	const yearsAround = (now: Date) => {
		const year = now.getFullYear()
		return [year - 1, year, year + 1]
	}

	const isInSeason = (now = new Date()) =>
		yearsAround(now).some((year) => start(year) <= now && now < end(year))

	/** Whether it's the season by the clock, as of the last look. */
	const [inSeason, setInSeason] = createSignal(isInSeason())

	/**
	 * Look at the clock again when the season next starts or ends, so a page
	 * left open over the start turns festive right then. Only when that's near
	 * enough for a timer to wait for: any further off, and the page will have
	 * been reloaded long before.
	 */
	const watch = () => {
		const now = new Date()
		const next = yearsAround(now)
			.flatMap((year) => [start(year), end(year)])
			.filter((change) => change > now)
			.sort((a, b) => a.getTime() - b.getTime())[0]
		if (!next || next.getTime() - now.getTime() > MAX_TIMEOUT) return
		setTimeout(() => {
			setInSeason(isInSeason())
			watch()
		}, next.getTime() - now.getTime())
	}
	if (typeof window !== 'undefined') watch()

	return {
		name,
		isOn: () => {
			const picked = forced()
			return picked === undefined ? inSeason() : picked === name
		},
		isInSeason,
		variants: assetVariants(name),
	}
}

/**
 * Halloween mode runs from the evening before Halloween through the week after
 * it: 18:00 on 30 October to the end of 7 November. Brings its own weather with
 * it, so there's no need to `setWeather('halloween')` as well.
 */
export const halloween = createSeason({
	name: 'halloween',
	start: (year) => new Date(year, 9, 30, 18),
	end: (year) => new Date(year, 10, 7),
})

/**
 * Christmas mode runs from Christmas Eve, 24 December, which is when Sweden
 * has its Christmas, to the end of 5 January, Twelfth Night, when the
 * decorations come down.
 */
export const christmas = createSeason({
	name: 'christmas',
	start: (year) => new Date(year, 11, 24),
	end: (year) => new Date(year + 1, 0, 6),
})

/** Every season, for `seasonalAsset()` and `setSeason()` to look through. */
const SEASONS = [halloween, christmas]

/**
 * Put the site in one season, whatever the date, or in `'none'` to switch off
 * whichever season it's in. Sticks until reload.
 */
export function setSeason(season: SeasonName | 'none') {
	setForced(season)
}

declare global {
	interface Window {
		setSeason: (season: SeasonName | 'none') => string
	}
}

/**
 * `setSeason('christmas')` from the browser console to turn Christmas mode on
 * out of season, `setSeason('none')` to turn off the season it's in.
 */
if (typeof window !== 'undefined') {
	window.setSeason = (season) => {
		const names = [...SEASONS.map((s) => s.name), 'none']
		if (!names.includes(season)) {
			return `no season called '${season}', try ${names.map((name) => `'${name}'`).join(', ')}`
		}
		setSeason(season)
		return `season: ${season}`
	}
}

/**
 * Swap an imported asset URL for whichever variant the season calls for: its
 * `-halloween` or `-christmas` one while that season's on, else the plain one,
 * and then that one's `-snow` variant while it's snowy. So a snowy Christmas
 * tree is `tree1-christmas-snow.png`, and a season's asset with no snowy
 * version of its own stays as it is in the snow: the bus keeps its costume
 * rather than swapping it for the snowy everyday bus. Assets without a variant
 * are returned untouched, so this is safe to use anywhere.
 *
 * Reads signals, so call it inside a reactive context (JSX, a memo, an
 * accessor) rather than at module scope.
 */
export function seasonalAsset(url: string): string {
	for (const season of SEASONS) {
		if (!season.isOn()) continue
		const variant = season.variants.get(url)
		if (variant) return snowyAsset(variant)
	}
	return snowyAsset(url)
}
