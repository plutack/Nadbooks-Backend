import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtPayloadType } from '@/types/jwt.type';
import { Role } from 'generated/prisma';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';

@Injectable()
export class UserService {
	constructor(private readonly db: PrismaService) {}

	/**
	 * Returns the profile of the currently authenticated user.
	 */
	async getProfile(userId: string) {
		const existingUser = await this.db.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				firstName: true,
				lastName: true,
				username: true,
				email: true,
				wallet: {
					select: {
						balance: true,
					},
				},
			},
		});

		if (!existingUser) {
			throw NotFoundException;
		}

		return existingUser;
	}

	/**
	 * Returns bookmarks of the currently authenticated user.
	 */
	async getBookMarkedBooks(userId: string) {
		const bookmarks = await this.db.bookBookmark.findMany({
			where: { userId },
			select: {
				book: true,
			},
		});

		return bookmarks;
	}

	// Admin functionality consolidated below

	async findUserById(userId: string) {
		const user = await this.db.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				firstName: true,
				createdAt: true,
				updatedAt: true,
				isVerified: true,
				username: true,
				email: true,
				isActive: true, // Added isActive as it might be needed for admin view
				role: true,
			},
		});

		if (!user) {
			throw new NotFoundException('User not found');
		}

		return user;
	}

	async getUsers(limit: number = 10, skip: number = 0) {
		return await this.db.user.findMany({
			select: {
				id: true,
				firstName: true,
				createdAt: true,
				updatedAt: true,
				isVerified: true,
			},
			take: limit,
			skip,
		});
	}

	async updateUser(userId: string, payload: any) {
		// Using any for payload here to avoid circular dependencies if DTO is in admin
		// Ideally DTOs should be shared or defined in a common place
		// For now simple cleanObject approach
		return await this.db.user.update({
			where: { id: userId },
			data: payload, // Assuming payload is already clean or cleanObject is handled in controller
		});
	}

	async updateUserActiveState(
		requesterRole: Role,
		userId: string,
		activate: boolean,
	) {
		const target = await this.db.user.findUnique({
			where: { id: userId },
			select: { role: true },
		});
		if (!target) throw new NotFoundException('User not found');

		// Enforce Hierarchy
		if (requesterRole === Role.ADMIN) {
			if (target.role === Role.ADMIN || target.role === Role.SUPER_ADMIN) {
				throw new UnauthorizedException(
					'Admins cannot update status of other Admins',
				);
			}
		}

		// TODO: send an email
		return await this.db.user.update({
			where: { id: userId },
			data: { isActive: activate },
		});
	}

	async updateUserVerification(userId: string, verify: boolean) {
		return await this.db.user.update({
			where: { id: userId },
			data: { isVerified: verify },
		});
	}

	async updateUserRole(
		requesterId: string,
		requesterRole: Role,
		targetUserId: string,
		newRole: Role,
	) {
		if (requesterRole !== Role.SUPER_ADMIN && requesterRole !== Role.ADMIN) {
			throw new UnauthorizedException('Insufficient permissions');
		}

		const targetUser = await this.db.user.findUnique({
			where: { id: targetUserId },
			select: { role: true },
		});

		if (!targetUser) {
			throw new NotFoundException('User not found');
		}

		// LOGIC:
		// 1. SUPER_ADMIN can do anything (assign ADMIN, SUPER_ADMIN).
		// 2. ADMIN can only assign ADMIN. Cannot assign SUPER_ADMIN.
		// 3. ADMIN cannot demote/change another ADMIN or SUPER_ADMIN (effectively "removing" admin).
		//    - If target is ADMIN, requester must be SUPER_ADMIN to change it.
		//    - If target is SUPER_ADMIN, requester must be SUPER_ADMIN (conceptually).
		// 4. ADMIN can promote USER to ADMIN.

		if (requesterRole === Role.ADMIN) {
			if (newRole === Role.SUPER_ADMIN) {
				throw new UnauthorizedException('Admins cannot create Super Admins');
			}
			if (
				targetUser.role === Role.ADMIN ||
				targetUser.role === Role.SUPER_ADMIN
			) {
				throw new UnauthorizedException('Admins cannot modify other Admins');
			}
		}

		return await this.db.$transaction(async (tx) => {
			const updatedUser = await tx.user.update({
				where: { id: targetUserId },
				data: { role: newRole },
			});

			await tx.roleChange.create({
				data: {
					fromRole: targetUser.role,
					toRole: newRole,
					changedById: requesterId,
					userId: targetUserId,
				},
			});

			return updatedUser;
		});
	}
}
