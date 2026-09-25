/**
 * A small ZIP writer. Entries are deflated through the browser's
 * CompressionStream where it exists, and stored uncompressed otherwise; both
 * are plain ZIP and open anywhere. It keeps the sandbox free of a dependency.
 */

const CRC_TABLE = (() => {
	const table = new Uint32Array(256)
	for (let n = 0; n < 256; n++) {
		let c = n
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
		table[n] = c >>> 0
	}
	return table
})()

function crc32(data: Uint8Array): number {
	let crc = 0xffffffff
	for (let i = 0; i < data.length; i++) {
		crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
	}
	return (crc ^ 0xffffffff) >>> 0
}

export interface ZipEntry {
	name: string
	data: Uint8Array
}

function dosDateTime(date: Date) {
	const time =
		(date.getHours() << 11) |
		(date.getMinutes() << 5) |
		(Math.floor(date.getSeconds() / 2) & 0x1f)
	const day =
		((date.getFullYear() - 1980) << 9) |
		((date.getMonth() + 1) << 5) |
		date.getDate()
	return { time, day }
}

const STORE = 0
const DEFLATE = 8

async function deflate(data: Uint8Array): Promise<Uint8Array | null> {
	if (typeof CompressionStream === 'undefined') return null
	try {
		const stream = new Blob([data as BlobPart])
			.stream()
			.pipeThrough(new CompressionStream('deflate-raw'))
		return new Uint8Array(await new Response(stream).arrayBuffer())
	} catch {
		return null
	}
}

export async function buildZip(entries: ZipEntry[]): Promise<Blob> {
	const encoder = new TextEncoder()
	const parts: Uint8Array[] = []
	const central: Uint8Array[] = []
	let offset = 0
	const { time, day } = dosDateTime(new Date())

	for (const entry of entries) {
		const name = encoder.encode(entry.name)
		const crc = crc32(entry.data)
		const size = entry.data.length
		const packed = await deflate(entry.data)
		// Only worth deflating when it actually shrinks (PNGs mostly don't).
		const useDeflate = packed !== null && packed.length < size
		const body = useDeflate ? packed : entry.data
		const method = useDeflate ? DEFLATE : STORE

		const local = new DataView(new ArrayBuffer(30))
		local.setUint32(0, 0x04034b50, true)
		local.setUint16(4, 20, true) // version needed
		local.setUint16(6, 0, true) // no flags: names are ASCII
		local.setUint16(8, method, true)
		local.setUint16(10, time, true)
		local.setUint16(12, day, true)
		local.setUint32(14, crc, true)
		local.setUint32(18, body.length, true)
		local.setUint32(22, size, true)
		local.setUint16(26, name.length, true)
		local.setUint16(28, 0, true)
		const localBytes = new Uint8Array(local.buffer)
		parts.push(localBytes, name, body)

		const cd = new DataView(new ArrayBuffer(46))
		cd.setUint32(0, 0x02014b50, true)
		cd.setUint16(4, (3 << 8) | 20, true) // made by: Unix, zip 2.0
		cd.setUint16(6, 20, true) // needed
		cd.setUint16(8, 0, true)
		cd.setUint16(10, method, true)
		cd.setUint16(12, time, true)
		cd.setUint16(14, day, true)
		cd.setUint32(16, crc, true)
		cd.setUint32(20, body.length, true)
		cd.setUint32(24, size, true)
		cd.setUint16(28, name.length, true)
		cd.setUint16(30, 0, true) // extra
		cd.setUint16(32, 0, true) // comment
		cd.setUint16(34, 0, true) // disk
		cd.setUint16(36, 0, true) // internal attrs
		cd.setUint32(38, 0x81a40000, true) // external attrs: a regular file, 0644
		cd.setUint32(42, offset, true)
		central.push(new Uint8Array(cd.buffer), name)

		offset += localBytes.length + name.length + body.length
	}

	const centralSize = central.reduce((n, p) => n + p.length, 0)
	const eocd = new DataView(new ArrayBuffer(22))
	eocd.setUint32(0, 0x06054b50, true)
	eocd.setUint16(4, 0, true)
	eocd.setUint16(6, 0, true)
	eocd.setUint16(8, entries.length, true)
	eocd.setUint16(10, entries.length, true)
	eocd.setUint32(12, centralSize, true)
	eocd.setUint32(16, offset, true)
	eocd.setUint16(20, 0, true)

	return new Blob(
		[...parts, ...central, new Uint8Array(eocd.buffer)] as BlobPart[],
		{
			type: 'application/zip',
		},
	)
}
