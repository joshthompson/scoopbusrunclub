# Web push notifications

How the club sends notifications to a member's phone or desktop, what you have
to set up once, and what fires when.

---

## What you need to set up

### 1. Generate the VAPID keypair

VAPID is how the push services (Google's, Apple's, Mozilla's) know a message
really came from us. The keypair is ours and we generate it ourselves — there's
no account to make and nothing to pay for:

```bash
npx web-push generate-vapid-keys
```

That prints a public key and a private key.

### 2. Put them on the Convex deployment

Convex dashboard → your deployment → **Settings** → **Environment Variables**:

| Variable | Value |
| --- | --- |
| `VAPID_PUBLIC_KEY` | the public key |
| `VAPID_PRIVATE_KEY` | the private key |
| `VAPID_SUBJECT` | a contact address, e.g. `mailto:josh@soundtrack.io` |

Set these on **production**, and on your dev deployment too if you want to test
there. Nothing needs adding to GitHub secrets and nothing needs adding to the
web build: the site fetches the public key from
`GET /api/notifications/vapid-public-key`, so the key lives in one place and
rotating it doesn't need a rebuild.

**Never commit the private key.** It is the only thing that authenticates us to
the push services. If it leaks, generate a new pair and replace both — but note
that changing the *public* key invalidates every existing subscription, so
everyone would have to turn notifications on again.

#### Does `VAPID_SUBJECT` make the address public?

No. It is sent in the `sub` claim of the signed token that goes with each push
request, which travels from Convex to the push service and no further. It is not
in the web bundle, not in any API response (the site only ever fetches the
public key), not in this repo, and it is never delivered to the people receiving
the notifications.

Who can read it is Google, Apple and Mozilla, who run the push services — the
token is signed rather than encrypted. That is what it's for: it's how they
reach the operator if the club's notifications start malfunctioning or get
flagged. So it should be an address somebody actually reads. If Apple quietly
stops delivering to the iPhones one day, that address is how we'd hear about it.

A role address on our own domain works just as well as a personal one. RFC 8292
also permits an `https:` URL in place of the `mailto:`, so `https://scoopbus.run`
is spec-valid — but `mailto:` is the better-trodden path and Apple's
implementation is the fussy one, so prefer it unless there's a reason not to.

### 3. Seed the history — worth doing once, after deploying

The backend keeps a record of which notifications have already gone out, so
nothing is sent twice. On a fresh deployment that record is empty, and
everything the club has ever done is technically unannounced.

`notificationTriggers:seedHistory` writes all of that down without sending any
of it, and reports `{ seeded, considered }` — around 950 keys as things stand.

Deploy the backend first — pushing to `main` runs `.github/workflows/deploy.yml`,
which deploys web and backend together. Once that's green:

```bash
cd apps/api
npx convex run --prod notificationTriggers:seedHistory
```

Or from the Convex dashboard → **Functions** → `notificationTriggers` →
`seedHistory` → **Run**. It needs no VAPID keys, because it sends nothing.

> **Don't add `--push` to that command.** `--push` deploys your working tree to
> the target deployment, so `--push --prod` would ship whatever is on your disk
> — uncommitted work included — straight to production, bypassing the GitHub
> Actions deploy. Prod would then be running code that isn't in `main`, and the
> next real deploy would quietly overwrite it. Nothing in the CLI stops you, so
> it's worth remembering.
>
> On your **dev** deployment `--push` is exactly right, because deploying the
> working tree is the point — `npx convex run --push notificationTriggers:seedHistory`
> pushes and runs in one step, which is the quickest way to rehearse the whole
> flow before it reaches main.

**How much it actually protects you:** less than it sounds, because the 14-day
rule below is the real guard. Even in the worst case — the whole `runResults`
table reinserted with an empty dedupe record — only the results from the last
fortnight can notify, which is about five notifications, not nine hundred. So
skipping this isn't a disaster.

Where it does earn its keep is a bulk insert of *recent* results: adding a new
member pulls in their entire parkrun history at once, and the handful of their
runs inside the 14-day window would otherwise be announced as if they'd just
happened. Run it once after deploying and that can't occur.

Running it again later only ever adds keys that aren't already there, but it
would also silence anything genuinely new at that moment — so once is enough.

---

## Which platforms actually work

| Platform | Works? |
| --- | --- |
| Desktop Chrome / Edge / Firefox / Safari | ✅ in the browser |
| Android Chrome | ✅ in the browser |
| iOS Safari — ordinary tab | ❌ |
| iOS Chrome | ❌ |
| **iOS, added to the Home Screen from Safari** | ✅ iOS 16.4+ |

This is an Apple restriction, not something we can work around: on iOS, push is
only delivered to a web app that has been installed to the Home Screen, and only
Safari can install it properly. `/notifications` detects an iOS browser tab and
shows the Add to Home Screen steps instead of a checkbox that couldn't work.

Because of this, `apps/web/index.html` links `site.webmanifest` and the manifest
declares `display: standalone` — both are required for the install to behave as
an app rather than a bookmark.

---

## What gets sent

All the wording lives in one file, `libs/shared/notifications/messages.ts`.
Change it there and both the sender and the record of what was sent stay in
step.

| When | Title | Body |
| --- | --- | --- |
| Results ingested | New Scoop Bus Results | *N* new results are available |
| A milestone run | New Milestone! | {Name} has now completed {N} parkruns! |
| An overall PB | PB Alert! | {Name} just got a new PB - {time}! |
| A course PB that isn't an overall PB | Course PB Alert! | {Name} just got a new {course} PB - {time}! |
| We top the Swedish table | Largest Club in Sweden! | Scoop Bus Run Club now has {N} parkruns which is the most of any club in Sweden! |
| A journey waypoint passed | The Scoop Bus is in {Place}! | Scoop Bus Run Club has now collectively ran {N}km which is the distance of Stockholm to {Place}! |
| 9am on a major race day | {Event name} | Today {names} will be running {event name} |
| 9am on 1 December | Scoop Bus Wrapped is here! | Check out this year's stats |
| The Test Notification button | Scoop Bus Test Notification! | If you can see this notifications are working! |

Every one uses the web app's own icon.

### What triggers them

**Results, PBs, milestones and journey waypoints** fire after results land,
whichever way they arrive — the Saturday scraper (`POST /api/ingest`) or the
admin Process Results page (`POST /api/admin/manual-ingest`). The ingest records
which results it actually *created*, and only those can produce a notification;
re-scraping rewrites existing rows and says nothing.

**Largest club** fires after a largest-clubs snapshot is ingested, and only the
first time we're clearly ahead of everyone. Holding the lead week after week
doesn't buzz anybody.

**Major race days and Wrapped** come from an hourly cron
(`notificationSchedule:hourlyTick`). Convex crons run in UTC and 9am Swedish
time moves against UTC twice a year, so the cron ticks every hour and the
function decides whether it's nine o'clock in Stockholm. That survives both
clock changes without an offset written down anywhere.

### Two guards worth knowing about

**Old results never notify.** Only results dated within the last 14 days can
produce a notification, so a backfill or a re-scrape of history stays silent no
matter how many rows it inserts.

**Nothing sends twice.** Every notification claims a key in the
`sentNotifications` table before it goes out, and a key that's already taken is
dropped. That's what makes it safe for both ingest routes to fire, and safe to
re-upload the same Saturday.

One consequence: the results notification is keyed on the *date of the results*,
not the upload. If you hand-upload a Saturday in several chunks from the admin
page, the first chunk announces the day and the rest are silent — so the count
can be lower than the eventual total. The Saturday scraper sends everything in
one request, so its count is always right.

---

## The admin page

`/admin/notifications`, in the admin nav. Any admin can read it; only
super-admins can send, because a push reaches every subscribed device and can't
be recalled.

**Sent** lists what has gone out, newest first, with the wording as it appeared
and how many devices took it. A dash instead of a number means the send is still
in flight — refresh in a moment. The rows `seedHistory` wrote are left out: they
exist to stop a notification being sent, not because one was.

**Send a Notification** composes one by hand: a title, a message, and an
optional link. The link must be a path on the site (`/calendar`), not a full
URL — a text box that could point the club's phones at any website is not a
thing worth having.

Three things about sending:

- **Send to me only** pushes the draft to the browser you're sitting at, so you
  can read it on a real lock screen before anyone else does. It needs that
  browser to have notifications turned on at `/notifications` first.
- **Send to everyone** asks for confirmation, and tells you how many devices
  it's about to reach. Editing the message after confirming resets it.
- **Send later** turns it into a scheduled send. Convex handles the timing, so
  it goes out at the minute you asked for rather than waiting on the hourly
  cron. Scheduled sends appear under **Scheduled** and can be cancelled right up
  until they fire.

Custom notifications are deduplicated like everything else — keyed on the row
they came from — so a double-tapped Send, or a scheduled job that retries, sends
once.

---

## Where the code lives

Kept apart from the rest of the app, as much as it can be.

| Path | What it is |
| --- | --- |
| `libs/shared/notifications/messages.ts` | Every notification's wording and dedupe key |
| `libs/shared/notifications/types.ts` | The payload shape the service worker reads |
| `apps/api/convex/notifications.ts` | Subscriptions, and the record of what's been sent |
| `apps/api/convex/notificationsSend.ts` | The actual sending. The only `"use node"` file in the backend, because `web-push` needs Node |
| `apps/api/convex/notificationTriggers.ts` | Works out what to send after results land |
| `apps/api/convex/notificationSchedule.ts` | The 9am notifications and the Stockholm clock |
| `apps/api/convex/customNotifications.ts` | Notifications written by hand, and their scheduling |
| `apps/web/src/pages/admin/NotificationsPage.tsx` | The admin page |
| `apps/web/src/notifications/push.ts` | All of the site's contact with the browser Push API |
| `apps/web/src/notifications/NotificationsPage.tsx` | The `/notifications` page |
| `apps/web/public/sw.js` | The service worker. Shows the notification and handles the tap — no caching, deliberately |

Two pieces of logic are shared rather than duplicated, so a notification and the
website can't disagree about the same result: `libs/shared/results/pb.ts` (what
counts as a PB) and `buildMilestoneMap` in
`libs/shared/calendar/milestones.ts` (which run was the 100th).

