import { query } from "./_generated/server";
import { v } from "convex/values";

export const getAllRunners = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("runners").collect();
  },
});

export const getRunner = query({
  args: { parkrunId: v.string() },
  handler: async (ctx, args) => {
    const runner = await ctx.db
      .query("runners")
      .withIndex("by_parkrunId", (q) => q.eq("parkrunId", args.parkrunId))
      .unique();

    if (!runner) {
      return null;
    }

    const runResults = await ctx.db
      .query("runResults")
      .withIndex("by_parkrunId", (q) => q.eq("parkrunId", args.parkrunId))
      .collect();

    return { ...runner, runResults };
  },
});

export const getRunResults = query({
  args: { parkrunId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("runResults")
      .withIndex("by_parkrunId", (q) => q.eq("parkrunId", args.parkrunId))
      .collect();
  },
});

/**
 * Get all run results across all runners since a given date.
 * Returns results with runner names attached for display.
 */
export const getRecentResults = query({
  args: { sinceDate: v.string() },
  handler: async (ctx, args) => {
    const runners = await ctx.db.query("runners").collect();
    const runnerMap = new Map(runners.map((r) => [r.parkrunId, r.name]));

    const events = await ctx.db.query("events").collect();
    const eventNameMap = new Map(events.map((e) => [e.eventId, e.name]));

    const allResults = await ctx.db.query("runResults").collect();

    return allResults
      .filter((r) => r.date >= args.sinceDate)
      .map((r) => ({
        parkrunId: r.parkrunId,
        runnerName: runnerMap.get(r.parkrunId) ?? "Unknown",
        event: r.event,
        eventName: eventNameMap.get(r.event) ?? r.event,
        eventNumber: r.eventNumber,
        position: r.position,
        time: r.time,
        ageGrade: r.ageGrade,
        date: r.date,
      }));
  },
});

export const getAllEvents = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("events").collect();
  },
});

/**
 * Get all volunteer records for tracked runners.
 * Returns volunteer entries with runner names attached for display.
 */
export const getAllVolunteers = query({
  args: {},
  handler: async (ctx) => {
    const runners = await ctx.db.query("runners").collect();
    const runnerMap = new Map(runners.map((r) => [r.parkrunId, r.name]));

    const events = await ctx.db.query("events").collect();
    const eventNameMap = new Map(events.map((e) => [e.eventId, e.name]));

    const allVolunteers = await ctx.db.query("volunteers").collect();

    return allVolunteers.map((v) => ({
      parkrunId: v.parkrunId,
      volunteerName: runnerMap.get(v.parkrunId) ?? "Unknown",
      event: v.event,
      eventName: eventNameMap.get(v.event) ?? v.event,
      eventNumber: v.eventNumber,
      roles: v.roles,
      date: v.date,
    }));
  },
});
