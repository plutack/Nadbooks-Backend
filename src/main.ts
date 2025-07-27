import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import metadata from '@/metadata';
import { AppModule } from './app.module';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	app.enableShutdownHooks();
	app.use(cookieParser());
	app.setGlobalPrefix('api');
	const config = app.get(ConfigService);
	const swaggerConfig = new DocumentBuilder()
		.setTitle('Nadbooks-Backend')
		.setDescription(`nadbooks backend API specification `)
		.setVersion('0.1')
		.build();

	await SwaggerModule.loadPluginMetadata(metadata);
	const apiDoc = () => SwaggerModule.createDocument(app, swaggerConfig);
	SwaggerModule.setup('api/docs', app, apiDoc);
	await app.listen(config.get('PORT') ?? 3000);
}
bootstrap();
