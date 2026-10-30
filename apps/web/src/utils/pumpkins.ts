import pumpkinBaseAsset from '@/assets/halloween/pumpkin-base.png'
import { createMemo, createRoot, createSignal } from 'solid-js'
import { pumpkinAssets } from './halloween'

const CONVEX_URL = (import.meta.env.VITE_CONVEX_URL as string) || ''

/** `pumpkin-base.png`'s size, kept in step with `PUMPKIN_PIXELS` in the Convex module. */
export const PUMPKIN_WIDTH = 29
export const PUMPKIN_HEIGHT = 23

/** Kept in step with `MAX_NAME_LENGTH` in the Convex module, which re-checks it. */
export const MAX_PUMPKIN_NAME_LENGTH = 20

/** Kept in step with `MAX_PUMPKINS_PER_DAY` in the Convex module. */
const MAX_PUMPKINS_PER_DAY = 10

/** Enough for the banner's row; the header takes the first few. */
const PUMPKINS_FETCHED = 10

/**
 * What a carved-out pixel turns into: a hole, for what's behind it to
 * shine through (see `PumpkinLight`).
 */
const CARVED_COLOR = [0, 0, 0, 0]

export interface CarvedPumpkin {
	_id: string
	name: string
	carver: string
	/** The pixels carved out of the base pumpkin, each as `y * PUMPKIN_WIDTH + x`. */
	carved: number[]
	/** The finished pumpkin, as an image URL. */
	image: string
}

/** The uncarved pumpkin's pixels, loaded once on first use. */
let basePixels: Promise<ImageData> | undefined

export function loadPumpkinBase(): Promise<ImageData> {
	basePixels ??= new Promise((resolve, reject) => {
		const image = new Image()
		image.onload = () => {
			const canvas = document.createElement('canvas')
			canvas.width = PUMPKIN_WIDTH
			canvas.height = PUMPKIN_HEIGHT
			const context = canvas.getContext('2d')
			if (!context) return reject(new Error('No canvas'))
			context.drawImage(image, 0, 0)
			resolve(context.getImageData(0, 0, PUMPKIN_WIDTH, PUMPKIN_HEIGHT))
		}
		image.onerror = reject
		image.src = pumpkinBaseAsset
	})
	return basePixels
}

/**
 * Whether a pixel is pumpkin, and so can be carved: there, and orange rather
 * than the stem's green.
 */
export function isCarvable(base: ImageData, index: number) {
	const [r, g, , a] = base.data.subarray(index * 4, index * 4 + 4)
	return a > 0 && r > g
}

/**
 * The base pumpkin with `carved` cut out of it. Anything that isn't pumpkin is
 * left alone, whatever the list says, so the stem and the air around it stay
 * as they are.
 */
export function carvePumpkin(base: ImageData, carved: Iterable<number>) {
	const pixels = new ImageData(
		new Uint8ClampedArray(base.data),
		PUMPKIN_WIDTH,
		PUMPKIN_HEIGHT,
	)
	for (const index of carved) {
		if (isCarvable(base, index)) pixels.data.set(CARVED_COLOR, index * 4)
	}
	return pixels
}

/** What a carved pumpkin is called, everywhere it's named. */
export function pumpkinLabel(pumpkin: { name: string; carver: string }) {
	return `${pumpkin.name} carved by ${pumpkin.carver}`
}

/** Every carved pumpkin's image so far, to know which have holes to light up. */
const carvedImages = new Set<string>()

/**
 * Whether an image is a carved pumpkin, with holes for its inside to show
 * through, rather than one of the drawn ones, which have their faces painted in.
 */
export function isCarvedPumpkin(image: string) {
	return carvedImages.has(image)
}

/** A carved pumpkin as an image URL, to go anywhere an imported asset would. */
function pumpkinImage(base: ImageData, carved: number[]) {
	const canvas = document.createElement('canvas')
	canvas.width = PUMPKIN_WIDTH
	canvas.height = PUMPKIN_HEIGHT
	canvas.getContext('2d')?.putImageData(carvePumpkin(base, carved), 0, 0)
	const image = canvas.toDataURL()
	carvedImages.add(image)
	return image
}

// ── The patch ───────────────────────────────────────────────────────

const [fetched, setFetched] = createSignal<CarvedPumpkin[]>([])

/**
 * Pumpkins carved in this tab, which go out ahead of the fetched ones, so
 * yours is in the header the moment it's saved.
 */
