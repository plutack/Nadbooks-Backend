import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	app.enableShutdownHooks();
	app.use(cookieParser());
	app.setGlobalPrefix("api")
	const config = app.get(ConfigService);
	await app.listen(config.get('PORT') ?? 3000);
}
bootstrap();
