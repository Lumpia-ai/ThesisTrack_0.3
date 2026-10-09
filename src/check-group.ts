import { prisma } from './lib/prisma';

async function main() {
  const group = await prisma.group.findFirst({
    where: { code: 'IT-2026-01' }
  });
  console.log(group);
}
main();
