import {
	Match,
	Switch,
	createEffect,
	createSignal,
	lazy,
	onCleanup,
	onMount,
} from 'solid-js'
import { COURSES } from './courses'
import type { Course } from './courses/types'
import { playMenu, playTune, unlockMusic } from './music/music'
import type { CustomRunner } from './runners/customRunners'
import type { Playable } from './runners/playable'
import {
	lastRun,
	lastRunner,
	rememberRun,
	rememberRunner,
} from './saved/settings'
import { CharacterSelect } from './screens/CharacterSelect'
import { CollectablesScreen } from './screens/CollectablesScreen'
import { CourseSelect, type RunChoice } from './screens/CourseSelect'
import { CreditsScreen } from './screens/CreditsScreen'
import { Game, type Mode } from './screens/Game'
import { HighScoresScreen } from './screens/HighScoresScreen'
import { InstructionsScreen } from './screens/InstructionsScreen'
import { MultiPlayerScreen } from './screens/MultiPlayerScreen'
import { OptionsScreen } from './screens/OptionsScreen'
import { RunnerEditor } from './screens/RunnerEditor'
import { TitleScreen } from './screens/TitleScreen'
import { MenuBackdrop } from './ui/MenuBackdrop'
import { Stage } from './ui/Stage'

type MenuScreen =
	| 'title'
	| 'select'
	| 'highScores'
	| 'instructions'
	| 'options'
	| 'credits'
	| 'collectables'
	| 'multi'

type Screen =
	| { kind: MenuScreen }
	| { kind: 'edit'; runner?: CustomRunner }
	| { kind: 'courses'; runner: Playable }
	| { kind: 'play'; runner: Playable; course: Course; mode: Mode }
	| { kind: 'party' }
	/** Joined to someone else's Room, from this computer: `code`, if it came with one. */
	| { kind: 'join'; code?: string }

type Play = Extract<Screen, { kind: 'play' }>

/** Multi Player, in a chunk of its own: trystero and all only load if it's picked. */
const Party = lazy(() => import('./multiplayer/Party'))
/** And joining someone else's, from a computer. */
const Joined = lazy(() => import('./multiplayer/Joined'))

