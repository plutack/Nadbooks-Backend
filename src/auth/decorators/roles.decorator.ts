import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { Role } from 'generated/prisma';
import { AuthGuard } from '@/auth/auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const AdminAuth = () =>
	applyDecorators(
		UseGuards(AuthGuard, RolesGuard),
		Roles(Role.ADMIN, Role.SUPER_ADMIN),
	);
