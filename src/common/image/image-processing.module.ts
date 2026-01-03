import { Module } from '@nestjs/common';
import { ImageProcessingService } from './image-processing.service';
import { SharpImageProcessingService } from './sharp-image-processing.service';

@Module({
	providers: [
		{
			provide: ImageProcessingService,
			useClass: SharpImageProcessingService,
		},
	],
	exports: [ImageProcessingService],
})
export class ImageProcessingModule {}
