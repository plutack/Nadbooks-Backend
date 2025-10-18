import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TransactionStatus } from 'generated/prisma';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class TransactionService {
	constructor(private readonly db: PrismaService) {}

	async recordTransaction(data: Prisma.TransactionUncheckedCreateInput) {
		return await this.db.transaction.create({
			data,
		});
	}

	async getTransactionByReference(reference: string) {
		const transaction = await this.db.transaction.findUnique({
			where: { reference },
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
		return this.db.transaction.update({
			where: { reference },
			data,
		});
	}

	async updateTransaction(id: string, data: Prisma.TransactionUpdateInput) {
		return this.db.transaction.update({
			where: { id },
			data,
		});
	}
}
