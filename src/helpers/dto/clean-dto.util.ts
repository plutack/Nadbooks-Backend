export function cleanObject<T extends Record<string, any>>(obj: T): Partial<T> {
	return Object.fromEntries(
		Object.entries(obj).filter(([_, v]) => v !== undefined),
	) as Partial<T>;
}
