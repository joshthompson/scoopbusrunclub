/**
 * Scoopmoji: every member as a chat sticker — their head, and their first
 * running frame — with a WhatsApp-shaped sticker pack to download.
 */
import busEmoji from '@/assets/emoji/bus.png'
import { BackSignButton } from '@/components/BackSignButton'
import { Button } from '@/components/ui/Button'
import { FieldBlock } from '@/components/ui/FieldBlock'
import { css } from '@style/css'
import { For, Show, createResource, createSignal } from 'solid-js'
import {
	type SpriteMember,
	canvasToBlob,
	downloadBlob,
	drawSticker,
	loadImage,
	spriteMembers,
} from '../shared/sprites'
import { type ZipEntry, buildZip } from '../shared/zip'

/** WhatsApp wants 512×512 stickers and a 96×96 tray icon. */
const STICKER_SIZE = 512
const TRAY_SIZE = 96

type Kind = 'head' | 'runner'

interface Sticker {
	member: SpriteMember
	kind: Kind
	canvas: HTMLCanvasElement
	preview: string
}

async function buildStickers(): Promise<Sticker[]> {
	const out: Sticker[] = []
	for (const member of spriteMembers()) {
		if (member.face) {
			const img = await loadImage(member.face)
			const canvas = drawSticker(img, 0, 1, STICKER_SIZE, { padding: 0.14 })
			out.push({ member, kind: 'head', canvas, preview: canvas.toDataURL() })
		}
		const sheet = await loadImage(member.runSheet)
		const canvas = drawSticker(sheet, 0, member.frameCount, STICKER_SIZE)
		out.push({ member, kind: 'runner', canvas, preview: canvas.toDataURL() })
	}
	return out
}

async function supportsWebp(): Promise<boolean> {
	const c = document.createElement('canvas')
	c.width = 1
	c.height = 1
	try {
		const blob = await canvasToBlob(c, 'image/webp')
		return blob.type === 'image/webp'
	} catch {
		return false
	}
}

function fileStem(sticker: Sticker) {
	return sticker.member.key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
}

/**
 * The pack as the WhatsApp sticker sample app lays it out: a `contents.json`
 * describing each pack, its tray icon, and one image file per sticker. Two
 * packs (heads, runners) because a pack holds 30 stickers at most.
 */
async function buildPack(stickers: Sticker[]): Promise<Blob> {
	const webp = await supportsWebp()
	const ext = webp ? 'webp' : 'png'
	const mime = webp ? 'image/webp' : 'image/png'
	const entries: ZipEntry[] = []

	const packs: {
		identifier: string
		name: string
		folder: string
		kind: Kind
		emojis: string[]
	}[] = [
		{
			identifier: 'scoopbus_scoopmoji_heads',
			name: 'Scoopmoji Heads',
			folder: 'heads',
			kind: 'head',
			emojis: ['🙂', '🚌'],
		},
		{
			identifier: 'scoopbus_scoopmoji_runners',
			name: 'Scoopmoji Runners',
			folder: 'runners',
			kind: 'runner',
			emojis: ['🏃', '🚌'],
		},
	]

	const contents = {
		android_play_store_link: '',
		ios_app_store_link: '',
		sticker_packs: [] as unknown[],
	}

	for (const pack of packs) {
		const members = stickers.filter((s) => s.kind === pack.kind)
		const list: { image_file: string; emojis: string[] }[] = []
		for (const sticker of members) {
			const blob = await canvasToBlob(sticker.canvas, mime)
			const name = `${pack.folder}/${fileStem(sticker)}.${ext}`
			entries.push({ name, data: new Uint8Array(await blob.arrayBuffer()) })
			list.push({ image_file: name, emojis: pack.emojis })
		}

		// Tray icon: the bus for the heads, the first runner for the runners.
		const trayImg = await loadImage(
			pack.kind === 'head' ? busEmoji : members[0].member.runSheet,
		)
		const tray = drawSticker(
			trayImg,
			0,
			pack.kind === 'head' ? 1 : members[0].member.frameCount,
			TRAY_SIZE,
			{ outline: false, padding: 0.05 },
		)
		const trayName = `${pack.folder}/tray.png`
		const trayBlob = await canvasToBlob(tray, 'image/png')
		entries.push({
			name: trayName,
			data: new Uint8Array(await trayBlob.arrayBuffer()),
		})

		contents.sticker_packs.push({
			identifier: pack.identifier,
			name: pack.name,
			publisher: 'Scoop Bus Run Club',
			tray_image_file: trayName,
			publisher_website: 'https://scoopbus.run',
			privacy_policy_website: '',
			license_agreement_website: '',
			stickers: list,
		})
	}

	const encoder = new TextEncoder()
	entries.push({
		name: 'contents.json',
		data: encoder.encode(JSON.stringify(contents, null, 2)),
	})
	entries.push({
		name: 'README.txt',
		data: encoder.encode(
			[
				'Scoopmoji — Scoop Bus Run Club stickers',
				'',
				`Stickers are ${STICKER_SIZE}x${STICKER_SIZE} ${ext.toUpperCase()} with a transparent background,`,
				'the format WhatsApp sticker packs use. Each folder is one pack and',
				'has its own tray.png icon; contents.json describes both packs the way',
				"WhatsApp's sticker sample app expects.",
				'',
				'To add them to WhatsApp, unzip this on your phone and import the',
				'folder with a sticker-maker app (for example "Sticker Maker" on',
				'iPhone or "Sticker.ly" on Android). Telegram and Signal accept the',
				'image files directly.',
				webp
					? ''
					: '\nThis browser could not encode WebP, so the stickers are PNG. Most sticker apps convert them; if one refuses, re-download the pack from Chrome.',
			].join('\n'),
		),
	})

	return buildZip(entries)
}

