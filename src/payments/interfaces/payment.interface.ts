export interface IPaymentService {
	createPaymentReference(input: {
		amount: number;
		email: string;
		metadata?: Record<string, any>;
	}): Promise<{ reference: string }>; //TODO: this should return enough info to the frontend for a redirect to payment platform

	verifyPayment(reference: string): Promise<{
		status: 'success' | 'failed' | 'pending';
		amount: number;
		currency: string;
		reference: string;
		providerResponse: any;
	}>;

	handleWebhook(payload: any, headers: any): Promise<void>;
}

//paystack successful return for the initialize transaction
// {
//   "status": true,
//   "message": "Authorization URL created",
//   "data": {
//     "authorization_url": "https://checkout.paystack.com/3ni8kdavz62431k",
//     "access_code": "3ni8kdavz62431k",
//     "reference": "re4lyvq3s3"
//   }
// }
