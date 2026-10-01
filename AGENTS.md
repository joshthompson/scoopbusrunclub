# Analytics Tracking — Mixpanel

The website (`apps/web`) uses **Mixpanel** for all product analytics. Don't introduce any other analytics tools, SDKs or tracking libraries without explicit instruction. The game (`apps/game`) and the results-scraper extension aren't tracked.

---

## Before You Add or Modify Any Tracking

⛔ **Do not write Mixpanel tracking code without reading this file first.**

### Mandatory checklist before writing any Mixpanel code

- [ ] Go through `@/utils/analytics` — never import `mixpanel-browser` in a feature file
- [ ] No CDP: events go straight to Mixpanel from the browser
- [ ] Tracking is **anonymous and stores nothing on the device**. That's how the site gets by without a consent banner for its (mostly Swedish, so EU) visitors. Don't enable anything that writes to cookies, localStorage, sessionStorage or IndexedDB, and don't identify anyone, without asking first. Either change would need a consent banner.
- [ ] Review the tracking plan below before adding new events

---

## Tech Stack

| Detail | Value |
|---|---|
| **Platform** | SolidJS SPA (Vite, `@solidjs/router`) on GitHub Pages at scoopbus.run |
| **Mixpanel SDK** | `mixpanel-browser`, core build (`mixpanel-browser/src/loaders/loader-module-core`, no session replay) |
| **SDK version** | ^2.83.0 |
| **Tracking method** | client-side |
| **CDP (if any)** | none |
| **Consent required** | No banner. Nothing is stored and nobody is identified (see checklist). This was the owner's choice, not a legal review. |
| **Mixpanel project token location** | `.github/workflows/deploy-web.yml` → `VITE_MIXPANEL_TOKEN` (build-time env). It's unset locally, so dev builds leave Mixpanel out entirely. |

---

## Mixpanel Initialization

**File:** `apps/web/src/utils/analytics.ts`. `initAnalytics()` is called once from `apps/web/src/index.tsx`, after render. The SDK is a dynamic import, so it's its own ~36 KB gzip chunk and never blocks the page.

```ts
mixpanel.init(MIXPANEL_TOKEN, {
	debug: import.meta.env.DEV,
	track_pageview: 'url-with-path', // page view on load and every route change
	disable_persistence: true,       // distinct id in memory only: no cookie, no localStorage
	batch_requests: false,           // the batch queue lives in localStorage even with persistence off
	ip: false,                       // no geolocating visitors from their IP
})
```

**Do not:**
- Initialize Mixpanel anywhere else, or create more instances
- Import `mixpanel-browser` in feature files. Use `track()` from `@/utils/analytics`.
- Import the default `mixpanel-browser` entry. It bundles session replay (~130 KB gzip against ~36 KB).
- Turn on `batch_requests`, persistence, `autocapture` or session recording without re-checking that nothing gets stored on the device

---

## Mixpanel Identity

**None, on purpose.** Each page load is a new anonymous visitor with an in-memory `$device:` id, which stays the same across in-app route changes. The site has no public accounts. The admin login (`components/admin/AuthGuard.tsx`) isn't identified either.

- Don't call `mixpanel.identify()`, `mixpanel.reset()`, `mixpanel.alias()` or `mixpanel.people.*`
- Don't register super properties that identify a visitor

---

## Mixpanel Tracking Plan

### Naming conventions

- Mixpanel event names: `snake_case`, object + past-tense verb (e.g. `calendar_subscribed`, `custom_racer_created`)
- Mixpanel property names: `snake_case` (e.g. `subscribe_method`, `racer_speed`)
- No abbreviations in Mixpanel event or property names
- Boolean Mixpanel properties: use the `is_` prefix (e.g. `is_first_time`)
- Never use `$` or `mp_` prefixes. Those are reserved for Mixpanel's own events and properties.
- Never build event names at runtime. Put the variable part in a property.

### Current Mixpanel events

