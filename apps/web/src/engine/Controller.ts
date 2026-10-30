import type { Sprite } from '@/engine/components/Sprite'
import { blockBySolidsRectPlayer } from '@/utils/blockBySolids'
import { type SolidRect, isOverlapping } from '@/utils/game'
import { cx } from '@style/css'
import { type Accessor, type JSX, type Setter, createSignal } from 'solid-js'
import type { Scene } from './Scene'

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
		/** Styles for the frame image, without the controllers attached to it. */
		style?: Accessor<JSX.CSSProperties>
	}
	/** Drawn inside the sprite, and drawn again when a signal it reads changes. */
	children?: Accessor<JSX.Element>
} & Partial<Accessorise<Omit<Sprite, 'inner' | 'children'>>>

export interface Controller<CP extends ControllerBaseType> {
	type: string
	id: string
	frames?: Sprite['frames']
	solid: SolidRect
	onEnterFrame: (scene: Scene) => void
	destroy: () => void
	// biome-ignore lint/suspicious/noExplicitAny: necessary for dynamic/WebGL API
	hitTest: (other: Controller<any>) => boolean
	distanceTo: (x: number, y: number) => number
	direction: (x: number, y: number) => number
	// biome-ignore lint/suspicious/noExplicitAny: necessary for dynamic/WebGL API
	attach: (controller: Controller<any>) => void
	setGame: (scene: Scene) => void
	data: CP
	sprite: Accessor<Sprite>
	age: Accessor<number>
	// biome-ignore lint/suspicious/noExplicitAny: necessary for dynamic/WebGL API
	childControllers: Accessor<Controller<any>[]>
}

interface OnEnterFrameData<T extends ControllerBaseType> {
	$: T
	$scene: Scene
	$age: number
	$currentFrame: number
	$controller: Controller<T>
}

