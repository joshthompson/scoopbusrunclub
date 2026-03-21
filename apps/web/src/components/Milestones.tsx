import { createMemo, For, Show } from "solid-js"
import { css } from "@style/css"
import { A } from "@solidjs/router"
import { type RunResultItem, type Runner } from "../utils/api"
import { MILESTONE_SET, UPCOMING_THRESHOLD, nextMilestone, ordinalSuffix } from "../utils/milestones"
import { formatDate, formatName } from "@/utils/misc"
import { Emoji } from "@/components/ui/Emoji"
import { DirtBlock } from "@/components/ui/DirtBlock"
import { getMemberRoute } from "@/utils/memberRoute"

const DAY_MS = 24 * 60 * 60 * 1000

function parseIsoDate(isoDate: string): Date | null {
  if (!isoDate) return null
  const date = new Date(`${isoDate}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function firstSaturdayOnOrAfter(date: Date): Date {
  const normalized = startOfDay(date)
  const daysUntilSaturday = (6 - normalized.getDay() + 7) % 7
  return new Date(normalized.getTime() + daysUntilSaturday * DAY_MS)
}

function calculatePossibleDate(runsUntil: number, latestResultDate: string): string {
  if (runsUntil <= 0) return ""

  const latest = parseIsoDate(latestResultDate)
  const today = startOfDay(new Date())
  const dayAfterLatest = latest ? new Date(startOfDay(latest).getTime() + DAY_MS) : today

  let firstPossibleSaturday = firstSaturdayOnOrAfter(dayAfterLatest)
  while (firstPossibleSaturday < today) {
    firstPossibleSaturday = new Date(firstPossibleSaturday.getTime() + 7 * DAY_MS)
  }

  const milestoneDate = new Date(firstPossibleSaturday.getTime() + (runsUntil - 1) * 7 * DAY_MS)
  return formatDate(milestoneDate)
}

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
    const upcoming: {
      name: string;
      parkrunId: string;
      totalRuns: number;
      next: number;
      runsUntil: number;
      possibleDate: string;
    }[] = []

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
          const runsUntil = next - r.totalRuns
          upcoming.push({
            name: r.name,
            parkrunId: r.parkrunId,
            totalRuns: r.totalRuns,
            next,
            runsUntil,
            possibleDate: calculatePossibleDate(runsUntil, latestDate),
          })
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
                  </Show> {ordinalSuffix(row.milestone)} run! <Emoji emoji="🎉" shadow />
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
                  <div class={styles.possibleDate}>Potentially {row.possibleDate}</div>
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
  possibleDate: css({
    fontStyle: "italic",
    fontSize: "0.85rem",
  }),
}
