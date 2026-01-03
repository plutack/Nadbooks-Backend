import { Injectable, Logger } from '@nestjs/common';
import { ImageProcessingService } from './image-processing.service';
import sharp from 'sharp';

@Injectable()
export class SharpImageProcessingService implements ImageProcessingService {
	private readonly logger = new Logger(SharpImageProcessingService.name);

	async resizeAndOptimize(buffer: Buffer): Promise<Buffer> {
		try {
			const image = sharp(buffer);
			const metadata = await image.metadata();

			if (!metadata.format) {
				return buffer;
			}

			return await image
				.resize({
					width: 1600,
					height: 2560,
					fit: 'inside',
					withoutEnlargement: true,
				})
				.jpeg({
					quality: 80,
				})
				.toBuffer();
		} catch (error) {
			this.logger.warn(
				`Failed to optimize image: ${error.message}. Returning original buffer.`,
			);
			return buffer;
		}
	}
}
