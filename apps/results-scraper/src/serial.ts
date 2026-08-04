/**
 * A one-at-a-time queue.
 *
 * Captures are triggered from two places — the debugger's `loadingFinished` and
 * `tabs.onUpdated` — because neither is reliable enough alone. That means both
 * can fire for the same page load, and if they interleave they each capture and
 * each call `advance()`, which walks the queue twice and silently skips an item.
 *
 * Everything that reads-then-writes run state goes through here so that can't
 * happen. The chain lives in module scope, which resets when the service worker
 * restarts — fine, because ordering only matters within a burst of events.
 */
let chain: Promise<unknown> = Promise.resolve()

export function serial<T>(work: () => Promise<T>): Promise<T> {
	const next = chain.then(work, work)
	// Swallow rejections on the chain itself so one failure can't poison the queue;
	// the returned promise still rejects for the caller.
	chain = next.catch(() => undefined)
	return next
}
