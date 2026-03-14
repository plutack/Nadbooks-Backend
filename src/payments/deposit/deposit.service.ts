import { BadRequestException, Injectable } from '@nestjs/common';
import {
	PaymentMethod,
	TransactionStatus,
	TransactionType,
} from 'generated/prisma';
import { generateRef } from '@/helpers/functions';
import {
	CryptoDepositDto,
	DepositDto,
	PaystackDepositDto,
	VerifyDepositInput,
} from '@/payments/deposit/dtos/deposit.dto';
import {
	CryptoDepositProviderInterface,
	PaymentStatus,
	PaystackDepositProviderInterface,
} from '@/payments/deposit/interfaces/provider.interface';
import { CryptoDepositProvider } from '@/payments/deposit/providers/crypto-deposit.provider';
import { PaystackDepositProvider } from '@/payments/deposit/providers/paystack-deposit.provider';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtPayloadType } from '@/types/jwt.type';
import { WalletService } from '@/wallet/wallet.service';
import { TransactionService } from '../shared/transaction.service';
import { ExternalPaymentMethod } from '../withdrawal/dtos/withdrawal.dto';

type DepositProviderMap = {
	[PaymentMethod.PAYSTACK]: PaystackDepositProviderInterface;
	[PaymentMethod.CRYPTO]: CryptoDepositProviderInterface;
};

@Injectable()
export class DepositService {
	providers: DepositProviderMap;

	constructor(
		private readonly db: PrismaService,
		private readonly walletService: WalletService,
		private readonly transactionService: TransactionService,

		paystackProvider: PaystackDepositProvider,
		cryptoProvider: CryptoDepositProvider,
	) {
		this.providers = {
			[PaymentMethod.PAYSTACK]: paystackProvider,
			[PaymentMethod.CRYPTO]: cryptoProvider,
		};
	}

	/** Initiate a deposit */
	async initiateDeposit(user: JwtPayloadType, dto: DepositDto) {
		const provider = this.providers[dto.method];
		if (!provider)
			throw new BadRequestException(
				`Unsupported deposit method: ${dto.method}`,
			);

		const reference = generateRef(TransactionType.DEPOSIT, user.sub);

		const wallet = await this.walletService.getWallet(user.sub);

		const tx = await this.transactionService.recordTransaction({
			reference,
			amount: dto.amount,
			type: TransactionType.DEPOSIT,
			paymentMethod: dto.method,
			status: TransactionStatus.PENDING,
			recipientWalletId: wallet.id,
			hash: dto.method === PaymentMethod.CRYPTO ? dto.hash : undefined,
		});

		console.log('tx saved:', tx);
		let providerDto: any;
		if (dto.method === PaymentMethod.PAYSTACK) {
			providerDto = {
				amount: dto.amount,
				email: user.email,
				reference,
				metadata: { userId: user.sub },
			} as PaystackDepositDto;
		} else {
			providerDto = {
				amount: dto.amount,
				hash: dto.hash,
				reference,
				address: user.sub,
			} as CryptoDepositDto;
		}

		return provider.initiateDeposit(providerDto);
	}

	// Verify deposit
	async verifyDeposit(method: PaymentMethod, input: VerifyDepositInput) {
		const provider = this.providers[method];
		if (!provider)
			throw new BadRequestException(`Unsupported method: ${method}`);

		const result = await provider.verifyPayment(input);

		// Update wallet & transaction if successful
		const isSuccess =
			(method === PaymentMethod.PAYSTACK && (result as any).success) ||
			(method === PaymentMethod.CRYPTO &&
				(result as any).status === PaymentStatus.SUCCESS);

		if (isSuccess) {
			const tx = await this.db.transaction.findUnique({
				where: { reference: input.reference || input.hash },
			});
			if (!tx) throw new BadRequestException('Transaction not found');

			if (tx.status === TransactionStatus.PENDING) {
				await this.walletService.credit(tx.recipientWalletId!, tx.amount);
				await this.db.transaction.update({
					where: { id: tx.id },
					data: { status: TransactionStatus.SUCCESS },
				});
			}
		}

		return result;
	}

	async handleSuccessfulPaystackDeposit(data: any) {
		console.log(data);
		const txRecord = await this.transactionService.getTransactionByReference(
			data.reference,
		);
		if (!txRecord) return;
		if (txRecord.status !== TransactionStatus.PENDING) return;

		await this.db.$transaction(async (tx) => {
			// Credit wallet
			await this.walletService.credit(
				txRecord.recipientWalletId!,
				txRecord.amount,
				tx,
			);

			await this.transactionService.updateTransaction(
				txRecord.id,
				{ status: TransactionStatus.SUCCESS },
				tx,
			);
		});

		console.log(
			`Deposit successful: ${txRecord.reference}, credited ${txRecord.amount}`,
		);
	}

	async handleFailedPaystackDeposit(data: any) {
		const tx = await this.transactionService.getTransactionByReference(
			data.reference,
		);
		if (!tx) return;
		if (tx.status !== TransactionStatus.PENDING) return;

		await this.transactionService.updateTransaction(tx.id, {
			status: TransactionStatus.FAILED,
		});
	}
}
