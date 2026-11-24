import { createController } from 'scoopjs'
import { RUNNER_SCALE, VIEW_WIDTH } from '../game/constants'
import { type Interview, interviewOf, saying } from '../game/interview'
import type { Racer, World } from '../game/world'
import { bubbleReach, paintBubble } from './Bubble'
import { createPlayer } from './sprites'

/**
 * Kristineberg's interview, drawn (see `game/interview`): the reporter,
 * running in and stood by the winner; their microphone, held out, to
 * themselves asking and to the winner answering; and what's said, in a
 * speech bubble over whoever's saying it, a letter at a time.
 */

/** A pixel, as everything's drawn: 2 px. */
const CELL = 2
/** How big the bubbles' words are, the most letters they'll have, and how fast they come, ticks a letter. */
const SAYS_SIZE = 16
const SAYS_MOST = 28
const LETTER_TICKS = 2
/** A bubble's padding and border either side of its words (see `Bubble`), and how far it's kept in from the screen's edges. */
const BUBBLE_EDGE = 13
const SCREEN_MARGIN = 8
/** The microphone: where it's held, along from the reporter's middle and up from their feet; held out further to the winner. */
const MIC_WIDTH = 8 * CELL
const MIC_HEIGHT = 10 * CELL
const MIC_ALONG = 14
const MIC_UP = 36
const MIC_OUT = 8
const MIC_HEAD = '#2b2722'
const MIC_GRILLE = '#5d5a55'
const MIC_HANDLE = '#3a3d45'
const MIC_FLAG = '#ffd23f'
const MIC_FLAG_SHADE = '#c99a16'
const MIC_STRIPE = '#e3342b'

/** How tall `racer` stands, for their bubble to float over. */
const tallOf = (racer: Racer) => racer.runner.sprite.height * RUNNER_SCALE
/** How wide `racer` is, for their bubble to be over the middle of. */
const wideOf = (racer: Racer) => racer.runner.sprite.width * RUNNER_SCALE

export function createInterview(world: World) {
	const first = interviewOf(world)
	if (!first) return []
	const iv = () => interviewOf(world) as Interview
	const reporter = first.reporter
	/** Whether the winner's answering, the microphone held out to them. */
	const answering = () => saying(iv(), world.ticks())?.who !== reporter

	const mic = createController({
		init: () => ({
			id: 'reporter-mic',
			// In front of them, in their hand.
			type: 'furby',
			x: () =>
				Math.round(
					(reporter.body.x -
						MIC_ALONG -
						(answering() ? MIC_OUT : 0) -
						MIC_WIDTH / 2) /
						CELL,
				) * CELL,
			y: () => Math.round((reporter.body.feetY - MIC_UP) / CELL) * CELL,
			width: () => MIC_WIDTH,
			height: () => MIC_HEIGHT,
			style: () => ({ 'image-rendering': 'pixelated' }),
		}),
		draw: ({ ctx }) => {
			world.ticks()
			paintMic(ctx)
		},
	})

	const bubble = createController({
		init: () => ({
			id: 'interview-says',
			// Over everyone.
			type: 'flyer',
			x: () => {
				const said = saying(iv(), world.ticks())
				const who = said?.who ?? reporter
				return Math.round(who.body.x - wideOf(who) / 2)
			},
			y: () => {
				const said = saying(iv(), world.ticks())
				const who = said?.who ?? reporter
				return Math.round(who.body.feetY - tallOf(who))
			},
			width: () => {
				const said = saying(iv(), world.ticks())
				return wideOf(said?.who ?? reporter)
			},
			height: () => CELL,
		}),
		drawReach: bubbleReach(
			reporter.runner.sprite.width * RUNNER_SCALE,
			SAYS_SIZE,
			SAYS_MOST,
		),
		draw: ({ ctx }) => {
			const said = saying(iv(), world.ticks())
			if (!said) return
			// A letter at a time, as it's said.
			const shown = said.text.slice(
				0,
				Math.max(1, Math.floor(said.since / LETTER_TICKS)),
			)
			// Kept on the screen, nudged in off its edge, if it'd go past it.
			const wide = wideOf(said.who)
			ctx.font = `${SAYS_SIZE}px "Remi Pop", system-ui, sans-serif`
			const half = ctx.measureText(shown).width / 2 + BUBBLE_EDGE
			const from = Math.round(said.who.body.x - wide / 2)
			const left = world.camera() - from
			const right = left + VIEW_WIDTH * world.zoom()
			const nudge =
				Math.min(0, right - SCREEN_MARGIN - (wide / 2 + half)) ||
				Math.max(0, left + SCREEN_MARGIN - (wide / 2 - half))
			ctx.translate(Math.round(nudge), 0)
			paintBubble(ctx, shown, { width: wide, size: SAYS_SIZE })
		},
	})

	return [createPlayer(world, reporter), mic, bubble]
}

/**
 * A reporter's microphone, held up, leaning towards whoever's talking:
 * its black head, grille lit along its top; its handle; and on it, the
 * station's flag, a yellow block with a red stripe.
 */
function paintMic(ctx: CanvasRenderingContext2D) {
	const c = CELL
	// The handle, down to the right, into their hand.
	ctx.fillStyle = MIC_HANDLE
	ctx.fillRect(3 * c, 4 * c, 2 * c, 2 * c)
	ctx.fillRect(4 * c, 6 * c, 2 * c, 2 * c)
	ctx.fillRect(5 * c, 8 * c, 2 * c, 2 * c)
	// The flag on it.
	ctx.fillStyle = MIC_FLAG
	ctx.fillRect(2 * c, 3 * c, 4 * c, 3 * c)
	ctx.fillStyle = MIC_FLAG_SHADE
	ctx.fillRect(2 * c, 5 * c, 4 * c, c)
	ctx.fillStyle = MIC_STRIPE
	ctx.fillRect(2 * c, 4 * c, 4 * c, c)
	// The head, round, its grille lit along its top.
	ctx.fillStyle = MIC_HEAD
	ctx.fillRect(0, c, 4 * c, 2 * c)
	ctx.fillRect(c, 0, 2 * c, 4 * c)
	ctx.fillStyle = MIC_GRILLE
	ctx.fillRect(c, c, 2 * c, c)
}
