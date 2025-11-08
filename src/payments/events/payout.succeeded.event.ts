export class PayoutSucceededEvent {
  withdrawalId: string;
  userId: string;
  amount: number;
  currency: string;
  reference: string;
}
