import { fetchAllResults, fetchCourseEventIds, fetchEvents } from '@/utils/api'
/**
 * The shared state behind both results pages.
 *
 * A "slot" is one expected file — a runner's history, an event's results, the
 * clubs table, a course map. Whether a file arrives from the scraper extension
 * or from someone picking it by hand, it goes through the same slot, the same
 * parser and the same guards, so the two pages can't drift in what they accept.
 */
import {
	type ManualSummary,
	type ParsedAthleteFile,
	type ParsedClubsFile,
	type ParsedCourseFile,
	type ParsedEventFile,
	buildManualSummary,
	parseAthleteFile,
	parseClubsFile,
	parseCourseFile,
	parseEventFile,
	resultKey,
} from '@/utils/manualResults'
import { capturedFileToFile } from '@/utils/scraperClient'
import { PARKRUN_EVENTS } from '@shared/parkrun-events'
import { CLUBS_KEY, type CapturedFile } from '@shared/scraper-protocol'
import { TRACKED_ATHLETES } from '@shared/tracked-athletes'
import { createMemo, createResource, createSignal } from 'solid-js'

export interface Slot<T> {
	fileName: string
	skip: boolean
	parsing: boolean
	parsed: T | null
	error: string | null
}

export type SlotMap<T> = Record<string, Slot<T>>

export function emptySlot<T>(): Slot<T> {
	return {
		fileName: '',
		skip: false,
		parsing: false,
		parsed: null,
		error: null,
	}
}

/** A slot is settled once it has either been skipped or parsed cleanly. */
export function isSlotReady<T>(slot: Slot<T> | undefined): boolean {
	if (!slot) return false
	return slot.skip || (!!slot.parsed && !slot.parsing)
}

/** A course we have results for but no map, discovered from athlete pages. */
export interface MissingCourse {
	eventId: string
	name: string
	url: string
	runners: string[]
}

