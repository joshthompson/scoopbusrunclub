import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

const http = httpRouter();

// --- CORS helpers ---

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

// --- CORS preflight ---

http.route({
  path: "/.well-known/cors-preflight",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

// --- GET /api/runners ---

http.route({
  path: "/api/runners",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const runners = await ctx.runQuery(api.queries.getAllRunners);
    return jsonResponse(runners);
  }),
});

// --- GET /api/runners/:id ---
// Convex httpRouter doesn't support path params, so we use a query param instead:
// GET /api/runner?id=<parkrunId>

http.route({
  path: "/api/runner",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const parkrunId = url.searchParams.get("id");

    if (!parkrunId) {
      return jsonResponse({ error: "Missing 'id' query parameter" }, 400);
    }

    const runner = await ctx.runQuery(api.queries.getRunner, { parkrunId });

    if (!runner) {
      return jsonResponse({ error: "Runner not found" }, 404);
    }

    return jsonResponse(runner);
  }),
});

// --- GET /api/runner/runs?id=<parkrunId> ---

http.route({
  path: "/api/runner/runs",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const parkrunId = url.searchParams.get("id");

    if (!parkrunId) {
      return jsonResponse({ error: "Missing 'id' query parameter" }, 400);
    }

    const results = await ctx.runQuery(api.queries.getRunResults, {
      parkrunId,
    });
    return jsonResponse(results);
  }),
});

// --- GET /api/results?since=YYYY-MM-DD ---
// `since` is optional; omitting it returns all results.

http.route({
  path: "/api/results",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const sinceDate = url.searchParams.get("since") ?? "0000-00-00";

    const results = await ctx.runQuery(api.queries.getRecentResults, {
      sinceDate,
    });
    return jsonResponse(results);
  }),
});

// --- GET /api/events ---

http.route({
  path: "/api/events",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const events = await ctx.runQuery(api.queries.getAllEvents);
    return jsonResponse(events);
  }),
});

// --- GET /api/volunteers ---

http.route({
  path: "/api/volunteers",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const volunteers = await ctx.runQuery(api.queries.getAllVolunteers);
    return jsonResponse(volunteers);
  }),
});

// --- POST /api/ingest ---
// Receives pre-parsed athlete data from the GitHub Actions Playwright scraper.
// Protected by a shared secret in the Authorization header.

http.route({
  path: "/api/ingest",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Verify shared secret
    const authHeader = request.headers.get("Authorization");
    const expectedSecret = process.env.INGEST_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await request.json();
    const athletes = body?.athletes;
    const events = body?.events;

    if (!Array.isArray(athletes)) {
      return jsonResponse({ error: "Invalid payload: expected { athletes: [...] }" }, 400);
    }

    let stored = 0;

    for (const athlete of athletes) {
      const { parkrunId, runner, runResults } = athlete;

      if (!parkrunId || !runner) continue;

      await ctx.runMutation(internal.parkrun.storeRunnerData, {
        parkrunId,
        name: runner.name,
        totalRuns: runner.totalRuns,
        totalJuniorRuns: runner.totalJuniorRuns ?? 0,
      });

      if (Array.isArray(runResults)) {
        for (const result of runResults) {
          await ctx.runMutation(internal.parkrun.storeRunResult, {
            parkrunId,
            event: result.event,
            eventNumber: result.eventNumber,
            position: result.position,
            time: result.time,
            ageGrade: result.ageGrade,
            date: result.date,
          });
        }
      }

      stored++;
    }

    // Store events (deduplicated by eventId in the mutation)
    let eventsStored = 0;
    if (Array.isArray(events)) {
      for (const event of events) {
        if (!event.eventId || !event.name || !event.url || !event.country) continue;
        await ctx.runMutation(internal.parkrun.storeEvent, {
          eventId: event.eventId,
          name: event.name,
          url: event.url,
          country: event.country,
        });
        eventsStored++;
      }
    }

    // Store app data (key/value pairs)
    const appData = body?.appData;
    if (appData && typeof appData === "object") {
      for (const [key, value] of Object.entries(appData)) {
        if (typeof key === "string" && typeof value === "string") {
          await ctx.runMutation(internal.parkrun.setAppData, { key, value });
        }
      }
    }

    return jsonResponse({ status: "ok", athletesStored: stored, eventsStored });
  }),
});

