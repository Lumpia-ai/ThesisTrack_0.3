import { MilestoneCheckpointReviewStatus, UserRole } from '@/generated/prisma/client';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { HttpError, handleApiError, normalizeText, successResponse } from '@/lib/utils';
import { assertDocumentBucket, deleteFile } from '@/lib/storage/supabase-storage';
import { withApiLogging } from '@/lib/api-logging';
import { assertStudentCanEditTitles } from '@/lib/title-lock';

export const runtime = 'nodejs';

async function resolveStudentGroup(userId: string) {
  const membership = await prisma.groupMember.findFirst({
    where: { userId, isActive: true },
    select: { groupId: true, group: { select: { userId: true } } }
  });

  return membership ? { groupId: membership.groupId, adviserId: membership.group.userId } : null;
}

function toDraftPayload(draft: {
  id: string;
  title: string;
  description: string | null;
  keywords: string[];
  updatedAt: Date;
  reviewStatus: MilestoneCheckpointReviewStatus;
  reviewFeedback: string | null;
  reviewedAt: Date | null;
  isPriority: boolean;
  files: Array<{ id: string; fileName: string; fileType: string; size: number | null }>;
}) {
  return {
    id: draft.id,
    title: draft.title,
    description: draft.description || '',
    keywords: draft.keywords,
    updatedAt: draft.updatedAt.toISOString(),
    reviewStatus: draft.reviewStatus,
    reviewFeedback: draft.reviewFeedback,
    reviewedAt: draft.reviewedAt ? draft.reviewedAt.toISOString() : null,
    isPriority: draft.isPriority,
    files: draft.files.map((file) => ({
      id: file.id,
      name: file.fileName,
      url: `/api/title-drafts/files/${file.id}/download`,
      fileType: file.fileType,
      size: file.size
    }))
  };
}

const draftSelect = {
  id: true,
  title: true,
  description: true,
  keywords: true,
  updatedAt: true,
  reviewStatus: true,
  reviewFeedback: true,
  reviewedAt: true,
  isPriority: true,
  files: {
    select: { id: true, fileName: true, fileType: true, size: true }
  }
} as const;

async function notifyAdviserOfBackupDraft(adviserId: string | null, studentName: string, title: string) {
  if (!adviserId) {
    return;
  }

  await prisma.notification.create({
    data: {
      userId: adviserId,
      title: 'Backup Title Awaiting Review',
      message: `${studentName} updated a backup title "${title}" — it needs another look.`,
      type: 'feedback'
    }
  });
}

async function handlePUT(request: Request, context: { params: Promise<{ id: string }> }) {
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

    const existing = await prisma.titleDraft.findUnique({ where: { id }, select: { groupId: true } });

    if (!existing || existing.groupId !== group.groupId) {
      throw new HttpError('Backup title was not found.', 404);
    }

    const body = await request.json().catch(() => ({}));
    const title = normalizeText(body?.title);
    const description = normalizeText(body?.description);
    const keywords = Array.isArray(body?.keywords)
      ? body.keywords.map((keyword: unknown) => normalizeText(keyword)).filter(Boolean)
      : [];

    if (!title) {
      throw new HttpError('Enter a backup title before saving it.', 400);
    }

    // Any edit invalidates whatever the adviser previously reviewed — reset
    // back to pending and clear the old decision rather than leaving a stale
    // APPROVED/NEEDS_REVISION status attached to content that's now different.
    const draft = await prisma.titleDraft.update({
      where: { id },
      data: {
        title,
        description: description || null,
        keywords,
        updatedById: user.id,
        reviewStatus: MilestoneCheckpointReviewStatus.PENDING,
        reviewFeedback: null,
        reviewedAt: null,
        reviewedById: null
      },
      select: draftSelect
    });

    await notifyAdviserOfBackupDraft(group.adviserId, user.displayName || user.name || 'A student', title);

    return successResponse({ draft: toDraftPayload(draft) });
  } catch (error) {
    return handleApiError(error);
  }
}

// Toggles the student's "this is my best one" pick — radio-style, so starring
// one clears the flag on every other backup in the group rather than allowing
// several to be marked priority at once.
async function handlePATCH(request: Request, context: { params: Promise<{ id: string }> }) {
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

    const existing = await prisma.titleDraft.findUnique({ where: { id }, select: { groupId: true } });

    if (!existing || existing.groupId !== group.groupId) {
      throw new HttpError('Backup title was not found.', 404);
    }

    const body = await request.json().catch(() => ({}));
    const isPriority = Boolean(body?.isPriority);

    if (isPriority) {
      await prisma.$transaction([
        prisma.titleDraft.updateMany({
          where: { groupId: group.groupId, id: { not: id } },
          data: { isPriority: false }
        }),
        prisma.titleDraft.update({ where: { id }, data: { isPriority: true } })
      ]);
    } else {
      await prisma.titleDraft.update({ where: { id }, data: { isPriority: false } });
    }

    const draft = await prisma.titleDraft.findUniqueOrThrow({ where: { id }, select: draftSelect });

    return successResponse({ draft: toDraftPayload(draft) });
  } catch (error) {
    return handleApiError(error);
  }
}

async function handleDELETE(request: Request, context: { params: Promise<{ id: string }> }) {
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

    const existing = await prisma.titleDraft.findUnique({
      where: { id },
      select: { groupId: true, files: { select: { bucketName: true, filePath: true } } }
    });

    if (!existing || existing.groupId !== group.groupId) {
      throw new HttpError('Backup title was not found.', 404);
    }

    // The FK cascade below cleans up the file DB rows, but not the underlying
    // Supabase storage objects — clean those up first so deleting a backup
    // doesn't leave orphaned files behind.
    for (const file of existing.files) {
      if (file.bucketName && file.filePath) {
        const bucketName = file.bucketName;
        assertDocumentBucket(bucketName);
        await deleteFile(bucketName, file.filePath).catch((error) => {
          console.warn('Storage cleanup skipped while deleting backup title:', error);
        });
      }
    }

    await prisma.titleDraft.delete({ where: { id } });

    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export const PUT = withApiLogging('PUT', '/api/title-drafts/[id]', handlePUT);
export const PATCH = withApiLogging('PATCH', '/api/title-drafts/[id]', handlePATCH);
export const DELETE = withApiLogging('DELETE', '/api/title-drafts/[id]', handleDELETE);
