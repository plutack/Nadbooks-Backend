import { Injectable } from '@nestjs/common';
import { OrderStatus } from 'generated/prisma';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class OrderService {
	constructor(private readonly db: PrismaService) {}

	async createOrder(userId: string, bookIds: string[]) {
		return await this.db.$transaction(async (tx) => {
			// Create the order (without book reference)
			const order = await tx.order.create({
				data: {
					userId,
					status: 'PENDING',
					totalAmount: 0,
				},
			});
			// Fetch book details to get prices
			const books = await tx.book.findMany({
				where: { id: { in: bookIds } },
				select: { id: true, price: true },
			});

			if (books.length !== bookIds.length) {
				throw new Error('Some books do not exist');
			}

			// Create OrderBook entries
			await tx.orderBook.createMany({
				data: books.map((book) => ({
					orderId: order.id,
					bookId: book.id,
					price: book.price,
				})),
			});

			// Calculate total
			const totalAmount = books.reduce((sum, b) => sum + b.price, 0);

			// 5. Update order with total
			const updatedOrder = await tx.order.update({
				where: { id: order.id },
				data: { totalAmount },
				include: {
					books: { include: { book: true } },
					user: true,
				},
			});

			return updatedOrder;
		});
	}
	async getOrder(orderId: string) {
		const order = await this.db.order.findUnique({
			where: { id: orderId },
		});

		if (!order) {
			throw new Error('Order not found');
		}

		return order;
	}

	/** NOTE: not sure if this is neccessary
	 ( do we want to keep all order states as different
	  transactions or update on the go)
	 */
	async updateOrderStatus(orderId, status: OrderStatus);

	async getUserOrder(userId: string) {}
}
