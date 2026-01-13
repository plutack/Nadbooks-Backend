import * as argon2 from 'argon2';
import { PrismaClient, Role } from '../generated/prisma';

const prisma = new PrismaClient();

async function main() {
	try {
		await createSuperAdmin();
	} catch (e) {
		console.error(e);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

async function createSuperAdmin() {
	const email = process.env.SUPER_ADMIN_EMAIL;
	const password = process.env.SUPER_ADMIN_PASSWORD;
	const firstName = process.env.SUPER_ADMIN_FIRSTNAME;
	const lastName = process.env.SUPER_ADMIN_LASTNAME;
	const username = process.env.SUPER_ADMIN_USERNAME;

	if (!email || !password || !firstName || !lastName || !username) {
		console.error('Missing SUPER_ADMIN environment variables');
		return;
	}

	console.log(`Checking for Super Admin with email: ${email}`);

	const existingUser = await prisma.user.findFirst({
		where: {
			OR: [{ email }, { username }],
		},
	});

	if (!existingUser) {
		console.log('Super Admin not found. Creating...');
		const hashedPassword = await argon2.hash(password);

		await prisma.user.create({
			data: {
				firstName,
				lastName,
				username,
				email,
				passwordHash: hashedPassword,
				role: Role.SUPER_ADMIN,
				isActive: true,
				isVerified: true,
				wallet: {
					create: {
						balance: 0,
					},
				},
			},
		});
		console.log('Super Admin created successfully.');
	} else {
		console.log('Super Admin already exists.');
	}
}

main();
