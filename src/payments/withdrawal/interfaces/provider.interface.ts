export interface WithdrawalProvider<Input> {
	initiateWithdrawal(input: Input): Promise<string>;
}

export type PaystackWithdrawalInput = {
	amount: number;
	reason: string;
	accountNumber: string;
	bankCode: string;
	name: string;
};

export type CryptoWithdrawalInput = {
	amount: number;
	address: string;
	reference: string;
	hash: string;
};

export interface PaystackWithdrawalProviderInterface
	extends WithdrawalProvider<PaystackWithdrawalInput> {}

export interface CryptoWithdrawalProviderInterface
	extends WithdrawalProvider<CryptoWithdrawalInput> {}
