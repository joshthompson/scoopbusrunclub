import { CharacterImage } from '@/components/CharacterImage'
import { type RunnerData, runners as runnerSignals } from '@/data/runners'
import { getMemberRoute } from '@/utils/memberRoute'
import type { WrappedStats } from '@/utils/wrapped'
import {
	formatDateDisplay,
	formatDateShort,
	formatDuration,
	joinNames,
	ordinalSuffix,
	summariseList,
	timesLabel,
} from '@/utils/wrappedFormat'
import { A } from '@solidjs/router'
import { css } from '@style/css'
import { For, type JSX, Show } from 'solid-js'

/**
 * Wrapped's content, defined once as an ordered list of slides. The scrolling
 * `/wrapped/:year` page renders them as a column of cards; the stories-style
 * `/wrapped/:year/explore` view renders them one at a time on a bright
 * gradient. Both read from here so the two can't drift apart.
 */

// ---------------------------------------------------------------------------
// Runner artwork lookups
// ---------------------------------------------------------------------------

/** parkrunId → the runner signal, for character artwork. */
const parkrunIdToRunner = new Map<string, () => RunnerData>()
/** RunnerName key → the runner signal, for members with no parkrun id. */
const runnerKeyToRunner = new Map<string, () => RunnerData>()
for (const [key, [runner]] of Object.entries(runnerSignals)) {
	const data = runner()
	if (data.id) parkrunIdToRunner.set(data.id, runner)
	runnerKeyToRunner.set(key, runner)
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SpotlightMember {
	name: string
	/** Absent for members with no parkrun id of their own, like Link. */
	parkrunId?: string
	/** Preferred over `parkrunId` for artwork when present. */
	runnerKey?: string
	caption?: string
}

export interface SpotlightBlock {
	title: string
	subtitle: string
	accent: string
	members: SpotlightMember[]
}

/**
 * A slide before its backdrop is assigned. Split out from `WrappedSlide` so the
 * builder can push slides without knowing their gradient yet — `Omit` over a
 * union would collapse it to the keys both members share.
 */
type SlideContent =
	| {
			kind: 'card'
			id: string
			emoji: string
			/** Left-border accent on the scrolling page. */
			color: string
			body: () => JSX.Element
	  }
	| {
			kind: 'spotlight'
			id: string
			spotlight: SpotlightBlock
	  }

/** Bright backdrop in the stories view, assigned by slide position. */
export type WrappedSlide = SlideContent & { gradient: string }

// ---------------------------------------------------------------------------
// Gradients
// ---------------------------------------------------------------------------

/**
 * Cycled by slide position rather than picked per stat, so neighbouring slides
 * always differ and the run of them reads as one set. Every stop is saturated
 * enough to carry white text.
 */
const SLIDE_GRADIENTS = [
	'linear-gradient(160deg, #F5576C, #C2185B)',
	'linear-gradient(160deg, #2E7BF6, #00BCD4)',
	'linear-gradient(160deg, #17A673, #0E9488)',
	'linear-gradient(160deg, #F0578A, #E8871E)',
	'linear-gradient(160deg, #7B2FF7, #C31FB4)',
	'linear-gradient(160deg, #E8871E, #D4A017)',
	'linear-gradient(160deg, #5A67D8, #6B46C1)',
	'linear-gradient(160deg, #0891B2, #16A34A)',
	'linear-gradient(160deg, #E0245E, #3B4FDB)',
	'linear-gradient(160deg, #D97706, #0E9488)',
]

// ---------------------------------------------------------------------------
// Shared card + spotlight rendering
// ---------------------------------------------------------------------------

export function WrappedCard(props: {
	emoji: string
	children: JSX.Element
	color?: string
}) {
	return (
		<div
			class={cardStyles.card}
			style={{
				'border-left': `4px solid ${props.color ?? 'var(--green-brand)'}`,
			}}
		>
			<span class={cardStyles.emoji}>{props.emoji}</span>
			<div class={cardStyles.content}>{props.children}</div>
		</div>
	)
}

const cardStyles = {
	card: css({
		background: 'var(--overlay-black-12)',
		borderRadius: '8px',
		padding: '1rem 1.2rem',
		display: 'flex',
		alignItems: 'flex-start',
		gap: '0.75rem',
	}),
	emoji: css({
		fontSize: '2rem',
		lineHeight: 1,
		flexShrink: 0,
	}),
	content: css({
		flex: 1,
		'& strong': {
			fontSize: '1.1rem',
		},
	}),
}

/**
 * A member's sitting sprite, resolved by runner key when given (some members
 * have no parkrun id of their own) and by parkrunId otherwise.
 */
export function RunnerArtwork(props: {
	parkrunId?: string
	runnerKey?: string
}) {
	const runner = () =>
		props.runnerKey
			? runnerKeyToRunner.get(props.runnerKey)
			: parkrunIdToRunner.get(props.parkrunId ?? '')
	return (
		<Show when={runner()}>
			{(sig) => <CharacterImage runner={sig()()} pose="sitting" />}
		</Show>
	)
}

/**
 * The members of a spotlight block with their artwork. Used by both views.
 *
 * `compact` tightens the gaps for the stories view, which has a phone's width
 * to work with and a whole founding year to fit into it.
 */
export function SpotlightMembers(props: {
	members: SpotlightMember[]
	compact?: boolean
}) {
	return (
		<div
			class={props.compact ? spotlightStyles.gridCompact : spotlightStyles.grid}
		>
			<For each={props.members}>
				{(member) => {
					// Falls back to the name, which covers members without an id.
					const route = getMemberRoute(member.parkrunId, member.name)
					return (
						<div class={spotlightStyles.member}>
							<RunnerArtwork
								parkrunId={member.parkrunId}
								runnerKey={member.runnerKey}
							/>
							<Show when={route} fallback={<strong>{member.name}</strong>}>
								{(href) => (
									<A href={href()} class={spotlightStyles.link}>
										<strong>{member.name}</strong>
									</A>
								)}
							</Show>
							<Show when={member.caption}>
								{(caption) => (
									<div class={spotlightStyles.caption}>{caption()}</div>
								)}
							</Show>
						</div>
					)
				}}
			</For>
		</div>
	)
}

export function MemberSpotlight(props: { block: SpotlightBlock }) {
	return (
		<div
			class={spotlightStyles.block}
			style={{
				background: `linear-gradient(135deg, ${props.block.accent}, rgba(37,99,235,0.15))`,
				'border-color': props.block.accent,
			}}
		>
			<div class={spotlightStyles.title}>{props.block.title}</div>
			<div class={spotlightStyles.subtitle}>{props.block.subtitle}</div>
			<SpotlightMembers members={props.block.members} />
		</div>
	)
}

const spotlightStyles = {
	block: css({
		border: '2px solid',
		borderRadius: '10px',
		padding: '1rem 1.2rem',
		textAlign: 'center',
	}),
	title: css({
		fontSize: '1.3rem',
		fontWeight: 'bold',
		marginBottom: '0.25rem',
	}),
	subtitle: css({
		fontSize: '0.9rem',
		opacity: 0.7,
		marginBottom: '0.75rem',
	}),
	grid: css({
		display: 'flex',
		flexWrap: 'wrap',
		justifyContent: 'center',
		gap: '1rem',
		mt: '32px',
	}),
	gridCompact: css({
		display: 'flex',
		flexWrap: 'wrap',
		// Centred wrapping rather than fixed columns, so a slide with one member
		// centres them instead of stranding them in the first column, and cells
		// stay as wide as their sprite needs.
		justifyContent: 'center',
		columnGap: '0.75rem',
		// Wide enough to clear the sprite's negative top margin, which would
		// otherwise ride up over the names in the row above.
		rowGap: '2rem',
		width: '100%',
		mt: '32px',
		// Sprites stay at their natural size. Both shrinking the height and capping
		// the width break the artwork: CharacterImage positions the sprite and its
		// shadow with pixel margins tuned to a 100px character, so a smaller one
		// rides up over the text above it, and a width cap letterboxes the sprite
		// inside its box while the shadow stays put under nothing.
	}),
	member: css({
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		gap: '0.2rem',
	}),
	link: css({
		color: 'inherit',
		textDecoration: 'underline',
	}),
	caption: css({
		fontSize: '0.75rem',
		opacity: 0.6,
	}),
}

// ---------------------------------------------------------------------------
// Slide builder
// ---------------------------------------------------------------------------

/**
 * Every fact worth a slide, in narrative order. Conditions live here rather
 * than in the markup, so a slide either exists for this year or it doesn't —
 * which is what lets the stories view count and page through them.
 */
export function buildWrappedSlides(
	stats: WrappedStats,
	year: number,
): WrappedSlide[] {
	const slides: SlideContent[] = []

	const card = (
		id: string,
		emoji: string,
		color: string,
		body: () => JSX.Element,
	) => {
		slides.push({ kind: 'card', id, emoji, color, body })
	}

	// --- Joined the club — the founding year gets its own framing ---
	if (stats.clubJoiners.length > 0) {
		const joiners = stats.clubJoiners
		slides.push({
			kind: 'spotlight',
			id: 'club-joiners',
			spotlight: {
				title: stats.isFoundingYear
					? '🚌 Scoop Bus Founded'
					: '🚌 Scoop Bus member debut!',
				subtitle: stats.isFoundingYear
					? `Scoop Bus Run Club began in ${year}, thanks to these founding members`
					: `${joiners.length === 1 ? 'This member' : 'These members'} joined Scoop Bus in ${year}`,
				accent: stats.isFoundingYear
					? 'rgba(245,158,11,0.4)'
					: 'rgba(106,191,75,0.4)',
				members: joiners.map((m) => ({
					runnerKey: m.key,
					parkrunId: m.parkrunId || undefined,
					name: m.name,
				})),
			},
		})
	}

	// --- parkrun debuts ---
	if (stats.debutMembers.length > 0) {
		const debuts = stats.debutMembers
		slides.push({
			kind: 'spotlight',
			id: 'parkrun-debuts',
			spotlight: {
				title: '🎉 Welcome to Parkrun!',
				subtitle: `${debuts.length === 1 ? 'This member' : 'These members'} made their parkrun debut in ${year}`,
				accent: 'rgba(106,191,75,0.4)',
				members: debuts.map((m) => ({
					parkrunId: m.parkrunId,
					name: m.name,
					caption: formatDateDisplay(m.date),
				})),
			},
		})
	}

	// --- Run Director debuts ---
	if (stats.runDirectorDebuts.length > 0) {
		const rds = stats.runDirectorDebuts
		slides.push({
			kind: 'spotlight',
			id: 'run-director-debuts',
			spotlight: {
				title: '📢 Run Director debut!',
				subtitle: `${rds.length === 1 ? 'This member took' : 'These members took'} charge of an event for the first time in ${year}`,
				accent: 'rgba(220,38,38,0.35)',
				members: rds.map((m) => ({
					parkrunId: m.parkrunId,
					name: m.name,
					caption: `${m.eventName} #${m.eventNumber} · ${formatDateShort(m.date)}`,
				})),
			},
		})
	}

	// --- Totals ---
	card('total-runs', '🏃', 'var(--blue-600)', () => (
		<>
			In {year}, Scoop Bus completed{' '}
			<strong>{stats.totalRuns.toLocaleString()} parkruns</strong>
			{stats.totalJuniorRuns > 0 && (
				<>
					{' '}
					and <strong>{stats.totalJuniorRuns} junior parkruns</strong>
				</>
			)}
		</>
	))

	card('distance', '🛣️', 'var(--green-600)', () => (
		<>
			That's <strong>{stats.totalDistanceKm.toLocaleString()} km</strong> run
			together
		</>
	))

	card('events-countries', '🌍', 'var(--amber-600)', () => (
		<>
			Across <strong>{stats.uniqueEvents} different events</strong> in{' '}
			<strong>
				{stats.uniqueCountries}{' '}
				{stats.uniqueCountries === 1 ? 'country' : 'countries'}
			</strong>
		</>
	))

	card('active-members', '📅', 'var(--purple-violet)', () => (
		<>
			<strong>{stats.activeMembers} members</strong> were active across{' '}
			<strong>{stats.activeSaturdays} events</strong>
		</>
	))

	if (stats.busiestMonth) {
		const month = stats.busiestMonth
		card('busiest-month', '🗓️', 'var(--blue-indigo-500)', () => (
			<>
				<strong>{month.month}</strong> was the busiest month with{' '}
				<strong>{month.runs} runs</strong>
			</>
		))
	}

	if (stats.busiestSaturday) {
		const busiest = stats.busiestSaturday
		card('busiest-day', '🎉', 'var(--pink-rose)', () => (
			<>
				The busiest day was <strong>{formatDateDisplay(busiest.date)}</strong>{' '}
				with <strong>{busiest.count} members</strong> at{' '}
				{busiest.events.map((e) => `${e.name} #${e.eventNumber}`).join(', ')}
			</>
		))
	}

	if (stats.biggestHaga) {
		const haga = stats.biggestHaga
		card('biggest-haga', '🏠', 'var(--blue-indigo-500)', () => (
			<>
				The biggest Haga turnout was <strong>Haga #{haga.eventNumber}</strong>{' '}
				on <strong>{formatDateDisplay(haga.date)}</strong> with{' '}
				<strong>{haga.count} members</strong>
			</>
		))
	}

	if (stats.biggestTrip) {
		const trip = stats.biggestTrip
		card('biggest-trip', '🚌', 'var(--blue-sky)', () => (
			<>
				The biggest Scoop Bus trip was to{' '}
				<strong>
					{trip.eventName} #{trip.eventNumber}
				</strong>{' '}
				on <strong>{formatDateDisplay(trip.date)}</strong> with{' '}
				<strong>{trip.count} members</strong>
			</>
		))
	}

	if (stats.newEventsDiscovered > 0) {
		const explorer = stats.mostExploredMember
		card('new-events', '📍', 'var(--blue-cyan)', () => (
			<>
				<strong>{stats.newEventsDiscovered} new events</strong> were discovered
				this year
				{explorer && (
					<>
						. <strong>{joinNames(explorer.names)}</strong> visited the most with{' '}
						{explorer.events} events
					</>
				)}
			</>
		))
	}

	for (const country of stats.newCountries) {
		card(
			`new-country-${country.code}`,
			country.flag,
			'var(--green-emerald)',
			() => (
				<>
					First event in <strong>{country.name}</strong> — {country.eventName}
				</>
			),
		)
	}

	// --- Largest club league table ---
	if (stats.clubLeague) {
		const league = stats.clubLeague
		const runsAdded = league.endRuns - league.startRuns
		const membersAdded = league.endMembers - league.startMembers
		const climbed = league.startRank - league.endRank
		card(
			'club-league',
			league.isLargest ? '🏆' : '📈',
			'var(--amber-500)',
			() => (
				<>
					{league.becameLargest ? (
						<>
							Scoop Bus became the{' '}
							<strong>largest parkrun club in Sweden</strong>, climbing from #
							{league.startRank}
						</>
					) : climbed !== 0 ? (
						<>
							Scoop Bus {climbed > 0 ? 'climbed' : 'slipped'} from{' '}
							<strong>#{league.startRank}</strong> to{' '}
							<strong>#{league.endRank}</strong> in Sweden's club league table
						</>
					) : (
						<>
							Scoop Bus held <strong>#{league.endRank} in Sweden</strong>
						</>
					)}
					{(runsAdded > 0 || membersAdded > 0) && (
						<>
							, adding
							{runsAdded > 0 && (
								<>
									{' '}
									<strong>{runsAdded.toLocaleString()} runs</strong>
								</>
							)}
							{runsAdded > 0 && membersAdded > 0 && ' and'}
							{membersAdded > 0 && (
								<>
									{' '}
									<strong>{membersAdded.toLocaleString()} members</strong>
								</>
							)}
						</>
					)}{' '}
					between {formatDateShort(league.startWeek)} and{' '}
					{formatDateShort(league.endWeek)}
					{league.overtaken.length > 0 && (
						<>
							, overtaking <strong>{summariseList(league.overtaken)}</strong>
						</>
					)}
				</>
			),
		)
	}

	// --- Performance ---
	if (stats.totalPBs > 0) {
		const improver = stats.biggestPBImprover
		card('pbs', '⚡', 'var(--amber-500)', () => (
			<>
				<strong>{stats.totalPBs} personal bests</strong> were set this year
				{improver && (
					<>
						. <strong>{improver.name}</strong> knocked the most time off —{' '}
						<strong>{formatDuration(improver.secondsSaved)}</strong> faster!
					</>
				)}
			</>
		))
	}

	if (stats.fastestRun) {
		const run = stats.fastestRun
		card('fastest-run', '💨', 'var(--red-600)', () => (
			<>
				The fastest run of the year was <strong>{run.name}</strong> in{' '}
				<strong>{run.time}</strong> at {run.eventName} on{' '}
				{formatDateShort(run.date)}
			</>
		))
	}

	if (stats.runMilestones.length > 0) {
		const milestones = stats.runMilestones
		const summary = summariseList(
			milestones.map((m) => `${m.name}'s ${ordinalSuffix(m.runNumber)}`),
		)
		card('run-milestones', '🎊', 'var(--pink-600)', () => (
			<>
				<strong>
					{milestones.length} run{' '}
					{milestones.length === 1 ? 'milestone' : 'milestones'}
				</strong>{' '}
				were reached — {summary}
			</>
		))
	}

	if (stats.longestStreak) {
		const streak = stats.longestStreak
		card('longest-streak', '🔥', 'var(--orange)', () => (
			<>
				<strong>{joinNames(streak.names)}</strong> put together the longest
				streak — <strong>{streak.weeks} weeks in a row</strong>
			</>
		))
	}

	if (stats.closeFinishes > 0) {
		const pair = stats.mostCommonCloseFinishPair
		card('close-finishes', '🤝', 'var(--orange)', () => (
			<>
				<strong>{stats.closeFinishes} close finishes</strong> within 10 seconds
				of each other
				{pair && (
					<>
						. <strong>{pair.nameA}</strong> & <strong>{pair.nameB}</strong> were
						the closest pair {timesLabel(pair.count)}
					</>
				)}
			</>
		))
	}

	// --- Volunteering ---
	if (stats.volunteerSessions > 0) {
		const top = stats.mostVolunteeredMember
		card('volunteering', '🦺', 'var(--green-emerald-dark)', () => (
			<>
				The club volunteered <strong>{stats.volunteerSessions} times</strong>
				{top && (
					<>
						. Thank you <strong>{joinNames(top.names)}</strong> for leading with{' '}
						{top.count} sessions!
					</>
				)}
			</>
		))
	}

	if (stats.newRoleMemberCount > 0) {
		// One role each, so the examples show different people and the tail counts
		// members, matching the "N members" the sentence opens with.
		const seen = new Set<string>()
		const firstEach: string[] = []
		for (const attempt of stats.newRoleTries) {
			if (seen.has(attempt.parkrunId)) continue
			seen.add(attempt.parkrunId)
			firstEach.push(`${attempt.name} as ${attempt.role}`)
		}
		const summary = summariseList(firstEach)
		card('new-roles', '🆕', 'var(--blue-cyan)', () => (
			<>
				<strong>
					{stats.newRoleMemberCount}{' '}
					{stats.newRoleMemberCount === 1 ? 'member' : 'members'}
				</strong>{' '}
				tried a volunteer role for the first time — {summary}
			</>
		))
	}

	if (stats.rolesCovered > 0) {
		const role = stats.mostCommonRole
		const collector = stats.roleCollector
		card('role-coverage', '🧰', 'var(--purple-violet)', () => (
			<>
				The club covered{' '}
				<strong>
					{stats.rolesCovered} different volunteer{' '}
					{stats.rolesCovered === 1 ? 'role' : 'roles'}
				</strong>
				{role && (
					<>
						, most often as <strong>{role.role}</strong>{' '}
						{timesLabel(role.count)}
					</>
				)}
				{collector && collector.roles > 1 && (
					<>
						. <strong>{joinNames(collector.names)}</strong> covered the most,
						with {collector.roles} of them
					</>
				)}
			</>
		))
	}

	if (stats.volunteerMilestones.length > 0) {
		const milestones = stats.volunteerMilestones
		const summary = summariseList(
			milestones.map((m) => `${m.name}'s ${ordinalSuffix(m.count)}`),
		)
		card('volunteer-milestones', '🎖️', 'var(--purple-violet)', () => (
			<>
				<strong>
					{milestones.length} volunteer{' '}
					{milestones.length === 1 ? 'milestone' : 'milestones'}
				</strong>{' '}
				were reached — {summary}
			</>
		))
	}

	// --- Guests ---
	if (stats.guestCount > 0) {
		const guest = stats.topGuest
		card('guests', '👋', 'var(--blue-sky)', () => (
			<>
				<strong>
					{stats.guestCount} {stats.guestCount === 1 ? 'guest' : 'guests'}
				</strong>{' '}
				ran with us across <strong>{stats.guestAppearances} appearances</strong>
				{/* "Most often" needs someone to be more often than. */}
				{guest && guest.count > 1 && stats.guestCount > 1 && (
					<>
						. <strong>{guest.name}</strong> joined most often{' '}
						{timesLabel(guest.count)}
					</>
				)}
				{stats.newGuests.length > 0 && (
					<>. First time for {summariseList(stats.newGuests, 4)}</>
				)}
			</>
		))
	}

	// --- Races beyond parkrun ---
	if (stats.raceCount > 0) {
		const race = stats.biggestRace
		card('races', '🏅', 'var(--green-600)', () => (
			<>
				Beyond parkrun, the club raced{' '}
				<strong>
					{stats.raceCount} other {stats.raceCount === 1 ? 'event' : 'events'}
				</strong>
				{stats.raceKm > 0 && (
					<>
						{' '}
						— <strong>{stats.raceKm.toLocaleString()} km</strong> between them
					</>
				)}
				{race && (
					<>
						. The biggest was <strong>{race.name}</strong> with {race.count}{' '}
						{race.count === 1 ? 'entrant' : 'entrants'}
					</>
				)}
			</>
		))
	}

	if (stats.longestRace) {
		const race = stats.longestRace
		card('longest-race', '🥾', 'var(--amber-600)', () => (
			<>
				The furthest anyone went in one go was{' '}
				<strong>{race.distanceKm} km</strong> —{' '}
				<strong>{joinNames(race.names)}</strong> at {race.name}
			</>
		))
	}

	return slides.map((slide, index) => ({
		...slide,
		gradient: SLIDE_GRADIENTS[index % SLIDE_GRADIENTS.length],
	}))
}
