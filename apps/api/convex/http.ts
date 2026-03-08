import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

const http = httpRouter();

// --- CORS helpers ---

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
      });

      if (Array.isArray(runResults)) {
        for (const result of runResults) {
          await ctx.runMutation(internal.parkrun.storeRunResult, {
            parkrunId,
            eventName: result.eventName,
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

    return jsonResponse({ status: "ok", athletesStored: stored });
  }),
});

// --- CORS preflight for all API routes ---

for (const path of [
  "/api/runners",
  "/api/runner",
  "/api/runner/runs",
  "/api/results",
  "/api/ingest",
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
