import * as argon2 from 'argon2';
import { PrismaClient, Role } from '../generated/prisma';

const prisma = new PrismaClient();

async function main() {
	try {
		await createSuperAdmin();
		await seedGenres();
	} catch (e) {
		console.error(e);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

const DEFAULT_GENRES = [
	'Fiction',
	'Non-Fiction',
	'Romance',
	'Mystery',
	'Thriller',
	'Science Fiction',
	'Fantasy',
	'Horror',
	'Biography',
	'Self-Help',
	'Poetry',
	'History',
	'Business',
	'Children',
	'Young Adult',
];

async function seedGenres() {
	console.log('Seeding genres...');
	for (const name of DEFAULT_GENRES) {
		await prisma.genre.upsert({
			where: { name },
			update: {},
			create: { name },
		});
	}
	console.log(`Seeded ${DEFAULT_GENRES.length} genres.`);
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
						balance: 5000,
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
