import { BadRequestException } from '@nestjs/common';
import { open } from 'fs/promises';

/**
 * Content-type detection by file signature (magic bytes).
 *
 * This inspects the real leading bytes of a file rather than trusting the
 * filename or client-sent Content-Type, so a malicious payload renamed to
 * `.pdf` is rejected (its bytes won't carry a real PDF header). For our fixed
 * allowlist (PDF/EPUB + JPEG/PNG/WEBP) signatures are 100% reliable, and unlike
 * an ML model it's sub-millisecond and non-blocking.
 */

/** Enough bytes to cover every signature we check (EPUB needs ~50). */
const HEAD_BYTES = 64;

/** Detected content-type labels per upload kind. */
export const ALLOWED_BOOK_LABELS = ['pdf', 'epub'];
export const ALLOWED_IMAGE_LABELS = ['jpeg', 'png', 'webp'];

const MIME_BY_LABEL: Record<string, string> = {
	pdf: 'application/pdf',
	epub: 'application/epub+zip',
	jpeg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
};

export function mimeForLabel(label: string): string | undefined {
	return MIME_BY_LABEL[label];
}

/** Returns our content-type label for the given bytes, or null if unrecognized. */
export function detectLabel(bytes: Uint8Array): string | null {
	const b = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);

	// PDF: "%PDF"
	if (b.length >= 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) {
		return 'pdf';
	}
	// PNG: 89 50 4E 47 0D 0A 1A 0A
	if (
		b.length >= 8 &&
		b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
		b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
	) {
		return 'png';
	}
	// JPEG: FF D8 FF
	if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
		return 'jpeg';
	}
	// WEBP: "RIFF"...."WEBP"
	if (
		b.length >= 12 &&
		b.toString('ascii', 0, 4) === 'RIFF' &&
		b.toString('ascii', 8, 12) === 'WEBP'
	) {
		return 'webp';
	}
	// EPUB: a ZIP ("PK\x03\x04") whose first (uncompressed) entry is the
	// "mimetype" file containing "application/epub+zip" at offset 30.
	if (b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) {
		if (b.toString('ascii', 30, 50).startsWith('application/epub+zip')) {
			return 'epub';
		}
		return null; // a generic zip, not an allowed book
	}

	return null;
}

/**
 * Validates the bytes are one of `allowedLabels`, throwing a BadRequest otherwise.
 * Returns the detected label on success.
 */
export function assertAllowedType(
	bytes: Uint8Array,
	allowedLabels: string[],
): string {
	const label = detectLabel(bytes);
	if (!label || !allowedLabels.includes(label)) {
		throw new BadRequestException(
			`File content type ${label ? `'${label}'` : '(unrecognized)'} is not allowed. Allowed: ${allowedLabels.join(', ')}`,
		);
	}
	return label;
}

/**
 * Like {@link assertAllowedType} but reads only the head bytes of a file on disk,
 * so large uploads (book PDFs) are never loaded into memory just to validate.
 */
export async function assertAllowedTypeFromPath(
	path: string,
	allowedLabels: string[],
): Promise<string> {
	const head = await readHead(path);
	return assertAllowedType(head, allowedLabels);
}

async function readHead(path: string): Promise<Buffer> {
	const handle = await open(path, 'r');
	try {
		const buffer = Buffer.alloc(HEAD_BYTES);
		const { bytesRead } = await handle.read(buffer, 0, HEAD_BYTES, 0);
		return buffer.subarray(0, bytesRead);
	} finally {
		await handle.close();
	}
}
