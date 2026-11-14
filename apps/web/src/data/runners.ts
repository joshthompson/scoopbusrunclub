import { generateFrames } from '@/utils'
import {
	type CharacterSpriteProps,
	createRunnerFrames,
} from '@/utils/createRunnerFrames'
import { CLUB_MEMBERS, type MemberFacts, type MemberKey } from '@shared/members'
import { type Accessor, type Setter, createSignal } from 'solid-js'
import * as assets from './runner-assets'

export const RUNNER_SIZE = 2
/** Frames to a stride in the walking strips, the skeletons', and what `frameInterval` is timed for. */
export const FRAME_COUNT = 4
/** Frames to a stride in the run and zombie strips: two more, in between, for a smoother run. */
export const RUN_FRAME_COUNT = 6

/**
 * How long to show each frame of a strip of `frames` for, `interval` being how
 * long each of a four-frame stride's is shown for: a stride takes as long
 * however many frames it's drawn in. Shorter strips are timed as they are.
 */
export function strideFrameInterval(interval: number, frames: number) {
	return frames > FRAME_COUNT ? (interval * FRAME_COUNT) / frames : interval
}

/**
 * The club's members, named by the key their page route uses. The names, ids
 * and birthdays themselves live in `@shared/members`, so the calendar feed the
 * backend generates describes the same people this scene draws.
 */
export type RunnerName = MemberKey

export type RunnerState =
	// Default
	| 'run'
	// Volunteer states
	| 'tail-walker'
	| 'scanner'
	| 'photographer'
	| 'run-director'
	| 'marshal'
	| 'number-checker'

export interface RunnerData extends MemberFacts {
	frames: {
		run: string[] | undefined
		/** Halloween's undead run, arms out in front, for getting up after a scoop. */
		zombie: string[] | undefined
		sit: string[] | undefined
		/** Stood still, for runners made from a custom look: the game's stand pose. */
		stand?: string[]
		face: string[]
		tailWalk: string[] // and Park Walker
		tailSit: string[]
		scanner: string[] // And Timekeeper
		photographer: string[]
		runDirector: string[]
		marshal: string[]
		volunteerGeneric: string[] // All other volunteer roles that don't have a specific sprite
		numberChecker: string[] // For the runner who checks numbers at the finish line
	}
	runnerState?: RunnerState
	color?: string
	/**
	 * The look they're drawn from, if they're made from one rather than drawn
	 * by hand: for drawing more of them from it, as the run game does.
	 */
	look?: CharacterSpriteProps
	/**
	 * One of their run frames' size, in the sprite's own pixels, which is the
	 * box they're drawn in: run frames have to be cut at exactly this width, or
	 * every frame lands a little off and they're squashed to fit. Poses drawn
	 * from a single image, sitting or at a volunteer post, are drawn at that
	 * image's own size, feet on the ground, whatever it is.
	 */
	width: number
	height: number
	speed: number
	frameInterval: number
	connectedTo?: string
	latestTime?: string
	volunteerRoles?: string[]
	time?: string
	/** The parkrun milestone they hit at the latest event, if they just hit one. */
	milestone?: number
	/**
	 * The middle of the runner themselves, in the sprite's own pixels, for
	 * anything that has to attach to them — currently the milestone balloons.
	 * Defaults to the middle of the sprite box, which is only wrong for the ones
	 * drawn at an odd size: a child in an adult-sized box, or a box that is
	 * mostly pram.
	 */
	centerPoint?: Vector
	/**
	 * The middle of their head, in the sprite's own pixels, for anything worn on
	 * it — currently Halloween's pumpkins. The middle of their face, that is,
	 * not of their hair as well: a ponytail or a bun out behind would put a
	 * pumpkin back there with it, trailing behind them as they run. `headPoint`
	 * is where it is while they're running or walking; `sitHeadPoint` is where it drops to in their
	 * sit sprite, which is lower and usually further back; `standHeadPoint` is
	 * where it is in their volunteer sprites, only needed where that's somewhere
	 * else from `headPoint` — Link turns round to face the other way for one.
	 * A runner without one goes without a pumpkin in that pose.
	 */
	headPoint?: Vector
	sitHeadPoint?: Vector
	standHeadPoint?: Vector
}

export function hasHeaderArtwork(runner: RunnerData): boolean {
	return Boolean(runner.frames.run?.length && runner.frames.sit?.length)
}

