import { internal } from './_generated/api'
import { action } from './_generated/server'

// --- XWeather (formerly AerisWeather) current-conditions integration ---
//
// Weather is cached in the appData key/value store under the key `weather`
// as a JSON-encoded { updatedAt, data } object. On read, if the cached value
// is missing or older than one hour we fetch fresh conditions from XWeather,
// store them, and return them. Otherwise the cached value is returned as-is,
// so we make at most one external request per hour.
//
// Requires two Convex environment variables (set via the Convex dashboard or
// `npx convex env set`):
//   XWEATHER_CLIENT_ID
//   XWEATHER_CLIENT_SECRET

const WEATHER_KEY = 'weather'
const ONE_HOUR_MS = 60 * 60 * 1000

// Haga Park, Stockholm — the club's home parkrun.
const HAGA_LAT = 59.354817
const HAGA_LNG = 18.039025

interface StoredWeather {
	updatedAt: number
	// Raw XWeather `response` payload (array of location conditions objects).
	data: unknown
}

/**
 * Return the current weather for Haga Park, refreshing from XWeather when the
 * cached value is missing or over an hour old. Returns null only when there is
 * no cached data and the fetch fails (or credentials are unset).
 */
export const getWeather = action({
	args: {},
	handler: async (ctx): Promise<StoredWeather | null> => {
		const raw = await ctx.runQuery(internal.parkrun.getAppData, {
			key: WEATHER_KEY,
		})

		let stored: StoredWeather | null = null
		if (raw) {
			try {
				stored = JSON.parse(raw) as StoredWeather
			} catch {
				stored = null
			}
		}

		const now = Date.now()

		// Fresh enough — serve the cache without touching XWeather.
		if (stored && now - stored.updatedAt < ONE_HOUR_MS) {
			return stored
		}

		const clientId = process.env.XWEATHER_CLIENT_ID
		const clientSecret = process.env.XWEATHER_CLIENT_SECRET

		// Without credentials we can't refresh — fall back to whatever we have.
		if (!clientId || !clientSecret) {
			console.warn(
				'XWEATHER_CLIENT_ID / XWEATHER_CLIENT_SECRET not set; skipping weather refresh',
			)
			return stored
		}

		try {
			const url =
				`https://data.api.xweather.com/conditions/${HAGA_LAT},${HAGA_LNG}` +
				`?format=json&client_id=${encodeURIComponent(clientId)}` +
				`&client_secret=${encodeURIComponent(clientSecret)}`

			const response = await fetch(url)
			if (!response.ok) {
				console.error(`XWeather request failed: ${response.status}`)
				return stored
			}

			const json = await response.json()
			if (!json?.success) {
				console.error(
					`XWeather returned an error: ${JSON.stringify(json?.error ?? json)}`,
				)
				return stored
			}

			const fresh: StoredWeather = { updatedAt: now, data: json.response }
			await ctx.runMutation(internal.parkrun.setAppData, {
				key: WEATHER_KEY,
				value: JSON.stringify(fresh),
			})
			return fresh
		} catch (err) {
			console.error('XWeather fetch threw:', err)
			// Serve stale data rather than failing the request outright.
			return stored
		}
	},
})
