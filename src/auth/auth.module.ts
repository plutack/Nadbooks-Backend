import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from "@/prisma/prisma.module"
import { AuthController } from "@/auth/auth.controller"
import { AuthService } from "@/auth/auth.service"
import { JWTStrategy } from "@/auth/strategies/jwt.strategy"
import { GoogleStrategy } from "@/auth/strategies/google.strategy"

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
	exports: [AuthService],
})
export class AuthModule {}
