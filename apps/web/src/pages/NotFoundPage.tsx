import { css } from "@style/css"
import { DirtBlock } from "@/components/ui/DirtBlock"
import { BackSignButton } from "@/components/BackSignButton"

const reasons = [
  "A volunteer shortage",
  "Extreme weather",
  "An influx in British tourists",
  "An accident on Slippy Rick's Corner",
  "A traffic cone on the route",
  "A rogue squirrel on the course",
  "A missing traffic cone",
  "A missing finish token",
  "A hungover run director",
  "A timekeeper getting lost",
  "A tailwalker overtaking the pacer",
  "A runner forgetting their barcode",
  "A marshal pointing the wrong way",
  "A runner doing an extra lap for fun",
  "A runner not getting a PB and refusing to leave the finish funnel",
]

export function NotFoundPage() {
  const reason = reasons[Math.floor(Math.random() * reasons.length)]
  return (
    <div class={styles.container}>
      <DirtBlock title="404" signType="purple">
        <div class={styles.content}>
          <h1 class={styles.cancelled}>This page has been cancelled due to</h1>
          <h2 class={styles.reason}>{reason}</h2>
          <p>
            (The page you're looking for can't be found)
          </p>
        </div>
      </DirtBlock>
      <div class={styles.button}>
        <BackSignButton />
      </div>
    </div>
  )
}

const styles = {
  container: css({
    width: 'calc(100% - 2rem)',
    maxWidth: '1200px',
    margin: '1rem auto',
    alignItems: 'center',
  }),
  content: css({
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    p: '3rem 0',
  }),
  cancelled: css({
    m: 0,
    fontSize: '1.25rem',
  }),
  reason: css({
    m: '0.5rem auto 1rem',
    fontSize: '2.5rem',
  }),
  button: css({
    display: 'flex',
    justifyContent: 'center',
  }),
}
