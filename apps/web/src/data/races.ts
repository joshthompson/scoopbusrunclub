import { RunnerName } from '@/data/runners'

export interface RaceCalendarItem {
  date: string
  name: string
  website?: string
  runners: {
    name: RunnerName,
    position?: number
    time?: number
  }[]
}

export const races: RaceCalendarItem[] = [
  {
    date: "2026-03-22",
    name: "Rome Marathon",
    website: "https://www.runromethemarathon.com/",
    runners: [
      { name: "eline" },
    ],
  },
  {
    date: "2026-08-15",
    name: "Midnattsloppet",
    runners: [{ name: "josh" }, { name: "alisa" }, { name: "claire" }, { name: "rick" }, { name: "eline" }],
  },
  {
    date: "2026-08-20",
    name: "Convinistafetten",
    runners: [{ name: "josh" }],
  },
  {
    date: "2026-08-29",
    name: "Stockholm Half Marathon",
    runners: [{ name: "rick" }, { name: "sophie" }],
  },
  {
    date: "2026-09-05",
    name: "Tjejmilen",
    runners: [{ name: "anna" }, { name: "lyra" }, { name: "eline" }],
  },
  {
    date: "2026-09-26",
    name: "Lidingöloppet",
    runners: [{ name: "josh" }, { name: "adam" }],
  },
  {
    date: "2026-10-03",
    name: "Förbifartspremiären",
    runners: [{ name: "keith" }, { name: "claire" }, { name: "anna" }, { name: "eline" }, { name: "josh" }, { name: "rick" }, { name: "alisa" }, { name: "sophie" }],
  },
  {
    date: "2026-10-17",
    name: "Rönninge Backyard Ultra",
    runners: [{ name: "keith" }, { name: "august" }, { name: "josh" }, { name: "eline" }],
  },
]
