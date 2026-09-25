/**
 * Scoopmoji: the club as chat stickers — the bus, the club sign, every
 * member's first stride, and every member's head — in two packs to download.
 *
 * Packs are `.wastickers` files, the format the Sticker Maker apps import
 * straight into WhatsApp: a flat zip of 512×512 PNG stickers, a 96×96
 * `cover.png`, and `title.txt` / `author.txt`, at most thirty stickers each.
 * That matches what sticker-convert writes, which those apps accept.
 */
import busEmoji from '@/assets/emoji/bus.png'
import clubSign from '@/assets/misc/pr-sign.png'
import { BackSignButton } from '@/components/BackSignButton'
import { Button } from '@/components/ui/Button'
import { FieldBlock } from '@/components/ui/FieldBlock'
import { css } from '@style/css'
import { For, Show, createResource, createSignal } from 'solid-js'
import { renderBusCanvas } from '../shared/ScoopBus'
import {
	canvasToBlob,
	downloadBlob,
	drawSticker,
	loadImage,
	spriteMembers,
} from '../shared/sprites'
import { canvasToWebp } from '../shared/webp'
import { type ZipEntry, buildZip } from '../shared/zip'
import { renderCardBack, renderCardFace } from './poker'

/** WhatsApp wants 512×512 stickers and a 96×96 tray icon. */
const STICKER_SIZE = 512
const TRAY_SIZE = 96

type Pack = 'base' | 'heads' | 'poker'

interface Sticker {
	/** Who or what it is, for the card it sits on. */
	group: string
	/** File stem, unique within its pack. */
	stem: string
	pack: Pack
	canvas: HTMLCanvasElement
	preview: string
}

const PACKS: Record<Pack, { title: string; file: string; blurb: string }> = {
	base: {
		title: 'Scoop Bus Base Pack',
		file: 'scoop-bus-base',
		blurb: 'the bus, the club sign, and every member running',
	},
	heads: {
		title: 'Scoop Bus Heads Pack',
		file: 'scoop-bus-heads',
		blurb: "every member's head",
	},
	poker: {
		title: 'Scoop Bus Poker Pack',
		file: 'scoop-bus-poker',
		blurb:
			'the back of the card, then every member as a playing card, half red and half black',
	},
}

const PACK_ORDER: Pack[] = ['base', 'heads', 'poker']

function stemFor(key: string) {
	return key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
}

async function buildStickers(): Promise<Sticker[]> {
	const out: Sticker[] = []
	const add = (
		group: string,
		stem: string,
		pack: Pack,
		canvas: HTMLCanvasElement,
	) => out.push({ group, stem, pack, canvas, preview: canvas.toDataURL() })

	add(
		'Bus',
		'scoop-bus',
		'base',
		drawSticker(await renderBusCanvas(), 0, 1, STICKER_SIZE, {
			fit: 'fill',
			outlineWidth: 7,
		}),
	)
	add(
		'Sign',
		'club-sign',
		'base',
		drawSticker(await loadImage(clubSign), 0, 1, STICKER_SIZE, {
			padding: 0.12,
		}),
	)

	// The card back leads the poker pack, so it's the first thing in the tray.
	add(
		'Back',
		'card-back',
		'poker',
		drawSticker(await renderCardBack(), 0, 1, STICKER_SIZE, {
			outline: false,
		}),
	)

	const members = spriteMembers()
	for (const [i, member] of members.entries()) {
		const sheet = await loadImage(member.runSheet)
		add(
			member.data.name,
			stemFor(member.key),
			'base',
			drawSticker(sheet, 0, member.frameCount, STICKER_SIZE),
		)
		if (member.face) {
			const img = await loadImage(member.face)
			add(
				member.data.name,
				stemFor(member.key),
				'heads',
				drawSticker(img, 0, 1, STICKER_SIZE, { padding: 0.14 }),
			)
		}
		// Suits alternate down the member list, so the deck splits in half.
		add(
			member.data.name,
			stemFor(member.key),
			'poker',
			drawSticker(
				await renderCardFace(member, i % 2 === 0 ? 'black' : 'red'),
				0,
				1,
				STICKER_SIZE,
				{ outline: false },
			),
		)
	}
	return out
}

async function png(canvas: HTMLCanvasElement) {
	const blob = await canvasToBlob(canvas, 'image/png')
	return new Uint8Array(await blob.arrayBuffer())
}

/**
 * A `.wastickers` file, laid out like one the Sticker Maker apps are known
 * to import: `title.txt` and `author.txt`, a 96×96 `cover.png`, and the
 * stickers as `sticker_1.webp`, `sticker_2.webp`, … at the root of the zip.
 * The apps count only WebP files as stickers; a PNG is taken for a tray icon.
 */
async function buildWastickers(pack: Pack, stickers: Sticker[]): Promise<Blob> {
	const encoder = new TextEncoder()
	const list = stickers.filter((s) => s.pack === pack)
	const cover =
		pack === 'poker'
			? drawSticker(list[0].canvas, 0, 1, TRAY_SIZE, {
					outline: false,
					padding: 0.05,
					fit: 'fill',
				})
			: drawSticker(await loadImage(busEmoji), 0, 1, TRAY_SIZE, {
					outline: false,
					padding: 0.05,
				})
	const entries: ZipEntry[] = []
	for (let i = 0; i < list.length; i++) {
		entries.push({
			name: `sticker_${i + 1}.webp`,
			data: await canvasToWebp(list[i].canvas),
		})
	}
	entries.push(
		{ name: 'cover.png', data: await png(cover) },
		{ name: 'title.txt', data: encoder.encode(`${PACKS[pack].title}\n`) },
		{ name: 'author.txt', data: encoder.encode('Scoop Bus Run Club\n') },
	)
	return buildZip(entries)
}

