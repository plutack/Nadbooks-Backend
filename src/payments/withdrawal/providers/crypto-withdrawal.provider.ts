import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Contract, JsonRpcProvider, parseEther, Wallet } from 'ethers';
import {
	CryptoWithdrawalInput,
	CryptoWithdrawalProviderInterface,
} from '@/payments/withdrawal/interfaces/provider.interface';

@Injectable()
export class CryptoWithdrawalProvider
	implements CryptoWithdrawalProviderInterface
{
	private readonly logger = new Logger(CryptoWithdrawalProvider.name);
	private readonly provider: JsonRpcProvider;
	private readonly wallet: Wallet;
	private readonly contractAddress: string;

	private readonly CONTRACT_ABI = [
		'function user_withdrawal(address _recipient, uint256 _req_amount) public',
	];

	constructor(config: ConfigService) {
		const rpcUrl = config.getOrThrow<string>('ALCHEMY_RPC_URL');
		this.provider = new JsonRpcProvider(rpcUrl);

		const privateKey = config.getOrThrow<string>('CENTRAL_WALLET_PRIVATE_KEY');
		this.wallet = new Wallet(privateKey, this.provider);

		this.contractAddress = config.getOrThrow<string>('SMART_CONTRACT_ADDRESS');
	}

	/**
	 * Initiates a withdrawal via the smart contract's user_withdrawal function.
	 * Returns the transaction hash after confirmation.
	 */
	async initiateWithdrawal(input: CryptoWithdrawalInput): Promise<string> {
		const contract = new Contract(
			this.contractAddress,
			this.CONTRACT_ABI,
			this.wallet,
		);

		const amountWei = parseEther(input.amount.toString());

		this.logger.log(
			`Calling user_withdrawal(${input.recieverAddress}, ${amountWei})`,
		);

		const tx = await contract.user_withdrawal(input.recieverAddress, amountWei);
		const receipt = await tx.wait();

		this.logger.log(`Withdrawal confirmed in block ${receipt.blockNumber}`);
		return receipt.hash;
	}
}
