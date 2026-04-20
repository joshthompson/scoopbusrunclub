import { css, cx } from "@style/css"
import { JSX } from "solid-js"

interface ButtonProps {
  children: JSX.Element
  class?: string
  onClick?: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>
  type?: "button" | "submit" | "reset"
}

export function Button(props: ButtonProps) {
  return (
    <button type={props.type ?? "button"} class={cx(styles.button, props.class)} onClick={props.onClick}>
      {props.children}
    </button>
  )
}

const styles = {
  button: css({
    alignSelf: 'center',
    padding: '0.5rem 1.5rem',
    border: '3px double currentColor',
    background: 'transparent',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '1rem',
    textTransform: 'uppercase',
    cornerShape: 'notch',
    borderRadius: '4px',
    _hover: {
      background: 'var(--overlay-white-10)',
    },
  }),
}
