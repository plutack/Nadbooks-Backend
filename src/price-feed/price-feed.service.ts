import { Injectable, Logger } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { FiatPriceConvertService } from './providers/fiat-price.provider';

export enum ConversionDirection {
	NGN_TO_BOOKS = 'NGN_TO_BOOKS',
	BOOKS_TO_NGN = 'BOOKS_TO_NGN',
}

@Injectable()
export class PriceFeedService {
	private readonly logger = new Logger(PriceFeedService.name);

	constructor(private readonly fiatConvertService: FiatPriceConvertService) {}

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
	}

	/**
	 * Fetch the latest NGN → BOOKS rate from an external source
	 */
	private async fetchBooksPerNgnRate(): Promise<Decimal> {
		const USDtoNGNRate = await this.fiatConvertService.getUSDToNGNRate();

		const rate = new Decimal(USDtoNGNRate);
		this.logger.debug(`Fetched fresh NGN_TO_BOOKS_RATE: ${rate.toString()}`);
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
}
