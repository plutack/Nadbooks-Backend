import { Injectable } from '@nestjs/common';
import { formatEther, Interface, JsonRpcProvider } from 'ethers';
import {
	PaymentMethod,
	TransactionStatus,
	TransactionType,
} from 'generated/prisma';
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
import {
	CryptoDepositDto,
	DepositDto,
	VerifyDepositInput,
} from '@/payments/deposit/dtos/deposit.dto';

// TODO: switch to envs
const RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';
const contractAddress = '0x743d45BB0926a1EaCD97a06d8e7e92BEe2f7632b';
const centralWallet = '0x9735300E77182c6381a776da2e318ae9C20aF099';
const provider = new JsonRpcProvider(RPC_URL);

type DecodedTransfer = {
	sender: string;
	to: string;
	transfer: [string, string]; // [recipient, amount]
};

@Injectable()
export class CryptoDepositProvider
	implements
		DepositProviderInterface<
			CryptoDepositDto,
			DepositResult,
			VerifyDepositInput,
			{ status: PaymentStatus }
		>
{
	constructor(private readonly transactionService: TransactionService) {}
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
		if (tx.to?.toLowerCase() === contractAddress.toLowerCase()) {
			return this.decodeNormalTransaction(tx);
		}
		return this.decodeEmailTransaction(tx);
	}

	private isValidTransaction(
		decodedTransfer: DecodedTransfer | null,
		dto: VerifyDepositInput,
	): { valid: boolean; reason?: string; amount?: number } {
		if (!decodedTransfer)
			return { valid: false, reason: 'Invalid transaction data' };

		const [recipient, amount] = decodedTransfer.transfer;

		if (recipient.toLowerCase() !== centralWallet.toLowerCase()) {
			return { valid: false, reason: 'Wrong recipient wallet' };
		}

		if (Number(dto.transferedAmount) !== Number(formatEther(amount))) {
			return { valid: false, reason: 'Invalid transfer amount' };
		}

		if (decodedTransfer.to.toLowerCase() !== contractAddress.toLowerCase()) {
			return { valid: false, reason: 'Invalid contract' };
		}

		if (
			decodedTransfer.sender.toLowerCase() !== dto.buyerAddress!.toLowerCase()
		) {
			return { valid: false, reason: 'Invalid sender address' };
		}

		return { valid: true, amount: Number(formatEther(amount)) };
	}

	async initiateDeposit(dto: CryptoDepositDto): Promise<DepositResult> {
		await this.transactionService.recordTransaction({
			reference: dto.reference,
			amount: dto.amount,
			type: TransactionType.DEPOSIT,
			paymentMethod: PaymentMethod.CRYPTO,
			status: TransactionStatus.PENDING,
		});

		return {
			status: PaymentStatus.PENDING,
			reference: dto.reference,
		};
	}

	async verifyPayment(dto: VerifyDepositInput): Promise<{
		status: PaymentStatus;
	}> {
		try {
			const tx = await provider.getTransaction(dto.hash!);

			if (!tx) {
				// No such transaction exists
				return { status: PaymentStatus.FAILED };
			}

			if (!tx.blockNumber) {
				// Transaction is still pending
				return { status: PaymentStatus.PENDING };
			}

			// Transaction is mined, get the receipt
			const receipt = await provider.getTransactionReceipt(dto.hash!);

			if (!receipt) {
				// Should rarely happen, but receipt missing
				return { status: PaymentStatus.PENDING };
			}

			if (receipt.status === 0) {
				// Transaction reverted
				return { status: PaymentStatus.FAILED };
			}

			// Transaction succeeded, now validate details
			const decodedTransfer = this.decodeTransfer(tx);
			const validation = this.isValidTransaction(decodedTransfer, dto);

			if (!validation.valid) {
				console.log('Transaction content invalid:', validation.reason);
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
