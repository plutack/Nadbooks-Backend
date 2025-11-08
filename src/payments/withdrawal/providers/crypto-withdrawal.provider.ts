import { Injectable } from '@nestjs/common';
import { CryptoWithdrawalProviderInterface } from '@/payments/withdrawal/interfaces/withdrawal-provider.interface';

//TODO: properly implement this
@Injectable()
export class CryptoWithdrawalProvider
	implements CryptoWithdrawalProviderInterface
{
	async initiateWithdrawal(input: {
		amount: number;
		address: string;
	}): Promise<string> {
		return await new Promise((resolve) => {
			setTimeout(() => {
				resolve('****');
			}, 500);
		});
	}
}
