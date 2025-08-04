import { Module } from '@nestjs/common';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { DropboxService } from '@/dropbox/dropbox.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

@Module({
    imports:[
        PrismaModule,
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
    providers:[BooksService, DropboxService]
})
export class BooksModule {}
