import { MilestoneCheckpointReviewStatus, UserRole } from '@/generated/prisma/client';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { HttpError, handleApiError, successResponse } from '@/lib/utils';
import { assertDocumentBucket, deleteFile } from '@/lib/storage/supabase-storage';
import { withApiLogging } from '@/lib/api-logging';
import { assertStudentCanEditTitles } from '@/lib/title-lock';

export const runtime = 'nodejs';

async function resolveStudentGroupId(userId: string) {
  const membership = await prisma.groupMember.findFirst({
    where: { userId, isActive: true },
    select: { groupId: true }
  });

  return membership?.groupId ?? null;
}

async function handleDELETE(request: Request, context: { params: Promise<{ fileId: string }> }) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.STUDENT]);
    const { fileId } = await context.params;
    const groupId = await resolveStudentGroupId(user.id);

    if (!groupId) {
      throw new HttpError('No assigned group was found for this student account.', 400);
    }

    // Backup titles are part of the submitted title proposal: read-only for
    // students once the group has submitted (see src/lib/title-lock.ts).
    await assertStudentCanEditTitles(groupId);

    const file = await prisma.uploadedFile.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        bucketName: true,
        filePath: true,
        titleDraft: { select: { id: true, groupId: true, title: true } }
      }
    });

    if (!file || !file.titleDraft || file.titleDraft.groupId !== groupId) {
      throw new HttpError('File was not found.', 404);
    }

    if (file.bucketName && file.filePath) {
      const bucketName = file.bucketName;
      assertDocumentBucket(bucketName);
      await deleteFile(bucketName, file.filePath).catch((error) => {
        console.warn(`Storage cleanup skipped for backup title file ${file.id}:`, error);
      });
    }

    await prisma.uploadedFile.delete({ where: { id: file.id } });

    // Removing evidence is content-affecting the same as any other edit —
    // reopens review rather than leaving a stale decision attached to a draft
    // that no longer has the file the adviser looked at.
    await prisma.titleDraft.update({
      where: { id: file.titleDraft.id },
      data: {
        reviewStatus: MilestoneCheckpointReviewStatus.PENDING,
        reviewFeedback: null,
        reviewedAt: null,
        reviewedById: null
      }
    });

    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export const DELETE = withApiLogging('DELETE', '/api/title-drafts/files/[fileId]', handleDELETE);
