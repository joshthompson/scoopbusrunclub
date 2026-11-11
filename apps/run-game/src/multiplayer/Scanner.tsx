import { type JSX, Show, createSignal, onCleanup, onMount } from 'solid-js'
import { codeFromScan } from './protocol'

/**
 * Scanning a Room's QR code with the phone's camera, without leaving the
 * game: the browser's own barcode detector where there is one (Chrome on
 * Android), and jsQR, loaded only then, where there isn't (Safari).
 */

/** The bit of the Barcode Detection API used here: not in TypeScript's DOM types yet. */
interface BarcodeDetector {
	detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>
}
declare const BarcodeDetector:
	| (new (options: { formats: string[] }) => BarcodeDetector)
	| undefined

/** How often a look is taken at the camera. */
const LOOK_EVERY_MS = 150
/** The camera's picture is shrunk to this wide for jsQR, which is plenty for a QR code. */
const LOOK_WIDTH = 480

/** A decoder for the camera's picture: whatever text a QR code in it holds. */
async function makeDecoder(): Promise<
	(video: HTMLVideoElement) => Promise<string | undefined>
> {
	if (typeof BarcodeDetector !== 'undefined') {
		try {
			const detector = new BarcodeDetector({ formats: ['qr_code'] })
			return async (video) => (await detector.detect(video))[0]?.rawValue
		} catch {
			// Supported, but not QR codes: jsQR instead.
		}
	}
	const { default: jsQR } = await import('jsqr')
	const canvas = document.createElement('canvas')
	const context = canvas.getContext('2d', { willReadFrequently: true })
	return async (video) => {
		if (!context || !video.videoWidth) return undefined
		const scale = Math.min(1, LOOK_WIDTH / video.videoWidth)
		canvas.width = Math.round(video.videoWidth * scale)
		canvas.height = Math.round(video.videoHeight * scale)
		context.drawImage(video, 0, 0, canvas.width, canvas.height)
		const { data, width, height } = context.getImageData(
			0,
			0,
			canvas.width,
			canvas.height,
		)
		return jsQR(data, width, height, { inversionAttempts: 'dontInvert' })?.data
	}
}

export function Scanner(props: {
	onCode: (code: string) => void
	onCancel: () => void
}) {
	let video: HTMLVideoElement | undefined
	let stream: MediaStream | undefined
	let timer: number | undefined
	let stopped = false
	const [problem, setProblem] = createSignal<string>()
	const [notARoom, setNotARoom] = createSignal(false)

	const stop = () => {
		stopped = true
		window.clearTimeout(timer)
		for (const track of stream?.getTracks() ?? []) track.stop()
	}
	onCleanup(stop)

	onMount(async () => {
		try {
			stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'environment' },
				audio: false,
			})
		} catch {
			setProblem(
				'The camera can’t be used. Allow it in the browser’s settings, or type the code in.',
			)
			return
		}
		if (stopped || !video) return stop()
		video.srcObject = stream
		await video.play().catch(() => {})
		const decode = await makeDecoder()

		const look = async () => {
			if (stopped || !video) return
			const text = await decode(video).catch(() => undefined)
			if (text) {
				const code = codeFromScan(text)
				if (code) {
					navigator.vibrate?.(30)
					stop()
					props.onCode(code)
					return
				}
				setNotARoom(true)
			}
			timer = window.setTimeout(look, LOOK_EVERY_MS)
		}
		void look()
	})

	return (
		<div style={styles.screen}>
			<Show
				when={!problem()}
				fallback={<div style={styles.problem}>{problem()}</div>}
			>
				<div style={styles.viewfinder}>
					<video ref={video} style={styles.video} playsinline muted autoplay />
					<div style={styles.target} />
				</div>
				<div style={styles.hint}>
					{notARoom()
						? 'That isn’t a Room’s QR code.'
						: 'Point it at the QR code on the big screen.'}
				</div>
			</Show>
			<button
				type="button"
				style={styles.cancel}
				onClick={() => {
					stop()
					props.onCancel()
				}}
			>
				Type the code instead
			</button>
		</div>
	)
}

const styles = {
	screen: {
		flex: 1,
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		'justify-content': 'center',
		gap: '16px',
		padding: '20px',
		'text-align': 'center',
	},
	viewfinder: {
		position: 'relative',
		width: 'min(80vw, 50vh, 360px)',
		'aspect-ratio': '1',
		border: '4px solid var(--ink)',
		background: 'var(--ink)',
		overflow: 'hidden',
	},
	video: {
		width: '100%',
		height: '100%',
		'object-fit': 'cover',
		display: 'block',
	},
	target: {
		position: 'absolute',
		inset: '18%',
		border: '4px dashed rgba(255, 255, 255, 0.8)',
	},
	hint: { 'font-size': '18px', 'max-width': '320px' },
	problem: { 'font-size': '18px', 'max-width': '320px', opacity: 0.85 },
	cancel: {
		padding: '8px 12px 5px',
		background: 'rgba(15, 31, 41, 0.85)',
		color: 'white',
		border: '3px solid white',
		'font-family': 'var(--font-pixel)',
		'font-size': '15px',
	},
} satisfies Record<string, JSX.CSSProperties>
