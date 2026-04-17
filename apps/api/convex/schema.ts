import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  runners: defineTable({
    parkrunId: v.string(),
    name: v.string(),
    totalRuns: v.number(),
    totalJuniorRuns: v.optional(v.number()),
    lastUpdated: v.number(),
  }).index("by_parkrunId", ["parkrunId"]),

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
    .index("by_parkrunId", ["parkrunId"])
    .index("by_unique_result", ["parkrunId", "event", "eventNumber"]),

  events: defineTable({
    eventId: v.string(), // e.g. "haga"
    name: v.string(), // e.g. "Haga"
    url: v.string(), // e.g. "https://www.parkrun.se/haga/results/"
    country: v.string(), // e.g. "SE"
  }).index("by_eventId", ["eventId"]),

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
  }).index("by_username", ["username"]),

  sessions: defineTable({
    userId: v.id("adminUsers"),
    token: v.string(),
    expiresAt: v.number(),
  }).index("by_token", ["token"]),

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
      })
    ),
    majorEvent: v.optional(v.boolean()),
    public: v.boolean(),
    createdAt: v.number(),
    modifiedAt: v.number(),
    modifiedBy: v.string(),
  }).index("by_date", ["date"]),

  // --- Volunteer tracking ---

  volunteers: defineTable({
    date: v.string(), // YYYY-MM-DD
    event: v.string(), // e.g. "haga"
    eventNumber: v.number(),
    parkrunId: v.string(),
    roles: v.array(v.string()),
    fetchedAt: v.number(),
  })
    .index("by_unique_volunteer", ["parkrunId", "event", "eventNumber"])
    .index("by_event_number", ["event", "eventNumber"]),

  // --- Admin event logs ---

  adminEventLogs: defineTable({
    userId: v.id("adminUsers"),
    username: v.string(),
    action: v.string(), // e.g. "created_event", "edited_event", "deleted_event", etc.
    detail: v.optional(v.string()), // human-readable detail, e.g. "Created event 'Haga parkrun'"
    targetType: v.optional(v.string()), // "event" | "user" | "scan"
    targetId: v.optional(v.string()), // ID of the affected record
    timestamp: v.number(),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_username", ["username"])
    .index("by_action", ["action"]),

  // --- Course map data ---

  courses: defineTable({
    eventId: v.string(),
    coordinates: v.array(v.array(v.number())), // [[lon, lat, alt], ...]
    points: v.array(v.object({ name: v.string(), coordinates: v.array(v.number()) })), // [{ name: "Start", coordinates: [lon, lat, alt] }, ...]
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_eventId", ["eventId"]),

  // --- App-level key/value store ---

  appData: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),
});
