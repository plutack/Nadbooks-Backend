import { IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from 'generated/prisma';

export class UpdateUserRoleDto {
	@IsNotEmpty()
	@IsEnum(Role)
	role: Role;
}
