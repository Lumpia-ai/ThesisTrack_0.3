import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

let cachedPrisma: PrismaClient | undefined;

function getPoolMax() {
  const parsed = Number.parseInt(process.env.DATABASE_POOL_MAX ?? '', 10);

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  // Page loaders fire batches of 4–6 queries at once; with only 3 connections those batches ran
  // in waves, each costing another ~110ms round trip to the Supabase pooler.
  return process.env.NODE_ENV === 'production' ? 5 : 8;
}

// Opening a new connection through the Supabase pooler takes several seconds (TLS + auth over
// ~250ms round trips), so idle connections are kept for 5 minutes instead of being closed after
// 10 seconds. Otherwise almost every page that follows a few seconds of reading pays that setup
// cost again. Dead sockets are still evicted by the TCP keep-alive below.
function getPoolIdleTimeout() {
  const parsed = Number.parseInt(process.env.DATABASE_POOL_IDLE_MS ?? '', 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 300_000;
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured.');
  }

  const adapter = new PrismaPg({
    connectionString,
    max: getPoolMax(),
    idleTimeoutMillis: getPoolIdleTimeout(),
    // A fresh pooler connection was measured at ~4s; 5s left almost no margin before failing.
    connectionTimeoutMillis: 10_000,
    // Without this, a pooled connection that Supabase's pooler (or an intermediate NAT/
    // firewall) silently drops while idle isn't discovered until the app tries to reuse it —
    // surfacing as "Connection terminated due to connection timeout" on an unrelated request.
    // TCP keep-alive probes let dead sockets get detected and evicted from the pool proactively.
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1') ? false : {
      rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true'
    }
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
  });
}

function getPrismaClient() {
  const existingClient = globalForPrisma.prisma ?? cachedPrisma;

  if (existingClient) {
    return existingClient;
  }

  const client = createPrismaClient();
  cachedPrisma = client;

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client;
  }

  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property, client);
    return typeof value === 'function' ? value.bind(client) : value;
  },
  set(_target, property, value) {
    return Reflect.set(getPrismaClient(), property, value);
  },
  has(_target, property) {
    return property in getPrismaClient();
  },
  ownKeys() {
    return Reflect.ownKeys(getPrismaClient());
  },
  getOwnPropertyDescriptor(_target, property) {
    return Reflect.getOwnPropertyDescriptor(getPrismaClient(), property);
  }
}) as PrismaClient;
