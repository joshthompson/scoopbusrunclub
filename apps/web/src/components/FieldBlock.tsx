import { css, cx } from "@style/css"
import { JSX } from "solid-js/jsx-runtime"

import edgeN from '@/assets/block/edge-n.png'
import edgeE from '@/assets/block/edge-e.png'
import edgeS from '@/assets/block/edge-s.png'
import edgeW from '@/assets/block/edge-w.png'
import cornerNW from '@/assets/block/corner-nw.png'
import cornerNE from '@/assets/block/corner-ne.png'
import cornerSE from '@/assets/block/corner-se.png'
import cornerSW from '@/assets/block/corner-sw.png'
import center from '@/assets/block/center.png'
import sign from '@/assets/misc/sign.png'
import { Show } from "solid-js"

export function FieldBlock(props: {
  children: JSX.Element
  title?: string,
  class?: string
}) {
  return (
    <div class={cx(styles.fieldBlock, props.class)}>
      <Show when={props.title}>
        <div class={styles.sign} style={{ 'background-image': `url(${sign})` }}>
          <div class={styles.signInner}>{props.title}</div>
        </div>
      </Show>
      <div style={{ 'background-image': `url(${cornerNW})` }} />
      <div style={{ 'background-image': `url(${edgeN})` }} />
      <div style={{ 'background-image': `url(${cornerNE})` }} />
      <div style={{ 'background-image': `url(${edgeW})` }} />
      <div style={{ 'background-image': `url(${center})` }} class={cx(props.title && styles.center)}>{props.children}</div>
      <div style={{ 'background-image': `url(${edgeE})` }} />
      <div style={{ 'background-image': `url(${cornerSW})` }} />
      <div style={{ 'background-image': `url(${edgeS})` }} />
      <div style={{ 'background-image': `url(${cornerSE})` }} />
    </div>
  )
}

const styles = {
  // Panda classes
  fieldBlock: css({
    position: 'relative',
    display: 'grid',
    gridTemplateColumns: '22px 1fr 22px',
    gridTemplateRows: '22px 1fr 22px',
  }),
  sign: css({
    position: 'absolute',
    top: '-2rem',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '16px',
    lineHeight: '16px',
    height: '75px',
    backgroundSize: '36px 75px',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    fontFamily: '"Pixelify Sans", sans-serif',
    fontOpticalSizing: 'auto',
    fontWeight: 400,
    fontStyle: 'normal',
  }),
  signInner: css({
    background: '#bd9359',
    display: 'inline-block',
    padding: '0.1rem 0.75rem',
    mt: '12px',
    textAlign: 'center',
    py: '4px',
  }),
  center: css({
    pt: '30px',
  }),
}