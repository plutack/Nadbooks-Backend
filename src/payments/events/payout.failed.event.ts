export class PayoutFailedEvent {
  withdrawalId: string;
  userId: string;
  amount: number;
  currency: string;
  reference: string;
  reason: string;
}
