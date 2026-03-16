import { Runner, RunResultItem } from "@/utils/api"
import { getRunnerKeyFromRouteName } from "@/utils/memberRoute"
import { useParams } from "@solidjs/router"
import { css } from "@style/css"
import { createMemo, Show } from "solid-js"
import { runners as runnerSignals } from "@/components/header/runners"
import { NotFoundPage } from "./NotFoundPage"
import { DirtBlock } from "@/components/DirtBlock"
import { GraphSVG } from "@/components/GraphSVG"
import { BackSignButton } from "@/components/BackSignButton"


interface MemberGraphProps {
  results: RunResultItem[]
  runners: Runner[]
}

export function MemberGraphPage(props: MemberGraphProps) {
  const params = useParams<{ name: string }>()
  const runnerKey = createMemo(() => getRunnerKeyFromRouteName(params.name) ?? "")
  const runnerSignal = createMemo(() => runnerSignals[runnerKey()])
  const runnerData = createMemo(() => runnerSignal()?.[0]())
  
  return (
    <Show when={runnerData()} fallback={<NotFoundPage />}>
      <div class={styles.container}>
        <DirtBlock title={`Graph for ${runnerData()?.name}`}>
          <GraphSVG {...props} />
        </DirtBlock>         
        <BackSignButton
          children={`Back to ${runnerData()?.name}'s Page`}
          to={`/member/${params.name}`}
        />
      </div>
    </Show>
  )
}

const styles = {
  container: css({
    width: 'calc(100% - 2rem)',
    maxWidth: '1200px',
    margin: '1rem auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  }),
}
