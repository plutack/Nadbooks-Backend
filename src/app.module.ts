import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { AuthModule } from '@/auth/auth.module';
import { BooksModule } from '@/books/books.module';
import { LoggerMiddleware } from '@/middlewares/logger.middleware';
import { PaymentModule } from '@/payment/payment.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { UserModule } from '@/users/users.module';
import { WalletModule } from '@/wallet/wallet.module';
import { PaymentModule } from './payment/payment.module';

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
		PaymentModule,
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
