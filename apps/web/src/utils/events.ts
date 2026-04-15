import { createSignal } from "solid-js"
import { type EventItem, fetchEvents } from "./api"

/**
 * Cached event lookup backed by a Solid signal so that components
 * reading `getEvent` / `getEventName` re-render once events load.
 *
 * Call `loadEvents()` once at app startup (or lazily) and then use
 * `getEventName(eventId)` anywhere to resolve a display name.
 */

const [eventMap, setEventMap] = createSignal<Map<string, EventItem> | null>(null)

/** Load and cache the events list. Safe to call multiple times. */
let loading: Promise<void> | null = null
export function loadEvents(): Promise<void> {
  if (loading) return loading
  loading = fetchEvents().then((events) => {
    setEventMap(new Map(events.map((e) => [e.eventId, e])))
  })
  return loading
}

/**
 * Resolve an eventId to its display name (e.g. "haga" → "Haga").
 * Falls back to the raw eventId if events haven't loaded yet.
 */
export function getEventName(eventId: string): string {
  const name = eventMap()?.get(eventId)?.name ?? eventId
  if (name === "Bushy Park") return "Scoop Bushy Park"
  return name
}

/** Get the full EventItem for an eventId. */
export function getEvent(eventId: string): EventItem | undefined {
  return eventMap()?.get(eventId)
}
