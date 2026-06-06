import {
	Controller,
	Get,
	Logger,
	ServiceUnavailableException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';

/**
 * Liveness/readiness probe for load balancers and deploys. Reports the status of
 * the critical dependencies (database + Redis) and returns 503 if either is down.
 */
@Controller('health')
@SkipThrottle()
export class HealthController {
	private readonly logger = new Logger(HealthController.name);

	constructor(
		private readonly db: PrismaService,
		private readonly redis: RedisService,
	) {}

	@Get()
	async check() {
		const [db, redis] = await Promise.all([this.checkDb(), this.checkRedis()]);

		const body = {
			status: db && redis ? 'ok' : 'degraded',
			db: db ? 'up' : 'down',
			redis: redis ? 'up' : 'down',
		};

		if (!db || !redis) {
			throw new ServiceUnavailableException(body);
		}
		return body;
	}

	private async checkDb(): Promise<boolean> {
		try {
			await this.db.$queryRaw`SELECT 1`;
			return true;
		} catch (err) {
			this.logger.warn(`Database health check failed: ${err}`);
			return false;
		}
	}

	private async checkRedis(): Promise<boolean> {
		try {
			return (await this.redis.getRedisClient().ping()) === 'PONG';
		} catch (err) {
			this.logger.warn(`Redis health check failed: ${err}`);
			return false;
		}
	}
}
