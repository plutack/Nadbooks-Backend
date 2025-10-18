import { TransactionStatus } from 'generated/prisma';

export enum PaymentMethod {
	paystack = 'PAYSTACK',
}

export interface WebhookEvent {
	event: string;
	data: any;
}

export interface IPaystackEvent extends WebhookEvent {
	event: PaystackEvent;
	data: {
		reference: string;
		amount: number;
		[key: string]: any;
	};
}

export enum PaystackEvent {
	// Charge Events
	CHARGE_SUCCESS = 'charge.success', // A successful charge was made

	// Dispute Events
	CHARGE_DISPUTE_CREATE = 'charge.dispute.create', // A dispute was logged against your business
	CHARGE_DISPUTE_REMIND = 'charge.dispute.remind', // A logged dispute has not been resolved
	CHARGE_DISPUTE_RESOLVE = 'charge.dispute.resolve', // A dispute has been resolved

	// Customer Identification Events
	CUSTOMERIDENTIFICATION_SUCCESS = 'customeridentification.success', // A customer ID validation was successful
	CUSTOMERIDENTIFICATION_FAILED = 'customeridentification.failed', // A customer ID validation has failed

	// Dedicated Virtual Account (DVA) Events
	DEDICATEDACCOUNT_ASSIGN_SUCCESS = 'dedicatedaccount.assign.success', // A DVA has been successfully created and assigned to a customer
	DEDICATEDACCOUNT_ASSIGN_FAILED = 'dedicatedaccount.assign.failed', // A DVA couldn't be created and assigned to a customer

	// Invoice Events
	INVOICE_CREATE = 'invoice.create', // An invoice has been created
	INVOICE_UPDATE = 'invoice.update', // An invoice has been updated
	INVOICE_PAYMENT_FAILED = 'invoice.payment_failed', // A payment for an invoice failed

	// Payment Request Events
	PAYMENTREQUEST_PENDING = 'paymentrequest.pending', // A payment request has been sent to a customer
	PAYMENTREQUEST_SUCCESS = 'paymentrequest.success', // A payment request has been paid for

	// Refund Events
	REFUND_PENDING = 'refund.pending', // Refund initiated, waiting for response from the processor
	REFUND_PROCESSING = 'refund.processing', // Refund has been received by the processor
	REFUND_PROCESSED = 'refund.processed', // Refund has successfully been processed
	REFUND_FAILED = 'refund.failed', // Refund cannot be processed

	// Subscription Events
	SUBSCRIPTION_CREATE = 'subscription.create', // A subscription has been created
	SUBSCRIPTION_DISABLE = 'subscription.disable', // A subscription on your account has been disabled
	SUBSCRIPTION_NOT_RENEW = 'subscription.not_renew', // A subscription's status has changed to non-renewing
	SUBSCRIPTION_EXPIRING_CARDS = 'subscription.expiring_cards', // Info on subscriptions with expiring cards for the month

	// Transfer Events
	TRANSFER_SUCCESS = 'transfer.success', // A successful transfer has been completed
	TRANSFER_FAILED = 'transfer.failed', // A transfer you attempted has failed
	TRANSFER_REVERSED = 'transfer.reversed', // A transfer you attempted has been reversed
}
export type RecordTransaction = {
	orderId: string;
	amount: number;
	method: PaymentMethod;
	status?: TransactionStatus;
};
