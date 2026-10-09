import { DefensePanelRole, DefenseStatus } from '@/generated/prisma/client';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { HttpError, handleApiError, parseJsonBody, successResponse } from '@/lib/utils';
import { finalizeDefenseSchedule } from '@/lib/live-defense';
import { getRatingFormForScheduleType } from '@/lib/defense-rating-forms';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

type EvaluateBody = {
  feedback: string;
  vote?: 'yes' | 'no';
  isChairSubmit?: boolean;
};

async function handlePOST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: scheduleId } = await context.params;
    const authUser = await requireAuthenticatedUser(request);
    const body = await parseJsonBody<EvaluateBody>(request);

    // 1. Validate the schedule exists
    const schedule = await prisma.defenseSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        project: {
          include: {
            group: true
          }
        },
        evaluations: true
      }
    });

    if (!schedule) {
      throw new HttpError('Defense schedule not found', 404);
    }

    // 2. Validate user is an evaluator
    const evaluation = schedule.evaluations.find(e => e.evaluatorId === authUser.id);
    if (!evaluation) {
      throw new HttpError('You are not assigned to this defense panel', 403);
    }

    // Concept, Proposal, and Final defenses are rated on the department's
    // rating sheet from the Live Defense page; only stages without a sheet
    // (e.g. the Pre-Final practice run) still take a plain yes/no vote here.
    if (getRatingFormForScheduleType(schedule.title)) {
      throw new HttpError(`The ${schedule.title} is rated with the panel rating sheet. Open it from Live Defense.`, 409);
    }

    const isChair = evaluation.panelRole === DefensePanelRole.CHAIR;

    // 3. There is no scoring in this workflow — the panelist's vote alone decides the recommendation.
    let recommendation = evaluation.recommendation;
    if (body.vote === 'yes') {
      recommendation = 'PASSED';
    } else if (body.vote === 'no') {
      recommendation = 'REDEFENSE';
    } else {
      recommendation = 'PENDING';
    }

    // 4. Update the Evaluation record
    await prisma.evaluation.update({
      where: { id: evaluation.id },
      data: {
        rubricData: {
          vote: body.vote
        },
        remarks: body.feedback,
        recommendation: recommendation,
        submittedAt: new Date()
      }
    });

    // 5. Finalize automatically once every assigned panelist has voted — completion no longer
    // depends on a "live session" chair action. `isChairSubmit` is still honored as a manual
    // override (e.g. a chair closing out a defense early) for backward compatibility.
    const allEvaluations = await prisma.evaluation.findMany({
      where: { defenseScheduleId: schedule.id }
    });
    const allVoted = allEvaluations.length > 0 && allEvaluations.every((ev) => ev.submittedAt !== null);
    const shouldFinalize = schedule.status !== DefenseStatus.COMPLETED && (allVoted || (isChair && body.isChairSubmit));

    if (shouldFinalize) {
      const notifyUserIds = Array.from(
        new Set([schedule.project.ownerId, schedule.project.adviserId].filter((id): id is string => Boolean(id)))
      );
      await finalizeDefenseSchedule({
        scheduleId: schedule.id,
        projectId: schedule.projectId,
        projectTitle: schedule.project.title,
        scheduleTitle: schedule.title,
        evaluations: allEvaluations,
        notifyUserIds,
        groupId: schedule.project.group?.id ?? null
      });
    }

    return successResponse({
      message: shouldFinalize ? 'Defense session completed successfully.' : 'Vote submitted successfully.'
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withApiLogging('POST', '/api/defense-schedules/[id]/evaluate', handlePOST);
