import { DefensePanelRole, UserRole } from '@/generated/prisma/client';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { HttpError, handleApiError, successResponse } from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

const ELEVATED_ROLES = new Set<UserRole>([
  UserRole.RESEARCH_HEAD,
  UserRole.PROGRAM_HEAD,
  UserRole.SYSTEM_ADMIN,
  UserRole.ADMIN
]);

// Lets the panel chair pull up a group's saved backup titles while recording
// a NEW_TITLE_APPROVED chair decision (see /api/defense-schedules/[id]/chair-decision) —
// they need to pick which backup was presented and cleared in this same
// sitting. Scoped by "is the chair for this specific schedule" rather than
// "is this group's adviser" (like /api/title-drafts/adviser is), since a
// panel chair usually isn't the group's actual adviser.
async function handleGET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser(request);
    const { id: scheduleId } = await context.params;

    const schedule = await prisma.defenseSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        project: { select: { groupId: true } },
        evaluations: { select: { evaluatorId: true, panelRole: true } }
      }
    });

    if (!schedule) {
      throw new HttpError('Defense schedule was not found.', 404);
    }

    const isChair = schedule.evaluations.some(
      (evaluation) => evaluation.evaluatorId === user.id && evaluation.panelRole === DefensePanelRole.CHAIR
    );
    const isElevated = ELEVATED_ROLES.has(user.role);

    if (!isChair && !isElevated) {
      throw new HttpError('Only the panel chair can view this group\'s backup titles.', 403);
    }

    if (!schedule.project.groupId) {
      return successResponse({ drafts: [] });
    }

    const drafts = await prisma.titleDraft.findMany({
      where: { groupId: schedule.project.groupId },
      orderBy: [{ isPriority: 'desc' }, { updatedAt: 'desc' }],
      select: {
        id: true,
        title: true,
        description: true,
        keywords: true,
        updatedAt: true,
        reviewStatus: true,
        reviewFeedback: true,
        isPriority: true,
        files: { select: { id: true, fileName: true, fileType: true, size: true } }
      }
    });

    return successResponse({
      drafts: drafts.map((draft) => ({
        id: draft.id,
        title: draft.title,
        description: draft.description || '',
        keywords: draft.keywords,
        updatedAt: draft.updatedAt.toISOString(),
        reviewStatus: draft.reviewStatus,
        reviewFeedback: draft.reviewFeedback,
        isPriority: draft.isPriority,
        files: draft.files.map((file) => ({
          id: file.id,
          name: file.fileName,
          url: `/api/title-drafts/files/${file.id}/download`,
          fileType: file.fileType,
          size: file.size
        }))
      }))
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withApiLogging('GET', '/api/defense-schedules/[id]/backup-titles', handleGET);
