import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { formatEther, getAddress, JsonRpcProvider } from 'ethers';
import {
	CryptoDepositDto,
	VerifyDepositInput,
} from '@/payments/deposit/dtos/deposit.dto';
import {
	DepositProviderInterface,
	DepositResult,
	PaymentStatus,
} from '@/payments/deposit/interfaces/provider.interface';

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
	private readonly provider: JsonRpcProvider;
	private readonly contractAddress: string;

	constructor(config: ConfigService) {
		const rpcUrl = config.getOrThrow<string>('ALCHEMY_RPC_URL');
		this.provider = new JsonRpcProvider(rpcUrl);
		this.contractAddress = config.getOrThrow<string>('SMART_CONTRACT_ADDRESS');
	}

	async initiateDeposit(dto: CryptoDepositDto): Promise<DepositResult> {
		return {
			status: PaymentStatus.PENDING,
			reference: dto.reference,
			destinationAddress: this.contractAddress,
			amount: dto.amount,
			currency: 'MON',
		};
	}

	async verifyPayment(dto: VerifyDepositInput): Promise<{
		status: PaymentStatus;
		decodedSender?: string;
		decodedAmount?: string;
	}> {
		console.log({ paymentVerification: dto });
		try {
			const receipt = await this.provider.getTransactionReceipt(dto.hash!);

			if (!receipt) {
				return { status: PaymentStatus.FAILED };
			}

			// Check block confirmation — still pending if not mined
			if (!receipt.blockNumber) {
				return { status: PaymentStatus.PENDING };
			}

			// Check on-chain status: 0 = reverted, 1 = success
			if (receipt.status === 0) {
				return { status: PaymentStatus.FAILED };
			}

			// Find the log emitted by our contract
			const log = receipt.logs.find(
				(l) => l.address.toLowerCase() === this.contractAddress.toLowerCase(),
			);

			if (!log || !log.data) {
				return { status: PaymentStatus.FAILED };
			}

			// Decode sender address from log data (first 32-byte word, last 20 bytes)
			const sender = getAddress('0x' + log.data.slice(26, 66));

			// Decode amount from log data (second 32-byte word)
			const amountHex = '0x' + log.data.slice(66);
			const rawAmount = BigInt(amountHex);

			if (!rawAmount) {
				return { status: PaymentStatus.FAILED };
			}

			const depositAmount = formatEther(rawAmount);

			// Optional: validate the sender matches the expected buyer
			if (
				dto.buyerAddress &&
				sender.toLowerCase() !== dto.buyerAddress.toLowerCase()
			) {
				return { status: PaymentStatus.FAILED };
			}

			// Optional: validate the decoded amount matches the expected transfer
			if (
				dto.transferedAmount &&
				Number(dto.transferedAmount) !== Number(depositAmount)
			) {
				return { status: PaymentStatus.FAILED };
			}

			return {
				status: PaymentStatus.SUCCESS,
				decodedSender: sender,
				decodedAmount: depositAmount,
			};
		} catch (err) {
			console.log('Error verifying payment:', err);
			return { status: PaymentStatus.FAILED };
		}
	}
}
