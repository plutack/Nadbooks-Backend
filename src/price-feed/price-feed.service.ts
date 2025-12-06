import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { firstValueFrom } from 'rxjs';

export enum ConversionDirection {
	NGN_TO_BOOKS = 'NGN_TO_BOOKS',
	BOOKS_TO_NGN = 'BOOKS_TO_NGN',
	MON_TO_BOOKS = 'MON_TO_BOOKS',
	BOOKS_TO_MON = 'BOOKS_TO_MON',
}

@Injectable()
export class PriceFeedService {
	private readonly logger = new Logger(PriceFeedService.name);

	constructor(
		private readonly http: HttpService,
		private readonly fiatConvertService: FiatPriceConvertService,
	) {}

	async getConversionPreview(amount: number, direction: ConversionDirection) {
		const decimalAmount = new Decimal(amount);

		if (direction === ConversionDirection.BOOKS_TO_NGN) {
			const amountInNgn = await this.convertBooksToNgn(decimalAmount);
			return {
				from: 'BOOKS',
				to: 'NGN',
				amountIn: decimalAmount,
				amountOut: amountInNgn,
			};
		}

		if (direction === ConversionDirection.NGN_TO_BOOKS) {
			const amountInBooks = await this.convertNgnToBooks(decimalAmount);
			return {
				from: 'NGN',
				to: 'BOOKS',
				amountIn: decimalAmount,
				amountOut: amountInBooks,
			};
		}
	} /**
	 * Fetch the latest NGN → BOOKS rate from an external source
	 */
	private async fetchBooksPerNgnRate(): Promise<Decimal> {
		const USDtoNGNRate = this.fiatConvertService.getUSDToNGNRate();

		const rate = new Decimal(USDtoNGNRate);
		this.logger.debug(`Fetched fresh NGN_TO_BOOKS_RATE: ${rate.toString()}`);
		pen / home / plutack / projects / Nadbooks -
			Backend / src / price -
			feed / providers / monad -
			price.provider.ts;
		u;
		return rate;
	}

	// NOTE: might need to change this function signature to take the currency type when stripe is integrated
	async convertNgnToBooks(amountNgn: Decimal): Promise<Decimal> {
		const booksPerNgn = await this.fetchBooksPerNgnRate();
		return amountNgn.mul(booksPerNgn);
	}

	async convertBooksToNgn(amountBooks: Decimal): Promise<Decimal> {
		const booksPerNgn = await this.fetchBooksPerNgnRate();
		const ngnPerBook = new Decimal(1).div(booksPerNgn);
		return amountBooks.mul(ngnPerBook);
	}

	async convertBooksToMon(amountBooks: Decimal): Promise<Decimal> {
		// TODO: Replace with actual conversion logic
		const booksPerMonad = new Decimal(100);
		return amountBooks.div(booksPerMonad);
	}
}

import { parseUnits, JsonRpcProvider, formatUnits, Contract } from 'ethers';
import { FiatPriceConvertService } from './providers/fiat-price.provider';

const pool_contract_address = '0x3a3eBAe0Eec80852FBC7B9E824C6756969cc8dc1';
const book_contract_address = '0x5f692Ae8f4C5D216C8578bf3857C88C35F39De2B';
const usdt_contract_address = '0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D';

const ABI = [
	'function WETH() external pure returns (address)',
	'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
];
const provider = new JsonRpcProvider('https://testnet-rpc.monad.xyz');

const pool_contract = new Contract(pool_contract_address, ABI, provider);

async function getAmountsOut() {
	// get Mon contract address

	const Mon = await pool_contract.WETH();

	// book to mon swap direction

	const book_to_Mon_path = [book_contract_address, Mon];

	const amount = 1000;

	const books_Mon = await pool_contract.getAmountsOut(
		parseUnits(amount.toString(), 18),
		book_to_Mon_path,
	);

	console.log(amount, ' books to mon is :  ', formatUnits(books_Mon[1], 18));

	// mon to usdt swap direction

	const mon_to_usdt_path = [Mon, usdt_contract_address];

	const mon_Usdt = await pool_contract.getAmountsOut(
		books_Mon[1],
		mon_to_usdt_path,
	);

	console.log(
		formatUnits(mon_Usdt[0].toString(), 18),
		' Mon to Usdt is : ',
		formatUnits(mon_Usdt[1], 6),
	);

	// get usdt price from coingecko

	const response = await fetch(
		'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=ngn',
	);

	const price_Json = await response.json();

	const ngn_price = price_Json.tether.ngn;

	const book_usdt = formatUnits(mon_Usdt[1], 6);

	console.log(amount, ' books to ngn is : ', ngn_price * book_usdt, ' Naira');
}
getAmountsOut();
