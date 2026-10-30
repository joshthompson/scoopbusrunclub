import { css } from '@style/css'
import {
	type Accessor,
	type Component,
	For,
	type JSX,
	type Setter,
	onCleanup,
	onMount,
} from 'solid-js'
import { SceneContext } from '../../utils/SceneContext'
import type { Controller } from '../Controller'
import type { Scene } from '../Scene'
import { Modal } from './Modal'
import { ControllerSprite } from './Sprite'

// biome-ignore lint/suspicious/noExplicitAny: necessary for dynamic/WebGL API
export type CanvasControllers = { id: string; controller: Controller<any> }[]

export interface CanvasProps {
	ref?: HTMLDivElement | undefined
	scene: Scene
	loading?: Component<{ scene: Scene }>
	dialog?: Component<{ scene: Scene }>
	overlay?: JSX.Element
	underlay?: JSX.Element
	style?: JSX.CSSProperties
	class?: string
	onClick?: (event: Vector) => void
	onMouseDown?: (event: Vector) => void
	onMouseUp?: (event: Vector) => void
}

export interface Canvas<T extends CanvasControllers = CanvasControllers> {
	width: Accessor<number>
	setWidth: Setter<number>
	height: Accessor<number>
	setHeight: Setter<number>
	x: Accessor<number>
	setX: Setter<number>
	y: Accessor<number>
	setY: Setter<number>
	controllers: Accessor<T>
}

export function Canvas<T extends CanvasControllers = CanvasControllers>(
	props: CanvasProps,
) {
	let element: HTMLDivElement | undefined

	// The scene only runs while some of it is on the screen, not while it's
	// scrolled away.
	onMount(() => {
		const observer = new IntersectionObserver(([entry]) =>
			props.scene.visible.set(entry.isIntersecting),
		)
		if (element) observer.observe(element)
		onCleanup(() => observer.disconnect())
	})

	// The scene goes with its canvas: otherwise its tick carries on running for
	// as long as the page is open, long after anyone can see it.
	onCleanup(() => {
		for (const { controller } of props.scene.controllers.get()) {
			controller.destroy()
		}
		props.scene.destroy()
	})

	const sprites = () => {
		const assetOrder = props.scene.options.assetOrder?.flat() ?? []
		return props.scene.controllers
			.get()
			.map(({ controller }) => controller)
			.toSorted((a, b) => {
				const aP = assetOrder.findIndex((type) => type === a.type)
				const bP = assetOrder.findIndex((type) => type === b.type)
				return bP - aP
			})
	}

	const getMousePosition = (event: MouseEvent | TouchEvent) => {
		const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect()
		const x =
			(event instanceof MouseEvent
				? event.clientX - rect.left
				: event.touches[0].clientX - rect.left) + props.scene.canvas.get().x()
		const y =
			(event instanceof MouseEvent
				? event.clientY - rect.top
				: event.touches[0].clientY - rect.top) + props.scene.canvas.get().y()
		return { x, y }
	}

	const handleClick = (e: MouseEvent) => props.onClick?.(getMousePosition(e))
	const handleTouchStart = (e: TouchEvent) => {
		props.onClick?.(getMousePosition(e))
		props.onMouseDown?.(getMousePosition(e))
	}
	const handleTouchEnd = (e: TouchEvent) => {
		props.onClick?.(getMousePosition(e))
		props.onMouseUp?.(getMousePosition(e))
	}
	const handleMouseDown = (e: MouseEvent) =>
		props.onMouseDown?.(getMousePosition(e))
	const handleMouseUp = (e: MouseEvent) =>
		props.onMouseUp?.(getMousePosition(e))

	return (
		<SceneContext.Provider value={props.scene}>
			<div
				ref={(el) => {
					element = el
					props.ref = el
				}}
				data-game-scene={props.scene.id}
				class={styles.canvas}
				style={{
					width: `${props.scene.canvas.get().width()}px`,
					height: `${props.scene.canvas.get().height()}px`,
					...props.style,
				}}
				onClick={handleClick}
				onKeyDown={handleClick}
				onTouchStart={handleTouchStart}
				onTouchEnd={handleTouchEnd}
				onMouseDown={handleMouseDown}
				onMouseUp={handleMouseUp}
			>
				{props.underlay}
				<For each={sprites()}>
					{(controller) => (
						<ControllerSprite
							controller={controller}
							active={props.scene.isActive()}
						/>
					)}
				</For>
				{props.dialog && <props.dialog scene={props.scene} />}
				{props.scene.modal.get() && <Modal>{props.scene.modal.get()}</Modal>}
				{props.overlay}
				{props.loading && props.scene.loading.get() && (
					<props.loading scene={props.scene} />
				)}
			</div>
		</SceneContext.Provider>
	)
}

const styles = {
	canvas: css({
		position: 'relative',
		overflow: 'hidden',
		background: 'var(--color-white)',
	}),
}
