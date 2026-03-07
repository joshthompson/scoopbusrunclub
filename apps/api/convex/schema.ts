import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  runners: defineTable({
    parkrunId: v.string(),
    name: v.string(),
    totalRuns: v.number(),
    lastUpdated: v.number(),
  }).index("by_parkrunId", ["parkrunId"]),

  runResults: defineTable({
    parkrunId: v.string(),
    eventName: v.string(),
    eventNumber: v.number(),
    position: v.number(),
    time: v.string(),
    ageGrade: v.string(),
    date: v.string(), // YYYY-MM-DD
    fetchedAt: v.number(),
  })
    .index("by_parkrunId", ["parkrunId"])
    .index("by_unique_result", ["parkrunId", "eventName", "eventNumber"]),
});