const [carvedThisVisit, setCarvedThisVisit] = createSignal<CarvedPumpkin[]>([])

let requested = false

/**
 * Whether the fetch `carvedPumpkins` starts has come back, either way. Until
 * then there's no telling whether there'll be carved pumpkins to show or the
 * drawn ones will have to stand in, so anything that would only swap one for
 * the other shows neither yet.
 */
const [settled, setSettled] = createSignal(false)
export const carvedPumpkinsSettled = settled

/** Carved pumpkins from `path`, drawn and ready to show. */
async function fetchPumpkins(path: string): Promise<CarvedPumpkin[]> {
	const [response, base] = await Promise.all([
		fetch(`${CONVEX_URL}${path}`),
		loadPumpkinBase(),
	])
	if (!response.ok) throw new Error(`API error: ${response.status}`)
	const pumpkins: Omit<CarvedPumpkin, 'image'>[] = await response.json()
	return pumpkins.map((pumpkin) => ({
		...pumpkin,
		image: pumpkinImage(base, pumpkin.carved),
	}))
}

/** Yours from this visit first, then `others` without them. */
function withCarvedThisVisit(others: CarvedPumpkin[]) {
	const mine = carvedThisVisit()
	const known = new Set(mine.map(({ _id }) => _id))
	return [...mine, ...others.filter(({ _id }) => !known.has(_id))]
}

/**
 * The fetched pumpkins with yours ahead of them, put together once each time
 * either changes rather than on every look: the header's pumpkins look many
 * times a tick. Lives as long as the page, the same as the signals it's made
 * from.
 */
const carved = createRoot(() =>
	createMemo(() => withCarvedThisVisit(fetched())),
)

/**
 * A random few of the pumpkins people have carved, newest of your own first.
 * Only fetched once something asks, so the rest of the year nobody downloads
 * a pumpkin.
 */
export function carvedPumpkins(): CarvedPumpkin[] {
	if (!requested) {
		requested = true
		fetchPumpkins(`/api/pumpkins?count=${PUMPKINS_FETCHED}`)
			.then(setFetched)
			// No carved pumpkins this time: the drawn ones stand in.
			.catch(() => {})
			.finally(() => setSettled(true))
	}
	return carved()
}

/**
 * The pumpkin patch, newest first: every pumpkin, until there are more than
 * the 500 the Convex module's `PATCH_SIZE` stops at.
 */
export async function fetchPumpkinPatch(): Promise<CarvedPumpkin[]> {
	return fetchPumpkins('/api/pumpkins/all')
}

/** Everyone's pumpkins, with yours from this visit at the front. */
export function pumpkinPatch(fetchedPatch: CarvedPumpkin[]) {
	return withCarvedThisVisit(fetchedPatch)
}

export interface HeaderPumpkin {
	image: string
	/** Who it is and who carved it, for a carved one; a drawn one has neither. */
	label?: string
}

/**
 * The header's `index`th pumpkin: a carved one where there's one to have, else
 * one of the drawn ones.
 */
export function headerPumpkin(index: number): HeaderPumpkin {
	const carved = carvedPumpkins()[index]
	if (carved) return { image: carved.image, label: pumpkinLabel(carved) }
	return { image: pumpkinAssets[index % pumpkinAssets.length] }
}

// ── Carving ─────────────────────────────────────────────────────────

export type CarvePumpkinResult = { ok: true } | { ok: false; error: string }

export async function savePumpkin(input: {
	name: string
	carver: string
	carved: number[]
}): Promise<CarvePumpkinResult> {
	try {
		const response = await fetch(`${CONVEX_URL}/api/pumpkins`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(input),
		})
		const data = await response.json()
		if (!response.ok || data.error) {
			if (data.error === 'limit') {
				return {
					ok: false,
					error: `That's ${MAX_PUMPKINS_PER_DAY} pumpkins carved today — leave some for everyone else, and come back tomorrow!`,
				}
			}
			return { ok: false, error: data.error ?? 'Something went wrong' }
		}

		const base = await loadPumpkinBase()
		setCarvedThisVisit((prev) => [
			{ _id: data.id, ...input, image: pumpkinImage(base, input.carved) },
			...prev,
		])
		return { ok: true }
	} catch {
		return { ok: false, error: 'Could not reach the server — try again' }
	}
}
