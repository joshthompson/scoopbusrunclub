import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { validateSession } from "./auth";

const attendeeValidator = v.object({
  runnerId: v.string(),
  position: v.optional(v.number()),
  time: v.optional(v.string()), // hh:mm:ss format
  distance: v.optional(v.number()),
  laps: v.optional(v.number()),
  scanned: v.optional(v.boolean()),
});

// ── Queries ─────────────────────────────────────────────────────────

export const list = query({
  args: {
    token: v.string(),
    includeOld: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const session = await validateSession(ctx, args.token);
    if (!session) return [];

    const allRaces = await ctx.db.query("races").collect();

    let filtered = allRaces;
    if (!args.includeOld) {
      // Only show races whose date is within the last 7 days or in the future
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      const cutoffStr = cutoff.toISOString().slice(0, 10);
      filtered = allRaces.filter((r) => r.date >= cutoffStr);
    }

    // Sort ascending by date (furthest future at bottom)
    return filtered.sort((a, b) => a.date.localeCompare(b.date));
  },
});

export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const allRaces = await ctx.db.query("races").collect();
    return allRaces
      .filter((r) => r.public)
      .sort((a, b) => a.date.localeCompare(b.date));
  },
});

export const getToday = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await validateSession(ctx, args.token);
    if (!session) return [];

    const today = new Date().toISOString().slice(0, 10);
    const allRaces = await ctx.db
      .query("races")
      .withIndex("by_date", (q) => q.eq("date", today))
      .collect();

    return allRaces;
  },
});

// ── Mutations ───────────────────────────────────────────────────────

export const create = mutation({
  args: {
    token: v.string(),
    date: v.string(),
    name: v.string(),
    website: v.optional(v.string()),
    type: v.optional(v.string()),
    attendees: v.array(attendeeValidator),
    majorEvent: v.optional(v.boolean()),
    public: v.boolean(),
  },
  handler: async (ctx, args) => {
    const session = await validateSession(ctx, args.token);
    if (!session) return { error: "Unauthorized" };

    const now = Date.now();
    const id = await ctx.db.insert("races", {
      date: args.date,
      name: args.name,
      website: args.website,
      type: args.type,
      attendees: args.attendees,
      majorEvent: args.majorEvent,
      public: args.public,
      createdAt: now,
      modifiedAt: now,
      modifiedBy: session.username,
    });

    return { id };
  },
});

export const update = mutation({
  args: {
    token: v.string(),
    raceId: v.id("races"),
    date: v.optional(v.string()),
    name: v.optional(v.string()),
    website: v.optional(v.string()),
    type: v.optional(v.string()),
    attendees: v.optional(v.array(attendeeValidator)),
    majorEvent: v.optional(v.boolean()),
    public: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const session = await validateSession(ctx, args.token);
    if (!session) return { error: "Unauthorized" };

    const existing = await ctx.db.get(args.raceId);
    if (!existing) return { error: "Race not found" };

    const patch: Record<string, any> = {
      modifiedAt: Date.now(),
      modifiedBy: session.username,
    };

    if (args.date !== undefined) patch.date = args.date;
    if (args.name !== undefined) patch.name = args.name;
    if (args.website !== undefined) patch.website = args.website;
    if (args.type !== undefined) patch.type = args.type;
    if (args.attendees !== undefined) patch.attendees = args.attendees;
    if (args.majorEvent !== undefined) patch.majorEvent = args.majorEvent;
    if (args.public !== undefined) patch.public = args.public;

    await ctx.db.patch(args.raceId, patch);
    return { ok: true };
  },
});

export const remove = mutation({
  args: {
    token: v.string(),
    raceId: v.id("races"),
  },
  handler: async (ctx, args) => {
    const session = await validateSession(ctx, args.token);
    if (!session) return { error: "Unauthorized" };

    const existing = await ctx.db.get(args.raceId);
    if (!existing) return { error: "Race not found" };

    await ctx.db.delete(args.raceId);
    return { ok: true };
  },
});
