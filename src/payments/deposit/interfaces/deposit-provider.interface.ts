export interface DepositProviderInterface {
	initiateDeposit(input: {
		amount: number;
		email?: string;
		reference: string;
		metadata?: Record<string, any>;
	}): Promise<{
		paymentUrl?: string;
	}>;

	/**
	 * Verify a completed payment via provider API.
	 */
	verifyPayment(reference: string): Promise<{
		success: boolean;
		providerResponse: any; // full provider response
	}>;

	/**
	 * Handle provider webhook events (optional).
	 * Should validate signature and return parsed event payload.
	 */
	handleWebhook?(payload: any, headers?: Record<string, string>): Promise<any>;
}
