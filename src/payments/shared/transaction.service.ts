import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class TransactionService {
	constructor(private readonly db: PrismaService) {}

	private getClient(tx?: Prisma.TransactionClient) {
		return tx ?? this.db;
	}

	async recordTransaction(
		data: Prisma.TransactionUncheckedCreateInput,
		tx?: Prisma.TransactionClient,
	) {
		const client = this.getClient(tx);
		return await client.transaction.create({ data });
	}

	async getTransactionByReference(reference: string) {
		const transaction = await this.db.transaction.findUnique({
			where: { reference },
			include: { recipientWallet: true, senderWallet: true, order: true },
		});

		if (!transaction) {
			throw new NotFoundException('Transaction not found');
		}

		return transaction;
	}

	async getTransactionById(id: string) {
		const transaction = await this.db.transaction.findUnique({
			where: { id },
			include: { recipientWallet: true, senderWallet: true, order: true },
		});

		if (!transaction) {
			throw new NotFoundException('Transaction not found');
		}

		return transaction;
	}

	async updateTransactionByReference(
		reference: string,
		data: Prisma.TransactionUpdateInput,
	) {
		return await this.db.transaction.update({
			where: { reference },
			data,
		});
	}

	async updateTransaction(
		id: string,
		data: Prisma.TransactionUpdateInput,
		tx?: Prisma.TransactionClient,
	) {
		const client = this.getClient(tx);
		return await client.transaction.update({
			where: { id },
			data,
		});
	}

	async getTransactionsByUser(userId: string) {
		return await this.db.transaction.findMany({
			where: {
				OR: [{ senderWallet: { userId } }, { recipientWallet: { userId } }],
			},
			include: { senderWallet: true, recipientWallet: true, order: true },
			orderBy: { createdAt: 'desc' },
		});
	}

	async getAllTransactions() {
		return await this.db.transaction.findMany({
			include: { senderWallet: true, recipientWallet: true, order: true },
			orderBy: { createdAt: 'desc' },
		});
	}
}
