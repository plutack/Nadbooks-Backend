import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { formatEther, Interface, JsonRpcProvider } from 'ethers';
import {
	PaymentMethod,
	TransactionStatus,
	TransactionType,
} from 'generated/prisma';
import {
	CryptoDepositDto,
	VerifyDepositInput,
} from '@/payments/deposit/dtos/deposit.dto';
import {
	batchAbi,
	entryPointAbi,
} from '@/payments/deposit/interfaces/crypto.interface';
import {
	DepositProviderInterface,
	DepositResult,
	PaymentStatus,
} from '@/payments/deposit/interfaces/provider.interface';
import { TransactionService } from '@/payments/shared/transaction.service';

type DecodedTransfer = {
	sender: string;
	to: string;
	transfer: [string, string]; // [recipient, amount]
};

@Injectable()
export class CryptoDepositProvider implements DepositProviderInterface<
	CryptoDepositDto,
	DepositResult,
	VerifyDepositInput,
	{ status: PaymentStatus }
> {
	private readonly provider: JsonRpcProvider;
	private readonly contractAddress: string;
	private readonly centralWallet: string;

	constructor(config: ConfigService) {
		const rpcUrl = config.getOrThrow<string>('ALCHEMY_RPC_URL');
		this.provider = new JsonRpcProvider(rpcUrl);

		this.contractAddress = config.getOrThrow<string>('SMART_CONTRACT_ADDRESS');
		this.centralWallet = config.getOrThrow<string>('CENTRAL_WALLET_ADDRESS');
	}
	private decodeNormalTransaction(tx: any): DecodedTransfer {
		const iface = new Interface([
			'function transfer(address to, uint256 amount)',
		]);
		const result = iface.decodeFunctionData('transfer', tx.data);

		const transfer: [string, string] = [result.to, result.amount.toString()];

		return { sender: tx.from, to: tx.to, transfer };
	}

	private decodeEmailTransaction(tx: any): DecodedTransfer | null {
		try {
			const handleOpsInterface = new Interface(entryPointAbi);
			const decodedHandleOps = handleOpsInterface.decodeFunctionData(
				'handleOps',
				tx.data,
			);

			const ops = decodedHandleOps[0]; // Array of UserOperation
			const userOp = ops[0]; // First operation

			const batchInterface = new Interface(batchAbi);
			const decodedBatch = batchInterface.parseTransaction({
				data: userOp.callData,
			});

			if (!decodedBatch) {
				console.log('Failed to parse batch transaction');
				return null;
			}

			// Decode ERC20 transfer
			const erc20Interface = new Interface([
				'function transfer(address to, uint256 amount)',
			]);
			const decodedTransfer = erc20Interface.decodeFunctionData(
				'transfer',
				decodedBatch.args[2],
			);

			const transfer: [string, string] = [
				decodedTransfer.to,
				decodedTransfer.amount.toString(),
			];

			return { sender: userOp.sender, to: decodedBatch.args[0], transfer };
		} catch (err) {
			console.log('Failed to decode email transaction:', err);
			return null;
		}
	}

	private decodeTransfer(tx: any): DecodedTransfer | null {
		if (tx.to?.toLowerCase() === this.contractAddress.toLowerCase()) {
			return this.decodeNormalTransaction(tx);
		}
		return this.decodeEmailTransaction(tx);
	}

	private isValidTransaction(
		decodedTransfer: DecodedTransfer | null,
		dto: VerifyDepositInput,
	): boolean {
		if (!decodedTransfer) return false;
		const [recipient, amount] = decodedTransfer.transfer;
		if (recipient.toLowerCase() !== this.centralWallet.toLowerCase()) {
			return false;
		}
		if (Number(dto.transferedAmount) !== Number(formatEther(amount))) {
			return false;
		}
		if (
			decodedTransfer.to.toLowerCase() !== this.contractAddress.toLowerCase()
		) {
			return false;
		}
		if (
			decodedTransfer.sender.toLowerCase() !== dto.buyerAddress!.toLowerCase()
		) {
			return false;
		}
		return true;
	}

	async initiateDeposit(dto: CryptoDepositDto): Promise<DepositResult> {
		return await Promise.resolve({
			status: PaymentStatus.PENDING,
			reference: dto.reference,
			destinationAddress: this.centralWallet, // or this.contractAddress depending on if we use smart contract or just transfer
			amount: dto.amount,
			currency: 'MON',
		});
	}

	async verifyPayment(dto: VerifyDepositInput): Promise<{
		status: PaymentStatus;
	}> {
		try {
			const tx = await this.provider.getTransaction(dto.hash!);
			if (!tx) {
				return { status: PaymentStatus.FAILED };
			}
			if (!tx.blockNumber) {
				return { status: PaymentStatus.PENDING };
			}
			const receipt = await this.provider.getTransactionReceipt(dto.hash!);

			if (!receipt) {
				return { status: PaymentStatus.PENDING };
			}
			if (receipt.status === 0) {
				return { status: PaymentStatus.FAILED };
			}

			const decodedTransfer = this.decodeTransfer(tx);

			if (this.isValidTransaction(decodedTransfer, dto)) {
				return { status: PaymentStatus.FAILED };
			}

			return {
				status: PaymentStatus.SUCCESS,
			};
		} catch (err) {
			console.log('Error verifying payment:', err);
			return { status: PaymentStatus.FAILED };
		}
	}
}
