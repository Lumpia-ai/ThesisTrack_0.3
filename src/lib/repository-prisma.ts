import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient as RepositoryPrismaClient } from '@/generated/repository-prisma/client';

const globalForRepositoryPrisma = globalThis as unknown as {
  repositoryPrisma?: RepositoryPrismaClient;
};

function getRepositoryPoolMax() {
  const parsed = Number.parseInt(process.env.REPOSITORY_DATABASE_POOL_MAX ?? '', 10);

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return process.env.NODE_ENV === 'production' ? 3 : 2;
}

function createRepositoryPrismaClient() {
  const connectionString = process.env.REPOSITORY_DATABASE_URL;

  if (!connectionString) {
    throw new Error('REPOSITORY_DATABASE_URL is not configured.');
  }

  const adapter = new PrismaPg({
    connectionString,
    max: getRepositoryPoolMax(),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1') ? false : {
      rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true'
    }
  });

  return new RepositoryPrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
  });
}

export function getRepositoryPrisma() {
  if (!globalForRepositoryPrisma.repositoryPrisma) {
    globalForRepositoryPrisma.repositoryPrisma = createRepositoryPrismaClient();
  }

  return globalForRepositoryPrisma.repositoryPrisma;
}
