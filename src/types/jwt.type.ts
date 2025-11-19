import { Role } from 'generated/prisma';

export type JwtPayloadType = {
	sub: string;
	username: string;
	email: string;
	role: Role;
};
