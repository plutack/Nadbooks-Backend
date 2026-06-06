import { Injectable, Logger } from '@nestjs/common';
import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl as presign } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable } from 'stream';
import { ulid } from 'ulid';
import { FileType } from '@/books/types';
import { IStorageService } from '@/storage/interfaces/storage.interface';
import { getR2Client, getR2Config, publicUrl } from '@/storage/r2.client';

const EXT_BY_MIME: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'application/pdf': 'pdf',
	'application/epub+zip': 'epub',
};

const PREFIX_BY_TYPE: Record<FileType, string> = {
	[FileType.BOOK]: 'books',
	[FileType.COVER]: 'covers',
	[FileType.AVATAR]: 'avatars',
};

// Multipart upload tuning. Larger parts = fewer round-trips; queueSize parts go
// in parallel, which saturates a fat/high-latency link (e.g. server → R2). On a
// bandwidth-limited connection these are bounded by throughput, not parallelism.
const UPLOAD_PART_SIZE = 8 * 1024 * 1024; // 8 MB
const UPLOAD_QUEUE_SIZE = 4;

/**
 * Cloudflare R2 storage provider.
 *
 * Books go to the PRIVATE bucket and are addressed by object key (downloaded via
 * short-lived presigned URLs). Covers and avatars go to the PUBLIC bucket and are
 * addressed by their public URL. See `r2.client.ts` for the bucket model.
 */
@Injectable()
export class R2Service implements IStorageService {
	private readonly logger = new Logger(R2Service.name);

	private slug(name: string): string {
		return (
			name
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-+|-+$/g, '')
				.slice(0, 60) || 'file'
		);
	}

	private extFor(file: Express.Multer.File): string {
		const fromMime = EXT_BY_MIME[file.mimetype];
		if (fromMime) return fromMime;
		const fromName = file.originalname?.split('.').pop();
		return fromName && fromName.length <= 5 ? fromName.toLowerCase() : 'bin';
	}

	/** Build an object key, e.g. `covers/my-book-cover-01H...jpg`. */
	buildKey(fileType: FileType, name: string, ext: string): string {
		return `${PREFIX_BY_TYPE[fileType]}/${this.slug(name)}-${ulid()}.${ext}`;
	}

	async storeFile(
		fileType: FileType,
		file: Express.Multer.File,
		fileName: string,
	): Promise<string> {
		const config = getR2Config();
		const isPublic = fileType !== FileType.BOOK;
		const key = this.buildKey(fileType, fileName, this.extFor(file));

		await getR2Client().send(
			new PutObjectCommand({
				Bucket: isPublic ? config.publicBucket : config.bucket,
				Key: key,
				Body: file.buffer,
				ContentType: file.mimetype,
			}),
		);

		this.logger.log(`Stored ${fileType} at ${key}`);
		// Books are private (key only); public assets return a directly servable URL.
		return isPublic ? publicUrl(key) : key;
	}

	async storeStream(
		fileType: FileType,
		stream: Readable,
		fileName: string,
		contentType: string,
	): Promise<string> {
		const config = getR2Config();
		const isPublic = fileType !== FileType.BOOK;
		const ext = EXT_BY_MIME[contentType] ?? 'bin';
		const key = this.buildKey(fileType, fileName, ext);

		// lib-storage handles multipart upload from the stream — no full buffer in memory.
		const upload = new Upload({
			client: getR2Client(),
			params: {
				Bucket: isPublic ? config.publicBucket : config.bucket,
				Key: key,
				Body: stream,
				ContentType: contentType,
			},
			partSize: UPLOAD_PART_SIZE,
			queueSize: UPLOAD_QUEUE_SIZE,
		});
		await upload.done();

		this.logger.log(`Streamed ${fileType} to ${key}`);
		return isPublic ? publicUrl(key) : key;
	}

	/** Mint a short-lived presigned GET URL for a private (book) object key. */
	async getSignedUrl(key: string, ttlSeconds?: number): Promise<string> {
		const config = getR2Config();
		return presign(
			getR2Client(),
			new GetObjectCommand({ Bucket: config.bucket, Key: key }),
			{ expiresIn: ttlSeconds ?? config.downloadTtlSeconds },
		);
	}

	/**
	 * Delete an object. Accepts either a private key (book) or a public URL
	 * (cover/avatar) and routes to the correct bucket.
	 */
	async deleteFile(reference: string): Promise<void> {
		const config = getR2Config();
		let bucket = config.bucket;
		let key = reference;

		if (reference.startsWith(config.publicBaseUrl)) {
			bucket = config.publicBucket;
			key = reference.slice(config.publicBaseUrl.length + 1);
		}

		await getR2Client().send(
			new DeleteObjectCommand({ Bucket: bucket, Key: key }),
		);
		this.logger.log(`Deleted object ${key}`);
	}
}
