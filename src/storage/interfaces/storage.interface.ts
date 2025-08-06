export interface IStorageService {
	storeFile(file: Express.Multer.File, fileName: string): Promise<string>;
}
