export class PaymentSucceededEvent {
  userId: string;
  amount: number;
  currency: string;
  transactionId: string;
}
