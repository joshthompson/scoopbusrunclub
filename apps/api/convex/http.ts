import { httpRouter } from 'convex/server'
import { api, internal } from './_generated/api'
import { httpAction } from './_generated/server'

const http = httpRouter()

// --- CORS helpers ---

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function jsonResponse(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json', ...corsHeaders },
	})
}

// --- CORS preflight ---

http.route({
	path: '/.well-known/cors-preflight',
	method: 'OPTIONS',
	handler: httpAction(async () => {
		return new Response(null, { status: 204, headers: corsHeaders })
	}),
})

// --- GET /api/cache-version ---
// Public, unauthenticated. Returns the two last-updated timestamps the
// client uses to decide whether its localStorage cache is stale.

http.route({
	path: '/api/cache-version',
	method: 'GET',
	handler: httpAction(async (ctx) => {
		const result = await ctx.runQuery(api.queries.getCacheVersion)
		return jsonResponse(result)
	}),
})

// --- GET /api/runners ---

http.route({
	path: '/api/runners',
	method: 'GET',
	handler: httpAction(async (ctx) => {
		const runners = await ctx.runQuery(api.queries.getAllRunners)
		return jsonResponse(runners)
	}),
})

// --- GET /api/runners/:id ---
// Convex httpRouter doesn't support path params, so we use a query param instead:
// GET /api/runner?id=<parkrunId>

http.route({
	path: '/api/runner',
	method: 'GET',
	handler: httpAction(async (ctx, request) => {
		const url = new URL(request.url)
		const parkrunId = url.searchParams.get('id')

		if (!parkrunId) {
			return jsonResponse({ error: "Missing 'id' query parameter" }, 400)
		}

		const runner = await ctx.runQuery(api.queries.getRunner, { parkrunId })

		if (!runner) {
			return jsonResponse({ error: 'Runner not found' }, 404)
		}

		return jsonResponse(runner)
	}),
})

// --- GET /api/runner/runs?id=<parkrunId> ---

http.route({
	path: '/api/runner/runs',
	method: 'GET',
	handler: httpAction(async (ctx, request) => {
		const url = new URL(request.url)
		const parkrunId = url.searchParams.get('id')

		if (!parkrunId) {
			return jsonResponse({ error: "Missing 'id' query parameter" }, 400)
		}

		const results = await ctx.runQuery(api.queries.getRunResults, {
			parkrunId,
		})
		return jsonResponse(results)
	}),
})

// --- GET /api/results?since=YYYY-MM-DD ---
// `since` is optional; omitting it returns all results.

http.route({
	path: '/api/results',
	method: 'GET',
	handler: httpAction(async (ctx, request) => {
		const url = new URL(request.url)
		const sinceDate = url.searchParams.get('since') ?? '0000-00-00'

		const results = await ctx.runQuery(api.queries.getRecentResults, {
			sinceDate,
		})
		return jsonResponse(results)
	}),
})

// --- GET /api/events ---

http.route({
	path: '/api/events',
	method: 'GET',
	handler: httpAction(async (ctx) => {
		const events = await ctx.runQuery(api.queries.getAllEvents)
		return jsonResponse(events)
	}),
})

// --- GET /api/volunteers ---

http.route({
	path: '/api/volunteers',
	method: 'GET',
	handler: httpAction(async (ctx) => {
		const volunteers = await ctx.runQuery(api.queries.getAllVolunteers)
		return jsonResponse(volunteers)
	}),
})

// --- POST /api/ingest ---
// Receives pre-parsed athlete data from the GitHub Actions Playwright scraper.
// Protected by a shared secret in the Authorization header.

http.route({
	path: '/api/ingest',
	method: 'POST',
	handler: httpAction(async (ctx, request) => {
		// Verify shared secret
		const authHeader = request.headers.get('Authorization')
		const expectedSecret = process.env.INGEST_SECRET

		if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
			return jsonResponse({ error: 'Unauthorized' }, 401)
		}

		const body = await request.json()
		const athletes = body?.athletes
		const events = body?.events

		if (!Array.isArray(athletes)) {
			return jsonResponse(
				{ error: 'Invalid payload: expected { athletes: [...] }' },
				400,
			)
		}

		let stored = 0

		for (const athlete of athletes) {
			const { parkrunId, runner, runResults } = athlete

			if (!parkrunId || !runner) continue

			await ctx.runMutation(internal.parkrun.storeRunnerData, {
				parkrunId,
				name: runner.name,
				totalRuns: runner.totalRuns,
				totalJuniorRuns: runner.totalJuniorRuns ?? 0,
			})

			if (Array.isArray(runResults)) {
				for (const result of runResults) {
					await ctx.runMutation(internal.parkrun.storeRunResult, {
						parkrunId,
						event: result.event,
						eventNumber: result.eventNumber,
						position: result.position,
						time: result.time,
						ageGrade: result.ageGrade,
						date: result.date,
					})
				}
			}

			stored++
		}

		// Store events (deduplicated by eventId in the mutation)
		let eventsStored = 0
		if (Array.isArray(events)) {
			for (const event of events) {
				if (!event.eventId || !event.name || !event.url || !event.country)
					continue
				await ctx.runMutation(internal.parkrun.storeEvent, {
					eventId: event.eventId,
					name: event.name,
					url: event.url,
					country: event.country,
				})
				eventsStored++
			}
		}

		// Store app data (key/value pairs)
		const appData = body?.appData
		if (appData && typeof appData === 'object') {
			for (const [key, value] of Object.entries(appData)) {
				if (typeof key === 'string' && typeof value === 'string') {
					await ctx.runMutation(internal.parkrun.setAppData, { key, value })
				}
			}
		}

		// Mark parkrun data as updated so clients know to invalidate cache
		await ctx.runMutation(internal.parkrun.setAppData, {
			key: 'parkrunDataUpdatedAt',
			value: Date.now().toString(),
		})

		return jsonResponse({ status: 'ok', athletesStored: stored, eventsStored })
	}),
})

