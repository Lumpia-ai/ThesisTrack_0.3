// Prisma CLI config for the ISOLATED TEST database only. Run it through scripts/test-db.mjs, which first
// proves the target is the separate test Supabase project. It reads only .env.test and only the
// TEST_-prefixed URL, so it cannot fall back to the hosted database configured in .env.
import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

config({ path: '.env.test', override: true, quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations'
  },
  datasource: {
    url: env('TEST_DIRECT_URL')
  }
});
