/**
 * The public data, kept as JSON files in storage.
 *
 * This Convex project shares its database bandwidth with a hungrier one, and
 * the public data is read far more often than it's written: every visit to the
 * site, every calendar rebuild and every MCP question wants all of it. So each
 * public list is written out once, as the exact body its `/api/*` route has
 * always returned, and read back from storage after that. Serving one costs a
 * look-up of a single small `appData` row; the tables themselves are only read
 * when they've changed.
 *
 * The files come in three groups, one per data timestamp the site already
 * keeps (see `parkrun.setAppData`). Bumping a timestamp arms a rebuild of the
 * groups that depend on it after a quiet period, and every bump re-arms it —
 * so an upload of sixteen athletes, one request each, is written out once,
 * after the last of them.
 */

import { v } from 'convex/values'
import { internal } from './_generated/api'
import type { Doc, Id } from './_generated/dataModel'
import {
	type ActionCtx,
	type MutationCtx,
	type QueryCtx,
	internalAction,
	internalMutation,
	internalQuery,
} from './_generated/server'
import { type GuestResultItem, allGuestResults } from './guests'
import {
	type ResultItem,
	type VolunteerItem,
	allVolunteers,
	resultsSince,
} from './queries'
import { publicRaces } from './races'

/**
 * Bump when a file's shape changes, so the hourly check rebuilds everything
 * rather than serving the old shape until the data next changes.
 */
const SNAPSHOT_FORMAT_VERSION = 1

/** What each file holds: the body of the route named alongside. */
export interface SnapshotData {
	/** `/api/runners` */
	members: Doc<'runners'>[]
	/** `/api/results` */
	results: ResultItem[]
	/** `/api/volunteers` */
	volunteers: VolunteerItem[]
	/** `/api/events` */
	parkruns: Doc<'events'>[]
	/** `/api/races` */
	'our-events': Doc<'races'>[]
	/** `/api/guests` */
	guests: Doc<'guests'>[]
	/** `/api/guest-results` */
	'guest-results': GuestResultItem[]
}

export type SnapshotFile = keyof SnapshotData

export const SNAPSHOT_FILES: Record<SnapshotFile, { description: string }> = {
	members: {
		description:
			"The club's parkrun athletes: parkrun id, name and total runs as parkrun reports them.",
	},
	results: {
		description:
			"Every parkrun result on record for the club's members: date, parkrun, event number, position, time and age grade.",
	},
	volunteers: {
		description:
			"Every parkrun volunteering credit for the club's members, with the roles taken.",
	},
	parkruns: {
		description:
			'The parkrun events the club has been to: id, name, country and website.',
	},
	'our-events': {
		description:
			"The club's own events and races, with who's going and their results.",
	},
	guests: {
		description: 'Guests who have run with the club.',
	},
	'guest-results': {
		description: 'parkrun results for guests who have run with the club.',
	},
}

export type DataTimestampKey =
	| 'parkrunDataUpdatedAt'
	| 'scoopBusDataUpdatedAt'
	| 'guestDataUpdatedAt'

const DATA_TIMESTAMP_KEYS: DataTimestampKey[] = [
	'parkrunDataUpdatedAt',
	'scoopBusDataUpdatedAt',
	'guestDataUpdatedAt',
]

export function isDataTimestampKey(key: string): key is DataTimestampKey {
	return (DATA_TIMESTAMP_KEYS as string[]).includes(key)
}

/**
 * How long a timestamp has to sit still before its files are rebuilt.
 *
 * parkrun data arrives as a chain of uploads, one athlete per request, so it
 * waits long enough to see the chain through. Races and guests are edited one
 * at a time in the admin pages and only need to wait out a quick follow-up fix.
 */
const QUIET_MS: Record<DataTimestampKey, number> = {
	parkrunDataUpdatedAt: 2 * 60 * 1000,
	scoopBusDataUpdatedAt: 10 * 1000,
	guestDataUpdatedAt: 10 * 1000,
}