// --- POST /api/ingest-volunteers ---
// Receives volunteer data scraped from parkrun event pages.
// Protected by a shared secret in the Authorization header.

http.route({
	path: '/api/ingest-volunteers',
	method: 'POST',
	handler: httpAction(async (ctx, request) => {
		const authHeader = request.headers.get('Authorization')
		const expectedSecret = process.env.INGEST_SECRET

		if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
			return jsonResponse({ error: 'Unauthorized' }, 401)
		}

		const body = await request.json()
		const volunteers = body?.volunteers

		if (!Array.isArray(volunteers)) {
			return jsonResponse(
				{ error: 'Invalid payload: expected { volunteers: [...] }' },
				400,
			)
		}

		let stored = 0
		for (const vol of volunteers) {
			if (
				!vol.parkrunId ||
				!vol.event ||
				!vol.eventNumber ||
				!vol.date ||
				!Array.isArray(vol.roles)
			)
				continue
			await ctx.runMutation(internal.parkrun.storeVolunteer, {
				parkrunId: vol.parkrunId,
				event: vol.event,
				eventNumber: vol.eventNumber,
				date: vol.date,
				roles: vol.roles,
			})
			stored++
		}

		// Store app data (key/value pairs)
		const appData = body?.appData
		if (appData && typeof appData === 'object') {
			for (const [key, value] of Object.entries(appData)) {
				if (typeof key === 'string' && typeof value === 'string') {
					await ctx.runMutation(internal.parkrun.setAppData, { key, value })
				}
			}
		}

		// Mark parkrun data as updated so clients know to invalidate cache
		await ctx.runMutation(internal.parkrun.setAppData, {
			key: 'parkrunDataUpdatedAt',
			value: Date.now().toString(),
		})

		return jsonResponse({ status: 'ok', volunteersStored: stored })
	}),
})

// --- POST /api/ingest-course ---
// Receives parsed course map data (coordinates + named points) for a parkrun event.
// Protected by a shared secret in the Authorization header.

http.route({
	path: '/api/ingest-course',
	method: 'POST',
	handler: httpAction(async (ctx, request) => {
		const authHeader = request.headers.get('Authorization')
		const expectedSecret = process.env.INGEST_SECRET

		if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
			return jsonResponse({ error: 'Unauthorized' }, 401)
		}

		const body = await request.json()
		const { eventId, coordinates, points } = body

		if (!eventId || !Array.isArray(coordinates)) {
			return jsonResponse(
				{ error: 'Invalid payload: expected { eventId, coordinates, points }' },
				400,
			)
		}

		await ctx.runMutation(internal.courses.storeCourse, {
			eventId,
			coordinates,
			points: points ?? [],
		})

		// Mark parkrun data as updated so clients know to invalidate cache
		await ctx.runMutation(internal.parkrun.setAppData, {
			key: 'parkrunDataUpdatedAt',
			value: Date.now().toString(),
		})

		return jsonResponse({ status: 'ok', eventId })
	}),
})

// --- GET /api/courses ---
// Returns the list of event IDs that have course map data.

http.route({
	path: '/api/courses',
	method: 'GET',
	handler: httpAction(async (ctx) => {
		const courseEventIds = await ctx.runQuery(
			internal.courses.getAllCourseEventIds,
		)
		return jsonResponse(courseEventIds)
	}),
})

// --- GET /api/course?eventId=... ---
// Returns the full course data for a given event.

http.route({
	path: '/api/course',
	method: 'GET',
	handler: httpAction(async (ctx, request) => {
		const url = new URL(request.url)
		const eventId = url.searchParams.get('eventId')

		if (!eventId) {
			return jsonResponse({ error: "Missing 'eventId' query parameter" }, 400)
		}

		const course = await ctx.runQuery(internal.courses.getCourse, { eventId })

		if (!course) {
			return jsonResponse({ error: 'Course not found' }, 404)
		}

		return jsonResponse(course)
	}),
})

