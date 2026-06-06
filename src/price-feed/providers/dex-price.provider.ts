import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Contract, formatUnits, JsonRpcProvider, parseUnits } from 'ethers';

@Injectable()
export class DexPriceService {
	private readonly logger = new Logger(DexPriceService.name);
	private readonly provider: JsonRpcProvider;
	private readonly pool: Contract;

	private readonly poolAddress = '0x3a3ebae0eec80852fbc7b9e824c6756969cc8dc1';
	private readonly usdtAddress = '0x88b8e2161dedc77ef4ab7585569d2415a1c1055d';
	private readonly wmonAddress = '0x760afe86e5de5fa0ee542bfc7b76711c40323ddb'; // Standard Monad testnet WMON

	private readonly booksAddress: string;
	private readonly booksUsdtPoolAddress: string;

	// Fallback prices used only until the on-chain DEX pools are live; once the
	// blockchain integration is wired up these branches stop being hit.
	private readonly mockPrice = 1.5;
	private readonly mockBooksPrice = 0.00073;

	private readonly ABI = [
		'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
	];

	constructor(config: ConfigService) {
		const rpcUrl = config.getOrThrow<string>('ALCHEMY_RPC_URL');
		this.provider = new JsonRpcProvider(rpcUrl);
		this.pool = new Contract(this.poolAddress, this.ABI, this.provider);

		this.booksAddress =
			config.get<string>('BOOKS_ADDRESS') ??
			'0x0000000000000000000000000000000000000000';
		this.booksUsdtPoolAddress =
			config.get<string>('BOOKS_USDT_POOL_ADDRESS') ??
			'0x0000000000000000000000000000000000000000';
	}

	/**
	 * Returns the USDT price of 1 MON by querying the on-chain DEX pool.
	 * Uses WMON (pool.WETH()) as the input token.
	 * This is a view call — no gas, just an RPC eth_call.
	 * Falls back to configured mock price if DEX call fails.
	 */
	async getMonPriceInUsdt(): Promise<number> {
		try {
			const path = [this.wmonAddress, this.usdtAddress];

			const amountsOut = await this.pool.getAmountsOut(
				parseUnits('1', 18), // 1 MON (18 decimals)
				path,
			);

			// USDT has 6 decimals
			const usdtOut = parseFloat(formatUnits(amountsOut[1], 6));
			this.logger.debug(`MON price: $${usdtOut} USDT`);
			return usdtOut;
		} catch (err) {
			this.logger.warn(
				`Failed to fetch MON price from DEX, using mock price: ${this.mockPrice}. Error: ${err?.message ?? err}`,
			);
			return this.mockPrice;
		}
	}

	/**
	 * Returns the USDT price of 1 BOOK by querying the on-chain BOOKS/USDT pool.
	 * Falls back to configured mock price if contract call fails.
	 */
	async getBooksPriceInUsdt(): Promise<number> {
		try {
			const booksPool = new Contract(
				this.booksUsdtPoolAddress,
				this.ABI,
				this.provider,
			);
			const path = [this.booksAddress, this.usdtAddress];

			const amountsOut = await booksPool.getAmountsOut(
				parseUnits('1', 18), // 1 BOOK (18 decimals)
				path,
			);

			const usdtOut = parseFloat(formatUnits(amountsOut[1], 6));
			this.logger.debug(`BOOKS price: $${usdtOut} USDT`);
			return usdtOut;
		} catch (err) {
			this.logger.warn(
				`Failed to fetch BOOKS price from DEX, using mock price: ${this.mockBooksPrice}. Error: ${err?.message ?? err}`,
			);
			return this.mockBooksPrice;
		}
	}
}