export type SnapshotGroup = 'parkrun' | 'scoopBus' | 'guest'

const groupValidator = v.union(
	v.literal('parkrun'),
	v.literal('scoopBus'),
	v.literal('guest'),
)

const fileValidator = v.union(
	v.literal('members'),
	v.literal('results'),
	v.literal('volunteers'),
	v.literal('parkruns'),
	v.literal('our-events'),
	v.literal('guests'),
	v.literal('guest-results'),
)

/**
 * Which files make up a group, and which timestamps it's built from. Guest
 * results carry parkrun names, so new parkrun data dirties them too.
 */
const GROUPS: Record<
	SnapshotGroup,
	{ files: SnapshotFile[]; dependsOn: DataTimestampKey[] }
> = {
	parkrun: {
		files: ['members', 'results', 'volunteers', 'parkruns'],
		dependsOn: ['parkrunDataUpdatedAt'],
	},
	scoopBus: {
		files: ['our-events'],
		dependsOn: ['scoopBusDataUpdatedAt'],
	},
	guest: {
		files: ['guests', 'guest-results'],
		dependsOn: ['guestDataUpdatedAt', 'parkrunDataUpdatedAt'],
	},
}

const SNAPSHOT_GROUPS = Object.keys(GROUPS) as SnapshotGroup[]

function groupOf(file: SnapshotFile): SnapshotGroup {
	const group = SNAPSHOT_GROUPS.find((g) => GROUPS[g].files.includes(file))
	if (!group) throw new Error(`No snapshot group holds ${file}`)
	return group
}

/** Where a group's files are, noted down in `appData`. */
export interface SnapshotPointer {
	format: number
	files: Partial<
		Record<SnapshotFile, { storageId: Id<'_storage'>; bytes: number }>
	>
	/** The timestamps the files were built from. */
	builtFrom: Partial<Record<DataTimestampKey, string | null>>
	/** Unique to this build; the files' ETag. */
	version: string
	generatedAt: number
}

const pointerKey = (group: SnapshotGroup) => `snapshot:${group}`
const pendingKey = (group: SnapshotGroup) => `snapshotPending:${group}`

async function appDataRow(ctx: QueryCtx, key: string) {
	return await ctx.db
		.query('appData')
		.withIndex('by_key', (q) => q.eq('key', key))
		.unique()
}

async function setAppDataRow(ctx: MutationCtx, key: string, value: string) {
	const existing = await appDataRow(ctx, key)
	if (existing) await ctx.db.patch(existing._id, { value })
	else await ctx.db.insert('appData', { key, value })
}

/** A group's pointer, or null if it has never been built (or the note is unreadable). */
export async function readPointer(
	ctx: QueryCtx,
	group: SnapshotGroup,
): Promise<SnapshotPointer | null> {
	const row = await appDataRow(ctx, pointerKey(group))
	if (!row) return null
	try {
		return JSON.parse(row.value) as SnapshotPointer
	} catch {
		return null
	}
}

async function readTimestamps(
	ctx: QueryCtx,
): Promise<Record<DataTimestampKey, string | null>> {
	const entries = await Promise.all(
		DATA_TIMESTAMP_KEYS.map(
			async (key) =>
				[key, (await appDataRow(ctx, key))?.value ?? null] as const,
		),
	)
	return Object.fromEntries(entries) as Record<DataTimestampKey, string | null>
}

// ---------------------------------------------------------------------------
// Arming a rebuild
// ---------------------------------------------------------------------------

/**
 * Schedule (or push back) a rebuild of every group a timestamp feeds.
 *
 * Same shape as the results notification's debounce: each arming writes a new
 * token, and a rebuild only goes ahead if its token is still the latest. An
 * earlier one wakes up, sees it has been superseded, and stops.
 */
