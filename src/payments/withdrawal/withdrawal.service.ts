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
	private providers: WithdrawalProviderMap;

	constructor(
		private readonly db: PrismaService,
		private readonly transactionService: TransactionService,
		private readonly walletService: WalletService,
		private readonly priceFeed: PriceFeedService,
		private readonly paystackProvider: PaystackWithdrawalProvider,
		private readonly cryptoProvider: CryptoWithdrawalProvider,
	) {
		this.providers = {
			[PaymentMethod.CRYPTO]: this.cryptoProvider,
			[PaymentMethod.PAYSTACK]: this.paystackProvider,
		};
	}

	async initiateWithdrawal(user: JwtPayloadType, dto: WithdrawDto) {
		const provider = this.providers[dto.method];
		if (!provider) {
			throw new BadRequestException(
				`Unsupported withdrawal method: ${dto.method}`,
			);
		}

		return await this.db.$transaction(async (tx) => {
			const wallet = await this.walletService.getWallet(user.sub, tx);
			const booksAmount = new Decimal(dto.amount);

			if (wallet.balance < booksAmount) {
				throw new BadRequestException('Insufficient balance');
			}

			const reference = generateRef(TransactionType.WITHDRAWAL, user.sub);

			const converted =
				dto.method === PaymentMethod.CRYPTO
					? await this.priceFeed.convertBooksToMon(booksAmount)
					: await this.priceFeed.convertBooksToNgn(booksAmount);

			let metadata: any = null;

			if (dto.method === PaymentMethod.CRYPTO) {
				metadata = {
					cryptoWalletAddress: dto.walletAddress,
					booksAmount: dto.amount,
					hash: dto.hash,
				};
			}

			await this.transactionService.recordTransaction(
				{
					amount: converted,
					type: TransactionType.WITHDRAWAL,
					senderWalletId: wallet.id,
					status: TransactionStatus.PENDING,
					paymentMethod: dto.method,
					reference,
					metadata,
				},
				tx,
			);

			await this.walletService.debit(wallet.id, booksAmount, tx);

			let providerDto: any;

			if (dto.method === PaymentMethod.PAYSTACK) {
				providerDto = {
					amount: converted.toNumber(),
					reason: `Withdrawal of ${converted.toNumber()} BOOKS`,
					name: dto.accountName,
					accountNumber: dto.accountNumber,
					bankCode: dto.bankCode,
				};
			}

			if (dto.method === PaymentMethod.CRYPTO) {
				providerDto = {
					amount: converted.toNumber(),
					address: dto.walletAddress,
					hash: dto.hash,
				};
			}

			return provider.initiateWithdrawal(providerDto);
		});
	}
}
