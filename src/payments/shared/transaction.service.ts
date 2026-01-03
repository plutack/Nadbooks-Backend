import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TransactionStatus, TransactionType } from 'generated/prisma';
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
			include: {
				recipientWallet: { select: { id: true, userId: true } },
				senderWallet: { select: { id: true, userId: true } },
				order: true,
			},
		});

		if (!transaction) {
			throw new NotFoundException('Transaction not found');
		}

		return transaction;
	}

	async getTransactionById(id: string) {
		const transaction = await this.db.transaction.findUnique({
			where: { id },
			include: {
				recipientWallet: { select: { id: true, userId: true } },
				senderWallet: { select: { id: true, userId: true } },
				order: true,
			},
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

	async getTransactionsByUser(
		userId: string,
		filter?: { type?: TransactionType; status?: TransactionStatus },
	) {
		const where: Prisma.TransactionWhereInput = {
			OR: [{ senderWallet: { userId } }, { recipientWallet: { userId } }],
		};

		if (filter?.type) {
			where.type = filter.type;
		}

		if (filter?.status) {
			where.status = filter.status;
		}

		return await this.db.transaction.findMany({
			where,
			include: {
				senderWallet: { select: { id: true, userId: true } },
				recipientWallet: { select: { id: true, userId: true } },
				order: true,
			},
			orderBy: { createdAt: 'desc' },
		});
	}

	async getAllTransactions(filter?: {
		type?: TransactionType;
		status?: TransactionStatus;
	}) {
		const where: Prisma.TransactionWhereInput = {};

		if (filter?.type) {
			where.type = filter.type;
		}

		if (filter?.status) {
			where.status = filter.status;
		}

		return await this.db.transaction.findMany({
			where,
			include: {
				senderWallet: { select: { id: true, userId: true } },
				recipientWallet: { select: { id: true, userId: true } },
				order: true,
			},
			orderBy: { createdAt: 'desc' },
		});
	}
}
