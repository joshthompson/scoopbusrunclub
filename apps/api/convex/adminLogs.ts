import { query } from "./_generated/server";
import { v } from "convex/values";
import { validateSession } from "./auth";

export const list = query({
  args: {
    token: v.string(),
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()), // timestamp cursor for pagination (fetch older than this)
    filterUsername: v.optional(v.string()),
    filterAction: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await validateSession(ctx, args.token);
    if (!session) return { logs: [], hasMore: false };
    if (!session.isSuperAdmin) return { logs: [], hasMore: false };

    const pageSize = Math.min(args.limit ?? 50, 200);

    // Fetch all logs and filter/sort in memory (Convex doesn't support
    // compound index range + ordering elegantly for this use-case)
    let allLogs = await ctx.db.query("adminEventLogs").collect();

    // Apply filters
    if (args.filterUsername) {
      allLogs = allLogs.filter((l) => l.username === args.filterUsername);
    }
    if (args.filterAction) {
      allLogs = allLogs.filter((l) => l.action === args.filterAction);
    }

    // Sort newest first
    allLogs.sort((a, b) => b.timestamp - a.timestamp);

    // Apply cursor (pagination)
    if (args.cursor) {
      allLogs = allLogs.filter((l) => l.timestamp < args.cursor!);
    }

    const page = allLogs.slice(0, pageSize);
    const hasMore = allLogs.length > pageSize;

    return {
      logs: page.map((l) => ({
        _id: l._id,
        username: l.username,
        action: l.action,
        detail: l.detail,
        targetType: l.targetType,
        targetId: l.targetId,
        timestamp: l.timestamp,
      })),
      hasMore,
    };
  },
});
