import { SubmissionStatus, UserRole } from '@/generated/prisma/client';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { HttpError, handleApiError, normalizeText, successResponse } from '@/lib/utils';
import { syncCheckpointReview } from '@/lib/milestone-checkpoint-tracking';
import { assertDocumentBucket, deleteFile } from '@/lib/storage/supabase-storage';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

// Uploading the oral defense application evidence itself happens through the
// generic /api/document-files route, as one of the "Oral Defense Application
// Evidence" categories on Document Submissions (Concept, Proposal, or Final) —
// consolidated there along with Award/Recognition and Activity Evidence so
// students have one upload surface instead of several. This file only handles
// the adviser's independent review decision on that evidence, which stays
// separate from any title/chapter decision since the evidence for a stage is
// typically uploaded once that stage's other requirements are already met.

const EVIDENCE_REVIEWER_ROLES = [
  UserRole.ADVISER,
  UserRole.RESEARCH_HEAD,
  UserRole.PROGRAM_HEAD,
  UserRole.SYSTEM_ADMIN,
  UserRole.ADMIN
];

const EVIDENCE_DECISION_TO_STATUS: Record<string, SubmissionStatus> = {
  approved: SubmissionStatus.APPROVED,
  needs_revision: SubmissionStatus.NEEDS_REVISION,
  rejected: SubmissionStatus.REJECTED
};

const VALID_CHECKPOINT_KEYS = new Set([
  'concept-defense-application',
  'proposal-defense-application',
  'final-defense-application'
]);

// Independent adviser (or admin/research head/program head) decision on the
// evidence photo itself for a given stage — separate from that stage's other
// decisions, since by the time this evidence exists the rest of the stage has
// typically already been cleared.
async function handlePATCH(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request, EVIDENCE_REVIEWER_ROLES);
    const body = await request.json().catch(() => ({}));
    const projectId = normalizeText(body?.projectId);
    const decision = normalizeText(body?.decision).toLowerCase();
    const remarks = normalizeText(body?.remarks);
    const checkpointKey = normalizeText(body?.checkpointKey) || 'concept-defense-application';
    const nextStatus = EVIDENCE_DECISION_TO_STATUS[decision];

    if (!projectId || !nextStatus) {
      throw new HttpError('Use a valid project id and decision: approved, needs_revision, or rejected.', 400);
    }

    if (!VALID_CHECKPOINT_KEYS.has(checkpointKey)) {
      throw new HttpError('Unknown defense application evidence stage.', 400);
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, adviserId: true, ownerId: true, title: true }
    });

    if (!project) {
      throw new HttpError('Project was not found.', 404);
    }

    const isAssignedAdviser = project.adviserId === user.id;
    const isAdmin = user.role === UserRole.ADMIN
      || user.role === UserRole.SYSTEM_ADMIN
      || user.role === UserRole.RESEARCH_HEAD
      || user.role === UserRole.PROGRAM_HEAD;

    if (!isAssignedAdviser && !isAdmin) {
      throw new HttpError('You can review evidence only for projects assigned to you.', 403);
    }

    const checkpoint = await prisma.milestoneCheckpoint.findUnique({
      where: { projectId_key: { projectId, key: checkpointKey } },
      include: {
        submissions: {
          orderBy: { submittedAt: 'desc' },
          take: 1,
          select: { id: true }
        }
      }
    });

    if (!checkpoint) {
      throw new HttpError('No oral defense application evidence has been uploaded yet for this project.', 400);
    }

    const latestSubmissionId = checkpoint.submissions[0]?.id;

    if (!latestSubmissionId) {
      throw new HttpError('No oral defense application evidence has been uploaded yet for this project.', 400);
    }

    // resolveOpenRound: true because evidence is typically a multi-photo batch —
    // the decision covers every still-pending Submission under this checkpoint,
    // not just the single latest one, otherwise sibling photos from the same
    // batch stay stuck showing "Sent to Adviser" forever.
    const updatedCheckpoint = await syncCheckpointReview(prisma, {
      submissionId: latestSubmissionId,
      nextStatus,
      reviewNotes: remarks,
      reviewerName: user.name || 'Adviser',
      reviewerRole: user.role,
      resolveOpenRound: true
    });

    // Needs Revision means the student is expected to re-upload a corrected
    // photo, so the rejected one no longer needs to sit in storage. The
    // Submission/UploadedFile rows stay (so the rejection reason and history
    // are still visible) — only the underlying storage object is removed.
    if (decision === 'needs_revision') {
      // By this point syncCheckpointReview (above) has already flipped every
      // submission in this round — including the latest one — to NEEDS_REVISION,
      // so filtering on that status here is enough to catch the whole batch.
      const filesToRemove = await prisma.uploadedFile.findMany({
        where: {
          submission: { checkpointId: checkpoint.id, status: SubmissionStatus.NEEDS_REVISION },
          filePath: { not: null }
        },
        select: { id: true, filePath: true, bucketName: true }
      });

      for (const file of filesToRemove) {
        if (!file.filePath || !file.bucketName) {
          continue;
        }

        try {
          assertDocumentBucket(file.bucketName);
          await deleteFile(file.bucketName, file.filePath);
          await prisma.uploadedFile.update({
            where: { id: file.id },
            data: { filePath: null, secureUrl: null }
          });
        } catch (error) {
          console.error(`Failed to remove storage object for evidence file ${file.id}:`, error);
        }
      }
    }

    if (project.ownerId) {
      const statusLabel = decision === 'approved' ? 'approved' : decision === 'needs_revision' ? 'returned for revision' : 'rejected';

      await prisma.notification.create({
        data: {
          userId: project.ownerId,
          title: 'Oral Defense Application Evidence Reviewed',
          message: `Your oral defense application evidence for "${project.title}" was ${statusLabel}.${remarks ? ' Review notes are available.' : ''}`,
          type: decision === 'approved' ? 'success' : decision === 'needs_revision' ? 'warning' : 'info',
          entityType: 'project',
          entityId: project.id
        }
      });
    }

    return successResponse({
      checkpoint: updatedCheckpoint
        ? {
            status: updatedCheckpoint.status,
            adviserReviewStatus: updatedCheckpoint.adviserReviewStatus,
            latestFeedback: updatedCheckpoint.latestFeedback
          }
        : null
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const PATCH = withApiLogging('PATCH', '/api/defense-application-evidence', handlePATCH);
