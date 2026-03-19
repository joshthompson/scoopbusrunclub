import { css, cva, cx } from "@style/css"
import { JSX } from "solid-js/jsx-runtime"
import topLeft from '@/assets/dirt-block/top-left.png'
import top from '@/assets/dirt-block/top.png'
import topRight from '@/assets/dirt-block/top-right.png'
import bottomLeft from '@/assets/dirt-block/bottom-left.png'
import bottom from '@/assets/dirt-block/bottom.png'
import bottomRight from '@/assets/dirt-block/bottom-right.png'
import center from '@/assets/dirt-block/center.png'
import left from '@/assets/dirt-block/left.png'
import right from '@/assets/dirt-block/right.png'
import { Show } from "solid-js"
import { SignType, TitleSign } from "./TitleSign"

export function DirtBlock(props: {
  children: JSX.Element
  title?: string,
  class?: string,
  signType?: SignType
}) {
  return (
    <div class={cx(styles.dirtBlock, props.class)}>
      <Show when={props.title}>
        <TitleSign title={props.title!} type={props.signType} />
      </Show>
      <div class={styles.top} style={{ 'background-image': `url(${top})` }} />
      <div class={styles.topLeft} style={{ 'background-image': `url(${topLeft})` }} />
      <div class={styles.topRight} style={{ 'background-image': `url(${topRight})` }} />
      <div class={styles.center} style={{ 'background-image': `url(${center})` }} />
      <div class={styles.left} style={{ 'background-image': `url(${left})` }} />
      <div class={styles.right} style={{ 'background-image': `url(${right})` }} />
      <div class={styles.bottom} style={{ 'background-image': `url(${bottom})` }} />
      <div class={styles.bottomLeft} style={{ 'background-image': `url(${bottomLeft})` }} />
      <div class={styles.bottomRight} style={{ 'background-image': `url(${bottomRight})` }} />
      <div class={styles.content({ withTitle: !!props.title })}>{props.children}</div>
    </div>
  )
}

const styles = {
  dirtBlock: css({
    position: 'relative',
    display: 'flow-root',
  }),
  content: cva({
    base: {
      position: 'relative',
      zIndex: 10,
      m: '1rem',
      textAlign: 'center',
    },
    variants: {
      withTitle: {
        true: {
          mt: '2.5rem',
        },
      },
    },
  }),
  center: css({
    position: 'absolute',
    zIndex: 1,
    inset: '11px 2px 8px 2px',
  }),
  top: css({
    position: 'absolute',
    left: '107px',
    right: '107px',
    height: '11px',
  }),
  topLeft: css({
    position: 'absolute',
    zIndex: 3,
    top: 0,
    left: 0,
    width: '107px',
    height: '16px',
  }),
  topRight: css({
    position: 'absolute',
    zIndex: 3,
    top: '-2px',
    right: 0,
    width: '107px',
    height: '17px',
  }),
  bottom: css({
    position: 'absolute',
    left: '107px',
    right: '107px',
    bottom: 0,
    height: '8px',
  }),
  bottomLeft: css({
    position: 'absolute',
    zIndex: 3,
    bottom: 0,
    left: 0,
    width: '107px',
    height: '9px',
  }),
  bottomRight: css({
    position: 'absolute',
    zIndex: 3,
    bottom: 0,
    right: 0,
    width: '107px',
    height: '9px',
  }),
  left: css({
    position: 'absolute',
    left: 0,
    bottom: '9px',
    top: '17px',
    width: '2px',
  }),
  right: css({
    position: 'absolute',
    zIndex: 2,
    right: 0,
    bottom: '9px',
    top: '16px',
    width: '2px',
  }),
}