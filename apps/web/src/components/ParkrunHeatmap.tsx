import { createMemo, For, Show } from "solid-js"
import { css } from "@style/css"
import { type RunResultItem, type VolunteerItem } from "../utils/api"
import { buildHeatmapData, type WeekActivity, type WeekCell } from "../utils/heatmap"
import { DirtBlock } from "./ui/DirtBlock"
import { Tooltip } from "./ui/Tooltip"

const ACTIVITY_COLORS: Record<WeekActivity, string> = {
  none: "var(--heatmap-none)",
  ran: "var(--heatmap-ran)",
  volunteered: "var(--heatmap-volunteered)",
  both: "var(--heatmap-both)",
}

const ACTIVITY_LABELS: Record<WeekActivity, string> = {
  none: "No activity",
  ran: "Ran",
  volunteered: "Volunteered",
  both: "Ran & Volunteered",
}

function formatHeatmapDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

function tooltipContent(week: WeekCell) {
  const date = formatHeatmapDate(week.date)
  const detail = week.activity !== "none" ? week.label : ACTIVITY_LABELS[week.activity]
  return (
    <>
      <div>{date}</div>
      <div>{detail}</div>
    </>
  )
}

interface Props {
  parkrunId: string
  results: RunResultItem[]
  volunteers: VolunteerItem[]
}

export function ParkrunHeatmap(props: Props) {
  const data = createMemo(() => buildHeatmapData(props.parkrunId, props.results, props.volunteers))

  return (
    <DirtBlock title="Activity">
      <div class={styles.wrapper}>
        {/* Heatmap grid */}
        <div class={styles.grid}>
          <For each={data().weeks}>
            {(week: WeekCell) => (
              <Tooltip content={tooltipContent(week)}>
                <div
                  class={styles.cell}
                  style={{ "background-color": ACTIVITY_COLORS[week.activity] }}
                />
              </Tooltip>
            )}
          </For>
        </div>

        {/* Legend */}
        <div class={styles.legend}>
          <span class={styles.legendItem}>
            <span class={styles.legendSwatch} style={{ "background-color": ACTIVITY_COLORS.ran }} />
            Ran
          </span>
          <span class={styles.legendItem}>
            <span class={styles.legendSwatch} style={{ "background-color": ACTIVITY_COLORS.volunteered }} />
            Volunteered
          </span>
          <span class={styles.legendItem}>
            <span class={styles.legendSwatch} style={{ "background-color": ACTIVITY_COLORS.both }} />
            Both
          </span>
        </div>

        {/* Streak stats */}
        <div class={styles.streaks}>
          <div class={styles.streakStat}>
            <span class={styles.streakValue}>{data().currentStreak}</span>
            <span class={styles.streakLabel}>Current streak</span>
          </div>
          <div class={styles.streakStat}>
            <span class={styles.streakValue}>{data().longestStreak}</span>
            <span class={styles.streakLabel}>Longest streak</span>
          </div>
          <div class={styles.streakStat}>
            <span class={styles.streakValue}>{data().totalActive}</span>
            <span class={styles.streakLabel}>
              Active <Show when={data().weeks.length > 0} fallback="weeks">
                / {data().weeks.length} weeks
              </Show>
            </span>
          </div>
        </div>
      </div>
    </DirtBlock>
  )
}

const CELL_SIZE = 16 // px
const CELL_GAP = 3 // px

const styles = {
  wrapper: css({
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    paddingBottom: "0.25rem",
  }),
  grid: css({
    display: "flex",
    flexWrap: "wrap",
    gap: `${CELL_GAP}px`,
    alignItems: "center",
    justifyContent: "center",
  }),
  cell: css({
    width: `${CELL_SIZE}px`,
    height: `${CELL_SIZE}px`,
    borderRadius: "3px",
    cornerShape: "notch",
    cursor: "default",
    flexShrink: 0,
    transition: "transform 0.1s ease, filter 0.1s ease",
    _hover: {
      transform: "scale(1.4)",
      filter: "brightness(1.3)",
      zIndex: 10,
    },
  }),
  legend: css({
    display: "flex",
    gap: "0.75rem",
    justifyContent: "center",
    fontSize: "0.75rem",
    opacity: 0.85,
    flexWrap: "wrap",
  }),
  legendItem: css({
    display: "flex",
    alignItems: "center",
    gap: "0.25rem",
  }),
  legendSwatch: css({
    display: "inline-block",
    width: "12px",
    height: "12px",
    borderRadius: "2px",
    cornerShape: "notch",
    flexShrink: 0,
  }),
  streaks: css({
    display: "flex",
    gap: "1rem",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: "0.25rem",
  }),
  streakStat: css({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.1rem",
    minWidth: "75px",
  }),
  streakValue: css({
    fontSize: "1.5rem",
    fontWeight: "bold",
    lineHeight: 1,
  }),
  streakLabel: css({
    fontSize: "0.7rem",
    opacity: 0.7,
  }),
}
