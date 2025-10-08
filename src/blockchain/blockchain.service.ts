import { Injectable } from '@nestjs/common';
import {
	JsonRpcProvider,
	Interface,
	formatEther,
	getAddress,
	formatUnits,
	Wallet,
	Contract,
	parseEther,
} from 'ethers';
import { VerifyPaymentDto } from './dtos/blockchain.dtos';

import { batchAbi } from './interface/batchAbi';
import { entryPointAbi } from './interface/entryPointAbi';

const RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';
const contractAddress = '0x743d45BB0926a1EaCD97a06d8e7e92BEe2f7632b';
const centralWallet = '0x9735300E77182c6381a776da2e318ae9C20aF099';
const provider = new JsonRpcProvider(RPC_URL);

@Injectable()
export class BlockchainService {
	async verifyPayment(dto: VerifyPaymentDto): Promise<{
		status: 'success' | 'failed';
		amount: number;
		currency: string;
		hash: string;
	}> {
		try {
			const waitForTx = await provider.waitForTransaction(dto.hash);
			if (waitForTx) {
				const tx = await provider.getTransaction(dto.hash);
				if (tx) {
					const decodedTransfer = this.decodeTransfer(tx);
					const walletTransferedTo = decodedTransfer?.transfer[0];
					const amountSent = decodedTransfer?.transfer[1];
					console.log(Number(formatEther(amountSent)), dto.transferedAmount);
					if (
						walletTransferedTo.toLowerCase() !== centralWallet.toLowerCase()
					) {
						throw new Error('you did not transfer to the expected wallet');
					}
					if (
						Number(dto.transferedAmount) !== Number(formatEther(amountSent))
					) {
						throw new Error('invalid transfer amount');
					}
					if (
						decodedTransfer?.to.toLowerCase() !== contractAddress.toLowerCase()
					) {
						throw new Error('invalid token transfer');
					}
					if (
						decodedTransfer?.sender.toLowerCase() !==
						dto.buyerAddress.toLowerCase()
					) {
						throw new Error('invalid sender address');
					}
					return {
						status: 'success',
						amount: Number(formatEther(amountSent)),
						currency: 'bks',
						hash: dto.hash,
					};
				}
			}
			return {
				status: 'failed',
				amount: dto.transferedAmount,
				currency: 'bks',
				hash: dto.hash,
			};
		} catch (err) {
			console.log(err);
			return {
				status: 'failed',
				amount: dto.transferedAmount,
				currency: 'bks',
				hash: dto.hash,
			};
		}
	}

	decodeNormalTransaction(tx: any) {
		const iface = new Interface([
			'function transfer(address to, uint256 amount)',
		]);
		const transfer = iface.decodeFunctionData('transfer', tx.data);
		console.log('decoded transfer : ', transfer);
		return { sender: tx.from, to: tx.to, transfer };
	}

	decodeEmailTransaction(tx: any) {
		try {
			const handleOpsInterface = new Interface(entryPointAbi);

			const decodedHandleOps = handleOpsInterface.decodeFunctionData(
				'handleOps',
				tx.data,
			);

			// Extract parameters
			const ops = decodedHandleOps[0]; // Array of UserOperation
			const beneficiary = decodedHandleOps[1]; // Beneficiary address

			console.log('Beneficiary:', beneficiary);

			// Decode the first UserOperation
			const userOp = ops[0];
			console.log({
				sender: userOp.sender,
				nonce: userOp.nonce.toString(),
				initCode: userOp.initCode,
				callData: userOp.callData,
				callGasLimit: userOp.callGasLimit.toString(),
				verificationGasLimit: userOp.verificationGasLimit.toString(),
				preVerificationGas: userOp.preVerificationGas.toString(),
				maxFeePerGas: userOp.maxFeePerGas.toString(),
				maxPriorityFeePerGas: userOp.maxPriorityFeePerGas.toString(),
				paymasterAndData: userOp.paymasterAndData,
				signature: userOp.signature,
			});

			const batchInterface = new Interface(batchAbi);

			// 2. ABI for the inner function (standard ERC-20 transfer)
			// Selector 0xa9059cbb matches: transfer(address,uint256)
			const erc20Abi = ['function transfer(address to, uint256 amount)'];
			const erc20Interface = new Interface(erc20Abi);

			const decodedBatch = batchInterface.parseTransaction({
				data: userOp.callData,
			});
			console.log(decodedBatch);
			const tranferData = decodedBatch?.args[2];
			console.log(tranferData);

			const transfer = erc20Interface.decodeFunctionData(
				'transfer',
				tranferData,
			);
			console.log(transfer);
			return { sender: userOp.sender, to: decodedBatch?.args[0], transfer };
		} catch (err) {
			console.log(err);
		}
	}

	decodeTransfer(tx: any) {
		if (tx.to.toLowerCase() === contractAddress.toLowerCase()) {
			let transferData = this.decodeNormalTransaction(tx);
			return transferData;
		} else {
			let transferData = this.decodeEmailTransaction(tx);
			return transferData;
		}
	}
}
