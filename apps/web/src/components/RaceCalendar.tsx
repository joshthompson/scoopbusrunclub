import { For } from "solid-js"
import { FieldBlock } from "./FieldBlock"
import { css } from "@style/css"
import { formatDate } from "@/utils/misc"

interface RaceCalendarItem {
  date: string
  name: string
  runners: string[]
}

const races: RaceCalendarItem[] = [
  {
    date: "2026-03-22",
    name: "Rome Marathon",
    runners: ["Eline"],
  },
  {
    date: "2026-08-15",
    name: "Midnattsloppet",
    runners: ["Josh", "Alisa", "Claire", "Rick", "Eline"],
  },
  {
    date: "2026-19-20",
    name: "Convinistafetten",
    runners: ["Josh"],
  },
  {
    date: "2026-08-29",
    name: "Stockholm Half Marathon",
    runners: [],
  },
  {
    date: "2026-09-05",
    name: "Tjejmilen",
    runners: [],
  },
  {
    date: "2026-09-26",
    name: "Lidingöloppet",
    runners: ["Josh", "Adam", "Eline"],
  },
  {
    date: "2026-10-03",
    name: "Förbifartspremiären",
    runners: ["Keith", "Claire", "Anna", "Eline", "Josh", "Rick", "Alisa"],
  },
  {
    date: "2026-10-17",
    name: "Rönninge Backyard Ultra",
    runners: ["Keith", "August", "Josh", "Eline"],
  },
]

export function RaceCalendar() {
  const upcoming = races.filter((r) => new Date(r.date) >= new Date())
  return (
    <div class={styles.races}>
      <For each={upcoming}>
        {(race) => (
          <div>
            <h4 class={styles.raceName}>{race.name}</h4>
            <p>{formatDate(new Date(race.date + "T00:00:00"))}</p>
            <p>{race.runners.join(", ")}</p>
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