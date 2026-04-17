import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Internal mutations and queries for storing/retrieving course map data.
 * Called by the /api/ingest-course HTTP endpoint.
 */

// --- Upsert course ---

export const storeCourse = internalMutation({
  args: {
    eventId: v.string(),
    coordinates: v.array(v.array(v.number())),
    points: v.array(v.object({ name: v.string(), coordinates: v.array(v.number()) })),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("courses")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        coordinates: args.coordinates,
        points: args.points,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("courses", {
        eventId: args.eventId,
        coordinates: args.coordinates,
        points: args.points,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// --- Get course by eventId ---

export const getCourse = internalQuery({
  args: { eventId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("courses")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .unique();
  },
});

// --- Get all event IDs that have course data ---

export const getAllCourseEventIds = internalQuery({
  args: {},
  handler: async (ctx) => {
    const courses = await ctx.db.query("courses").collect();
    return courses.map((c) => c.eventId);
  },
});
