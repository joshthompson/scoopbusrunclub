import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ── Seed admin toggle ──────────────────────────────────────────────
// When true, username "admin" / password "admin" is accepted even if
// no matching row exists in the adminUsers table.  Flip to false to
// disable the backdoor.
const ALLOW_SEED_ADMIN = true;
const SEED_USERNAME = "admin";
const SEED_PASSWORD = "admin";

// ── Helpers ─────────────────────────────────────────────────────────

/** SHA-256 hash a password with a salt. Returns hex string. */
async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Generate a random hex string for use as salt or token. */
function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Internal session validator (reused by other modules) ────────────
export async function validateSession(
  ctx: { db: any },
  token: string
): Promise<{ userId: any; username: string; isSuperAdmin: boolean } | null> {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .unique();

  if (!session || session.expiresAt < Date.now()) return null;

  const user = await ctx.db.get(session.userId);
  if (!user) return null;
  return { userId: user._id, username: user.username, isSuperAdmin: !!user.isSuperAdmin };
}

// ── Mutations / queries ─────────────────────────────────────────────

export const login = mutation({
  args: { username: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    // 1. Try seed credentials first
    if (
      ALLOW_SEED_ADMIN &&
      args.username === SEED_USERNAME &&
      args.password === SEED_PASSWORD
    ) {
      // Check if a real admin user already exists
      let adminUser = await ctx.db
        .query("adminUsers")
        .withIndex("by_username", (q) => q.eq("username", SEED_USERNAME))
        .unique();

      // Create the seed user if it doesn't exist
      if (!adminUser) {
        const salt = randomHex(16);
        const passwordHash = await hashPassword(SEED_PASSWORD, salt);
        const userId = await ctx.db.insert("adminUsers", {
          username: SEED_USERNAME,
          passwordHash,
          salt,
          isSuperAdmin: true,
          createdAt: Date.now(),
          createdBy: "seed",
        });
        adminUser = await ctx.db.get(userId);
      }

      const token = randomHex(32);
      await ctx.db.insert("sessions", {
        userId: adminUser!._id,
        token,
        expiresAt: Date.now() + SESSION_TTL_MS,
      });

      return { token, username: adminUser!.username };
    }

    // 2. Normal DB lookup
    const user = await ctx.db
      .query("adminUsers")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();

    if (!user) return { error: "Invalid credentials" };

    const hash = await hashPassword(args.password, user.salt);
    if (hash !== user.passwordHash) return { error: "Invalid credentials" };

    const token = randomHex(32);
    await ctx.db.insert("sessions", {
      userId: user._id,
      token,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });

    return { token, username: user.username };
  },
});

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (session) await ctx.db.delete(session._id);
    return { ok: true };
  },
});

export const validateToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const result = await validateSession(ctx, args.token);
    if (!result) return null;
    return { username: result.username, isSuperAdmin: result.isSuperAdmin };
  },
});

export const createUser = mutation({
  args: {
    token: v.string(),
    username: v.string(),
    password: v.string(),
    isSuperAdmin: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const session = await validateSession(ctx, args.token);
    if (!session) return { error: "Unauthorized" };
    if (!session.isSuperAdmin) return { error: "Only super admins can manage users" };

    // Check duplicate
    const existing = await ctx.db
      .query("adminUsers")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();
    if (existing) return { error: "Username already exists" };

    const salt = randomHex(16);
    const passwordHash = await hashPassword(args.password, salt);

    await ctx.db.insert("adminUsers", {
      username: args.username,
      passwordHash,
      salt,
      isSuperAdmin: args.isSuperAdmin ?? false,
      createdAt: Date.now(),
      createdBy: session.username,
    });

    return { ok: true };
  },
});

export const listUsers = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await validateSession(ctx, args.token);
    if (!session) return [];
    if (!session.isSuperAdmin) return [];

    const users = await ctx.db.query("adminUsers").collect();
    return users.map((u) => ({
      _id: u._id,
      username: u.username,
      isSuperAdmin: !!u.isSuperAdmin,
      createdAt: u.createdAt,
      createdBy: u.createdBy,
    }));
  },
});

export const changePassword = mutation({
  args: {
    token: v.string(),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await validateSession(ctx, args.token);
    if (!session) return { error: "Unauthorized" };

    const user = await ctx.db
      .query("adminUsers")
      .withIndex("by_username", (q) => q.eq("username", session.username))
      .unique();
    if (!user) return { error: "User not found" };

    // Verify current password
    const currentHash = await hashPassword(args.currentPassword, user.salt);
    if (currentHash !== user.passwordHash) return { error: "Current password is incorrect" };

    // Set new password
    const salt = randomHex(16);
    const passwordHash = await hashPassword(args.newPassword, salt);
    await ctx.db.patch(user._id, { passwordHash, salt });

    return { ok: true };
  },
});

export const updateUser = mutation({
  args: {
    token: v.string(),
    userId: v.id("adminUsers"),
    username: v.optional(v.string()),
    password: v.optional(v.string()),
    isSuperAdmin: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const session = await validateSession(ctx, args.token);
    if (!session) return { error: "Unauthorized" };
    if (!session.isSuperAdmin) return { error: "Only super admins can manage users" };

    const existing = await ctx.db.get(args.userId);
    if (!existing) return { error: "User not found" };

    const patch: Record<string, any> = {};

    if (args.username !== undefined && args.username !== existing.username) {
      // Check for duplicates
      const dup = await ctx.db
        .query("adminUsers")
        .withIndex("by_username", (q) => q.eq("username", args.username!))
        .unique();
      if (dup && dup._id !== args.userId) return { error: "Username already exists" };
      patch.username = args.username;
    }

    if (args.password !== undefined && args.password !== "") {
      const salt = randomHex(16);
      const passwordHash = await hashPassword(args.password, salt);
      patch.passwordHash = passwordHash;
      patch.salt = salt;
    }

    if (args.isSuperAdmin !== undefined) {
      patch.isSuperAdmin = args.isSuperAdmin;
    }

    if (Object.keys(patch).length === 0) return { ok: true };

    await ctx.db.patch(args.userId, patch);
    return { ok: true };
  },
});