export function ScoopmojiPage() {
	const [stickers] = createResource(buildStickers)
	const [busy, setBusy] = createSignal<string | null>(null)

	const members = () => {
		const list = stickers() ?? []
		const seen = new Map<string, Sticker[]>()
		for (const s of list) {
			const group = seen.get(s.member.key) ?? []
			group.push(s)
			seen.set(s.member.key, group)
		}
		return [...seen.values()]
	}

	const downloadOne = async (sticker: Sticker) => {
		const blob = await canvasToBlob(sticker.canvas, 'image/png')
		downloadBlob(blob, `scoopmoji-${fileStem(sticker)}-${sticker.kind}.png`)
	}

	const downloadPack = async () => {
		const list = stickers()
		if (!list || busy()) return
		setBusy('Packing stickers…')
		try {
			const zip = await buildPack(list)
			downloadBlob(zip, 'scoopmoji-sticker-pack.zip')
		} finally {
			setBusy(null)
		}
	}

	return (
		<div class={styles.container}>
			<FieldBlock title="Scoopmoji" signType="purple">
				<div class={styles.intro}>
					<p>
						Every member of the club as a sticker: their head, and their first
						stride out of the sprite sheet. Tap one to save it, or grab the
						whole lot as a pack.
					</p>
					<div class={styles.actions}>
						<Button onClick={downloadPack}>
							{busy() ?? 'Download sticker pack'}
						</Button>
						<span class={styles.hint}>
							512×512 WebP with a transparent background, in WhatsApp's
							sticker-pack layout. Import the zip with a sticker-maker app
							(Sticker Maker on iPhone, Sticker.ly on Android); Telegram and
							Signal take the files as they are.
						</span>
					</div>
				</div>
			</FieldBlock>

			<Show when={stickers()} fallback={<p class={styles.loading}>Drawing…</p>}>
				<div class={styles.grid}>
					<For each={members()}>
						{(group) => (
							<div class={styles.card}>
								<div class={styles.stickers}>
									<For each={group}>
										{(sticker) => (
											<button
												type="button"
												class={styles.sticker}
												title={`Save ${sticker.member.data.name}'s ${sticker.kind}`}
												onClick={() => downloadOne(sticker)}
											>
												<img src={sticker.preview} alt="" />
											</button>
										)}
									</For>
								</div>
								<div class={styles.name}>{group[0].member.data.name}</div>
							</div>
						)}
					</For>
				</div>
			</Show>

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
		gap: '2rem',
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
		gap: '0.75rem',
		alignItems: 'flex-start',
	}),
	hint: css({
		fontSize: '0.85rem',
		opacity: 0.8,
		lineHeight: 1.4,
	}),
	loading: css({ textAlign: 'center', opacity: 0.7 }),
	grid: css({
		display: 'grid',
		gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
		gap: '1rem',
	}),
	card: css({
		background: 'var(--overlay-white-40)',
		border: '3px double var(--dirt-darker-brown)',
		borderRadius: '6px',
		padding: '0.75rem 0.5rem 0.5rem',
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		gap: '0.5rem',
	}),
	stickers: css({
		display: 'flex',
		gap: '0.25rem',
		justifyContent: 'center',
	}),
	sticker: css({
		width: '64px',
		height: '64px',
		padding: 0,
		border: 'none',
		background: 'transparent',
		cursor: 'pointer',
		transition: 'transform 0.1s ease-out',
		_hover: { transform: 'scale(1.15) rotate(-4deg)' },
		'& img': { width: '100%', height: '100%', imageRendering: 'pixelated' },
	}),
	name: css({
		fontWeight: 'bold',
		fontSize: '0.95rem',
	}),
	backSign: css({
		margin: '0 auto',
		display: 'block',
	}),
}
