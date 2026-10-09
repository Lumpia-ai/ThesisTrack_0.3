import { AccountApplicationStatus, UserRole } from '@/generated/prisma/client';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { loadActor } from '@/lib/rbac/actor';
import {
  applicationSelect,
  reviewQueueWhere,
  toApplicationSummary
} from '@/lib/rbac/applications';
import { fromApiEnum } from '@/lib/rbac/catalog';
import { canReviewApplication } from '@/lib/rbac/policy';
import { handleApiError, successResponse } from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

const REVIEWER_ROLES: UserRole[] = [UserRole.SYSTEM_ADMIN, UserRole.PROGRAM_HEAD];
const MAX_APPLICATIONS = 200;

/**
 * GET /api/applications?status=pending|verified|rejected|all
 * The review queue: institution-level applicants for a System Administrator, the Program Head's own
 * department for a Program Head. Pending first, oldest first, so nobody waits longest unseen.
 */
async function handleGET(request: Request) {
  try {
    const authUser = await requireAuthenticatedUser(request, REVIEWER_ROLES);
    const actor = await loadActor(authUser);
    const where = reviewQueueWhere(actor);

    if (!where) {
      return successResponse({ applications: [] });
    }

    const statusParam = new URL(request.url).searchParams.get('status') || 'pending';
    const status = statusParam === 'all' ? null : fromApiEnum(AccountApplicationStatus, statusParam) ?? AccountApplicationStatus.PENDING;
    const applications = await prisma.accountApplication.findMany({
      where: { ...where, ...(status ? { status } : {}) },
      select: applicationSelect,
      orderBy: [{ status: 'asc' }, { createdAt: status === AccountApplicationStatus.PENDING ? 'asc' : 'desc' }],
      take: MAX_APPLICATIONS
    });

    return successResponse({
      applications: applications
        .filter((application) => canReviewApplication(actor, application).allowed)
        .map(toApplicationSummary)
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withApiLogging('GET', '/api/applications', handleGET);
