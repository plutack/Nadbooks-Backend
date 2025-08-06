import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '@/prisma/prisma.module';
import { StorageService } from '@/storage/storage.service';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { StorageModule } from '@/storage/storage.module';

@Module({
	imports: [
		PrismaModule,
		StorageModule,
		JwtModule.registerAsync({
			imports: [ConfigModule],
			useFactory: (config: ConfigService) => ({
				secret: config.get('JWT_SECRET'),
				signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') },
			}),
			inject: [ConfigService],
		}),
	],
	controllers: [BooksController],
	providers: [BooksService],
})
export class BooksModule {}
