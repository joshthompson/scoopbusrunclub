import { css, cva } from "@style/css"
import { JSX } from "solid-js"

interface AdminInputProps {
  label?: string;
  size?: "small" | "medium";
  width?: string;
}

export function AdminInput(props: JSX.InputHTMLAttributes<HTMLInputElement> & AdminInputProps) {
  return <label class={styles.label}>
    {props.label}{props.required ? " *" : ""}
    <input
      class={styles.input({ size: props.size })}
      type="text"
      style={{ width: props.width ?? undefined }}
      {...props}
    />
  </label>
}

const styles = {
  label: css({
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    fontSize: "0.8rem",
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  }),
  input: cva({
    base: {
      border: "2px solid var(--dirt-darker-brown)",
      cornerShape: "notch",
      borderRadius: "4px",
      background: "rgba(0,0,0,0.3)",
      color: "#fff",
      outline: "none",
      _focus: { background: "var(--dirt-dark-brown)" },
    },
    variants: {
      size: {
        small: {
          fontSize: "0.75rem",
          padding: "0.2rem 0.5rem",
          borderRadius: "2px",
          borderWidth: "1px",
        },
        medium: {
          fontSize: "0.875rem",
          padding: "0.5rem 0.75rem",
        },
      },
    },
    defaultVariants: {
      size: "medium",
    },
  }),
}
