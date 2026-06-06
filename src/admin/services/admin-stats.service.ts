import { Injectable } from '@nestjs/common';
import {
	BookStatus,
	OrderStatus,
	Role,
	TransactionStatus,
} from 'generated/prisma';
import { PrismaService } from '@/prisma/prisma.service';

type Counted<T extends string> = { status: T; _count: number };

/** Folds Prisma groupBy rows into a `{ [enumValue]: count }` map seeded at 0. */
function tally<T extends string>(
	rows: Counted<T>[],
	keys: T[],
): Record<T, number> {
	const out = Object.fromEntries(keys.map((k) => [k, 0])) as Record<T, number>;
	for (const row of rows) {
		out[row.status] = row._count;
	}
	return out;
}

@Injectable()
export class AdminStatsService {
	constructor(private readonly db: PrismaService) {}

	/** Aggregate platform metrics for the admin dashboard. */
	async getStats() {
		const [
			totalUsers,
			verifiedUsers,
			activeUsers,
			adminUsers,
			totalBooks,
			deletedBooks,
			booksByStatus,
			totalOrders,
			ordersByStatus,
			totalTransactions,
			transactionsByStatus,
			revenue,
		] = await Promise.all([
			this.db.user.count(),
			this.db.user.count({ where: { isVerified: true } }),
			this.db.user.count({ where: { isActive: true } }),
			this.db.user.count({
				where: { role: { in: [Role.ADMIN, Role.SUPER_ADMIN] } },
			}),
			this.db.book.count(),
			this.db.book.count({ where: { isDeleted: true } }),
			this.db.book.groupBy({
				by: ['status'],
				where: { isDeleted: false },
				_count: true,
			}),
			this.db.order.count(),
			this.db.order.groupBy({ by: ['status'], _count: true }),
			this.db.transaction.count(),
			this.db.transaction.groupBy({ by: ['status'], _count: true }),
			this.db.order.aggregate({
				_sum: { totalAmount: true },
				where: { status: { in: [OrderStatus.PAID, OrderStatus.COMPLETED] } },
			}),
		]);

		const books = tally(booksByStatus, Object.values(BookStatus));
		const orders = tally(ordersByStatus, Object.values(OrderStatus));
		const transactions = tally(
			transactionsByStatus,
			Object.values(TransactionStatus),
		);

		return {
			users: {
				total: totalUsers,
				verified: verifiedUsers,
				active: activeUsers,
				admins: adminUsers,
			},
			books: {
				total: totalBooks,
				deleted: deletedBooks,
				pendingReview: books[BookStatus.PENDING_APPROVAL],
				approved: books[BookStatus.APPROVED],
				rejected: books[BookStatus.REJECTED],
			},
			orders: {
				total: totalOrders,
				...orders,
			},
			transactions: {
				total: totalTransactions,
				...transactions,
			},
			revenue: {
				// Sum of totalAmount across paid/completed orders (in BOOKS).
				paidOrdersTotal: revenue._sum.totalAmount ?? 0,
			},
		};
	}
}
