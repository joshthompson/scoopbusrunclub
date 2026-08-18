import backSignAsset from '@/assets/misc/back-sign.png'
import { snowyAsset } from '@/utils/snow'
import { useNavigate } from '@solidjs/router'
import { css, cx } from '@style/css'
import { SnowShelf } from './ui/SnowShelf'

export function BackSignButton(props: {
	to?: string
	children?: string
	class?: string
}) {
	const navigate = useNavigate()

	return (
		<button
			type="button"
			class={cx(styles.button, props.class)}
			onClick={() => navigate(props.to ?? '/')}
		>
			<img
				class={styles.image}
				src={snowyAsset(backSignAsset)}
				alt="Back to home"
			/>
			<span class={styles.text}>
				<SnowShelf class={styles.snowUpperShelf} />
				<SnowShelf class={styles.snowLowerShelf} />
				{props.children ?? 'Back to homepage'}
			</span>
		</button>
	)
}

const styles = {
	button: css({
		display: 'inline-block',
		cursor: 'pointer',
		height: '104px',
		alignSelf: 'center',
		position: 'relative',
	}),
	image: css({
		height: '104px',
	}),
	text: css({
		position: 'absolute',
		top: '0',
		left: '50%',
		transform: 'translateX(-50%)',
		width: 'max-content',
		p: '2px 10px',
		background: 'var(--lime-yellow)',
		fontFamily: '"Jersey 10", sans-serif',
		fontSize: '20px',
		textTransform: 'uppercase',
		lineHeight: '20px',
		color: 'var(--color-black)',
	}),
	snowUpperShelf: css({
		margin: '-5px -1px 0 -1px',
	}),
	snowLowerShelf: css({
		margin: '28px auto',
		width: '45px',
	}),
}
