import { Injectable, Logger } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { RedisService } from '@/redis/redis.service';
import {
	REDIS_KEY_MON_USDT,
	REDIS_KEY_USD_NGN,
} from '@/price-feed/price-cache.service';
import { DexPriceService } from '@/price-feed/providers/dex-price.provider';
import { FiatPriceConvertService } from '@/price-feed/providers/fiat-price.provider';

export enum ConversionDirection {
	NGN_TO_BOOKS = 'NGN_TO_BOOKS',
	BOOKS_TO_NGN = 'BOOKS_TO_NGN',
	MON_TO_BOOKS = 'MON_TO_BOOKS',
}

@Injectable()
export class PriceFeedService {
	private readonly logger = new Logger(PriceFeedService.name);

	constructor(
		private readonly fiatConvertService: FiatPriceConvertService,
		private readonly redis: RedisService,
		private readonly dex: DexPriceService,
	) {}

	async getConversionPreview(amount: number, direction: ConversionDirection) {
		const decimalAmount = new Decimal(amount);

		if (direction === ConversionDirection.BOOKS_TO_NGN) {
			const amountInNgn = await this.convertBooksToNgn(decimalAmount);
			return {
				from: 'BOOKS',
				to: 'NGN',
				amountIn: decimalAmount,
				amountOut: amountInNgn,
			};
		}

		if (direction === ConversionDirection.NGN_TO_BOOKS) {
			const amountInBooks = await this.convertNgnToBooks(decimalAmount);
			return {
				from: 'NGN',
				to: 'BOOKS',
				amountIn: decimalAmount,
				amountOut: amountInBooks,
			};
		}

		if (direction === ConversionDirection.MON_TO_BOOKS) {
			const result = await this.convertMonToBooks(decimalAmount);
			return {
				from: 'MON',
				to: 'BOOKS',
				amountIn: decimalAmount,
				amountOut: result.booksAmount,
				context: result.context,
			};
		}
	}

	/**
	 * Fetch the latest NGN → BOOKS rate.
	 * Reads from the Redis cache (warmed hourly by PriceCacheService) instead of
	 * hitting CurrencyFreaks live — every conversion preview used to leak a live
	 * call, which exhausted the 1000/month quota in ~a day.
	 */
	private async fetchBooksPerNgnRate(): Promise<Decimal> {
		const USDtoNGNRate = await this.getUsdNgnRate();

		const rate = new Decimal(USDtoNGNRate);
		this.logger.debug(
			`Fetched NGN_TO_BOOKS_RATE from cache: ${rate.toString()}`,
		);
		return rate;
	}

	// NOTE: might need to change this function signature to take the currency type when stripe is integrated
	async convertNgnToBooks(amountNgn: Decimal): Promise<Decimal> {
		const booksPerNgn = await this.fetchBooksPerNgnRate();
		return amountNgn.mul(booksPerNgn);
	}

	async convertBooksToNgn(amountBooks: Decimal): Promise<Decimal> {
		const booksPerNgn = await this.fetchBooksPerNgnRate();
		const ngnPerBook = new Decimal(1).div(booksPerNgn);
		return amountBooks.mul(ngnPerBook);
	}

	/**
	 * Converts a MON amount to its BOOKS equivalent.
	 * Chain: MON → USDT (on-chain DEX, cached) → NGN (fiat API, cached) → BOOKS
	 *
	 * Returns the BOOKS amount and the conversion context for transaction metadata.
	 * Falls back to a live fetch if the Redis cache is empty.
	 */
	async convertMonToBooks(monAmount: Decimal): Promise<{
		booksAmount: Decimal;
		context: {
			monAmount: string;
			monUsdtPrice: string;
			usdNgnRate: string;
			booksAmount: string;
		};
	}> {
		const monUsdtPrice = await this.getMonUsdtPrice();
		const usdNgnRate = await this.getUsdNgnRate();

		// MON → USDT → USD (1:1 since USDT ≈ USD) → NGN → BOOKS
		const monValueUsdt = monAmount.mul(new Decimal(monUsdtPrice));
		const ngnValue = monValueUsdt.mul(new Decimal(usdNgnRate));
		const booksAmount = await this.convertNgnToBooks(ngnValue);

		const context = {
			monAmount: monAmount.toString(),
			monUsdtPrice: monUsdtPrice.toString(),
			usdNgnRate: usdNgnRate.toString(),
			booksAmount: booksAmount.toString(),
		};

		this.logger.log(
			`MON→BOOKS: ${monAmount} MON × $${monUsdtPrice} × ₦${usdNgnRate}/$ = ₦${ngnValue.toFixed(2)} → ${booksAmount.toFixed(6)} BOOKS`,
		);

		return { booksAmount, context };
	}

	/** Reads MON/USDT price from Redis cache, falls back to live DEX fetch */
	private async getMonUsdtPrice(): Promise<number> {
		const cached = await this.redis.get(REDIS_KEY_MON_USDT);
		if (cached) return parseFloat(cached);

		this.logger.warn('MON/USDT cache miss — fetching live from DEX');
		return this.dex.getMonPriceInUsdt();
	}

	/** Reads USD/NGN rate from Redis cache, falls back to live API fetch */
	private async getUsdNgnRate(): Promise<number> {
		const cached = await this.redis.get(REDIS_KEY_USD_NGN);
		if (cached) return parseFloat(cached);

		this.logger.warn('USD/NGN cache miss — fetching live from fiat API');
		return this.fiatConvertService.getUSDToNGNRate();
	}
}
