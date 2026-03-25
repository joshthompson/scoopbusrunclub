import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { validateSession, logAdminEvent } from "./auth";

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
    const session = await validateSession(ctx, args.token, true);
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

    await logAdminEvent(ctx, {
      userId: session.userId,
      username: session.username,
      action: "created_event",
      detail: `Created event '${args.name}' on ${args.date}`,
      targetType: "event",
      targetId: id,
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
    const session = await validateSession(ctx, args.token, true);
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

    // Detect scan check-ins: new attendees with scanned=true that weren't scanned before
    if (args.attendees !== undefined) {
      const oldScanned = new Set(
        existing.attendees.filter((a) => a.scanned).map((a) => a.runnerId)
      );
      const newlyScanned = args.attendees.filter(
        (a) => a.scanned && !oldScanned.has(a.runnerId)
      );
      for (const att of newlyScanned) {
        await logAdminEvent(ctx, {
          userId: session.userId,
          username: session.username,
          action: "scanned_user",
          detail: `Scanned '${att.runnerId}' at '${existing.name}'`,
          targetType: "event",
          targetId: args.raceId,
        });
      }
    }

    await logAdminEvent(ctx, {
      userId: session.userId,
      username: session.username,
      action: "edited_event",
      detail: `Edited event '${existing.name}' on ${existing.date}`,
      targetType: "event",
      targetId: args.raceId,
    });

    return { ok: true };
  },
});

export const remove = mutation({
  args: {
    token: v.string(),
    raceId: v.id("races"),
  },
  handler: async (ctx, args) => {
    const session = await validateSession(ctx, args.token, true);
    if (!session) return { error: "Unauthorized" };

    const existing = await ctx.db.get(args.raceId);
    if (!existing) return { error: "Race not found" };

    await ctx.db.delete(args.raceId);

    await logAdminEvent(ctx, {
      userId: session.userId,
      username: session.username,
      action: "deleted_event",
      detail: `Deleted event '${existing.name}' on ${existing.date}`,
      targetType: "event",
      targetId: args.raceId,
    });

    return { ok: true };
  },
});
