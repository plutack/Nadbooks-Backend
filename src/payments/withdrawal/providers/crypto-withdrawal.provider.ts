import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JsonRpcProvider, parseEther, Wallet } from 'ethers';
import {
	CryptoWithdrawalInput,
	CryptoWithdrawalProviderInterface,
} from '@/payments/withdrawal/interfaces/provider.interface';

@Injectable()
export class CryptoWithdrawalProvider implements CryptoWithdrawalProviderInterface {
	provider: JsonRpcProvider;
	private readonly wallet: Wallet;

	constructor(config: ConfigService) {
		const rpcUrl = config.getOrThrow<string>('ALCHEMY_RPC_URL');

		this.provider = new JsonRpcProvider(rpcUrl);

		const privateKey = config.getOrThrow<string>('CENTRAL_WALLET_PRIVATE_KEY');

		this.wallet = new Wallet(privateKey, this.provider);
	}

	/**
	 * Initiates a blockchain withdrawal and returns the transaction hash.
	 * This performs a native MON/ETH transfer.
	 */
	async initiateWithdrawal(input: CryptoWithdrawalInput): Promise<string> {
		const txData = {
			to: input.recieverAddress,
			value: parseEther(input.amount.toString()),
		};

		let gasLimit: bigint;
		try {
			gasLimit = await this.wallet.estimateGas(txData);
		} catch {
			gasLimit = 21_000n; // fallback
		}

		const safeGasLimit = (gasLimit * 120n) / 100n;

		const tx = await this.wallet.sendTransaction({
			...txData,
			gasLimit: safeGasLimit,
		});

		return tx.hash;
	}
}
