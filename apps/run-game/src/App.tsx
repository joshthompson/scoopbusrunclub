import { Match, Switch, createSignal } from 'solid-js'
import { RunnerEditor } from './RunnerEditor'
import type { CustomRunner } from './customRunners'
import { Game, type Mode } from './game/Game'
import { LEVELS } from './levels'
import type { Level } from './levels/types'
import type { Playable } from './playable'
import { CharacterSelect } from './screens/CharacterSelect'
import { CreditsScreen } from './screens/CreditsScreen'
import { HighScoresScreen } from './screens/HighScoresScreen'
import { InstructionsScreen } from './screens/InstructionsScreen'
import { LevelSelect, type RunChoice } from './screens/LevelSelect'
import { OptionsScreen } from './screens/OptionsScreen'
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

type Screen =
	| { kind: MenuScreen }
	| { kind: 'edit'; runner?: CustomRunner }
	| { kind: 'levels'; runner: Playable }
	| { kind: 'play'; runner: Playable; level: Level; mode: Mode }

type Play = Extract<Screen, { kind: 'play' }>

export function App() {
	const [screen, setScreen] = createSignal<Screen>({ kind: 'title' })
	/** Whoever was picked last, so coming back to the list starts on them. */
	const [selectedId, setSelectedId] = createSignal<string>()
	/** And whichever run, Endless to begin with. */
	const [runChoice, setRunChoice] = createSignal<RunChoice>('endless')
	/** Where the title menu was left, so coming back to it starts there. */
	const [titleItem, setTitleItem] = createSignal(0)
	const go = (kind: MenuScreen) => () => setScreen({ kind })

	/** Endless from the first course, with nothing yet. */
	const endless = (runner: Playable): Play => ({
		kind: 'play',
		runner,
		level: LEVELS[0],
		mode: {
			kind: 'endless',
			cleared: 0,
			startScore: 0,
			runId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		},
	})
	/** Endless's next course, round to the first again after the last. */
	const next = (play: Play, score: number): Play => {
		if (play.mode.kind !== 'endless') return play
		const cleared = play.mode.cleared + 1
		return {
			...play,
			level: LEVELS[cleared % LEVELS.length],
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
			<Match when={screen().kind !== 'play'}>
				<Stage>
					<MenuBackdrop />
					<Switch>
						<Match when={screen().kind === 'title'}>
							<TitleScreen
								onSinglePlayer={go('select')}
								onHighScores={go('highScores')}
								onInstructions={go('instructions')}
								onOptions={go('options')}
								onCredits={go('credits')}
								initial={titleItem()}
								onChange={setTitleItem}
							/>
						</Match>
						<Match when={screen().kind === 'select'}>
							<CharacterSelect
								selectedId={selectedId()}
								onSelect={setSelectedId}
								onPick={(runner) => setScreen({ kind: 'levels', runner })}
								onEdit={(runner) => setScreen({ kind: 'edit', runner })}
								onBack={go('title')}
							/>
						</Match>
						<Match when={screen().kind === 'levels' && screen()}>
							{(levels) => (
								<LevelSelect
									runner={(levels() as { runner: Playable }).runner}
									selected={runChoice()}
									onSelect={setRunChoice}
									onEndless={() =>
										setScreen(
											endless((levels() as { runner: Playable }).runner),
										)
									}
									onPractice={(level) =>
										setScreen({
											kind: 'play',
											runner: (levels() as { runner: Playable }).runner,
											level,
											mode: { kind: 'practice' },
										})
									}
									onBack={go('select')}
								/>
							)}
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
						level={play.level}
						runner={play.runner}
						mode={play.mode}
						onNext={(score) => setScreen(next(play, score))}
						onRetry={() => setScreen(retry(play))}
						onQuit={go('select')}
						onCourses={() => setScreen({ kind: 'levels', runner: play.runner })}
						onMenu={go('title')}
					/>
				)}
			</Match>
		</Switch>
	)
}
