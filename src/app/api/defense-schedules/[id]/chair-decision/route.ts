import { DefenseChairDecision, DefensePanelRole, DefenseStatus, MilestoneCheckpointReviewStatus } from '@/generated/prisma/client';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { HttpError, handleApiError, normalizeText, parseJsonBody, successResponse } from '@/lib/utils';
import {
  applyDefensePassOutcome,
  attachDefenseDecisionFeedback,
  getNewTitleRecoveryStage,
  resetProjectForNewTitle,
  restartDefenseVoteForBackupTitle
} from '@/lib/milestone-checkpoint-tracking';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

type ChairDecisionBody = {
  decision: 'approve' | 'redefense' | 'new_title' | 'new_title_approved';
  remarks?: string;
  // Only used for 'new_title_approved' — the replacement title the group
  // presented and the chair is clearing in this same sitting.
  title?: string;
  description?: string;
  keywords?: string[];
  backupDraftId?: string;
};

async function handlePOST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: scheduleId } = await context.params;
    const authUser = await requireAuthenticatedUser(request);
    const body = await parseJsonBody<ChairDecisionBody>(request);

    if (
      body.decision !== 'approve' &&
      body.decision !== 'redefense' &&
      body.decision !== 'new_title' &&
      body.decision !== 'new_title_approved'
    ) {
      throw new HttpError('Invalid decision.', 400);
    }

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

    // 2. Only the panel chair can record this follow-up decision
    const evaluation = schedule.evaluations.find((e) => e.evaluatorId === authUser.id);
    if (!evaluation || evaluation.panelRole !== DefensePanelRole.CHAIR) {
      throw new HttpError('Only the panel chair can record this decision.', 403);
    }

    // 3. The defense must already be finalized (all votes in), and the outcome must not be a pass —
    // this decision only applies when the panel rejected or tied.
    if (schedule.status !== DefenseStatus.COMPLETED) {
      throw new HttpError('This defense has not been finalized yet.', 400);
    }

    let noVotes = 0;
    for (const ev of schedule.evaluations) {
      if (['REDEFENSE', 'FAILED'].includes(ev.recommendation)) {
        noVotes++;
      }
    }

    // Matches finalizeDefenseSchedule in evaluate/route.ts: unanimous Yes is
    // required to pass, so any No vote is enough to put this in the chair's
    // court.
    if (noVotes === 0) {
      throw new HttpError('This decision only applies when the panel did not pass the defense.', 400);
    }

    const decision = body.decision === 'approve'
      ? DefenseChairDecision.APPROVED
      : body.decision === 'redefense'
        ? DefenseChairDecision.REDEFENSE
        : body.decision === 'new_title_approved'
          ? DefenseChairDecision.NEW_TITLE_APPROVED
          : DefenseChairDecision.NEW_TITLE;
    const remarks = body.remarks?.trim() || null;
    const reviewerName = authUser.displayName || authUser.name || undefined;

    let replacementTitle = '';
    let replacementDescription = normalizeText(body.description);
    let replacementKeywords = Array.isArray(body.keywords)
      ? body.keywords.map((keyword) => normalizeText(keyword)).filter(Boolean)
      : [];

    if (decision === DefenseChairDecision.NEW_TITLE_APPROVED) {
      // No freeform typing, at Concept or Proposal+ — this only clears a
      // backup the adviser has ALREADY reviewed and approved. Real vetting
      // already happened, it just wasn't live in the room. The submitted
      // content must match that backup exactly, the same trust boundary
      // POST /api/title-submissions uses for its own pre-approved-backup
      // shortcut.
      const requestedBackupDraftId = normalizeText(body.backupDraftId);
      if (!requestedBackupDraftId) {
        throw new HttpError(
          'Approve Backup Title only works with a backup your adviser has already approved. Pick one, or use New Title instead.',
          400
        );
      }

      const backup = await prisma.titleDraft.findFirst({
        where: {
          id: requestedBackupDraftId,
          groupId: schedule.project.groupId || undefined,
          reviewStatus: MilestoneCheckpointReviewStatus.APPROVED
        },
        select: { title: true, description: true, keywords: true }
      });

      if (!backup) {
        throw new HttpError('That backup was not found or is not adviser-approved yet.', 400);
      }

      const sortedKeywordsMatch = (a: string[], b: string[]) =>
        a.length === b.length && [...a].sort().join('\u0000') === [...b].sort().join('\u0000');

      if (
        normalizeText(body.title).toLowerCase() !== normalizeText(backup.title).toLowerCase() ||
        normalizeText(body.description).toLowerCase() !== normalizeText(backup.description || '').toLowerCase() ||
        !sortedKeywordsMatch(replacementKeywords, backup.keywords)
      ) {
        throw new HttpError('The submitted title no longer matches the approved backup exactly. Reselect it before approving.', 400);
      }

      replacementTitle = normalizeText(backup.title);
      replacementDescription = normalizeText(backup.description || '');
      replacementKeywords = backup.keywords;

      if (replacementTitle.toLowerCase() === schedule.project.title.trim().toLowerCase()) {
        throw new HttpError('This is the same title that was just rejected. Enter the genuinely different one that was presented.', 400);
      }
    }

    // NEW_TITLE_APPROVED is excluded here — it never lands as a final,
    // persisted decision. restartDefenseVoteForBackupTitle below reopens this
    // same schedule row for a fresh vote instead, and explicitly clears
    // chairDecision back to null so the voting UI reappears rather than a
    // decided-recap view.
    if (decision !== DefenseChairDecision.NEW_TITLE_APPROVED) {
      await prisma.defenseSchedule.update({
        where: { id: schedule.id },
        data: {
          chairDecision: decision,
          chairDecisionAt: new Date(),
          chairDecisionRemarks: remarks,
          // Project.title gets overwritten in place once the group submits a
          // replacement (see title-submissions/route.ts) — snapshot it here so
          // the rejected title isn't permanently lost once that happens.
          previousProjectTitle: decision === DefenseChairDecision.NEW_TITLE ? schedule.project.title : undefined
        }
      });
    }

    // Notify the student and their adviser — same pattern as title-submissions' review
    // notification. Neither would otherwise learn about this decision until they happened
    // to notice the project status change or a resubmitted title.
    const notifyUserIds = Array.from(
      new Set([schedule.project.ownerId, schedule.project.adviserId].filter((id): id is string => Boolean(id)))
    );

    if (decision === DefenseChairDecision.APPROVED) {
      // The chair overrules the panel's own No vote(s) and passes it anyway —
      // reuses the exact same "pass" state as a real panel pass, just with
      // notification wording that's honest about it being an override rather
      // than implying the panel agreed.
      await applyDefensePassOutcome(prisma, {
        projectId: schedule.projectId,
        projectTitle: schedule.project.title,
        scheduleTitle: schedule.title,
        groupId: schedule.project.group?.id ?? null,
        notifyUserIds,
        notificationMessage: `The panel chair approved "${schedule.project.title}" despite the panel's vote, overriding the ${schedule.title} outcome.${remarks ? ` ${remarks}` : ''}`
      });
    } else if (decision === DefenseChairDecision.REDEFENSE) {
      // Project.status/checkpoint status are already NEEDS_REVISION from the vote finalize step —
      // this just attaches the chair's rationale so the student sees why.
      await attachDefenseDecisionFeedback(prisma, {
        projectId: schedule.projectId,
        scheduleTitle: schedule.title,
        remarks,
        reviewerName
      });

      if (notifyUserIds.length) {
        await prisma.notification.createMany({
          data: notifyUserIds.map((userId) => ({
            userId,
            title: 'Defense Decision: Redefense Required',
            message: `The panel chair recorded a redefense decision for "${schedule.project.title}".${remarks ? ` ${remarks}` : ''}`,
            type: 'warning',
            entityType: 'project',
            entityId: schedule.projectId
          }))
        });
      }
    } else if (decision === DefenseChairDecision.NEW_TITLE) {
      // The panel rejected the title itself, not any earlier-stage work that's
      // already been cleared — a Concept-stage rejection leaves nothing "earlier"
      // to protect, while a Proposal-stage rejection leaves the already-approved
      // Concept stage and the proposal chapters/defense evidence untouched, since
      // those aren't invalidated by a title change. Only the checkpoints for the
      // stage that was actually rejected reopen (see resetProjectForNewTitle). The
      // group submits a replacement title against this same project via
      // /api/title-submissions, which recognizes this "new title required" state
      // and updates it in place instead of creating a fresh project.
      const stage = getNewTitleRecoveryStage(schedule.title) ?? 'proposal';
      await resetProjectForNewTitle(prisma, {
        projectId: schedule.projectId,
        previousTitle: schedule.project.title,
        chairRemarks: remarks,
        scheduleTitle: schedule.title
      });

      if (notifyUserIds.length) {
        const unaffectedNote =
          stage === 'concept'
            ? ''
            : ' Your Concept-stage approval is unaffected — submit a replacement title to continue.';
        await prisma.notification.createMany({
          data: notifyUserIds.map((userId) => ({
            userId,
            title: 'Defense Decision: New Title Required',
            message: `The panel chair determined "${schedule.project.title}" requires a new title.${remarks ? ` ${remarks}` : ''}${unaffectedNote}${stage === 'concept' ? ' Submit a replacement title to continue.' : ''}`,
            type: 'info',
            entityType: 'project',
            entityId: schedule.projectId
          }))
        });
      }
    } else {
      // NEW_TITLE_APPROVED — the group is pivoting to an adviser-approved
      // backup title in this same sitting. Rather than skipping the vote,
      // this reopens the SAME defense schedule for a fresh round: the group
      // presents the backup live, and every panelist votes again on it.
      const groupId = schedule.project.group?.id ?? null;

      await restartDefenseVoteForBackupTitle(prisma, {
        scheduleId: schedule.id,
        projectId: schedule.projectId,
        groupId,
        scheduleTitle: schedule.title,
        title: replacementTitle,
        description: replacementDescription,
        keywords: replacementKeywords
      });

      // Best-effort — the backup's own already-uploaded files become this
      // project's files, so the group doesn't need to re-upload just to
      // present the same backup live (same move as the pre-approved
      // shortcut in POST /api/title-submissions).
      const backupDraftId = normalizeText(body.backupDraftId);
      if (backupDraftId) {
        const linkedBackup = await prisma.titleDraft.findFirst({
          where: { id: backupDraftId, groupId: groupId || undefined },
          select: { files: { select: { id: true } } }
        }).catch(() => null);

        if (linkedBackup?.files.length) {
          for (const file of linkedBackup.files) {
            try {
              await prisma.uploadedFile.update({
                where: { id: file.id },
                data: {
                  projectId: schedule.projectId,
                  documentCategory: 'Title Proposal',
                  category: 'Title Proposal',
                  titleDraftId: null
                }
              });
            } catch (fileMoveError) {
              console.warn(`Unable to move backup file ${file.id} to the new submission:`, fileMoveError);
            }
          }
        }
      }

      if (notifyUserIds.length) {
        await prisma.notification.createMany({
          data: notifyUserIds.map((userId) => ({
            userId,
            title: 'Voting Again — Backup Title',
            message: `Your previous title "${schedule.project.title}" was not approved. The panel chair is moving forward with your backup "${replacementTitle}" in this same session — present it now, the panel will vote again.${remarks ? ` ${remarks}` : ''}`,
            type: 'info',
            entityType: 'project',
            entityId: schedule.projectId
          }))
        });
      }
    }

    return successResponse({
      message:
        decision === DefenseChairDecision.APPROVED
          ? 'Recorded: the defense is approved, overriding the panel vote.'
          : decision === DefenseChairDecision.REDEFENSE
            ? 'Recorded: the student will revise and re-attempt this title.'
            : decision === DefenseChairDecision.NEW_TITLE_APPROVED
              ? 'Recorded: voting has reset — the panel can now vote on the backup title.'
              : 'Recorded: this title has been archived — the student will need to submit a new title.'
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withApiLogging('POST', '/api/defense-schedules/[id]/chair-decision', handlePOST);
