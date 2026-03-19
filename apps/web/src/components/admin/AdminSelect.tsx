import { css, cva } from "@style/css";
import { JSX } from "solid-js";

interface AdminSelectProps {
  label?: string;
  size?: "small" | "medium";
  width?: string;
}

export function AdminSelect(props: JSX.SelectHTMLAttributes<HTMLSelectElement> & AdminSelectProps) {
  return <label class={styles.label}>
    {props.label}{props.required ? " *" : ""}
    <select
      class={styles.select({ size: props.size })}
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
  select: cva({
    base: {
      appearance: "none",
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

/**
 * 
  select: css({
    padding: "0.25rem 0.5rem",
    border: "2px solid rgba(255,255,255,0.3)",
    borderRadius: "4px",
    background: "rgba(0,0,0,0.4)",
    color: "#fff",
    fontSize: "0.8rem",
    outline: "none",
    cursor: "pointer",
  }),
  select: css({
    padding: "0.5rem 0.75rem",
    border: "2px solid rgba(255,255,255,0.3)",
    borderRadius: "4px",
    background: "rgba(0,0,0,0.4)",
    color: "#fff",
    fontSize: "0.875rem",
    outline: "none",
    cursor: "pointer",
    flexGrow: 1,
    width: '10px',
    maxWidth: "400px",
  }),

  typeSelect: css({
    border: "2px solid var(--dirt-darker-brown)",
    borderRadius: "4px",
    background: "rgba(0,0,0,0.3)",
    color: "#fff",
    fontSize: "0.875rem",
    padding: "0.5rem 0.75rem",
    outline: "none",
    _focus: { background: "var(--dirt-dark-brown)" },
    '& optgroup': { fontWeight: "bold" },
  }),
 */
