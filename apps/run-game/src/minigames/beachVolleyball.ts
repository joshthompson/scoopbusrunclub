import {
	FROZEN_SAND,
	FROZEN_SAND_DARK,
	FROZEN_SAND_SHADE,
	FROZEN_SAND_TEXTURE,
	FROZEN_SEA_FAR,
	FROZEN_SKY_BOTTOM,
	FROZEN_SKY_TOP,
	frozenSeaFar,
	frozenSeaNear,
} from '../courses/kit/frozenBeachScenery'
import {
	HITBOX_HALF_WIDTH,
	RUNNER_SCALE,
	START_X,
	TICK_MS,
} from '../game/constants'
import { type Racer, type World, startingBody } from '../game/world'
import type { Controls } from '../input'
import { CLUB } from '../runners/playable'
import { play } from '../sfx'
import { ARENA_WALLS, arenaCourse, inRandomOrder } from './arena'
import {
	IDLE,
	type Minigame,
	type MinigameFrame,
	type MinigameRun,
} from './types'

/**
 * Beach Volleyball: on a beach in the snow, two teams, one either side of
 * a net, the first team game. A team short of a Player has a bot added to
 * it. The ball's knocked over the net by running into it, or jumping up
 * at it: whoever it touches sends it over to the other side. It comes
 * down on a side, and the other team has the point. Each point begins with
 * the ball dropped on the side of the team that lost the last, big and
 * floaty, easy to keep up; the longer a point goes on, the smaller the
 * ball and the quicker it falls. The umpire, in the middle, puts an arm up
 * for whichever team scored. First to 3 wins; or after 2 minutes,
 * whoever's ahead, or if it's level, whoever gets the next point.
 */

/** How long it goes on, at most, before the team ahead wins: 2 minutes. */
export const VOLLEY_TICKS = Math.round(120_000 / TICK_MS)
/** Where the sand starts, up from the line everyone runs along: right up to the sea. */
const SAND_FROM = -160
/** How many points win it. */
export const POINTS_TO_WIN = 3

/** The net, in the middle: how far either side of its middle it reaches, and how high it is. */
export const NET_X = START_X
export const NET_HALF = 4
export const NET_HIGH = 96

/** The ball: how big it is, round, at the start of a point and by `RAMP_TICKS` into one. */
const RADIUS_FIRST = 30
const RADIUS_LAST = 12
/** How fast it falls, at most, and how quickly it gets going: floaty to begin with, not by the end. */
const FALL_FIRST = 3
const FALL_LAST = 9
const GRAVITY_FIRST = 0.05
const GRAVITY_LAST = 0.22
/** How long into a point the ball's at its smallest and quickest. */
const RAMP_TICKS = Math.round(15_000 / TICK_MS)
/**
 * Hitting it: it comes off someone the way it would off anything round
 * and moving, at the angle it meets them, their head round on top; with
 * as much bounce (`BOUNCY`), knocked on a little more (`KNOCK`), and their
 * own speed in it (`CARRY`): running into it sends it on, jumping up into
 * it sends it up; and bumped over towards the other side (`BUMP`). Off the top of someone, it always goes up at least so
 * high, so it's never dead; less, by the end of a point.
 */
const HEAD_ROUND = 14
/** About how tall anyone is: where the ball meets them, coming down. */
const HEAD_HIGH = 58
const BOUNCY = 0.7
const KNOCK = 2.5
const CARRY = 0.75
/** And a bump towards the other side, as anyone would, meaning to: easy to get it over, to begin with. */
const BUMP = 0.8
const POPS_UP_FIRST = 120
const POPS_UP_LAST = 70
/** How fast it can go, hit, at most. */
const BALL_FASTEST = 11
/** How near the net someone has to be, jumping, to go for a spike: the bots. */
const SPIKE_REACH = 170
/**
 * How far behind where it'll come down a bot gets: so it comes down on the
 * front of its head, and off it, over towards the net.
 */
const BOT_BEHIND = 20
/** How long before the same Player can hit it again. */
const HIT_AGAIN = 6
/** How far either side of someone's middle it can touch them. */
const REACH = HITBOX_HALF_WIDTH + 6
/** How much of its speed it keeps bouncing off a wall, or the net. */
const BOUNCE_KEEP = 0.6

/** A point's start: the ball held up over the serving side, this high, this long, then dropped. */
const DROP_HIGH = 330
const SERVE_HOLD = 50
/** How long after a point's scored before the next: the umpire's arm up. */
export const SCORED_PAUSE = 110
/** How long "Match point!" and the like are up, big. */
const ANNOUNCED_FOR = 80

