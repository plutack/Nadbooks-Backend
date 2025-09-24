import { TransactionStatus } from 'generated/prisma';

export enum PaymentMethod {
	paystack = 'PAYSTACK',
}

export type RecordTransaction = {
	orderId: string;
	amount: number;
	method: PaymentMethod;
	status?: TransactionStatus;
};