// --- GET /api/weather (public) ---
// Returns the current weather for Haga Park. The action serves a cached value
// and only calls the XWeather API when the cache is missing or over an hour old.

http.route({
	path: '/api/weather',
	method: 'GET',
	handler: httpAction(async (ctx) => {
		const weather = await ctx.runAction(api.weather.getWeather)
		return jsonResponse(weather)
	}),
})

// --- GET /api/app-data?key=... ---
// Protected by INGEST_SECRET. Returns the value for a given key from the appData table.

http.route({
	path: '/api/app-data',
	method: 'GET',
	handler: httpAction(async (ctx, request) => {
		const authHeader = request.headers.get('Authorization')
		const expectedSecret = process.env.INGEST_SECRET

		if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
			return jsonResponse({ error: 'Unauthorized' }, 401)
		}

		const url = new URL(request.url)
		const key = url.searchParams.get('key')

		if (!key) {
			return jsonResponse({ error: "Missing 'key' query parameter" }, 400)
		}

		const value = await ctx.runQuery(internal.parkrun.getAppData, { key })
		return jsonResponse({ key, value })
	}),
})

// --- Admin: POST /api/admin/login ---

http.route({
	path: '/api/admin/login',
	method: 'POST',
	handler: httpAction(async (ctx, request) => {
		const body = await request.json()
		const result = await ctx.runMutation(api.auth.login, {
			username: body.username ?? '',
			password: body.password ?? '',
		})
		if ('error' in result) {
			return jsonResponse({ error: result.error }, 401)
		}
		return jsonResponse(result)
	}),
})

// --- Admin: POST /api/admin/logout ---

http.route({
	path: '/api/admin/logout',
	method: 'POST',
	handler: httpAction(async (ctx, request) => {
		const body = await request.json()
		await ctx.runMutation(api.auth.logout, { token: body.token ?? '' })
		return jsonResponse({ ok: true })
	}),
})

// --- Admin: GET /api/admin/validate ---

http.route({
	path: '/api/admin/validate',
	method: 'GET',
	handler: httpAction(async (ctx, request) => {
		const url = new URL(request.url)
		const token = url.searchParams.get('token') ?? ''
		const result = await ctx.runQuery(api.auth.validateToken, { token })
		if (!result) return jsonResponse({ error: 'Invalid token' }, 401)
		return jsonResponse(result)
	}),
})

// --- Admin: GET /api/admin/users ---

http.route({
	path: '/api/admin/users',
	method: 'GET',
	handler: httpAction(async (ctx, request) => {
		const url = new URL(request.url)
		const token = url.searchParams.get('token') ?? ''
		const users = await ctx.runQuery(api.auth.listUsers, { token })
		return jsonResponse(users)
	}),
})

// --- Admin: POST /api/admin/users ---

http.route({
	path: '/api/admin/users',
	method: 'POST',
	handler: httpAction(async (ctx, request) => {
		const body = await request.json()
		const result = await ctx.runMutation(api.auth.createUser, {
			token: body.token ?? '',
			username: body.username ?? '',
			password: body.password ?? '',
			isSuperAdmin: body.isSuperAdmin ?? false,
		})
		if ('error' in result) {
			return jsonResponse({ error: result.error }, 400)
		}
		return jsonResponse(result)
	}),
})

// --- Admin: PUT /api/admin/users ---

http.route({
	path: '/api/admin/users',
	method: 'PUT',
	handler: httpAction(async (ctx, request) => {
		const body = await request.json()
		const result = await ctx.runMutation(api.auth.updateUser, {
			token: body.token ?? '',
			userId: body.userId ?? '',
			username: body.username,
			password: body.password,
			isSuperAdmin: body.isSuperAdmin,
		})
		if ('error' in result) {
			return jsonResponse({ error: result.error }, 400)
		}
		return jsonResponse(result)
	}),
})

// --- Admin: POST /api/admin/account/password ---

http.route({
	path: '/api/admin/account/password',
	method: 'POST',
	handler: httpAction(async (ctx, request) => {
		const body = await request.json()
		const result = await ctx.runMutation(api.auth.changePassword, {
			token: body.token ?? '',
			currentPassword: body.currentPassword ?? '',
			newPassword: body.newPassword ?? '',
		})
		if ('error' in result) {
			return jsonResponse({ error: result.error }, 400)
		}
		return jsonResponse(result)
	}),
})

// --- GET /api/races (public) ---

http.route({
	path: '/api/races',
	method: 'GET',
	handler: httpAction(async (ctx) => {
		const races = await ctx.runQuery(api.races.listPublic)
		return jsonResponse(races)
	}),
})

