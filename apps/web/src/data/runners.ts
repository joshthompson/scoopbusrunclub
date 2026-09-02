import { generateFrames } from '@/utils'
import { createRunnerFrames } from '@/utils/createRunnerFrames'
import { CLUB_MEMBERS, type MemberFacts, type MemberKey } from '@shared/members'
import { type Accessor, type Setter, createSignal } from 'solid-js'
import * as assets from './runner-assets'

export const RUNNER_SIZE = 2
export const FRAME_COUNT = 4

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
		sit: string[] | undefined
		face: string[] | undefined
		tailWalk: string[] | undefined // and Park Walker
		tailSit: string[] | undefined
		scanner: string[] | undefined // And Timekeeper
		photographer: string[] | undefined
		runDirector: string[] | undefined
		marshal: string[] | undefined
		volunteerGeneric: string[] | undefined // All other volunteer roles that don't have a specific sprite
		numberChecker: string[] | undefined // For the runner who checks numbers at the finish line
	}
	runnerState?: RunnerState
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

/**
 * Resolve any runner the header knows about — club member, guest, or a racer a
 * visitor made — since the scene treats all three the same once they're running.
 */
export function findRunnerSignal(
	id: string,
): [Accessor<RunnerData>, Setter<RunnerData>] | undefined {
	return runners[id as RunnerName] ?? guestRunners[id] ?? customRacerRunners[id]
}

export const runners: Record<
	RunnerName,
	[Accessor<RunnerData>, Setter<RunnerData>]
