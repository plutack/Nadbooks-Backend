import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from '@/app.module';
import { isDev } from '@/helpers/functions';

async function bootstrap() {
	const app = await NestFactory.create(AppModule, { rawBody: true });
	const config = app.get(ConfigService);

	const rawOrigins = config.getOrThrow<string>('FRONTEND_ORIGIN_PREFIX');

	const frontendOrigins = rawOrigins
		.split(',')
		.map((origin) => origin.trim())
		.filter(Boolean);

	app.enableShutdownHooks();
	app.use(cookieParser());

	app.enableCors({
		origin: isDev(config) ? true : frontendOrigins,
		credentials: true,
	});

	app.setGlobalPrefix('api');

	await app.listen(config.getOrThrow('PORT', 3000));
}

bootstrap();