export function createResultSlots() {
	// What the database already holds, so the summary can flag what's new and the
	// course hunt knows which maps are missing.
	const [existingResults] = createResource(fetchAllResults)
	const [existingEvents] = createResource(fetchEvents)
	const [existingCourseIds] = createResource(fetchCourseEventIds)

	const [athleteSlots, setAthleteSlots] = createSignal<
		SlotMap<ParsedAthleteFile>
	>({})
	const [eventSlots, setEventSlots] = createSignal<SlotMap<ParsedEventFile>>({})
	const [courseSlots, setCourseSlots] = createSignal<SlotMap<ParsedCourseFile>>(
		{},
	)
	const [clubsSlot, setClubsSlot] = createSignal<Slot<ParsedClubsFile>>(
		emptySlot(),
	)
	const [ingestAll, setIngestAll] = createSignal(false)

	const loading = () =>
		existingResults.loading ||
		existingEvents.loading ||
		existingCourseIds.loading

	const existing = createMemo(() => ({
		resultKeys: new Set(
			(existingResults() ?? []).map((r) =>
				resultKey(r.parkrunId, r.event, r.eventNumber),
			),
		),
		eventIds: new Set((existingEvents() ?? []).map((e) => e.eventId)),
		eventNames: new Map(
			(existingEvents() ?? []).map((e) => [e.eventId, e.name] as const),
		),
		courseEventIds: new Set(existingCourseIds() ?? []),
	}))

	/** Events found in parsed athlete files that have no course map stored. */
	const missingCourses = createMemo<MissingCourse[]>(() => {
		const known = existing().courseEventIds
		const found = new Map<string, MissingCourse>()

		for (const athlete of TRACKED_ATHLETES) {
			const parsed = athleteSlots()[athlete.parkrunId]?.parsed
			if (!parsed) continue

			for (const event of parsed.events) {
				if (known.has(event.eventId)) continue
				const entry = found.get(event.eventId)
				if (entry) {
					if (!entry.runners.includes(athlete.name)) {
						entry.runners.push(athlete.name)
					}
				} else {
					// The base URL comes off the athlete's own result links, so it
					// already points at the right parkrun domain for this event.
					found.set(event.eventId, {
						eventId: event.eventId,
						name: event.name,
						url: event.url,
						runners: [athlete.name],
					})
				}
			}
		}

		return [...found.values()].sort((a, b) => a.name.localeCompare(b.name))
	})

	// --- Filling slots ---

	const updateSlotMap =
		<T>(setter: (fn: (prev: SlotMap<T>) => SlotMap<T>) => void, key: string) =>
		(next: Slot<T>) =>
			setter((prev) => ({ ...prev, [key]: next }))

	/** Parse a file into its slot, recording any error on the slot itself. */
	async function fillSlot<T>(
		file: File | undefined,
		slot: Slot<T> | undefined,
		update: (next: Slot<T>) => void,
		parse: (file: File) => Promise<T>,
	): Promise<void> {
		if (!file) {
			update({ ...emptySlot<T>(), skip: slot?.skip ?? false })
			return
		}

		const base = { fileName: file.name, skip: false, parsed: null, error: null }
		update({ ...base, parsing: true })

		try {
			update({ ...base, parsing: false, parsed: await parse(file) })
		} catch (error) {
			update({
				...base,
				parsing: false,
				error: error instanceof Error ? error.message : String(error),
			})
		}
	}

	const athleteSlot = (parkrunId: string) => athleteSlots()[parkrunId]
	const eventSlot = (eventId: string) => eventSlots()[eventId]
	const courseSlot = (eventId: string) => courseSlots()[eventId]

	const setAthleteFile = (parkrunId: string, file: File | undefined) =>
		fillSlot(
			file,
			athleteSlot(parkrunId),
			updateSlotMap<ParsedAthleteFile>(setAthleteSlots, parkrunId),
			(f) => parseAthleteFile(f, parkrunId),
		)

	const setEventFile = (eventId: string, file: File | undefined) =>
		fillSlot(
			file,
			eventSlot(eventId),
			updateSlotMap<ParsedEventFile>(setEventSlots, eventId),
			(f) => parseEventFile(f, eventId),
		)

	const setCourseFile = (eventId: string, file: File | undefined) =>
		fillSlot(
			file,
			courseSlot(eventId),
			updateSlotMap<ParsedCourseFile>(setCourseSlots, eventId),
			parseCourseFile,
		)

	const setClubsFile = (file: File | undefined) =>
		fillSlot(file, clubsSlot(), setClubsSlot, parseClubsFile)

	/** Ticking Skip discards the field's contents; unticking clears the tick. */
	function skipSlot<T>(update: (next: Slot<T>) => void, skip: boolean): void {
		update(skip ? { ...emptySlot<T>(), skip: true } : emptySlot<T>())
	}

	const setAthleteSkip = (parkrunId: string, skip: boolean) =>
		skipSlot(updateSlotMap<ParsedAthleteFile>(setAthleteSlots, parkrunId), skip)
	const setEventSkip = (eventId: string, skip: boolean) =>
		skipSlot(updateSlotMap<ParsedEventFile>(setEventSlots, eventId), skip)
	const setCourseSkip = (eventId: string, skip: boolean) =>
		skipSlot(updateSlotMap<ParsedCourseFile>(setCourseSlots, eventId), skip)
	const setClubsSkip = (skip: boolean) => skipSlot(setClubsSlot, skip)

	/** Route a file delivered by the extension to the slot it belongs to. */
	function acceptCapturedFile(captured: CapturedFile): void {
		const file = capturedFileToFile(captured)
		switch (captured.kind) {
			case 'athlete':
				void setAthleteFile(captured.key, file)
				break
			case 'event':
				void setEventFile(captured.key, file)
				break
			case 'clubs':
				void setClubsFile(file)
				break
			case 'course':
				void setCourseFile(captured.key, file)
				break
		}
	}

	// --- Readiness and output ---

	/** How many slots hold a parsed file. */
	const parsedCount = createMemo(() => {
		const all = [
			...Object.values(athleteSlots()),
			...Object.values(eventSlots()),
			...Object.values(courseSlots()),
			clubsSlot(),
		]
		return all.filter((slot) => slot?.parsed).length
	})

	/** Every expected field is filled in or explicitly skipped. */
	const allReady = createMemo(() => {
		if (loading()) return false
		for (const athlete of TRACKED_ATHLETES) {
			if (!isSlotReady(athleteSlot(athlete.parkrunId))) return false
		}
		for (const event of PARKRUN_EVENTS) {
			if (!isSlotReady(eventSlot(event.eventId))) return false
		}
		if (!isSlotReady(clubsSlot())) return false
		for (const course of missingCourses()) {
			if (!isSlotReady(courseSlot(course.eventId))) return false
		}
		return true
	})

	/** Slot keys the user has ticked Skip on, for building a scrape work list. */
	const skippedKeys = createMemo(() => {
		const keys = new Set<string>()
		for (const athlete of TRACKED_ATHLETES) {
			if (athleteSlot(athlete.parkrunId)?.skip) keys.add(athlete.parkrunId)
		}
		for (const event of PARKRUN_EVENTS) {
			if (eventSlot(event.eventId)?.skip) keys.add(event.eventId)
		}
		if (clubsSlot().skip) keys.add(CLUBS_KEY)
		return keys
	})

	/** Course maps already captured, so a retry doesn't re-fetch them. */
	const capturedCourseIds = createMemo(() =>
		Object.entries(courseSlots())
			.filter(([, slot]) => slot?.parsed)
			.map(([eventId]) => eventId),
	)

	function buildSummary(): ManualSummary {
		const athletes = new Map<string, ParsedAthleteFile>()
		for (const athlete of TRACKED_ATHLETES) {
			const parsed = athleteSlot(athlete.parkrunId)?.parsed
			if (parsed) athletes.set(athlete.parkrunId, parsed)
		}

		const events = new Map<string, ParsedEventFile>()
		for (const event of PARKRUN_EVENTS) {
			const parsed = eventSlot(event.eventId)?.parsed
			if (parsed) events.set(event.eventId, parsed)
		}

		const courses = new Map<string, ParsedCourseFile>()
		for (const course of missingCourses()) {
			const parsed = courseSlot(course.eventId)?.parsed
			if (parsed) courses.set(course.eventId, parsed)
		}

		return buildManualSummary({
			athletes,
			events,
			courses,
			clubs: clubsSlot().parsed,
			ingestAll: ingestAll(),
			existing: existing(),
		})
	}

	function reset(): void {
		setAthleteSlots({})
		setEventSlots({})
		setCourseSlots({})
		setClubsSlot(emptySlot<ParsedClubsFile>())
	}

	return {
		loading,
		existing,
		missingCourses,
		athleteSlot,
		eventSlot,
		courseSlot,
		clubsSlot,
		setAthleteFile,
		setEventFile,
		setCourseFile,
		setClubsFile,
		setAthleteSkip,
		setEventSkip,
		setCourseSkip,
		setClubsSkip,
		acceptCapturedFile,
		parsedCount,
		allReady,
		skippedKeys,
		capturedCourseIds,
		ingestAll,
		setIngestAll,
		buildSummary,
		reset,
	}
}

export type ResultSlots = ReturnType<typeof createResultSlots>
