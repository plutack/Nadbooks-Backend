export abstract class ImageProcessingService {
	abstract resizeAndOptimize(buffer: Buffer): Promise<Buffer>;
}
