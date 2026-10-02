/**
 * The club's data as an MCP server, at `POST /api/mcp`.
 *
 * MCP (the Model Context Protocol) is how LLM clients — claude.ai connectors,
 * Claude Code, ChatGPT and the rest — discover and call tools on a server. Over
 * HTTP it's JSON-RPC: the client posts a request and gets the answer back.
 * This server is the simplest kind the spec allows: stateless, with no
 * sessions and no server-to-client stream, answering every request with plain
 * JSON. That's small enough to write out here rather than pull in the SDK,
 * whose transports expect a Node server.
 *
 * Everything it serves is already public on `/api/*`, so like those routes it
 * needs no auth. It reads only the snapshot files (see snapshots.ts).
 */

import { internal } from '../_generated/api'
import type { ActionCtx } from '../_generated/server'
import {
	SNAPSHOT_FILES,
	type SnapshotFile,
	getSnapshotFile,
} from '../snapshots'
import { ToolError, loadClubData } from './data'
import { TOOLS } from './tools'

/** Newest first: the first is offered to a client that asks for one we don't know. */
const PROTOCOL_VERSIONS = [
	'2025-11-25',
	'2025-06-18',
	'2025-03-26',
	'2024-11-05',
]

const SERVER_INFO = {
	name: 'scoopbus',
	title: 'Scoop Bus Run Club',
	version: '1.0.0',
	websiteUrl: 'https://scoopbus.run',
}

const INSTRUCTIONS = `Scoop Bus Run Club (scoopbus.run) is a small running club in Stockholm, Sweden. Its members run parkrun — free, timed 5 km runs every Saturday morning — mostly at Haga parkrun, and also go to races and club events together ("our events").

- Members go by first name (e.g. "Keith", "Other Josh"); tools match names loosely.
- Dates are YYYY-MM-DD, in Stockholm time. Times are mm:ss or h:mm:ss. Age grade is a percentage.
- total_parkruns is parkrun's own lifetime count; results_on_record is what the club has stored.
- Junior parkruns (2 km) are kept apart from 5 km personal bests.
- Volunteer roles are the Swedish names parkrun reports; translate them for the user.
- The data is refreshed a couple of minutes after results are uploaded, usually on Saturday.

Start with get_club_overview or get_member; use search_results or get_leaderboard for specific questions, get_parkrun_day for "how did Saturday go?", and get_calendar or list_our_events for what's coming up.`

const RESOURCE_PREFIX = 'scoopbus://data/'

const headers = {
	'Content-Type': 'application/json',
	'Access-Control-Allow-Origin': '*',
}

type Id = string | number | null

interface JsonRpcMessage {
	jsonrpc?: unknown
	id?: Id
	method?: unknown
	params?: unknown
	result?: unknown
	error?: unknown
}

class RpcError extends Error {
	constructor(
		readonly code: number,
		message: string,
	) {
		super(message)
	}
}

export async function handleMcpRequest(
	ctx: ActionCtx,
	request: Request,
): Promise<Response> {
	let body: unknown
	try {
		body = await request.json()
	} catch {
		return reply(errorResponse(null, -32700, 'Parse error'))
	}

	// Batches went out of the spec in 2025-06-18, but older clients may send one.
	const messages = Array.isArray(body) ? body : [body]
	const responses: unknown[] = []
	for (const message of messages) {
		const response = await handleMessage(ctx, message)
		if (response) responses.push(response)
	}

	// Only notifications (or client responses): nothing to say back.
	if (!responses.length) return new Response(null, { status: 202, headers })
	return reply(Array.isArray(body) ? responses : responses[0])
}

function reply(payload: unknown) {
	return new Response(JSON.stringify(payload), { headers })
}

function errorResponse(id: Id, code: number, message: string) {
	return { jsonrpc: '2.0', id, error: { code, message } }
}

