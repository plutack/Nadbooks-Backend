import { ConfigService } from '@nestjs/config';
import { TransactionType } from 'generated/prisma';

export function generateRef(type: TransactionType, userId: string): string {
	const prefix = (() => {
		switch (type) {
			case 'DEPOSIT':
				return 'DEP';
			case 'WITHDRAWAL':
				return 'WTH';
			case 'ORDER':
				return 'ORD';
			default:
				throw new Error('invald transaction type');
		}
	})();

	const timestamp = new Date()
		.toISOString()
		.replace(/[-:.TZ]/g, '')
		.slice(0, 14);
	const unique = Math.random().toString(36).substring(2, 8).toUpperCase();
	const shortUser = userId.slice(-4).toUpperCase();

	return `${prefix}-${timestamp}-${shortUser}-${unique}`;
}

export function isDev(config: ConfigService): boolean {
	const nodeEnv = config.get<string>('NODE_ENV');
	return nodeEnv === 'development';
}
