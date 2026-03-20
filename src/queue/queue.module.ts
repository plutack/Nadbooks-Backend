import { Module, Global, DynamicModule } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
	imports: [
		BullModule.forRootAsync({
			imports: [ConfigModule],
			useFactory: (config: ConfigService) => ({
				connection: {
					url: config.getOrThrow<string>('REDIS_URL'),
				},
			}),
			inject: [ConfigService],
		}),
	],
	exports: [BullModule],
})
export class QueueModule {
	static forQueue(name: string): DynamicModule {
		return {
			module: QueueModule,
			imports: [
				BullModule.registerQueue({
					name,
				}),
			],
			exports: [BullModule],
		};
	}
}
