import { getRepositoryPrisma } from '@/lib/repository-prisma';
import { errorResponse, handleApiError, HttpError, isValidEmail, normalizeEmail, normalizeText, successResponse } from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

async function handlePOST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const repositoryProjectId = normalizeText(body?.repositoryProjectId);
    const requesterName = normalizeText(body?.name);
    const requesterEmail = normalizeEmail(body?.email);
    const requesterOrganization = normalizeText(body?.organization);
    const message = normalizeText(body?.message);

    const fieldErrors: Record<string, string> = {};

    if (!repositoryProjectId) {
      fieldErrors.repositoryProjectId = 'A repository record must be selected.';
    }
    if (!requesterName) {
      fieldErrors.name = 'Your name is required.';
    }
    if (!requesterEmail || !isValidEmail(requesterEmail)) {
      fieldErrors.email = 'A valid email address is required.';
    }
    if (!message) {
      fieldErrors.message = 'Please describe your adoption or transfer interest.';
    }

    if (Object.keys(fieldErrors).length) {
      return errorResponse('Please correct the highlighted fields.', 422, fieldErrors);
    }

    const repositoryDb = getRepositoryPrisma();

    const project = await repositoryDb.repositoryProject.findUnique({
      where: { id: repositoryProjectId },
      select: { id: true, title: true }
    });

    if (!project) {
      throw new HttpError('This repository record was not found.', 404);
    }

    const record = await repositoryDb.technologyTransferRecord.create({
      data: {
        repositoryProjectId: project.id,
        partnerName: requesterOrganization ? `${requesterName} (${requesterOrganization})` : requesterName,
        requesterEmail,
        requesterOrganization: requesterOrganization || null,
        source: 'GUEST',
        transferStatus: 'PENDING',
        remarks: message,
        dateRecorded: new Date()
      }
    });

    return successResponse({
      transferRequest: {
        id: record.id,
        projectTitle: project.title,
        status: record.transferStatus
      }
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withApiLogging('POST', '/api/repository/transfer-requests', handlePOST);
