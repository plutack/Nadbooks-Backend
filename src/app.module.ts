import { MiddlewareConsumer, Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { AuthModule } from '@/auth/auth.module';
import { BooksModule } from '@/books/books.module';
import { ExceptionsFilter } from '@/common/exceptions/exceptions.filter';
import { JwtFilter } from '@/common/exceptions/jwt/jwt.filter';
import { PrismaFilter } from '@/common/exceptions/prisma/prisma.filter';
import { ResponseInterceptor } from '@/common/interceptors/response.interceptor';
import { EmailModule } from '@/email/email.module';
import { LoggingMiddleware } from '@/middlewares/logging.middleware';
import { OrdersModule } from '@/orders/orders.module';
import { DepositModule } from '@/payments/deposit/deposit.module';
import { OrderPaymentModule } from '@/payments/order-payment/order-payment.module';
import { WithdrawalModule } from '@/payments/withdrawal/withdrawal.module';
import { PriceFeedModule } from '@/price-feed/price-feed.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { RedisModule } from '@/redis/redis.module';
import { QueueModule } from '@/queue/queue.module';
import { TransactionsModule } from '@/transactions/transactions.module';
import { UserModule } from '@/users/users.module';
import { WalletModule } from '@/wallet/wallet.module';
import { WebhookModule } from '@/webhook/webhook.module';

@Module({
	imports: [
		// Config & Core
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		QueueModule,
		PrismaModule,
		RedisModule,

		// Features
		AuthModule,
		UserModule,
		WalletModule,
		BooksModule,
		OrdersModule,
		TransactionsModule,
		EmailModule,

		// Payments
		OrderPaymentModule,
		DepositModule,
		WithdrawalModule,

		// Integrations
		PriceFeedModule,
		WebhookModule,
	],
	controllers: [AppController],
	providers: [
		AppService,
		{
			provide: APP_FILTER,
			useClass: ExceptionsFilter,
		},
		{
			provide: APP_FILTER,
			useClass: PrismaFilter,
		},
		{
			provide: APP_FILTER,
			useClass: JwtFilter,
		},
		{
			provide: APP_PIPE,
			useValue: new ValidationPipe({
				transform: true,
				whitelist: true,
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
		consumer.apply(LoggingMiddleware).forRoutes('*');
	}
}
