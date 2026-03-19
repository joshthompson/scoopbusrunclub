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
});
