import { JSX } from "solid-js";
import { DirtBlock } from "@/components/ui/DirtBlock";
import { css } from "@style/css/css";

export function Modal(props: {
  title: string;
  onClose?: () => void
  children: JSX.Element
  maxWidth?: string
}) {
  const maxWidth = () => props.maxWidth ? props.maxWidth : undefined
  return <div
    class={styles.overlay}
    onClick={(e) => e.target === e.currentTarget && props.onClose?.()}
  >
    <div class={styles.modal} style={{ "max-width": maxWidth() }}>
      <DirtBlock title={props.title}>
        <div class={styles.content}>{props.children}</div>
      </DirtBlock>
    </div>
  </div>
}

const styles = {
  overlay: css({
    position: "fixed",
    inset: 0,
    background: "var(--overlay-black-60)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "1rem",
  }),
  modal: css({
    width: "100%",
    maxWidth: "380px",
  }),
  content: css({
    maxHeight: "calc(100dvh - 170px)",
    overflowY: "auto",
  }),
}
