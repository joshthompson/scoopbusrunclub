/**
 * A minimal ZIP writer, so the packed extension can be produced without adding a
 * dependency (`node:zlib` provides the compression).
 *
 * Mirror image of apps/web/src/utils/kmz.ts, which reads this format.
 *
 * Works in `Uint8Array` rather than `Buffer` because this project's tsconfig is
 * set up for the extension itself — browser libs, no Node types — and a build
 * script living here shouldn't drag those in.
 *
 * Entries carry a fixed timestamp so repeated builds of unchanged source produce
 * byte-identical archives, keeping needless churn out of the deployed site.
 */
import { deflateRawSync } from 'node:zlib'

/** 1980-01-01 00:00, the earliest the ZIP date format can express. */
const DOS_TIME = 0
const DOS_DATE = (1 << 5) | 1

const LOCAL_FILE_SIGNATURE = 0x04034b50
const CENTRAL_FILE_SIGNATURE = 0x02014b50
const EOCD_SIGNATURE = 0x06054b50

const DEFLATED = 8

export interface ZipEntry {
	/** Path inside the archive, forward slashes. */
	name: string
	contents: Uint8Array
}

const CRC_TABLE = buildCrcTable()

function buildCrcTable(): Uint32Array {
	const table = new Uint32Array(256)
	for (let i = 0; i < 256; i++) {
		let c = i
		for (let bit = 0; bit < 8; bit++) {
			c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
		}
		table[i] = c >>> 0
	}
	return table
}

function crc32(data: Uint8Array): number {
	let crc = 0xffffffff
	for (const byte of data) {
		crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
	}
	return (crc ^ 0xffffffff) >>> 0
}

function concat(parts: Uint8Array[]): Uint8Array {
	const total = parts.reduce((sum, part) => sum + part.length, 0)
	const out = new Uint8Array(total)
	let at = 0
	for (const part of parts) {
		out.set(part, at)
		at += part.length
	}
	return out
}

/** Little-endian field writer over a fresh buffer. */
function header(size: number): {
	bytes: Uint8Array
	u16: (offset: number, value: number) => void
	u32: (offset: number, value: number) => void
} {
	const bytes = new Uint8Array(size)
	const view = new DataView(bytes.buffer)
	return {
		bytes,
		u16: (offset, value) => view.setUint16(offset, value, true),
		u32: (offset, value) => view.setUint32(offset, value, true),
	}
}

/** Build a ZIP archive containing the given entries. */
export function createZip(entries: ZipEntry[]): Uint8Array {
	const chunks: Uint8Array[] = []
	const central: Uint8Array[] = []
	let offset = 0

	const encoder = new TextEncoder()

	for (const entry of entries) {
		const name = encoder.encode(entry.name)
		const compressed = new Uint8Array(deflateRawSync(entry.contents))
		const crc = crc32(entry.contents)

		const local = header(30)
		local.u32(0, LOCAL_FILE_SIGNATURE)
		local.u16(4, 20) // version needed
		local.u16(6, 0) // flags
		local.u16(8, DEFLATED)
		local.u16(10, DOS_TIME)
		local.u16(12, DOS_DATE)
		local.u32(14, crc)
		local.u32(18, compressed.length)
		local.u32(22, entry.contents.length)
		local.u16(26, name.length)
		local.u16(28, 0) // extra length

		chunks.push(local.bytes, name, compressed)

		const dir = header(46)
		dir.u32(0, CENTRAL_FILE_SIGNATURE)
		dir.u16(4, 20) // version made by
		dir.u16(6, 20) // version needed
		dir.u16(8, 0) // flags
		dir.u16(10, DEFLATED)
		dir.u16(12, DOS_TIME)
		dir.u16(14, DOS_DATE)
		dir.u32(16, crc)
		dir.u32(20, compressed.length)
		dir.u32(24, entry.contents.length)
		dir.u16(28, name.length)
		dir.u16(30, 0) // extra
		dir.u16(32, 0) // comment
		dir.u16(34, 0) // disk number
		dir.u16(36, 0) // internal attrs
		dir.u32(38, 0) // external attrs
		dir.u32(42, offset)

		central.push(dir.bytes, name)
		offset += local.bytes.length + name.length + compressed.length
	}

	const centralBytes = concat(central)

	const eocd = header(22)
	eocd.u32(0, EOCD_SIGNATURE)
	eocd.u16(4, 0) // this disk
	eocd.u16(6, 0) // disk with central directory
	eocd.u16(8, entries.length)
	eocd.u16(10, entries.length)
	eocd.u32(12, centralBytes.length)
	eocd.u32(16, offset)
	eocd.u16(20, 0) // comment length

	return concat([...chunks, centralBytes, eocd.bytes])
}