// --- POST /api/ingest-volunteers ---
// Receives volunteer data scraped from Haga parkrun event pages.
// Protected by a shared secret in the Authorization header.

http.route({
  path: "/api/ingest-volunteers",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("Authorization");
    const expectedSecret = process.env.INGEST_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await request.json();
    const volunteers = body?.volunteers;

    if (!Array.isArray(volunteers)) {
      return jsonResponse({ error: "Invalid payload: expected { volunteers: [...] }" }, 400);
    }

    let stored = 0;
    for (const vol of volunteers) {
      if (!vol.parkrunId || !vol.event || !vol.eventNumber || !vol.date || !Array.isArray(vol.roles)) continue;
      await ctx.runMutation(internal.parkrun.storeVolunteer, {
        parkrunId: vol.parkrunId,
        event: vol.event,
        eventNumber: vol.eventNumber,
        date: vol.date,
        roles: vol.roles,
      });
      stored++;
    }

    // Store app data (key/value pairs)
    const appData = body?.appData;
    if (appData && typeof appData === "object") {
      for (const [key, value] of Object.entries(appData)) {
        if (typeof key === "string" && typeof value === "string") {
          await ctx.runMutation(internal.parkrun.setAppData, { key, value });
        }
      }
    }

    return jsonResponse({ status: "ok", volunteersStored: stored });
  }),
});

// --- GET /api/app-data?key=... ---
// Protected by INGEST_SECRET. Returns the value for a given key from the appData table.

http.route({
  path: "/api/app-data",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("Authorization");
    const expectedSecret = process.env.INGEST_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const url = new URL(request.url);
    const key = url.searchParams.get("key");

    if (!key) {
      return jsonResponse({ error: "Missing 'key' query parameter" }, 400);
    }

    const value = await ctx.runQuery(internal.parkrun.getAppData, { key });
    return jsonResponse({ key, value });
  }),
});

// --- Admin: POST /api/admin/login ---

http.route({
  path: "/api/admin/login",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const result = await ctx.runMutation(api.auth.login, {
      username: body.username ?? "",
      password: body.password ?? "",
    });
    if ("error" in result) {
      return jsonResponse({ error: result.error }, 401);
    }
    return jsonResponse(result);
  }),
});

// --- Admin: POST /api/admin/logout ---

http.route({
  path: "/api/admin/logout",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    await ctx.runMutation(api.auth.logout, { token: body.token ?? "" });
    return jsonResponse({ ok: true });
  }),
});

// --- Admin: GET /api/admin/validate ---

http.route({
  path: "/api/admin/validate",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const token = url.searchParams.get("token") ?? "";
    const result = await ctx.runQuery(api.auth.validateToken, { token });
    if (!result) return jsonResponse({ error: "Invalid token" }, 401);
    return jsonResponse(result);
  }),
});

// --- Admin: GET /api/admin/users ---

http.route({
  path: "/api/admin/users",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const token = url.searchParams.get("token") ?? "";
    const users = await ctx.runQuery(api.auth.listUsers, { token });
    return jsonResponse(users);
  }),
});

// --- Admin: POST /api/admin/users ---

http.route({
  path: "/api/admin/users",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const result = await ctx.runMutation(api.auth.createUser, {
      token: body.token ?? "",
      username: body.username ?? "",
      password: body.password ?? "",
      isSuperAdmin: body.isSuperAdmin ?? false,
    });
    if ("error" in result) {
      return jsonResponse({ error: result.error }, 400);
    }
    return jsonResponse(result);
  }),
});