export function App(props: {
	/** Opened from a Room's link on a computer: joining it, with its code. */
	join?: string
}) {
	const [screen, setScreen] = createSignal<Screen>(
		props.join === undefined
			? { kind: 'title' }
			: { kind: 'join', code: props.join },
	)
	/** Whoever was picked last, so coming back to the list starts on them. */
	const [selectedId, setSelectedId] = createSignal<string | undefined>(
		lastRunner(),
	)
	/** And whichever run, Endless to begin with. */
	const [runChoice, setRunChoice] = createSignal<RunChoice>(
		(lastRun() as RunChoice | undefined) ?? 'endless',
	)
	/** Where the title menu was left, so coming back to it starts there. */
	const [titleItem, setTitleItem] = createSignal(0)
	const go = (kind: MenuScreen) => () => setScreen({ kind })

	// The music: a course's tune while it's run, and in the menus, the menus'
	// own till a course has been run, then whatever was last on. Multi
	// Player picks its own.
	createEffect(() => {
		const now = screen()
		if (now.kind === 'play') playTune(now.course.id)
		else if (now.kind !== 'party' && now.kind !== 'join') playMenu()
	})
	// It can only start once something's been pressed or tapped.
	onMount(() => {
		const unlock = () => unlockMusic()
		window.addEventListener('keydown', unlock)
		window.addEventListener('pointerdown', unlock)
		onCleanup(() => {
			window.removeEventListener('keydown', unlock)
			window.removeEventListener('pointerdown', unlock)
		})
	})

	/** Endless from the first course, with nothing yet. */
	const endless = (runner: Playable): Play => ({
		kind: 'play',
		runner,
		course: COURSES[0],
		mode: {
			kind: 'endless',
			cleared: 0,
			startScore: 0,
			runId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		},
	})
	/** Endless's next course, round to the first again after the last. */
	const next = (play: Play, score: number): Play => {
		// Practising: the next course along, to practise.
		if (play.mode.kind !== 'endless') {
			const index = COURSES.findIndex((course) => course.id === play.course.id)
			const course = COURSES[index + 1] ?? play.course
			rememberRun(course.id)
			return { ...play, course }
		}
		const cleared = play.mode.cleared + 1
		return {
			...play,
			course: COURSES[cleared % COURSES.length],
			mode: { ...play.mode, cleared, startScore: score },
		}
	}
	/** The same again, as a new object so the game's rebuilt: Endless from the start. */
	const retry = (play: Play): Play =>
		play.mode.kind === 'endless' ? endless(play.runner) : { ...play }

	return (
		<Switch>
			{/*
			 * The menus share one stage and one scene behind them, which keeps
			 * running from screen to screen rather than starting over each time.
			 */}
			<Match when={screen().kind === 'party'}>
				<Party onLeave={go('title')} />
			</Match>
			<Match when={screen().kind === 'join' && screen()}>
				{(join) => (
					<Joined
						code={(join() as { code?: string }).code}
						onLeave={go('multi')}
					/>
				)}
			</Match>
			<Match when={screen().kind !== 'play'}>
				<Stage>
					<MenuBackdrop />
					<Switch>
						<Match when={screen().kind === 'title'}>
							<TitleScreen
								onSinglePlayer={go('select')}
								onMultiPlayer={go('multi')}
								onHighScores={go('highScores')}
								onInstructions={go('instructions')}
								onOptions={go('options')}
								onCollectables={go('collectables')}
								onCredits={go('credits')}
								initial={titleItem()}
								onChange={setTitleItem}
							/>
						</Match>
						<Match when={screen().kind === 'select'}>
							<CharacterSelect
								selectedId={selectedId()}
								onSelect={setSelectedId}
								onPick={(runner) => {
									rememberRunner(runner.id)
									setScreen({ kind: 'courses', runner })
								}}
								onEdit={(runner) => setScreen({ kind: 'edit', runner })}
								onBack={go('title')}
							/>
						</Match>
						<Match when={screen().kind === 'courses' && screen()}>
							{(courses) => (
								<CourseSelect
									runner={(courses() as { runner: Playable }).runner}
									selected={runChoice()}
									onSelect={setRunChoice}
									onEndless={() => {
										rememberRun('endless')
										setScreen(
											endless((courses() as { runner: Playable }).runner),
										)
									}}
									onPractice={(course) => {
										rememberRun(course.id)
										setScreen({
											kind: 'play',
											runner: (courses() as { runner: Playable }).runner,
											course,
											mode: { kind: 'practice' },
										})
									}}
									onBack={go('select')}
								/>
							)}
						</Match>
						<Match when={screen().kind === 'multi'}>
							<MultiPlayerScreen
								onHost={() => setScreen({ kind: 'party' })}
								onJoin={() => setScreen({ kind: 'join' })}
								onBack={go('title')}
							/>
						</Match>
						<Match when={screen().kind === 'highScores'}>
							<HighScoresScreen onBack={go('title')} />
						</Match>
						<Match when={screen().kind === 'instructions'}>
							<InstructionsScreen onBack={go('title')} />
						</Match>
						<Match when={screen().kind === 'options'}>
							<OptionsScreen onBack={go('title')} />
						</Match>
						<Match when={screen().kind === 'credits'}>
							<CreditsScreen onBack={go('title')} />
						</Match>
						<Match when={screen().kind === 'collectables'}>
							<CollectablesScreen onBack={go('title')} />
						</Match>
						<Match when={screen().kind === 'edit' && screen()}>
							{(edit) => (
								<RunnerEditor
									runner={(edit() as { runner?: CustomRunner }).runner}
									onSave={(runner) => {
										setSelectedId(`custom:${runner.id}`)
										setScreen({ kind: 'select' })
									}}
									onCancel={go('select')}
									onDelete={() => {
										setSelectedId(undefined)
										setScreen({ kind: 'select' })
									}}
								/>
							)}
						</Match>
					</Switch>
				</Stage>
			</Match>
			{/* Keyed: a new course, or another go, is a whole new game. */}
			<Match when={screen().kind === 'play' && (screen() as Play)} keyed>
				{(play) => (
					<Game
						course={play.course}
						runner={play.runner}
						mode={play.mode}
						onNext={(score) => setScreen(next(play, score))}
						onRetry={() => setScreen(retry(play))}
						onQuit={go('select')}
						onCourses={() =>
							setScreen({ kind: 'courses', runner: play.runner })
						}
						onMenu={go('title')}
					/>
				)}
			</Match>
		</Switch>
	)
}