/** Every sticker as a plain PNG, for Telegram, Signal, or anything else. */
async function buildPngZip(stickers: Sticker[]): Promise<Blob> {
	const entries: ZipEntry[] = []
	for (const sticker of stickers) {
		entries.push({
			name: `${PACKS[sticker.pack].file}/${sticker.stem}.png`,
			data: await png(sticker.canvas),
		})
	}
	return buildZip(entries)
}

export function ScoopmojiPage() {
	const [stickers] = createResource(buildStickers)
	const [busy, setBusy] = createSignal<string | null>(null)

	const inPack = (pack: Pack) =>
		(stickers() ?? []).filter((s) => s.pack === pack)

	const downloadOne = async (sticker: Sticker) => {
		const blob = await canvasToBlob(sticker.canvas, 'image/png')
		downloadBlob(blob, `scoopmoji-${sticker.stem}-${sticker.pack}.png`)
	}

	const run = async (label: string, job: () => Promise<[Blob, string]>) => {
		if (!stickers() || busy()) return
		setBusy(label)
		try {
			const [blob, name] = await job()
			downloadBlob(blob, name)
		} finally {
			setBusy(null)
		}
	}

	const downloadPack = (pack: Pack) =>
		run('Packing…', async () => [
			await buildWastickers(pack, stickers() ?? []),
			`${PACKS[pack].file}.wastickers`,
		])

	const downloadPngs = () =>
		run('Zipping…', async () => [
			await buildPngZip(stickers() ?? []),
			'scoopmoji-png.zip',
		])

	return (
		<div class={styles.container}>
			<FieldBlock title="Scoopmoji" signType="purple">
				<div class={styles.intro}>
					<p>
						The club as WhatsApp stickers. WhatsApp allows thirty stickers per
						pack, so there are a few. Each pack downloads as a{' '}
						<code>.wastickers</code> file: on your phone, open it with Sticker
						Maker (iPhone) or Sticker Maker / WAStickerApps (Android) and it
						lands in WhatsApp. Tap any sticker to save it on its own.
					</p>
					<div class={styles.actions}>
						<Button onClick={downloadPngs}>{busy() ?? 'All as PNG'}</Button>
						<span class={styles.hint}>
							A zip of every sticker as a plain PNG, for Telegram, Signal, or
							anywhere else.
						</span>
					</div>
				</div>
			</FieldBlock>

			<For each={PACK_ORDER}>
				{(pack) => (
					<FieldBlock title={PACKS[pack].title} signType="purple">
						<div class={styles.pack}>
							<p class={styles.blurb}>
								{inPack(pack).length} stickers: {PACKS[pack].blurb}.
							</p>
							<Show
								when={stickers()}
								fallback={<p class={styles.loading}>Drawing…</p>}
							>
								<div class={styles.grid}>
									<For each={inPack(pack)}>
										{(sticker) => (
											<button
												type="button"
												class={styles.tile}
												title={`Save ${sticker.stem}`}
												onClick={() => downloadOne(sticker)}
											>
												<img src={sticker.preview} alt="" />
												<span>{sticker.group}</span>
											</button>
										)}
									</For>
								</div>
							</Show>
							<Button
								class={styles.download}
								onClick={() => downloadPack(pack)}
							>
								{busy() ?? `Download ${PACKS[pack].title}`}
							</Button>
						</div>
					</FieldBlock>
				)}
			</For>

			<BackSignButton class={styles.backSign} to="/sandbox">
				Back to sandbox
			</BackSignButton>
		</div>
	)
}

const styles = {
	container: css({
		width: 'calc(100% - 2rem)',
		maxWidth: '900px',
		margin: '1rem auto',
		display: 'flex',
		flexDirection: 'column',
		gap: '3rem',
	}),
	intro: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '1rem',
		fontSize: '1.05rem',
	}),
	actions: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '0.5rem',
		alignItems: 'flex-start',
	}),
	hint: css({
		fontSize: '0.85rem',
		opacity: 0.8,
		lineHeight: 1.4,
	}),
	loading: css({ textAlign: 'center', opacity: 0.7 }),
	pack: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '1rem',
		alignItems: 'stretch',
	}),
	blurb: css({
		fontSize: '1.05rem',
		'&::first-letter': { textTransform: 'uppercase' },
	}),
	grid: css({
		display: 'grid',
		gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
		gap: '0.5rem',
	}),
	tile: css({
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		gap: '0.25rem',
		padding: '0.5rem 0.25rem',
		border: '3px double var(--dirt-darker-brown)',
		borderRadius: '6px',
		background: 'var(--overlay-white-40)',
		cursor: 'pointer',
		fontWeight: 'bold',
		fontSize: '0.85rem',
		transition: 'transform 0.1s ease-out',
		_hover: { transform: 'scale(1.06) rotate(-2deg)' },
		'& img': { width: '72px', height: '72px', imageRendering: 'pixelated' },
	}),
	download: css({
		alignSelf: 'center',
		marginTop: '0.5rem',
	}),
	backSign: css({
		margin: '0 auto',
		display: 'block',
	}),
}
