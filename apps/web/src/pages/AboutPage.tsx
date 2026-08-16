import { BackSignButton } from '@/components/BackSignButton'
import { FieldBlock } from '@/components/ui/FieldBlock'
import { css } from '@style/css'

export function AboutPage() {
	return (
		<div class={styles.container}>
			<FieldBlock title="About" signType="purple">
				<div class={styles.prose}>
					<p>
						The Scoop Bus Run Club is a casual running club based in the
						Stockholm.
					</p>
					<p>
						We are most often found at Haga Parkrun but occasionally venture out
						to other Parkruns and also meet most Wednesday evenings for Track
						and Food.
					</p>
				</div>
			</FieldBlock>
			<BackSignButton class={styles.backSign} />
		</div>
	)
}

const styles = {
	container: css({
		width: 'calc(100% - 2rem)',
		maxWidth: '700px',
		margin: '1rem auto',
		display: 'flex',
		flexDirection: 'column',
		gap: '2rem',
	}),
	prose: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '1rem',
		fontSize: '1.05rem',
	}),
	backSign: css({
		margin: '0 auto',
		display: 'block',
	}),
}
