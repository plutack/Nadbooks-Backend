export interface WithdrawalProvider<Input> {
	initiateWithdrawal(input: Input): Promise<string>;
}

export type BankAccountResolution = {
	accountNumber: string;
	bankCode: string;
};

export type PaystackBank = {
	name: string;
	code: string;
};

export type PaystackWithdrawalInput = {
	amount: number;
	reason: string;
	accountNumber: string;
	bankCode: string;
	name: string;
};

export type CryptoWithdrawalInput = {
	amount: number;
	reference: string;
	recieverAddress: string;
};
export interface PaystackWithdrawalProviderInterface
	extends WithdrawalProvider<PaystackWithdrawalInput> {
	resolveBankAccount(input: BankAccountResolution): Promise<string>;
	getBanks(): Promise<PaystackBank[]>;
}

export interface CryptoWithdrawalProviderInterface
	extends WithdrawalProvider<CryptoWithdrawalInput> {}
