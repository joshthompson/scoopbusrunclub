import { css } from "@style/css"
import { FieldBlock } from "@/components/FieldBlock"
import { JSX } from "solid-js"

interface RunnerSummaryStatProps {
  label: string
  children: JSX.Element
  type?: "number" | "text"
}

export function RunnerSummaryStat(props: RunnerSummaryStatProps) {
  return (
    <FieldBlock class={styles.stat}>
      <div class={styles.name}>{props.label}</div>
      <div class={props.type === "text" ? styles.text : styles.number}>{props.children}</div>
    </FieldBlock>
  )
}

const styles = {
  stat: css({
    textAlign: 'center',
    flex: '1',
    minWidth: '140px',
  }),
  name: css({
    mb: '0.5rem',
    fontSize: '1rem',
  }),
  number: css({
    fontSize: '3rem',
    lineHeight: '3rem',
  }),
  text: css({
    fontSize: '1rem',
    lineHeight: '1.5rem',
    minHeight: '3rem',
    '& > a': {
      fontSize: '1.2rem',
    },
  }),
}
