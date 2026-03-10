import { css, cva } from "@style/css"

export function FloatingEmoji(props: { emoji: string, shadow?: boolean }) {
  return <div class={styles.emoji({ hasShadow: props.shadow })}>
    <div class={styles.float({ hasShadow: props.shadow })}>{props.emoji}</div>
  </div>
}

const styles = {
  emoji: cva({
    base: {
      position: "relative",
      display: "inline-block",
    },
    variants: {
      hasShadow: {
        true: {
          _after: {
            content: "''",
            position: "absolute",
            height: '10px',
            borderRadius: '50%',
            background: 'black',
            transform: 'scale(1, 0.5)',
            animation: "floatShadow 2s ease-in-out infinite",
            left: 0,
            right: 0,
            bottom: 0,
          },
        },
      },
    },
  }),
  float: cva({
    base: {
      animation: "buldge 2s ease-in-out infinite",
    },
    variants: {
      hasShadow: {
        true: { animation: "float 2s ease-in-out infinite" },
      },
    },
  }),
}
