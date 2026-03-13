import { Accessor, createSignal, JSX, Setter } from "solid-js"
import { Sprite } from '@/engine/components/Sprite'
import { Scene } from "./Scene"
import { isOverlapping, SolidRect } from "@/utils/game"
import { blockBySolidsRectPlayer } from "@/utils/blockBySolids"
import { cx } from "@style/css"

type Accessorise<T> = {
  [K in keyof T]: Accessor<T[K]>
}

export type ControllerBaseType = {
  id: string
  type: string
  x: Accessor<Sprite['x']>
  y: Accessor<Sprite['y']>
  setX?: Setter<Sprite['x']>
  setY?: Setter<Sprite['y']>
  scene?: Scene
  style?: Accessor<Sprite['style']>
  width: Accessor<Sprite['width']>
  height: Accessor<number>
  inner?: {
    rotation?: Accessor<number>
    origin?: Accessor<Vector>
  },
} & Partial<Accessorise<Sprite>>

export interface Controller<
  CP extends ControllerBaseType,
> {
  type: string
  id: string
  frames?: Sprite['frames']
  solid: SolidRect
  onEnterFrame: (scene: Scene) => void
  destroy: () => void
  hitTest: (other: Controller<any>) => boolean
  distanceTo: (x: number, y: number) => number
  direction: (x: number, y: number) => number
  attach: (controller: Controller<any>) => void
  setGame: (scene: Scene) => void
  data: CP
  sprite: Accessor<Sprite>
  age: Accessor<number>
  childControllers: Accessor<Controller<any>[]>
}

interface OnEnterFrameData<T extends ControllerBaseType> {
  $: T,
  $scene: Scene,
  $age: number,
  $currentFrame: number
  $controller: Controller<T>
}

interface OnMountData<T extends ControllerBaseType> {
  $: T,
  $scene: Scene,
  $currentFrame: number
  $controller: Controller<T>
  $ref: HTMLDivElement | undefined
}

interface ControllerProps<T extends ControllerBaseType> {
  init: () => T
  frames?: Sprite['frames']
  solid?: SolidRect
  blockedBySolid?: boolean
  randomStartFrame?: Sprite['randomStartFrame']
  class?: Sprite['class']
  style?: Sprite['style']
  onEnterFrame?: (data: OnEnterFrameData<T>) => void
  onMount?: (data: OnMountData<T>) => void
}

type ExtractControllerType<T> = T extends Controller<infer A> ? A : never

export function createController<
  CP extends ControllerBaseType
