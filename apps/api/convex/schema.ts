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
});
