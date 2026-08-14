import type { Weather } from './api'

/**
 * Our own simplified weather format, decoupled from the raw XWeather payload.
 * A coarse `type` plus the snow lying on the ground; intended to grow
 * (intensity, isDay, etc.).
 */
export type WeatherType = 'clear' | 'rain' | 'snow'

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
 * Bucket a conditions period into one of our coarse weather types.
 *
 * First gate on precipitation rate — anything below the threshold is `clear`
 * regardless of the coded weather. Otherwise the switch lists every XWeather
 * weather-type code so the buckets are explicit and easy to re-map as the
 * format grows: liquid/mixed precip → `rain`, frozen precip → `snow`, else
 * `clear`. `weatherPrimaryCoded` is a `coverage:intensity:weather` triple
 * (e.g. ":VL:RW"), so the weather code is the third segment.
 */
function parseWeatherType(period: XWeatherPeriod | null): WeatherType {
	if ((period?.precipRateMM ?? 0) < MIN_PRECIP_RATE_MM) {
		return 'clear'
	}

	const code = (period?.weatherPrimaryCoded ?? '').split(':')[2] ?? ''

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

		// --- Clear (for now): cloud/fog/haze/dust/wind/misc + unknown ---
		case 'BD': // Blowing dust
		case 'BN': // Blowing sand
		case 'BR': // Mist
		case 'BY': // Blowing spray
		case 'F': // Fog
		case 'FC': // Funnel cloud
		case 'FR': // Frost
		case 'H': // Haze
		case 'IC': // Ice crystals
		case 'IF': // Ice fog
		case 'K': // Smoke
		case 'TO': // Tornado
		case 'UP': // Unknown precipitation
		case 'VA': // Volcanic ash
		case 'WP': // Waterspouts
		case 'ZF': // Freezing fog
		case 'ZY': // Freezing spray
			return 'clear'

		default:
			return 'clear'
	}
}

/** Map the raw XWeather payload to our own weather format. */
export function parseWeather(weather: Weather | null | undefined): AppWeather {
	const period = getCurrentPeriod(weather)

	return {
		type: parseWeatherType(period),
		snowDepth: period?.snowDepthCM ?? 0,
	}
}