// --- Admin: GET /api/admin/races ---

http.route({
	path: '/api/admin/races',
	method: 'GET',
	handler: httpAction(async (ctx, request) => {
		const url = new URL(request.url)
		const token = url.searchParams.get('token') ?? ''
		const includeOld = url.searchParams.get('includeOld') === 'true'
		const races = await ctx.runQuery(api.races.list, { token, includeOld })
		return jsonResponse(races)
	}),
})

// --- Admin: POST /api/admin/races ---

http.route({
	path: '/api/admin/races',
	method: 'POST',
	handler: httpAction(async (ctx, request) => {
		const body = await request.json()
		const result = await ctx.runMutation(api.races.create, {
			token: body.token ?? '',
			date: body.date ?? '',
			name: body.name ?? '',
			website: body.website,
			type: body.type,
			attendees: body.attendees ?? [],
			guests: body.guests,
			majorEvent: body.majorEvent,
			public: body.public ?? true,
		})
		if ('error' in result) {
			return jsonResponse({ error: result.error }, 400)
		}
		await ctx.runMutation(internal.parkrun.setAppData, {
			key: 'scoopBusDataUpdatedAt',
			value: Date.now().toString(),
		})
		return jsonResponse(result)
	}),
})

// --- Admin: PUT /api/admin/races ---

http.route({
	path: '/api/admin/races',
	method: 'PUT',
	handler: httpAction(async (ctx, request) => {
		const body = await request.json()
		const result = await ctx.runMutation(api.races.update, {
			token: body.token ?? '',
			raceId: body.raceId ?? '',
			date: body.date,
			name: body.name,
			website: body.website,
			type: body.type,
			attendees: body.attendees,
			guests: body.guests,
			majorEvent: body.majorEvent,
			public: body.public,
		})
		if ('error' in result) {
			return jsonResponse({ error: result.error }, 400)
		}
		await ctx.runMutation(internal.parkrun.setAppData, {
			key: 'scoopBusDataUpdatedAt',
			value: Date.now().toString(),
		})
		return jsonResponse(result)
	}),
})

// --- Admin: DELETE /api/admin/races ---

http.route({
	path: '/api/admin/races',
	method: 'DELETE',
	handler: httpAction(async (ctx, request) => {
		const url = new URL(request.url)
		const token = url.searchParams.get('token') ?? ''
		const raceId = url.searchParams.get('id') ?? ''
		const result = await ctx.runMutation(api.races.remove, {
			token,
			// biome-ignore lint/suspicious/noExplicitAny: Convex ID cast from URL param
			raceId: raceId as any,
		})
		if ('error' in result) {
			return jsonResponse({ error: result.error }, 400)
		}
		await ctx.runMutation(internal.parkrun.setAppData, {
			key: 'scoopBusDataUpdatedAt',
			value: Date.now().toString(),
		})
		return jsonResponse(result)
	}),
})

// --- Admin: GET /api/admin/races/today ---

http.route({
	path: '/api/admin/races/today',
	method: 'GET',
	handler: httpAction(async (ctx, request) => {
		const url = new URL(request.url)
		const token = url.searchParams.get('token') ?? ''
		const races = await ctx.runQuery(api.races.getToday, { token })
		return jsonResponse(races)
	}),
})

// --- Admin: GET /api/admin/logs ---

http.route({
	path: '/api/admin/logs',
	method: 'GET',
	handler: httpAction(async (ctx, request) => {
		const url = new URL(request.url)
		const token = url.searchParams.get('token') ?? ''
		const limit = url.searchParams.get('limit')
		const cursor = url.searchParams.get('cursor')
		const filterUsername = url.searchParams.get('username') || undefined
		const filterAction = url.searchParams.get('action') || undefined
		const result = await ctx.runQuery(api.adminLogs.list, {
			token,
			limit: limit ? Number.parseInt(limit, 10) : undefined,
			cursor: cursor ? Number.parseInt(cursor, 10) : undefined,
			filterUsername,
			filterAction,
		})
		return jsonResponse(result)
	}),
})

// --- GET /api/guests (public) ---

http.route({
	path: '/api/guests',
	method: 'GET',
	handler: httpAction(async (ctx) => {
		const guests = await ctx.runQuery(api.guests.listPublic)
		return jsonResponse(guests)
	}),
})

// --- GET /api/guest?id=<guestId> (public) ---

