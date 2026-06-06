import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval, SchedulerRegistry } from '@nestjs/schedule';
import { RedisService } from '@/redis/redis.service';
import { DexPriceService } from '@/price-feed/providers/dex-price.provider';
import { FiatPriceConvertService } from '@/price-feed/providers/fiat-price.provider';

export const REDIS_KEY_MON_USDT = 'price:mon:usdt';
export const REDIS_KEY_USD_NGN = 'price:usd:ngn';

/** MON/USDT comes from an on-chain DEX (no external quota) — a short TTL is fine */
const MON_USDT_TTL_SECONDS = 120;

/**
 * USD/NGN comes from CurrencyFreaks, which is capped at 1000 calls/month on our plan.
 * We refresh hourly (~744/month) so the rate stays fresh while leaving headroom for
 * restarts and the rare cold-miss live fallback. TTL is 2h so the cached value never
 * expires between refreshes — even if one hourly poll fails.
 */
const FIAT_REFRESH_INTERVAL_MS_DEFAULT = 60 * 60 * 1000; // 1 hour
const FIAT_TTL_SECONDS = 2 * 60 * 60; // 2 hours
const FIAT_REFRESH_INTERVAL_NAME = 'fiat-usd-ngn-refresh';

@Injectable()
export class PriceCacheService implements OnModuleInit {
	private readonly logger = new Logger(PriceCacheService.name);

	constructor(
		private readonly redis: RedisService,
		private readonly dex: DexPriceService,
		private readonly fiat: FiatPriceConvertService,
		private readonly config: ConfigService,
		private readonly scheduler: SchedulerRegistry,
	) {}

	/** Warm both caches immediately on startup so the first webhook/preview doesn't cold-miss */
	async onModuleInit(): Promise<void> {
		await Promise.allSettled([this.refreshMonUsdt(), this.refreshUsdNgn()]);

		// The fiat API is quota-limited, so it gets its own slow, configurable interval
		// instead of riding the 60s MON/USDT poll (which previously burned ~1440 calls/day).
		const intervalMs =
			this.config.get<number>('FIAT_REFRESH_INTERVAL_MS') ??
			FIAT_REFRESH_INTERVAL_MS_DEFAULT;
		const handle = setInterval(() => {
			void this.refreshUsdNgn();
		}, intervalMs);
		this.scheduler.addInterval(FIAT_REFRESH_INTERVAL_NAME, handle);
		this.logger.log(`USD/NGN refresh scheduled every ${intervalMs}ms`);
	}

	/** MON/USDT is on-chain (no quota) — refresh every 60 seconds */
	@Interval(60_000)
	async refreshMonUsdt(): Promise<void> {
		try {
			const price = await this.dex.getMonPriceInUsdt();
			await this.redis.set(
				REDIS_KEY_MON_USDT,
				price.toString(),
				MON_USDT_TTL_SECONDS,
			);
			this.logger.log(`Cached MON/USDT price: ${price}`);
		} catch (err) {
			this.logger.warn(
				`Failed to refresh MON/USDT price: ${err?.message ?? err}`,
			);
		}
	}

	/** USD/NGN is quota-limited (CurrencyFreaks) — refreshed on the slow interval above */
	async refreshUsdNgn(): Promise<void> {
		try {
			const rate = await this.fiat.getUSDToNGNRate();
			await this.redis.set(
				REDIS_KEY_USD_NGN,
				rate.toString(),
				FIAT_TTL_SECONDS,
			);
			this.logger.log(`Cached USD/NGN rate: ${rate}`);
		} catch (err) {
			this.logger.warn(
				`Failed to refresh USD/NGN rate: ${err?.message ?? err}`,
			);
		}
	}
}
