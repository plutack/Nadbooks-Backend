import { defineConfig } from 'prisma/config';

export default defineConfig({
	migrations: {
		path: 'prisma/migrations',
		seed: 'bun prisma/seed.ts',
	},
});
