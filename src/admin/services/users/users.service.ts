import { EditUserDto } from '@/admin/dto/users/edit-user.dto';
import { UserActivation } from '@/admin/dto/users/update-user-activation.dto';
import { UserVerification } from '@/admin/dto/users/verify-user.dto';
import { cleanObject } from '@/helpers/dto/clean-dto.util';
import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class UsersService {
	private readonly fieldsToSelect = {
		id: true,
		firstName: true,
		lastName: true,
		username: true,
		email: true,
		authMode: true,
		createdAt: true,
		updatedAt: true,
		isVerified: true,
	};
	constructor(private readonly db: PrismaService) {}
	private async getUserById(userId: number) {
		return await this.db.user.findFirst({
			where: { id: userId },
			select: this.fieldsToSelect,
		});
	}

	async findUserById(userId: number) {
		const user = await this.getUserById(userId);
		if (!user) {
			throw new NotFoundException('User not found');
		}
		return user;
	}

	async getUsers(limit: number = 10, skip: number = 0) {
		return await this.db.user.findMany({
			select: this.fieldsToSelect,
			take: limit,
			skip,
		});
	}

	async updateUser(userId: number, payload: EditUserDto) {
		return await this.db.user.update({
			where: { id: userId },
			data: cleanObject(payload),
		});
	}

	async updateUserActiveState(userId: number, action: UserActivation) {
		let activation: boolean;
		if (action === UserActivation.ACTIVATE) {
			activation = true;
		} else {
			activation = false;
		}
		// TODO: send an email
		return await this.db.user.update({
			where: { id: userId },
			data: { isActive: activation },
		});
	}

	async updateUserVerification(userId: number, action: UserVerification) {
		let verification: boolean;
		if (action === UserVerification.VERIFY) {
			verification = true;
		} else {
			verification = false;
		}
		return await this.db.user.update({
			where: { id: userId },
			data: { isVerified: verification },
		});
	}

	async isAdmin(userId: number) {
		const admin = await this.db.user.findFirst({
			where: { id: userId, isAdmin: true },
		});

		if (!admin) {
			return false;
		}

		return true;
	}
}