| Mixpanel Event | Trigger | Key Properties | File |
|---|---|---|---|
| `$mp_web_page_view` (automatic) | First load, then every change of route path (query-string-only changes don't count) | `current_url_path`, `current_page_title`, `current_url_search`, `$current_url`, UTM params | `apps/web/src/utils/analytics.ts` (`track_pageview`) |
| `link_clicked` | Any `<a href>` clicked or middle-clicked, site-wide, from one capture-phase listener. Off-site links go by beacon. | `link_url` (path if internal, full URL if external, scheme only for `mailto:`/`tel:`), `link_text`, `link_area` (`header`, `mobile_navigation`, `page`, from `data-link-area`), `is_external` | `apps/web/src/utils/analytics.ts` |
| `header_runner_clicked` | A runner in the header canvas is clicked | `runner_type` (`member`, `guest`, `custom_racer`), `member_name` (members only; custom racer names are free text) | `components/header/ScoopBusHeader.tsx` |
| `header_background_clicked` | The header is clicked away from any runner (goes home) | none | `components/header/ScoopBusHeader.tsx` |
| `mobile_menu_opened` | The mobile nav's "more pages" menu is opened | none | `components/MobileNav.tsx` |
| `custom_racer_created` | A custom racer is saved (after the API succeeds) | `racer_speed` | `pages/CustomRacerAddPage.tsx` |
| `replay_played` | Play is pressed on a 2D replay | `parkrun_event`, `parkrun_event_number`, `replay_speed`, `is_restart`, `is_from_start` | `pages/ReplayPage.tsx` |
| `replay_finished` | A 2D replay plays to the last finisher | `parkrun_event`, `parkrun_event_number`, `replay_speed` | `pages/ReplayPage.tsx` |
| `replay_view_changed` | The 2D / 3D toggle is switched | `parkrun_event`, `parkrun_event_number`, `replay_view` (`2d`, `3d`) | `pages/ReplayPage.tsx` |
| `replay_speed_changed` | A replay speed button is pressed | `parkrun_event`, `parkrun_event_number`, `replay_speed` | `pages/ReplayPage.tsx` |
| `replay_scrubbed` | The replay slider is let go after dragging | `parkrun_event`, `parkrun_event_number` | `pages/ReplayPage.tsx` |
| `replay_fullscreen_entered` | The 3D replay is made fullscreen | `parkrun_event`, `parkrun_event_number` | `pages/ReplayPage.tsx` |
| `calendar_subscribe_opened` | The Subscribe modal is opened | none | `components/CalendarSubscribe.tsx` |
| `calendar_subscribed` | Apple or Google is picked (on click: the calendar app's answer isn't visible), or the link is copied | `subscribe_method` (`apple`, `google`, `copy`), `is_with_results` | `components/CalendarSubscribe.tsx` |
| `calendar_month_changed` | Previous / next / this month on the calendar page | `month_change` (`previous`, `next`, `today`) | `pages/CalendarPage.tsx` |
| `notifications_enabled` / `notifications_disabled` | Notification settings are saved | none | `notifications/NotificationsPage.tsx` |
| `test_notification_sent` | A test notification is sent successfully | none | `notifications/NotificationsPage.tsx` |
| `furbies_released` | A furby button lets the furbies out | none | `components/FurbyButton.tsx` |
| `list_expanded` | A "show all" / "+N more" list is opened | `list_name` (`latest_results`, `member_celebration`, `poker_hand`, `stopwatch_bingo`, `position_bingo`, `alphabet`, `sweden`) | `components/LatestResults.tsx`, `pages/MemberPage.tsx`, `pages/PokerPage.tsx`, the bingo pages |
| `graph_option_changed` | A checkbox under the member graph | `graph_option` (`personal_bests`, `course_personal_bests`, `other_celebrations`, `walks_filtered`), `is_enabled` | `components/GraphSVG.tsx` |
| `graph_club_added` / `graph_club_removed` | A club is added to or removed from the largest clubs graph | `club_name` | `components/LargestClubsGraph.tsx` |
| `graph_clubs_reset` | The largest clubs graph is reset | none | `components/LargestClubsGraph.tsx` |
| `table_sorted` | A sortable table column is clicked | `sort_column`, `sort_direction` | `components/ui/Table.tsx` |
| `connection_selected` | A pair is picked on the connections page | `first_member_name`, `second_member_name`, `selection_source` (`graph`, `table`) | `pages/ConnectionsPage.tsx` |
| `connection_member_pinned` | A member is pinned on the connections graph | `member_name` | `pages/ConnectionsPage.tsx` |
| `compare_member_added` / `compare_member_removed` | A member is added to or removed from a comparison | `member_name`, `member_count` | `pages/ComparePage.tsx` |
| `wrapped_story_finished` | The Wrapped story runs or is tapped past its last slide | `wrapped_year`, `slide_count`, `is_preview` | `pages/WrappedExplorePage.tsx` |
| `wrapped_story_closed` | The Wrapped story is closed early (✕ or Escape) | `wrapped_year`, `slide_count`, `slide_number`, `is_preview` | `pages/WrappedExplorePage.tsx` |
| `wrapped_music_toggled` | The Wrapped music button is pressed | `wrapped_year`, `slide_count`, `is_preview`, `is_muted` | `pages/WrappedExplorePage.tsx` |
| `sandbox_song_played` | A sandbox page's music is started | `sandbox_page` (`badger`, `leek_scoop`, `zombo`, `dance`) | `sandbox/*` |
| `guestbook_signed` | The ScoopDance guestbook is signed (nothing written is sent) | none | `sandbox/dance/ScoopDancePage.tsx` |
| `scoopcoin_wallet_connected` / `scoopcoin_wallet_reset` | ScoopCoin's pretend wallet is connected or reset | none | `sandbox/coin/ScoopCoinPage.tsx` |
| `scoopcoin_traded` | A ScoopCoin trade goes through | `trade_side`, `token_symbol` | `sandbox/coin/ScoopCoinPage.tsx` |
| `scoopbay_listing_viewed` | A Scoop Bay listing is opened | `listing_id` | `sandbox/scoopbay/ScoopBayPage.tsx` |
| `scoopbay_bid_placed` | A valid Scoop Bay bid is placed | `listing_id`, `bid_amount` | `sandbox/scoopbay/ScoopBayPage.tsx` |
| `sticker_downloaded` / `sticker_pack_downloaded` | A Scoopmoji sticker or a whole pack is downloaded | `sticker_name`, `sticker_pack` | `sandbox/scoopmoji/ScoopmojiPage.tsx` |

`track()` drops everything on `/admin`, so admin only gets page views even where it reuses a tracked component.

---

## How to Add a New Mixpanel Event

1. **Check the tracking plan above.** If the event already exists, use it rather than making a duplicate.
2. **Name the event** using the conventions above.
3. **Define its properties.** Only use what's at hand when the event fires. Member names are public parkrun data and fine to include. Nothing else personal.
4. **Place the call** after the action succeeds (after the API response), not on click or submit:
   ```ts
   import { track } from '@/utils/analytics'

   // Track [what happened] in Mixpanel
   track('custom_racer_created', { racer_speed: speed })
   ```
5. **Update this file** by adding the event to the table above.
6. **Verify in Mixpanel Live View.** Dev has no token, so build with one and preview:
   `VITE_MIXPANEL_TOKEN=<token> pnpm --filter @scoopbus/web build && npx vite preview --outDir apps/web/dist`.
   There's only one Mixpanel project, so test events land in the real data.

---

## What Not to Do

- **Do not introduce other analytics tools.** All tracking goes through Mixpanel.
- **Do not store anything on the device or identify visitors** (see the checklist). That would need a consent banner.
- **Do not track PII as Mixpanel properties.** No emails, phone numbers, IP addresses or free-text input.
- **Do not fire Mixpanel events inside loops or animation frames.** With batching off, every event is a network request.
- **Do not track page loads by hand.** `track_pageview` already covers every route.
