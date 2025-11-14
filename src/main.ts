import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from '@/app.module';
import metadata from '@/metadata';
import { ExceptionsFilter } from '@/common/exceptions/exceptions.filter';
import { JwtFilter } from '@/common/exceptions/jwt/jwt.filter';
import { PrismaFilter } from '@/common/exceptions/prisma/prisma.filter';
import { ResponseInterceptor } from '@/common/interceptors/response.interceptor';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	const config = app.get(ConfigService);

	const nodeEnv = config.get<string>('NODE_ENV');
	const rawOrigins = config.get<string>('FRONTEND_ORIGIN_PREFIX');

	if (!nodeEnv || !rawOrigins) {
		throw new Error('Environment variables not properly set');
	}

	const frontendOrigins = rawOrigins
		.split(',')
		.map((origin) => origin.trim())
		.filter(Boolean);

	app.enableShutdownHooks();
	app.use(cookieParser());
	app.useGlobalPipes(new ValidationPipe());

	app.useGlobalFilters(
		new JwtFilter(),
		new PrismaFilter(),
		new ExceptionsFilter(),
	);

	app.useGlobalInterceptors(new ResponseInterceptor());

	const isDev = nodeEnv === 'development';
	app.enableCors({
		origin: isDev ? true : frontendOrigins,
		credentials: true,
	});

	app.setGlobalPrefix('api');

	const swaggerConfig = new DocumentBuilder()
		.setTitle('Nadbooks-Backend')
		.setDescription('Nadbooks backend API specification')
		.setVersion('0.1')
		.build();

	await SwaggerModule.loadPluginMetadata(metadata);
	const apiDoc = () => SwaggerModule.createDocument(app, swaggerConfig);
	SwaggerModule.setup('api/docs', app, apiDoc);

	await app.listen(config.get('PORT') ?? 3000);
}

bootstrap();
