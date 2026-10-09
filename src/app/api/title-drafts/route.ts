import { MilestoneCheckpointReviewStatus, UserRole } from '@/generated/prisma/client';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { HttpError, handleApiError, normalizeText, successResponse } from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';
import { assertStudentCanEditTitles, normalizeTitleKey } from '@/lib/title-lock';

export const runtime = 'nodejs';

// Student-saved "backup titles" — pure drafts, never submitted for review,
// never create or touch a Project. A group can keep several at once (their
// 2nd/3rd choice ideas). Auto-sent to the adviser for review on every save/
// edit (see notifyAdviserOfBackupDraft below) — approval doesn't make one
// "the" project title, it just clears that specific idea, which is what lets
// a later replacement-title submission built from an approved draft skip a
// second review cycle (see POST /api/title-submissions).

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

// Every save/edit resets review to PENDING (see POST/PUT) and re-notifies —
// the adviser previously reviewed different content, so it needs a fresh look.
async function notifyAdviserOfBackupDraft(adviserId: string | null, studentName: string, title: string) {
  if (!adviserId) {
    return;
  }

  await prisma.notification.create({
    data: {
      userId: adviserId,
      title: 'Backup Title Awaiting Review',
      message: `${studentName} saved a backup title "${title}" for your review.`,
      type: 'feedback'
    }
  });
}

async function handleGET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.STUDENT]);
    const group = await resolveStudentGroup(user.id);

    if (!group) {
      return successResponse({ drafts: [] });
    }

    const drafts = await prisma.titleDraft.findMany({
      where: { groupId: group.groupId },
      orderBy: { updatedAt: 'desc' },
      select: draftSelect
    });

    return successResponse({ drafts: drafts.map(toDraftPayload) });
  } catch (error) {
    return handleApiError(error);
  }
}

const MAX_BACKUP_DRAFTS = 5;

async function handlePOST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.STUDENT]);
    const group = await resolveStudentGroup(user.id);

    if (!group) {
      throw new HttpError('No assigned group was found for this student account.', 400);
    }

    // No new backup titles once the title proposal is submitted.
    await assertStudentCanEditTitles(group.groupId);

    const body = await request.json().catch(() => ({}));
    const title = normalizeText(body?.title);
    const description = normalizeText(body?.description);
    const keywords = Array.isArray(body?.keywords)
      ? body.keywords.map((keyword: unknown) => normalizeText(keyword)).filter(Boolean)
      : [];

    if (!title) {
      throw new HttpError('Enter a backup title before saving it.', 400);
    }

    const existingDrafts = await prisma.titleDraft.findMany({
      where: { groupId: group.groupId },
      select: { title: true }
    });

    if (existingDrafts.length >= MAX_BACKUP_DRAFTS) {
      throw new HttpError(`You can keep at most ${MAX_BACKUP_DRAFTS} backup titles. Delete one before adding another.`, 400);
    }

    if (existingDrafts.some((draft) => normalizeTitleKey(draft.title) === normalizeTitleKey(title))) {
      throw new HttpError('You already saved a backup title with this exact wording.', 400);
    }

    const draft = await prisma.titleDraft.create({
      data: {
        groupId: group.groupId,
        title,
        description: description || null,
        keywords,
        updatedById: user.id,
        reviewStatus: MilestoneCheckpointReviewStatus.PENDING
      },
      select: draftSelect
    });

    await notifyAdviserOfBackupDraft(group.adviserId, user.displayName || user.name || 'A student', title);

    return successResponse({ draft: toDraftPayload(draft) }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withApiLogging('GET', '/api/title-drafts', handleGET);
export const POST = withApiLogging('POST', '/api/title-drafts', handlePOST);
