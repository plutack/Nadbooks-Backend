export type BaseFilterQueryType = {
	limit?: number;
	skip?: number;
};

export type BookFilterQueryType = BaseFilterQueryType & {
	genre?: string;
	authorId?: string;
	minPrice?: number;
	maxPrice?: number;
	isMature?: boolean;
	dateAuthoredFrom?: string;
	dateAuthoredTo?: string;
};