http.route({
	path: '/api/guest',
	method: 'GET',
	handler: httpAction(async (ctx, request) => {
		const url = new URL(request.url)
		const id = url.searchParams.get('id')
		const parkrunId = url.searchParams.get('parkrunId')

		if (parkrunId) {
			const guest = await ctx.runQuery(api.guests.getByParkrunId, { parkrunId })
			if (!guest) return jsonResponse({ error: 'Guest not found' }, 404)
			return jsonResponse(guest)
		}

		if (!id) {
			return jsonResponse(
				{ error: "Missing 'id' or 'parkrunId' query parameter" },
				400,
			)
		}

		// biome-ignore lint/suspicious/noExplicitAny: Convex ID cast from URL param
		const guest = await ctx.runQuery(api.guests.get, { guestId: id as any })
		if (!guest) return jsonResponse({ error: 'Guest not found' }, 404)
		return jsonResponse(guest)
	}),
})

// --- GET /api/guest/results?id=<guestId> (public) ---

http.route({
	path: '/api/guest/results',
	method: 'GET',
	handler: httpAction(async (ctx, request) => {
		const url = new URL(request.url)
		const id = url.searchParams.get('id')
		if (!id) {
			return jsonResponse({ error: "Missing 'id' query parameter" }, 400)
		}
		const results = await ctx.runQuery(api.guests.getGuestResults, {
			// biome-ignore lint/suspicious/noExplicitAny: necessary for dynamic/WebGL API
			guestId: id as any,
		})
		return jsonResponse(results)
	}),
})

// --- GET /api/guest-results (public, all) ---

http.route({
	path: '/api/guest-results',
	method: 'GET',
	handler: httpAction(async (ctx) => {
		const results = await ctx.runQuery(api.guests.getAllGuestResults)
		return jsonResponse(results)
	}),
})

// --- Admin: GET /api/admin/guests ---

http.route({
	path: '/api/admin/guests',
	method: 'GET',
	handler: httpAction(async (ctx, request) => {
		const url = new URL(request.url)
		const token = url.searchParams.get('token') ?? ''
		const guests = await ctx.runQuery(api.guests.list, { token })
		return jsonResponse(guests)
	}),
})

// --- Admin: POST /api/admin/guests ---

http.route({
	path: '/api/admin/guests',
	method: 'POST',
	handler: httpAction(async (ctx, request) => {
		const body = await request.json()
		const result = await ctx.runMutation(api.guests.create, {
			token: body.token ?? '',
			name: body.name ?? '',
			extra: body.extra,
			parkrunId: body.parkrunId,
			avatar: body.avatar,
		})
		if ('error' in result) {
			return jsonResponse({ error: result.error }, 400)
		}
		await ctx.runMutation(internal.parkrun.setAppData, {
			key: 'guestDataUpdatedAt',
			value: Date.now().toString(),
		})
		return jsonResponse(result)
	}),
})

// --- Admin: PUT /api/admin/guests ---

http.route({
	path: '/api/admin/guests',
	method: 'PUT',
	handler: httpAction(async (ctx, request) => {
		const body = await request.json()
		const result = await ctx.runMutation(api.guests.update, {
			token: body.token ?? '',
			guestId: body.guestId ?? '',
			name: body.name,
			extra: body.extra,
			parkrunId: body.parkrunId,
			avatar: body.avatar,
		})
		if ('error' in result) {
			return jsonResponse({ error: result.error }, 400)
		}
		await ctx.runMutation(internal.parkrun.setAppData, {
			key: 'guestDataUpdatedAt',
			value: Date.now().toString(),
		})
		return jsonResponse(result)
	}),
})

// --- Admin: DELETE /api/admin/guests ---

http.route({
	path: '/api/admin/guests',
	method: 'DELETE',
	handler: httpAction(async (ctx, request) => {
		const url = new URL(request.url)
		const token = url.searchParams.get('token') ?? ''
		const guestId = url.searchParams.get('id') ?? ''
		const result = await ctx.runMutation(api.guests.remove, {
			token,
			// biome-ignore lint/suspicious/noExplicitAny: Convex ID cast from URL param
			guestId: guestId as any,
		})
		if ('error' in result) {
			return jsonResponse({ error: result.error }, 400)
		}
		await ctx.runMutation(internal.parkrun.setAppData, {
			key: 'guestDataUpdatedAt',
			value: Date.now().toString(),
		})
		return jsonResponse(result)
	}),
})

// --- Admin: POST /api/admin/guest-result ---

http.route({
	path: '/api/admin/guest-result',
	method: 'POST',
	handler: httpAction(async (ctx, request) => {
		const body = await request.json()
		const result = await ctx.runMutation(api.guests.addGuestResult, {
			token: body.token ?? '',
			guestId: body.guestId ?? '',
			event: body.event ?? '',
			eventNumber: body.eventNumber ?? 0,
			position: body.position ?? 0,
			time: body.time ?? '',
			date: body.date ?? '',
		})
		if ('error' in result) {
			return jsonResponse({ error: result.error }, 400)
		}
		await ctx.runMutation(internal.parkrun.setAppData, {
			key: 'guestDataUpdatedAt',
			value: Date.now().toString(),
		})
		return jsonResponse(result)
	}),
})

// --- Admin: DELETE /api/admin/guest-result ---

