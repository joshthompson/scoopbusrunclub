import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
	runners: defineTable({
		parkrunId: v.string(),
		name: v.string(),
		totalRuns: v.number(),
		totalJuniorRuns: v.optional(v.number()),
		lastUpdated: v.number(),
	}).index('by_parkrunId', ['parkrunId']),

	runResults: defineTable({
		parkrunId: v.string(),
		event: v.string(), // eventId, e.g. "haga"
		eventNumber: v.number(),
		position: v.number(),
		time: v.string(),
		ageGrade: v.string(),
		date: v.string(), // YYYY-MM-DD
		fetchedAt: v.number(),
	})
		.index('by_parkrunId', ['parkrunId'])
		.index('by_unique_result', ['parkrunId', 'event', 'eventNumber']),

	events: defineTable({
		eventId: v.string(), // e.g. "haga"
		name: v.string(), // e.g. "Haga"
		url: v.string(), // e.g. "https://www.parkrun.se/haga/results/"
		country: v.string(), // e.g. "SE"
	}).index('by_eventId', ['eventId']),

	// --- Admin tables ---

	adminUsers: defineTable({
		username: v.string(),
		passwordHash: v.string(),
		salt: v.string(),
		isSuperAdmin: v.optional(v.boolean()),
		createdAt: v.number(),
		createdBy: v.optional(v.string()),
		lastLogin: v.optional(v.number()),
		lastActivity: v.optional(v.number()),
	}).index('by_username', ['username']),

	sessions: defineTable({
		userId: v.id('adminUsers'),
		token: v.string(),
		expiresAt: v.number(),
	}).index('by_token', ['token']),

	races: defineTable({
		date: v.string(), // YYYY-MM-DD
		name: v.string(),
		website: v.optional(v.string()),
		type: v.optional(v.string()),
		attendees: v.array(
			v.object({
				runnerId: v.string(), // RunnerName key from runners.ts
				position: v.optional(v.number()),
				time: v.optional(v.string()), // hh:mm:ss format
				distance: v.optional(v.number()),
				laps: v.optional(v.number()),
				scanned: v.optional(v.boolean()),
			}),
		),
		guests: v.optional(
			v.array(
				v.object({
					guestId: v.id('guests'),
					position: v.optional(v.number()),
					time: v.optional(v.string()), // hh:mm:ss format
					distance: v.optional(v.number()),
					laps: v.optional(v.number()),
				}),
			),
		),
		majorEvent: v.optional(v.boolean()),
		public: v.boolean(),
		createdAt: v.number(),
		modifiedAt: v.number(),
		modifiedBy: v.string(),
	}).index('by_date', ['date']),

	// --- Volunteer tracking ---

	volunteers: defineTable({
		date: v.string(), // YYYY-MM-DD
		event: v.string(), // e.g. "haga"
		eventNumber: v.number(),
		parkrunId: v.string(),
		roles: v.array(v.string()),
		fetchedAt: v.number(),
	})
		.index('by_unique_volunteer', ['parkrunId', 'event', 'eventNumber'])
		.index('by_event_number', ['event', 'eventNumber']),

	// --- Admin event logs ---

	adminEventLogs: defineTable({
		userId: v.id('adminUsers'),
		username: v.string(),
		action: v.string(), // e.g. "created_event", "edited_event", "deleted_event", etc.
		detail: v.optional(v.string()), // human-readable detail, e.g. "Created event 'Haga parkrun'"
		targetType: v.optional(v.string()), // "event" | "user" | "scan"
		targetId: v.optional(v.string()), // ID of the affected record
		timestamp: v.number(),
	})
		.index('by_timestamp', ['timestamp'])
		.index('by_username', ['username'])
		.index('by_action', ['action']),

	// --- Course map data ---

	courses: defineTable({
		eventId: v.string(),
		coordinates: v.array(v.array(v.number())), // [[lon, lat, alt], ...]
		points: v.array(
			v.object({ name: v.string(), coordinates: v.array(v.number()) }),
		), // [{ name: "Start", coordinates: [lon, lat, alt] }, ...]
		createdAt: v.number(),
		updatedAt: v.number(),
	}).index('by_eventId', ['eventId']),

	// --- Guest runners ---

	guests: defineTable({
		name: v.string(),
		extra: v.optional(v.string()),
		parkrunId: v.optional(v.string()),
		avatar: v.union(
			v.object({}),
			v.object({
				topType: v.union(
					v.literal('vest'),
					v.literal('tshirt'),
					v.literal('longsleeve'),
				),
				bottomType: v.union(
					v.literal('short-shorts'),
					v.literal('shorts'),
					v.literal('trousers'),
				),
				skin: v.union(
					v.literal('light'),
					v.literal('medium'),
					v.literal('dark'),
				),
				topColor: v.string(),
				bottomColor: v.string(),
				showColor: v.string(),
				sockColor: v.optional(v.string()),
				shoeColor: v.string(),
				head: v.object({
					hair: v.optional(
						v.union(v.literal('long'), v.literal('medium'), v.literal('short')),
					),
					hairColor: v.optional(v.string()),
					accessory: v.optional(
						v.union(
							v.literal('cap'),
							v.literal('headband'),
							v.literal('glasses'),
						),
					),
					accessoryColor: v.optional(v.string()),
					facialHair: v.optional(
						v.union(
							v.literal('beard'),
							v.literal('stubble'),
							v.literal('long'),
						),
					),
					facialHairColor: v.optional(v.string()),
					topColorForNeck: v.optional(v.boolean()),
				}),
			}),
		),
		createdAt: v.number(),
		modifiedAt: v.number(),
	}).index('by_parkrunId', ['parkrunId']),

	guestResults: defineTable({
		guestId: v.id('guests'),
		event: v.string(), // eventId, e.g. "haga"
		eventNumber: v.number(),
		position: v.number(),
		time: v.string(),
		date: v.string(), // YYYY-MM-DD
		createdAt: v.number(),
	})
		.index('by_guestId', ['guestId'])
		.index('by_unique_result', ['guestId', 'event', 'eventNumber']),

	// --- Largest clubs in Sweden (weekly league-table snapshots) ---

	largestClubs: defineTable({
		week: v.string(), // YYYY-MM-DD — the Saturday this snapshot represents
		clubId: v.optional(v.string()), // parkrun club id, e.g. "50310"
		name: v.string(),
		members: v.number(), // "Antal deltagare"
		events: v.number(), // "Antal starter"
		fetchedAt: v.number(),
	})
		.index('by_week', ['week'])
		.index('by_name', ['name'])
		.index('by_unique_snapshot', ['name', 'week']),

	// --- Custom racers (created by visitors, live in the header for a week) ---

	customRacers: defineTable({
		name: v.string(),
		avatar: v.object({
			topType: v.union(
				v.literal('vest'),
				v.literal('tshirt'),
				v.literal('longsleeve'),
			),
			bottomType: v.union(
				v.literal('short-shorts'),
				v.literal('shorts'),
				v.literal('trousers'),
			),
			skin: v.union(v.literal('light'), v.literal('medium'), v.literal('dark')),
			topColor: v.string(),
			bottomColor: v.string(),
			showColor: v.string(),
			sockColor: v.optional(v.string()),
			shoeColor: v.string(),
			head: v.object({
				hair: v.optional(
					v.union(v.literal('long'), v.literal('medium'), v.literal('short')),
				),
				hairColor: v.optional(v.string()),
				accessory: v.optional(
					v.union(
						v.literal('cap'),
						v.literal('headband'),
						v.literal('glasses'),
					),
				),
				accessoryColor: v.optional(v.string()),
				facialHair: v.optional(
					v.union(v.literal('beard'), v.literal('stubble'), v.literal('long')),
				),
				facialHairColor: v.optional(v.string()),
				topColorForNeck: v.optional(v.boolean()),
			}),
		}),
		/** 0 = slowest, 1 = fastest. Mapped onto the header's speed range at render. */
		speed: v.number(),
		/** Random per-browser id, so a visitor can see (and be linked to) their own racers. */
		secretId: v.string(),
		ip: v.string(),
		/**
		 * `active` runs in the header; `hidden` is a shadow ban — still visible to
		 * its creator, invisible to everyone else; `pending` awaits admin approval,
		 * which is off unless the `customRacerApproval` app-data key says otherwise.
		 */
		status: v.union(
			v.literal('active'),
			v.literal('pending'),
			v.literal('hidden'),
		),
		/** Why it was auto-hidden, e.g. "matched blocked term". Admin-only. */
		flagReason: v.optional(v.string()),
		/** True once an admin has renamed it, so we don't re-run the auto-block. */
		editedByAdmin: v.optional(v.boolean()),
		createdAt: v.number(),
		expiresAt: v.number(),
	})
		.index('by_secretId', ['secretId'])
		.index('by_ip', ['ip'])
		.index('by_expiresAt', ['expiresAt'])
		.index('by_createdAt', ['createdAt']),

	// --- App-level key/value store ---

	appData: defineTable({
		key: v.string(),
		value: v.string(),
	}).index('by_key', ['key']),
})
