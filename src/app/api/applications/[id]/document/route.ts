import { UserRole } from '@/generated/prisma/client';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { loadActor } from '@/lib/rbac/actor';
import { loadReviewableApplication } from '@/lib/rbac/applications';
import { recordAccountAudit } from '@/lib/rbac/audit';
import {
  IDENTITY_DOCUMENT_BUCKET,
  IDENTITY_DOCUMENT_LINK_SECONDS,
  createIdentityDocumentLink
} from '@/lib/storage/identity-documents';
import { HttpError, handleApiError, normalizeText, successResponse } from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/applications/[id]/document?side=front|back
 * A 60-second link to the applicant's identity document (the back of an ID card with side=back), only for
 * someone allowed to review the application. Every view is recorded in the applicant's history first.
 */
async function handleGET(request: Request, context: RouteContext) {
  try {
    const authUser = await requireAuthenticatedUser(request, [UserRole.SYSTEM_ADMIN, UserRole.PROGRAM_HEAD]);
    const actor = await loadActor(authUser);
    const { id } = await context.params;
    const side = new URL(request.url).searchParams.get('side') === 'back' ? 'back' : 'front';
    const application = await loadReviewableApplication(actor, normalizeText(id));
    const fileRef = side === 'back' ? application.documentBackFile : application.documentFile;
    const file = fileRef
      ? await prisma.uploadedFile.findUnique({
          where: { id: fileRef.id },
          select: { filePath: true, bucketName: true }
        })
      : null;

    if (!file?.filePath || file.bucketName !== IDENTITY_DOCUMENT_BUCKET) {
      throw new HttpError(side === 'back' ? 'This application has no back side on file.' : 'This application has no document on file.', 404);
    }

    await recordAccountAudit(prisma, {
      actorId: actor.userId,
      action: 'application.document_viewed',
      userId: application.userId,
      metadata: { applicationId: application.id, actorRole: actor.workspace.role, side },
      request
    });

    const url = await createIdentityDocumentLink(file.filePath);
    const response = successResponse({ url, expiresIn: IDENTITY_DOCUMENT_LINK_SECONDS });
    response.headers.set('Cache-Control', 'no-store');

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withApiLogging('GET', '/api/applications/[id]/document', handleGET);