export async function armSnapshots(ctx: MutationCtx, key: DataTimestampKey) {
	for (const group of SNAPSHOT_GROUPS) {
		if (!GROUPS[group].dependsOn.includes(key)) continue
		const token = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
		await setAppDataRow(ctx, pendingKey(group), token)
		await ctx.scheduler.runAfter(QUIET_MS[key], internal.snapshots.rebuild, {
			group,
			token,
		})
	}
}

/** Claim a pending rebuild. False when a later arming owns it. */
export const takePending = internalMutation({
	args: { group: groupValidator, token: v.string() },
	handler: async (ctx, args) => {
		const row = await appDataRow(ctx, pendingKey(args.group))
		if (!row || row.value !== args.token) return false
		await ctx.db.delete(row._id)
		return true
	},
})

// ---------------------------------------------------------------------------
// Building
// ---------------------------------------------------------------------------

/**
 * A file's contents, read from the tables. The one place the snapshots read
 * whole tables.
 */
async function loadFile<F extends SnapshotFile>(
	ctx: QueryCtx,
	file: F,
): Promise<SnapshotData[F]> {
	const load: { [K in SnapshotFile]: () => Promise<SnapshotData[K]> } = {
		members: () => ctx.db.query('runners').collect(),
		results: () => resultsSince(ctx, '0000-00-00'),
		volunteers: () => allVolunteers(ctx),
		parkruns: () => ctx.db.query('events').collect(),
		'our-events': () => publicRaces(ctx),
		guests: () => ctx.db.query('guests').collect(),
		'guest-results': () => allGuestResults(ctx),
	}
	return await load[file]()
}

/** A file's contents, serialised in the query so the action only moves a string. */
export const fileJson = internalQuery({
	args: { file: fileValidator },
	handler: async (ctx, args) => JSON.stringify(await loadFile(ctx, args.file)),
})

export const timestamps = internalQuery({
	args: {},
	handler: (ctx) => readTimestamps(ctx),
})

export const pointer = internalQuery({
	args: { group: groupValidator },
	handler: (ctx, args) => readPointer(ctx, args.group),
})

/** Every group's pointer, for the MCP server and the calendar. */
export const pointers = internalQuery({
	args: {},
	handler: async (ctx) => {
		const entries = await Promise.all(
			SNAPSHOT_GROUPS.map(
				async (group) => [group, await readPointer(ctx, group)] as const,
			),
		)
		return Object.fromEntries(entries) as Record<
			SnapshotGroup,
			SnapshotPointer | null
		>
	},
})

/** Note where a group's new files are, and clear away the ones they replace. */
export const savePointer = internalMutation({
	args: {
		group: groupValidator,
		files: v.record(
			v.string(),
			v.object({ storageId: v.id('_storage'), bytes: v.number() }),
		),
		builtFrom: v.record(v.string(), v.union(v.string(), v.null())),
	},
	handler: async (ctx, args) => {
		const previous = await readPointer(ctx, args.group)
		const generatedAt = Date.now()
		const next: SnapshotPointer = {
			format: SNAPSHOT_FORMAT_VERSION,
			files: args.files as SnapshotPointer['files'],
			builtFrom: args.builtFrom as SnapshotPointer['builtFrom'],
			version: `${SNAPSHOT_FORMAT_VERSION}-${generatedAt.toString(36)}`,
			generatedAt,
		}
		await setAppDataRow(ctx, pointerKey(args.group), JSON.stringify(next))

		for (const old of Object.values(previous?.files ?? {})) {
			if (old) await ctx.storage.delete(old.storageId)
		}
		return next
	},
})

/**
 * Write a group's files out from the tables.
 *
 * With a token, only if that token is still the latest arming (see
 * {@link armSnapshots}); without one, unconditionally — that's the way to run
 * it by hand: `npx convex run snapshots:rebuild '{"group":"parkrun"}'`.
 */
