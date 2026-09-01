import { type RunnerData, hasHeaderArtwork, runners } from '@/data/runners'
import { getMemberRoute } from '@/utils/memberRoute'
import { ordinalSuffix } from '@/utils/milestones'
import { A } from '@solidjs/router'
import { css } from '@style/css'
import { Show } from 'solid-js'
import { CharacterImage } from './CharacterImage'
import { MilestoneBalloons } from './MilestoneBalloons'
import { DirtBlock } from './ui/DirtBlock'

/** Club members by their parkrun id, for turning a result row into a sprite. */
const byParkrunId = new Map<string, RunnerData>()
for (const [, [runner]] of Object.entries(runners)) {
	const data = runner()
	if (data.id) byParkrunId.set(data.id, data)
}

export interface MajorMilestone {
	parkrunId: string
	name: string
	/** The run number they reached — one of the ones we have balloons for. */
	milestone: number
	/** Where they ran it. */
	eventName: string
	/** Which side the balloons are tied to, alternating down the page. */
	side: 'left' | 'right'
}

/**
 * A runner's big milestone, with the balloons to match tied to the side of the
 * card. The bunch rises past the top of the card, which is why consecutive
 * cards put theirs on opposite sides — see `majorMilestonesByDate`.
 */
export function MilestoneCard(props: { milestone: MajorMilestone }) {
	const runner = () => byParkrunId.get(props.milestone.parkrunId)
	const name = () => runner()?.name ?? props.milestone.name
	const memberRoute = () =>
		getMemberRoute(props.milestone.parkrunId, props.milestone.name)

	return (
		<DirtBlock class={styles.block}>
			<div class={styles.card} data-milestone-card={props.milestone.side}>
				<MilestoneBalloons
					milestone={props.milestone.milestone}
					side={props.milestone.side}
					inset={BALLOON_INSET}
					top={BALLOON_KNOT_DROP}
				/>
				<Show when={runner()} keyed>
					{(data) => (
						<Show when={hasHeaderArtwork(data)}>
							<div class={styles.figure}>
								<CharacterImage runner={data} pose="sitting" />
							</div>
						</Show>
					)}
				</Show>
				<h4 class={styles.title}>
					<Show when={memberRoute()} fallback={<span>{name()}</span>}>
						{(href) => (
							<A href={href()} class={styles.link}>
								{name()}
							</A>
						)}
					</Show>
					's {ordinalSuffix(props.milestone.milestone)} parkrun!
				</h4>
				<p class={styles.detail}>
					A milestone run at {props.milestone.eventName}.
				</p>
			</div>
		</DirtBlock>
	)
}

/**
 * How the bunch is placed: clear of the card's side by this much at its widest,
 * and tied on this far down from the card's top. Measured from the top so the
 * overhang above the card is the same whatever height the card ends up.
 */
const BALLOON_INSET = 6
const BALLOON_KNOT_DROP = 24

const styles = {
	/** Room at the top for the bunch, most of which is drawn above the card. */
	block: css({
		mt: '52px',
		// A phone has one narrow column, where a bunch hanging over the card above
		// would land on its text rather than the empty dirt either side of it. So
		// there the card reserves the whole of the scaled-down reach — measured at
		// 96px above the card, plus the bob and a little air.
		'@media (max-width: 768px)': {
			mt: '108px',
		},
	}),
	card: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '0.25rem',
	}),
	figure: css({
		display: 'flex',
		justifyContent: 'center',
		// `CharacterImage` is drawn to tuck up under whatever is above it, which
		// here is the top of the card.
		mt: '35px',
	}),
	title: css({
		fontWeight: 'bold',
		fontSize: '1.5em',
	}),
	link: css({
		color: 'inherit',
	}),
	detail: css({
		fontStyle: 'italic',
	}),
}
