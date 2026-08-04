# results-scraper

A local-only Chrome extension that fetches the parkrun pages the Process Results
admin page needs, so results can be ingested when the Playwright scrapers are
being blocked.

It is deliberately **not** published to the Chrome Web Store — load it unpacked.

## Install

One build, two places it works: `scoopbus.run` and `localhost:3005`. Get it
whichever way suits you.

**Working on the repo:**

```bash
pnpm scraper:build      # writes dist/results-scraper
```

**Anywhere else** — download it from
[scoopbus.run/admin/process-results](https://scoopbus.run/admin/process-results)
and unzip it. Same bundles, no checkout, Node or pnpm needed.

Don't keep both installed. They're identical and both answer on both origins, so
two copies means two extensions reacting to one page and two scrapes running.
(There used to be a localhost-only dev channel to make that safe, but it left the
repo build unable to talk to the live site, which is the common case even mid
development.)

### Why there's no one-click install

Chrome removed inline installation in 2018, and a `.crx` that didn't come from
the Web Store is disabled on Windows and macOS however you deliver it. Self
hosting still helps — the download means no repo checkout, Node or pnpm — but the
last step is always **Load unpacked** by hand. (Enterprise policy can install a
self-hosted CRX properly, but that needs an MDM profile on the machine, which is
far more setup than this is worth.)

`pnpm scraper:pack` builds and writes `apps/web/public/results-scraper.zip`; the
deploy workflow runs it so the site always serves a current build.

Then in Chrome: `chrome://extensions` → enable **Developer mode** → **Load
unpacked** → pick `dist/results-scraper`.

Reload `/admin/process-results` and it switches from install instructions to a
**Start scrape** button. Clicking the toolbar icon reopens that page (or focuses
it if it's already open).

Pin the icon in Chrome's toolbar to make that a one-click route in.

## Local vs live

Nothing is baked in per environment. The admin page tells the extension what to
fetch and results go back to the tab that asked, so the same build serves
`localhost:3005` and `scoopbus.run`.

The toolbar icon is learned rather than configured: it opens the admin origin it
last talked to, preferring a Process Results tab that's already open, and assumes
production before it has ever seen one. Loading either admin page is enough to
switch it — the page announces itself on load. Only the bridge's messages count
here, so a scrape doesn't teach the icon parkrun's origin.

During development, `pnpm scraper:watch` rebuilds on change. Chrome needs the
extension reloaded (the ⟳ button on `chrome://extensions`) to pick up service
worker changes; content script changes only need a page reload.

## Testing without parkrun

parkrun blocks automated requests, so end-to-end runs are driven against the
saved pages in `temp/` served over HTTP. Point the extension at them by adding
the origin at build time:

```bash
SCRAPER_EXTRA_ORIGINS='http://localhost:8099/*' pnpm scraper:build
```

The same variable covers running the admin app on a port other than 3005.
Rebuild without it before real use, so the extension asks for no more access
than it needs.

## How it works

The admin page owns all the knowledge. When you press the button it sends a work
list — every URL to visit, keyed to a form field — plus the event IDs that
already have course maps. The extension just executes:

1. Opens a dedicated scrape tab, so the admin page keeps its state and can
   receive files as they arrive.
2. Attaches `chrome.debugger` to that tab once for the whole run and enables the
   Network domain. This is the only way an MV3 extension can read a navigation's
   **raw** response body, which matters because parkrun's cookie-consent script
   rewrites the DOM — course pages lose the Google Maps iframe entirely, so a
   DOM scrape can't find the map. Chrome shows a "being debugged" notice on that
   tab for the duration; it goes away when the run ends.
3. Navigates to each URL in turn. Every main-frame document load triggers a
   capture attempt, which is also how captchas are handled: if the response is a
   bot check, the item goes to `blocked`, and solving it navigates again, which
   captures again. No polling.
4. Parses athlete pages as they land to discover events, and queues the course
   page for any event with no map yet. The KMZ itself is fetched directly from
   Google (no navigation needed) and delivered base64-encoded.
5. Streams each captured file back to the admin page, which feeds it through the
   exact same parse-and-review path as a hand-picked upload. Nothing is
   uploaded to the backend automatically — you still press Upload.

A floating panel is injected into every visited page showing progress and a
Cancel button, since you'll be looking at the scrape tab when solving a check.

## Layout

| File | Role |
| --- | --- |
| `src/background.ts` | Service worker: message handling and run orchestration |
| `src/run.ts` | The run state machine — queue, phases, advance/finish |
| `src/capture.ts` | `chrome.debugger` session and raw-body capture |
| `src/validate.ts` | Decides if a captured page is real, blocked, or wrong |
| `src/state.ts` | Run state and captured files in `chrome.storage.local` |
| `src/keepalive.ts` | Holds the worker open for a run, so capture events aren't lost |
| `src/openAdmin.ts` | Toolbar-icon click → the Process Results page |
| `src/serial.ts` | One-at-a-time queue for anything touching run state |
| `zip.ts` | Dependency-free ZIP writer for `--pack` |
| `src/bridge.ts` | Content script on admin origins only: page ↔ worker |
| `src/overlay.ts` | Content script on parkrun/Google: the progress panel |
| `build.mts` | esbuild bundling + manifest generation |

Types shared with the web app live in `libs/shared/scraper-protocol.ts`, and the
URLs and parsers are the same modules the scripts use — nothing is duplicated.
