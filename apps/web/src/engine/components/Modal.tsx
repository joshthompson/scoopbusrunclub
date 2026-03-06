import { css } from '@style/css'
import { Component, JSX } from 'solid-js'

export const Modal: Component<{ children: JSX.Element }> = props => {
  return <div class={styles.background}>
    <div class={styles.modal} children={props.children} />
  </div>
}

const styles = {
  background: css({
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    background: '#00000088',
  }),
  modal: css({
    position: 'absolute',
    top: '50%',
    left: '1rem',
    right: '1rem',
    transform: 'translateY(-50%)',
    borderRadius: '2rem',
    overflow: 'hidden',
  }),
}
