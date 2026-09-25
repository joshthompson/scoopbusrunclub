/**
 * ScoopDance: a 1999 homepage where the whole club dances in rows, forever.
 */
import { For, createMemo, createSignal, onCleanup } from 'solid-js'
import { BarePage } from '../shared/BarePage'
import { RunnerAnim } from '../shared/RunnerAnim'
import { seededRandom } from '../shared/random'
import { type SpriteMember, spriteMembers } from '../shared/sprites'
import { createPlayer } from '../shared/synth'
import styles from './dance.module.css'
import { DANCE_SONG } from './song'

const DANCES = ['hop', 'wobble', 'spin', 'slide', 'bounce'] as const
type Dance = (typeof DANCES)[number]

interface Dancer {
	member: SpriteMember
	dance: Dance
	height: number
	flip: boolean
	delay: number
}

const GUESTBOOK_KEY = 'sandbox:scoopdance:guestbook'

const DEFAULT_GUESTBOOK = [
	{
		name: 'Keith',
		from: 'Solna',
		message: 'Cool page!!! The music is stuck in my head. Send help.',
	},
	{
		name: 'Claire',
		from: 'Haga Park',
		message: 'Sign my guestbook too! www.geocities.com/clairerunsfast',
	},
	{
		name: 'A Furby',
		from: 'Scoop Bay',
		message: 'Doo-moh may-may. Bid on me.',
	},
	{
		name: 'Rick',
		from: 'The corner',
		message: 'It took 4 minutes to load on my 56k but WORTH IT',
	},
]

function loadGuestbook() {
	try {
		const raw = localStorage.getItem(GUESTBOOK_KEY)
		if (raw) return JSON.parse(raw) as typeof DEFAULT_GUESTBOOK
	} catch {}
	return DEFAULT_GUESTBOOK
}

