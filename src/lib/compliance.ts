import {
  ComplianceReviewStatus,
  ComplianceStatus,
  DefenseChairDecision,
  DefenseStatus,
  EvaluationRecommendation,
  Prisma
} from '@/generated/prisma/client';

// Only these defenses end with panel-required revisions the group has to
// comply with. Concept Presentation and the Pre-Final practice run don't.
export const COMPLIANCE_SCHEDULE_TYPES = ['Proposal Defense', 'Final Defense'] as const;

export const COMPLIANCE_DOCUMENT_CATEGORY_BY_SCHEDULE_TYPE: Record<string, string> = {
  'Proposal Defense': 'proposal-compliance',
  'Final Defense': 'final-compliance'
};

export const COMPLIANCE_ENTITY_TYPE = 'compliance_submission';

const PASSING_RECOMMENDATIONS = new Set<EvaluationRecommendation>([
  EvaluationRecommendation.PASSED,
  EvaluationRecommendation.PASSED_MINOR,
  EvaluationRecommendation.PASSED_MAJOR
]);

const CHAIR_APPROVAL_DECISIONS = new Set<DefenseChairDecision>([
  DefenseChairDecision.APPROVED,
  DefenseChairDecision.NEW_TITLE_APPROVED
]);

const personSelect = {
  id: true,
  name: true,
  firstName: true,
  lastName: true,
  displayName: true,
  email: true,
  role: true
} as const;

export const complianceDefenseInclude = {
  project: {
    select: {
      id: true,
      title: true,
      ownerId: true,
      adviserId: true,
      adviser: { select: personSelect },
      group: {
        select: {
          id: true,
          code: true,
          title: true,
          students: true,
          groupMembers: {
            where: { isActive: true },
            select: { userId: true }
          }
        }
      }
    }
  },
  evaluations: {
    where: { evaluatorId: { not: null } },
    select: {
      evaluatorId: true,
      panelRole: true,
      recommendation: true,
      evaluator: { select: personSelect }
    },
    orderBy: [{ panelRole: 'asc' }, { createdAt: 'asc' }]
  },
  complianceSubmissions: {
    orderBy: { version: 'desc' },
    include: {
      submittedBy: { select: personSelect },
      file: {
        select: {
          id: true,
          fileName: true,
          fileType: true,
          size: true
        }
      },
      reviews: {
        include: { reviewer: { select: personSelect } },
        orderBy: { createdAt: 'asc' }
      }
    }
  }
} satisfies Prisma.DefenseScheduleInclude;

export type ComplianceDefenseRecord = Prisma.DefenseScheduleGetPayload<{
  include: typeof complianceDefenseInclude;
}>;

type PersonRecord = {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  email?: string | null;
} | null | undefined;

export function getPersonName(person: PersonRecord) {
  if (!person) return '';
  return person.displayName || person.name || [person.firstName, person.lastName].filter(Boolean).join(' ') || person.email || '';
}

// A defense only calls for compliance once the panel has actually cleared it:
// every vote is Yes, or the chair overrode a failed vote with an approval.
// REDEFENSE / NEW_TITLE outcomes mean another defense is coming instead.
export function isDefensePassed(schedule: Pick<ComplianceDefenseRecord, 'status' | 'chairDecision' | 'evaluations'>) {
  if (schedule.status !== DefenseStatus.COMPLETED) {
    return false;
  }

  if (schedule.chairDecision) {
    return CHAIR_APPROVAL_DECISIONS.has(schedule.chairDecision);
  }

  return schedule.evaluations.length > 0
    && schedule.evaluations.every((evaluation) => PASSING_RECOMMENDATIONS.has(evaluation.recommendation));
}

export function rollUpComplianceStatus(reviews: Array<{ status: ComplianceReviewStatus }>) {
  if (reviews.some((review) => review.status === ComplianceReviewStatus.NEEDS_REVISION)) {
    return ComplianceStatus.NEEDS_REVISION;
  }

  if (reviews.length > 0 && reviews.every((review) => review.status === ComplianceReviewStatus.VERIFIED)) {
    return ComplianceStatus.APPROVED;
  }

  return ComplianceStatus.UNDER_REVIEW;
}

