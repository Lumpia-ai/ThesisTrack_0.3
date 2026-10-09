import { MilestoneCheckpointReviewStatus, UserRole } from '@/generated/prisma/client';
import { getMimeTypeForFile } from '@/lib/storage/file-preview';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { HttpError, handleApiError, successResponse } from '@/lib/utils';
import { DOCUMENT_STORAGE_BUCKETS } from '@/lib/storage/upload-config';
import { deleteFile, uploadFile, generateUniqueFilePath } from '@/lib/storage/supabase-storage';
import { withApiLogging } from '@/lib/api-logging';
import { assertStudentCanEditTitles } from '@/lib/title-lock';

export const runtime = 'nodejs';

const MAX_FILES_PER_DRAFT = 5;

async function resolveStudentGroup(userId: string) {
  const membership = await prisma.groupMember.findFirst({
    where: { userId, isActive: true },
    select: { groupId: true, group: { select: { userId: true } } }
  });

  return membership ? { groupId: membership.groupId, adviserId: membership.group.userId } : null;
}

function toFilePayload(file: { id: string; fileName: string; fileType: string; size: number | null }) {
  return {
    id: file.id,
    name: file.fileName,
    url: `/api/title-drafts/files/${file.id}/download`,
    fileType: file.fileType,
    size: file.size
  };
}

// Uploading evidence for a backup is treated the same as any other edit — the
// adviser already reviewed (or hasn't yet reviewed) different content, so this
// resets review back to pending and re-notifies rather than leaving a stale
// APPROVED status attached to a draft that now has new attachments.
async function resetDraftToPendingReview(draftId: string, adviserId: string | null, studentName: string, title: string) {
  await prisma.titleDraft.update({
    where: { id: draftId },
    data: {
      reviewStatus: MilestoneCheckpointReviewStatus.PENDING,
      reviewFeedback: null,
      reviewedAt: null,
      reviewedById: null
    }
  });

  if (!adviserId) {
    return;
  }

  await prisma.notification.create({
    data: {
      userId: adviserId,
      title: 'Backup Title Awaiting Review',
      message: `${studentName} attached a file to the backup title "${title}" — it needs another look.`,
      type: 'feedback'
    }
  });
}

async function handlePOST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.STUDENT]);
    const { id } = await context.params;
    const group = await resolveStudentGroup(user.id);

    if (!group) {
      throw new HttpError('No assigned group was found for this student account.', 400);
    }
    // Backup titles are part of the submitted title proposal: read-only for
    // students once the group has submitted (see src/lib/title-lock.ts).
    await assertStudentCanEditTitles(group.groupId);

    const draft = await prisma.titleDraft.findUnique({
      where: { id },
      select: { id: true, groupId: true, title: true, _count: { select: { files: true } } }
    });

    if (!draft || draft.groupId !== group.groupId) {
      throw new HttpError('Backup title was not found.', 404);
    }

    const formData = await request.formData();
    const files = formData.getAll('files').filter(
      (value): value is File => typeof value === 'object' && value !== null && 'size' in value && 'name' in value
    );

    if (!files.length) {
      throw new HttpError('Attach at least one file.', 400);
    }

    if (draft._count.files + files.length > MAX_FILES_PER_DRAFT) {
      throw new HttpError(`You can attach at most ${MAX_FILES_PER_DRAFT} files per backup title.`, 400);
    }

    const bucketName = DOCUMENT_STORAGE_BUCKETS.THESIS_DOCUMENTS;
    const uploaded = [];

    for (const file of files) {
      const filePath = generateUniqueFilePath({
        bucketName,
        projectId: `backup-${draft.id}`,
        userId: user.id,
        fileName: file.name
      });

      await uploadFile({ bucketName, filePath, file });

      const uploadedFile = await prisma.uploadedFile.create({
        data: {
          fileName: file.name,
          filePath,
          bucketName,
          fileType: file.type || getMimeTypeForFile(file.name),
          documentCategory: 'Backup Title',
          category: 'Backup Title',
          visibility: 'private',
          size: file.size,
          userId: user.id,
          titleDraftId: draft.id
        }
      }).catch(async (error) => {
        await deleteFile(bucketName, filePath).catch((cleanupError) => {
          console.error(`Failed to remove orphaned upload ${filePath}:`, cleanupError);
        });
        throw error;
      });

      uploaded.push(toFilePayload(uploadedFile));
    }

    await resetDraftToPendingReview(draft.id, group.adviserId, user.displayName || user.name || 'A student', draft.title);

    return successResponse({ files: uploaded }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withApiLogging('POST', '/api/title-drafts/[id]/files', handlePOST);
