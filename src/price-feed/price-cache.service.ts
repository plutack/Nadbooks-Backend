import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { RedisService } from '@/redis/redis.service';
import { DexPriceService } from '@/price-feed/providers/dex-price.provider';
import { FiatPriceConvertService } from '@/price-feed/providers/fiat-price.provider';

export const REDIS_KEY_MON_USDT = 'price:mon:usdt';
export const REDIS_KEY_USD_NGN = 'price:usd:ngn';

/** TTL in seconds — 120s safety buffer if one poll cycle fails */
const PRICE_TTL_SECONDS = 120;

@Injectable()
export class PriceCacheService implements OnModuleInit {
	private readonly logger = new Logger(PriceCacheService.name);

	constructor(
		private readonly redis: RedisService,
		private readonly dex: DexPriceService,
		private readonly fiat: FiatPriceConvertService,
	) {}

	/** Warm the cache immediately on startup so the first webhook doesn't get a cold miss */
	async onModuleInit() {
		await this.refreshPrices();
	}

	/** Refresh both prices every 60 seconds */
	@Interval(60_000)
	async refreshPrices(): Promise<void> {
		await Promise.allSettled([this.refreshMonUsdt(), this.refreshUsdNgn()]);
	}

	private async refreshMonUsdt(): Promise<void> {
		try {
			const price = await this.dex.getMonPriceInUsdt();
			await this.redis.set(
				REDIS_KEY_MON_USDT,
				price.toString(),
				PRICE_TTL_SECONDS,
			);
			this.logger.log(`Cached MON/USDT price: ${price}`);
		} catch (err) {
			this.logger.warn(
				`Failed to refresh MON/USDT price: ${err?.message ?? err}`,
			);
		}
	}

	private async refreshUsdNgn(): Promise<void> {
		try {
			const rate = await this.fiat.getUSDToNGNRate();
			await this.redis.set(
				REDIS_KEY_USD_NGN,
				rate.toString(),
				PRICE_TTL_SECONDS,
			);
			this.logger.log(`Cached USD/NGN rate: ${rate}`);
		} catch (err) {
			this.logger.warn(
				`Failed to refresh USD/NGN rate: ${err?.message ?? err}`,
			);
		}
	}
}
