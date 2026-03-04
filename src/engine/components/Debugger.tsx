import { Scene } from "@/engine";
import { CorgiController } from "@/game/freediver/controllers/CorgiController";
import { DiverController } from "@/game/freediver/controllers/DiverController";
import { css, cx } from "@style/css";
import { Component, createSignal, onCleanup, Show } from "solid-js";

export const Debugger: Component<{ scene: Scene }> = props => {
  const [rendered, setRendered] = createSignal(0)

  const interval = setInterval(() => {
    setRendered(document.querySelectorAll('[data-controller-id]').length)
  }, 50)

  onCleanup(() => clearInterval(interval))

  const diver = () => props.scene.getControllerById<DiverController>('diver')
  const corgi = () => props.scene.getControllerById<CorgiController>('corgi')

  const setX = () => {
    const currentX = diver()?.data.x().toString() ?? '0'
    const newX = prompt('Set X', currentX) ?? currentX
    diver()?.data.setX(parseFloat(newX))
    corgi()?.data.setX(parseFloat(newX) + 50)
  }

  return <div class={cx(styles.debugger, 'group')}>
    <div>
      <div>Controllers:</div>
      <div>{Object.keys(props.scene.controllers.get()).length}</div>
      <div>Rendered:</div>
      <div>{rendered()}</div>
      <div>Assets Loaded:</div>
      <div>{props.scene.loadingAssetCount.get()} / {props.scene.loadingAssetTotal.get()}</div>
      <div>Canvas:</div>
      <div>
        {Math.round(props.scene.canvas.get().x())},
        {Math.round(props.scene.canvas.get().y())}
      </div>
      <Show when={diver()}>
        <div class={styles.actions}>
          <button class={styles.action} onClick={setX}>
            Set X
          </button>
        </div>
      </Show>
    </div>
  </div>
}

const styles = {
  debugger: css({
    position: 'absolute',
    display: 'grid',
    gridTemplateColumns: 'auto auto',
    gap: '0 2rem',
    top: '10px',
    left: '10px',
    width: 'max-content',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    fontSize: '12px',
    overflowY: 'auto',
    p: '10px',
    zIndex: 1000,

    '& > div': {
      display: 'contents',
    },
  }),

  actions: css({
    display: 'none',

    _groupHover: {
      display: 'block',
    }
  }),
  action: css({
    background: 'white',
    color: '#000',
    borderRadius: '3px',
    width: 'auto',
    px: '5px',
  }),
}
