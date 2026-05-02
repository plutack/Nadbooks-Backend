import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { getAddress } from 'ethers';
import { PaymentMethod, Prisma, TransactionType } from 'generated/prisma';
import { DepositService } from '@/payments/deposit/deposit.service';
import { PrismaService } from '@/prisma/prisma.service';
import { WithdrawalService } from '@/payments/withdrawal/withdrawal.service';

@Injectable()
export class WebhookService {
	private readonly paystackSecret: string;
	private readonly alchemySecret: string;
	constructor(
		private readonly depositService: DepositService,
		private readonly withdrawalService: WithdrawalService,
		private readonly db: PrismaService,
		config: ConfigService,
	) {
		this.paystackSecret = config.getOrThrow<string>('PAYSTACK_SECRET', '');
		this.alchemySecret = config.getOrThrow<string>('ALCHEMY_SECRET', '');
	}

	private async findProviderResponse(
		provider: PaymentMethod,
		reference: string,
	): Promise<{ id: string } | null> {
		return this.db.providerResponse
			.findUnique({
				where: {
					ProviderResponse_provider_reference_unique: { provider, reference },
				},
				select: { id: true },
			})
			.then((r) => r as { id: string } | null);
	}

	private async saveProviderResponse(
		provider: PaymentMethod,
		reference: string,
		response: Prisma.InputJsonValue,
	): Promise<{ id: string } | null> {
		const existing = await this.findProviderResponse(provider, reference);
		if (existing) return null;
		return this.db.providerResponse.create({
			data: { provider, reference, response },
			select: { id: true },
		});
	}

	private verifyPaystackSignature(payload: any, signature: string): boolean {
		const hash = crypto
			.createHmac('sha512', this.paystackSecret)
			.update(JSON.stringify(payload))
			.digest('hex');

		return hash === signature;
	}

	verifyAlchemySignature(rawBody: Buffer | string, signature: string): boolean {
		if (!signature || !this.alchemySecret) return false;

		try {
			const bodyString = Buffer.isBuffer(rawBody)
				? rawBody.toString('utf8')
				: String(rawBody);

			const hash = crypto
				.createHmac('sha256', this.alchemySecret)
				.update(bodyString)
				.digest('hex');

			return hash === signature;
		} catch (e) {
			console.error('Error verifying Alchemy signature:', e);
			return false;
		}
	}

	async handlePaystackWebhook(
		payload: any,
		headers: any,
	): Promise<{ status: string } | never> {
		const signature: string = headers['x-paystack-signature'];

		if (!this.verifyPaystackSignature(payload, signature)) {
			throw new BadRequestException({ status: 'unauthorized' });
		}

		const reference = payload?.data?.reference;
		if (reference) {
			const existing = await this.findProviderResponse(
				PaymentMethod.PAYSTACK,
				reference,
			);
			if (existing) {
				return { status: 'duplicate' };
			}
			await this.saveProviderResponse(
				PaymentMethod.PAYSTACK,
				reference,
				payload,
			);
		}

		return { status: 'queued' };
	}

	async handleCryptoWebhook(
		rawBody: Buffer | string,
		headers: any,
	): Promise<{ status: string }> {
		const signature = headers['x-alchemy-signature'] as string;

		if (!this.verifyAlchemySignature(rawBody, signature)) {
			return { status: 'unauthorized' };
		}

		const payload =
			typeof rawBody === 'string'
				? JSON.parse(rawBody)
				: JSON.parse(rawBody.toString('utf8'));
		const webhookId = payload?.id;

		if (webhookId) {
			const existing = await this.findProviderResponse(
				PaymentMethod.CRYPTO,
				webhookId,
			);
			if (existing) {
				return { status: 'duplicate' };
			}
			await this.saveProviderResponse(PaymentMethod.CRYPTO, webhookId, payload);
		}

		return { status: 'queued' };
	}

