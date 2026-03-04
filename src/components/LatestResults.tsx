import { For } from "solid-js"
import { FieldBlock } from "./FieldBlock"
import { css } from "@style/css"

interface Results {
  date: string
  parkruns: {
    name: string
    eventNumber: string
    results?: {
      name: string
      time: string
      position: number
    }[]
    volunteers?: {
        name: string
        roles: string[]
    }[]
  }[]
}

const latestResults: Results[] = [
  {
    date: '2024-06-07',
    parkruns: [
      {
        name: 'Haga',
        eventNumber: '405',
        results: [
          { name: 'Adam Carter', time: '19:42', position: 3 },
          { name: 'Josh Thompson', time: '19:46', position: 4 },
        ],
        volunteers: [
          { name: 'Claire Ward-Passey', roles: ['Run Director'] },
          { name: 'Rick Wacey', roles: ['Pre event setup', 'Tail Walker'] },
        ]
      },
      {
        name: 'Lillsjön',
        eventNumber: '123',
        results: [
          { name: 'Eline Berends', time: '20:00', position: 1 },
          { name: 'Keith Clark', time: '20:00', position: 2 },
          { name: 'Sophie Haslett', time: '20:00', position: 3 },
        ],
      }
    ]
  },
  {
    date: '2024-06-01',
    parkruns: [
      {
        name: 'Haga',
        eventNumber: '405',
        results: [
          { name: 'Adam Carter', time: '19:42', position: 3 },
          { name: 'Josh Thompson', time: '19:46', position: 4 },
          { name: 'Eline Berends', time: '20:00', position: 5 },
          { name: 'Keith Clark', time: '20:00', position: 6 },
          { name: 'Sophie Haslett', time: '20:00', position: 7 },
        ],
        volunteers: [
          { name: 'Claire Ward-Passey', roles: ['Run Director'] },
        ]
      },
    ]
  },
  {
    date: '2024-06-01',
    parkruns: [
      {
        name: 'Haga',
        eventNumber: '405',
        results: [
          { name: 'Adam Carter', time: '19:42', position: 3 },
          { name: 'Josh Thompson', time: '19:46', position: 4 },
          { name: 'Eline Berends', time: '20:00', position: 5 },
          { name: 'Keith Clark', time: '20:00', position: 6 },
          { name: 'Sophie Haslett', time: '20:00', position: 7 },
        ],
        volunteers: [
          { name: 'Claire Ward-Passey', roles: ['Run Director'] },
        ]
      },
    ]
  },
  {
    date: '2024-06-01',
    parkruns: [
      {
        name: 'Haga',
        eventNumber: '405',
        results: [
          { name: 'Adam Carter', time: '19:42', position: 3 },
          { name: 'Josh Thompson', time: '19:46', position: 4 },
          { name: 'Eline Berends', time: '20:00', position: 5 },
          { name: 'Keith Clark', time: '20:00', position: 6 },
          { name: 'Sophie Haslett', time: '20:00', position: 7 },
        ],
        volunteers: [
          { name: 'Claire Ward-Passey', roles: ['Run Director'] },
        ]
      },
    ]
  },
]

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function formatDate(date: Date) {
  const day = date.getDate()
  const month = date.toLocaleString('en-GB', { month: 'long' })
  return `${ordinal(day)} ${month}`
}

function and(arr: string[]) {
  if (arr.length === 0) return <></>
  if (arr.length === 1) return <em>{arr[0]}</em>
  if (arr.length === 2) return <><em>{arr[0]}</em> and <em>{arr[1]}</em></>
  return <>{arr.slice(0, -1).map((item) => <><em>{item}</em>, </>)} and <em>{arr[arr.length - 1]}</em></>
}

export function LatestResults() {
  return <div>
    <For each={latestResults}>{(result) => (
      <div class={styles.results}>
        <h3 class={styles.date}>{formatDate(new Date(result.date))}</h3>
        <For each={result.parkruns}>{(parkrun) => (
          <FieldBlock>
            <div class={styles.parkrun}>
              <h4>{parkrun.name} #{parkrun.eventNumber}</h4>
              <ul>
                <For each={parkrun.results}>{(res) => (
                  <li><em>{res.name}</em> finished in <em>{ordinal(res.position)}</em> place with a time of <em>{res.time}</em></li>
                )}</For>
              </ul>
              {parkrun.volunteers && (
                <ul>
                  <For each={parkrun.volunteers}>{(vol) => (
                    <li><em>{vol.name}</em> volunteered as {and(vol.roles)}</li>
                  )}</For>
                </ul>
              )}
            </div>
          </FieldBlock>
        )}</For>
      </div>
    )}</For>
  </div>
}

const styles = {
  date: css({
    fontWeight: 'bold',
    textTransform: 'uppercase',
  }),
  results: css({
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  }),
  parkrun: css({
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    '& em': {
      fontStyle: 'normal',
      fontWeight: 'bold',
    },
  }),
}