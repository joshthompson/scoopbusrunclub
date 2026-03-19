import { css, cva } from "@style/css";
import { JSX } from "solid-js";

export function AdminButton(props: {
  children: JSX.Element;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  size?: "small" | "medium" | "large";
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}) {
  return (
    <button
      type={props.type ?? "button"}
      class={styles.button({ variant: props.variant, size: props.size })}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {props.children}
    </button>
  );
}

const styles = {
  button: cva({
    base: {
      padding: "0.5rem 1.25rem",
      border: "3px double #000",
      background: "rgba(0,0,0,0.15)",
      color: "#FFF",
      cursor: "pointer",
      fontWeight: "bold",
      fontSize: "0.8rem",
      textTransform: "uppercase",
      borderRadius: "4px",
      cornerShape: "notch",
      _hover: { background: "rgba(0,0,0,0.25)" },
      _disabled: { opacity: 0.5, cursor: "default", pointerEvents: "none" },
    },
    variants: {
      variant: {
        primary: {
          background: "rgba(0,0,0,0.15)",
          border: "3px double #000",
          _hover: { background: "rgba(0,0,0,0.25)" },
        },
        secondary: {
          background: "rgba(0,0,0,0.07)",
          border: "none",
          _hover: { background: "rgba(0,0,0,0.2)" },
        },
        danger: {
          background: "rgba(255, 100, 100, 0.15)",
          borderColor: "var(--error-red)",
          color: "var(--error-red)",
          _hover: { background: "rgba(255, 100, 100, 0.25)" },
        },
      },
      size: {
        small: { fontSize: "0.75rem", padding: "0.1rem 0.8rem", },
        medium: {},
        large: { fontSize: "0.9rem", padding: "0.75rem 1.5rem" },
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "medium",
    },
  }),
}
