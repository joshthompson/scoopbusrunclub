import { BackSignButton } from '@/components/BackSignButton'
import { GraphSVG } from '@/components/GraphSVG'
import type { CelebrationData } from '@/components/ResultCelebrations'
import { DirtBlock } from '@/components/ui/DirtBlock'
import { type RunnerName, runners as runnerSignals } from '@/data/runners'
import type { RunResultItem, Runner } from '@/utils/api'
import { getRunnerKeyFromRouteName } from '@/utils/memberRoute'
import { useParams } from '@solidjs/router'
import { css } from '@style/css'
import { Show, createMemo } from 'solid-js'
import { NotFoundPage } from './NotFoundPage'

interface MemberGraphProps {
	results: RunResultItem[]
	runners: Runner[]
	celebrationData?: CelebrationData
}

export function MemberGraphPage(props: MemberGraphProps) {
	const params = useParams<{ name: string }>()
	const runnerKey = createMemo(
		() => getRunnerKeyFromRouteName(params.name) ?? '',
	)
	const runnerSignal = createMemo(
		() => runnerSignals[runnerKey() as RunnerName],
	)
	const runnerData = createMemo(() => runnerSignal()?.[0]())

	return (
		<Show when={runnerData()} fallback={<NotFoundPage />}>
			<div class={styles.container}>
				<DirtBlock title={`${runnerData()?.name}'s Graph`}>
					<GraphSVG {...props} />
				</DirtBlock>
				<BackSignButton to={`/member/${params.name}`}>
					{`Back to ${runnerData()?.name}'s Page`}
				</BackSignButton>
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
