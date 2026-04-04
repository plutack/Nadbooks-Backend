import { Logger } from '@nestjs/common';

const SENSITIVE_FIELDS = [
	'password',
	'passwordHash',
	'currentPassword',
	'newPassword',
	'token',
	'refreshToken',
	'accessToken',
	'authorization',
];

export function maskSensitive(obj: unknown, depth: number = 0): unknown {
	if (depth > 10) return obj;
	if (obj === null || obj === undefined) return obj;
	if (typeof obj !== 'object') return obj;
	if (obj instanceof Date) return obj;
	if (Buffer.isBuffer(obj)) return '[Buffer]';

	if (Array.isArray(obj)) {
		return obj.map((item) => maskSensitive(item, depth + 1));
	}

	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
		const lowerKey = key.toLowerCase();
		const isSensitive = SENSITIVE_FIELDS.some((field) =>
			lowerKey.includes(field.toLowerCase()),
		);

		if (isSensitive) {
			result[key] = '[REDACTED]';
		} else {
			result[key] = maskSensitive(value, depth + 1);
		}
	}
	return result;
}

export const logger = new Logger('HTTP');

export interface RequestContext {
	requestId: string;
	startTime: number;
	method: string;
	url: string;
	query: unknown;
	headers: unknown;
	body: unknown;
}

export interface ErrorContext {
	status: number;
	message: string;
	errors?: string[];
	stack?: string;
}