http.route({
	path: '/api/admin/guest-result',
	method: 'DELETE',
	handler: httpAction(async (ctx, request) => {
		const url = new URL(request.url)
		const token = url.searchParams.get('token') ?? ''
		const resultId = url.searchParams.get('id') ?? ''
		const result = await ctx.runMutation(api.guests.removeGuestResult, {
			token,
			// biome-ignore lint/suspicious/noExplicitAny: Convex ID cast from URL param
			resultId: resultId as any,
		})
		if ('error' in result) {
			return jsonResponse({ error: result.error }, 400)
		}
		await ctx.runMutation(internal.parkrun.setAppData, {
			key: 'guestDataUpdatedAt',
			value: Date.now().toString(),
		})
		return jsonResponse(result)
	}),
})

// --- GET /api/largest-clubs (public) ---
// The top two clubs by total runs (plus ties, plus Scoop Bus Run Club) with
// their recent runs-per-week rate and overtake projections.

http.route({
	path: '/api/largest-clubs',
	method: 'GET',
	handler: httpAction(async (ctx) => {
		const summary = await ctx.runQuery(api.largestClubs.getSummary)
		return jsonResponse(summary)
	}),
})

// --- GET /api/largest-clubs/all (public) ---
// Every weekly snapshot, for graphing.

http.route({
	path: '/api/largest-clubs/all',
	method: 'GET',
	handler: httpAction(async (ctx) => {
		const snapshots = await ctx.runQuery(api.largestClubs.listAll)
		return jsonResponse(snapshots)
	}),
})

// --- POST /api/ingest-largest-clubs ---
// Receives the parkrun Sweden largest-clubs league table, scraped weekly.
// Protected by a shared secret in the Authorization header.

http.route({
	path: '/api/ingest-largest-clubs',
	method: 'POST',
	handler: httpAction(async (ctx, request) => {
		const authHeader = request.headers.get('Authorization')
		const expectedSecret = process.env.INGEST_SECRET

		if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
			return jsonResponse({ error: 'Unauthorized' }, 401)
		}

		const body = await request.json()
		const clubs = body?.clubs
		const week = body?.week

		if (!Array.isArray(clubs) || typeof week !== 'string' || !week) {
			return jsonResponse(
				{ error: 'Invalid payload: expected { week, clubs: [...] }' },
				400,
			)
		}

		let stored = 0
		for (const club of clubs) {
			if (
				typeof club?.name !== 'string' ||
				!club.name ||
				typeof club.members !== 'number' ||
				typeof club.events !== 'number'
			)
				continue

			await ctx.runMutation(internal.largestClubs.storeSnapshot, {
				week,
				clubId: club.clubId,
				name: club.name,
				members: club.members,
				events: club.events,
			})
			stored++
		}

		// Recompute the projection from the snapshots we just stored, so the
		// ingest response can report the current estimate.
		const summary = await ctx.runQuery(api.largestClubs.getSummary)

		// Mark largest-clubs data as updated so clients know to invalidate cache
		await ctx.runMutation(internal.parkrun.setAppData, {
			key: 'largestClubsUpdatedAt',
			value: Date.now().toString(),
		})

		return jsonResponse({
			status: 'ok',
			week,
			clubsStored: stored,
			estimatedWeeksToLargest: summary.estimatedWeeksToLargest,
		})
	}),
})

// --- Admin: GET /api/admin/parkruns ---
// Returns paginated parkrun events (distinct event+eventNumber combos from runResults)

http.route({
	path: '/api/admin/parkruns',
	method: 'GET',
	handler: httpAction(async (ctx, request) => {
		const url = new URL(request.url)
		const token = url.searchParams.get('token') ?? ''

		// Validate admin session
		const session = await ctx.runQuery(api.auth.validateToken, { token })
		if (!session) return jsonResponse({ error: 'Unauthorized' }, 401)

		const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'))
		const pageSize = 10
		const search = (url.searchParams.get('search') ?? '').trim().toLowerCase()

		const results = await ctx.runQuery(api.queries.getRecentResults, {
			sinceDate: '0000-00-00',
		})

		// Build distinct parkrun events
		const eventMap = new Map<
			string,
			{
				event: string
				eventName: string
				eventNumber: number
				date: string
				resultCount: number
			}
		>()
		for (const r of results) {
			const key = `${r.event}#${r.eventNumber}`
			if (!eventMap.has(key)) {
				eventMap.set(key, {
					event: r.event,
					eventName: r.eventName,
					eventNumber: r.eventNumber,
					date: r.date,
					resultCount: 0,
				})
			}
			// biome-ignore lint/style/noNonNullAssertion: map.set above guarantees key exists
			eventMap.get(key)!.resultCount++
		}

		let allEvents = Array.from(eventMap.values()).sort((a, b) => {
			const dateCompare = b.date.localeCompare(a.date)
			if (dateCompare !== 0) return dateCompare
			return b.eventNumber - a.eventNumber
		})

		if (search) {
			allEvents = allEvents.filter(
				(e) =>
					e.eventName.toLowerCase().includes(search) ||
					e.event.toLowerCase().includes(search) ||
					e.date.includes(search) ||
					String(e.eventNumber).includes(search),
			)
		}

		const total = allEvents.length
		const totalPages = Math.ceil(total / pageSize)
		const start = (page - 1) * pageSize
		const items = allEvents.slice(start, start + pageSize)

		// Fetch guest results for these parkrun events
		const guestResults = await ctx.runQuery(api.guests.getAllGuestResults)
		const guestResultsByEvent = new Map<string, typeof guestResults>()
		for (const gr of guestResults) {
			const key = `${gr.event}#${gr.eventNumber}`
			if (!guestResultsByEvent.has(key)) guestResultsByEvent.set(key, [])
			guestResultsByEvent.get(key)?.push(gr)
		}

		const itemsWithGuests = items.map((item) => ({
			...item,
			guestResults:
				guestResultsByEvent.get(`${item.event}#${item.eventNumber}`) ?? [],
		}))

		return jsonResponse({ items: itemsWithGuests, page, totalPages, total })
	}),
})