export default function ScoopDancePage() {
	const members = spriteMembers()
	const rng = seededRandom(1999)

	const rows = createMemo(() => {
		const out: Dancer[][] = []
		for (let r = 0; r < 8; r++) {
			const row: Dancer[] = []
			const shuffled = [...members].sort(() => rng.next() - 0.5)
			for (let i = 0; i < 7; i++) {
				row.push({
					member: shuffled[i % shuffled.length],
					dance: rng.pick(DANCES),
					height: rng.pick([56, 64, 72, 84]),
					flip: rng.chance(0.4),
					delay: rng.next(),
				})
			}
			out.push(row)
		}
		return out
	})

	const player = createPlayer(DANCE_SONG, { volume: 0.45 })
	const [playing, setPlaying] = createSignal(false)
	const [speed, setSpeed] = createSignal(1)
	const [guestbook, setGuestbook] = createSignal(loadGuestbook())
	const [gbName, setGbName] = createSignal('')
	const [gbFrom, setGbFrom] = createSignal('')
	const [gbMessage, setGbMessage] = createSignal('')
	const visitor = 13370 + Math.floor(Math.random() * 900)

	onCleanup(() => player.stop())

	const toggleMusic = () => {
		if (player.playing) {
			player.stop()
			setPlaying(false)
		} else {
			player.start()
			setPlaying(true)
		}
	}

	const changeSpeed = (s: number) => {
		setSpeed(s)
		player.setSpeed(s)
	}

	const beatSeconds = () => 60 / DANCE_SONG.bpm / speed()

	const sign = () => {
		if (!gbName().trim() || !gbMessage().trim()) return
		const next = [
			{
				name: gbName().trim(),
				from: gbFrom().trim() || 'the Internet',
				message: gbMessage().trim(),
			},
			...guestbook(),
		]
		setGuestbook(next)
		try {
			localStorage.setItem(GUESTBOOK_KEY, JSON.stringify(next))
		} catch {}
		setGbName('')
		setGbFrom('')
		setGbMessage('')
	}

	return (
		<BarePage title="ScoopDance!!!" class={styles.page}>
			<div class={styles.center} style={{ '--beat': `${beatSeconds()}s` }}>
				<div class={styles.title}>
					<For each={'ScoopDance'.split('')}>
						{(ch, i) => (
							<span class={styles.titleLetter} style={{ '--i': `${i()}` }}>
								{ch}
							</span>
						)}
					</For>
				</div>
				<div class={styles.blink}>★ Welcome to the ScoopDance!!! ★</div>
				<div class={styles.marquee}>
					<span>
						Hi!!! Welcome to my ScoopDance page! Watch the club dance! Please
						sign my guestbook! Best viewed at 800x600 with Netscape Navigator
						4.0! This page has been under construction since 1999! Parkrun's not
						a race!
					</span>
				</div>

				<div class={styles.controls}>
					<button
						type="button"
						class={`${styles.musicButton} ${playing() ? '' : styles.blinkButton}`}
						onClick={toggleMusic}
					>
						{playing()
							? '■ Stop the music'
							: '♪ CLICK HERE to hear the music!!! ♪'}
					</button>
					<label class={styles.speed}>
						Dance speed:{' '}
						<input
							type="range"
							min="0.5"
							max="2"
							step="0.05"
							value={speed()}
							onInput={(e) => changeSpeed(Number(e.currentTarget.value))}
						/>{' '}
						{speed().toFixed(2)}x
					</label>
				</div>

				<div class={styles.floor}>
					<For each={rows()}>
						{(row, r) => (
							<div
								class={styles.row}
								classList={{ [styles.rowAlt]: r() % 2 === 1 }}
							>
								<For each={row}>
									{(d) => (
										<div
											class={`${styles.dancer} ${styles[d.dance]}`}
											style={{
												'animation-delay': `${-d.delay * beatSeconds() * 2}s`,
											}}
										>
											<RunnerAnim
												member={d.member}
												height={d.height}
												flip={d.flip}
												cycle={beatSeconds() * 2}
											/>
										</div>
									)}
								</For>
							</div>
						)}
					</For>
				</div>

				<table class={styles.infoTable}>
					<tbody>
						<tr>
							<td>
								<div class={styles.counterLabel}>You are visitor number</div>
								<div class={styles.counter}>
									{String(visitor).padStart(7, '0')}
								</div>
							</td>
							<td>
								<div class={styles.badge}>
									Best viewed with Netscape Navigator 4.0
								</div>
								<div class={styles.badge}>Made with Notepad</div>
								<div class={styles.badgeConstruction}>
									🚧 UNDER CONSTRUCTION 🚧
								</div>
							</td>
							<td>
								<div class={styles.webring}>
									This <b>ScoopBus WebRing</b> site is owned by{' '}
									<u>the webmaster</u>.
									<br />[ <u>Prev 5</u> | <u>Prev</u> | <u>Next</u> |{' '}
									<u>Next 5</u> | <u>Random</u> | <u>List Sites</u> ]
								</div>
							</td>
						</tr>
					</tbody>
				</table>

				<div class={styles.guestbook}>
					<h2 class={styles.guestbookTitle}>~*~ Sign My Guestbook ~*~</h2>
					<div class={styles.gbForm}>
						<label>
							Name:{' '}
							<input
								value={gbName()}
								onInput={(e) => setGbName(e.currentTarget.value)}
							/>
						</label>
						<label>
							Where are you from?{' '}
							<input
								value={gbFrom()}
								onInput={(e) => setGbFrom(e.currentTarget.value)}
							/>
						</label>
						<label>
							Comments:{' '}
							<textarea
								rows="2"
								value={gbMessage()}
								onInput={(e) => setGbMessage(e.currentTarget.value)}
							/>
						</label>
						<button type="button" class={styles.gbButton} onClick={sign}>
							Sign it!
						</button>
					</div>
					<For each={guestbook()}>
						{(entry) => (
							<div class={styles.gbEntry}>
								<b>{entry.name}</b> from <i>{entry.from}</i> wrote:
								<div>{entry.message}</div>
							</div>
						)}
					</For>
				</div>

				<div class={styles.footer}>
					<div>
						Last updated: 14 March 1999 &nbsp;|&nbsp;{' '}
						<a href="/sandbox">Back to scoopbus.run</a>
					</div>
					<div>This page is 100% Furby free (see Scoop Bay for Furbys)</div>
				</div>
			</div>
		</BarePage>
	)
}
