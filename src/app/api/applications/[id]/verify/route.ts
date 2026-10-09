import { UserRole } from '@/generated/prisma/client';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { loadActor } from '@/lib/rbac/actor';
import {
  applicationSelect,
  loadReviewableApplication,
  toApplicationSummary
} from '@/lib/rbac/applications';
import { decideApplication } from '@/lib/rbac/decisions';
import { handleApiError, normalizeText, parseJsonBody, successResponse } from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

const MAX_NOTE_LENGTH = 1000;

/**
 * POST /api/applications/[id]/verify  { note? }
 * Confirms the applicant's identity. The account moves to "waiting for a role"; assigning the role is a
 * separate step (POST /api/users/[id]/roles).
 */
async function handlePOST(request: Request, context: RouteContext) {
  try {
    const authUser = await requireAuthenticatedUser(request, [UserRole.SYSTEM_ADMIN, UserRole.PROGRAM_HEAD]);
    const actor = await loadActor(authUser);
    const { id } = await context.params;
    const body = await parseJsonBody<{ note?: unknown }>(request).catch(() => ({ note: undefined }));
    const note = normalizeText(body.note).slice(0, MAX_NOTE_LENGTH) || null;
    const application = await loadReviewableApplication(actor, normalizeText(id));

    await decideApplication(actor, application, { verified: true, note }, request);

    const updated = await prisma.accountApplication.findUniqueOrThrow({
      where: { id: application.id },
      select: applicationSelect
    });

    return successResponse({
      message: `${updated.user.name}'s identity is verified. Assign a role to activate the account.`,
      application: toApplicationSummary(updated)
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withApiLogging('POST', '/api/applications/[id]/verify', handlePOST);
