import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from '@/auth/auth.controller';
import { AuthService } from '@/auth/auth.service';
import { GoogleTokenStrategy } from '@/auth/strategies/google-token.strategy';
import { JWTStrategy } from '@/auth/strategies/jwt.strategy';
import { EmailModule } from '@/email/email.module';

@Global()
@Module({
	imports: [
		ConfigModule,
		PassportModule.register({ defaultStrategy: 'jwt' }),
		JwtModule.registerAsync({
			imports: [ConfigModule],
			useFactory: (config: ConfigService) => ({
				secret: config.getOrThrow('JWT_SECRET'),
				signOptions: { expiresIn: config.getOrThrow('JWT_EXPIRES_IN') },
			}),
			inject: [ConfigService],
		}),
		EmailModule,
	],
	controllers: [AuthController],
	providers: [AuthService, JWTStrategy, GoogleTokenStrategy],
	exports: [AuthService, JwtModule],
})
export class AuthModule {}
