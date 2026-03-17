import { type EventItem, fetchEvents } from "./api"

/**
 * Cached event lookup.
 *
 * Call `loadEvents()` once at app startup (or lazily) and then use
 * `getEventName(eventId)` anywhere to resolve a display name.
 */

let eventMap: Map<string, EventItem> | null = null

/** Load and cache the events list. Safe to call multiple times. */
export async function loadEvents(): Promise<void> {
  if (eventMap) return
  const events = await fetchEvents()
  eventMap = new Map(events.map((e) => [e.eventId, e]))
}

/**
 * Resolve an eventId to its display name (e.g. "haga" → "Haga").
 * Falls back to the raw eventId if events haven't loaded yet.
 */
export function getEventName(eventId: string): string {
  return eventMap?.get(eventId)?.name ?? eventId
}

/** Get the full EventItem for an eventId. */
export function getEvent(eventId: string): EventItem | undefined {
  return eventMap?.get(eventId)
}
