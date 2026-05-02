import {
	Injectable,
	Logger,
	OnModuleDestroy,
	OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(RedisService.name);
	private client: Redis;

	constructor(private readonly config: ConfigService) {}

	onModuleInit() {
		const redisUrl = this.config.getOrThrow<string>('REDIS_URL');

		this.client = new Redis(redisUrl);

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
		return await this.client.get(key);
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

	async expire(key: string, seconds: number): Promise<void> {
		await this.client.expire(key, seconds);
	}

	async getJSON<T>(key: string): Promise<T | null> {
		const value = await this.client.get(key);
		if (!value) return null;
		return JSON.parse(value) as T;
	}

	async setJSON(key: string, value: any, ttlSeconds?: number): Promise<void> {
		const stringValue = JSON.stringify(value);
		if (ttlSeconds) {
			await this.client.set(key, stringValue, 'EX', ttlSeconds);
		} else {
			await this.client.set(key, stringValue);
		}
	}

	getRedisClient(): Redis {
		return this.client;
	}
}
