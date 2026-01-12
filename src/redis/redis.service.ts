import {
	Injectable,
	OnModuleDestroy,
	OnModuleInit,
	Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(RedisService.name);
	private client: Redis;

	constructor(private readonly config: ConfigService) {}

	onModuleInit() {
		const host = this.config.getOrThrow<string>('REDIS_HOST');
		const port = this.config.getOrThrow<number>('REDIS_PORT');

		this.client = new Redis({
			host,
			port,
		});

		this.client.on('connect', () => {
			this.logger.log('Connected to Redis');
		});

		this.client.on('error', (err) => {
			this.logger.error('Redis connection failed', err);
		});
	}

	async onModuleDestroy() {
		await this.client.quit();
		this.logger.log('Connection terminated');
	}

	async get(key: string): Promise<string | null> {
		return this.client.get(key);
	}

	async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
		if (ttlSeconds) {
			await this.client.set(key, value, 'EX', ttlSeconds);
		} else {
			await this.client.set(key, value);
		}
	}

	async del(key: string): Promise<void> {
		await this.client.del(key);
	}
}
