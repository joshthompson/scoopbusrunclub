import { css } from "@style/css";
import { JSX } from "solid-js";

export function AdminToolbar(props: { children: JSX.Element }) {
  return <div class={styles.toolbar}>{props.children}</div>
}

const styles = {
  toolbar: css({
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    marginBottom: "1rem",

    '@media (max-width: 800px)': {
      marginBottom: "3rem",
    },
  }),
}