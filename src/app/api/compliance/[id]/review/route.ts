import { ComplianceReviewStatus, ComplianceStatus, UserRole } from '@/generated/prisma/client';
import { requireAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { HttpError, handleApiError, normalizeText, parseJsonBody, successResponse } from '@/lib/utils';
import {
  COMPLIANCE_ENTITY_TYPE,
  complianceDefenseInclude,
  getGroupRecipientIds,
  getPersonName,
  rollUpComplianceStatus
} from '@/lib/compliance';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

type ReviewBody = {
  decision?: unknown;
  remarks?: unknown;
};

const DECISIONS: Record<string, ComplianceReviewStatus> = {
  verified: ComplianceReviewStatus.VERIFIED,
  needs_revision: ComplianceReviewStatus.NEEDS_REVISION
};

async function handlePOST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: complianceId } = await context.params;
    const user = await requireAuthenticatedUser(request, [UserRole.ADVISER, UserRole.PANEL, UserRole.PROGRAM_HEAD]);
    const body = await parseJsonBody<ReviewBody>(request);
    const decision = DECISIONS[normalizeText(body.decision).toLowerCase()];
    const remarks = normalizeText(body.remarks);

    if (!decision) {
      throw new HttpError('Choose Verified or Needs Revision.', 400, { decision: 'Choose a decision.' });
    }

    if (decision === ComplianceReviewStatus.NEEDS_REVISION && !remarks) {
      throw new HttpError('Tell the group what still needs to be revised.', 400, {
        remarks: 'Remarks are required when requesting revisions.'
      });
    }

    const compliance = await prisma.complianceSubmission.findUnique({
      where: { id: complianceId },
      include: {
        reviews: true,
        defenseSchedule: { include: complianceDefenseInclude }
      }
    });

    // Same 404 whether it doesn't exist or this user isn't on its panel, so a
    // panelist can't probe other groups' compliance ids.
    const myReview = compliance?.reviews.find((review) => review.reviewerId === user.id);

    if (!compliance || !myReview) {
      throw new HttpError('Compliance submission was not found in your panel assignments.', 404);
    }

    const latestVersion = compliance.defenseSchedule.complianceSubmissions[0]?.version ?? compliance.version;

    if (compliance.version !== latestVersion) {
      throw new HttpError('The group has already submitted a newer version. Review that one instead.', 409);
    }

    if (compliance.status === ComplianceStatus.APPROVED) {
      throw new HttpError('Every panelist has already verified this compliance.', 409);
    }

    const updatedReviews = compliance.reviews.map((review) => (
      review.id === myReview.id ? { ...review, status: decision } : review
    ));
    const nextStatus = rollUpComplianceStatus(updatedReviews);

    await prisma.$transaction([
      prisma.complianceReview.update({
        where: { id: myReview.id },
        data: {
          status: decision,
          remarks: remarks || null,
          reviewedAt: new Date()
        }
      }),
      prisma.complianceSubmission.update({
        where: { id: compliance.id },
        data: {
          status: nextStatus,
          approvedAt: nextStatus === ComplianceStatus.APPROVED ? new Date() : null
        }
      })
    ]);

    const schedule = compliance.defenseSchedule;
    const reviewerName = getPersonName(user) || 'A panelist';
    const groupRecipients = getGroupRecipientIds(schedule.project);
    const notifications: Array<{ userId: string; title: string; message: string; type: string }> = [];

    if (decision === ComplianceReviewStatus.NEEDS_REVISION) {
      for (const userId of groupRecipients) {
        notifications.push({
          userId,
          title: 'Compliance Needs Revision',
          message: `${reviewerName} requested revisions on your ${schedule.title} compliance (v${compliance.version}): ${remarks}`,
          type: 'feedback'
        });
      }
    } else if (nextStatus === ComplianceStatus.APPROVED) {
      const approvedRecipients = new Set(groupRecipients);

      if (schedule.project.adviserId) {
        approvedRecipients.add(schedule.project.adviserId);
      }

      for (const userId of approvedRecipients) {
        notifications.push({
          userId,
          title: 'Compliance Approved',
          message: `All panelists verified the ${schedule.title} compliance for "${schedule.project.title}".`,
          type: 'success'
        });
      }
    } else {
      for (const userId of groupRecipients) {
        notifications.push({
          userId,
          title: 'Compliance Verified',
          message: `${reviewerName} verified your ${schedule.title} compliance. Waiting on the rest of the panel.`,
          type: 'info'
        });
      }
    }

    if (notifications.length) {
      await prisma.notification.createMany({
        data: notifications.map((notification) => ({
          ...notification,
          entityType: COMPLIANCE_ENTITY_TYPE,
          entityId: compliance.id
        }))
      });
    }

    return successResponse({ message: 'Your compliance review was saved.', status: nextStatus });
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withApiLogging('POST', '/api/compliance/[id]/review', handlePOST);
