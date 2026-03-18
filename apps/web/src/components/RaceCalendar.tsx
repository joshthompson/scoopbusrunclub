import { For } from "solid-js"
import { css } from "@style/css"
import { formatDate } from "@/utils/misc"
import { races } from "@/data/races"
import { runners } from "@/data/runners"

export function RaceCalendar() {
  const upcoming = races.filter((r) => new Date(r.date) >= new Date())
  return (
    <div class={styles.races}>
      <For each={upcoming}>
        {(race) => (
          <div>
            <h4 class={styles.raceName}>{race.name}</h4>
            <p>{formatDate(new Date(race.date + "T00:00:00"))}</p>
            <p>{race.attendees.map((r) => runners[r.name][0]().name).join(", ")}</p>
          </div>
        )}
      </For>
    </div>
  )
}

const styles = {
  races: css({
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  }),
  raceName: css({
    fontWeight: "bold",
  }),
}