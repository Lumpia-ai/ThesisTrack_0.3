import { prisma } from '../src/lib/prisma';

async function main() {
  const schedules = await prisma.defenseSchedule.findMany({
    include: {
      evaluations: true
    }
  });
  console.log('Schedules:', JSON.stringify(schedules, null, 2));
}

main().catch(console.error);