/** The teams: their names, and their colours (as their hats). */
export const TEAM_NAMES = ['Red', 'Blue'] as const
export const TEAM_COLOURS = ['#d23a3a', '#3a62d2'] as const
/** The bot added to a team that's a Player short: its id, so every screen finds it. */
const TEAM_BOT = 'volley-bot'

/** The ball, as it is: its middle, how fast it's going, how big it is, and how far it's turned. */
export interface Ball {
	x: number
	y: number
	vx: number
	vy: number
	r: number
	spin: number
}

export const beachVolleyball: Minigame = {
	id: 'beach-volleyball',
	name: 'Beach Volleyball',
	blurb:
		'Two teams, a net and a big floaty ball: run or jump into it to send it over. It comes down on your side, they score. It gets smaller and quicker the longer a point goes on. First team to 3 wins!',
	tune: 'slopes',
	// Its board's up top, and who's in the sea says who's out.
	pills: false,
	collectables: [],
	course: arenaCourse(
		'beach-volleyball',
		'Beach Volleyball',
		'Knock the ball over the net. First team to 3 wins!',
		// A beach in winter: an icy grey sea, snow over the sand, and snow
		// falling (see `arenaSets`).
		{
			palette: {
				'--sky-blue-top': FROZEN_SKY_TOP,
				'--sky-blue-bottom': FROZEN_SKY_BOTTOM,
				'--grass-green': FROZEN_SAND,
				'--grass-dark-green': FROZEN_SAND_SHADE,
				'--grass-darker-green': FROZEN_SAND_DARK,
				'--dirt-brown': FROZEN_SAND,
				'--dirt-dark-brown': FROZEN_SAND_SHADE,
				'--dirt-darker-brown': FROZEN_SAND_DARK,
			},
			horizon: {
				far: frozenSeaFar,
				near: frozenSeaNear,
				fill: FROZEN_SEA_FAR,
			},
			// Snowy sand, all the way from the water's edge down: no path
			// marked out through it.
			ground: [
				[SAND_FROM, 'var(--grass-green)'],
				[SAND_FROM, 'url(#frozen-sand)'],
			],
			groundDefs: FROZEN_SAND_TEXTURE,
			// Snowing, all of it, the sun pale behind the cloud.
			snow: { from: -100_000, full: -99_999 },
			sun: 'saturate(0) brightness(1.2) opacity(0.55)',
			far: [],
			near: [],
			horizonTrees: false,
		},
	),
	start: startBeachVolleyball,
}

/** What's to be drawn of a game of Beach Volleyball. */
export interface VolleyShow {
	ball: Ball
	points: [number, number]
	/** When this point began, by the world's ticks; and who scored it, and when, once they have. */
	pointAt: number
	scored?: { team: number; at: number }
	ground: number
	/** Where the court ends, either side: its walls. */
	walls: { left: number; right: number }
}
const shows = new WeakMap<World, VolleyShow>()

/** `world`'s game of Beach Volleyball, for drawing, if it's one. */
export const volleyOf = (world: World) => shows.get(world)

/**
 * A club member for the bot to play as: nobody anyone's playing as, picked
 * by who's playing, so every screen picks the same one.
 */
function pickBot(racers: Racer[]) {
	const playing = new Set(racers.map((r) => r.runner.id))
	const free = CLUB.filter((m) => !playing.has(m.id))
	const seed = racers
		.map((r) => r.id)
		.join('')
		.split('')
		.reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 9973, 11)
	return free[seed % free.length] ?? CLUB[0]
}

