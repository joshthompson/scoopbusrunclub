import { createSignal } from 'solid-js'

export interface Size {
	width: number
	height: number
}

/** Every image's size asked for so far, read off the image itself. */
const [sizes, setSizes] = createSignal<Record<string, Size>>({})
const requested = new Set<string>()

/**
 * An image's own size, once it has loaded, for drawing it at a size that suits
 * it without anyone having to write that size down. Loads the image the first
 * time it's asked about, so only ask once it's wanted.
 */
export function imageSize(url: string): Size | undefined {
	if (!requested.has(url)) {
		requested.add(url)
		const image = new Image()
		image.onload = () =>
			setSizes((all) => ({
				...all,
				[url]: { width: image.naturalWidth, height: image.naturalHeight },
			}))
		image.src = url
	}
	return sizes()[url]
}
