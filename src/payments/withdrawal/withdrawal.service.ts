import { BadRequestException, Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import {
	PaymentMethod,
	TransactionStatus,
	TransactionType,
} from 'generated/prisma';
import { generateRef } from '@/helpers/functions';
import { TransactionService } from '@/payments/shared/transaction.service';
import { WithdrawDto } from '@/payments/withdrawal/dtos/withdrawal.dto';
import {
	CryptoWithdrawalInput,
	CryptoWithdrawalProviderInterface,
	PaystackWithdrawalInput,
	PaystackWithdrawalProviderInterface,
} from '@/payments/withdrawal/interfaces/provider.interface';
import { CryptoWithdrawalProvider } from '@/payments/withdrawal/providers/crypto-withdrawal.provider';
import { PaystackWithdrawalProvider } from '@/payments/withdrawal/providers/paystack-withdrawal.provider';
import { JwtPayloadType } from '@/types/jwt.type';
import { WalletService } from '@/wallet/wallet.service';

export type ExternalPaymentMethod = Exclude<PaymentMethod, 'WALLET'>;

type WithdrawalProviderMap = {
	[PaymentMethod.CRYPTO]: CryptoWithdrawalProviderInterface;
	[PaymentMethod.PAYSTACK]: PaystackWithdrawalProviderInterface;
};

@Injectable()
export class WithdrawalService {
	providers: WithdrawalProviderMap;

	constructor(
		private readonly transactionService: TransactionService,
		private readonly walletService: WalletService,
		paystackProvider: PaystackWithdrawalProvider,
		cryptoProvider: CryptoWithdrawalProvider,
	) {
		this.providers = {
			[PaymentMethod.CRYPTO]: cryptoProvider,
			[PaymentMethod.PAYSTACK]: paystackProvider,
		};
	}

	async initiateWithdrawal(user: JwtPayloadType, dto: WithdrawDto) {
		const provider = this.providers[dto.method];
		if (!provider) {
			throw new BadRequestException(
				`Unsupported withdrawal method: ${dto.method}`,
			);
		}

		const reference = generateRef(TransactionType.WITHDRAWAL, user.sub);
		const wallet = await this.walletService.getWallet(user.sub);

		const booksAmount = new Decimal(dto.amount);

		if (dto.method === PaymentMethod.CRYPTO) {
		}

		const tx = await this.transactionService.recordTransaction({
			amount: booksAmount,
			type: TransactionType.WITHDRAWAL,
			senderWalletId: wallet.id,
			status: TransactionStatus.PENDING,
			paymentMethod: dto.method,
			reference,
			recipientWalletId: wallet.id,
		});
		let providerDto: any;

		if (dto.method === PaymentMethod.PAYSTACK) {
			providerDto = {
				amount: dto.amount,
				reason: `Withdrawal of ${dto.amount} BOOKS`,
				name: dto.accountName!,
				accountNumber: dto.accountNumber!,
				bankCode: dto.bankCode!,
			} satisfies PaystackWithdrawalInput;
		}

		if (dto.method === PaymentMethod.CRYPTO) {
			providerDto = {
				amount: dto.amount,
				recieverAddress: dto.walletAddress!,
				reference,
			} satisfies CryptoWithdrawalInput;
		}

		try {
			const result = await provider.initiateWithdrawal(providerDto);

			if (dto.method === PaymentMethod.CRYPTO) {
				await this.transactionService.updateTransaction(tx.id, {
					hash: result,
					status: TransactionStatus.SUCCESS,
				});
			}

			return result;
		} catch (error) {
			await this.transactionService.updateTransaction(tx.id, {
				status: TransactionStatus.FAILED,
				metadata: { error: error.message },
			});
			throw error;
		}
	}

	async handleSuccessfulPaystackWithdrawal(data: any) {}

	async handleFailedPaystackWithdrawal(data: any) {}
}
