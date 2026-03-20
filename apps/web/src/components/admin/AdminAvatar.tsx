import { RunnerName, runners } from "@/data/runners";
import { css, cva } from "@style/css";
import { Show } from "solid-js";

const colours = [
  "#e57373", "#f06292", "#ba68c8", "#9575cd", "#7986cb",
  "#64b5f6", "#4fc3f7", "#4dd0e1", "#4db6ac", "#81c784",
  "#aed581", "#dce775", "#fff176", "#ffd54f", "#ffb74d",
  "#ff8a65", "#a1887f", "#e0e0e0", "#90a4ae",
];

export function AdminAvatar(props: { user: string, size?: "small" | "medium" | "large" | "huge", title?: string }) {
  const initial = () => props.user.charAt(0).toUpperCase()
  const colour = () => colours[props.user.charCodeAt(0) % colours.length]

  const face = () => runners[props.user as RunnerName]?.[0]().frames.face[0] ?? undefined

  return <div class={styles.avatar({ size: props.size })} style={{ background: colour() }} title={props.title}>
    <Show when={face()} fallback={initial()}>
      <img src={face()} class={styles.face} />
    </Show>
  </div>
}

const styles = {
  avatar: cva({
    base: {
      '--notch-size': "2px",
      width: "var(--avatar-size)",
      height: "var(--avatar-size)",
      display: "inline-flex",
      borderRadius: "var(--notch-size)",
      cornerShape: "notch",
      backgroundColor: "#ccc",
      color: "#fff",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "0.875rem",
      fontWeight: "bold",
      marginRight: "0.5rem",
    },
    variants: {
      size: {
        small: {
          '--avatar-size': "1em",
        },
        medium: {
          '--avatar-size': "1.5em",
        },
        large: {
          '--avatar-size': "2em",
        },
        huge: {
          '--avatar-size': "6em",
          '--notch-size': "10px",
        },
      },
    },
    defaultVariants: {
      size: "medium",
    },
  }),
  face: css({
    width: "auto",
    height: "calc(100% - var(--notch-size) * 2)",
  }),
}