import { prisma } from '../src/lib/prisma';

async function main() {
  const res = await prisma.evaluation.updateMany({
    data: { submittedAt: null, score: null, rubricData: null, studentEvaluations: null, remarks: null, recommendation: 'PENDING' }
  });
  console.log('Reset evaluations');
}

main().catch(console.error);
