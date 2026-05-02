import { BadRequestException, Injectable } from '@nestjs/common';
import * as argon from 'argon2';
import { Decimal } from '@prisma/client/runtime/library';
import {
	PaymentMethod,
	TransactionStatus,
	TransactionType,
} from 'generated/prisma';
import { generateRef } from '@/helpers/functions';
import { RedisService } from '@/redis/redis.service';
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
import { PrismaService } from '@/prisma/prisma.service';

export type ExternalPaymentMethod = Exclude<PaymentMethod, 'WALLET'>;

type WithdrawalProviderMap = {
	[PaymentMethod.CRYPTO]: CryptoWithdrawalProviderInterface;
	[PaymentMethod.PAYSTACK]: PaystackWithdrawalProviderInterface;
};

const PIN_FAIL_KEY = 'withdrawal:pin:fail:';
const PIN_FAIL_LIMIT = 3;
const PIN_FAIL_TTL = 900; // 15 minutes

@Injectable()
export class WithdrawalService {
	providers: WithdrawalProviderMap;

	constructor(
		private readonly db: PrismaService,
		private readonly transactionService: TransactionService,
		private readonly walletService: WalletService,
		private readonly redis: RedisService,
		private readonly cryptoProvider: CryptoWithdrawalProvider,
		private readonly paystackProvider: PaystackWithdrawalProvider,
	) {
		this.providers = {
			[PaymentMethod.CRYPTO]: this.cryptoProvider,
			[PaymentMethod.PAYSTACK]: this.paystackProvider,
		};
	}

	async resolveBankAccount(dto: { accountNumber: string; bankCode: string }) {
		const accountName = await this.paystackProvider.resolveBankAccount({
			accountNumber: dto.accountNumber,
			bankCode: dto.bankCode,
		});
		return { accountName };
	}

	private readonly BANKS_CACHE_KEY = 'paystack:banks';
	private readonly BANKS_CACHE_TTL = 86400; // 24 hours

	async getBanks() {
		const cached = await this.redis.get(this.BANKS_CACHE_KEY);
		if (cached) {
			return { banks: JSON.parse(cached) };
		}

		const banks = await this.paystackProvider.getBanks();
		await this.redis.set(
			this.BANKS_CACHE_KEY,
			JSON.stringify(banks),
			this.BANKS_CACHE_TTL,
		);
		return { banks };
	}

	private async verifyUserPin(userId: string, pin: string): Promise<void> {
		const failKey = `${PIN_FAIL_KEY}${userId}`;

		const failCount = await this.redis.get(failKey);
		if (failCount && parseInt(failCount) >= PIN_FAIL_LIMIT) {
			throw new BadRequestException(
				'Too many failed attempts. Try again in 15 minutes.',
			);
		}

		const user = await this.db.user.findFirst({
			where: { id: userId },
			select: { pinHash: true },
		});

		if (!user?.pinHash) {
			throw new BadRequestException(
				'Transaction PIN not set. Use POST /pin/set to create one.',
			);
		}

		const isValid = await argon.verify(user.pinHash, pin);
		if (!isValid) {
			const currentFails = (await this.redis.get(failKey)) || '0';
			await this.redis.getRedisClient().incr(failKey);
			await this.redis.expire(failKey, PIN_FAIL_TTL);

			const remaining = PIN_FAIL_LIMIT - parseInt(currentFails) - 1;
			if (remaining <= 0) {
				throw new BadRequestException(
					'Too many failed attempts. Try again in 15 minutes.',
				);
			}
			throw new BadRequestException(
				`Invalid transaction PIN. ${remaining} attempts remaining.`,
			);
		}
	}

	async initiateWithdrawal(user: JwtPayloadType, dto: WithdrawDto) {
		await this.verifyUserPin(user.sub, dto.pin);

		const provider = this.providers[dto.method];
		if (!provider) {
			throw new BadRequestException(
				`Unsupported withdrawal method: ${dto.method}`,
			);
		}

		const reference = generateRef(TransactionType.WITHDRAWAL, user.sub);
		const wallet = await this.walletService.getWallet(user.sub);

		const booksAmount = new Decimal(dto.amount);

		if (booksAmount.greaterThan(wallet.balance)) {
			throw new BadRequestException('Insufficient balance');
		}

		const metadata =
			dto.method === PaymentMethod.CRYPTO && dto.walletAddress
				? { recipientAddress: dto.walletAddress }
				: undefined;

		const tx = await this.transactionService.recordTransaction({
			amount: booksAmount,
			type: TransactionType.WITHDRAWAL,
			senderWalletId: wallet.id,
			status: TransactionStatus.PENDING,
			paymentMethod: dto.method,
			reference,
			recipientWalletId: wallet.id,
			metadata,
		});
		let providerDto: any;

		if (dto.method === PaymentMethod.PAYSTACK) {
			providerDto = {
				amount: dto.amount,
				reason: `Withdrawal of ${dto.amount} BOOKS`,
				name: dto.accountName!,
				accountNumber: dto.accountNumber!,
				bankCode: dto.bankCode!,
			} as PaystackWithdrawalInput;
		}

		if (dto.method === PaymentMethod.CRYPTO) {
			providerDto = {
				amount: dto.amount,
				recieverAddress: dto.walletAddress!,
				reference,
			} as CryptoWithdrawalInput;
		}

		try {
			const result = await provider.initiateWithdrawal(providerDto);

			if (dto.method === PaymentMethod.CRYPTO) {
				await this.walletService.debit(wallet.id, booksAmount);
				await this.transactionService.updateTransaction(tx.id, {
					hash: result,
					status: TransactionStatus.SUCCESS,
				});
			} else {
				await this.transactionService.updateTransaction(tx.id, {
					status: TransactionStatus.PENDING,
				});
			}

			return { hash: result };
		} catch (error) {
			await this.transactionService.updateTransaction(tx.id, {
				status: TransactionStatus.FAILED,
				metadata: { error: error.message },
			});
			throw error;
		}
	}

	async handleSuccessfulPaystackWithdrawal(data: any) {
		const txRecord = await this.db.transaction.findFirst({
			where: {
				reference: data.reference,
				type: TransactionType.WITHDRAWAL,
			},
		});
		if (!txRecord) return;
		if (txRecord.status !== TransactionStatus.PENDING) return;

		await this.db.$transaction(async (tx) => {
			await this.walletService.debit(
				txRecord.senderWalletId!,
				txRecord.amount,
				tx,
			);
			await this.transactionService.updateTransaction(
				txRecord.id,
				{ status: TransactionStatus.SUCCESS },
				tx,
			);
		});

		console.log('Paystack withdrawal successful: ' + txRecord.reference);
	}

	async handleFailedPaystackWithdrawal(data: any) {
		const txRecord = await this.db.transaction.findFirst({
			where: {
				reference: data.reference,
				type: TransactionType.WITHDRAWAL,
			},
		});
		if (!txRecord) return;
		if (txRecord.status !== TransactionStatus.PENDING) return;

		await this.db.$transaction(async (tx) => {
			await this.transactionService.updateTransaction(
				txRecord.id,
				{ status: TransactionStatus.FAILED },
				tx,
			);

			await this.walletService.credit(
				txRecord.senderWalletId!,
				txRecord.amount,
				tx,
			);
		});
	}
}
