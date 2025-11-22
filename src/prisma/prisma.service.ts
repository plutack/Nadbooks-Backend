import {
	Injectable,
	Logger,
	OnModuleDestroy,
	OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from 'generated/prisma';

@Injectable()
export class PrismaService
	extends PrismaClient
	implements OnModuleInit, OnModuleDestroy
{
	private readonly logger = new Logger('Database Core');
	constructor(config: ConfigService) {
		super({
			datasourceUrl: config.getOrThrow('DATABASE_URL'),
		});
	}

	async onModuleInit() {
		await this.$connect();
		this.logger.log('Connected to DB');
	}

	async onModuleDestroy() {
		await this.$disconnect();
		this.logger.log('Connection terminated');
	}
}
