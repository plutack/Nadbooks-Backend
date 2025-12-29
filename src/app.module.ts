import {
	MiddlewareConsumer,
	Module,
	RequestMethod,
	ValidationPipe,
	BadRequestException,
} from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { AuthModule } from '@/auth/auth.module';
import { BooksModule } from '@/books/books.module';
import { ExceptionsFilter } from '@/common/exceptions/exceptions.filter';
import { JwtFilter } from '@/common/exceptions/jwt/jwt.filter';
import { LoggerMiddleware } from '@/middlewares/logger.middleware';
import { OrderPaymentModule } from '@/payments/order-payment/order-payment.module';
import { PrismaFilter } from '@/common/exceptions/prisma/prisma.filter';
import { PrismaModule } from '@/prisma/prisma.module';
import { ResponseInterceptor } from '@/common/interceptors/response.interceptor';
import { UserModule } from '@/users/users.module';
import { WalletModule } from '@/wallet/wallet.module';
import { DepositModule } from '@/payments/deposit/deposit.module';
import { WithdrawalModule } from '@/payments/withdrawal/withdrawal.module';
import { PriceFeedModule } from '@/price-feed/price-feed.module';
import { TransactionsModule } from '@/transactions/transactions.module';
import { WebhookModule } from '@/webhook/webhook.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		AuthModule,
		PrismaModule,
		BooksModule,
		UserModule,
		WalletModule,
		PriceFeedModule,
		OrderPaymentModule,
		DepositModule,
		WithdrawalModule,
		WebhookModule,
		TransactionsModule,
	],
	controllers: [AppController],
	providers: [
		AppService,
		{
			provide: APP_FILTER,
			useClass: PrismaFilter,
		},
		{
			provide: APP_FILTER,
			useClass: JwtFilter,
		},
		{
			provide: APP_FILTER,
			useClass: ExceptionsFilter,
		},
		{
			provide: APP_PIPE,
			useValue: new ValidationPipe({
				transform: true,
				whitelist: true,
				exceptionFactory: (errors) => {
					console.error('Validation errors:', errors);
					return new BadRequestException(errors);
				},
			}),
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: ResponseInterceptor,
		},
	],
})
export class AppModule {
	configure(consumer: MiddlewareConsumer) {
		consumer
			.apply(LoggerMiddleware)
			.forRoutes({ path: '*path', method: RequestMethod.ALL });
	}
}
