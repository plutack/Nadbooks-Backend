import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from 'generated/prisma';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class OrderService {
	constructor(private readonly db: PrismaService) {}

	private getClient(tx?: Prisma.TransactionClient) {
		return tx ?? this.db;
	}

	async createOrder(
		userId: string,
		bookIds: string[],
		tx?: Prisma.TransactionClient,
	) {
		const client = this.getClient(tx);

		// Create the order (without book reference)
		const order = await client.order.create({
			data: {
				userId,
				status: 'PENDING',
				totalAmount: 0,
			},
		});

		// Fetch book details to get prices
		const books = await client.book.findMany({
			where: { id: { in: bookIds } },
			select: { id: true, price: true, authorId: true },
		});

		if (books.length !== bookIds.length) {
			throw new Error('Some books do not exist');
		}

		// Create OrderBook entries
		await client.orderBook.createMany({
			data: books.map((book) => ({
				orderId: order.id,
				bookId: book.id,
				price: book.price,
				authorId: book.authorId,
			})),
		});

		// Calculate total
		const totalAmount = books.reduce((sum, b) => sum + b.price, 0);

		// Update order with total
		const updatedOrder = await client.order.update({
			where: { id: order.id },
			data: { totalAmount },
			include: {
				books: { include: { book: true } },
				user: true,
			},
		});

		return updatedOrder;
	}
	async getOrderById(orderId: string) {
		const order = await this.db.order.findUnique({
			where: { id: orderId },
		});

		if (!order) {
			throw new Error('Order not found');
		}

		return order;
	}

	async markAsPaid(orderId: string, tx?: Prisma.TransactionClient) {
		const client = tx ?? this.db;
		return await client.order.update({
			where: { id: orderId },
			data: { status: OrderStatus.PAID },
		});
	}

	/** NOTE: not sure if this is neccessary
	 ( do we want to keep all order states as different
	  transactions or update on the go)
	 */
	async updateOrderStatus(orderId, status: OrderStatus) {}

	async getUserOrder(userId: string) {
		const orders = await this.db.order.findMany({
			where: { userId },
			orderBy: { createdAt: 'desc' },
		});
		return orders;
	}
}
