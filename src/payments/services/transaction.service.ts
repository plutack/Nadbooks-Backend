import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RecordTransaction } from '@/types/payment.type';

@Injectable()
export class TransactionService {
	constructor(private readonly db: PrismaService) {}

	async recordTransaction(input: RecordTransaction) {
		return await this.db.transaction.create({
			data: {
				orderId: input.orderId,
				amount: input.amount,
				method: input.method,
				status: input.status ?? 'PENDING',
			},
		});
	}
}