> = {
	josh: createSignal<RunnerData>({
		...CLUB_MEMBERS.josh,
		frames: {
			run: generateFrames(
				assets.joshRun,
				22 * FRAME_COUNT,
				28,
				22 * RUNNER_SIZE,
				FRAME_COUNT,
				true,
			),
			sit: [assets.joshSit],
			face: [assets.joshFace],
			tailWalk: generateFrames(
				assets.joshTailWalk,
				22 * FRAME_COUNT,
				28,
				22 * RUNNER_SIZE,
				FRAME_COUNT,
				true,
			),
			tailSit: [assets.joshTailSit],
			scanner: [assets.joshScanner],
			photographer: undefined,
			runDirector: undefined,
			marshal: undefined,
			volunteerGeneric: undefined,
			numberChecker: [assets.joshNumberChecker],
		},
		width: 21,
		height: 28,
		speed: 4,
		frameInterval: 62,
	}),
	keith: createSignal<RunnerData>({
		...CLUB_MEMBERS.keith,
		frames: {
			run: generateFrames(
				assets.keithRun,
				22 * FRAME_COUNT,
				28,
				22 * RUNNER_SIZE,
				FRAME_COUNT,
				true,
			),
			sit: [assets.keithSit],
			face: [assets.keithFace],
			tailWalk: undefined,
			tailSit: undefined,
			scanner: undefined,
			photographer: [assets.keithPhotographer],
			runDirector: undefined,
			marshal: undefined,
			volunteerGeneric: undefined,
			numberChecker: undefined,
		},
		width: 21,
		height: 28,
		speed: 3,
		frameInterval: 80,
	}),
	claire: createSignal<RunnerData>({
		...CLUB_MEMBERS.claire,
		frames: {
			run: generateFrames(
				assets.claireRun,
				22 * FRAME_COUNT,
				28,
				22 * RUNNER_SIZE,
				FRAME_COUNT,
				true,
			),
			sit: [assets.claireSit],
			tailWalk: generateFrames(
				assets.claireTailWalk,
				22 * FRAME_COUNT,
				28,
				22 * RUNNER_SIZE,
				FRAME_COUNT,
				true,
			),
			tailSit: [assets.claireTailSit],
			face: [assets.claireFace],
			scanner: [assets.claireScanner],
			photographer: undefined,
			runDirector: [assets.claireRunDirector],
			marshal: undefined,
			volunteerGeneric: undefined,
			numberChecker: undefined,
		},
		width: 21,
		height: 28,
		speed: 2,
		frameInterval: 125,
	}),
	lyra: createSignal<RunnerData>({
		...CLUB_MEMBERS.lyra,
		frames: {
			run: generateFrames(
				assets.lyraRun,
				22 * FRAME_COUNT,
				28,
				22 * RUNNER_SIZE,
				FRAME_COUNT,
				true,
			),
			sit: [assets.lyraSit],
			face: [assets.lyraFace],
			tailWalk: generateFrames(
				assets.lyraTailWalk,
				22 * FRAME_COUNT,
				28,
				22 * RUNNER_SIZE,
				FRAME_COUNT,
				true,
			),
			tailSit: [assets.lyraTailSit],
			scanner: undefined,
			photographer: undefined,
			runDirector: undefined,
			marshal: [assets.lyraMarshal],
			volunteerGeneric: undefined,
			numberChecker: undefined,
		},
		width: 21,
		height: 28,
		centerPoint: { x: 9, y: 19 },
		speed: 1.5,
		frameInterval: 80,
	}),
	adam: createSignal<RunnerData>({
		...CLUB_MEMBERS.adam,
		frames: {
			run: generateFrames(
				assets.adamRun,
				22 * FRAME_COUNT,
				30,
				22 * RUNNER_SIZE,
				FRAME_COUNT,
				true,
			),
			sit: [assets.adamSit],
			face: [assets.adamFace],
			tailWalk: undefined,
			tailSit: undefined,
			scanner: undefined,
			photographer: undefined,
			runDirector: undefined,
			marshal: undefined,
			volunteerGeneric: undefined,
			numberChecker: undefined,
		},
		width: 21,
		height: 30,
		speed: 3.9,
		frameInterval: 65,
	}),
	anna: createSignal<RunnerData>({
		...CLUB_MEMBERS.anna,
		frames: {
			run: generateFrames(
				assets.annaRun,
				22 * FRAME_COUNT,
				28,
				22 * RUNNER_SIZE,
				FRAME_COUNT,
				true,
			),
			sit: [assets.annaSit],
			face: [assets.annaFace],
			tailWalk: generateFrames(
				assets.annaTailWalk,
				22 * FRAME_COUNT,
				28,
				22 * RUNNER_SIZE,
				FRAME_COUNT,
				true,
			),
			tailSit: [assets.annaTailSit],
			scanner: undefined,
			photographer: undefined,
			runDirector: undefined,
			marshal: [assets.annaMarshal],
			volunteerGeneric: undefined,
			numberChecker: undefined,
		},
		width: 21,
		height: 28,
		speed: 1.5,
		frameInterval: 120,
	}),
	eline: createSignal<RunnerData>({
		...CLUB_MEMBERS.eline,
		frames: {
			run: generateFrames(
				assets.elineRun,
				22 * FRAME_COUNT,
				28,
				22 * RUNNER_SIZE,
				FRAME_COUNT,
				true,
			),
			sit: [assets.elineSit],
			face: [assets.elineFace],
			tailWalk: undefined,
			tailSit: undefined,
			scanner: [assets.elineScanner],
			runDirector: [assets.elineRunDirector],
			photographer: undefined,
			marshal: undefined,
			volunteerGeneric: undefined,
			numberChecker: undefined,
		},
		width: 21,
		height: 28,
		speed: 3.2,
		frameInterval: 75,
	}),
	rick: createSignal<RunnerData>({
		...CLUB_MEMBERS.rick,
		frames: {
			run: generateFrames(
				assets.rickRun,
				22 * FRAME_COUNT,
				28,
				22 * RUNNER_SIZE,
				FRAME_COUNT,
				true,
			),
			sit: [assets.rickSit],
			face: [assets.rickFace],
			tailWalk: undefined,
			tailSit: undefined,
			scanner: [assets.rickScanner],
			photographer: undefined,
			runDirector: undefined,
			marshal: [assets.rickMarshal],
			volunteerGeneric: undefined,
			numberChecker: undefined,
		},
		width: 21,
		height: 28,
		speed: 3.2,
		frameInterval: 75,
	}),
	sophie: createSignal<RunnerData>({
		...CLUB_MEMBERS.sophie,
		frames: {
			run: generateFrames(
				assets.sophieRun,
				22 * FRAME_COUNT,
				28,
				22 * RUNNER_SIZE,
				FRAME_COUNT,
				true,
			),
			sit: [assets.sophieSit],
			face: [assets.sophieFace],
			tailWalk: undefined,
			tailSit: undefined,
			scanner: undefined,
			photographer: undefined,
			runDirector: undefined,
			marshal: undefined,
			volunteerGeneric: undefined,
			numberChecker: undefined,
		},
		width: 21,
		height: 28,
		speed: 3.2,
		frameInterval: 75,
	}),
	august: createSignal<RunnerData>({
		...CLUB_MEMBERS.august,
		frames: {
			run: generateFrames(
				assets.augustRun,
				50 * FRAME_COUNT,
				30,
				50 * RUNNER_SIZE,
				FRAME_COUNT,
				true,
			),
			sit: [assets.augustSit],
			face: [assets.augustFace],
			tailWalk: undefined,
			tailSit: undefined,
			scanner: [assets.augustScanner],
			photographer: undefined,
			runDirector: undefined,
			marshal: undefined,
			volunteerGeneric: undefined,
			numberChecker: undefined,
		},
		width: 49,
		height: 30,
		centerPoint: { x: 37, y: 12 },
		speed: 3.2,
		frameInterval: 100,
	}),
	alisa: createSignal<RunnerData>({
		...CLUB_MEMBERS.alisa,
		frames: {
			run: generateFrames(
				assets.alisaRun,
				22 * FRAME_COUNT,
				28,
				22 * RUNNER_SIZE,
				FRAME_COUNT,
				true,
			),
			sit: [assets.alisaSit],
			tailWalk: generateFrames(
				assets.alisaTailWalk,
				22 * FRAME_COUNT,
				28,
				22 * RUNNER_SIZE,
				FRAME_COUNT,
				true,
			),
			tailSit: [assets.alisaTailSit],
			face: [assets.alisaFace],
			scanner: [assets.alisaScanner],
			photographer: [assets.alisaPhotographer],
			runDirector: undefined,
			marshal: undefined,
			volunteerGeneric: undefined,
			numberChecker: undefined,
		},
		width: 21,
		height: 28,
		speed: 2.5,
		frameInterval: 75,
	}),
	link: createSignal<RunnerData>({
		...CLUB_MEMBERS.link,
		frames: {
			run: generateFrames(assets.linkRun, 20 * 2, 28, 20 * 2, 2, true),
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
			volunteerGeneric: undefined,
			numberChecker: undefined,
		},
		width: 20,
		height: 28,
		speed: 2.5,
		frameInterval: 75,
		connectedTo: 'alisa',
	}),
	otherJosh: createSignal<RunnerData>({
		...CLUB_MEMBERS.otherJosh,
		frames: {
			run: generateFrames(
				assets.otherJoshRun,
				22 * FRAME_COUNT,
				28,
				22 * RUNNER_SIZE,
				FRAME_COUNT,
				true,
			),
			sit: [assets.otherJoshSit],
			face: [assets.otherJoshFace],
			tailWalk: undefined,
			tailSit: undefined,
			scanner: [assets.otherJoshScanner],
			photographer: undefined,
			runDirector: undefined,
			marshal: undefined,
			volunteerGeneric: undefined,
			numberChecker: undefined,
		},
		width: 21,
		height: 28,
		speed: 2.5,
		frameInterval: 80,
	}),
	mikael: createSignal<RunnerData>({
		...CLUB_MEMBERS.mikael,
		frames: {
			run: generateFrames(
				assets.mikaelRun,
				22 * FRAME_COUNT,
				28,
				22 * RUNNER_SIZE,
				FRAME_COUNT,
				true,
			),
			sit: [assets.mikaelSit],
			face: [assets.mikaelFace],
			tailWalk: undefined,
			tailSit: undefined,
			scanner: undefined,
			photographer: undefined,
			runDirector: undefined,
			marshal: undefined,
			volunteerGeneric: undefined,
			numberChecker: undefined,
		},
		width: 21,
		height: 28,
		speed: 3.2,
		frameInterval: 75,
	}),
	mia: createSignal<RunnerData>({
		...CLUB_MEMBERS.mia,
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
