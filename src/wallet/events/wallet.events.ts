export class WithdrawalInitiatedEvent {
  userId: string;
  walletId: string;
  amount: number;
  currency: string;
  withdrawalId: string;
}
