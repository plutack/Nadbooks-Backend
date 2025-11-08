import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { WalletService } from '@/wallet/wallet.service';
import { PriceFeedService } from '@/price-feed/price-feed.service';
import { DepositProviderInterface } from './interfaces/deposit-provider.interface';
import { PaystackDepositProvider } from './providers/paystack-deposit.provider';
// import { CryptoDepositProvider } from './providers/crypto-deposit.provider';

import {
	TransactionType,
	TransactionStatus,
	PaymentMethod,
} from 'generated/prisma';

import { generateRef } from '@/helpers/functions';
import { JwtPayloadType } from '@/types/jwt.type';
import { DepositDto } from '@/payments/deposit/dtos/deposit.dto';

// export type ExternalDepositMethod = Exclude<PaymentMethod, 'WALLET'>;

type DepositProviderMap = {
	// [PaymentMethod.CRYPTO]: DepositProviderInterface;
	[PaymentMethod.PAYSTACK]: DepositProviderInterface;
};
@Injectable()
export class DepositService {
	// private providers: Record<ExternalDepositMethod, DepositProviderInterface>;
	private providers: DepositProviderMap;

	constructor(
		private readonly db: PrismaService,
		private readonly walletService: WalletService,
		private readonly priceFeed: PriceFeedService,

		// register actual providers
		private readonly paystackProvider: PaystackDepositProvider,
		// private readonly cryptoProvider: CryptoDepositProvider,
	) {
		this.providers = {
			[PaymentMethod.PAYSTACK]: this.paystackProvider,
			// [PaymentMethod.CRYPTO]: this.cryptoProvider,
		};
	}

	// private getProvider(method: ExternalDepositMethod): DepositProviderInterface {
	// 	const provider = this.providers[method];
	// 	if (!provider)
	// 		throw new BadRequestException(`Unsupported deposit method: ${method}`);
	// 	return provider;
	// }

	async initiateDeposit(user: JwtPayloadType, dto: DepositDto) {
		const provider = this.providers[dto.paymentMethod];
		const reference = generateRef(TransactionType.DEPOSIT, user.sub);

		await this.db.transaction.create({
			data: {
				reference,
				amount: dto.amount,
				type: TransactionType.DEPOSIT,
				paymentMethod: dto.paymentMethod,
				status: TransactionStatus.PENDING,
				recipientWallet: {
					connect: { userId: user.sub },
				},
			},
		});

		const result = await provider.initiateDeposit({
			amount: dto.amount,
			email: user.email,
			reference,
			metadata: { userId: user.sub },
		});

		return {
			paymentUrl: result.paymentUrl,
		};
	}

	async verifyDeposit(reference: string) {
		const tx = await this.db.transaction.findUnique({ where: { reference } });
		if (!tx) throw new BadRequestException('Transaction not found');

		// const provider = this.getProvider(
		// 	tx.paymentMethod as ExternalDepositMethod,
		// );

		const provider = this.providers[tx.paymentMethod];

		const result = await provider.verifyPayment(reference);

		if (!result.success) return { success: false };

		if (tx.status === TransactionStatus.PENDING) {
			await this.walletService.credit(tx.recipientWalletId!, tx.amount);
			await this.db.transaction.update({
				where: { id: tx.id },
				data: { status: TransactionStatus.SUCCESS },
			});
		}

		return { success: true };
	}

	async handleWebhook(payload: any, headers: any, type: 'paystack') {
		// const provider = this.getProvider(type);
		const provider = this.providers[type];
		if (!provider) {
			throw new BadRequestException(`Unsupported payment method: ${type}`);
		}
		const event = await provider.handleWebhook(payload, headers);

		const reference = event.data?.reference;
		if (!reference) return { received: true };

		const tx = await this.db.transaction.findUnique({ where: { reference } });
		if (!tx) return { received: true };

		if (event.event === 'charge.success') {
			if (tx.status === TransactionStatus.PENDING) {
				await this.walletService.credit(tx.recipientWalletId!, tx.amount);
			}
			await this.db.transaction.update({
				where: { id: tx.id },
				data: { status: TransactionStatus.SUCCESS },
			});
		}

		return { received: true };
	}
}
