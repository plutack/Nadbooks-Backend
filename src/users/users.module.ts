import { Module } from '@nestjs/common';
import { ImageProcessingModule } from '@/common/image/image-processing.module';
import { StorageModule } from '@/storage/storage.module';
import { UserController } from './users.controller';
import { UserService } from './users.service';

@Module({
	imports: [StorageModule, ImageProcessingModule],
	controllers: [UserController],
	providers: [UserService],
	exports: [UserService],
})
export class UserModule {}
