import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class WalletService {
	constructor(private prisma: PrismaService) {}

	async transfer(senderId: number, recipientId: number, amount: number) {
		if (amount <= 0) {
			throw new BadRequestException('Amount must be greater than zero');
		}

		return await this.prisma.$transaction(async (tx) => {
			const senderWallet = await tx.wallet.findUnique({
				where: { userId: senderId },
			});
			if (!senderWallet)
				throw new BadRequestException('Sender wallet not found');
			if (senderWallet.balance < amount)
				throw new BadRequestException('Insufficient balance');

			const recipientWallet = await tx.wallet.findUnique({
				where: { userId: recipientId },
			});
			if (!recipientWallet)
				throw new BadRequestException('Recipient wallet not found');

			await tx.wallet.update({
				where: { id: senderWallet.id },
				data: { balance: { decrement: amount } },
			});

			await tx.wallet.update({
				where: { id: recipientWallet.id },
				data: { balance: { increment: amount } },
			});

			await tx.walletTransaction.create({
				data: {
					walletId: senderWallet.id,
					type: 'WITHDRAWAL',
					amount,
					description: `Transfer to user ${recipientId}`,
				},
			});

			await tx.walletTransaction.create({
				data: {
					walletId: recipientWallet.id,
					type: 'DEPOSIT',
					amount,
					description: `Transfer from user ${senderId}`,
				},
			});

			return { success: true };
		});
	}
}
