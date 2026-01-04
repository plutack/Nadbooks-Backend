import { Test, TestingModule } from '@nestjs/testing';
import { AdminUsersController } from './users.controller';
import { UserService } from '@/users/users.service';
import { AuthGuard } from '@/auth/auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';

describe('AdminUsersController', () => {
	let controller: AdminUsersController;

	const mockUserService = {
		getUsers: jest.fn(),
		findUserById: jest.fn(),
		updateUser: jest.fn(),
		updateUserActiveState: jest.fn(),
		updateUserVerification: jest.fn(),
		updateUserRole: jest.fn(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [AdminUsersController],
			providers: [
				{
					provide: UserService,
					useValue: mockUserService,
				},
			],
		})
			.overrideGuard(AuthGuard)
			.useValue({ canActivate: () => true })
			.overrideGuard(RolesGuard)
			.useValue({ canActivate: () => true })
			.compile();

		controller = module.get<AdminUsersController>(AdminUsersController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});
});
