/**
 * The slice of the Chrome extension API this extension uses.
 *
 * Hand-written rather than pulling in @types/chrome: the surface here is small,
 * and it keeps the extension dependency-free like the rest of the repo.
 *
 * Declared as one interface rather than nested namespaces because `debugger` is
 * a reserved word and can't name a TypeScript namespace.
 */

interface ChromeTab {
	id?: number
	url?: string
	pendingUrl?: string
	status?: string
	windowId?: number
	active?: boolean
}

interface ChromeMessageSender {
	tab?: ChromeTab
	url?: string
	id?: string
	origin?: string
}

interface ChromeEvent<TListener extends (...args: never[]) => unknown> {
	addListener(listener: TListener): void
	removeListener(listener: TListener): void
	hasListener(listener: TListener): boolean
}

interface ChromeDebuggerTarget {
	tabId: number
}

interface ChromeStorageArea {
	get<T = Record<string, unknown>>(keys: string | string[] | null): Promise<T>
	set(items: Record<string, unknown>): Promise<void>
	remove(keys: string | string[]): Promise<void>
	clear(): Promise<void>
}

interface ChromeApi {
	runtime: {
		readonly id: string
		readonly lastError: { message?: string } | undefined
		getURL(path: string): string
		getPlatformInfo(): Promise<{ os: string; arch: string }>
		sendMessage<TSend = unknown, TReply = unknown>(
			message: TSend,
		): Promise<TReply>
		/** Return true from a listener to keep sendResponse alive for async work. */
		readonly onMessage: ChromeEvent<
			(
				message: unknown,
				sender: ChromeMessageSender,
				sendResponse: (response?: unknown) => void,
			) => boolean | undefined
		>
		readonly onInstalled: ChromeEvent<(details: { reason: string }) => void>
		readonly onStartup: ChromeEvent<() => void>
	}

	tabs: {
		create(props: {
			url?: string
			active?: boolean
			windowId?: number
			index?: number
		}): Promise<ChromeTab>
		update(
			tabId: number,
			props: { url?: string; active?: boolean },
		): Promise<ChromeTab | undefined>
		get(tabId: number): Promise<ChromeTab>
		remove(tabId: number): Promise<void>
		sendMessage<TSend = unknown, TReply = unknown>(
			tabId: number,
			message: TSend,
		): Promise<TReply>
		query(query: { url?: string | string[]; active?: boolean }): Promise<
			ChromeTab[]
		>
		readonly onRemoved: ChromeEvent<
			(tabId: number, info: { windowId: number }) => void
		>
		readonly onUpdated: ChromeEvent<
			(
				tabId: number,
				info: { status?: string; url?: string },
				tab: ChromeTab,
			) => void
		>
	}

	windows: {
		update(windowId: number, props: { focused?: boolean }): Promise<unknown>
	}

	storage: {
		readonly local: ChromeStorageArea
		readonly session: ChromeStorageArea
		readonly onChanged: ChromeEvent<
			(
				changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
				areaName: string,
			) => void
		>
	}

	debugger: {
		attach(target: ChromeDebuggerTarget, version: string): Promise<void>
		detach(target: ChromeDebuggerTarget): Promise<void>
		sendCommand<TResult = Record<string, unknown>>(
			target: ChromeDebuggerTarget,
			method: string,
			params?: Record<string, unknown>,
		): Promise<TResult>
		getTargets(): Promise<{ tabId?: number; attached: boolean; type: string }[]>
		readonly onEvent: ChromeEvent<
			(
				source: ChromeDebuggerTarget,
				method: string,
				params?: Record<string, unknown>,
			) => void
		>
		readonly onDetach: ChromeEvent<
			(source: ChromeDebuggerTarget, reason: string) => void
		>
	}

	alarms: {
		create(
			name: string,
			info: { delayInMinutes?: number; periodInMinutes?: number },
		): Promise<void>
		clear(name: string): Promise<boolean>
		readonly onAlarm: ChromeEvent<(alarm: { name: string }) => void>
	}

	action: {
		readonly onClicked: ChromeEvent<(tab: ChromeTab) => void>
		setBadgeText(details: { text: string }): Promise<void>
		setBadgeBackgroundColor(details: { color: string }): Promise<void>
		setTitle(details: { title: string }): Promise<void>
	}
}

declare const chrome: ChromeApi
