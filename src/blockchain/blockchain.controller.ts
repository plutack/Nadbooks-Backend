import { Body, Controller, Post } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { VerifyPaymentDto } from './dtos/blockchain.dtos';

@Controller('blockchain')
export class BlockchainController {
	constructor(private blockchainService: BlockchainService) {}

	@Post('buybook')
	buybook(@Body() body: VerifyPaymentDto) {
		return this.blockchainService.verifyPayment(body);
	}
}