export function getGroupRecipientIds(project: ComplianceDefenseRecord['project']) {
  return Array.from(new Set([
    ...(project.group?.groupMembers.map((member) => member.userId) ?? []),
    ...(project.ownerId ? [project.ownerId] : [])
  ]));
}

// Why the group can't submit (or resubmit) right now, or null when they can.
export function getSubmitBlockedReason(schedule: ComplianceDefenseRecord) {
  if (!isDefensePassed(schedule)) {
    return 'Compliance opens once the panel has passed this defense.';
  }

  if (schedule.evaluations.length === 0) {
    return 'No panelists are recorded for this defense. Contact your Program Head.';
  }

  const latest = schedule.complianceSubmissions[0];

  if (latest?.status === ComplianceStatus.UNDER_REVIEW) {
    return 'Your latest compliance is still being reviewed by the panel.';
  }

  if (latest?.status === ComplianceStatus.APPROVED) {
    return 'All panelists have verified your compliance.';
  }

  return null;
}

export function toComplianceDefensePayload(schedule: ComplianceDefenseRecord, viewerId?: string) {
  const latest = schedule.complianceSubmissions[0] ?? null;
  const passed = isDefensePassed(schedule);
  const blockedReason = getSubmitBlockedReason(schedule);

  return {
    scheduleId: schedule.id,
    scheduleType: schedule.title,
    scheduledAt: schedule.scheduledAt.toISOString(),
    location: schedule.location,
    projectId: schedule.project.id,
    projectTitle: schedule.project.title,
    groupCode: schedule.project.group?.code ?? '',
    groupTitle: schedule.project.group?.title ?? '',
    students: schedule.project.group?.students ?? [],
    adviserName: getPersonName(schedule.project.adviser),
    defensePassed: passed,
    complianceStatus: latest?.status ?? null,
    canSubmit: blockedReason === null,
    submitBlockedReason: blockedReason,
    panelists: schedule.evaluations.map((evaluation) => ({
      id: evaluation.evaluatorId ?? '',
      name: getPersonName(evaluation.evaluator) || 'Panelist',
      panelRole: evaluation.panelRole,
      isViewer: Boolean(viewerId && evaluation.evaluatorId === viewerId)
    })),
    submissions: schedule.complianceSubmissions.map((submission, index) => {
      const myReview = viewerId
        ? submission.reviews.find((review) => review.reviewerId === viewerId) ?? null
        : null;

      return {
        id: submission.id,
        version: submission.version,
        isLatest: index === 0,
        status: submission.status,
        notes: submission.notes,
        submittedAt: submission.submittedAt.toISOString(),
        approvedAt: submission.approvedAt?.toISOString() ?? null,
        submittedByName: getPersonName(submission.submittedBy),
        file: submission.file
          ? {
              id: submission.file.id,
              fileName: submission.file.fileName,
              fileType: submission.file.fileType,
              size: submission.file.size
            }
          : null,
        reviews: submission.reviews.map((review) => ({
          id: review.id,
          reviewerId: review.reviewerId,
          reviewerName: getPersonName(review.reviewer) || 'Panelist',
          status: review.status,
          remarks: review.remarks,
          reviewedAt: review.reviewedAt?.toISOString() ?? null
        })),
        myReviewStatus: myReview?.status ?? null,
        myReviewRemarks: myReview?.remarks ?? null,
        // Panelists can change their call until everyone has verified it;
        // superseded versions are locked once the group resubmits.
        canReview: Boolean(myReview) && index === 0 && submission.status !== ComplianceStatus.APPROVED
      };
    })
  };
}

export type ComplianceDefensePayload = ReturnType<typeof toComplianceDefensePayload>;
