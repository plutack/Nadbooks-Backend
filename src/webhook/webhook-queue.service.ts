import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { RedisService } from '@/redis/redis.service';
import { WebhookService } from '@/webhook/webhook.service';

const WEBHOOK_QUEUE_KEY = 'webhook:queue';
const WEBHOOK_DELAY_MS = 3000;

type QueuedWebhookJob = {
	id: string;
	type: 'paystack' | 'crypto';
	payload: any;
	timestamp: number;
};

@Injectable()
export class WebhookQueueService {
	private readonly logger = new Logger(WebhookQueueService.name);
	private isProcessing = false;

	constructor(
		private readonly redisService: RedisService,
		private readonly webhookService: WebhookService,
	) {}

	async addToQueue(type: 'paystack' | 'crypto', payload: any): Promise<string> {
		const jobId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		const job: QueuedWebhookJob = {
			id: jobId,
			type,
			payload,
			timestamp: Date.now(),
		};

		const score = Date.now() + WEBHOOK_DELAY_MS;
		await this.redisService
			.getRedisClient()
			.zadd(WEBHOOK_QUEUE_KEY, score, JSON.stringify(job));

		this.logger.log(
			`Added ${type} webhook job ${jobId} to queue with ${WEBHOOK_DELAY_MS}ms delay`,
		);
		return jobId;
	}

	@Interval(1000)
	async processQueue(): Promise<void> {
		if (this.isProcessing) return;
		this.isProcessing = true;

		try {
			const now = Date.now();
			const jobs = await this.redisService
				.getRedisClient()
				.zrangebyscore(WEBHOOK_QUEUE_KEY, 0, now);

			if (jobs.length === 0) return;

			this.logger.log(`Processing ${jobs.length} webhook job(s)`);

			for (const jobStr of jobs) {
				const job: QueuedWebhookJob = JSON.parse(jobStr);

				try {
					await this.processJob(job);
					await this.redisService
						.getRedisClient()
						.zrem(WEBHOOK_QUEUE_KEY, jobStr);
					this.logger.log(`Completed webhook job ${job.id}`);
				} catch (e) {
					this.logger.error(
						`Failed to process webhook job ${job.id}: ${e.message}`,
					);
					await this.redisService
						.getRedisClient()
						.zrem(WEBHOOK_QUEUE_KEY, jobStr);
				}
			}
		} finally {
			this.isProcessing = false;
		}
	}

	private async processJob(job: QueuedWebhookJob) {
		if (job.type === 'paystack') {
			await this.webhookService.processQueuedPaystackWebhook(job.payload);
		} else {
			await this.webhookService.processQueuedCryptoWebhook(job.payload);
		}
	}
}