export const rebuild = internalAction({
	args: { group: groupValidator, token: v.optional(v.string()) },
	handler: async (ctx, args): Promise<SnapshotPointer | null> => {
		if (args.token) {
			const isCurrent = await ctx.runMutation(internal.snapshots.takePending, {
				group: args.group,
				token: args.token,
			})
			if (!isCurrent) return null
		}

		// Read before the data, so a write that lands mid-build leaves the
		// pointer looking stale rather than looking current.
		const stamps = await ctx.runQuery(internal.snapshots.timestamps)
		const builtFrom = Object.fromEntries(
			GROUPS[args.group].dependsOn.map((key) => [key, stamps[key]]),
		)

		const files: Record<string, { storageId: Id<'_storage'>; bytes: number }> =
			{}
		for (const file of GROUPS[args.group].files) {
			const json = await ctx.runQuery(internal.snapshots.fileJson, { file })
			const blob = new Blob([json], { type: 'application/json' })
			files[file] = {
				storageId: await ctx.storage.store(blob),
				bytes: blob.size,
			}
		}

		return await ctx.runMutation(internal.snapshots.savePointer, {
			group: args.group,
			files,
			builtFrom,
		})
	},
})

/**
 * The groups that are out of date with nothing on the way to fix them: never
 * built, built in an older format, or behind their timestamps without a
 * rebuild pending (a scheduled one that failed, say).
 */
export const staleGroups = internalQuery({
	args: {},
	handler: async (ctx) => {
		const stamps = await readTimestamps(ctx)
		const stale: SnapshotGroup[] = []
		for (const group of SNAPSHOT_GROUPS) {
			const current = await readPointer(ctx, group)
			const pending = await appDataRow(ctx, pendingKey(group))
			const behind =
				!current ||
				current.format !== SNAPSHOT_FORMAT_VERSION ||
				GROUPS[group].dependsOn.some(
					(key) => (current.builtFrom[key] ?? null) !== stamps[key],
				)
			if (behind && !pending) stale.push(group)
		}
		return stale
	},
})

/** The hourly safety net. Costs a handful of `appData` reads when all is well. */
export const rebuildStale = internalAction({
	args: {},
	handler: async (ctx): Promise<{ rebuilt: SnapshotGroup[] }> => {
		const stale: SnapshotGroup[] = await ctx.runQuery(
			internal.snapshots.staleGroups,
		)
		for (const group of stale) {
			await ctx.runAction(internal.snapshots.rebuild, { group })
		}
		return { rebuilt: stale }
	},
})

/**
 * The timestamps the site's localStorage cache watches, as of the snapshots
 * being served rather than the raw writes. A browser that saw the new
 * timestamp during the quiet period would otherwise fetch the old file and
 * keep it under the new key. Falls back to the raw timestamp for a group that
 * has never been built.
 */
export const cacheVersion = internalQuery({
	args: {},
	handler: async (ctx) => {
		const stamps = await readTimestamps(ctx)
		const builtFrom = async (group: SnapshotGroup, key: DataTimestampKey) => {
			const current = await readPointer(ctx, group)
			return current ? (current.builtFrom[key] ?? null) : stamps[key]
		}
		return {
			parkrunDataUpdatedAt: await builtFrom('parkrun', 'parkrunDataUpdatedAt'),
			scoopBusDataUpdatedAt: await builtFrom(
				'scoopBus',
				'scoopBusDataUpdatedAt',
			),
			guestDataUpdatedAt: await builtFrom('guest', 'guestDataUpdatedAt'),
			largestClubsUpdatedAt:
				(await appDataRow(ctx, 'largestClubsUpdatedAt'))?.value ?? null,
		}
	},
})

// ---------------------------------------------------------------------------
// Reading, from an action
// ---------------------------------------------------------------------------

/**
 * A snapshot file and its version. Builds the group first if it never has
 * been, and again if the file has gone missing from storage.
 *
 * Pass the request's `If-None-Match` header as `ifNoneMatch` to skip reading
 * the file when the caller already has this version; `blob` is then null.
 */
