import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Contract, formatUnits, JsonRpcProvider, parseUnits } from 'ethers';

@Injectable()
export class DexPriceService {
	private readonly provider: JsonRpcProvider;
	private readonly pool: Contract;

	// TODO: convert all this to envs
	private readonly poolAddress = '0x3a3eBAe0Eec80852FBC7B9E824C6756969cc8dc1';
	private readonly bookAddress = '0x5f692Ae8f4C5D216C8578bf3857C88C35F39De2B';
	private readonly usdtAddress = '0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D';

	private readonly ABI = [
		'function WETH() external pure returns (address)',
		'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
	];

	constructor(config: ConfigService) {
		const rpcUrl = config.getOrThrow<string>('ALCHEMY_RPC_URL');
		this.provider = new JsonRpcProvider(rpcUrl);
		this.pool = new Contract(this.poolAddress, this.ABI, this.provider);
	}

	async getBookAmountForUSDT(usdtAmount: number): Promise<number> {
		const mon = await this.pool.WETH();

		const path = [this.usdtAddress, mon, this.bookAddress];

		const amountsOut = await this.pool.getAmountsOut(
			parseUnits(usdtAmount.toString(), 6),
			path,
		);

		const bookOut = parseFloat(formatUnits(amountsOut[2], 18));
		return bookOut;
	}
}
