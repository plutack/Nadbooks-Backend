import { S3Client } from '@aws-sdk/client-s3';

/**
 * Shared Cloudflare R2 configuration + client.
 *
 * Config is read lazily from `process.env` (populated by `@nestjs/config` from
 * `.env` at bootstrap) and memoized, so the client is only built on first use.
 *
 * Bucket model:
 *  - `bucket` (R2_BUCKET) is PRIVATE — book files live here, accessed only via
 *    short-lived presigned URLs.
 *  - `publicBucket` (R2_PUBLIC_BUCKET) is bound to a public domain
 *    (`R2_PUBLIC_BASE_URL`) — covers and avatars live here. Falls back to the
 *    private bucket if unset (single-bucket setups), but two buckets is the
 *    recommended, secure layout.
 */
export interface R2Config {
	accountId: string;
	accessKeyId: string;
	secretAccessKey: string;
	bucket: string;
	publicBucket: string;
	publicBaseUrl: string;
	endpoint: string;
	downloadTtlSeconds: number;
}

let cachedConfig: R2Config | null = null;
let cachedClient: S3Client | null = null;

function required(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required R2 environment variable: ${name}`);
	}
	return value;
}

export function getR2Config(): R2Config {
	if (cachedConfig) return cachedConfig;

	const accountId = required('R2_ACCOUNT_ID');
	const bucket = required('R2_BUCKET');

	cachedConfig = {
		accountId,
		accessKeyId: required('R2_ACCESS_KEY_ID'),
		secretAccessKey: required('R2_SECRET_ACCESS_KEY'),
		bucket,
		publicBucket: process.env.R2_PUBLIC_BUCKET || bucket,
		publicBaseUrl: required('R2_PUBLIC_BASE_URL').replace(/\/+$/, ''),
		endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
		downloadTtlSeconds: Number(process.env.DOWNLOAD_URL_TTL ?? 300),
	};

	return cachedConfig;
}

export function getR2Client(): S3Client {
	if (cachedClient) return cachedClient;

	const config = getR2Config();
	cachedClient = new S3Client({
		region: 'auto',
		endpoint: config.endpoint,
		credentials: {
			accessKeyId: config.accessKeyId,
			secretAccessKey: config.secretAccessKey,
		},
	});

	return cachedClient;
}

/** Build the public URL for an object stored in the public bucket. */
export function publicUrl(key: string): string {
	return `${getR2Config().publicBaseUrl}/${key}`;
}