export async function getSnapshotFile(
	ctx: ActionCtx,
	file: SnapshotFile,
	options: { ifNoneMatch?: string } = {},
): Promise<{ version: string; generatedAt: number; blob: Blob | null } | null> {
	const group = groupOf(file)
	let current = await ctx.runQuery(internal.snapshots.pointer, { group })
	if (!current?.files[file]) {
		current = await ctx.runAction(internal.snapshots.rebuild, { group })
	}
	const entry = current?.files[file]
	if (!current || !entry) return null

	const meta = { version: current.version, generatedAt: current.generatedAt }
	if (etagMatches(options.ifNoneMatch, current.version)) {
		return { ...meta, blob: null }
	}

	const blob = await ctx.storage.get(entry.storageId)
	if (blob) return { ...meta, blob }

	// The note outlived the file. Build it again rather than fail.
	const rebuilt = await ctx.runAction(internal.snapshots.rebuild, { group })
	const retry = rebuilt?.files[file]
	const retryBlob = retry ? await ctx.storage.get(retry.storageId) : null
	return rebuilt && retryBlob
		? {
				version: rebuilt.version,
				generatedAt: rebuilt.generatedAt,
				blob: retryBlob,
			}
		: null
}

/**
 * Whether an `If-None-Match` header names this version. Convex's edge gzips the
 * response and hands the browser a weak, suffixed tag — `W/"<version>-gzip"` —
 * so it's the version inside the quotes that's compared, not the whole tag.
 */
function etagMatches(header: string | undefined, version: string): boolean {
	if (!header) return false
	return [...header.matchAll(/"([^"]*)"/g)].some(
		([, tag]) => tag === version || tag.startsWith(`${version}-`),
	)
}

/** A snapshot file, parsed. */
export async function loadSnapshot<F extends SnapshotFile>(
	ctx: ActionCtx,
	file: F,
): Promise<{ version: string; generatedAt: number; data: SnapshotData[F] }> {
	const snapshot = await getSnapshotFile(ctx, file)
	if (!snapshot?.blob) throw new Error(`Snapshot ${file} is unavailable`)
	return {
		version: snapshot.version,
		generatedAt: snapshot.generatedAt,
		data: JSON.parse(await snapshot.blob.text()) as SnapshotData[F],
	}
}

/**
 * Several snapshot files at once, parsed, keyed by file.
 *
 * Any group that has never been built is built first, one at a time — reading
 * a whole group's files in parallel on a cold start would otherwise build the
 * same group once per file. `version` changes whenever any of the files do.
 */
export async function loadSnapshots<F extends SnapshotFile>(
	ctx: ActionCtx,
	files: F[],
): Promise<{
	version: string
	generatedAt: number
	data: { [K in F]: SnapshotData[K] }
}> {
	const groups = [...new Set(files.map(groupOf))]
	const pointers = new Map<SnapshotGroup, SnapshotPointer>()
	for (const group of groups) {
		let current = await ctx.runQuery(internal.snapshots.pointer, { group })
		if (!current || GROUPS[group].files.some((f) => !current?.files[f])) {
			current = await ctx.runAction(internal.snapshots.rebuild, { group })
		}
		if (!current) throw new Error(`Snapshot group ${group} is unavailable`)
		pointers.set(group, current)
	}

	const loaded = await Promise.all(
		files.map(async (file) => {
			const entry = pointers.get(groupOf(file))?.files[file]
			const blob = entry ? await ctx.storage.get(entry.storageId) : null
			if (blob) return [file, JSON.parse(await blob.text())] as const
			// Replaced between the pointer read and now; take the long way.
			return [file, (await loadSnapshot(ctx, file)).data] as const
		}),
	)

	return {
		version: groups.map((g) => pointers.get(g)?.version).join('|'),
		generatedAt: Math.max(...[...pointers.values()].map((p) => p.generatedAt)),
		data: Object.fromEntries(loaded) as { [K in F]: SnapshotData[K] },
	}
}
