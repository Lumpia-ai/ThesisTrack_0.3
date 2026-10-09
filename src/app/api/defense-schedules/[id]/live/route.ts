import { DefenseStatus, EvaluationRecommendation, Prisma } from '@/generated/prisma/client';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { HttpError, handleApiError, parseJsonBody, successResponse } from '@/lib/utils';
import {
  finalizeDefenseSchedule,
  getDefenseStudents,
  getLiveDefenseState,
  getPanelAggregate,
  getViewerRole,
  loadLiveDefense,
  readStoredRatingSheet,
  type StoredRatingSheet
} from '@/lib/live-defense';
import {
  getRatingFormForScheduleType,
  scoreRatingSheet,
  validateRatingSheet,
  type RatingSheetScores
} from '@/lib/defense-rating-forms';
import { getDefenseEventLabel } from '@/lib/stage-labels';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

const MAX_MINUTES_LENGTH = 50_000;

type LiveDefenseBody =
  | { action: 'start' }
  | { action: 'save-sheet'; sheet: RatingSheetScores; remarks?: string; submit?: boolean }
  | { action: 'save-minutes'; minutes: string }
  | { action: 'confirm-minutes' }
  | { action: 'finalize' };

async function handleGET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = await requireAuthenticatedUser(request);
    const state = await getLiveDefenseState(id, user);
    return successResponse({ defense: state });
  } catch (error) {
    return handleApiError(error);
  }
}

async function handlePOST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = await requireAuthenticatedUser(request);
    const body = await parseJsonBody<LiveDefenseBody>(request);
    const schedule = await loadLiveDefense(id);
    const viewerRole = getViewerRole(schedule, user);
    const form = getRatingFormForScheduleType(schedule.title);

    switch (body?.action) {
      case 'start': {
        if (viewerRole !== 'chair') {
          throw new HttpError('Only the panel chair can start the defense.', 403);
        }
        if (schedule.status !== DefenseStatus.SCHEDULED) {
          throw new HttpError('This defense has already started or is closed.', 409);
        }

        await prisma.defenseSchedule.update({
          where: { id },
          data: { status: DefenseStatus.IN_PROGRESS, startedAt: new Date() }
        });

        const notifyIds = [
          ...schedule.evaluations.map((evaluation) => evaluation.evaluatorId),
          schedule.secretaryId
        ].filter((value): value is string => Boolean(value) && value !== user.id);

        if (notifyIds.length) {
          await prisma.notification.createMany({
            data: notifyIds.map((userId) => ({
              userId,
              title: getDefenseEventLabel(schedule.title, 'in-progress'),
              message: `The chair started the ${schedule.title} of "${schedule.project.title}". Open Live Defense to rate.`,
              type: 'info',
              entityType: 'DefenseSchedule',
              entityId: id
            }))
          });
        }
        break;
      }

      case 'save-sheet': {
        if (viewerRole !== 'chair' && viewerRole !== 'member') {
          throw new HttpError('Only assigned panelists can rate this defense.', 403);
        }
        if (!form) {
          throw new HttpError(`The ${schedule.title} has no rating sheet.`, 400);
        }
        if (schedule.status !== DefenseStatus.IN_PROGRESS) {
          throw new HttpError('Rating opens once the chair starts the defense, and closes when it is finalized.', 409);
        }

        const evaluation = schedule.evaluations.find((entry) => entry.evaluatorId === user.id)!;
        const existing = readStoredRatingSheet(evaluation.rubricData);
        if (existing?.submitted) {
          throw new HttpError('You already submitted your rating sheet.', 409);
        }

        const studentIds = getDefenseStudents(schedule).map((student) => student.id);
        const sheet: RatingSheetScores = {
          stage: form.stage,
          formVersion: form.version,
          group: body.sheet?.group ?? {},
          individual: body.sheet?.individual ?? {},
          sectionRemarks: body.sheet?.sectionRemarks ?? {},
          recommendations: String(body.sheet?.recommendations ?? '').slice(0, 5000)
        };

        if (body.submit) {
          const errors = validateRatingSheet(form, sheet, studentIds);
          if (errors.length) {
            throw new HttpError('Complete every rating before submitting.', 422, Object.fromEntries(
              errors.map((error) => [error.path, error.message])
            ));
          }
        }

        const result = scoreRatingSheet(form, sheet, studentIds);
        const stored: StoredRatingSheet = {
          sheet,
          result,
          submitted: Boolean(body.submit),
          savedAt: new Date().toISOString()
        };

        await prisma.evaluation.update({
          where: { id: evaluation.id },
          data: {
            rubricData: stored as unknown as Prisma.InputJsonValue,
            remarks: typeof body.remarks === 'string' ? body.remarks.slice(0, 5000) : evaluation.remarks,
            ...(body.submit
              ? {
                  submittedAt: new Date(),
                  // Keeps vote-based screens (tallies, history) meaningful.
                  recommendation: result.passed ? EvaluationRecommendation.PASSED : EvaluationRecommendation.REDEFENSE,
                  score: Math.round(result.total)
                }
              : {})
          }
        });
        break;
      }

      case 'save-minutes': {
        if (viewerRole !== 'secretary' && viewerRole !== 'chair') {
          throw new HttpError('Only the assigned secretary or the chair can edit the minutes.', 403);
        }
        if (schedule.minutesConfirmedAt) {
          throw new HttpError('The chair already confirmed these minutes.', 409);
        }

        await prisma.defenseSchedule.update({
          where: { id },
          data: {
            minutes: String(body.minutes ?? '').slice(0, MAX_MINUTES_LENGTH),
            minutesUpdatedAt: new Date()
          }
        });
        break;
      }

      case 'confirm-minutes': {
        if (viewerRole !== 'chair') {
          throw new HttpError('Only the panel chair can confirm the minutes.', 403);
        }
        if (!schedule.minutes?.trim()) {
          throw new HttpError('There are no minutes to confirm yet.', 400);
        }

        await prisma.defenseSchedule.update({
          where: { id },
          data: { minutesConfirmedAt: new Date() }
        });
        break;
      }

      case 'finalize': {
        if (viewerRole !== 'chair') {
          throw new HttpError('Only the panel chair can finalize the defense.', 403);
        }
        if (schedule.status !== DefenseStatus.IN_PROGRESS) {
          throw new HttpError('Only a defense in progress can be finalized.', 409);
        }

        const pending = schedule.evaluations.filter((evaluation) => !evaluation.submittedAt);
        if (pending.length) {
          throw new HttpError(`${pending.length} panelist(s) have not submitted their rating sheet yet.`, 409);
        }

        const aggregate = form ? getPanelAggregate(form, schedule) : null;
        const notifyUserIds = Array.from(
          new Set([schedule.project.ownerId, schedule.project.adviserId].filter((value): value is string => Boolean(value)))
        );

        await finalizeDefenseSchedule({
          scheduleId: id,
          projectId: schedule.projectId,
          projectTitle: schedule.project.title,
          scheduleTitle: schedule.title,
          evaluations: schedule.evaluations,
          notifyUserIds,
          groupId: schedule.project.group?.id ?? null,
          ratingOutcome: aggregate ? { passed: aggregate.passed, total: aggregate.total } : null
        });
        break;
      }

      default:
        throw new HttpError('Unknown live defense action.', 400);
    }

    const state = await getLiveDefenseState(id, user);
    return successResponse({ defense: state });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withApiLogging('GET', '/api/defense-schedules/[id]/live', handleGET);
export const POST = withApiLogging('POST', '/api/defense-schedules/[id]/live', handlePOST);
