import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/repository/schema.prisma",
  migrations: {
    path: "prisma/repository/migrations",
  },
  datasource: {
    url: env("REPOSITORY_DATABASE_URL"),
  },
});
