import { ProjectStatus, SubmissionStatus, UserRole } from '@/generated/prisma/client';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { HttpError, handleApiError, successResponse } from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';
import { assertStudentCanEditTitles } from '@/lib/title-lock';

export const runtime = 'nodejs';

// A student can pick which of their own group's still-pending title candidates
// to move forward with. This doesn't approve it — the adviser still reviews and
// decides — it just withdraws the sibling candidates so the adviser (and the
// group's own "My Proposals" view) only has one active title to focus on,
// instead of several competing drafts sitting in the queue indefinitely.
const CHOOSABLE_STATUSES: ProjectStatus[] = [
  ProjectStatus.SUBMITTED,
  ProjectStatus.UNDER_REVIEW,
  ProjectStatus.NEEDS_REVISION
];

const WITHDRAWN_REASON = 'Withdrawn — the group chose a different title to move forward with.';

async function handlePOST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser(request, [UserRole.STUDENT]);
    const { id: projectId } = await context.params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, groupId: true, title: true, status: true, adviserId: true }
    });

    if (!project) {
      throw new HttpError('Title submission was not found.', 404);
    }

    if (!project.groupId) {
      throw new HttpError('This title proposal is not linked to a group.', 400);
    }

    const membership = await prisma.groupMember.findFirst({
      where: { groupId: project.groupId, userId: user.id, isActive: true }
    });

    if (!membership) {
      throw new HttpError('You can only choose a title for your own group.', 403);
    }

    // Choosing among submitted candidates replaces the active title, which the
    // permanent student lock forbids — the adviser's approval decides instead
    // (approving one already archives the group's other candidates).
    await assertStudentCanEditTitles(project.groupId);

    if (!CHOOSABLE_STATUSES.includes(project.status)) {
      throw new HttpError('Only a pending title proposal can be chosen as final.', 400);
    }

    const siblings = await prisma.project.findMany({
      where: {
        groupId: project.groupId,
        id: { not: project.id },
        status: { in: CHOOSABLE_STATUSES }
      },
      include: {
        submissions: {
          orderBy: { submittedAt: 'desc' },
          take: 1
        }
      }
    });

    await prisma.$transaction(async (tx) => {
      for (const sibling of siblings) {
        await tx.project.update({
          where: { id: sibling.id },
          data: { status: ProjectStatus.ARCHIVED }
        });

        const latestSubmission = sibling.submissions[0];
        if (latestSubmission) {
          await tx.submission.update({
            where: { id: latestSubmission.id },
            data: {
              status: SubmissionStatus.REJECTED,
              rejectionReason: WITHDRAWN_REASON,
              reviewedAt: new Date()
            }
          });
        }
      }
    });

    if (project.adviserId) {
      await prisma.notification.create({
        data: {
          userId: project.adviserId,
          title: 'Group Chose Their Title',
          message: siblings.length
            ? `The group chose "${project.title}" as their final title proposal and withdrew ${siblings.length} other candidate${siblings.length === 1 ? '' : 's'}. Ready for your review.`
            : `The group chose "${project.title}" as their final title proposal. Ready for your review.`,
          type: 'info',
          entityType: 'project',
          entityId: project.id
        }
      });
    }

    return successResponse({ withdrawnCount: siblings.length });
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withApiLogging('POST', '/api/title-submissions/[id]/choose', handlePOST);
