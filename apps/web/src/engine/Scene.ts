import { Accessor, Component, JSX } from "solid-js"
import { Canvas, CanvasControllers } from "./components/Canvas"
import { createObjectSignal, ObjectSignal } from "./utils"
import { Controller } from "./Controller"

export type SceneComponent<T extends {} = any> = Component<{
  setScene: (scene: string, mode?: string) => void
  mode?: string
} & T>

interface GameOptions {
  width: number
  height: number
  x?: number,
  y?: number,
  setup?: (scene: Scene) => void
  afterEnterFrames?: (data: { $scene: Scene }) => void
  images?: string[] // These are other assets that are not in controllers
  frameRate?: number
  assetOrder?: (string | string[])[]
}

export class Scene<C extends Controller<any> = Controller<any>> {
  interval: number
  loading = createObjectSignal(false)
  paused = createObjectSignal(false)
  modal = createObjectSignal(undefined as JSX.Element | undefined)
  loadingAssetCount = createObjectSignal(0)
  loadingAssetTotal = createObjectSignal(0)
  controllers = createObjectSignal([] as CanvasControllers)
  canvas: ObjectSignal<Canvas>

  constructor(public id: string, public options: GameOptions) {
    // Setup signals
    this.canvas = createObjectSignal(this.createCanvas())

    // Setup onEnterFrame functions for controllers
    this.interval = window.setInterval(() => {
      if (this.isActive()) {
        this.controllers.get().forEach(({ controller }) => controller.onEnterFrame(this))
      }
      this.options.afterEnterFrames?.({ $scene: this })
    }, this.options.frameRate ?? 40)

    // Set window event listeners
    window.addEventListener('keydown', this.handleWindowKeydown.bind(this))
    window.addEventListener('pause-game', this.togglePause.bind(this))

    // Run setup
    this.setup()
  }

  addController(...controllers: (C | undefined)[]) {
    controllers.forEach(controller => {
      if (!controller) return
      controller.setGame(this)
      this.controllers.set([
        ...this.controllers.get(),
        { id: controller.id, controller },
      ])
    })
  }

  removeController(id: string) {
    this.controllers.set(this.controllers.get().filter(({ id: name }) => name !== id))
  }

  getAllControllers() {
    return [
      ...this.controllers.get().map(c => c.controller),
      ...this.controllers.get().map(c => c.controller.childControllers()).flat(),
    ]
  }

  getControllerById<T = Controller<any>>(id: string) {
    return this.getAllControllers().find(c => c.id === id) as T | undefined
  }

  getControllersByType<T = Controller<any>>(type: string) {
    return this.getAllControllers().filter(c => c.type === type) as T[]
  }

  getSolidControllerRects(): Rect[] {
    return this.controllers.get()
      .filter(c => c.controller.solid && c.controller.sprite())
      .map(c => {
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

  handleWindowKeydown(event: KeyboardEvent) {
    if (event.key === 'p' || event.key === 'Escape') {
      this.togglePause()
    }
  }

  togglePause() {
    this.paused.set(!this.paused.get())
  }

  isActive() {
    return !this.paused.get()
        && !this.loading.get()
        && !this.modal.get()
  }

  destroy() {
    clearInterval(this.interval)
    window.removeEventListener('keydown', this.handleWindowKeydown.bind(this))
    window.removeEventListener('pause-game', this.togglePause.bind(this))
  }

  createCanvas(): Canvas {
    return {
      width: this.options.width,
      height: this.options.height,
      controllers: this.controllers.get,
      ...createObjectSignal(this.options.x ?? 0, 'x'),
      ...createObjectSignal(this.options.y ?? 0, 'y'),
    }
  }

  async setup() {
    this.options.setup?.(this)
    this.controllers.get().forEach(({ controller }) => {
      controller.setGame(this)
    })
    this.load()
  }

  async load() {
    this.loading.set(true)
    await this.preloadAssets()
    this.loading.set(false)
  }

  async preloadAssets() {
    const frameAssets = this.controllers.get()
      .map(({ controller }) => controller.frames ?? [])
      .flat()
      .map(frame => frame.split('#')[0])

    const imageAssets = [...new Set([...frameAssets, ...(this.options.images ?? [])])]
    this.loadingAssetCount.set(0)
    const assetLoaded = () => this.loadingAssetCount.set(this.loadingAssetCount.get() + 1)
    const assetSet = new Set([...imageAssets])
    const images = imageAssets.map(path => {
      return new Promise<void>((resolve) => {
        const img = new Image()
        img.src = path
        img.onload = () => assetLoaded() && resolve()
        img.onerror = () => assetLoaded() && resolve()
      }).then(() => assetSet.delete(path)).catch(() => console.error(`Error preloading "${path}"`))
    })
    await Promise.allSettled([...images])
  }
}
