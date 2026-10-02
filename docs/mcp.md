# The Scoop Bus MCP server

How to ask an AI assistant (Claude, ChatGPT, ...) about the club's data, and
how that data is kept out of the database.

---

## Connecting

The server is a plain URL on the Convex site, with no login. Everything it
serves is already public on scoopbus.run.

| Deployment | URL |
| --- | --- |
| Production | `https://effervescent-jellyfish-751.convex.site/api/mcp` |
| Dev | `https://charming-yak-976.eu-west-1.convex.site/api/mcp` |

- **claude.ai** (web, desktop and mobile): Settings → Connectors → **Add custom
  connector**, then paste the URL. Leave the authentication settings empty.
- **Claude Code**: `claude mcp add --transport http scoopbus <url>`
- **Trying it out**: `npx @modelcontextprotocol/inspector`, set the transport to
  Streamable HTTP, and paste the URL.

Then ask things like "how did everyone do at parkrun on Saturday?", "what's
Keith's Haga PB?" or "who's coming to Track and Food next week?".

## What it offers

The tools are in `apps/api/convex/mcp/tools.ts`. Each one answers one kind of
question with compact JSON, so the model never has to read the whole history:

| Tool | For |
| --- | --- |
| `get_club_overview` | Every member's totals, latest run, fastest 5k and next milestone |
| `get_member` | One member: PBs per course, recent runs, volunteering, events |
| `search_results` | Results filtered by member, parkrun and dates, sorted any way |
| `get_parkrun_day` | Who ran and volunteered on a day (defaults to the latest) |
| `list_parkruns` / `get_parkrun` | Where the club has been, and its history at one parkrun |
| `get_leaderboard` | Members ranked by runs, fastest time, parkruns visited, volunteering or age grade |
| `get_calendar` | The calendar page: events, birthdays, milestones (defaults to the next 30 days) |
| `list_our_events` | The club's own events and races, with who's going and their results |

The raw JSON files are offered too, as resources (`scoopbus://data/results.json`
and so on), for clients that want them.

## Keeping it off the database

The Convex project shares its database bandwidth with a hungrier one, so
neither the MCP server nor the website reads the tables when it serves data.
Both read **JSON snapshots** kept in Convex file storage instead
(`apps/api/convex/snapshots.ts`):

| File | Rebuilt when |
| --- | --- |
| `members.json`, `results.json`, `volunteers.json`, `parkruns.json` | parkrun data is ingested |
| `our-events.json` | a race or event is added, edited or deleted |
| `guests.json`, `guest-results.json` | guests change, or parkrun data is ingested |

Each file is exactly what the matching `/api/*` route has always returned.
Serving one costs a single small `appData` read.

**Rebuilds wait for things to go quiet.** Every write bumps one of the data
timestamps (`parkrunDataUpdatedAt` and so on), and every bump pushes the rebuild
back. Uploading sixteen athletes one after another therefore rebuilds the files
once, **about two minutes after the last upload**. Races and guests wait about
ten seconds. Until then the site and the MCP server show the previous data.
`/api/cache-version` only moves once the new files are live, so browsers never
cache the old data under the new version.

An hourly cron (`snapshot check`) rebuilds anything that has never been built
or has fallen behind, for example after a failed rebuild. To rebuild by hand:

```bash
cd apps/api
npx convex run snapshots:rebuildStale            # whatever is out of date
npx convex run snapshots:rebuild '{"group":"parkrun"}'   # or one group: parkrun, scoopBus, guest
```

**If you change the shape of a file** (what one of those routes returns),
bump `SNAPSHOT_FORMAT_VERSION` in `snapshots.ts`. The next hourly check then
rebuilds every file in the new shape.