function startBeachVolleyball(world: World): MinigameRun {
	const { racers, terrain } = world
	const ground = terrain.groundY(START_X)
	const { left, right } = ARENA_WALLS

	// A team a Player short: a bot added to it, to make it even. On a phone,
	// already there, sent with everyone else.
	let teamBot = racers.find((r) => r.id === TEAM_BOT)
	if (!teamBot && racers.length % 2 === 1) {
		const runner = pickBot(racers)
		teamBot = {
			id: TEAM_BOT,
			runner,
			body: startingBody(terrain, START_X),
			controls: () => (teamBot ? run.bot(teamBot) : IDLE),
			colour: '#8a96a0',
			number: racers.length + 1,
			outAt: 0,
		}
		racers.push(teamBot)
	}

	/** Which team each's on, 0 the left, 1 the right: shuffled, then taken in turns. */
	const teams = new Map<string, number>()
	inRandomOrder(racers.filter((r) => r !== teamBot)).forEach((racer, i) =>
		teams.set(racer.id, i % 2),
	)
	// The bot on whichever's short.
	if (teamBot) {
		const reds = [...teams.values()].filter((t) => t === 0).length
		teams.set(teamBot.id, reds * 2 < racers.length ? 0 : 1)
	}
	const teamOf = (racer: Racer) => teams.get(racer.id) ?? 0
	const teamMates = (team: number) => racers.filter((r) => teamOf(r) === team)
	/** Which way's over the net for `team`: right for the left team. */
	const over = (team: number) => (team === 0 ? 1 : -1)
	/** The middle of `team`'s side. */
	const sideMiddle = (team: number) =>
		team === 0 ? (left + NET_X) / 2 : (NET_X + right) / 2
	/** Where on their side `racer` stands, waiting: the team spread out across it. */
	const home = (racer: Racer) => {
		const team = teamOf(racer)
		const mates = teamMates(team)
		const at = mates.indexOf(racer)
		const spread = Math.min(110, 300 / Math.max(1, mates.length))
		return sideMiddle(team) + (at - (mates.length - 1) / 2) * spread
	}

	// Each on their own side, spread out, facing the net, in their team's
	// bobble hat.
	for (const racer of racers) {
		const b = racer.body
		const team = teamOf(racer)
		b.x = Math.round(home(racer))
		b.feetY = ground
		b.floor = ground
		b.grounded = true
		b.facing = over(team) as 1 | -1
		b.hat = { kind: team === 0 ? 'bobbleHat' : 'bobbleHatBlue' }
	}

	const points: [number, number] = [0, 0]
	const ball: Ball = { x: 0, y: 0, vx: 0, vy: 0, r: RADIUS_FIRST, spin: 0 }
	const show: VolleyShow = {
		ball,
		points,
		pointAt: 0,
		ground,
		walls: ARENA_WALLS,
	}
	shows.set(world, show)
	/** When each last hit it, by the world's ticks. */
	const hitAt = new Map<string, number>()

	/** A point, begun: the ball held up over `team`'s side, to drop. */
	function serve(team: number) {
		show.pointAt = world.ticks()
		show.scored = undefined
		ball.x = sideMiddle(team) + (Math.random() - 0.5) * 80
		ball.y = ground - DROP_HIGH
		ball.vx = 0
		ball.vy = 0
		ball.r = RADIUS_FIRST
		hitAt.clear()
	}
	serve(Math.random() < 0.5 ? 0 : 1)

	/** How far through its point the ball is, 0 to 1: smaller and quicker as it goes. */
	const ramp = () =>
		Math.max(
			0,
			Math.min(1, (world.ticks() - show.pointAt - SERVE_HOLD) / RAMP_TICKS),
		)
	const mix = (from: number, to: number) => from + (to - from) * ramp()
	const gravity = () => mix(GRAVITY_FIRST, GRAVITY_LAST)
	const fallMost = () => mix(FALL_FIRST, FALL_LAST)
	const radius = () => Math.round(mix(RADIUS_FIRST, RADIUS_LAST) / 2) * 2

	/**
	 * Where the ball comes down to head height, gone on as it's going, a
	 * little heavier every tick as the point goes on: off the walls and the
	 * net, nobody touching it. Its middle, across, there: where a bot wants
	 * to be to meet it.
	 */
	const fall = (from: Ball) => {
		let { x, y, vx, vy } = from
		const since = world.ticks() - show.pointAt - SERVE_HOLD
		for (let t = 0; t < 600; t++) {
			const ramp = Math.max(0, Math.min(1, (since + t) / RAMP_TICKS))
			vy = Math.min(
				vy + GRAVITY_FIRST + (GRAVITY_LAST - GRAVITY_FIRST) * ramp,
				FALL_FIRST + (FALL_LAST - FALL_FIRST) * ramp,
			)
			x += vx
			y += vy
			if (x < left + from.r || x > right - from.r) vx = -vx * BOUNCE_KEEP
			if (Math.abs(x - NET_X) < from.r + NET_HALF && y > ground - NET_HIGH)
				vx = -vx * BOUNCE_KEEP
			if (y + from.r >= ground - HEAD_HIGH) return x
		}
		return x
	}
	/**
	 * Where `racer` and the ball touch, if they do: which way it's pushed
	 * off them there, and the point on them it's touching. Their head's
	 * round, on top; the rest of them a box.
	 */
	function touching(racer: Racer) {
		const b = racer.body
		const tall =
			racer.runner.sprite.height * RUNNER_SCALE * (b.ducking ? 0.55 : 1)
		const headY = b.feetY - tall + HEAD_ROUND
		let x: number
		let y: number
		if (ball.y < headY) {
			// Its top, round: the nearest point on it.
			const dx = ball.x - b.x
			const dy = ball.y - headY
			const d = Math.hypot(dx, dy) || 1
			const round = Math.min(1, HEAD_ROUND / d)
			x = b.x + Math.max(-REACH, Math.min(REACH, dx * round))
			y = headY + dy * round
		} else {
			x = Math.max(b.x - REACH, Math.min(b.x + REACH, ball.x))
			y = Math.max(headY, Math.min(b.feetY, ball.y))
		}
		const gap = Math.hypot(ball.x - x, ball.y - y)
		if (gap > ball.r) return undefined
		// Right in them: pushed out the way it came.
		const nx = gap > 0.01 ? (ball.x - x) / gap : 0
		const ny = gap > 0.01 ? (ball.y - y) / gap : -1
		return { nx, ny, x, y }
	}

	/**
	 * `racer`'s hit it: off them at the angle it met them, bounced, knocked
	 * on, with their own speed in it. Nothing, if it's already going away.
	 */
	function hit(
		racer: Racer,
		at: { nx: number; ny: number; x: number; y: number },
	) {
		const b = racer.body
		const { nx, ny } = at
		// Their speed into it: across, and up, jumping (not falling).
		const pvx = b.vx * CARRY
		const pvy = Math.min(0, b.vy) * CARRY
		let vx = ball.vx - pvx
		let vy = ball.vy - pvy
		const along = vx * nx + vy * ny
		if (along > 0) return
		vx -= (1 + BOUNCY) * along * nx
		vy -= (1 + BOUNCY) * along * ny
		ball.vx = vx + pvx + nx * KNOCK + over(teamOf(racer)) * BUMP
		ball.vy = vy + pvy + ny * KNOCK
		// Off the top of them: up, always, at least so high.
		if (ny < -0.4)
			ball.vy = Math.min(
				ball.vy,
				-Math.sqrt(2 * gravity() * mix(POPS_UP_FIRST, POPS_UP_LAST)),
			)
		const speed = Math.hypot(ball.vx, ball.vy)
		if (speed > BALL_FASTEST) {
			ball.vx *= BALL_FASTEST / speed
			ball.vy *= BALL_FASTEST / speed
		}
		// Out of them.
		ball.x = at.x + nx * (ball.r + 1)
		ball.y = at.y + ny * (ball.r + 1)
		hitAt.set(racer.id, world.ticks())
		play(speed > 7 ? 'whoosh' : 'pop')
	}

	/** Down on the sand: a point to the other side's team. */
	function land() {
		const side = ball.x < NET_X ? 0 : 1
		const team = 1 - side
		ball.y = ground - ball.r
		ball.vy = 0
		ball.vx *= 0.3
		points[team]++
		show.scored = { team, at: world.ticks() }
		play('cheer')
		const winning = points[team] >= POINTS_TO_WIN || ticksLeft() <= 0
		world.popup(
			winning ? `${TEAM_NAMES[team]} win!` : `${TEAM_NAMES[team]} point!`,
			NET_X,
			ground - 190,
		)
		if (winning) decide(team)
	}

	/** Over: `team`'s won it. Them first, then the others; the bot's no seat in the Results. */
	function decide(team: number) {
		if (world.order()) return
		const order = [...teamMates(team), ...teamMates(1 - team)].filter(
			(r) => r !== teamBot,
		)
		world.setOrder(order)
		world.decidedAt = world.ticks()
		play('finished')
	}

	const ticksLeft = () => Math.max(0, VOLLEY_TICKS - world.raceTicks())
	const won = (racer: Racer) => {
		const order = world.order()
		return !!order && points[teamOf(racer)] > points[1 - teamOf(racer)]
	}
	/** "3–1", their side's first. */
	const score = (racer: Racer) =>
		`${points[teamOf(racer)]}–${points[1 - teamOf(racer)]}`

	/** How good each bot is, 0 to 1, this game. */
	const skills = new Map<string, number>()
	const skillOf = (racer: Racer) => {
		let skill = skills.get(racer.id)
		if (skill === undefined) {
			skill = 0.35 + Math.random() * 0.65
			skills.set(racer.id, skill)
		}
		return skill
	}
	/** Where each bot's making for, and till when it'll think again; and if it's jumping, till when. */
	const plans = new Map<
		string,
		{ to: number; until: number; jumpTill: number; spiked: number }
	>()
	/** Where the ball'll come down, worked out once a tick for every bot. */
	let fallsAt = { tick: -1, x: 0 }
	const fallsAtNow = () => {
		if (fallsAt.tick !== world.ticks())
			fallsAt = { tick: world.ticks(), x: fall(ball) }
		return fallsAt.x
	}

	const run: MinigameRun = {
		id: 'beach-volleyball',
		ticksLeft,
		chip: (racer) => `${TEAM_NAMES[teamOf(racer)]} ${points[teamOf(racer)]}`,
		timeNote: (racer) =>
			won(racer) ? `Won ${score(racer)}` : `Lost ${score(racer)}`,
		placeOf: (racer) => {
			const order = world.order() ?? []
			const winners = order.filter((r) => won(r)).length
			return won(racer) ? 1 : winners + 1
		},
		announce: () => {
			if (world.order()) return undefined
			const since = world.ticks() - show.pointAt
			if (show.scored) return undefined
			if (since >= ANNOUNCED_FOR) return undefined
			if (ticksLeft() <= 0) return 'Next point wins!'
			return points.some((p) => p === POINTS_TO_WIN - 1)
				? 'Match point!'
				: undefined
		},
		// A bot: making for where the ball'll come down, if it's on its side
		// and it's the nearest of its team to it, a little off, the worse it
		// is the more; back to its place, if not. Slow to think again, the
		// worse it is. By the net, as the ball comes down to it, it jumps
		// up at it, now and then, to spike it.
		bot: (racer) => {
			const b = racer.body
			const team = teamOf(racer)
			const now = world.ticks()
			const skill = skillOf(racer)
			let plan = plans.get(racer.id)
			if (!plan || now >= plan.until) {
				let to = home(racer)
				if (!show.scored && !world.order()) {
					const off = (Math.random() - 0.5) * (1 - skill) * 60
					const comes = fallsAtNow() + off
					const ours = comes < NET_X === (team === 0)
					const nearest = teamMates(team).reduce((a, c) =>
						Math.abs(c.body.x - comes) < Math.abs(a.body.x - comes) ? c : a,
					)
					if (ours && nearest === racer) to = comes - over(team) * BOT_BEHIND
				}
				plan = {
					to,
					until: now + 3 + Math.round((1 - skill) * 8 + Math.random() * 4),
					jumpTill: plan?.jumpTill ?? 0,
					spiked: plan?.spiked ?? -1,
				}
				plans.set(racer.id, plan)
			}
			// Under it, by the net, as it comes down: up at it, now and then.
			const head = b.feetY - racer.runner.sprite.height * RUNNER_SCALE
			if (
				b.grounded &&
				plan.spiked !== show.pointAt &&
				!show.scored &&
				ball.vy > 0 &&
				Math.abs(ball.x - b.x) < 40 &&
				ball.y < head - 20 &&
				ball.y > head - 110 &&
				Math.abs(b.x - NET_X) < SPIKE_REACH
			) {
				plan.spiked = show.pointAt
				if (Math.random() < skill * 0.6) plan.jumpTill = now + 16
			}
			const jumping = now < plan.jumpTill && (b.grounded || b.vy < 0)
			// Speed steered, not just where it is: slowing as it gets there,
			// braking by pushing the other way, so it doesn't slide on past.
			const wants = Math.max(-6, Math.min(6, (plan.to - b.x) * 0.12))
			const off = wants - b.vx
			const go = Math.abs(off) > 0.5 ? Math.sign(off) : 0
			return {
				left: go < 0,
				right: go > 0,
				up: jumping,
				down: false,
			} satisfies Controls
		},
		note: (racer) =>
			won(racer) ? `Won ${score(racer)}` : `Lost ${score(racer)}`,
		done: (racer) => won(racer),
		out: () => false,
		step() {
			if (world.phase() !== 'running') return
			const now = world.ticks()

			// Each on their own side of the net, and no further than the walls.
			for (const racer of racers) {
				const b = racer.body
				const team = teamOf(racer)
				const from = team === 0 ? left : NET_X + NET_HALF + HITBOX_HALF_WIDTH
				const to = team === 0 ? NET_X - NET_HALF - HITBOX_HALF_WIDTH : right
				if (b.x < from) {
					b.x = from
					b.vx = Math.max(0, b.vx)
				} else if (b.x > to) {
					b.x = to
					b.vx = Math.min(0, b.vx)
				}
				b.celebrating = won(racer)
			}

			// Scored: lying on the sand, rolling to a stop; then the next point,
			// the ball to the side that lost it.
			if (show.scored) {
				ball.vx *= 0.9
				ball.x = Math.max(
					left + ball.r,
					Math.min(right - ball.r, ball.x + ball.vx),
				)
				ball.spin += ball.vx * 3
				if (!world.order() && now - show.scored.at >= SCORED_PAUSE)
					serve(1 - show.scored.team)
				return
			}

			// Time's up, a team ahead: theirs.
			if (ticksLeft() <= 0 && points[0] !== points[1])
				return decide(points[0] > points[1] ? 0 : 1)

			// Held up over the serving side, bobbing, then dropped.
			ball.r = radius()
			if (now - show.pointAt < SERVE_HOLD) {
				ball.y = ground - DROP_HIGH + Math.sin((now - show.pointAt) / 6) * 3
				return
			}
			ball.vy = Math.min(ball.vy + gravity(), fallMost())
			ball.x += ball.vx
			ball.y += ball.vy
			ball.spin += ball.vx * 3

			// Off the walls.
			if (ball.x < left + ball.r) {
				ball.x = left + ball.r
				ball.vx = Math.abs(ball.vx) * BOUNCE_KEEP
			} else if (ball.x > right - ball.r) {
				ball.x = right - ball.r
				ball.vx = -Math.abs(ball.vx) * BOUNCE_KEEP
			}

			// Off the net: its side, or its top.
			const netTop = ground - NET_HIGH
			const fromNet = ball.x - NET_X
			if (Math.abs(fromNet) < ball.r + NET_HALF && ball.y > netTop) {
				const side = Math.sign(fromNet) || (ball.vx > 0 ? -1 : 1)
				ball.x = NET_X + side * (ball.r + NET_HALF)
				ball.vx = side * Math.abs(ball.vx) * BOUNCE_KEEP
			} else {
				const dy = ball.y - netTop
				const reach = Math.hypot(fromNet, dy)
				if (reach < ball.r && reach > 0) {
					// Bounced off its top, away from it.
					const nx = fromNet / reach
					const ny = dy / reach
					const along = ball.vx * nx + ball.vy * ny
					if (along < 0) {
						ball.vx = (ball.vx - 2 * along * nx) * BOUNCE_KEEP
						ball.vy = (ball.vy - 2 * along * ny) * BOUNCE_KEEP
					}
					ball.x = NET_X + nx * ball.r
					ball.y = netTop + ny * ball.r
					// Not balanced on it: off one side or the other.
					if (Math.abs(ball.vx) < 0.4) ball.vx = (Math.sign(fromNet) || 1) * 0.8
				}
			}

			// Into someone: off them.
			for (const racer of racers) {
				if ((hitAt.get(racer.id) ?? -99) > now - HIT_AGAIN) continue
				const at = touching(racer)
				if (!at) continue
				hit(racer, at)
				break
			}

			// Down on the sand.
			if (ball.y + ball.r >= ground) land()
		},
		frame(): MinigameFrame {
			return {
				ball: [
					Math.round(ball.x * 10) / 10,
					Math.round(ball.y * 10) / 10,
					ball.r,
					Math.round(ball.spin),
				],
				points: [...points],
				teams: racers.map(teamOf),
				pointAt: show.pointAt,
				scored: show.scored ? [show.scored.team, show.scored.at] : [-1, -1],
			}
		},
		apply(a, b, share) {
			const mixed = (i: number) => {
				const from = a.ball?.[i] ?? 0
				const to = b?.ball?.[i] ?? from
				return from + (to - from) * share
			}
			if (a.ball) {
				ball.x = mixed(0)
				ball.y = mixed(1)
				ball.r = a.ball[2]
				ball.spin = mixed(3)
			}
			if (a.points) [points[0], points[1]] = a.points
			// The Host's teams, and their hats to go with them.
			a.teams?.forEach((team, i) => {
				const racer = racers[i]
				if (!racer) return
				teams.set(racer.id, team)
				racer.body.hat = { kind: team === 0 ? 'bobbleHat' : 'bobbleHatBlue' }
			})
			if (a.pointAt !== undefined) show.pointAt = a.pointAt
			show.scored =
				a.scored && a.scored[0] >= 0
					? { team: a.scored[0], at: a.scored[1] }
					: undefined
			for (const racer of racers) racer.body.celebrating = won(racer)
		},
	}
	return run
}
