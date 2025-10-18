import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PriceFeedService {
	private readonly logger = new Logger(PriceFeedService.name);

	constructor(private readonly httpService: HttpService) {}

	/**
	 * Fetch the latest NGN → BOOKS rate from an external source
	 */
	private async fetchRate(): Promise<Decimal> {
		const response = await firstValueFrom(
			this.httpService.get('https://api.example.com/rates/ngn-books'),
		);

		const rate = new Decimal(response.data.rate);
		this.logger.debug(`Fetched fresh NGN_TO_BOOKS_RATE: ${rate.toString()}`);
		return rate;
	}

	// NOTE: might need to change this function signature to take the currency type when stripe is integrated
	async convertNgnToBooks(amountNgn: number): Promise<Decimal> {
		const rate = await this.fetchRate();
		return new Decimal(amountNgn).mul(rate);
	}
	async convertBooksToNgn(amountBooks: Decimal): Promise<number> {
		const rate = await this.fetchRate();
		const reverseRate = new Decimal(1).div(rate);
		return amountBooks.mul(reverseRate).toNumber();
	}
}
