import { IndustryProjectStatus } from '@/generated/prisma/client';
import { getRepositoryPrisma } from '@/lib/repository-prisma';

function toRepositoryTransferStatus(status: IndustryProjectStatus) {
  switch (status) {
    case IndustryProjectStatus.ACTIVE:
    case IndustryProjectStatus.COMPLETED:
      return 'DEPLOYED';
    case IndustryProjectStatus.TERMINATED:
      return 'TERMINATED';
    case IndustryProjectStatus.PROPOSED:
    default:
      return 'PROPOSED';
  }
}

export async function syncDeploymentToRepository({
  mainProjectId,
  partnerName,
  status,
  moaUrl,
  deploymentDate
}: {
  mainProjectId: string;
  partnerName: string;
  status: IndustryProjectStatus;
  moaUrl: string | null;
  deploymentDate: Date | null;
}) {
  let repositoryDb;

  try {
    repositoryDb = getRepositoryPrisma();
  } catch {
    return { synced: false, reason: 'Repository database is not configured.' };
  }

  const repositoryProject = await repositoryDb.repositoryProject.findUnique({
    where: { mainProjectId },
    select: { id: true }
  });

  if (!repositoryProject) {
    return { synced: false, reason: 'This project has not been published to the repository yet.' };
  }

  const transferStatus = toRepositoryTransferStatus(status);
  const existingRecord = await repositoryDb.technologyTransferRecord.findFirst({
    where: { repositoryProjectId: repositoryProject.id, source: 'SYSTEM' },
    orderBy: { dateRecorded: 'desc' },
    select: { id: true }
  });

  const data = {
    partnerName,
    transferStatus,
    moaUrl,
    deploymentDate,
    remarks: transferStatus === 'DEPLOYED'
      ? `Deployed with ${partnerName}.`
      : transferStatus === 'TERMINATED'
        ? `Deployment with ${partnerName} was terminated.`
        : `Proposed adoption by ${partnerName}.`,
    dateRecorded: new Date()
  };

  if (existingRecord) {
    await repositoryDb.technologyTransferRecord.update({
      where: { id: existingRecord.id },
      data
    });
  } else {
    await repositoryDb.technologyTransferRecord.create({
      data: { repositoryProjectId: repositoryProject.id, source: 'SYSTEM', ...data }
    });
  }

  return { synced: true, reason: null };
}