>(options: ControllerProps<CP>): Controller<CP> {

  const [age, setAge] = createSignal<number>(0)
  const onEnterFrame = options.onEnterFrame
  const [currentFrame, setCurrentFrame] = createSignal<number>(0)
  const [childControllers, setChildControllers] = createSignal<Controller<any>[]>([])
  const data: CP = options.init()
  const destroy = () => {}
  const setGame = (scene: Scene) => (data.scene = scene)
  const hitTest = (other: Controller<any>) => {
    const ref1 = document.querySelector(`[data-controller-id="${data.id}"]`) as HTMLElement
    const ref2 = document.querySelector(`[data-controller-id="${other.id}"]`) as HTMLElement

    return isOverlapping(ref1, ref2)
  }
  const distanceTo = (x: number, y: number) => {
    return Math.hypot(data.x() - x, data.y() - y)
  }
  const direction = (x: number, y: number) => {
    return Math.atan2(y - data.y(), x - data.x())
  }
  const attach = (controller: Controller<any>) => {
    setChildControllers([...childControllers(), controller])
  }

  const controller: Controller<CP> = {
    id: data.id,
    type: data.type,
    frames: options.frames,
    solid: options.solid ?? false,
    onEnterFrame: $scene => {
      const prevX = data.x()
      const prevY = data.y()

      onEnterFrame?.({
        $: data,
        $scene,
        $age: age(),
        $currentFrame: currentFrame(),
        $controller: controller
      })

      if (options.blockedBySolid) {
        blockBySolidsRectPlayer(data, prevX, prevY)
      }
      setAge(age() + 1)

      childControllers().forEach(child => child.onEnterFrame($scene))
    },
    destroy,
    hitTest,
    distanceTo,
    direction,
    attach,
    setGame,
    age,
    data,
    childControllers,
    sprite: (): Sprite => ({
      frames: data?.frames?.() ?? options.frames ?? [],
      frame: data?.frame?.(),
      randomStartFrame: options.randomStartFrame ?? false,
      class: cx(options.class, data.class?.()),
      style: { ...options.style, ...data.style?.() },
      x: data.x(),
      y: data.y(),
      origin: data.origin?.(),
      xScale: data.xScale?.() ?? 1,
      yScale: data.yScale?.() ?? 1,
      width: data.width(),
      height: data.height?.() ?? console.log(data.type) ?? 0,
      parallax: data.parallax?.() ?? 1,
      rotation: data.rotation?.() ?? 0,
      state: data.state?.(),
      frameInterval: data.frameInterval?.(),
      children: data.children?.(),
      inner: {
        rotation: data.inner?.rotation?.(),
        origin: data.inner?.origin?.(),
      },
      onChangeFrame: frame => setCurrentFrame(frame),
      onMount: ({ $ref }) => {
        options.onMount && options.onMount({
          $: data,
          $scene: data.scene!,
          $controller: controller,
          $currentFrame: currentFrame(),
          $ref: $ref,
        })
      },
      controllers: childControllers,
    }),
  }

  return controller
}


export function createConnectedController<
  C extends Controller<any>,
  T extends {} = ControllerBaseType,
>(options: {
  type: string | ((baseType: string) => string),
  base: C,
  frames?: ControllerProps<ExtractControllerType<C>>['frames'],
  offset: Vector,
  transformOrigin?: Vector,
  origin?: Vector,
  solid?: SolidRect
  width: ($: ExtractControllerType<C>) => number,
  height: ($: ExtractControllerType<C>) => number,
  x?: ($: ExtractControllerType<C>, $age: number) => number,
  y?: ($: ExtractControllerType<C>, $age: number) => number,
  xScale?: ($: ExtractControllerType<C>) => number,
  rotation?: ($: ExtractControllerType<C>, $age: number) => number,
  frameInterval?: ($: ExtractControllerType<C>) => number,
  state?: ($: ExtractControllerType<C>) => Sprite['state'],
  onEnterFrame?: ControllerProps<ExtractControllerType<Controller<T & ControllerBaseType>>>['onEnterFrame'],
  frame?: ($: ExtractControllerType<C>) => number,
  style?: ($: ExtractControllerType<C>) => JSX.CSSProperties,
  randomStartFrame?: boolean
  init?: ($: ExtractControllerType<C>, $age: number) => T,
}): Controller<T & ControllerBaseType> {
  return createController<any>({
    frames: options.frames,
    randomStartFrame: options.randomStartFrame ?? false,
    init() {
      const baseData = options.base.data as ExtractControllerType<C>

      return {
        id: `${options.base.id}-${options.type}`,
        type: typeof options.type === 'function'
          ? options.type(options.base.type)
          : `${options.base.type}-${options.type}`,

        x: () => options.offset.x + (options.x ? options.x(baseData, options.base.age()) : 0),
        y: () => options.offset.y + (options.y ? options.y(baseData, options.base.age()) : 0),
        rotation: () => options.rotation?.(baseData, options.base.age()) ?? 0,
        origin: () => ({ x: options.origin?.x ?? 0, y: options.origin?.y ?? 0 }),
        frame: () => options.frame?.(baseData),
        frameInterval: () => options.frameInterval?.(baseData),
        state: () => options.state?.(baseData),
        width: options.width,
        height: options.height,
        solid: options.solid,
        style: () => options.style?.(baseData),
        ...options.init?.(baseData, options.base.age()),
      }
    },
    onEnterFrame: options.onEnterFrame,
  })
}
