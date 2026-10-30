import { SceneContext } from '@/utils/SceneContext'
import { seasonalAsset } from '@/utils/halloween'
import { css, cx } from '@style/css'
import {
	type Accessor,
	type Component,
	Index,
	type JSX,
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
	onMount,
	useContext,
} from 'solid-js'
import type { Controller } from '../Controller'

export interface Sprite {
	ref?: HTMLDivElement | undefined
	frames: string[]
	frame?: number
	randomStartFrame?: boolean
	x: number
	y: number
	xScale?: number
	yScale?: number
	state?: 'play' | 'pause' | undefined
	width: number
	height: number
	class?: string
	style?: JSX.CSSProperties
	frameInterval?: number | Accessor<number>
	rotation?: number
	origin?: Vector
	inner?: {
		rotation?: number
		origin?: Vector
		style?: JSX.CSSProperties
	}
	parallax?: number
	/**
	 * Drawn inside the sprite. A function is called by the sprite itself, and
	 * again whenever a signal it reads changes, but not on the sprite moving.
	 */
	children?: JSX.Element | (() => JSX.Element)
	onClick?: () => void
	onChangeFrame?: (frameIndex: number) => void
	onMount?: (data: { $ref: HTMLDivElement | undefined }) => void
	// biome-ignore lint/suspicious/noExplicitAny: necessary for dynamic/WebGL API
	controllers?: Accessor<Controller<any>[]>
}

interface SpriteExtendedProps {
	active?: boolean
	id?: string
	type?: string
	fixed?: boolean
}

export const Sprite: Component<Sprite & SpriteExtendedProps> = (props) => {
	const scene = useContext(SceneContext)
	if (!scene) return

	let ref: HTMLDivElement

	const [currentFrame, setCurrentFrame] = createSignal(
		props.randomStartFrame
			? Math.floor(Math.random() * props.frames.length)
			: 0,
	)
	createEffect(() => props.onChangeFrame?.(currentFrame()))
	createEffect(
		() => typeof props.frame === 'number' && setCurrentFrame(props.frame),
	)
	const frames = createMemo(() =>
		props.frames.map((frame) => {
			// Every sprite goes through here, so this is where the whole canvas
			// picks up its `-halloween` and `-snow` asset variants (a no-op for
			// assets without one).
			const image = seasonalAsset(frame.split('#')[0])
			const [left, top, width, height] = frame
				.split('#')[1]
				?.split(',')
				.map(Number) ?? [0, 0, 0, 0]
			return {
				image,
				left,
				top,
				width,
				height,
			}
		}),
	)

	const frameStyle = createMemo(() => {
		const frame = frames()[currentFrame()]
		if (!frame) return {}
		return {
			'background-image': `url(${frame.image})`,
			'background-position': `${frame.left}px ${frame.top}px`,
			'background-size':
				frame.width && frame.height ? 'auto 100%' : '100% 100%',
		}
	})

	// Stepped through on the scene's tick, so a sprite changes frame in the same
	// update as it moves. The time a frame's been showing carries over from tick
	// to tick, so a frame interval that isn't a whole number of ticks still
	// comes out right on average.
	let shown = 0
	const animate = () => {
		if (
			props.active === false ||
			props.state !== 'play' ||
			!props.frames.length
		)
			return
		const interval =
			typeof props.frameInterval === 'function'
				? props.frameInterval()
				: (props.frameInterval ?? 100)
		// An infinite interval is a sprite that never changes frame, like the
		// scenery.
		if (!Number.isFinite(interval) || interval <= 0) return
		shown += scene.frameRate
		const steps = Math.floor(shown / interval)
		if (!steps) return
		shown -= steps * interval
		setCurrentFrame((prev) => (prev + steps) % props.frames.length)
	}
	scene.tickers.add(animate)

	// The same children from one move to the next, so they're only drawn again
	// when they're swapped for others, or when a function's signals change.
	const children = createMemo(() => props.children)
	const content = () => {
		const drawn = children()
		return typeof drawn === 'function' ? drawn() : drawn
	}

	onMount(() => props.onMount?.({ $ref: ref }))
	onCleanup(() => scene.tickers.delete(animate))

	const top = createMemo(() => {
		if (props.fixed) return `${props.y}px`
		return `${props.y - 0 * (props.parallax ?? 1)}px`
	})

	const left = createMemo(() => {
		if (props.fixed) return `${props.x}px`
		return `${props.x - scene.canvas.get().x() * (props.parallax ?? 1)}px`
	})

	return (
		<div
			data-controller-id={props.id}
			data-controller-type={props.type}
			ref={(el) => {
				ref = el
				props.ref = el
			}}
			class={cx(styles.sprite, props.class)}
			style={{
				top: top(),
				left: left(),
				transform: `scale(${(props.xScale ?? 1).toString()}, ${(props.yScale ?? 1).toString()})`,
				width: `${props.width}px`,
				height: `${props.height}px`,
				'pointer-events': props.onClick ? 'auto' : 'none',
				rotate: `${props.rotation}deg`,
				'transform-origin': props.origin
					? `${props.origin.x}px ${props.origin.y}px`
					: 'center',
				...props.style,
			}}
			onClick={props.onClick}
			onKeyDown={props.onClick}
			onTouchStart={props.onClick}
		>
			<div
				style={{
					width: '100%',
					height: '100%',
					rotate: `${props.inner?.rotation}deg`,
					'transform-origin': props.inner?.origin
						? `${props.inner.origin.x}px ${props.inner.origin.y}px`
						: 'center',
					...frameStyle(),
					// After the frame's own, so a controller can draw a frame some
					// other way: at its own size, say, rather than stretched to fit.
					...(props.inner?.style ?? {}),
				}}
			>
				{content()}
			</div>
			<Index each={props.controllers?.() ?? []}>
				{(controller) => (
					<ControllerSprite
						controller={controller()}
						active={props.active}
						fixed
					/>
				)}
			</Index>
		</div>
	)
}

/**
 * A controller drawn as a sprite. Its `sprite()` is the same object every
 * time, with getters, so each part of the sprite only follows the values it
 * reads itself.
 */
export function ControllerSprite(props: {
	// biome-ignore lint/suspicious/noExplicitAny: necessary for dynamic/WebGL API
	controller: Controller<any>
	active?: boolean
	fixed?: boolean
}) {
	return (
		<Sprite
			{...props.controller.sprite()}
			id={props.controller.id}
			type={props.controller.type}
			active={props.active}
			fixed={props.fixed}
		/>
	)
}

const styles = {
	sprite: css({
		position: 'absolute',
		top: 0,
		left: 0,
	}),
}
