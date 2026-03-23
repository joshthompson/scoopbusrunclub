import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Internal mutations for storing Parkrun data.
 * Called by the /api/ingest HTTP endpoint (which receives data from
 * the GitHub Actions Playwright scraper).
 */

// --- Upsert runner summary ---

export const storeRunnerData = internalMutation({
  args: {
    parkrunId: v.string(),
    name: v.string(),
    totalRuns: v.number(),
    totalJuniorRuns: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("runners")
      .withIndex("by_parkrunId", (q) => q.eq("parkrunId", args.parkrunId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        totalRuns: args.totalRuns,
        totalJuniorRuns: args.totalJuniorRuns ?? 0,
        lastUpdated: Date.now(),
      });
    } else {
      await ctx.db.insert("runners", {
        parkrunId: args.parkrunId,
        name: args.name,
        totalRuns: args.totalRuns,
        totalJuniorRuns: args.totalJuniorRuns ?? 0,
        lastUpdated: Date.now(),
      });
    }
  },
});

// --- Insert run result ---

export const storeRunResult = internalMutation({
  args: {
    parkrunId: v.string(),
    event: v.string(),
    eventNumber: v.number(),
    position: v.number(),
    time: v.string(),
    ageGrade: v.string(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("runResults")
      .withIndex("by_unique_result", (q) =>
        q
          .eq("parkrunId", args.parkrunId)
          .eq("event", args.event)
          .eq("eventNumber", args.eventNumber),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        position: args.position,
        time: args.time,
        ageGrade: args.ageGrade,
        date: args.date,
        fetchedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("runResults", {
        ...args,
        fetchedAt: Date.now(),
      });
    }
  },
});

// --- Upsert event ---

export const storeEvent = internalMutation({
  args: {
    eventId: v.string(),
    name: v.string(),
    url: v.string(),
    country: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("events")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        url: args.url,
        country: args.country,
      });
    } else {
      await ctx.db.insert("events", {
        eventId: args.eventId,
        name: args.name,
        url: args.url,
        country: args.country,
      });
    }
  },
});

// --- Upsert volunteer ---

export const storeVolunteer = internalMutation({
  args: {
    parkrunId: v.string(),
    event: v.string(),
    eventNumber: v.number(),
    date: v.string(),
    roles: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("volunteers")
      .withIndex("by_unique_volunteer", (q) =>
        q
          .eq("parkrunId", args.parkrunId)
          .eq("event", args.event)
          .eq("eventNumber", args.eventNumber),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        date: args.date,
        roles: args.roles,
        fetchedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("volunteers", {
        ...args,
        fetchedAt: Date.now(),
      });
    }
  },
});

// --- App data (key/value store) ---

export const setAppData = internalMutation({
  args: {
    key: v.string(),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("appData")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value });
    } else {
      await ctx.db.insert("appData", {
        key: args.key,
        value: args.value,
      });
    }
  },
});

export const getAppData = internalQuery({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("appData")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    return row?.value ?? null;
  },
});




