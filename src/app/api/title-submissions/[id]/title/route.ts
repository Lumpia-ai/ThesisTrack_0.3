import { UserRole } from '@/generated/prisma/client';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { HttpError, handleApiError, normalizeText, successResponse } from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';
import { TITLE_AUDIT_ACTIONS, getTitleHistory, normalizeTitleKey, recordTitleChange } from '@/lib/title-lock';

export const runtime = 'nodejs';

// Adviser-only title correction. Students are permanently read-only after
// submitting (src/lib/title-lock.ts), so this is the one way a submitted title
// changes. Two actions:
//   { title, remarks? }          — edit the primary title's wording
//   { backupDraftId, remarks? }  — promote a submitted backup to primary; the
//                                  old primary takes that backup's slot
// Deliberately does NOT touch project/submission status, checkpoints, or
// defense schedules: a title edit is not a new Concept Presentation. If one is
// required, the adviser schedules it through the existing defense workflow.

// The adviser's edit panel: the group's current primary title, its submitted
// backup titles, and the change history.
async function handleGET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.ADVISER, UserRole.PANEL]);
    const { id: projectId } = await context.params;
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, title: true, adviserId: true, groupId: true, group: { select: { userId: true } } }
    });

    if (!project || !project.groupId) {
      throw new HttpError('Title submission was not found.', 404);
    }

    if ((project.adviserId || project.group?.userId) !== user.id) {
      throw new HttpError('Only the assigned adviser can edit this group’s title.', 403);
    }

    const [backups, history] = await Promise.all([
      prisma.titleDraft.findMany({
        where: { groupId: project.groupId },
        orderBy: { createdAt: 'asc' },
        select: { id: true, title: true, description: true }
      }),
      getTitleHistory(project.groupId)
    ]);

    return successResponse({ title: project.title, backups, history });
  } catch (error) {
    return handleApiError(error);
  }
}

async function handlePATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.ADVISER, UserRole.PANEL]);
    const { id: projectId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const nextTitle = normalizeText(body?.title).replace(/\s+/g, ' ');
    const backupDraftId = normalizeText(body?.backupDraftId);
    const remarks = normalizeText(body?.remarks) || null;

    if (Boolean(nextTitle) === Boolean(backupDraftId)) {
      throw new HttpError('Provide either a new title or a backup title to use — not both.', 400);
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        title: true,
        adviserId: true,
        ownerId: true,
        groupId: true,
        group: { select: { id: true, userId: true, projectId: true } }
      }
    });

    if (!project || !project.groupId || !project.group) {
      throw new HttpError('Title submission was not found.', 404);
    }

    const assignedAdviserId = project.adviserId || project.group.userId;
    if (assignedAdviserId !== user.id) {
      throw new HttpError('Only the assigned adviser can edit this group’s title.', 403);
    }

    const groupId = project.groupId;
    const backups = await prisma.titleDraft.findMany({
      where: { groupId },
      select: { id: true, title: true }
    });

    const previousTitle = project.title;
    let updatedTitle: string;
    let promotedDraft: { id: string; title: string } | null = null;

    if (backupDraftId) {
      promotedDraft = backups.find((draft) => draft.id === backupDraftId) ?? null;
      if (!promotedDraft) {
        throw new HttpError('That backup title does not belong to this group.', 404);
      }
      updatedTitle = promotedDraft.title;
    } else {
      updatedTitle = nextTitle;

      if (normalizeTitleKey(updatedTitle) === normalizeTitleKey(previousTitle)) {
        throw new HttpError('The new title is the same as the current one.', 400);
      }
      if (backups.some((draft) => normalizeTitleKey(draft.title) === normalizeTitleKey(updatedTitle))) {
        throw new HttpError('This title matches one of the group’s backup titles — use that backup instead.', 400);
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.project.update({ where: { id: project.id }, data: { title: updatedTitle } });

      // Group.title/projectTitle mirror the active project's title for the
      // rest of the app; only sync them when this project is the active one.
      if (project.group!.projectId === project.id) {
        await tx.group.update({
          where: { id: groupId },
          data: { title: updatedTitle, projectTitle: updatedTitle }
        });
      }

      if (promotedDraft) {
        // Swap, don't drop: the old primary becomes this backup so the
        // group's full set of submitted titles is preserved.
        await tx.titleDraft.update({
          where: { id: promotedDraft.id },
          data: { title: previousTitle, updatedById: user.id, isPriority: false }
        });
      }

      await recordTitleChange(tx, {
        groupId,
        actorId: user.id,
        action: promotedDraft ? TITLE_AUDIT_ACTIONS.backupPromoted : TITLE_AUDIT_ACTIONS.primaryEdited,
        target: 'primary',
        previousTitle,
        updatedTitle,
        remarks,
        projectId: project.id,
        backupDraftId: promotedDraft?.id
      });

      const members = await tx.groupMember.findMany({
        where: { groupId, isActive: true },
        select: { userId: true }
      });
      const recipients = new Set([...members.map((member) => member.userId), project.ownerId].filter(Boolean) as string[]);

      if (recipients.size) {
        await tx.notification.createMany({
          data: Array.from(recipients).map((userId) => ({
            userId,
            title: 'Title Updated by Adviser',
            message: `Your adviser changed your research title from "${previousTitle}" to "${updatedTitle}".${remarks ? ` Remarks: ${remarks}` : ''}`,
            type: 'info',
            entityType: 'project',
            entityId: project.id
          }))
        });
      }
    });

    return successResponse({
      projectId: project.id,
      title: updatedTitle,
      history: await getTitleHistory(groupId)
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withApiLogging('GET', '/api/title-submissions/[id]/title', handleGET);
export const PATCH = withApiLogging('PATCH', '/api/title-submissions/[id]/title', handlePATCH);