	async processQueuedPaystackWebhook(payload: any): Promise<void> {
		switch (payload.event) {
			case 'charge.success':
				await this.depositService.handleSuccessfulPaystackDeposit(payload.data);
				break;

			case 'charge.failed':
				await this.depositService.handleFailedPaystackDeposit(payload.data);
				break;

			case 'transfer.success':
				await this.withdrawalService.handleSuccessfulPaystackWithdrawal(
					payload.data,
				);
				break;

			case 'transfer.failed':
				await this.withdrawalService.handleFailedPaystackWithdrawal(
					payload.data,
				);
				break;

			default:
				console.warn('Unknown Paystack webhook event:', payload.event);
		}
	}

	/**
	 * Decode the actual depositor address from a GRAPHQL webhook log's data field.
	 * log.data encodes: [address depositor (32 bytes)][uint256 amount (32 bytes)]
	 * The depositor occupies the last 20 bytes (40 hex chars) of the first 32-byte word.
	 * This is more reliable than log.transaction.from which may be a router contract.
	 */
	private decodeDepositorFromLogData(logData: string): string | null {
		try {
			// logData starts with '0x', first word = 32 bytes = 64 hex chars after '0x'
			// Address is right-aligned in the first 32-byte word: bytes 12-31 (chars 26-65 after 0x)
			const depositor = '0x' + logData.slice(26, 66);
			return getAddress(depositor);
		} catch {
			return null;
		}
	}

	async processQueuedCryptoWebhook(payload: any): Promise<void> {
		const eventData = payload.event?.data || payload.event;

		console.log('Webhook parsed payload type:', payload.type);

		if (!eventData?.block) {
			console.log('No block found in payload:', Object.keys(eventData || {}));
			return;
		}

		const { block } = eventData;
		console.log('Processing block:', block.hash);

		const transactions = block.transactions || [];

		if (transactions.length === 0) {
			// GRAPHQL webhook: events come via block.logs[]
			const logs = block.logs || [];
			const processedHashes = new Set();

			for (const log of logs) {
				const hash = log.transaction?.hash;
				if (!hash || processedHashes.has(hash)) continue;
				processedHashes.add(hash);

				// Decode the real depositor from log.data — do NOT use log.transaction.from
				// because that may be a router/DEX contract, not the actual user wallet.
				const depositor = this.decodeDepositorFromLogData(log.data ?? '');
				if (!depositor) {
					console.warn(
						`Could not decode depositor from log data for tx ${hash}, skipping.`,
					);
					continue;
				}

				console.log(
					'Processing tx from log:',
					hash,
					'depositor (from log.data):',
					depositor,
				);

				const existingWithdrawal = await this.db.transaction.findFirst({
					where: { hash, type: TransactionType.WITHDRAWAL },
				});
				if (existingWithdrawal) {
					console.log(
						`Tx ${hash} is a withdrawal, skipping deposit verification.`,
					);
					continue;
				}

				const alreadyProcessed = await this.findProviderResponse(
					PaymentMethod.CRYPTO,
					hash,
				);
				if (alreadyProcessed) {
					console.log(`Tx ${hash} already processed, skipping.`);
					continue;
				}

				try {
					await this.depositService.verifyDeposit(PaymentMethod.CRYPTO, {
						hash,
						buyerAddress: depositor,
					});
				} catch (e) {
					console.error(
						`Error verifying crypto deposit for tx ${hash}:`,
						e.message || e,
					);
				}
			}
		} else {
			// FILTERS webhook: events come via block.transactions[]
			for (const tx of transactions) {
				if (tx.status !== 1) continue;
				console.log('Processing transaction:', tx.hash);

				const existingWithdrawal = await this.db.transaction.findFirst({
					where: { hash: tx.hash, type: TransactionType.WITHDRAWAL },
				});
				if (existingWithdrawal) {
					console.log(
						`Tx ${tx.hash} is a withdrawal, skipping deposit verification.`,
					);
					continue;
				}

				const alreadyProcessed = await this.findProviderResponse(
					PaymentMethod.CRYPTO,
					tx.hash,
				);
				if (alreadyProcessed) {
					console.log(`Tx ${tx.hash} already processed, skipping.`);
					continue;
				}

				try {
					await this.depositService.verifyDeposit(PaymentMethod.CRYPTO, {
						hash: tx.hash,
						buyerAddress: tx.from,
					});
				} catch (e) {
					console.error(
						`Error verifying crypto deposit for tx ${tx.hash}:`,
						e.message || e,
					);
				}
			}
		}
	}
}
