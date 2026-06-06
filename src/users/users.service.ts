import {
	BadRequestException,
	Injectable,
	NotFoundException,
	UnauthorizedException,
} from '@nestjs/common';
import { Prisma, Role, SocialPlatform } from 'generated/prisma';
import { FileType } from '@/books/types';
import { ImageProcessingService } from '@/common/image/image-processing.service';
import { ALLOWED_IMAGE_LABELS, assertAllowedType } from '@/common/mime';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/storage/storage.service';
import { UpdateSocialsDto } from './dtos/update-socials.dto';

@Injectable()
export class UserService {
	constructor(
		private readonly db: PrismaService,
		private readonly storageService: StorageService,
		private readonly imageProcessor: ImageProcessingService,
	) {}

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
				passwordHash: true,
				avatarURL: true,
				wallet: {
					select: {
						balance: true,
					},
				},
				socialLinks: {
					select: {
						platform: true,
						url: true,
					},
				},
			},
		});

		if (!existingUser) {
			throw NotFoundException;
		}

		return {
			id: existingUser.id,
			firstName: existingUser.firstName,
			lastName: existingUser.lastName,
			username: existingUser.username,
			email: existingUser.email,
			avatarURL: existingUser.avatarURL,
			hasPassword: !!existingUser.passwordHash,
			wallet: existingUser.wallet,
			socialLinks: existingUser.socialLinks,
		};
	}

	/**
	 * Resizes/optimizes the uploaded image, stores it in the public bucket, and
	 * sets it as the user's avatar. Removes the previous avatar so it doesn't orphan.
	 */
	async updateAvatar(userId: string, file: Express.Multer.File) {
		if (!file) {
			throw new BadRequestException('Avatar image is required');
		}

		// Validate the bytes are actually an image before processing/uploading.
		assertAllowedType(file.buffer, ALLOWED_IMAGE_LABELS);

		const processed = await this.imageProcessor.resizeAndOptimize(file.buffer);
		if (!processed) {
			throw new BadRequestException('Invalid avatar image');
		}

		const processedFile = {
			...file,
			buffer: processed,
			mimetype: 'image/jpeg',
		};

		const avatarURL = await this.storageService.storeFile(
			FileType.AVATAR,
			processedFile,
			userId,
		);

		const current = await this.db.user.findUnique({
			where: { id: userId },
			select: { avatarURL: true },
		});

		await this.db.user.update({
			where: { id: userId },
			data: { avatarURL },
		});

		if (current?.avatarURL) {
			await this.storageService.deleteFile(current.avatarURL);
		}

		return { avatarURL };
	}

	/**
	 * Sets or clears the social media links of the currently authenticated user.
	 */
	async updateSocials(userId: string, dto: UpdateSocialsDto) {
		const entries: { platform: SocialPlatform; value?: string }[] = [
			{ platform: SocialPlatform.INSTAGRAM, value: dto.instagram },
			{ platform: SocialPlatform.TWITTER, value: dto.twitter },
			{ platform: SocialPlatform.FACEBOOK, value: dto.facebook },
		];

		for (const { platform, value } of entries) {
			if (value === undefined) {
				continue;
			}

			if (value === '') {
				await this.db.socialLink.deleteMany({
					where: { userId, platform },
				});
				continue;
			}

			await this.db.socialLink.upsert({
				where: { userId_platform: { userId, platform } },
				create: { userId, platform, url: value },
				update: { url: value },
			});
		}

		return this.db.socialLink.findMany({
			where: { userId },
			select: { platform: true, url: true },
		});
	}

	async updateProfile(
		userId: string,
		payload: { firstName?: string; lastName?: string; username?: string },
	) {
		const existingUser = await this.db.user.findUnique({
			where: { id: userId },
		});

		if (!existingUser) {
			throw new NotFoundException('User not found');
		}

		return await this.db.user.update({
			where: { id: userId },
			data: {
				firstName: payload.firstName ?? existingUser.firstName,
				lastName: payload.lastName ?? existingUser.lastName,
				username: payload.username ?? existingUser.username,
			},
			select: {
				id: true,
				firstName: true,
				lastName: true,
				username: true,
				email: true,
			},
		});
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

	async getUsers(
		limit: number = 10,
		skip: number = 0,
		search?: string,
		role?: Role,
	) {
		const where: Prisma.UserWhereInput = {};

		if (role) {
			where.role = role;
		}

		if (search) {
			where.OR = [
				{ username: { contains: search } },
				{ email: { contains: search } },
				{ firstName: { contains: search } },
				{ lastName: { contains: search } },
			];
		}

		return await this.db.user.findMany({
			where,
			select: {
				id: true,
				firstName: true,
				lastName: true,
				username: true,
				email: true,
				role: true,
				isActive: true,
				isVerified: true,
				createdAt: true,
				updatedAt: true,
			},
			take: limit,
			skip,
		});
	}

	/** Audit trail of role changes for a user (most recent first). */
	async getRoleHistory(userId: string) {
		return await this.db.roleChange.findMany({
			where: { userId },
			orderBy: { createdAt: 'desc' },
			select: {
				fromRole: true,
				toRole: true,
				createdAt: true,
				changedBy: {
					select: { id: true, username: true },
				},
			},
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
