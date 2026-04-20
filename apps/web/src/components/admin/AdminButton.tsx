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
      border: "3px double var(--color-black)",
      background: "var(--overlay-black-15)",
      color: "var(--color-white)",
      cursor: "pointer",
      fontWeight: "bold",
      fontSize: "0.8rem",
      textTransform: "uppercase",
      borderRadius: "4px",
      cornerShape: "notch",
      _hover: { background: "var(--overlay-black-25)" },
      _disabled: { opacity: 0.5, cursor: "default", pointerEvents: "none" },
    },
    variants: {
      variant: {
        primary: {
          background: "var(--overlay-black-15)",
          border: "3px double var(--color-black)",
          _hover: { background: "var(--overlay-black-25)" },
        },
        secondary: {
          background: "var(--overlay-black-7)",
          border: "none",
          _hover: { background: "var(--overlay-black-20)" },
        },
        danger: {
          background: "var(--red-danger-light)",
          borderColor: "var(--error-red)",
          color: "var(--error-red)",
          _hover: { background: "var(--red-danger-light-hover)" },
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
