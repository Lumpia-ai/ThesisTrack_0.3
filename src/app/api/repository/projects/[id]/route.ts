import { getMockRepositoryProjectById, isDatabaseConnectivityError } from '@/lib/repository/mock-data';
import { getRepositoryPrisma } from '@/lib/repository-prisma';
import { handleApiError, HttpError } from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

async function handleGET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const repositoryDb = getRepositoryPrisma();

    const project = await repositoryDb.repositoryProject.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        abstract: true,
        adviser: true,
        program: true,
        department: true,
        schoolYear: true,
        keywords: true,
        manuscriptUrl: true,
        status: true,
        publishedAt: true,
        authors: { select: { name: true }, orderBy: { createdAt: 'asc' } },
        files: {
          select: { id: true, fileName: true, fileUrl: true, fileType: true, uploadedAt: true },
          orderBy: { uploadedAt: 'asc' }
        },
        technologyTransfer: {
          where: { source: 'SYSTEM' },
          orderBy: { dateRecorded: 'desc' },
          take: 1,
          select: { transferStatus: true, partnerName: true, moaUrl: true, deploymentDate: true }
        }
      }
    });

    if (!project) {
      throw new HttpError('This repository record was not found.', 404);
    }

    const { technologyTransfer, ...projectFields } = project;
    const deployment = technologyTransfer[0] || null;

    return Response.json({
      success: true,
      project: {
        ...projectFields,
        authors: project.authors.map((author) => author.name),
        deploymentStatus: deployment?.transferStatus || null,
        deploymentPartner: deployment?.partnerName || null,
        deploymentDate: deployment?.deploymentDate || null,
        moaUrl: deployment?.moaUrl || null
      }
    });
  } catch (error) {
    if (isDatabaseConnectivityError(error)) {
      console.warn('[repository] REPOSITORY_DATABASE_URL is unreachable; serving mock repository data.');
      const mockProject = getMockRepositoryProjectById(id);

      if (!mockProject) {
        return handleApiError(new HttpError('This repository record was not found.', 404));
      }

      return Response.json({ success: true, project: mockProject });
    }

    return handleApiError(error);
  }
}

export const GET = withApiLogging('GET', '/api/repository/projects/[id]', handleGET);
