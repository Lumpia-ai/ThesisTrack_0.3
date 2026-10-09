// Offline-only Prisma config for reviewing the proposed schema (validate / schema-to-schema diff).
// It deliberately loads no .env file and points at an unreachable address, so no command run with
// it can touch a real database.
import { defineConfig } from 'prisma/config';

export default defineConfig({
  // Resolved relative to this file.
  schema: 'schema.prisma',
  datasource: {
    url: 'postgresql://offline:offline@127.0.0.1:1/offline'
  }
});
