import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtGuard } from './auth/jwt.guard';

@Controller()
export class AppController {
	constructor(private readonly appService: AppService) {}

	@Get()
	@UseGuards(JwtGuard)
	getHello(): string {
		return this.appService.getHello();
	}
}