---

## Checking it works

1. Open `/notifications` in desktop Chrome, tick **Yes please!**, **Save
   changes**. The browser asks permission.
2. **Test Notification** should arrive within a second or two. Tapping it should
   focus the tab you already have open rather than opening a second one.
3. The Convex dashboard's `pushSubscriptions` table should have a row. Untick
   and save, and it should be gone.
4. For the results notifications, re-post a payload with recent dates to
   `/api/admin/manual-ingest` and check the counts and names. Post the identical
   payload again — nothing should fire the second time.
5. On iOS you have to use a real device: deploy, open the site in **Safari**,
   Share → **Add to Home Screen**, open it from the Home Screen, then enable.

### If nothing arrives

- **The logs.** Convex dashboard → Logs. `notificationsSend` logs how many were
  delivered, failed, and were dropped as dead on every send.
- **"Push is not configured"** means the `VAPID_*` variables aren't set on that
  deployment.
- **Nothing in the logs at all** after an ingest usually means the results were
  older than 14 days, or their dedupe keys had already been claimed — both are
  the guards above doing their job.
- **Subscribed but silent on iOS** is almost always the app being opened from
  Safari rather than from the Home Screen icon.

Dead subscriptions clean themselves up: a push service replying 404 or 410 means
the browser is gone for good and the row is deleted.
