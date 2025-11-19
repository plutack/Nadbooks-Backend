import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from 'generated/prisma';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class WalletService {
	constructor(
		// private readonly logger = new Logger(WalletService.name),
		private db: PrismaService,
	) {}

	private getClient(tx?: Prisma.TransactionClient) {
		// fallback to main prisma client if no tx is passed
		return tx ?? this.db;
	}

	async createWallet(userId: string) {
		return await this.db.wallet.create({
			data: {
				userId,
			},
		});
	}

	async getWallet(userId: string, tx?: Prisma.TransactionClient) {
		const client = this.getClient(tx);
		const wallet = await client.wallet.findUnique({ where: { userId } });
		if (!wallet)
			throw new BadRequestException(`Wallet not found for user ${userId}`);
		return wallet;
	}

	async getWalletById(walletId: string, tx?: Prisma.TransactionClient) {
		const client = this.getClient(tx);
		const wallet = await client.wallet.findUnique({
			where: { id: walletId },
		});

		if (!wallet) {
			throw new NotFoundException('Wallet not found');
		}

		return wallet;
	}

	async credit(
		walletId: string,
		amount: Decimal,
		tx?: Prisma.TransactionClient,
	) {
		if (amount.lessThanOrEqualTo(0)) {
			throw new BadRequestException('Amount must be greater than zero');
		}

		const client = this.getClient(tx);

		return await client.wallet.update({
			where: { id: walletId },
			data: { balance: { increment: amount } },
		});
	}

	async debit(
		walletId: string,
		amount: Decimal,
		tx?: Prisma.TransactionClient,
	) {
		if (amount.lessThanOrEqualTo(0)) {
			throw new BadRequestException('Amount must be greater than zero');
		}

		const client = this.getClient(tx);
		const wallet = await this.getWalletById(walletId, tx);

		if (wallet.balance < amount) {
			throw new BadRequestException('Insufficient balance');
		}

		return await client.wallet.update({
			where: { id: walletId },
			data: { balance: { decrement: amount } },
		});
	}
}