export const guestRunners: Record<
	string,
	[Accessor<RunnerData>, Setter<RunnerData>]
> = {}

/** Visitor-created racers, keyed `custom_<id>`, registered by the header at load. */
export const customRacerRunners: Record<
	string,
	[Accessor<RunnerData>, Setter<RunnerData>]
> = {}

/** Halloween's skeletons, keyed `skeleton_<n>`, registered by the header. */
export const skeletonRunners: Record<
	string,
	[Accessor<RunnerData>, Setter<RunnerData>]
> = {}

/**
 * Resolve any runner the header knows about — club member, guest, a racer a
 * visitor made, or a Halloween skeleton — since the scene treats them all the
 * same once they're running.
 */
export function findRunnerSignal(
	id: string,
): [Accessor<RunnerData>, Setter<RunnerData>] | undefined {
	return (
		runners[id as RunnerName] ??
		guestRunners[id] ??
		customRacerRunners[id] ??
		skeletonRunners[id]
	)
}

export const runners: Record<
	RunnerName,
	[Accessor<RunnerData>, Setter<RunnerData>]
> = {
	josh: createSignal<RunnerData>({
		...CLUB_MEMBERS.josh,
		color: '#e0382f',
		frames: {
			run: generateFrames(
				assets.joshRun,
				23 * RUN_FRAME_COUNT,
				29,
				23 * RUNNER_SIZE,
				RUN_FRAME_COUNT,
				true,
			),
			zombie: generateFrames(
				assets.joshZombie,
				23 * RUN_FRAME_COUNT,
				29,
				23 * RUNNER_SIZE,
				RUN_FRAME_COUNT,
				true,
			),
			sit: [assets.joshSit],
			face: [assets.joshFace],
			tailWalk: generateFrames(
				assets.joshTailWalk,
				23 * FRAME_COUNT,
				29,
				23 * RUNNER_SIZE,
				FRAME_COUNT,
				true,
			),
			tailSit: [assets.joshTailSit],
			scanner: [assets.joshScanner],
			photographer: [assets.joshPhotographer],
			runDirector: [assets.joshRunDirector],
			marshal: [assets.joshMarshal],
			volunteerGeneric: undefined,
			numberChecker: [assets.joshNumberChecker],
		},
		width: 23,
		height: 29,
		headPoint: { x: 10, y: 4 },
		sitHeadPoint: { x: 10, y: 14 },
		speed: 4,
		frameInterval: 62,
	}),
	keith: createSignal<RunnerData>({
		...CLUB_MEMBERS.keith,
		color: '#414443',
		frames: {
			run: generateFrames(
				assets.keithRun,
				23 * RUN_FRAME_COUNT,
				29,
				23 * RUNNER_SIZE,
				RUN_FRAME_COUNT,
				true,
			),
			zombie: generateFrames(
				assets.keithZombie,
				23 * RUN_FRAME_COUNT,
				29,
				23 * RUNNER_SIZE,
				RUN_FRAME_COUNT,
				true,
			),
			sit: [assets.keithSit],
			face: [assets.keithFace],
			tailWalk: generateFrames(
				assets.keithTailWalk,
				23 * FRAME_COUNT,
				29,
				23 * RUNNER_SIZE,
				FRAME_COUNT,
				true,
			),
			tailSit: [assets.keithTailSit],
			scanner: [assets.keithScanner],
			photographer: [assets.keithPhotographer],
			runDirector: [assets.keithRunDirector],
			marshal: [assets.keithMarshal],
			volunteerGeneric: undefined,
			numberChecker: [assets.keithNumberChecker],
		},
		width: 23,
		height: 29,
		headPoint: { x: 9, y: 4 },
		sitHeadPoint: { x: 10, y: 13 },
		standHeadPoint: { x: 11, y: 4 },
		speed: 3,
		frameInterval: 80,
	}),
	claire: createSignal<RunnerData>({
		...CLUB_MEMBERS.claire,
		color: '#9a54bf',
		frames: {
			run: generateFrames(
				assets.claireRun,
				23 * RUN_FRAME_COUNT,
				29,
				23 * RUNNER_SIZE,
				RUN_FRAME_COUNT,
				true,
			),
			zombie: generateFrames(
				assets.claireZombie,
				23 * RUN_FRAME_COUNT,
				29,
				23 * RUNNER_SIZE,
				RUN_FRAME_COUNT,
				true,
			),
			sit: [assets.claireSit],
			tailWalk: generateFrames(
				assets.claireTailWalk,
				23 * FRAME_COUNT,
				29,
				23 * RUNNER_SIZE,
				FRAME_COUNT,
				true,
			),
			tailSit: [assets.claireTailSit],
			face: [assets.claireFace],
			scanner: [assets.claireScanner],
			photographer: [assets.clairePhotographer],
			runDirector: [assets.claireRunDirector],
			marshal: [assets.claireMarshal],
			volunteerGeneric: undefined,
			numberChecker: [assets.claireNumberChecker],
		},
		width: 23,
		height: 29,
		headPoint: { x: 9.5, y: 5 },
		sitHeadPoint: { x: 13, y: 13 },
		speed: 2,
		frameInterval: 125,
	}),
	lyra: createSignal<RunnerData>({
		...CLUB_MEMBERS.lyra,
		color: '#a377bc',
		frames: {
			run: generateFrames(
				assets.lyraRun,
				23 * RUN_FRAME_COUNT,
				29,
				23 * RUNNER_SIZE,
				RUN_FRAME_COUNT,
				true,
			),
			zombie: generateFrames(
				assets.lyraZombie,
				23 * RUN_FRAME_COUNT,
				29,
				23 * RUNNER_SIZE,
				RUN_FRAME_COUNT,
				true,
			),
			sit: [assets.lyraSit],
			face: [assets.lyraFace],
			tailWalk: generateFrames(
				assets.lyraTailWalk,
				23 * FRAME_COUNT,
				29,
				23 * RUNNER_SIZE,
				FRAME_COUNT,
				true,
			),
			tailSit: [assets.lyraTailSit],
			scanner: [assets.lyraScanner],
			photographer: [assets.lyraPhotographer],
			runDirector: [assets.lyraRunDirector],
			marshal: [assets.lyraMarshal],
			volunteerGeneric: undefined,
			numberChecker: [assets.lyraNumberChecker],
		},
		width: 23,
		height: 29,
		centerPoint: { x: 9, y: 19 },
		headPoint: { x: 9, y: 14 },
		sitHeadPoint: { x: 10, y: 17 },
		standHeadPoint: { x: 11, y: 12 },
		speed: 1.5,
		frameInterval: 80,
	}),
	adam: createSignal<RunnerData>({
		...CLUB_MEMBERS.adam,
		color: '#e4e3e2',
		frames: {
			run: generateFrames(
				assets.adamRun,
				23 * RUN_FRAME_COUNT,
				31,
				23 * RUNNER_SIZE,
				RUN_FRAME_COUNT,
				true,
			),
			zombie: generateFrames(
				assets.adamZombie,
				23 * RUN_FRAME_COUNT,
				31,
				23 * RUNNER_SIZE,
				RUN_FRAME_COUNT,
				true,
			),
			sit: [assets.adamSit],
			face: [assets.adamFace],
			tailWalk: generateFrames(
				assets.adamTailWalk,
				23 * FRAME_COUNT,
				31,
				23 * RUNNER_SIZE,
				FRAME_COUNT,
				true,
			),
			tailSit: [assets.adamTailSit],
			scanner: [assets.adamScanner],
			photographer: [assets.adamPhotographer],
			runDirector: [assets.adamRunDirector],
			marshal: [assets.adamMarshal],
			volunteerGeneric: undefined,
			numberChecker: [assets.adamNumberChecker],
		},
		width: 23,
		height: 31,
		headPoint: { x: 10, y: 4 },
		sitHeadPoint: { x: 12, y: 14 },
		speed: 3.9,
		frameInterval: 65,
	}),
	anna: createSignal<RunnerData>({
		...CLUB_MEMBERS.anna,
		color: '#1b5f56',
		frames: {
			run: generateFrames(
				assets.annaRun,
				23 * RUN_FRAME_COUNT,
				29,
				23 * RUNNER_SIZE,
				RUN_FRAME_COUNT,
				true,
			),
			zombie: generateFrames(
				assets.annaZombie,
				23 * RUN_FRAME_COUNT,
				29,
				23 * RUNNER_SIZE,
				RUN_FRAME_COUNT,
				true,
			),
			sit: [assets.annaSit],
			face: [assets.annaFace],
			tailWalk: generateFrames(
				assets.annaTailWalk,
				23 * FRAME_COUNT,
				29,
				23 * RUNNER_SIZE,
				FRAME_COUNT,
				true,
			),
			tailSit: [assets.annaTailSit],
			scanner: [assets.annaScanner],
			photographer: [assets.annaPhotographer],
			runDirector: [assets.annaRunDirector],
			marshal: [assets.annaMarshal],
			volunteerGeneric: undefined,
			numberChecker: [assets.annaNumberChecker],
		},
		width: 23,
		height: 29,
		headPoint: { x: 10, y: 5 },
		sitHeadPoint: { x: 12, y: 13 },
		standHeadPoint: { x: 12, y: 5 },
		speed: 1.5,
		frameInterval: 120,
	}),
	eline: createSignal<RunnerData>({
		...CLUB_MEMBERS.eline,
		color: '#e16c04',
		frames: {
			run: generateFrames(
				assets.elineRun,
				23 * RUN_FRAME_COUNT,
				29,
				23 * RUNNER_SIZE,
				RUN_FRAME_COUNT,
				true,
			),
			zombie: generateFrames(
				assets.elineZombie,
				23 * RUN_FRAME_COUNT,
				29,
				23 * RUNNER_SIZE,
				RUN_FRAME_COUNT,
				true,
			),
			sit: [assets.elineSit],
			face: [assets.elineFace],
			tailWalk: generateFrames(
				assets.elineTailWalk,
				23 * FRAME_COUNT,
				29,
				23 * RUNNER_SIZE,
				FRAME_COUNT,
				true,
			),
			tailSit: [assets.elineTailSit],
			scanner: [assets.elineScanner],
			runDirector: [assets.elineRunDirector],
			photographer: [assets.elinePhotographer],
			marshal: [assets.elineMarshal],
			volunteerGeneric: undefined,
			numberChecker: [assets.elineNumberChecker],
		},
		width: 23,
		height: 29,
		headPoint: { x: 11, y: 5 },
		sitHeadPoint: { x: 13, y: 14 },
		standHeadPoint: { x: 11, y: 5 },
		speed: 3.2,
		frameInterval: 75,
	}),
	rick: createSignal<RunnerData>({
		...CLUB_MEMBERS.rick,
		color: '#5a40a6',
		frames: {
			run: generateFrames(
				assets.rickRun,
				23 * RUN_FRAME_COUNT,
				29,
				23 * RUNNER_SIZE,
				RUN_FRAME_COUNT,
				true,
			),
			zombie: generateFrames(
				assets.rickZombie,
				23 * RUN_FRAME_COUNT,
				29,
				23 * RUNNER_SIZE,
				RUN_FRAME_COUNT,
				true,
			),
			sit: [assets.rickSit],
			face: [assets.rickFace],
			tailWalk: generateFrames(
				assets.rickTailWalk,
				23 * FRAME_COUNT,
				29,
				23 * RUNNER_SIZE,
				FRAME_COUNT,
				true,
			),
			tailSit: [assets.rickTailSit],
			scanner: [assets.rickScanner],
			photographer: [assets.rickPhotographer],
			runDirector: [assets.rickRunDirector],
			marshal: [assets.rickMarshal],
			volunteerGeneric: undefined,
			numberChecker: [assets.rickNumberChecker],
		},
		width: 23,
		height: 29,
		headPoint: { x: 11, y: 5 },
		sitHeadPoint: { x: 12, y: 13 },
		speed: 3.2,
		frameInterval: 75,
	}),
	sophie: createSignal<RunnerData>({
		...CLUB_MEMBERS.sophie,
		color: '#00aa47',
		frames: {
			run: generateFrames(
				assets.sophieRun,
				23 * RUN_FRAME_COUNT,
				29,
				23 * RUNNER_SIZE,
				RUN_FRAME_COUNT,
				true,
			),
			zombie: generateFrames(
				assets.sophieZombie,
				23 * RUN_FRAME_COUNT,
				29,
				23 * RUNNER_SIZE,
				RUN_FRAME_COUNT,
				true,
			),
			sit: [assets.sophieSit],
			face: [assets.sophieFace],
			tailWalk: generateFrames(
				assets.sophieTailWalk,
				23 * FRAME_COUNT,
				29,
				23 * RUNNER_SIZE,
				FRAME_COUNT,
				true,
			),
			tailSit: [assets.sophieTailSit],
			scanner: [assets.sophieScanner],
			photographer: [assets.sophiePhotographer],
			runDirector: [assets.sophieRunDirector],
			marshal: [assets.sophieMarshal],
			volunteerGeneric: undefined,
			numberChecker: [assets.sophieNumberChecker],
		},
		width: 23,
		height: 29,
		headPoint: { x: 11, y: 5 },
		sitHeadPoint: { x: 13, y: 14 },
		speed: 3.2,
		frameInterval: 75,
	}),
	august: createSignal<RunnerData>({
		...CLUB_MEMBERS.august,
		color: '#27336a',
		frames: {
			run: generateFrames(
				assets.augustRun,
				50 * RUN_FRAME_COUNT,
				30,
				50 * RUNNER_SIZE,
				RUN_FRAME_COUNT,
				true,
			),
			zombie: generateFrames(
				assets.augustZombie,
				50 * RUN_FRAME_COUNT,
				30,
				50 * RUNNER_SIZE,
				RUN_FRAME_COUNT,
				true,
			),
			sit: [assets.augustSit],
			face: [assets.augustFace],
			tailWalk: generateFrames(
				assets.augustTailWalk,
				50 * FRAME_COUNT,
				30,
				50 * RUNNER_SIZE,
				FRAME_COUNT,
				true,
			),
			tailSit: [assets.augustTailSit],
			scanner: [assets.augustScanner],
			runDirector: [assets.augustRunDirector],
			photographer: [assets.augustPhotographer],
			marshal: [assets.augustMarshal],
			volunteerGeneric: undefined,
			numberChecker: [assets.augustNumberChecker],
		},
		width: 50,
		height: 30,
		centerPoint: { x: 37, y: 12 },
		headPoint: { x: 34, y: 4 },
		sitHeadPoint: { x: 37, y: 14 },
		standHeadPoint: { x: 36, y: 4 },
		speed: 3.2,
		frameInterval: 100,
	}),
	alisa: createSignal<RunnerData>({
		...CLUB_MEMBERS.alisa,
		color: '#d3b0df',
		frames: {
			run: generateFrames(
				assets.alisaRun,
				23 * RUN_FRAME_COUNT,
				29,
				23 * RUNNER_SIZE,
				RUN_FRAME_COUNT,
				true,
			),
			zombie: generateFrames(
				assets.alisaZombie,
				23 * RUN_FRAME_COUNT,
				29,
				23 * RUNNER_SIZE,
				RUN_FRAME_COUNT,
				true,
			),
			sit: [assets.alisaSit],
			tailWalk: generateFrames(
				assets.alisaTailWalk,
				23 * FRAME_COUNT,
				29,
				23 * RUNNER_SIZE,
				FRAME_COUNT,
				true,
			),
			tailSit: [assets.alisaTailSit],
			face: [assets.alisaFace],
			scanner: [assets.alisaScanner],
			photographer: [assets.alisaPhotographer],
			runDirector: [assets.alisaRunDirector],
			marshal: [assets.alisaMarshal],
			volunteerGeneric: undefined,
			numberChecker: [assets.alisaNumberChecker],
		},
		width: 23,
		height: 29,
		headPoint: { x: 12, y: 5 },
		sitHeadPoint: { x: 13, y: 14 },
		speed: 2.5,
		frameInterval: 75,
	}),
	link: createSignal<RunnerData>({
		...CLUB_MEMBERS.link,
		color: '#ef9801',
		frames: {
			run: generateFrames(assets.linkRun, 20 * 2, 28, 20 * 2, 2, true),
			zombie: generateFrames(assets.linkZombie, 20 * 2, 28, 20 * 2, 2, true),
			sit: [assets.linkSit],
			tailWalk: generateFrames(
				assets.linkTailWalk,
				20 * 2,
				28,
				20 * 2,
				2,
				true,
			),
			tailSit: [assets.linkTailSit],
			face: [assets.linkFace],
			scanner: [assets.linkScanner],
			photographer: undefined,
			runDirector: undefined,
			marshal: undefined,
			// The scanner pose stands in for every role he has no sprite of his own for
			volunteerGeneric: [assets.linkScanner],
			numberChecker: undefined,
		},
		width: 20,
		height: 28,
		headPoint: { x: 5, y: 20 },
		sitHeadPoint: { x: 5, y: 21 },
		standHeadPoint: { x: 16, y: 20 },
		speed: 2.5,
		frameInterval: 75,
		connectedTo: 'alisa',
	}),
	otherJosh: createSignal<RunnerData>({
		...CLUB_MEMBERS.otherJosh,
		color: '#985aac',
		frames: {
			run: generateFrames(
				assets.otherJoshRun,
				23 * RUN_FRAME_COUNT,
				29,
				23 * RUNNER_SIZE,
				RUN_FRAME_COUNT,
				true,
			),
			zombie: generateFrames(
				assets.otherJoshZombie,
				23 * RUN_FRAME_COUNT,
				29,
				23 * RUNNER_SIZE,
				RUN_FRAME_COUNT,
				true,
			),
			sit: [assets.otherJoshSit],
			face: [assets.otherJoshFace],
			tailWalk: generateFrames(
				assets.otherJoshTailWalk,
				23 * FRAME_COUNT,
				29,
				23 * RUNNER_SIZE,
				FRAME_COUNT,
				true,
			),
			tailSit: [assets.otherJoshTailSit],
			scanner: [assets.otherJoshScanner],
			photographer: [assets.otherJoshPhotographer],
			runDirector: [assets.otherJoshRunDirector],
			marshal: [assets.otherJoshMarshal],
			volunteerGeneric: undefined,
			numberChecker: [assets.otherJoshNumberChecker],
		},
		width: 23,
		height: 29,
		headPoint: { x: 10, y: 5 },
		sitHeadPoint: { x: 10, y: 14 },
		speed: 2.5,
		frameInterval: 80,
	}),
	mikael: createSignal<RunnerData>({
		...CLUB_MEMBERS.mikael,
		color: '#17296c',
		frames: {
			run: generateFrames(
				assets.mikaelRun,
				23 * RUN_FRAME_COUNT,
				29,
				23 * RUNNER_SIZE,
				RUN_FRAME_COUNT,
				true,
			),
			zombie: generateFrames(
				assets.mikaelZombie,
				23 * RUN_FRAME_COUNT,
				29,
				23 * RUNNER_SIZE,
				RUN_FRAME_COUNT,
				true,
			),
			sit: [assets.mikaelSit],
			face: [assets.mikaelFace],
			tailWalk: generateFrames(
				assets.mikaelTailWalk,
				23 * FRAME_COUNT,
				29,
				23 * RUNNER_SIZE,
				FRAME_COUNT,
				true,
			),
			tailSit: [assets.mikaelTailSit],
			scanner: [assets.mikaelScanner],
			photographer: [assets.mikaelPhotographer],
			runDirector: [assets.mikaelRunDirector],
			marshal: [assets.mikaelMarshal],
			volunteerGeneric: undefined,
			numberChecker: [assets.mikaelNumberChecker],
		},
		width: 23,
		height: 29,
		headPoint: { x: 11, y: 5 },
		sitHeadPoint: { x: 12, y: 13 },
		speed: 3.2,
		frameInterval: 75,
	}),
	mia: createSignal<RunnerData>({
		...CLUB_MEMBERS.mia,
		color: '#333333',
		...createRunnerFrames({
			topType: 'tshirt',
			skin: 'light',
			bottomType: 'shorts',
			topColor: '#333333',
			bottomColor: '#403d74',
			showColor: '#0000FF',
			shoeColor: '#b62b14',
			head: {
				hair: 'medium',
				hairColor: '#b8aa71',
			},
		}),
		speed: 3.2,
		frameInterval: 75,
	}),
	david: createSignal<RunnerData>({
		...CLUB_MEMBERS.david,
		color: '#81BBBE',
		...createRunnerFrames({
			topType: 'tshirt',
			skin: 'light',
			bottomType: 'shorts',
			topColor: '#81BBBE',
			bottomColor: '#0E0403',
			showColor: '#0000FF',
			sockColor: '#FFFFFF',
			shoeColor: '#BBBBBB',
			head: {
				hair: 'short',
				hairColor: '#905e37',
			},
		}),
		speed: 3.2,
		frameInterval: 75,
	}),
}
