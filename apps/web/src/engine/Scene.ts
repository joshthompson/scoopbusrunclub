import { seasonalAsset } from '@/utils/halloween'
import {
	type Accessor,
	type Component,
	type JSX,
	batch,
	createMemo,
	createRoot,
} from 'solid-js'
import type { Controller } from './Controller'
import type { Canvas, CanvasControllers } from './components/Canvas'
import { type ObjectSignal, createObjectSignal } from './utils'

// biome-ignore lint/suspicious/noExplicitAny: necessary for dynamic/WebGL API
export type SceneComponent<T extends {} = any> = Component<
	{
		setScene: (scene: string, mode?: string) => void
		mode?: string
	} & T
>

// biome-ignore lint/suspicious/noExplicitAny: necessary for dynamic/WebGL API
type AnyController = Controller<any>

interface GameOptions {
	width: number
	height: number
	x?: number
	y?: number
	setup?: (scene: Scene) => void
	afterEnterFrames?: (data: { $scene: Scene }) => void
	images?: string[] // These are other assets that are not in controllers
	frameRate?: number
	assetOrder?: (string | string[])[]
}

// biome-ignore lint/suspicious/noExplicitAny: necessary for dynamic/WebGL API
export class Scene<C extends Controller<any> = Controller<any>> {
	interval: number
	/** How long a tick is, in milliseconds. */
	frameRate: number
	/**
	 * Run every tick after the controllers have moved, which is how sprites
	 * step through their frames: in the same update as everything else, rather
	 * than each on a clock of its own.
	 */
	tickers = new Set<() => void>()
	/**
	 * Every controller, the attached ones too, and the same again by type.
	 * Looked up many times a tick, but only worked out again when a controller
	 * is added, removed or attached.
	 */
	private lookup: Accessor<{
		all: AnyController[]
		byType: Map<string, AnyController[]>
	}>
	private disposeLookup: () => void
	loading = createObjectSignal(false)
	/** Whether any of the scene is on the screen (see `Canvas`). */
	visible = createObjectSignal(true)
	modal = createObjectSignal(undefined as JSX.Element | undefined)
	loadingAssetCount = createObjectSignal(0)
	loadingAssetTotal = createObjectSignal(0)
	controllers = createObjectSignal([] as CanvasControllers)
	canvas: ObjectSignal<Canvas>

	constructor(
		public id: string,
		public options: GameOptions,
	) {
		// Setup signals
		this.canvas = createObjectSignal(this.createCanvas())
		const lookup = createRoot((dispose) => ({
			dispose,
			memo: createMemo(() => {
				const top = this.controllers.get().map((c) => c.controller)
				const all = [...top, ...top.flatMap((c) => c.childControllers())]
				const byType = new Map<string, AnyController[]>()
				for (const controller of all) {
					const ofType = byType.get(controller.type)
					if (ofType) ofType.push(controller)
					else byType.set(controller.type, [controller])
				}
				return { all, byType }
			}),
		}))
		this.lookup = lookup.memo
		this.disposeLookup = lookup.dispose

		// Setup onEnterFrame functions for controllers. Batched, so the page
		// updates once a tick with everything that moved, rather than after
		// every single signal a controller sets. Nothing happens while the scene
		// is off the screen: it carries on from where it was once it's back.
		this.frameRate = this.options.frameRate ?? 40
		this.interval = window.setInterval(
			() =>
				this.visible.get() &&
				batch(() => {
					if (this.isActive()) {
						for (const { controller } of this.controllers.get()) {
							controller.onEnterFrame(this)
						}
					}
					for (const ticker of this.tickers) ticker()
					this.options.afterEnterFrames?.({ $scene: this })
				}),
			this.frameRate,
		)

		// Run setup
		this.setup()
	}

	addController(...controllers: (C | undefined)[]) {
		for (const controller of controllers) {
			if (!controller) continue
			controller.setGame(this)
			this.controllers.set([
				...this.controllers.get(),
				{ id: controller.id, controller },
			])
		}
	}

	removeController(id: string) {
		this.controllers.set(
			this.controllers.get().filter(({ id: name }) => name !== id),
		)
	}

	/** Shared between callers, so don't change the array you get back. */
	getAllControllers() {
		return this.lookup().all
	}

	// biome-ignore lint/suspicious/noExplicitAny: necessary for dynamic/WebGL API
	getControllerById<T = Controller<any>>(id: string) {
		return this.getAllControllers().find((c) => c.id === id) as T | undefined
	}

	/** Shared between callers, so don't change the array you get back. */
	// biome-ignore lint/suspicious/noExplicitAny: necessary for dynamic/WebGL API
	getControllersByType<T = Controller<any>>(type: string) {
		return (this.lookup().byType.get(type) ?? []) as T[]
	}

	getSolidControllerRects(): Rect[] {
		return this.controllers
			.get()
			.filter((c) => c.controller.solid && c.controller.sprite())
			.map((c) => {
				const solid = c.controller.solid as Accessor<Rect> | Rect | true
				if (solid === true) {
					return {
						x: c.controller.data.x() + c.controller.solid,
						y: c.controller.data.y() + c.controller.solid,
						width: c.controller.data.width,
						height: c.controller.data.height, // TODO Force height being set
					}
				}
				const rect = typeof solid === 'function' ? solid() : solid
				return {
					x: c.controller.data.x() + rect.x,
					y: c.controller.data.y() + rect.y,
					width: rect.width,
					height: rect.height,
				}
			})
	}

	isActive() {
		return !this.loading.get() && !this.modal.get()
	}

	destroy() {
		clearInterval(this.interval)
		this.tickers.clear()
		this.disposeLookup()
	}

	setWidth(width: number) {
		this.options.width = width
		this.canvas.get().setWidth(width)
	}

	createCanvas(): Canvas {
		return {
			...createObjectSignal(this.options.width, 'width'),
			...createObjectSignal(this.options.height, 'height'),
			controllers: this.controllers.get,
			...createObjectSignal(this.options.x ?? 0, 'x'),
			...createObjectSignal(this.options.y ?? 0, 'y'),
		}
	}

	async setup() {
		this.options.setup?.(this)
		for (const { controller } of this.controllers.get()) {
			controller.setGame(this)
		}
		this.load()
	}

	async load() {
		this.loading.set(true)
		await this.preloadAssets()
		this.loading.set(false)
	}

	async preloadAssets() {
		const frameAssets = this.controllers
			.get()
			.flatMap(({ controller }) => controller.frames ?? [])
			// Preload whichever variant Sprite will actually render
			.map((frame) => seasonalAsset(frame.split('#')[0]))

		const imageAssets = [
			...new Set([...frameAssets, ...(this.options.images ?? [])]),
		]
		this.loadingAssetCount.set(0)
		const assetLoaded = () =>
			this.loadingAssetCount.set(this.loadingAssetCount.get() + 1)
		const assetSet = new Set([...imageAssets])
		const images = imageAssets.map((path) => {
			return new Promise<void>((resolve) => {
				const img = new Image()
				img.src = path
				img.onload = () => assetLoaded() && resolve()
				img.onerror = () => assetLoaded() && resolve()
			})
				.then(() => assetSet.delete(path))
				.catch(() => console.error(`Error preloading "${path}"`))
		})
		await Promise.allSettled([...images])
	}
}
