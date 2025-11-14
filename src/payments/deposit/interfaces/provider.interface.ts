import { JwtPayloadType } from '@/types/jwt.type';

export enum PaymentStatus {
	PENDING = 'pending',
	SUCCESS = 'success',
	FAILED = 'failed',
}

export interface DepositResult {
	status: PaymentStatus;
	hash?: string; // optional (tx hash or payment reference)
	reference?: string;
	paymentUrl?: string;
}

// Generic interface for all deposit providers
// Ties initiateDeposit input/output and verifyPayment input/output
export interface DepositProviderInterface<
	InitInput,
	InitOutput,
	VerifyInput,
	VerifyOutput,
> {
	// Initiate a deposit for a given user
	initiateDeposit(user: JwtPayloadType, dto: InitInput): Promise<InitOutput>;

	// Verify a completed deposit
	verifyPayment(input: VerifyInput): Promise<VerifyOutput>;

	//  webhook handler
	handleWebhook?(payload: any, headers?: Record<string, string>): Promise<any>;
}
