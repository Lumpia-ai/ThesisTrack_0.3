import { spawnSync } from 'node:child_process';

const mainGenerateUrl =
  process.env.DATABASE_URL || process.env.DIRECT_URL || 'postgresql://postgres:postgres@localhost:5432/thesistrack';
const repositoryGenerateUrl =
  process.env.REPOSITORY_DATABASE_URL || 'postgresql://repository:repository@localhost:5432/repository';

function runPrismaGenerate(label, args, env = {}) {
  console.log(`Generating ${label} Prisma client...`);

  const result = spawnSync(['npx', 'prisma', 'generate', ...args].join(' '), {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      ...env
    }
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

// Prisma config requires DATABASE_URL even when generating a client. This
// fallback is build-time only; runtime still requires the deployed environment
// to provide the real Railway DATABASE_PUBLIC_URL as DATABASE_URL.
runPrismaGenerate('main database', ['--config', 'prisma.config.ts'], {
  DATABASE_URL: mainGenerateUrl,
  DIRECT_URL: process.env.DIRECT_URL || mainGenerateUrl
});

// The repository database is integrated through backend API services only.
// This fallback URL is for build-time client generation; runtime access still
// requires REPOSITORY_DATABASE_URL in the deployed environment.
runPrismaGenerate('repository database', ['--config', 'prisma.repository.config.ts'], {
  REPOSITORY_DATABASE_URL: repositoryGenerateUrl
});
