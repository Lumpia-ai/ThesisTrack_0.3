import { prisma } from '@/lib/prisma';
import { requireAccountHolder, toAccountSummary } from '@/lib/auth';
import { DOCUMENT_LABELS, ROLE_CATALOG, toApiEnum } from '@/lib/rbac/catalog';
import { handleApiError, successResponse } from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

/**
 * The signed-in applicant's own account status and applications. Available to pending and rejected
 * accounts (it is the only thing they can see); never includes the document itself or reviewer details.
 */
async function handleGET(request: Request) {
  try {
    const access = await requireAccountHolder(request);
    const applications = await prisma.accountApplication.findMany({
      where: { userId: access.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        requestedRole: true,
        documentType: true,
        status: true,
        decisionNote: true,
        reviewedAt: true,
        createdAt: true,
        requestedDepartment: { select: { id: true, name: true } }
      }
    });

    return successResponse({
      user: {
        name: access.user.name,
        email: access.user.email
      },
      account: toAccountSummary(access),
      applications: applications.map((application) => ({
        id: application.id,
        requestedRole: toApiEnum(application.requestedRole),
        requestedRoleLabel: ROLE_CATALOG[application.requestedRole].label,
        department: application.requestedDepartment,
        documentType: toApiEnum(application.documentType),
        documentLabel: DOCUMENT_LABELS[application.documentType],
        status: toApiEnum(application.status),
        decisionNote: application.decisionNote,
        reviewedAt: application.reviewedAt,
        submittedAt: application.createdAt
      }))
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withApiLogging('GET', '/api/account/application', handleGET);
