import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from '@/app.module';

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

	const isDev = nodeEnv === 'development';
	app.enableCors({
		origin: isDev ? true : frontendOrigins,
		credentials: true,
	});

	app.setGlobalPrefix('api');

	await app.listen(config.getOrThrow('PORT', 3000));
}

bootstrap();
