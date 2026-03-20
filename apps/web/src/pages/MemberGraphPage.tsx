import { Runner, RunResultItem } from "@/utils/api"
import { type CelebrationData } from "@/components/ResultCelebrations"
import { getRunnerKeyFromRouteName } from "@/utils/memberRoute"
import { useParams } from "@solidjs/router"
import { css } from "@style/css"
import { createMemo, Show } from "solid-js"
import { RunnerName, runners as runnerSignals } from '@/data/runners'
import { NotFoundPage } from "./NotFoundPage"
import { DirtBlock } from "@/components/ui/DirtBlock"
import { GraphSVG } from "@/components/GraphSVG"
import { BackSignButton } from "@/components/BackSignButton"


interface MemberGraphProps {
  results: RunResultItem[]
  runners: Runner[]
  celebrationData?: CelebrationData
}

export function MemberGraphPage(props: MemberGraphProps) {
  const params = useParams<{ name: string }>()
  const runnerKey = createMemo(() => getRunnerKeyFromRouteName(params.name) ?? "")
  const runnerSignal = createMemo(() => runnerSignals[runnerKey() as RunnerName])
  const runnerData = createMemo(() => runnerSignal()?.[0]())
  
  return (
    <Show when={runnerData()} fallback={<NotFoundPage />}>
      <div class={styles.container}>
        <DirtBlock title={`${runnerData()?.name}'s Graph`}>
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
