import { BackSignButton } from '@/components/BackSignButton'
import { FieldBlock } from '@/components/ui/FieldBlock'
import { css } from '@style/css'
import { For } from 'solid-js'

const QUESTIONS = [
	{
		question: 'What is a Scoop Bus?',
		answer:
			'A scoop bus is a vehicle that follows the very last participants in a race, such as a marathon or half-marathon, to pick up runners who are falling behind the required pace or can no longer continue.',
	},
] as const

export function FaqPage() {
	return (
		<div class={styles.container}>
			<FieldBlock title="FAQ" signType="purple">
				<div class={styles.list}>
					<For each={QUESTIONS}>
						{(item) => (
							<div class={styles.item}>
								<strong class={styles.question}>{item.question}</strong>
								<p>{item.answer}</p>
							</div>
						)}
					</For>
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
	list: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '1.5rem',
		textAlign: 'left',
	}),
	item: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '0.35rem',
	}),
	question: css({
		fontSize: '1.1rem',
	}),
	backSign: css({
		margin: '0 auto',
		display: 'block',
	}),
}
