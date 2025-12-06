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
import { PriceFeedService } from '@/price-feed/price-feed.service';
import { PrismaService } from '@/prisma/prisma.service';
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
		private readonly db: PrismaService,
		private readonly transactionService: TransactionService,
		private readonly walletService: WalletService,
		private readonly priceFeed: PriceFeedService,
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

		const result = await provider.initiateWithdrawal(providerDto);

		if (dto.method === PaymentMethod.CRYPTO) {
			this.transactionService.updateTransaction(tx.id, { hash: result });
		}

		return result;

		// return await this.db.$transaction(async (tx) => {
		// 	if (wallet.balance < booksAmount) {
		// 		throw new BadRequestException('Insufficient balance');
		// 	}

		// 	await this.transactionService.recordTransaction(
		// 		{
		// 			amount: converted,
		// 			type: TransactionType.WITHDRAWAL,
		// 			senderWalletId: wallet.id,
		// 			status: TransactionStatus.PENDING,
		// 			paymentMethod: dto.method,
		// 			reference,
		// 			metadata,
		// 		},
		// 		tx,
		// 	);

		// 	await this.walletService.debit(wallet.id, booksAmount, tx);
	}

	async handleSuccessfulPaystackWithdrawal(data: any) {}

	async handleFailedPaystackWithdrawal(data: any) {}
}
