import { css, cva } from "@style/css"
import { JSX } from "solid-js"

interface CheckboxProps {
  label: string;
  checked?: boolean;
  variant?: "dirt" | "green";
}

export function Checkbox(props: JSX.HTMLAttributes<HTMLInputElement> & CheckboxProps) {
  return <label class={styles.toggleLabel}>
    <input
      class={styles.checkbox({ variant: props.variant || "dirt" })}
      {...props}
      type="checkbox"
    />
    {props.label}
  </label>
}

const styles = {
  toggleLabel: css({
    color: "#fff",
    fontSize: "0.875rem",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    cursor: "pointer",
  }),
  checkbox: cva({
    base: {
      width: "20px",
      height: "20px",
      cornerShape: "notch",
      borderRadius: "2px",
      cursor: "pointer",
      border: '2px solid var(--outer-color)',
      appearance: "none",
      background: "var(--inner-color)",
      color: "#fff",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: '"Jersey 10", sans-serif',
      fontSize: "14px",
      _checked: {
        background: "var(--inner-color)",
        
        _after: {
          content: '"✔"',
          translate: "0px 0.5px",
        },
      },

      _hover: {
        background: "var(--inner-color)",
      },
    },
    variants: {
      variant: {
        dirt: {
          '--outer-color': 'var(--dirt-darker-brown)',
          '--inner-color': 'var(--dirt-dark-brown)',
        },
        green: {
          '--outer-color': 'var(--grass-darker-green)',
          '--inner-color': 'var(--grass-dark-green)',
        },
      },
    },
  }),
}