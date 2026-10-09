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
import { HttpError, handleApiError, normalizeText, parseJsonBody, successResponse } from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

const MIN_NOTE_LENGTH = 5;
const MAX_NOTE_LENGTH = 1000;

/**
 * POST /api/applications/[id]/reject  { note }
 * Rejects the application. The note is required: the applicant sees it on their status page.
 */
async function handlePOST(request: Request, context: RouteContext) {
  try {
    const authUser = await requireAuthenticatedUser(request, [UserRole.SYSTEM_ADMIN, UserRole.PROGRAM_HEAD]);
    const actor = await loadActor(authUser);
    const { id } = await context.params;
    const body = await parseJsonBody<{ note?: unknown }>(request);
    const note = normalizeText(body.note).slice(0, MAX_NOTE_LENGTH);

    if (note.length < MIN_NOTE_LENGTH) {
      throw new HttpError('Tell the applicant why the application is rejected.', 400, {
        note: 'Write a short reason the applicant will see.'
      });
    }

    const application = await loadReviewableApplication(actor, normalizeText(id));

    await decideApplication(actor, application, { verified: false, note }, request);

    const updated = await prisma.accountApplication.findUniqueOrThrow({
      where: { id: application.id },
      select: applicationSelect
    });

    return successResponse({
      message: `${updated.user.name}'s application was rejected.`,
      application: toApplicationSummary(updated)
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withApiLogging('POST', '/api/applications/[id]/reject', handlePOST);
