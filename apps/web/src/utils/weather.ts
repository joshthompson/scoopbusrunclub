import { createSignal } from 'solid-js'
import type { Weather } from './api'

/**
 * Our own simplified weather format, decoupled from the raw XWeather payload.
 * A coarse `type` plus the snow lying on the ground; intended to grow
 * (intensity, isDay, etc.).
 */
export type WeatherType = 'clear' | 'rain' | 'snow' | 'fog'

export interface AppWeather {
	type: WeatherType
	/** Estimated snow depth on the ground, in cm. `0` when unknown. */
	snowDepth: number
}

/** The subset of an XWeather conditions period that we read. */
interface XWeatherPeriod {
	weatherPrimaryCoded?: string
	precipRateMM?: number
	snowDepthCM?: number
}

/**
 * Pull the current-conditions period out of the cached payload.
 *
 * `data` is the XWeather `response` array; the current conditions live at
 * `data[0].periods[0]`.
 */
function getCurrentPeriod(
	weather: Weather | null | undefined,
): XWeatherPeriod | null {
	if (!weather?.data) return null

	const data = weather.data as
		| { periods?: XWeatherPeriod[] }[]
		| { periods?: XWeatherPeriod[] }

	const location = Array.isArray(data) ? data[0] : data
	return location?.periods?.[0] ?? null
}

/**
 * Minimum precipitation rate (mm/hr) before we treat it as actual rain/snow.
 * The coded weather flags even a trace drizzle, so gate on a meaningful rate.
 */
const MIN_PRECIP_RATE_MM = 0.5

/**
 * Bucket an XWeather weather-type code into one of our coarse types.
 *
 * The switch lists every code so the buckets are explicit and easy to re-map as
 * the format grows: liquid/mixed precip → `rain`, frozen precip → `snow`,
 * anything that's suspended water rather than falling water → `fog`, else
 * `clear`.
 */
function bucketForCode(code: string): WeatherType {
	switch (code) {
		// --- Rain: liquid / freezing / thunder / sleet / hail ---
		case 'A': // Hail
		case 'L': // Drizzle
		case 'R': // Rain
		case 'RW': // Rain showers
		case 'RS': // Rain/snow mix
		case 'T': // Thunderstorms
		case 'IP': // Ice pellets / sleet
		case 'ZL': // Freezing drizzle
		case 'ZR': // Freezing rain
			return 'rain'

		// --- Snow: snow / snow showers / wintry mixes ---
		case 'S': // Snow
		case 'SW': // Snow showers
		case 'BS': // Blowing snow
		case 'SI': // Snow/sleet mix
		case 'WM': // Wintry mix
			return 'snow'

		case 'BR': // Mist
		case 'F': // Fog
		case 'ZF': // Freezing fog
		case 'IF': // Ice fog
			return 'fog'

		// --- Clear (for now): cloud/fog/haze/dust/wind/misc + unknown ---
		case 'BD': // Blowing dust
		case 'BN': // Blowing sand
		case 'BY': // Blowing spray
		case 'FC': // Funnel cloud
		case 'FR': // Frost
		case 'H': // Haze
		case 'IC': // Ice crystals
		case 'K': // Smoke
		case 'TO': // Tornado
		case 'UP': // Unknown precipitation
		case 'VA': // Volcanic ash
		case 'WP': // Waterspouts
		case 'ZY': // Freezing spray
			return 'clear'

		default:
			return 'clear'
	}
}

/**
 * Bucket a conditions period into one of our coarse weather types.
 *
 * `weatherPrimaryCoded` is a `coverage:intensity:weather` triple (e.g. ":VL:RW"),
 * so the weather code is the third segment.
 *
 * The precipitation-rate gate applies only to the falling types: the coded
 * weather flags even a trace drizzle, so `rain`/`snow` need a meaningful rate
 * behind them. Fog carries no rate at all, so gating it the same way would have
 * meant it never resolved to anything but `clear`.
 */
function parseWeatherType(period: XWeatherPeriod | null): WeatherType {
	const code = (period?.weatherPrimaryCoded ?? '').split(':')[2] ?? ''
	const type = bucketForCode(code)

	if (type === 'rain' || type === 'snow') {
		if ((period?.precipRateMM ?? 0) < MIN_PRECIP_RATE_MM) return 'clear'
	}

	return type
}

/** Map the raw XWeather payload to our own weather format. */
export function parseWeather(weather: Weather | null | undefined): AppWeather {
	const period = getCurrentPeriod(weather)

	return {
		type: parseWeatherType(period),
		snowDepth: period?.snowDepthCM ?? 0,
	}
}

// --- Current weather ---

const [weatherType, setWeatherType] = createSignal<WeatherType>('clear')

/** What's falling right now, as one of our coarse types. */
export { weatherType }

/** Set from the console, and then left alone by the weather. */
let overridden = false

/** Report the real weather type from the forecast. */
export function reportWeatherType(type: WeatherType) {
	if (!overridden) setWeatherType(type)
}

declare global {
	interface Window {
		setWeather: (type: WeatherType) => string
	}
}

/**
 * `setWeather('rain')` from the browser console to pretend it's raining over the
 * header; `'snow'` for snowfall, `'clear'` to stop it. Sticks until reload, so
 * the forecast won't quietly undo it.
 *
 * This is the falling stuff only — snow already lying on the ground is
 * `setSnow(cm)`, since the two are independent (it can be a clear day on top of
 * yesterday's snow).
 */
if (typeof window !== 'undefined') {
	window.setWeather = (type: WeatherType) => {
		const allowed: WeatherType[] = ['clear', 'rain', 'snow', 'fog']
		if (!allowed.includes(type))
			return `weather: expected ${allowed.join(' | ')}`
		overridden = true
		setWeatherType(type)
		return `weather: ${type}`
	}
}
