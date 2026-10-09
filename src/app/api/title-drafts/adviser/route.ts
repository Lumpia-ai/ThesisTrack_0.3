import { MilestoneCheckpointReviewStatus, UserRole } from '@/generated/prisma/client';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { HttpError, handleApiError, normalizeText, successResponse } from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';
import { TITLE_AUDIT_ACTIONS, normalizeTitleKey, recordTitleChange } from '@/lib/title-lock';

export const runtime = 'nodejs';

// The adviser-facing side of student-saved "backup titles" (see
// /api/title-drafts). A group's adviser reviews each backup independently of
// whether it's ever actually used — approving one just clears that specific
// idea, which is what lets a later replacement-title submission built from an
// approved draft skip a second review cycle (see POST /api/title-submissions).

const TITLE_DRAFT_REVIEW_ROLES = [
  UserRole.ADVISER,
  UserRole.PANEL,
  UserRole.RESEARCH_HEAD,
  UserRole.PROGRAM_HEAD,
  UserRole.SYSTEM_ADMIN,
  UserRole.ADMIN
];

// Oversight roles see every group's backups; a plain adviser/panel member only
// sees the groups they actually advise (group.userId === their own id).
const ELEVATED_ROLES = new Set<UserRole>([
  UserRole.RESEARCH_HEAD,
  UserRole.PROGRAM_HEAD,
  UserRole.SYSTEM_ADMIN,
  UserRole.ADMIN
]);

function getPersonName(person?: { name?: string | null; displayName?: string | null } | null) {
  return person?.displayName || person?.name || null;
}

function toAdviserDraftPayload(draft: any) {
  const groupMembers = (draft.group?.groupMembers || []).map((member: any) => {
    const name = getPersonName(member.user) || 'Unnamed student';
    const isLeader = member.role === 'LEADER' || name === draft.group?.leader;
    return { name, isLeader };
  });

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
    groupId: draft.group?.id || draft.groupId,
    groupCode: draft.group?.code || null,
    groupTitle: draft.group?.title || draft.group?.projectTitle || null,
    groupMembers,
    updatedByName: getPersonName(draft.updatedBy),
    files: (draft.files || []).map((file: any) => ({
      id: file.id,
      name: file.fileName,
      url: `/api/title-drafts/files/${file.id}/download`,
      fileType: file.fileType,
      size: file.size
    }))
  };
}

const adviserDraftSelect = {
  id: true,
  title: true,
  description: true,
  keywords: true,
  updatedAt: true,
  reviewStatus: true,
  reviewFeedback: true,
  reviewedAt: true,
  isPriority: true,
  files: { select: { id: true, fileName: true, fileType: true, size: true } },
  groupId: true,
  group: {
    select: {
      id: true,
      code: true,
      title: true,
      projectTitle: true,
      leader: true,
      groupMembers: {
        where: { isActive: true },
        select: { role: true, user: { select: { name: true, displayName: true } } }
      }
    }
  },
  updatedBy: { select: { name: true, displayName: true } }
} as const;

async function handleGET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, TITLE_DRAFT_REVIEW_ROLES);
    const isElevated = ELEVATED_ROLES.has(user.role);

    const drafts = await prisma.titleDraft.findMany({
      where: isElevated ? {} : { group: { userId: user.id } },
      orderBy: { updatedAt: 'desc' },
      take: 200,
      select: {
        id: true,
        title: true,
        description: true,
        keywords: true,
        updatedAt: true,
        reviewStatus: true,
        reviewFeedback: true,
        reviewedAt: true,
        isPriority: true,
        files: { select: { id: true, fileName: true, fileType: true, size: true } },
        groupId: true,
        group: {
          select: {
            id: true,
            code: true,
            title: true,
            projectTitle: true,
            leader: true,
            groupMembers: {
              where: { isActive: true },
              select: { role: true, user: { select: { name: true, displayName: true } } }
            }
          }
        },
        updatedBy: { select: { name: true, displayName: true } }
      }
    });

    return successResponse({ drafts: drafts.map(toAdviserDraftPayload) });
  } catch (error) {
    return handleApiError(error);
  }
}

