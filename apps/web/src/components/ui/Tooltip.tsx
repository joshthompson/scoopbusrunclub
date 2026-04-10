import { css } from "@style/css";
import { type JSX, createSignal, Show } from "solid-js";
import { Portal } from "solid-js/web";

export function Tooltip(props: {
  content: JSX.Element;
  children: JSX.Element;
}) {
  const [visible, setVisible] = createSignal(false);
  const [pos, setPos] = createSignal({ x: 0, y: 0 });
  let ref: HTMLSpanElement | undefined;

  const updatePos = () => {
    if (!ref) return;
    const rect = ref.getBoundingClientRect();
    setPos({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  return (
    <span
      ref={ref}
      class={styles.wrapper}
      onMouseEnter={() => {
        updatePos();
        setVisible(true);
      }}
      onMouseLeave={() => setVisible(false)}
    >
      {props.children}
      <Show when={visible()}>
        <Portal>
          <div
            class={styles.tooltip}
            style={{
              left: `${pos().x}px`,
              top: `${pos().y}px`,
            }}
          >
            {props.content}
          </div>
        </Portal>
      </Show>
    </span>
  );
}

const styles = {
  wrapper: css({
    display: "inline-block",
    position: "relative",
  }),
  tooltip: css({
    position: "fixed",
    transform: "translate(-50%, calc(-100% - 6px))",
    background: "black",
    color: "white",
    padding: "4px 8px",
    borderRadius: "4px",
    cornerShape: "notch",
    fontSize: "12px",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    zIndex: 9999,
  }),
};
