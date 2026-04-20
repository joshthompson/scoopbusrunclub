import { Accessor, Component, For, JSX, onCleanup, Setter } from 'solid-js'
import { css } from '@style/css'
import { Sprite } from './Sprite'
import { Modal } from './Modal'
import { Scene } from '../Scene'
import { Controller } from '../Controller'
import { SceneContext } from '../../utils/SceneContext'

export type CanvasControllers = { id: string, controller: Controller<any> }[]

export interface CanvasProps {
  ref?: HTMLDivElement | undefined
  scene: Scene
  loading?: Component<{ scene: Scene }>
  dialog?: Component<{ scene: Scene }>
  overlay?: JSX.Element
  underlay?: JSX.Element
  style?: JSX.CSSProperties
  class?: String
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
  onCleanup(() => {
    props.scene.controllers.get().forEach(({ controller }) =>
      controller.destroy(),
    )
  })

  const sprites = () => {
    const assetOrder = props.scene.options.assetOrder?.flat() ?? []
    return props.scene.controllers.get()
      .map(({ controller }) => controller)
      .toSorted((a, b) => {
        const aP = assetOrder.findIndex(type => type === a.type)
        const bP = assetOrder.findIndex(type => type === b.type)
        return bP - aP
      })
  }

  const getMousePosition = (event: MouseEvent | TouchEvent) => {
    const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect()
    const x = (event instanceof MouseEvent
      ? event.clientX - rect.left
      : event.touches[0].clientX - rect.left) + props.scene.canvas.get().x()
    const y = (event instanceof MouseEvent
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
  const handleMouseDown = (e: MouseEvent) => props.onMouseDown?.(getMousePosition(e))
  const handleMouseUp = (e: MouseEvent) => props.onMouseUp?.(getMousePosition(e))

  return (
    <SceneContext.Provider value={props.scene}>
      <div
        ref={props.ref}
        data-game-scene={props.scene.id}
        class={styles.canvas}
        style={{
          width: `${props.scene.canvas.get().width()}px`,
          height: `${props.scene.canvas.get().height()}px`,
          ...props.style,
        }}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        {props.underlay}
        <For each={sprites()}>
          {controller => <Sprite
            {...controller.sprite()}
            id={controller.id}
            type={controller.type}
            active={props.scene.isActive()}
          />}
        </For>
        {props.dialog && <props.dialog scene={props.scene} />}
        {props.scene.modal.get() && <Modal>{props.scene.modal.get()}</Modal>}
        {props.overlay}
        {props.loading && props.scene.loading.get() && <props.loading scene={props.scene} />}
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
