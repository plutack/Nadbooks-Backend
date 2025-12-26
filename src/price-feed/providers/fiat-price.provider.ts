import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class FiatPriceConvertService {
	private readonly secret: string;
	private readonly baseUrl = 'https://api.currencyfreaks.com/v2.0';
	constructor(
		private readonly http: HttpService,
		config: ConfigService,
	) {
		this.secret = config.getOrThrow('CURRENCYFREAK_SECRET');
	}

	async getUSDToNGNRate(): Promise<number> {
		const { data } = await lastValueFrom(
			this.http.get<{ rates: { NGN: number } }>(
				`${this.baseUrl}/rates/latest`,
				{
					params: {
						apikey: this.secret,
						base: 'USD',
						symbols: 'NGN',
					},
				},
			),
		);

		return data.rates.NGN;
	}
}
