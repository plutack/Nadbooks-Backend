import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { AuthModule } from '@/auth/auth.module';
import { BooksModule } from '@/books/books.module';
import { LoggerMiddleware } from '@/middlewares/logger.middleware';
import { OrderPaymentModule } from '@/payments/order-payment/order-payment.module';
import { PrismaModule } from '@/prisma/prisma.module';
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
	providers: [AppService],
})
export class AppModule {
	configure(consumer: MiddlewareConsumer) {
		consumer
			.apply(LoggerMiddleware)
			.forRoutes({ path: '*', method: RequestMethod.ALL });
	}
}
