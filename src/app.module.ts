import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { AuthModule } from '@/auth/auth.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { BooksModule } from './books/books.module';
import { LoggerMiddleware } from './middlewares/logger.middleware';
import { UserModule } from './users/users.module';
import { AdminModule } from './admin/admin.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		AuthModule,
		PrismaModule,
		BooksModule,
		UserModule,
		AdminModule,
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
