import { createMemo, For, Show } from "solid-js"
import { css } from "@style/css"
import { A } from "@solidjs/router"
import { type RunResultItem, type Runner } from "../utils/api"
import { MILESTONE_SET, UPCOMING_THRESHOLD, nextMilestone, ordinalSuffix } from "../utils/milestones"
import { formatName } from "@/utils/misc"
import { FloatingEmoji } from "./FloatingEmoji"
import { DirtBlock } from "./DirtBlock"
import { getMemberRoute } from "@/utils/memberRoute"

interface Props {
  runners: Runner[]
  results: RunResultItem[]
}

export function Milestones(props: Props) {
  const groups = createMemo(() => {
    const data = props.runners
    const results = props.results
    if (!data) return { celebrated: [], upcoming: [] }

    const celebrated: { name: string; parkrunId: string; milestone: number }[] = []
    const upcoming: { name: string; parkrunId: string; totalRuns: number; next: number; runsUntil: number }[] = []

    const latestDate = results.reduce((maxDate, item) => (item.date > maxDate ? item.date : maxDate), "")
    const latestEventRunnerIds = new Set(
      results
        .filter((item) => item.date === latestDate)
        .map((item) => item.parkrunId)
    )

    for (const r of data) {
      if (MILESTONE_SET.has(r.totalRuns) && latestEventRunnerIds.has(r.parkrunId)) {
        celebrated.push({ name: r.name, parkrunId: r.parkrunId, milestone: r.totalRuns })
      } else {
        const next = nextMilestone(r.totalRuns)
        if (next !== null && next - r.totalRuns <= UPCOMING_THRESHOLD) {
          upcoming.push({ name: r.name, parkrunId: r.parkrunId, totalRuns: r.totalRuns, next, runsUntil: next - r.totalRuns })
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
        <DirtBlock title="Milestones">
          <ul class={styles.list}>
            <For each={groups().celebrated}>
              {(row) => (
                <li class={styles.celebRow}>
                  <Show when={getMemberRoute(row.parkrunId, row.name)} fallback={<span>{formatName(row.name)}</span>}>
                    {(href) => <A href={href()} class={styles.memberLink}>{formatName(row.name)}</A>}
                  </Show> {ordinalSuffix(row.milestone)} run! <FloatingEmoji emoji="🎉" shadow />
                </li>
              )}
            </For>
          </ul>
        </DirtBlock>
      </Show>
      <Show when={groups().upcoming.length > 0}>
        <DirtBlock title="Upcoming Milestones">
          <ul class={styles.list}>
            <For each={groups().upcoming}>
              {(row) => (
                <li class={styles.row}>
                  <em>
                    <Show when={getMemberRoute(row.parkrunId, row.name)} fallback={<span>{formatName(row.name)}</span>}>
                      {(href) => <A href={href()} class={styles.memberLink}>{formatName(row.name)}</A>}
                    </Show>
                  </em>&nbsp;
                  {row.runsUntil} run{row.runsUntil === 1 ? "" : "s"} until{" "}
                  {row.next}
                </li>
              )}
            </For>
          </ul>
        </DirtBlock>
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
  }),
  celebRow: css({
    fontSize: "0.95rem",
    fontStyle: "normal",
    fontWeight: "bold",
  }),
  row: css({
    "& em": {
      fontStyle: "normal",
      fontWeight: "bold",
    },
  }),
  memberLink: css({
    color: 'inherit',
    textDecoration: 'underline',
  }),
}
