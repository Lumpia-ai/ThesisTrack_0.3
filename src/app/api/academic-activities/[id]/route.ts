import { UserRole } from '@/generated/prisma/client';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { HttpError, handleApiError, successResponse } from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

async function handleDELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.STUDENT]);
    const { id } = await props.params;

    const activity = await prisma.academicActivity.findUnique({
      where: { id },
      select: { id: true, createdById: true }
    });

    if (!activity) {
      throw new HttpError('Academic activity was not found.', 404);
    }

    if (activity.createdById !== user.id) {
      throw new HttpError('You can only remove activities you logged yourself.', 403);
    }

    // Deleting the activity only detaches its evidence files (onDelete:
    // SetNull) — the files themselves stay in Document Submissions.
    await prisma.academicActivity.delete({ where: { id } });

    return successResponse({ message: 'Academic activity removed.' });
  } catch (error) {
    return handleApiError(error);
  }
}

export const DELETE = withApiLogging('DELETE', '/api/academic-activities/[id]', handleDELETE);
