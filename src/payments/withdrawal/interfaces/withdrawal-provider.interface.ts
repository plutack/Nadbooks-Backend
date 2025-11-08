export interface WithdrawalProvider<Input> {
	initiateWithdrawal(input: Input): Promise<string>;
}

export type BankWithdrawalInput = {
	amount: number;
	reason: string;
	accountNumber: string;
	bankCode: string;
	name: string;
};

export type CryptoWithdrawalInput = {
	amount: number;
	address: string;
};

export interface BankWithdrawalProviderInterface
	extends WithdrawalProvider<BankWithdrawalInput> {}

export interface CryptoWithdrawalProviderInterface
	extends WithdrawalProvider<CryptoWithdrawalInput> {}
