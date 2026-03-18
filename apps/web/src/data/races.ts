import { RunnerName } from '@/data/runners'

export interface EventItem {
  date: string
  name: string
  website?: string
  type?: string
  attendees: {
    name: RunnerName,
    position?: number
    time?: number
    distance?: number
    laps?: number
  }[]
}

export const races: EventItem[] = [
  {
    date: "2026-03-22",
    name: "Rome Marathon",
    website: "https://www.runromethemarathon.com/",
    attendees: [
      { name: "eline" },
    ],
  },
  {
    date: "2026-08-15",
    name: "Midnattsloppet",
    attendees: [{ name: "josh" }, { name: "alisa" }, { name: "claire" }, { name: "rick" }, { name: "eline" }],
  },
  {
    date: "2026-08-20",
    name: "Convinistafetten",
    attendees: [{ name: "josh" }],
  },
  {
    date: "2026-08-29",
    name: "Stockholm Half Marathon",
    attendees: [{ name: "rick" }, { name: "sophie" }],
  },
  {
    date: "2026-09-05",
    name: "Tjejmilen",
    attendees: [{ name: "anna" }, { name: "lyra" }, { name: "eline" }],
  },
  {
    date: "2026-09-26",
    name: "Lidingöloppet",
    attendees: [{ name: "josh" }, { name: "adam" }],
  },
  {
    date: "2026-10-03",
    name: "Förbifartspremiären",
    attendees: [{ name: "keith" }, { name: "claire" }, { name: "anna" }, { name: "eline" }, { name: "josh" }, { name: "rick" }, { name: "alisa" }, { name: "sophie" }],
  },
  {
    date: "2026-10-17",
    name: "Rönninge Backyard Ultra",
    attendees: [{ name: "keith" }, { name: "august" }, { name: "josh" }, { name: "eline" }],
  },
]