// --- Admin: PUT /api/admin/users ---

http.route({
  path: "/api/admin/users",
  method: "PUT",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const result = await ctx.runMutation(api.auth.updateUser, {
      token: body.token ?? "",
      userId: body.userId ?? "",
      username: body.username,
      password: body.password,
      isSuperAdmin: body.isSuperAdmin,
    });
    if ("error" in result) {
      return jsonResponse({ error: result.error }, 400);
    }
    return jsonResponse(result);
  }),
});

// --- Admin: POST /api/admin/account/password ---

http.route({
  path: "/api/admin/account/password",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const result = await ctx.runMutation(api.auth.changePassword, {
      token: body.token ?? "",
      currentPassword: body.currentPassword ?? "",
      newPassword: body.newPassword ?? "",
    });
    if ("error" in result) {
      return jsonResponse({ error: result.error }, 400);
    }
    return jsonResponse(result);
  }),
});

// --- GET /api/races (public) ---

http.route({
  path: "/api/races",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const races = await ctx.runQuery(api.races.listPublic);
    return jsonResponse(races);
  }),
});

// --- Admin: GET /api/admin/races ---

http.route({
  path: "/api/admin/races",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const token = url.searchParams.get("token") ?? "";
    const includeOld = url.searchParams.get("includeOld") === "true";
    const races = await ctx.runQuery(api.races.list, { token, includeOld });
    return jsonResponse(races);
  }),
});

// --- Admin: POST /api/admin/races ---

http.route({
  path: "/api/admin/races",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const result = await ctx.runMutation(api.races.create, {
      token: body.token ?? "",
      date: body.date ?? "",
      name: body.name ?? "",
      website: body.website,
      type: body.type,
      attendees: body.attendees ?? [],
      majorEvent: body.majorEvent,
      public: body.public ?? true,
    });
    if ("error" in result) {
      return jsonResponse({ error: result.error }, 400);
    }
    return jsonResponse(result);
  }),
});

// --- Admin: PUT /api/admin/races ---

http.route({
  path: "/api/admin/races",
  method: "PUT",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const result = await ctx.runMutation(api.races.update, {
      token: body.token ?? "",
      raceId: body.raceId ?? "",
      date: body.date,
      name: body.name,
      website: body.website,
      type: body.type,
      attendees: body.attendees,
      majorEvent: body.majorEvent,
      public: body.public,
    });
    if ("error" in result) {
      return jsonResponse({ error: result.error }, 400);
    }
    return jsonResponse(result);
  }),
});

// --- Admin: DELETE /api/admin/races ---

http.route({
  path: "/api/admin/races",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const token = url.searchParams.get("token") ?? "";
    const raceId = url.searchParams.get("id") ?? "";
    const result = await ctx.runMutation(api.races.remove, {
      token,
      raceId: raceId as any,
    });
    if ("error" in result) {
      return jsonResponse({ error: result.error }, 400);
    }
    return jsonResponse(result);
  }),
});

// --- Admin: GET /api/admin/races/today ---

http.route({
  path: "/api/admin/races/today",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const token = url.searchParams.get("token") ?? "";
    const races = await ctx.runQuery(api.races.getToday, { token });
    return jsonResponse(races);
  }),
});

// --- CORS preflight for all API routes ---

for (const path of [
  "/api/runners",
  "/api/runner",
  "/api/runner/runs",
  "/api/results",
  "/api/events",
  "/api/races",
  "/api/ingest",
  "/api/ingest-volunteers",
  "/api/app-data",
  "/api/admin/login",
  "/api/admin/logout",
  "/api/admin/validate",
  "/api/admin/users",
  "/api/admin/account/password",
  "/api/admin/races",
  "/api/admin/races/today",
  "/api/volunteers",
]) {
  http.route({
    path,
    method: "OPTIONS",
    handler: httpAction(async () => {
      return new Response(null, { status: 204, headers: corsHeaders });
    }),
  });
}

export default http;
