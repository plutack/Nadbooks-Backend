import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import metadata from '@/metadata';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	app.enableShutdownHooks();
	app.use(cookieParser());
	app.setGlobalPrefix("api")
	const config = app.get(ConfigService);
	const swaggerConfig = new DocumentBuilder()
		.setTitle('Nadbooks-Backend')
		.setDescription(`nadbooks backend API specification `)
		.setVersion('0.1')
		.build();

	await SwaggerModule.loadPluginMetadata(metadata);
	const apiDoc = () => SwaggerModule.createDocument(app, swaggerConfig);
	SwaggerModule.setup('docs', app, apiDoc);
	await app.listen(config.get('PORT') ?? 3000);
}
bootstrap();
