import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from '@/auth/auth.controller';
import { AuthService } from '@/auth/auth.service';
import { GoogleStrategy } from '@/auth/strategies/google.strategy';
import { JWTStrategy } from '@/auth/strategies/jwt.strategy';
import { PrismaModule } from '@/prisma/prisma.module';

@Global()
@Module({
	imports: [
		ConfigModule,
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
	controllers: [AuthController],
	providers: [AuthService, JWTStrategy, GoogleStrategy],
	exports: [AuthService, JwtModule],
})
export class AuthModule {}
