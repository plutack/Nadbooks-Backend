import { Injectable } from '@nestjs/common';
import { TransactionService } from '@/payments/shared/transaction.service';
import {
	CryptoWithdrawalInput,
	CryptoWithdrawalProviderInterface,
} from '@/payments/withdrawal/interfaces/provider.interface';

@Injectable()
export class CryptoWithdrawalProvider
	implements CryptoWithdrawalProviderInterface
{
	constructor(private readonly transactionService: TransactionService) {}
	async initiateWithdrawal(input: CryptoWithdrawalInput): Promise<string> {
		const tx = await this.transactionService.getTransactionByReference(
			input.reference,
		);
		await this.transactionService.updateTransaction(tx.id, {
			metadata: {
				cryptoWalletAddress: input.address,
				booksAmount: input.amount,
				hash: input.hash,
			},
		});

		return '';
	}
}
