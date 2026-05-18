import shadowAsset from '@/assets/runners/shadow.png'
import { type RunnerData, runners } from '@/data/runners'
import { css } from '@style/css'

export function CharacterImage(props: {
	runner: RunnerData
	pose: 'sitting' | 'running'
}) {
	const runner = () => props.runner

	return (
		<div
			class={styles.characterImage}
			role="img"
			aria-label={`Image of ${runner().name}`}
		>
			<img src={runner().frames.sit[0]} class={styles.sitting} alt="" />
			{runner().name === 'Alisa' && (
				<img
					src={runners.link[0]().frames.sit[0]}
					alt={`${runner().name} sitting`}
					class={styles.linkSitting}
				/>
			)}
			<div class={styles.shadows}>
				<img src={shadowAsset} class={styles.shadow} alt="" />
				{runner().name === 'Alisa' && (
					<img src={shadowAsset} class={styles.linkShadow} alt="" />
				)}
			</div>
		</div>
	)
}

const styles = {
	characterImage: css({
		display: 'inline-block',
		position: 'relative',
		height: '100px',
		mt: '-35px',
		mb: '-20px',
		zIndex: 5,
		pointerEvents: 'none',
	}),
	sitting: css({
		zIndex: 2,
		position: 'relative',
		m: '-30px auto 0',
		height: '100%',
	}),
	linkSitting: css({
		zIndex: 3,
		position: 'absolute',
		bottom: '20%',
		left: '50%',
		height: '100%',
	}),
	shadows: css({
		filter: 'brightness(0)',
		opacity: 0.1,
		height: '20%',
	}),
	shadow: css({
		width: '100%',
		height: '100%',
		position: 'relative',
		zIndex: 1,
		mt: '-10px',
	}),
	linkShadow: css({
		zIndex: 1,
		position: 'absolute',
		bottom: '-50%',
		left: '50%',
		height: '100%',
		width: '100%',
	}),
}
