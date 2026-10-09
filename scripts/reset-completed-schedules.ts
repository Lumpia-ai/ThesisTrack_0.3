import { prisma } from '../src/lib/prisma';

async function main() {
  const res = await prisma.defenseSchedule.updateMany({
    where: { status: 'COMPLETED' },
    data: { status: 'SCHEDULED' }
  });
  console.log('Reset', res.count, 'completed schedules back to SCHEDULED');
}

main().catch(console.error);