async function handleMessage(ctx: ActionCtx, raw: unknown) {
	if (!raw || typeof raw !== 'object') {
		return errorResponse(null, -32600, 'Invalid request')
	}
	const message = raw as JsonRpcMessage
	// A response to something we asked the client. We never ask.
	if (
		message.method === undefined &&
		('result' in message || 'error' in message)
	) {
		return null
	}
	const isNotification = !('id' in message)
	const id = message.id ?? null
	if (message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
		return isNotification ? null : errorResponse(id, -32600, 'Invalid request')
	}

	try {
		const result = await dispatch(
			ctx,
			message.method,
			(message.params ?? {}) as Record<string, unknown>,
		)
		return isNotification ? null : { jsonrpc: '2.0', id, result }
	} catch (error) {
		if (isNotification) return null
		if (error instanceof RpcError)
			return errorResponse(id, error.code, error.message)
		console.error('MCP request failed', message.method, error)
		return errorResponse(id, -32603, 'Internal error')
	}
}

async function dispatch(
	ctx: ActionCtx,
	method: string,
	params: Record<string, unknown>,
): Promise<unknown> {
	switch (method) {
		case 'initialize': {
			const requested = params.protocolVersion
			return {
				protocolVersion:
					typeof requested === 'string' && PROTOCOL_VERSIONS.includes(requested)
						? requested
						: PROTOCOL_VERSIONS[0],
				capabilities: {
					tools: { listChanged: false },
					resources: { listChanged: false },
				},
				serverInfo: SERVER_INFO,
				instructions: INSTRUCTIONS,
			}
		}

		case 'ping':
			return {}

		case 'tools/list':
			return {
				tools: TOOLS.map(({ run: _, ...tool }) => ({
					...tool,
					annotations: {
						title: tool.title,
						readOnlyHint: true,
						destructiveHint: false,
						idempotentHint: true,
						openWorldHint: false,
					},
				})),
			}

		case 'tools/call':
			return await callTool(ctx, params)

		case 'resources/list':
			return await listResources(ctx)

		case 'resources/templates/list':
			return { resourceTemplates: [] }

		case 'resources/read':
			return await readResource(ctx, params)

		default:
			if (method.startsWith('notifications/')) return {}
			throw new RpcError(-32601, `Method not found: ${method}`)
	}
}

async function callTool(ctx: ActionCtx, params: Record<string, unknown>) {
	const tool = TOOLS.find((t) => t.name === params.name)
	if (!tool) throw new RpcError(-32602, `Unknown tool: ${String(params.name)}`)

	const args =
		params.arguments && typeof params.arguments === 'object'
			? (params.arguments as Record<string, unknown>)
			: {}

	try {
		const data = await loadClubData(ctx)
		const result = tool.run(data, args)
		return { content: [{ type: 'text', text: JSON.stringify(result) }] }
	} catch (error) {
		// Errors the model can act on go back as a tool result, per the spec, so
		// it sees them and can try again.
		if (error instanceof ToolError) {
			return { content: [{ type: 'text', text: error.message }], isError: true }
		}
		console.error('MCP tool failed', tool.name, args, error)
		return {
			content: [
				{
					type: 'text',
					text: 'Something went wrong answering that. Try again shortly.',
				},
			],
			isError: true,
		}
	}
}

const resourceFiles = Object.keys(SNAPSHOT_FILES) as SnapshotFile[]

async function listResources(ctx: ActionCtx) {
	const pointers = await ctx.runQuery(internal.snapshots.pointers)
	const sizes = new Map<string, number>()
	for (const pointer of Object.values(pointers)) {
		for (const [file, entry] of Object.entries(pointer?.files ?? {})) {
			if (entry) sizes.set(file, entry.bytes)
		}
	}
	return {
		resources: resourceFiles.map((file) => ({
			uri: `${RESOURCE_PREFIX}${file}.json`,
			name: `${file}.json`,
			title: `${file}.json`,
			description: `${SNAPSHOT_FILES[file].description} The raw file; the tools are usually a better way in.`,
			mimeType: 'application/json',
			size: sizes.get(file),
		})),
	}
}

async function readResource(ctx: ActionCtx, params: Record<string, unknown>) {
	const uri = typeof params.uri === 'string' ? params.uri : ''
	const file = resourceFiles.find((f) => uri === `${RESOURCE_PREFIX}${f}.json`)
	if (!file) throw new RpcError(-32002, `Resource not found: ${uri}`)

	const snapshot = await getSnapshotFile(ctx, file)
	if (!snapshot?.blob) throw new RpcError(-32603, `${file}.json is unavailable`)
	return {
		contents: [
			{ uri, mimeType: 'application/json', text: await snapshot.blob.text() },
		],
	}
}
