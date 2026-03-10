import { createMemo, For, Show } from "solid-js"
import { css } from "@style/css"
import { type Runner } from "../utils/api"
import { FieldBlock } from "./FieldBlock"
import { MILESTONE_SET, UPCOMING_THRESHOLD, nextMilestone, ordinalSuffix } from "../utils/milestones"
import { formatName } from "@/utils/misc"
import { FloatingEmoji } from "./FloatingEmoji"

interface Props {
  runners: Runner[]
}

export function Milestones(props: Props) {
  const groups = createMemo(() => {
    const data = props.runners
    if (!data) return { celebrated: [], upcoming: [] }

    const celebrated: { name: string; milestone: number }[] = []
    const upcoming: { name: string; totalRuns: number; next: number; runsUntil: number }[] = []

    for (const r of data) {
      if (MILESTONE_SET.has(r.totalRuns)) {
        celebrated.push({ name: r.name, milestone: r.totalRuns })
      } else {
        const next = nextMilestone(r.totalRuns)
        if (next !== null && next - r.totalRuns <= UPCOMING_THRESHOLD) {
          upcoming.push({ name: r.name, totalRuns: r.totalRuns, next, runsUntil: next - r.totalRuns })
        }
      }
    }

    celebrated.sort((a, b) => b.milestone - a.milestone)
    upcoming.sort((a, b) => a.runsUntil - b.runsUntil)

    return { celebrated, upcoming }
  })

  return (
    <>
      <Show when={groups().celebrated.length > 0}>
        <FieldBlock title="Milestones!">
          <ul class={styles.list}>
            <For each={groups().celebrated}>
              {(row) => (
                <li class={styles.celebRow}>
                  {formatName(row.name)} {ordinalSuffix(row.milestone)} run! <FloatingEmoji emoji="🎉" shadow />
                </li>
              )}
            </For>
          </ul>
        </FieldBlock>
      </Show>
      <Show when={groups().upcoming.length > 0}>
        <FieldBlock title="Upcoming Milestones">
          <ul class={styles.list}>
            <For each={groups().upcoming}>
              {(row) => (
                <li class={styles.row}>
                  <em>{formatName(row.name)}</em>&nbsp;
                  {row.runsUntil} run{row.runsUntil === 1 ? "" : "s"} until{" "}
                  {row.next}
                </li>
              )}
            </For>
          </ul>
        </FieldBlock>
      </Show>
    </>
  )
}

const styles = {
  wrapper: css({
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  }),
  section: css({
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  }),
  sectionHeading: css({
    fontWeight: "bold",
    textTransform: "uppercase",
    margin: 0,
  }),
  list: css({
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
    textAlign: "center",
  }),
  celebRow: css({
    fontSize: "0.95rem",
    textAlign: "center",
    fontStyle: "normal",
    fontWeight: "bold",
  }),
  row: css({
    "& em": {
      fontStyle: "normal",
      fontWeight: "bold",
    },
  }),
}
