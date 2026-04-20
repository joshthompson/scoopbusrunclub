import { css, cva, cx } from "@style/css"
import { JSX } from "solid-js"

interface AdminInputProps {
  label?: string;
  size?: "small" | "medium";
  width?: string;
  fullWidth?: boolean;
}

export function AdminInput(props: JSX.InputHTMLAttributes<HTMLInputElement> & AdminInputProps) {
  return <label class={cx(styles.label({ fullWidth: props.fullWidth }), props.class)}>
    {props.label}{props.required ? " *" : ""}
    <input
      class={styles.input({ size: props.size, fullWidth: props.fullWidth })}
      type="text"
      style={{ width: props.width ?? undefined }}
      {...props}
    />
  </label>
}

const styles = {
  label: cva({
    base: {
      display: "flex",
      flexDirection: "column",
      gap: "0.25rem",
      fontSize: "0.8rem",
      fontWeight: "bold",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
    },
    variants: {
      fullWidth: {
        true: {
          width: "100%",
        },
      },
    },
    defaultVariants: {
      fullWidth: false,
    },
  }),
  input: cva({
    base: {
      border: "2px solid var(--dirt-darker-brown)",
      cornerShape: "notch",
      borderRadius: "4px",
      background: "var(--overlay-black-30)",
      color: "var(--color-white)",
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
      fullWidth: {
        true: {
          width: "100%",
        },
      },
    },
    defaultVariants: {
      size: "medium",
      fullWidth: false,
    },
  }),
}
