import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from '@/app.module';
import metadata from '@/metadata';
import { JwtFilter } from './exceptions/jwt/jwt.filter';
import { PrismaFilter } from './exceptions/prisma/prisma.filter';
import { ExceptionsFilter } from './exceptions/exceptions.filter';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	const config = app.get(ConfigService);

	const nodeEnv = config.get<string>('NODE_ENV');
	const rawOrigins = config.get<string>('FRONTEND_ORIGIN_PREFIX');

	if (!nodeEnv || !rawOrigins)
		throw new Error('Environment variables not properly set');

	const frontendOrigins = rawOrigins
		.split(',')
		.map((origin) => origin.trim())
		.filter(Boolean);

	app.enableShutdownHooks();
	app.use(cookieParser());
	app.useGlobalPipes(
		new ValidationPipe({
			transform: true,
			forbidNonWhitelisted: false,
			whitelist: true,
		}),
	);
	app.useGlobalFilters(new JwtFilter());
	app.useGlobalFilters(new PrismaFilter());
	app.useGlobalFilters(new ExceptionsFilter());

	app.enableCors({
		origin: (origin: string | undefined, callback: Function) => {
			if (!origin && nodeEnv === 'development') {
				return callback(null, true);
			}
			if (
				origin &&
				frontendOrigins.some((prefix) => origin.startsWith(prefix))
			) {
				return callback(null, true);
			}
			return callback(new Error('Origin not allowed by CORS'));
		},
	});

	app.setGlobalPrefix('api');

	const swaggerConfig = new DocumentBuilder()
		.setTitle('Nadbooks-Backend')
		.setDescription(`nadbooks backend API specification`)
		.setVersion('0.1')
		.build();

	await SwaggerModule.loadPluginMetadata(metadata);
	const apiDoc = () => SwaggerModule.createDocument(app, swaggerConfig);
	SwaggerModule.setup('api/docs', app, apiDoc);

	await app.listen(config.get('PORT') ?? 3000);
}
bootstrap();