async function handlePATCH(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, TITLE_DRAFT_REVIEW_ROLES);
    const body = await request.json().catch(() => ({}));
    const id = normalizeText(body?.id);
    const decision = normalizeText(body?.decision).toLowerCase();
    const feedback = normalizeText(body?.feedback);

    // Adviser-only wording correction for a submitted backup title. Students
    // are read-only after submitting (src/lib/title-lock.ts), so this is how a
    // backup changes; the old wording is kept in AuditLog.
    if (decision === 'edit') {
      const nextTitle = normalizeText(body?.title).replace(/\s+/g, ' ');
      const remarks = normalizeText(body?.remarks) || null;

      if (!id || !nextTitle) {
        throw new HttpError('Enter the corrected backup title.', 400);
      }

      const existing = await prisma.titleDraft.findUnique({
        where: { id },
        select: { id: true, title: true, groupId: true, group: { select: { userId: true, projectId: true } } }
      });

      if (!existing) {
        throw new HttpError('Backup title was not found.', 404);
      }

      if (existing.group.userId !== user.id) {
        throw new HttpError('Only the assigned adviser can edit this group’s backup titles.', 403);
      }

      if (normalizeTitleKey(existing.title) === normalizeTitleKey(nextTitle)) {
        throw new HttpError('The new wording is the same as the current backup title.', 400);
      }

      const [siblings, activeProject] = await Promise.all([
        prisma.titleDraft.findMany({ where: { groupId: existing.groupId, id: { not: id } }, select: { title: true } }),
        existing.group.projectId
          ? prisma.project.findUnique({ where: { id: existing.group.projectId }, select: { title: true } })
          : null
      ]);
      const takenKeys = [...siblings.map((draft) => draft.title), activeProject?.title ?? ''].map(normalizeTitleKey);

      if (takenKeys.includes(normalizeTitleKey(nextTitle))) {
        throw new HttpError('This matches the group’s primary title or another backup title.', 400);
      }

      const updated = await prisma.$transaction(async (tx) => {
        const saved = await tx.titleDraft.update({
          where: { id },
          data: { title: nextTitle, updatedById: user.id },
          select: adviserDraftSelect
        });

        await recordTitleChange(tx, {
          groupId: existing.groupId,
          actorId: user.id,
          action: TITLE_AUDIT_ACTIONS.backupEdited,
          target: 'backup',
          previousTitle: existing.title,
          updatedTitle: nextTitle,
          remarks,
          backupDraftId: id
        });

        return saved;
      });

      return successResponse({ draft: toAdviserDraftPayload(updated) });
    }


    if (!id || (decision !== 'approve' && decision !== 'needs_revision')) {
      throw new HttpError('Use a valid backup title id and decision: approve, needs_revision, or edit.', 400);
    }

    const draft = await prisma.titleDraft.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        groupId: true,
        group: {
          select: {
            userId: true,
            groupMembers: { where: { isActive: true }, select: { userId: true } }
          }
        }
      }
    });

    if (!draft) {
      throw new HttpError('Backup title was not found.', 404);
    }

    const isAssignedAdviser = draft.group.userId === user.id;
    const isElevated = ELEVATED_ROLES.has(user.role);

    if (!isAssignedAdviser && !isElevated) {
      throw new HttpError('You can only review backup titles for your own groups.', 403);
    }

    const nextStatus = decision === 'approve'
      ? MilestoneCheckpointReviewStatus.APPROVED
      : MilestoneCheckpointReviewStatus.NEEDS_REVISION;

    const updated = await prisma.titleDraft.update({
      where: { id },
      data: {
        reviewStatus: nextStatus,
        reviewFeedback: feedback || null,
        reviewedAt: new Date(),
        reviewedById: user.id
      },
      select: adviserDraftSelect
    });

    const memberIds = draft.group.groupMembers.map((member) => member.userId);

    if (memberIds.length) {
      await prisma.notification.createMany({
        data: memberIds.map((userId) => ({
          userId,
          title: nextStatus === MilestoneCheckpointReviewStatus.APPROVED ? 'Backup Title Approved' : 'Backup Title Needs Revision',
          message: nextStatus === MilestoneCheckpointReviewStatus.APPROVED
            ? `Your adviser approved the backup title "${draft.title}". If a new title is ever required, using it submits instantly with no extra wait.`
            : `Your adviser requested changes to the backup title "${draft.title}".${feedback ? ` ${feedback}` : ''}`,
          type: nextStatus === MilestoneCheckpointReviewStatus.APPROVED ? 'success' : 'warning'
        }))
      });
    }

    return successResponse({ draft: toAdviserDraftPayload(updated) });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withApiLogging('GET', '/api/title-drafts/adviser', handleGET);
export const PATCH = withApiLogging('PATCH', '/api/title-drafts/adviser', handlePATCH);
