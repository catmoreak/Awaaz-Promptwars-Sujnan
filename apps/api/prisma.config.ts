import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

config({ quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // Migrations need the direct host. Neon's pooler does not support the session locks they use.
  datasource: { url: process.env.DIRECT_URL ?? '' },
});
