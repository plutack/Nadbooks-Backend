import { IsEnum } from 'class-validator';

/** Admin review decision — a book can only be moved to APPROVED or REJECTED. */
export enum BookReviewDecision {
	APPROVED = 'APPROVED',
	REJECTED = 'REJECTED',
}

export class ReviewBookDto {
	@IsEnum(BookReviewDecision)
	status: BookReviewDecision;
}