// --- Admin: POST /api/admin/manual-ingest ---
// Receives data the Process Results admin page parsed in the browser from
// hand-downloaded parkrun pages — the fallback for when the scrapers are being
// blocked. Every section is optional so the page can upload in small chunks,
// and each one runs through the same internal mutations as the scraper's own
// ingest endpoints above. Authorised by an admin session rather than the
// INGEST_SECRET, which only the scripts hold.

http.route({
	path: '/api/admin/manual-ingest',
	method: 'POST',
	handler: httpAction(async (ctx, request) => {
		const body = await request.json()
		const token: string = body?.token ?? ''

		const session = await ctx.runQuery(api.auth.validateToken, { token })
		if (!session) return jsonResponse({ error: 'Unauthorized' }, 401)

		const counts = {
			runners: 0,
			runResults: 0,
			events: 0,
			volunteers: 0,
			clubs: 0,
			courses: 0,
		}
		let touchedParkrunData = false
		let estimatedWeeksToLargest: number | null = null

		// --- Athlete results (mirrors /api/ingest) ---

		let latestResultDate = ''

		if (Array.isArray(body?.athletes)) {
			for (const athlete of body.athletes) {
				const { parkrunId, runner, runResults } = athlete
				if (!parkrunId || !runner) continue

				await ctx.runMutation(internal.parkrun.storeRunnerData, {
					parkrunId,
					name: runner.name,
					totalRuns: runner.totalRuns,
					totalJuniorRuns: runner.totalJuniorRuns ?? 0,
				})
				counts.runners++

				if (Array.isArray(runResults)) {
					for (const result of runResults) {
						await ctx.runMutation(internal.parkrun.storeRunResult, {
							parkrunId,
							event: result.event,
							eventNumber: result.eventNumber,
							position: result.position,
							time: result.time,
							ageGrade: result.ageGrade,
							date: result.date,
						})
						counts.runResults++
						if (result.date > latestResultDate) latestResultDate = result.date
					}
				}
			}

			if (latestResultDate) {
				await ctx.runMutation(internal.manualResults.raiseWatermark, {
					key: 'latestResultsScrapeDate',
					value: latestResultDate,
					compare: 'date',
				})
			}

			touchedParkrunData = true
		}

		// --- Events discovered in those results ---

		if (Array.isArray(body?.events)) {
			for (const event of body.events) {
				if (!event.eventId || !event.name || !event.url || !event.country)
					continue
				await ctx.runMutation(internal.parkrun.storeEvent, {
					eventId: event.eventId,
					name: event.name,
					url: event.url,
					country: event.country,
				})
				counts.events++
			}
			touchedParkrunData = true
		}

		// --- Volunteers (mirrors /api/ingest-volunteers) ---

		if (Array.isArray(body?.volunteers)) {
			/** Highest event number seen per event, for the scrape watermarks. */
			const highestByEvent = new Map<string, number>()

			for (const vol of body.volunteers) {
				if (
					!vol.parkrunId ||
					!vol.event ||
					!vol.eventNumber ||
					!vol.date ||
					!Array.isArray(vol.roles)
				)
					continue

				await ctx.runMutation(internal.parkrun.storeVolunteer, {
					parkrunId: vol.parkrunId,
					event: vol.event,
					eventNumber: vol.eventNumber,
					date: vol.date,
					roles: vol.roles,
				})
				counts.volunteers++

				const highest = highestByEvent.get(vol.event) ?? 0
				if (vol.eventNumber > highest) {
					highestByEvent.set(vol.event, vol.eventNumber)
				}
			}

			// An event page with no tracked volunteers on it still counts as
			// scraped, so the page sends the numbers it processed separately.
			if (Array.isArray(body?.volunteerEvents)) {
				for (const processed of body.volunteerEvents) {
					if (!processed?.event || !processed?.eventNumber) continue
					const highest = highestByEvent.get(processed.event) ?? 0
					if (processed.eventNumber > highest) {
						highestByEvent.set(processed.event, processed.eventNumber)
					}
				}
			}

			for (const [eventId, eventNumber] of highestByEvent) {
				const capitalised = eventId.charAt(0).toUpperCase() + eventId.slice(1)
				await ctx.runMutation(internal.manualResults.raiseWatermark, {
					key: `latest${capitalised}EventNumber`,
					value: String(eventNumber),
					compare: 'number',
				})
			}

			touchedParkrunData = true
		}

		// --- Course maps (mirrors /api/ingest-course) ---

		if (Array.isArray(body?.courses)) {
			for (const course of body.courses) {
				if (!course?.eventId || !Array.isArray(course.coordinates)) continue
				await ctx.runMutation(internal.courses.storeCourse, {
					eventId: course.eventId,
					coordinates: course.coordinates,
					points: course.points ?? [],
				})
				counts.courses++
			}
			touchedParkrunData = true
		}

		// --- Largest clubs league table (mirrors /api/ingest-largest-clubs) ---

		const largestClubs = body?.largestClubs
		if (largestClubs && Array.isArray(largestClubs.clubs)) {
			const week = largestClubs.week
			if (typeof week !== 'string' || !week) {
				return jsonResponse(
					{ error: 'Invalid payload: largestClubs needs a week' },
					400,
				)
			}

			for (const club of largestClubs.clubs) {
				if (
					typeof club?.name !== 'string' ||
					!club.name ||
					typeof club.members !== 'number' ||
					typeof club.events !== 'number'
				)
					continue

				await ctx.runMutation(internal.largestClubs.storeSnapshot, {
					week,
					clubId: club.clubId,
					name: club.name,
					members: club.members,
					events: club.events,
				})
				counts.clubs++
			}

			const summary = await ctx.runQuery(api.largestClubs.getSummary)
			estimatedWeeksToLargest = summary.estimatedWeeksToLargest

			await ctx.runMutation(internal.parkrun.setAppData, {
				key: 'largestClubsUpdatedAt',
				value: Date.now().toString(),
			})
		}

		if (touchedParkrunData) {
			await ctx.runMutation(internal.parkrun.setAppData, {
				key: 'parkrunDataUpdatedAt',
				value: Date.now().toString(),
			})
		}

		// --- Record what was uploaded ---

		const summaryParts: string[] = []
		if (counts.runners) {
			summaryParts.push(
				`${counts.runners} runner(s), ${counts.runResults} result(s)`,
			)
		}
		if (counts.events) summaryParts.push(`${counts.events} event(s)`)
		if (counts.volunteers) {
			summaryParts.push(`${counts.volunteers} volunteer record(s)`)
		}
		if (counts.courses) summaryParts.push(`${counts.courses} course(s)`)
		if (counts.clubs) summaryParts.push(`${counts.clubs} club snapshot(s)`)

		if (summaryParts.length > 0) {
			await ctx.runMutation(internal.manualResults.logIngest, {
				token,
				detail: `Manual upload: ${summaryParts.join(', ')}`,
			})
		}

		return jsonResponse({
			status: 'ok',
			...counts,
			latestResultDate: latestResultDate || undefined,
			estimatedWeeksToLargest,
		})
	}),
})

// --- CORS preflight for all API routes ---

for (const path of [
	'/api/runners',
	'/api/runner',
	'/api/runner/runs',
	'/api/results',
	'/api/events',
	'/api/races',
	'/api/ingest',
	'/api/ingest-volunteers',
	'/api/ingest-course',
	'/api/courses',
	'/api/course',
	'/api/weather',
	'/api/app-data',
	'/api/admin/login',
	'/api/admin/logout',
	'/api/admin/validate',
	'/api/admin/users',
	'/api/admin/account/password',
	'/api/admin/races',
	'/api/admin/races/today',
	'/api/cache-version',
	'/api/admin/logs',
	'/api/volunteers',
	'/api/guests',
	'/api/guest',
	'/api/guest/results',
	'/api/guest-results',
	'/api/admin/guests',
	'/api/admin/guest-result',
	'/api/admin/parkruns',
	'/api/largest-clubs',
	'/api/largest-clubs/all',
	'/api/ingest-largest-clubs',
	'/api/admin/manual-ingest',
]) {
	http.route({
		path,
		method: 'OPTIONS',
		handler: httpAction(async () => {
			return new Response(null, { status: 204, headers: corsHeaders })
		}),
	})
}

export default http
