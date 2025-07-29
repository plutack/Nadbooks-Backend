import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import metadata from '@/metadata';
import { AppModule } from './app.module';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	const config = app.get(ConfigService);

	const nodeEnv = config.get<string>('NODE_ENV');
	const frontendOrigin = config.get<string>('FRONTEND_ORIGIN_PREFIX');

	if (!nodeEnv || !frontendOrigin)
		throw new Error('Enviroment Variables not properly set');

	app.enableShutdownHooks();
	app.use(cookieParser());
	app.enableCors({
		origin: (origin: string | undefined, callback: Function) => {
			if (!origin && nodeEnv === 'development') {
				return callback(null, true);
			}

			if (origin) {
				if (nodeEnv === 'development' && origin.startsWith(frontendOrigin)) {
					return callback(null, true);
				}
				if (nodeEnv === 'production' && origin.startsWith(frontendOrigin)) {
					return callback(null, true);
				}
			}
			return callback(new Error('Origin not allowed by CORS'));
		},
	});
	app.setGlobalPrefix('api');
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