interface OnMountData<T extends ControllerBaseType> {
	$: T
	$scene: Scene
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

export function createController<CP extends ControllerBaseType>(
	options: ControllerProps<CP>,
): Controller<CP> {
	const [age, setAge] = createSignal<number>(0)
	const onEnterFrame = options.onEnterFrame
	const [currentFrame, setCurrentFrame] = createSignal<number>(0)
	const [childControllers, setChildControllers] = createSignal<
		// biome-ignore lint/suspicious/noExplicitAny: necessary for dynamic/WebGL API
		Controller<any>[]
	>([])
	const data: CP = options.init()
	const destroy = () => {}
	const setGame = (scene: Scene) => {
		data.scene = scene
	}
	// biome-ignore lint/suspicious/noExplicitAny: necessary for dynamic/WebGL API
	const hitTest = (other: Controller<any>) => {
		const ref1 = document.querySelector(
			`[data-controller-id="${data.id}"]`,
		) as HTMLElement
		const ref2 = document.querySelector(
			`[data-controller-id="${other.id}"]`,
		) as HTMLElement

		return isOverlapping(ref1, ref2)
	}
	const distanceTo = (x: number, y: number) => {
		return Math.hypot(data.x() - x, data.y() - y)
	}
	const direction = (x: number, y: number) => {
		return Math.atan2(y - data.y(), x - data.x())
	}
	// biome-ignore lint/suspicious/noExplicitAny: necessary for dynamic/WebGL API
	const attach = (controller: Controller<any>) => {
		setChildControllers([...childControllers(), controller])
	}

	const controller: Controller<CP> = {
		id: data.id,
		type: data.type,
		frames: options.frames,
		solid: options.solid ?? false,
		onEnterFrame: ($scene) => {
			const prevX = data.x()
			const prevY = data.y()

			onEnterFrame?.({
				$: data,
				$scene,
				$age: age(),
				$currentFrame: currentFrame(),
				$controller: controller,
			})

			if (options.blockedBySolid) {
				blockBySolidsRectPlayer(data, prevX, prevY)
			}
			setAge(age() + 1)

			for (const child of childControllers()) {
				child.onEnterFrame($scene)
			}
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
		sprite: () => sprite,
	}

	// One sprite for the controller's whole life, each of its values worked out
	// when it's read. A sprite then only redoes the parts that read whatever
	// changed: a runner moving doesn't recalculate their frames, their insides
	// or their name.
	const sprite: Sprite = {
		get frames() {
			return data?.frames?.() ?? options.frames ?? []
		},
		get frame() {
			return data?.frame?.()
		},
		randomStartFrame: options.randomStartFrame ?? false,
		get class() {
			return cx(options.class, data.class?.())
		},
		get style() {
			return { ...options.style, ...data.style?.() }
		},
		get x() {
			return data.x()
		},
		get y() {
			return data.y()
		},
		get origin() {
			return data.origin?.()
		},
		get xScale() {
			return data.xScale?.() ?? 1
		},
		get yScale() {
			return data.yScale?.() ?? 1
		},
		get width() {
			return data.width()
		},
		get height() {
			return data.height?.() ?? console.log(data.type) ?? 0
		},
		get parallax() {
			return data.parallax?.() ?? 1
		},
		get rotation() {
			return data.rotation?.() ?? 0
		},
		get state() {
			return data.state?.()
		},
		get frameInterval() {
			return data.frameInterval?.()
		},
		// Left for the sprite to call, so they're redrawn when something they
		// show changes rather than whenever the controller moves.
		children: data.children,
		get inner() {
			return {
				rotation: data.inner?.rotation?.(),
				origin: data.inner?.origin?.(),
				style: data.inner?.style?.(),
			}
		},
		onChangeFrame: (frame) => setCurrentFrame(frame),
		onMount: ({ $ref }) => {
			options.onMount?.({
				$: data,
				// biome-ignore lint/style/noNonNullAssertion: value guaranteed by surrounding logic
				$scene: data.scene!,
				$controller: controller,
				$currentFrame: currentFrame(),
				$ref: $ref,
			})
		},
		controllers: childControllers,
	}

	return controller
}

export function createConnectedController<
	// biome-ignore lint/suspicious/noExplicitAny: necessary for dynamic/WebGL API
	C extends Controller<any>,
	T extends {} = ControllerBaseType,
>(options: {
	type: string | ((baseType: string) => string)
	base: C
	frames?: ControllerProps<ExtractControllerType<C>>['frames']
	offset: Vector
	transformOrigin?: Vector
	origin?: Vector
	solid?: SolidRect
	width: ($: ExtractControllerType<C>) => number
	height: ($: ExtractControllerType<C>) => number
	x?: ($: ExtractControllerType<C>, $age: number) => number
	y?: ($: ExtractControllerType<C>, $age: number) => number
	xScale?: ($: ExtractControllerType<C>) => number
	rotation?: ($: ExtractControllerType<C>, $age: number) => number
	frameInterval?: ($: ExtractControllerType<C>) => number
	state?: ($: ExtractControllerType<C>) => Sprite['state']
	onEnterFrame?: ControllerProps<
		ExtractControllerType<Controller<T & ControllerBaseType>>
	>['onEnterFrame']
	frame?: ($: ExtractControllerType<C>) => number
	style?: ($: ExtractControllerType<C>) => JSX.CSSProperties
	randomStartFrame?: boolean
	init?: ($: ExtractControllerType<C>, $age: number) => T
}): Controller<T & ControllerBaseType> {
	// biome-ignore lint/suspicious/noExplicitAny: necessary for dynamic/WebGL API
	return createController<any>({
		frames: options.frames,
		randomStartFrame: options.randomStartFrame ?? false,
		init() {
			const baseData = options.base.data as ExtractControllerType<C>

			return {
				id: `${options.base.id}-${options.type}`,
				type:
					typeof options.type === 'function'
						? options.type(options.base.type)
						: `${options.base.type}-${options.type}`,

				x: () =>
					options.offset.x +
					(options.x ? options.x(baseData, options.base.age()) : 0),
				y: () =>
					options.offset.y +
					(options.y ? options.y(baseData, options.base.age()) : 0),
				rotation: () => options.rotation?.(baseData, options.base.age()) ?? 0,
				origin: () => ({
					x: options.origin?.x ?? 0,
					y: options.origin?.y ?? 0,
				}),
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
