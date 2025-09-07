import { Book } from 'generated/prisma';

export enum FileType {
	BOOK = 'BOOK',
	COVER = 'COVER',
}

export type UpdatableBookFields = Omit<
	Book,
	'id' | 'author' | 'userId' | 'dateUploaded'
>;
