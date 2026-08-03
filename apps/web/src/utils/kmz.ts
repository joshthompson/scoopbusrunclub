/**
 * Minimal reader for the one thing we need out of a KMZ: its KML.
 *
 * A KMZ is a zip archive holding a single small doc.kml. Rather than ship a zip
 * library in the bundle for that, we walk the central directory by hand and
 * inflate with the platform's own DecompressionStream. The scraping scripts use
 * JSZip for the same job server-side (apps/api/lib/map-scraper.ts).
 */

const EOCD_SIGNATURE = 0x06054b50
const CENTRAL_FILE_SIGNATURE = 0x02014b50
const LOCAL_FILE_SIGNATURE = 0x04034b50

/** Largest possible end-of-central-directory record: 22 bytes + 64 KB comment. */
const MAX_EOCD_SIZE = 22 + 0xffff

const STORED = 0
const DEFLATED = 8

interface ZipEntry {
	name: string
	compressionMethod: number
	compressedSize: number
	localHeaderOffset: number
}

/** Byte offset of the end-of-central-directory record, searching backwards. */
function findEndOfCentralDirectory(view: DataView): number {
	const start = Math.max(0, view.byteLength - MAX_EOCD_SIZE)
	for (let offset = view.byteLength - 22; offset >= start; offset--) {
		if (view.getUint32(offset, true) === EOCD_SIGNATURE) return offset
	}
	throw new Error('Not a zip archive (no end-of-central-directory record)')
}

function readCentralDirectory(view: DataView): ZipEntry[] {
	const eocd = findEndOfCentralDirectory(view)
	const entryCount = view.getUint16(eocd + 10, true)
	let offset = view.getUint32(eocd + 16, true)

	if (offset === 0xffffffff) {
		throw new Error('Zip64 archives are not supported')
	}

	const decoder = new TextDecoder()
	const entries: ZipEntry[] = []

	for (let i = 0; i < entryCount; i++) {
		if (view.getUint32(offset, true) !== CENTRAL_FILE_SIGNATURE) {
			throw new Error('Malformed zip central directory')
		}

		const nameLength = view.getUint16(offset + 28, true)
		const extraLength = view.getUint16(offset + 30, true)
		const commentLength = view.getUint16(offset + 32, true)

		entries.push({
			name: decoder.decode(
				new Uint8Array(view.buffer, view.byteOffset + offset + 46, nameLength),
			),
			compressionMethod: view.getUint16(offset + 10, true),
			compressedSize: view.getUint32(offset + 20, true),
			localHeaderOffset: view.getUint32(offset + 42, true),
		})

		offset += 46 + nameLength + extraLength + commentLength
	}

	return entries
}

/** The entry's raw (still compressed) bytes, found via its local header. */
function readEntryBytes(view: DataView, entry: ZipEntry): Uint8Array {
	const offset = entry.localHeaderOffset

	if (view.getUint32(offset, true) !== LOCAL_FILE_SIGNATURE) {
		throw new Error(`Malformed zip entry: ${entry.name}`)
	}

	const nameLength = view.getUint16(offset + 26, true)
	const extraLength = view.getUint16(offset + 28, true)
	const dataStart = offset + 30 + nameLength + extraLength

	return new Uint8Array(
		view.buffer,
		view.byteOffset + dataStart,
		entry.compressedSize,
	)
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
	const stream = new Blob([bytes as BlobPart])
		.stream()
		.pipeThrough(new DecompressionStream('deflate-raw'))
	return new Uint8Array(await new Response(stream).arrayBuffer())
}

/**
 * Extract the KML text from a KMZ archive. Prefers doc.kml (what Google Maps
 * exports), falling back to the first .kml entry in the archive.
 */
export async function extractKmlFromKmz(buffer: ArrayBuffer): Promise<string> {
	const view = new DataView(buffer)
	const entries = readCentralDirectory(view)

	const entry =
		entries.find((e) => e.name === 'doc.kml') ??
		entries.find((e) => e.name.toLowerCase().endsWith('.kml'))

	if (!entry) throw new Error('No KML file found in KMZ archive')

	const raw = readEntryBytes(view, entry)

	if (entry.compressionMethod === STORED) {
		return new TextDecoder().decode(raw)
	}
	if (entry.compressionMethod === DEFLATED) {
		return new TextDecoder().decode(await inflate(raw))
	}

	throw new Error(
		`Unsupported compression method ${entry.compressionMethod} in KMZ`,
	)
}
