import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from '@/app.module';
import { ExceptionsFilter } from '@/common/exceptions/exceptions.filter';
import { JwtFilter } from '@/common/exceptions/jwt/jwt.filter';
import { PrismaFilter } from '@/common/exceptions/prisma/prisma.filter';
import { ResponseInterceptor } from '@/common/interceptors/response.interceptor';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	const config = app.get(ConfigService);

	const nodeEnv = config.getOrThrow<string>('NODE_ENV');
	const rawOrigins = config.getOrThrow<string>('FRONTEND_ORIGIN_PREFIX');

	const frontendOrigins = rawOrigins
		.split(',')
		.map((origin) => origin.trim())
		.filter(Boolean);

	app.enableShutdownHooks();
	app.use(cookieParser());
	app.useGlobalPipes(
		new ValidationPipe({
			transform: true,
			whitelist: true,
			exceptionFactory: (errors) => {
				console.error('Validation errors:', errors);
				return new BadRequestException(errors);
			},
		}),
	);

	app.useGlobalFilters(
		new PrismaFilter(),
		new JwtFilter(),
		new ExceptionsFilter(),
	);

	app.useGlobalInterceptors(new ResponseInterceptor());

	const isDev = nodeEnv === 'development';
	app.enableCors({
		origin: isDev ? true : frontendOrigins,
		credentials: true,
	});

	app.setGlobalPrefix('api');

	await app.listen(config.getOrThrow('PORT', 3000));
}

bootstrap();
