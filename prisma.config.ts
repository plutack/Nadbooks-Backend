import { defineConfig } from 'prisma/config';

export default defineConfig({
	migrations: {
		path: 'prisma/migrations',
		seed: 'ts-node prisma/seed.ts',
	},
});
