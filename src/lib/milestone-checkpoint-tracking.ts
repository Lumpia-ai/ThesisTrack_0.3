import {
  DefenseChairDecision,
  DefenseStatus,
  EvaluationRecommendation,
  MilestoneCheckpointReviewStatus,
  MilestoneCheckpointStatus,
  MilestoneStatus,
  ProjectStatus,
  SubmissionStatus,
  UserRole
} from '@/generated/prisma/client';

type DbClient = {
  project: any;
  milestone: any;
  milestoneCheckpoint: any;
  submission: any;
  uploadedFile: any;
  group: any;
  defenseSchedule: any;
  evaluation: any;
  notification: any;
};

type WorkflowStage = {
  key: string;
  title: string;
  description: string;
  sequence: number;
  checkpoints: Array<{
    key: string;
    title: string;
    description: string;
    sequence: number;
    panelRequired?: boolean;
    adviserRequired?: boolean;
  }>;
};

const APPROVED_PROJECT_STATUSES = new Set<ProjectStatus>([
  ProjectStatus.APPROVED,
  ProjectStatus.DEFENSE_SCHEDULED,
  ProjectStatus.COMPLETED
]);

const REVIEWED_SUBMISSION_STATUSES = new Set<SubmissionStatus>([
  SubmissionStatus.UNDER_REVIEW,
  SubmissionStatus.APPROVED,
  SubmissionStatus.NEEDS_REVISION,
  SubmissionStatus.REJECTED
]);

export const THESIS_MILESTONE_WORKFLOW: WorkflowStage[] = [
  {
    key: 'concept',
    title: 'Concept',
    description: 'Define the research topic, problem scope, and initial capstone direction.',
    sequence: 1,
    checkpoints: [
      { key: 'concept-title', title: 'Title & concept paper submitted', description: 'Official project title and concept paper document have been submitted together for adviser review.', sequence: 1, panelRequired: false },
      { key: 'concept-adviser-approval', title: 'Adviser idea approval', description: 'Adviser cleared the idea for concept presentation.', sequence: 2, panelRequired: false },
      { key: 'concept-defense-application', title: 'Oral defense application form uploaded', description: 'Photo evidence of the signed Application for Oral Defense of Thesis (Concept) — cleared by the Research Head, Director, and Program Head — is uploaded from Project Overview and independently reviewed by the adviser.', sequence: 3, panelRequired: false },
      { key: 'concept-presentation-scheduled', title: 'Concept presentation scheduled', description: 'Concept presentation schedule is recorded once the oral defense application evidence is approved.', sequence: 4, panelRequired: false, adviserRequired: false },
      { key: 'concept-panel-approval', title: 'Panel concept approval', description: 'Panel approved the concept after presentation.', sequence: 5, adviserRequired: false }
    ]
  },
  {
    key: 'proposal',
    title: 'Proposal',
    description: 'Submit the formal project proposal for adviser and panel evaluation and approval.',
    sequence: 2,
    checkpoints: [
      { key: 'proposal-chapters', title: 'Proposal document uploaded', description: 'Proposal manuscript or chapter documents were submitted.', sequence: 1, panelRequired: false },
      { key: 'proposal-adviser-review', title: 'Adviser initial review', description: 'Adviser completed the first proposal review.', sequence: 2, panelRequired: false },
      { key: 'proposal-defense-application', title: 'Oral defense application form uploaded', description: 'Photo evidence of the signed Application for Oral Defense of Thesis (Proposal) — cleared by the Research Head, Director, and Program Head — is uploaded from Document Submissions and independently reviewed by the adviser.', sequence: 3, panelRequired: false },
      { key: 'proposal-defense-scheduled', title: 'Proposal defense scheduled', description: 'Proposal defense schedule is recorded once the oral defense application evidence is approved.', sequence: 4, panelRequired: false, adviserRequired: false },
      { key: 'proposal-panel-evaluation', title: 'Panel evaluation', description: 'Panel evaluation is recorded for proposal defense.', sequence: 5, adviserRequired: false },
      { key: 'proposal-final-approval', title: 'Final approval', description: 'Proposal stage received final clearance.', sequence: 6 }
    ]
  },
  {
    key: 'development',
    title: 'Development',
    description: 'Build the system, submit progress reports, and provide implementation evidence.',
    sequence: 3,
    checkpoints: [
      { key: 'development-prototype', title: 'System / Prototype uploaded', description: 'Prototype, system build, or implementation evidence was uploaded.', sequence: 1, panelRequired: false },
      { key: 'development-progress-report', title: 'Progress report submitted', description: 'Development progress report was submitted.', sequence: 2, panelRequired: false },
      { key: 'development-testing-evidence', title: 'Testing evidence uploaded', description: 'Testing or validation evidence was uploaded.', sequence: 3, panelRequired: false },
      { key: 'development-adviser-monitoring', title: 'Adviser monitoring approval', description: 'Adviser cleared the development monitoring checkpoint.', sequence: 4, panelRequired: false }
    ]
  },
  {
    key: 'mock-defense',
    title: 'Pre-Final Defense',
    description: 'Present a practice defense, gather early feedback, and complete revisions.',
    sequence: 4,
    checkpoints: [
      { key: 'mock-presentation', title: 'Presentation uploaded', description: 'Pre-final defense presentation file was uploaded.', sequence: 1, panelRequired: false },
      { key: 'mock-defense-scheduled', title: 'Pre-final defense scheduled', description: 'Pre-final defense schedule is recorded.', sequence: 2, panelRequired: false, adviserRequired: false },
      { key: 'mock-panel-comments', title: 'Panel comments received', description: 'Panel comments were received after pre-final defense.', sequence: 3, adviserRequired: false },
      { key: 'mock-revisions-completed', title: 'Revisions completed', description: 'Pre-final defense revisions were submitted and cleared.', sequence: 4 }
    ]
  },
  {
    key: 'final-defense',
    title: 'Final Defense',
    description: 'Defend the completed project before the panel and submit final revisions.',
    sequence: 5,
    checkpoints: [
      { key: 'final-manuscript', title: 'Final manuscript uploaded', description: 'Final manuscript was uploaded for review.', sequence: 1, panelRequired: false },
      { key: 'final-defense-application', title: 'Oral defense application form uploaded', description: 'Photo evidence of the signed Application for Oral Defense of Thesis (Final) — cleared by the Research Head, Director, and Program Head — is uploaded from Document Submissions and independently reviewed by the adviser.', sequence: 2, panelRequired: false },
      { key: 'final-defense-scheduled', title: 'Final defense scheduled', description: 'Final defense schedule is recorded once the oral defense application evidence is approved.', sequence: 3, panelRequired: false, adviserRequired: false },
      { key: 'final-panel-approval', title: 'Panel approval', description: 'Panel approval is recorded after final defense.', sequence: 4, adviserRequired: false },
      { key: 'final-revisions-submitted', title: 'Final revisions submitted', description: 'Final revisions were submitted and cleared.', sequence: 5 }
    ]
  },
  {
    key: 'completion',
    title: 'Completion',
    description: 'Finalize approved deliverables, repository submission, and archive confirmation.',
    sequence: 6,
    checkpoints: [
      { key: 'completion-approved-manuscript', title: 'Approved manuscript uploaded', description: 'Approved manuscript copy was uploaded.', sequence: 1 },
      { key: 'completion-approval-sheet', title: 'Approval sheet uploaded', description: 'Signed approval sheet was uploaded.', sequence: 2 },
      { key: 'completion-repository-submission', title: 'Repository submission completed', description: 'Repository submission was completed.', sequence: 3 },
      { key: 'completion-archive-confirmation', title: 'Archive confirmation', description: 'Archive confirmation is recorded.', sequence: 4 }
    ]
  }
];

const EXPECTED_WORKFLOW_MILESTONE_SEQUENCES = THESIS_MILESTONE_WORKFLOW.map((stage) => stage.sequence);
const EXPECTED_WORKFLOW_CHECKPOINT_KEYS = THESIS_MILESTONE_WORKFLOW.flatMap((stage) =>
  stage.checkpoints.map((checkpoint) => checkpoint.key)
);
// Lets ensureProjectMilestoneWorkflow detect a checkpoint whose stored `sequence`
// no longer matches the current workflow definition (e.g. after reordering
// checkpoints within a stage) and re-sync it, instead of only detecting a
// checkpoint that's missing outright.
const EXPECTED_CHECKPOINT_SEQUENCE_BY_KEY = new Map(
  THESIS_MILESTONE_WORKFLOW.flatMap((stage) =>
    stage.checkpoints.map((checkpoint) => [checkpoint.key, checkpoint.sequence] as const)
  )
);
const NON_PANEL_REVIEW_CHECKPOINT_KEYS = new Set(
  THESIS_MILESTONE_WORKFLOW.flatMap((stage) =>
    stage.checkpoints
      .filter((checkpoint) => checkpoint.panelRequired === false)
      .map((checkpoint) => checkpoint.key)
  )
);
// Checkpoints that are purely a scheduling record or a panel-only decision
// (e.g. 'concept-panel-approval', 'concept-presentation-scheduled') never get
// an adviser decision of their own — without this, their adviserReviewStatus
// sits at its default PENDING forever, which drags the stage's whole
// "Adviser review" summary pill down to "In Review"/"Pending" even after the
// adviser has approved everything they're actually asked to approve.
const NON_ADVISER_REVIEW_CHECKPOINT_KEYS = new Set(
  THESIS_MILESTONE_WORKFLOW.flatMap((stage) =>
    stage.checkpoints
      .filter((checkpoint) => checkpoint.adviserRequired === false)
      .map((checkpoint) => checkpoint.key)
  )
);

const CHECKPOINT_MATCHERS = [
  // Placed before the broader 'concept-title' matcher below (whose 'concept'/'title'
  // keywords would otherwise catch this category too) so uploads categorized as the
  // defense application form resolve to their own checkpoint instead.
  { checkpointKey: 'concept-defense-application', keywords: ['concept-defense-application', 'oral defense application', 'application for oral defense', 'defense application', 'defense clearance form', 'defense compliance evidence'] },
  // 'concept-paper' was folded into 'concept-title' — the concept paper document
  // is always uploaded together with the title (same form, same submission), so
  // there's no independent checkpoint for it anymore.
  { checkpointKey: 'concept-title', keywords: ['title proposal', 'concept paper', 'concept', 'title'] },
  { checkpointKey: 'concept-presentation-scheduled', keywords: ['concept presentation', 'concept defense', 'concept schedule'] },
  // Placed before 'proposal-chapters' below (whose broad 'proposal' keyword would
  // otherwise catch this category too) so proposal defense-application evidence
  // resolves to its own checkpoint instead of being counted as a chapter upload.
  { checkpointKey: 'proposal-defense-application', keywords: ['proposal-defense-application', 'proposal defense application', 'oral defense application (proposal)'] },
  { checkpointKey: 'proposal-chapters', keywords: ['proposal', 'chapter 1', 'chapter 2', 'chapter 3', 'chapters 1-3', 'chapters 1–3', 'manuscript'] },
  { checkpointKey: 'development-progress-report', keywords: ['progress report', 'progress'] },
  { checkpointKey: 'development-testing-evidence', keywords: ['testing', 'test evidence', 'qa', 'validation', 'evaluation evidence'] },
  { checkpointKey: 'development-prototype', keywords: ['prototype', 'system file', 'system-files', 'development', 'source code', 'build'] },
  { checkpointKey: 'mock-presentation', keywords: ['mock presentation', 'pre-final presentation', 'mock defense presentation', 'pre-final defense presentation', 'presentation', 'slides', 'deck'] },
  { checkpointKey: 'mock-revisions-completed', keywords: ['mock revision', 'pre-final revision', 'revised mock', 'revised pre-final', 'mock defense revision', 'pre-final defense revision'] },
  // Placed before 'final-manuscript' and 'final-revisions-submitted' below so
  // final defense-application evidence resolves to its own checkpoint instead.
  { checkpointKey: 'final-defense-application', keywords: ['final-defense-application', 'final defense application', 'oral defense application (final)'] },
  { checkpointKey: 'final-manuscript', keywords: ['final manuscript', 'final paper', 'final document'] },
  { checkpointKey: 'final-revisions-submitted', keywords: ['final revision', 'revised final', 'final revisions'] },
  { checkpointKey: 'completion-approved-manuscript', keywords: ['approved manuscript', 'approved final'] },
  { checkpointKey: 'completion-approval-sheet', keywords: ['approval sheet', 'signature sheet', 'endorsement sheet'] },
  { checkpointKey: 'completion-repository-submission', keywords: ['repository', 'archive submission', 'final repository'] }
];

function normalize(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function getInitialMilestoneStatus(stage: WorkflowStage, projectStatus?: ProjectStatus | null) {
  if (stage.sequence === 1) {
    if (projectStatus && APPROVED_PROJECT_STATUSES.has(projectStatus)) {
      return MilestoneStatus.IN_PROGRESS;
    }

    if (projectStatus === ProjectStatus.NEEDS_REVISION) {
      return MilestoneStatus.NEEDS_REVISION;
    }

    if (projectStatus === ProjectStatus.SUBMITTED || projectStatus === ProjectStatus.UNDER_REVIEW) {
      return MilestoneStatus.IN_PROGRESS;
    }
  }

  return MilestoneStatus.PENDING;
}

function getInitialCheckpointState(stage: WorkflowStage, checkpoint: WorkflowStage['checkpoints'][number], projectStatus?: ProjectStatus | null) {
  const panelReviewStatus = checkpoint.panelRequired === false
    ? MilestoneCheckpointReviewStatus.NOT_REQUIRED
    : MilestoneCheckpointReviewStatus.PENDING;
  // The "no special case applies" adviser status — NOT_REQUIRED for a
  // scheduling/panel-only checkpoint, PENDING otherwise. Used everywhere
  // below instead of a bare PENDING literal so those checkpoints never sit
  // in a state that reads as "still waiting on the adviser".
  const defaultAdviserReviewStatus = checkpoint.adviserRequired === false
    ? MilestoneCheckpointReviewStatus.NOT_REQUIRED
    : MilestoneCheckpointReviewStatus.PENDING;

  if (stage.sequence !== 1) {
    return {
      status: MilestoneCheckpointStatus.PENDING,
      adviserReviewStatus: defaultAdviserReviewStatus,
      panelReviewStatus,
      submittedAt: null,
      reviewedAt: null,
      completedAt: null
    };
  }

  if (projectStatus && APPROVED_PROJECT_STATUSES.has(projectStatus)) {
    const isAdviserClearedCheckpoint = checkpoint.key === 'concept-title' ||
      checkpoint.key === 'concept-defense-application' ||
      checkpoint.key === 'concept-adviser-approval';

    return {
      status: isAdviserClearedCheckpoint ? MilestoneCheckpointStatus.COMPLETED : MilestoneCheckpointStatus.PENDING,
      adviserReviewStatus: isAdviserClearedCheckpoint
        ? MilestoneCheckpointReviewStatus.APPROVED
        : defaultAdviserReviewStatus,
      panelReviewStatus,
      submittedAt: isAdviserClearedCheckpoint ? new Date() : null,
      reviewedAt: isAdviserClearedCheckpoint ? new Date() : null,
      completedAt: isAdviserClearedCheckpoint ? new Date() : null
    };
  }

  if (projectStatus === ProjectStatus.NEEDS_REVISION) {
    return {
      status: MilestoneCheckpointStatus.NEEDS_REVISION,
      adviserReviewStatus: checkpoint.adviserRequired === false
        ? MilestoneCheckpointReviewStatus.NOT_REQUIRED
        : MilestoneCheckpointReviewStatus.NEEDS_REVISION,
      panelReviewStatus,
      submittedAt: new Date(),
      reviewedAt: new Date(),
      completedAt: null
    };
  }

  if (projectStatus === ProjectStatus.SUBMITTED || projectStatus === ProjectStatus.UNDER_REVIEW) {
    return {
      status: checkpoint.key === 'concept-title' ? MilestoneCheckpointStatus.SUBMITTED : MilestoneCheckpointStatus.PENDING,
      adviserReviewStatus: checkpoint.key === 'concept-title'
        ? MilestoneCheckpointReviewStatus.IN_REVIEW
        : defaultAdviserReviewStatus,
      panelReviewStatus,
      submittedAt: checkpoint.key === 'concept-title' ? new Date() : null,
      reviewedAt: null,
      completedAt: null
    };
  }

  return {
    status: MilestoneCheckpointStatus.PENDING,
    adviserReviewStatus: defaultAdviserReviewStatus,
    panelReviewStatus,
    submittedAt: null,
    reviewedAt: null,
    completedAt: null
  };
}

function isCheckpointDone(status: MilestoneCheckpointStatus) {
  return status === MilestoneCheckpointStatus.APPROVED || status === MilestoneCheckpointStatus.COMPLETED;
}

function getMilestoneRollupStatus(statuses: MilestoneCheckpointStatus[]) {
  const hasRevision = statuses.some((status) => status === MilestoneCheckpointStatus.NEEDS_REVISION);
  const hasActivity = statuses.some((status) =>
    status === MilestoneCheckpointStatus.SUBMITTED ||
    status === MilestoneCheckpointStatus.IN_REVIEW ||
    status === MilestoneCheckpointStatus.APPROVED ||
    status === MilestoneCheckpointStatus.COMPLETED
  );
  const allDone = statuses.every(isCheckpointDone);

  if (allDone) {
    return MilestoneStatus.COMPLETED;
  }

  if (hasRevision) {
    return MilestoneStatus.NEEDS_REVISION;
  }

  return hasActivity ? MilestoneStatus.IN_PROGRESS : MilestoneStatus.PENDING;
}

type ExistingCheckpointSummary = {
  id: string;
  key: string;
  milestoneId: string;
  status: MilestoneCheckpointStatus;
  adviserReviewStatus: MilestoneCheckpointReviewStatus;
  panelReviewStatus: MilestoneCheckpointReviewStatus;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  completedAt: Date | null;
  latestFeedback: string | null;
  latestFeedbackBy: string | null;
  latestFeedbackAt: Date | null;
};

const TITLE_REVIEW_APPROVED_CHECKPOINT_KEYS = [
  'concept-title',
  'concept-defense-application',
  'concept-adviser-approval'
];

// The defense-application-evidence checkpoints shouldn't be fabricated as
// "completed" by the repair pass below unless there's real submission activity
// on them — a project that moved past a stage before that stage's evidence-form
// requirement existed shouldn't retroactively show a checkmark for something
// that was never actually submitted.
const NO_FABRICATE_ON_REPAIR_KEYS = new Set([
  'concept-defense-application',
  'proposal-defense-application',
  'final-defense-application'
]);

function hasCheckpointActivity(checkpoint?: ExistingCheckpointSummary) {
  if (!checkpoint) {
    return false;
  }

  return checkpoint.status !== MilestoneCheckpointStatus.PENDING ||
    Boolean(checkpoint.submittedAt || checkpoint.reviewedAt || checkpoint.completedAt);
}

function hasPendingReviewFeedback(value?: string | null) {
  const normalized = normalize(value);

  return normalized.includes('pending adviser review') ||
    normalized.includes('waiting for review') ||
    normalized.includes('review is in progress');
}

async function repairApprovedConceptTitleReview(
  db: DbClient,
  projectStatus: ProjectStatus | null | undefined,
  existingCheckpoints: ExistingCheckpointSummary[]
) {
  if (!projectStatus || !APPROVED_PROJECT_STATUSES.has(projectStatus)) {
    return;
  }

  const checkpointsByKey = new Map(existingCheckpoints.map((checkpoint) => [checkpoint.key, checkpoint]));
  const hasTitleReviewActivity = TITLE_REVIEW_APPROVED_CHECKPOINT_KEYS.some((key) =>
    hasCheckpointActivity(checkpointsByKey.get(key))
  );

  if (!hasTitleReviewActivity) {
    return;
  }

  const now = new Date();
  const updatedMilestoneIds = new Set<string>();

  for (const key of TITLE_REVIEW_APPROVED_CHECKPOINT_KEYS) {
    const checkpoint = checkpointsByKey.get(key);

    if (!checkpoint) {
      continue;
    }

    if (NO_FABRICATE_ON_REPAIR_KEYS.has(key) && !hasCheckpointActivity(checkpoint)) {
      continue;
    }

    const shouldClearFeedback = hasPendingReviewFeedback(checkpoint.latestFeedback);
    const shouldUpdate =
      checkpoint.status !== MilestoneCheckpointStatus.COMPLETED ||
      checkpoint.adviserReviewStatus !== MilestoneCheckpointReviewStatus.APPROVED ||
      checkpoint.panelReviewStatus !== MilestoneCheckpointReviewStatus.NOT_REQUIRED ||
      !checkpoint.submittedAt ||
      !checkpoint.reviewedAt ||
      !checkpoint.completedAt ||
      shouldClearFeedback;

    if (!shouldUpdate) {
      continue;
    }

    await db.milestoneCheckpoint.update({
      where: { id: checkpoint.id },
      data: {
        status: MilestoneCheckpointStatus.COMPLETED,
        adviserReviewStatus: MilestoneCheckpointReviewStatus.APPROVED,
        panelReviewStatus: MilestoneCheckpointReviewStatus.NOT_REQUIRED,
        submittedAt: checkpoint.submittedAt ?? now,
        reviewedAt: checkpoint.reviewedAt ?? now,
        completedAt: checkpoint.completedAt ?? now,
        ...(shouldClearFeedback
          ? {
              latestFeedback: null,
              latestFeedbackBy: null,
              latestFeedbackAt: null
            }
          : {})
      }
    });

    updatedMilestoneIds.add(checkpoint.milestoneId);
  }

  for (const milestoneId of updatedMilestoneIds) {
    await updateMilestoneRollup(db, milestoneId);
  }
}

export async function ensureProjectMilestoneWorkflow(db: DbClient, projectId: string) {
  // Sequential, not Promise.all: this is sometimes called with a Prisma interactive-
  // transaction client (via recordCheckpointSubmission during title-submission POST),
  // which pins a single physical connection — concurrent queries on it aren't actually
  // concurrent, they just fight over that one connection (triggers a pg "client already
  // executing a query" warning and serializes anyway, just slower and unsupported).
  const existingMilestones = await db.milestone.findMany({
    where: { projectId },
    select: {
      id: true,
      sequence: true,
      status: true,
      completedAt: true
    }
  });
  const existingCheckpoints = await db.milestoneCheckpoint.findMany({
    where: { projectId },
    select: {
      id: true,
      key: true,
      sequence: true,
      status: true,
      milestoneId: true,
      adviserReviewStatus: true,
      panelReviewStatus: true,
      submittedAt: true,
      reviewedAt: true,
      completedAt: true,
      latestFeedback: true,
      latestFeedbackBy: true,
      latestFeedbackAt: true
    }
  });
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { status: true }
  });

  const existingSequences = new Set(existingMilestones.map((milestone: { sequence: number }) => milestone.sequence));
  const existingKeys = new Set(existingCheckpoints.map((checkpoint: { key: string }) => checkpoint.key));
  const expectedKeySet = new Set(EXPECTED_WORKFLOW_CHECKPOINT_KEYS);
  // Catches a checkpoint that's still in the DB but no longer part of the workflow
  // definition (e.g. 'concept-paper' after it was folded into 'concept-title') —
  // without this, a row-count-only check can't tell "one is missing" apart from
  // "the set has changed shape", and would leave the stale row on screen forever.
  const orphanedCheckpointKeys = Array.from(existingKeys as Set<string>).filter((key) => !expectedKeySet.has(key));
  const hasAllWorkflowRows =
    EXPECTED_WORKFLOW_MILESTONE_SEQUENCES.every((sequence) => existingSequences.has(sequence)) &&
    EXPECTED_WORKFLOW_CHECKPOINT_KEYS.every((key) => existingKeys.has(key)) &&
    orphanedCheckpointKeys.length === 0;
  const hasReviewSchemaDrift = existingCheckpoints.some((checkpoint: {
    key: string;
    panelReviewStatus: MilestoneCheckpointReviewStatus;
    adviserReviewStatus: MilestoneCheckpointReviewStatus;
  }) =>
    (NON_PANEL_REVIEW_CHECKPOINT_KEYS.has(checkpoint.key) &&
      checkpoint.panelReviewStatus !== MilestoneCheckpointReviewStatus.NOT_REQUIRED) ||
    (NON_ADVISER_REVIEW_CHECKPOINT_KEYS.has(checkpoint.key) &&
      checkpoint.adviserReviewStatus !== MilestoneCheckpointReviewStatus.NOT_REQUIRED)
  );
  const hasSequenceDrift = existingCheckpoints.some((checkpoint: { key: string; sequence: number }) =>
    EXPECTED_CHECKPOINT_SEQUENCE_BY_KEY.get(checkpoint.key) !== checkpoint.sequence
  );

  if (hasAllWorkflowRows && !hasReviewSchemaDrift && !hasSequenceDrift) {
    type ExistingMilestoneSummary = {
      id: string;
      status: MilestoneStatus;
      completedAt: Date | null;
    };
    const milestonesById = new Map<string, ExistingMilestoneSummary>(
      (existingMilestones as ExistingMilestoneSummary[]).map((milestone) => [milestone.id, milestone])
    );
    const checkpointStatusesByMilestone = new Map<string, MilestoneCheckpointStatus[]>();

    for (const checkpoint of existingCheckpoints as Array<{
      milestoneId: string;
      status: MilestoneCheckpointStatus;
    }>) {
      const statuses = checkpointStatusesByMilestone.get(checkpoint.milestoneId) ?? [];
      statuses.push(checkpoint.status);
      checkpointStatusesByMilestone.set(checkpoint.milestoneId, statuses);
    }

    // Sequential (same reason as above): db may be a pinned transaction connection.
    for (const [milestoneId, statuses] of checkpointStatusesByMilestone.entries()) {
      const milestone = milestonesById.get(milestoneId);

      if (!milestone) {
        continue;
      }

      const nextStatus = getMilestoneRollupStatus(statuses);
      const shouldBeCompleted = nextStatus === MilestoneStatus.COMPLETED;

      if (milestone.status === nextStatus && (shouldBeCompleted || !milestone.completedAt)) {
        continue;
      }

      await db.milestone.update({
        where: { id: milestoneId },
        data: {
          status: nextStatus,
          completedAt: shouldBeCompleted ? milestone.completedAt ?? new Date() : null
        }
      });
    }

    await repairApprovedConceptTitleReview(
      db,
      project?.status,
      existingCheckpoints as ExistingCheckpointSummary[]
    );

    return existingCheckpoints;
  }

  const checkpoints = [];

  for (const stage of THESIS_MILESTONE_WORKFLOW) {
    const milestone = await db.milestone.upsert({
      where: {
        projectId_sequence: {
          projectId,
          sequence: stage.sequence
        }
      },
      update: {
        title: stage.title,
        description: stage.description
      },
      create: {
        projectId,
        title: stage.title,
        description: stage.description,
        sequence: stage.sequence,
        status: getInitialMilestoneStatus(stage, project?.status)
      }
    });

    for (const checkpoint of stage.checkpoints) {
      const initialState = getInitialCheckpointState(stage, checkpoint, project?.status);
      const savedCheckpoint = await db.milestoneCheckpoint.upsert({
        where: {
          projectId_key: {
            projectId,
            key: checkpoint.key
          }
        },
        update: {
          milestoneId: milestone.id,
          title: checkpoint.title,
          description: checkpoint.description,
          sequence: checkpoint.sequence,
          required: true,
          ...(checkpoint.panelRequired === false
            ? { panelReviewStatus: MilestoneCheckpointReviewStatus.NOT_REQUIRED }
            : {}),
          ...(checkpoint.adviserRequired === false
            ? { adviserReviewStatus: MilestoneCheckpointReviewStatus.NOT_REQUIRED }
            : {})
        },
        create: {
          projectId,
          milestoneId: milestone.id,
          key: checkpoint.key,
          title: checkpoint.title,
          description: checkpoint.description,
          sequence: checkpoint.sequence,
          required: true,
          ...initialState
        }
      });

      checkpoints.push(savedCheckpoint);
    }

    await updateMilestoneRollup(db, milestone.id);
  }

  if (orphanedCheckpointKeys.length) {
    // Retired checkpoint (e.g. the old standalone 'concept-paper' step) — its
    // linked submissions/files aren't deleted, just detached (checkpointId is
    // onDelete: SetNull), so no uploaded evidence is lost, only the stale
    // checklist row.
    await db.milestoneCheckpoint.deleteMany({
      where: { projectId, key: { in: orphanedCheckpointKeys } }
    });
  }

  return checkpoints;
}

// Upload categories (the student's Document Submissions picker) that always
// mean the same checkpoint, whatever stage the project is in.
const FIXED_CATEGORY_CHECKPOINT_KEYS: Record<string, string> = {
  'title proposal': 'concept-title',
  'concept-paper': 'concept-title',
  'concept paper': 'concept-title',
  'concept-defense-application': 'concept-defense-application',
  'proposal-defense-application': 'proposal-defense-application',
  'final-defense-application': 'final-defense-application',
  proposal: 'proposal-chapters',
  'chapter-4': 'final-manuscript',
  'chapter-5': 'final-manuscript',
  'system-files': 'development-prototype',
  'final-manuscript': 'final-manuscript'
};

// Where a generic upload belongs at each stage — the stage's main document.
const STAGE_PRIMARY_CHECKPOINT_KEYS: Record<string, string> = {
  concept: 'concept-title',
  proposal: 'proposal-chapters',
  development: 'development-progress-report',
  'mock-defense': 'mock-presentation',
  'final-defense': 'final-manuscript',
  completion: 'completion-approved-manuscript'
};

const EARLY_MANUSCRIPT_STAGES = new Set(['concept', 'proposal']);

// Categories whose meaning depends on where the project is: slides uploaded
// during Concept are concept presentation slides, not pre-final ones, and
// Chapters 1–3 belong to the proposal until it's cleared, then to the
// full-blown final manuscript.
function getStageDependentCheckpointKey(category: string, stageKey: string) {
  if (category === 'chapter-1' || category === 'chapter-2' || category === 'chapter-3') {
    return EARLY_MANUSCRIPT_STAGES.has(stageKey) ? 'proposal-chapters' : 'final-manuscript';
  }
  if (category === 'presentation-files') {
    return stageKey === 'development' ? 'mock-presentation' : STAGE_PRIMARY_CHECKPOINT_KEYS[stageKey];
  }
  if (category === 'supporting-documents' || category === 'other') {
    return STAGE_PRIMARY_CHECKPOINT_KEYS[stageKey];
  }
  return null;
}

// The stage the project is working on: the first workflow milestone that
// isn't approved/completed yet (Completion once everything is done).
async function getCurrentWorkflowStageKey(db: DbClient, projectId: string) {
  const milestones: Array<{ sequence: number; status: MilestoneStatus }> = await db.milestone.findMany({
    where: { projectId },
    select: { sequence: true, status: true },
    orderBy: { sequence: 'asc' }
  });
  const current = milestones.find((milestone) =>
    milestone.status !== MilestoneStatus.APPROVED && milestone.status !== MilestoneStatus.COMPLETED
  );
  const sequence = current?.sequence ?? THESIS_MILESTONE_WORKFLOW[THESIS_MILESTONE_WORKFLOW.length - 1].sequence;
  return THESIS_MILESTONE_WORKFLOW.find((stage) => stage.sequence === sequence)?.key ?? 'concept';
}

const CHECKPOINT_STAGE_BY_KEY = new Map(
  THESIS_MILESTONE_WORKFLOW.flatMap((stage) => stage.checkpoints.map((checkpoint) => [checkpoint.key, stage.key] as const))
);

// Decides which checkpoint an upload belongs to — and so what it's labeled
// everywhere (see src/lib/stage-labels.ts). In order: an explicit checkpoint
// key; the upload category (fixed, or read against the project's current
// stage); keywords in a legacy free-text category; keywords in the file name,
// only within the current stage; and finally the current stage's main
// document. File names never move an upload into a different stage.
function findCheckpointKey({
  checkpointKey,
  documentCategory,
  fileName,
  currentStageKey
}: {
  checkpointKey?: string | null;
  documentCategory?: string | null;
  fileName?: string | null;
  currentStageKey: string;
}) {
  const requestedKey = normalize(checkpointKey);
  if (requestedKey && CHECKPOINT_STAGE_BY_KEY.has(requestedKey)) {
    return requestedKey;
  }

  const category = normalize(documentCategory);
  const fixedKey = FIXED_CATEGORY_CHECKPOINT_KEYS[category];
  if (fixedKey) {
    return fixedKey;
  }

  const stageDependentKey = getStageDependentCheckpointKey(category, currentStageKey);
  if (stageDependentKey) {
    return stageDependentKey;
  }

  if (category && category !== 'uncategorized') {
    const categoryMatch = CHECKPOINT_MATCHERS.find((matcher) =>
      matcher.keywords.some((keyword) => category.includes(keyword))
    );
    if (categoryMatch) {
      return categoryMatch.checkpointKey;
    }
  }

  const name = normalize(fileName);
  const nameMatch = name
    ? CHECKPOINT_MATCHERS.find((matcher) =>
        CHECKPOINT_STAGE_BY_KEY.get(matcher.checkpointKey) === currentStageKey &&
        matcher.keywords.some((keyword) => name.includes(keyword))
      )
    : null;

  return nameMatch?.checkpointKey ?? STAGE_PRIMARY_CHECKPOINT_KEYS[currentStageKey] ?? 'concept-title';
}

export async function resolveMilestoneCheckpointForSubmission(
  db: DbClient,
  {
    projectId,
    checkpointKey,
    documentCategory,
    fileName
  }: {
    projectId: string;
    checkpointKey?: string | null;
    documentCategory?: string | null;
    fileName?: string | null;
  }
) {
  await ensureProjectMilestoneWorkflow(db, projectId);
  const currentStageKey = await getCurrentWorkflowStageKey(db, projectId);
  const resolvedKey = findCheckpointKey({ checkpointKey, documentCategory, fileName, currentStageKey });

  return db.milestoneCheckpoint.findUnique({
    where: {
      projectId_key: {
        projectId,
        key: resolvedKey
      }
    },
    include: {
      milestone: {
        select: {
          id: true,
          sequence: true,
          title: true
        }
      }
    }
  });
}

export async function updateMilestoneRollup(db: DbClient, milestoneId: string) {
  const checkpoints = await db.milestoneCheckpoint.findMany({
    where: { milestoneId },
    select: { status: true }
  });

  if (!checkpoints.length) {
    return;
  }

  const nextStatus = getMilestoneRollupStatus(checkpoints.map((checkpoint: { status: MilestoneCheckpointStatus }) =>
    checkpoint.status
  ));

  await db.milestone.update({
    where: { id: milestoneId },
    data: {
      status: nextStatus,
      completedAt: nextStatus === MilestoneStatus.COMPLETED ? new Date() : null
    }
  });
}

export async function recordCheckpointSubmission(
  db: DbClient,
  {
    projectId,
    checkpointKey,
    documentCategory,
    fileName,
    submissionId,
    fileId,
    resolvedCheckpoint
  }: {
    projectId: string;
    checkpointKey?: string | null;
    documentCategory?: string | null;
    fileName?: string | null;
    submissionId?: string | null;
    fileId?: string | null;
    // Pass this when the caller already resolved the checkpoint moments earlier
    // (e.g. document-files/route.ts, to decide whether to link one at all) —
    // resolveMilestoneCheckpointForSubmission calls ensureProjectMilestoneWorkflow,
    // a multi-query drift-check-and-repair pass, so re-resolving here doubled that
    // work on every single upload for no reason (this was the whole cause of a
    // batch upload occasionally blowing the 5s interactive-transaction timeout).
    resolvedCheckpoint?: Awaited<ReturnType<typeof resolveMilestoneCheckpointForSubmission>>;
  }
) {
  const checkpoint = resolvedCheckpoint !== undefined
    ? resolvedCheckpoint
    : await resolveMilestoneCheckpointForSubmission(db, {
        projectId,
        checkpointKey,
        documentCategory,
        fileName
      });

  if (!checkpoint) {
    return null;
  }

  if (submissionId) {
    await db.submission.update({
      where: { id: submissionId },
      data: {
        milestoneId: checkpoint.milestoneId,
        checkpointId: checkpoint.id
      }
    });
  }

  if (fileId) {
    await db.uploadedFile.update({
      where: { id: fileId },
      data: {
        checkpointId: checkpoint.id
      }
    });
  }

  await db.milestoneCheckpoint.update({
    where: { id: checkpoint.id },
    data: {
      status: MilestoneCheckpointStatus.SUBMITTED,
      adviserReviewStatus: MilestoneCheckpointReviewStatus.IN_REVIEW,
      submittedAt: new Date(),
      completedAt: null
    }
  });

  await updateMilestoneRollup(db, checkpoint.milestoneId);

  return checkpoint;
}

function getCheckpointKeyForSchedule(title: string) {
  const normalized = normalize(title);

  if (normalized.includes('concept')) {
    return 'concept-presentation-scheduled';
  }

  if (normalized.includes('proposal')) {
    return 'proposal-defense-scheduled';
  }

  if (normalized.includes('mock') || normalized.includes('pre-final') || normalized.includes('practice') || normalized.includes('dry run')) {
    return 'mock-defense-scheduled';
  }

  if (normalized.includes('final')) {
    return 'final-defense-scheduled';
  }

  return null;
}

export async function recordCheckpointSchedule(
  db: DbClient,
  {
    projectId,
    title,
    scheduledAt
  }: {
    projectId: string;
    title: string;
    scheduledAt: Date;
  }
) {
  await ensureProjectMilestoneWorkflow(db, projectId);
  const checkpointKey = getCheckpointKeyForSchedule(title);

  if (!checkpointKey) {
    return null;
  }

  const checkpoint = await db.milestoneCheckpoint.findUnique({
    where: {
      projectId_key: {
        projectId,
        key: checkpointKey
      }
    }
  });

  if (!checkpoint) {
    return null;
  }

  const updatedCheckpoint = await db.milestoneCheckpoint.update({
    where: { id: checkpoint.id },
    data: {
      status: MilestoneCheckpointStatus.COMPLETED,
      adviserReviewStatus: MilestoneCheckpointReviewStatus.NOT_REQUIRED,
      panelReviewStatus: MilestoneCheckpointReviewStatus.NOT_REQUIRED,
      submittedAt: scheduledAt,
      reviewedAt: scheduledAt,
      completedAt: new Date(),
      latestFeedback: `${checkpoint.title} for ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(scheduledAt)}.`,
      latestFeedbackBy: 'Schedule',
      latestFeedbackAt: new Date()
    }
  });

  await updateMilestoneRollup(db, updatedCheckpoint.milestoneId);

  return updatedCheckpoint;
}

// Which stage a "what should students submit?" Schedule > Deadline item is
// for, so creating that deadline can also set the real Milestone.dueAt that
// drives the overdue-alert feature — there's otherwise no adviser-facing way
// to set it at all (see 'other'/unset, deliberately left unmapped: too
// ambiguous to guess a stage from free text).
const DEADLINE_REQUIREMENT_MILESTONE_SEQUENCE: Record<string, number> = {
  'title-proposal': 1,
  'concept-paper': 1,
  'proposal-chapters': 2,
  'progress-development': 3,
  'web-application': 3,
  'system-documentation': 3,
  'final-manuscript': 5
};

export async function syncMilestoneDueDateFromDeadline(
  db: DbClient,
  {
    projectId,
    requiredSubmission,
    dueAt
  }: {
    projectId: string;
    requiredSubmission?: string | null;
    dueAt: Date;
  }
) {
  const sequence = requiredSubmission ? DEADLINE_REQUIREMENT_MILESTONE_SEQUENCE[requiredSubmission] : undefined;

  if (!sequence) {
    return null;
  }

  await ensureProjectMilestoneWorkflow(db, projectId);

  const milestone = await db.milestone.findUnique({
    where: { projectId_sequence: { projectId, sequence } }
  });

  if (!milestone) {
    return null;
  }

  return db.milestone.update({
    where: { id: milestone.id },
    data: { dueAt }
  });
}

function getCheckpointKeysForDefenseOutcome(title: string, outcome: 'passed' | 'redefense') {
  const normalized = normalize(title);

  if (normalized.includes('concept')) {
    return ['concept-panel-approval'];
  }

  if (normalized.includes('proposal')) {
    return outcome === 'passed'
      ? ['proposal-panel-evaluation', 'proposal-final-approval']
      : ['proposal-panel-evaluation'];
  }

  if (normalized.includes('mock') || normalized.includes('pre-final') || normalized.includes('practice') || normalized.includes('dry run')) {
    return outcome === 'passed'
      ? ['mock-panel-comments', 'mock-revisions-completed']
      : ['mock-panel-comments'];
  }

  if (normalized.includes('final')) {
    return outcome === 'passed'
      ? ['final-panel-approval', 'final-revisions-submitted']
      : ['final-panel-approval'];
  }

  return [];
}

/**
 * Marks the stage's panel-approval checkpoint(s) done when a defense vote is
 * finalized, so the student-facing milestone rollup (which requires every
 * checkpoint in a stage to be done) can actually reach COMPLETED. Without
 * this, a panel-approved defense updates Project.status but the matching
 * "Stage N" never clears, since nothing else marks its panel checkpoint.
 */
export async function recordDefenseVoteOutcome(
  db: DbClient,
  {
    projectId,
    scheduleTitle,
    outcome,
    feedback,
    reviewerName
  }: {
    projectId: string;
    scheduleTitle: string;
    outcome: 'passed' | 'redefense';
    feedback?: string | null;
    reviewerName?: string | null;
  }
) {
  await ensureProjectMilestoneWorkflow(db, projectId);
  const checkpointKeys = getCheckpointKeysForDefenseOutcome(scheduleTitle, outcome);

  if (!checkpointKeys.length) {
    return;
  }

  const nextStatus = outcome === 'passed' ? MilestoneCheckpointStatus.COMPLETED : MilestoneCheckpointStatus.NEEDS_REVISION;
  const nextReviewStatus = outcome === 'passed' ? MilestoneCheckpointReviewStatus.APPROVED : MilestoneCheckpointReviewStatus.NEEDS_REVISION;
  const trimmedFeedback = String(feedback ?? '').trim();
  const now = new Date();
  const updatedMilestoneIds = new Set<string>();

  for (const key of checkpointKeys) {
    const checkpoint = await db.milestoneCheckpoint.findUnique({
      where: { projectId_key: { projectId, key } }
    });

    if (!checkpoint) {
      continue;
    }

    const updated = await db.milestoneCheckpoint.update({
      where: { id: checkpoint.id },
      data: {
        status: nextStatus,
        panelReviewStatus: nextReviewStatus,
        submittedAt: checkpoint.submittedAt ?? now,
        reviewedAt: now,
        completedAt: nextStatus === MilestoneCheckpointStatus.COMPLETED ? now : null,
        latestFeedback: trimmedFeedback || undefined,
        latestFeedbackBy: trimmedFeedback ? (reviewerName || 'Defense Panel') : undefined,
        latestFeedbackAt: trimmedFeedback ? now : undefined
      }
    });

    updatedMilestoneIds.add(updated.milestoneId);
  }

  for (const milestoneId of updatedMilestoneIds) {
    await updateMilestoneRollup(db, milestoneId);
  }
}

// Shared by the auto-finalize path (evaluate/route.ts, when the panel actually
// passes) and the chair's "Approve" override (chair-decision/route.ts, when
// the chair passes it anyway despite enough No votes to have failed it) — both
// need the exact same project/checkpoint/group state, just with different
// notification wording so students and advisers aren't told a defense "passed"
// when it was really the chair overruling their own panel.
export async function applyDefensePassOutcome(
  db: DbClient,
  {
    projectId,
    projectTitle,
    scheduleTitle,
    groupId,
    notifyUserIds,
    notificationMessage
  }: {
    projectId: string;
    projectTitle: string;
    scheduleTitle: string;
    groupId: string | null;
    notifyUserIds: string[];
    notificationMessage?: string;
  }
) {
  const normalizedTitle = scheduleTitle.toLowerCase();
  const isFinal = normalizedTitle.includes('final') && !normalizedTitle.includes('pre-final');

  await db.project.update({
    where: { id: projectId },
    data: {
      status: isFinal ? ProjectStatus.COMPLETED : ProjectStatus.APPROVED
    }
  });

  // Mark the stage's panel-approval checkpoint(s) done so the student
  // milestone tracker's rollup can actually reach COMPLETED — updating
  // Project.status alone never touched this.
  await recordDefenseVoteOutcome(db, {
    projectId,
    scheduleTitle,
    outcome: 'passed'
  });

  // Clear the "Needs Revision" flag a prior rejected defense may have set — a
  // group that just passed isn't flagged anymore.
  if (groupId) {
    await db.group.update({
      where: { id: groupId },
      data: {
        status: 'active',
        statusLabel: 'Active',
        statusClass: 'status-active'
      }
    });
  }

  if (notifyUserIds.length) {
    await db.notification.createMany({
      data: notifyUserIds.map((userId) => ({
        userId,
        title: 'Defense Passed',
        message: notificationMessage || `"${projectTitle}" passed its ${scheduleTitle} defense.`,
        type: 'success',
        entityType: 'Project',
        entityId: projectId
      }))
    });
  }
}

export const TOTAL_WORKFLOW_CHECKPOINTS = EXPECTED_WORKFLOW_CHECKPOINT_KEYS.length;
export const TOTAL_WORKFLOW_MILESTONES = THESIS_MILESTONE_WORKFLOW.length;

export type ProjectProgressSummary = {
  percent: number;
  completedCheckpoints: number;
  totalCheckpoints: number;
  currentStageTitle: string | null;
};

/**
 * Computes a group's real completion percentage from actual MilestoneCheckpoint
 * rows instead of the stored Group.progress column, which no write path ever
 * updates after creation. Counts completed checkpoints against the full
 * workflow (THESIS_MILESTONE_WORKFLOW, TOTAL_WORKFLOW_CHECKPOINTS items) rather than requiring the per-project
 * checkpoint rows to already exist, so this stays a pure read with no side effects.
 * Also reports which workflow stage the group is currently sitting in — the
 * first stage (in sequence order) that isn't fully checked off yet — so UI can
 * show more than a bare number.
 */
export async function getProjectProgressSummary(db: DbClient, projectId?: string | null): Promise<ProjectProgressSummary> {
  if (!projectId) {
    return {
      percent: 0,
      completedCheckpoints: 0,
      totalCheckpoints: TOTAL_WORKFLOW_CHECKPOINTS,
      currentStageTitle: null
    };
  }

  const checkpoints = await db.milestoneCheckpoint.findMany({
    where: { projectId, status: MilestoneCheckpointStatus.COMPLETED },
    select: { key: true }
  });

  const completedKeys = new Set(checkpoints.map((checkpoint: { key: string }) => checkpoint.key));
  const completedCheckpoints = completedKeys.size;
  const percent = Math.round((completedCheckpoints / TOTAL_WORKFLOW_CHECKPOINTS) * 100);

  const activeStage = THESIS_MILESTONE_WORKFLOW.find((stage) =>
    stage.checkpoints.some((checkpoint) => !completedKeys.has(checkpoint.key))
  );
  const currentStageTitle = activeStage
    ? activeStage.title
    : THESIS_MILESTONE_WORKFLOW[THESIS_MILESTONE_WORKFLOW.length - 1].title;

  return {
    percent,
    completedCheckpoints,
    totalCheckpoints: TOTAL_WORKFLOW_CHECKPOINTS,
    currentStageTitle
  };
}

// The nearest upcoming (or already-overdue) milestone due date an adviser/admin has
// actually set via the "Set Deadlines" UI. Returns null rather than a placeholder
// date when nothing has been set — callers must not fabricate a fallback deadline.
export async function getNextMilestoneDueDate(db: DbClient, projectId?: string | null): Promise<string | null> {
  if (!projectId) {
    return null;
  }

  const milestone = await db.milestone.findFirst({
    where: {
      projectId,
      dueAt: { not: null },
      status: { not: MilestoneStatus.COMPLETED }
    },
    orderBy: { dueAt: 'asc' },
    select: { dueAt: true }
  });

  return milestone?.dueAt ? milestone.dueAt.toISOString() : null;
}

export type DefenseOutcomeTag = {
  label: string;
  // 'danger' marks outcomes that need the adviser's action (rejected/redefense/new
  // title) — kept visually distinct from the group's routine lifecycle status badge,
  // which is amber for merely "pending" states too and would otherwise blend in.
  tone: 'success' | 'danger';
};

/**
 * Surfaces the outcome of a group's most recently completed defense as a small
 * tag for group-list UIs, so an adviser can tell at a glance whether their
 * students passed without opening each group. Tallies votes the same way
 * finalizeDefenseSchedule does, since the schedule itself doesn't store a
 * denormalized pass/fail result.
 */
export async function getLatestDefenseOutcomeTag(db: DbClient, projectId?: string | null): Promise<DefenseOutcomeTag | null> {
  if (!projectId) {
    return null;
  }

  const schedule = await db.defenseSchedule.findFirst({
    where: { projectId, status: DefenseStatus.COMPLETED },
    orderBy: { scheduledAt: 'desc' },
    include: { evaluations: true }
  });

  if (!schedule) {
    return null;
  }

  let yesVotes = 0;
  let noVotes = 0;

  for (const ev of schedule.evaluations as Array<{ recommendation: string }>) {
    if (['PASSED', 'PASSED_MINOR', 'PASSED_MAJOR'].includes(ev.recommendation)) {
      yesVotes++;
    } else if (['REDEFENSE', 'FAILED'].includes(ev.recommendation)) {
      noVotes++;
    }
  }

  // Must match finalizeDefenseSchedule's actual pass rule (evaluate/route.ts): unanimous
  // Yes is required to pass — a single No sends it to the chair's decision instead. This
  // used to check "yesVotes > noVotes" (simple majority), which could report "Passed"
  // on a 3-yes/1-no vote even though that's not unanimous and the chair had already
  // recorded an authoritative New Title/Redefense decision overriding it.
  if (noVotes === 0) {
    return { label: `Passed ${schedule.title}`, tone: 'success' };
  }

  if (noVotes > 0) {
    // The chair's follow-up call is the authoritative final word once any No vote
    // exists — label it as the chair's decision specifically, not just a generic
    // outcome, so it reads distinctly from an ordinary panel-vote result.
    if (schedule.chairDecision === DefenseChairDecision.APPROVED) {
      return { label: 'Panel Chair Decision: Approved (Override)', tone: 'success' };
    }
    if (schedule.chairDecision === DefenseChairDecision.NEW_TITLE) {
      return { label: 'Panel Chair Decision: New Title Required', tone: 'danger' };
    }
    if (schedule.chairDecision === DefenseChairDecision.REDEFENSE) {
      return { label: 'Panel Chair Decision: Redefense Required', tone: 'danger' };
    }
    // The panel already decided this — that's the majority vote, final. What's actually
    // pending is the chair's separate follow-up call (redefense vs. new title), so don't
    // word this like the rejection itself is unresolved.
    return { label: `Rejected — ${schedule.title}`, tone: 'danger' };
  }

  return null;
}

/**
 * Attaches the panel chair's rationale to the stage's panel checkpoint after
 * a "redefense" decision, without touching its status — recordDefenseVoteOutcome
 * already set it to NEEDS_REVISION when the vote finalized. This is purely the
 * "why" for the student, recorded separately since the chair's decision comes
 * after the panel's own vote/remarks are already submitted.
 */
export async function attachDefenseDecisionFeedback(
  db: DbClient,
  {
    projectId,
    scheduleTitle,
    remarks,
    reviewerName
  }: {
    projectId: string;
    scheduleTitle: string;
    remarks?: string | null;
    reviewerName?: string | null;
  }
) {
  const trimmedRemarks = String(remarks ?? '').trim();

  if (!trimmedRemarks) {
    return;
  }

  const checkpointKeys = getCheckpointKeysForDefenseOutcome(scheduleTitle, 'redefense');

  if (!checkpointKeys.length) {
    return;
  }

  const now = new Date();

  for (const key of checkpointKeys) {
    const checkpoint = await db.milestoneCheckpoint.findUnique({
      where: { projectId_key: { projectId, key } }
    });

    if (!checkpoint) {
      continue;
    }

    await db.milestoneCheckpoint.update({
      where: { id: checkpoint.id },
      data: {
        latestFeedback: trimmedRemarks,
        latestFeedbackBy: reviewerName || 'Defense Panel Chair',
        latestFeedbackAt: now
      }
    });
  }
}

/**
 * Archives a rejected project and resets its group back to a clean "needs a new title"
 * state — both the real linkage fields (projectId) and the denormalized display fields
 * (status/statusLabel/milestone/etc.) that group-list/card UIs read directly, so the two
 * never drift out of sync. Shared by the chair-decision flow and the adviser's manual
 * "reject & request new title" action — previously each had its own partial version of
 * this reset, touching different fields.
 */
export async function resetGroupForNewTitle(
  db: DbClient,
  { groupId, projectId }: { groupId: string; projectId?: string | null }
) {
  if (projectId) {
    await db.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.ARCHIVED }
    });
  }

  await db.group.update({
    where: { id: groupId },
    data: {
      projectId: null,
      projectTitle: 'Pending Student Submission',
      title: 'Pending Student Submission',
      status: 'pending',
      statusLabel: 'Pending',
      statusClass: 'status-warning',
      milestone: 'Awaiting initial progress update',
      currentMilestone: 'Awaiting initial progress update'
    }
  });
}

export type NewTitleRecoveryStage = 'concept' | 'proposal';

// A "New Title" decision can happen at Concept Presentation just as validly as
// Proposal Defense — this derives which one from the triggering schedule's own
// title (reuses the same normalize() + substring-match style as
// getCheckpointKeyForSchedule above). Pre-Final/Final/Mock defenses aren't
// mapped here: by that point the title has long since been locked in, so a
// "New Title" decision doesn't apply there the same way.
export function getNewTitleRecoveryStage(scheduleTitle: string): NewTitleRecoveryStage | null {
  const normalized = normalize(scheduleTitle);

  if (normalized.includes('concept')) {
    return 'concept';
  }

  if (normalized.includes('proposal')) {
    return 'proposal';
  }

  return null;
}

// Which checkpoint should receive the student's replacement-title submission
// (see title-submissions/route.ts's pendingNewTitleProject branch) for each
// recovery stage. Concept bundles the title and concept paper into a single
// submission ('concept-title' — "Title & concept paper submitted"), so a
// rejected concept genuinely needs that whole checkpoint redone, not just an
// adviser-review step. Reopening 'concept-title' itself is safe (not a
// collision risk with a brand-new group's first-ever submission) because
// POST /api/title-submissions already resolves this exact same checkpoint key
// for a first-time submission too — recovery and first-time naturally
// converge on the same key at Concept. Proposal has no such first-time path
// through this endpoint (proposal content is submitted elsewhere, via
// /api/document-files), so its recovery safely uses a dedicated review
// checkpoint instead.
export const NEW_TITLE_SUBMISSION_CHECKPOINT_KEY: Record<NewTitleRecoveryStage, string> = {
  concept: 'concept-title',
  proposal: 'proposal-adviser-review'
};

// Which checkpoints reopen (go back to pending) for each recovery stage — the
// title decision itself plus whatever downstream schedule/vote step is now
// invalid because it was for the rejected title. Everything else (Concept's
// oral defense application evidence, Proposal's chapters and defense
// evidence) stays exactly as it was, since a title change doesn't invalidate
// paperwork/content that isn't about the title itself.
export const NEW_TITLE_RESET_CHECKPOINT_KEYS: Record<NewTitleRecoveryStage, string[]> = {
  concept: ['concept-title', 'concept-adviser-approval', 'concept-presentation-scheduled', 'concept-panel-approval'],
  proposal: ['proposal-adviser-review', 'proposal-defense-scheduled', 'proposal-panel-evaluation']
};

/**
 * Used when a Concept Presentation or Proposal Defense panel decides a group
 * needs a New Title. Unlike resetGroupForNewTitle (which fully archives the
 * project and unlinks the group — correct for a general-purpose "start over"
 * demotion at any stage), this keeps the same Project row and its Group link
 * intact, and only reopens the checkpoints specific to the stage that was
 * actually rejected (see NEW_TITLE_RESET_CHECKPOINT_KEYS) — the group's other
 * stage-independent work stays untouched.
 */
export async function resetProjectForNewTitle(
  db: DbClient,
  {
    projectId,
    previousTitle,
    chairRemarks,
    scheduleTitle
  }: { projectId: string; previousTitle: string; chairRemarks?: string | null; scheduleTitle: string }
) {
  await db.project.update({
    where: { id: projectId },
    data: { status: ProjectStatus.NEEDS_REVISION }
  });

  // Falls back to the Proposal checkpoint set if the schedule title doesn't
  // match a known stage — matches this function's original, pre-Concept-aware
  // behavior rather than silently doing nothing.
  const stage = getNewTitleRecoveryStage(scheduleTitle) ?? 'proposal';
  const checkpointKeys = NEW_TITLE_RESET_CHECKPOINT_KEYS[stage];

  // Surfaced right on the checkpoint the student already checks progress on
  // (Milestones page), so it's unambiguous their old title is gone and why —
  // not just a notification that can get missed/dismissed.
  const rejectionNote = `Previous title "${previousTitle}" was not approved — the panel required a new title.${
    chairRemarks ? ` Panel remarks: ${chairRemarks}` : ''
  } Submit a replacement title to continue.`;

  await db.milestoneCheckpoint.updateMany({
    where: {
      projectId,
      key: { in: checkpointKeys }
    },
    data: {
      status: MilestoneCheckpointStatus.PENDING,
      adviserReviewStatus: MilestoneCheckpointReviewStatus.PENDING,
      panelReviewStatus: MilestoneCheckpointReviewStatus.PENDING,
      submittedAt: null,
      reviewedAt: null,
      completedAt: null,
      latestFeedback: rejectionNote,
      latestFeedbackBy: 'Defense Panel Chair',
      latestFeedbackAt: new Date()
    }
  });
}

/**
 * Used when the panel chair reports that a group is pivoting to a backup
 * title in the SAME sitting as the rejected original — no separate
 * reschedule, no new DefenseSchedule row. Unlike resetProjectForNewTitle
 * (which reopens checkpoints for a fresh submission + a later scheduled
 * presentation), this swaps the project's title in place and reopens the
 * SAME DefenseSchedule/Evaluation rows for a fresh round of voting right now
 * — the group presents the backup live, and every panelist votes again on
 * it, same as any other defense. The eventual pass/fail still runs through
 * the normal finalizeDefenseSchedule path in evaluate/route.ts.
 */
export async function restartDefenseVoteForBackupTitle(
  db: DbClient,
  {
    scheduleId,
    projectId,
    groupId,
    scheduleTitle,
    title,
    description,
    keywords
  }: {
    scheduleId: string;
    projectId: string;
    groupId?: string | null;
    scheduleTitle: string;
    title: string;
    description?: string | null;
    keywords?: string[];
  }
) {
  await db.project.update({
    where: { id: projectId },
    data: {
      title,
      abstract: description || undefined,
      keywords: keywords && keywords.length ? keywords : undefined,
      status: ProjectStatus.DEFENSE_SCHEDULED
    }
  });

  if (groupId) {
    await db.group.update({
      where: { id: groupId },
      data: {
        projectTitle: title,
        title,
        status: 'active',
        statusLabel: 'Active',
        statusClass: 'status-active'
      }
    });
  }

  // Reopens the same schedule row for another round — clearing chairDecision
  // is what makes the voting UI reappear instead of the decided-recap view
  // (see needsChairDecision/ChairDecisionRecap in defense-voting-data.ts).
  await db.defenseSchedule.update({
    where: { id: scheduleId },
    data: {
      status: DefenseStatus.SCHEDULED,
      chairDecision: null,
      chairDecisionAt: null,
      chairDecisionRemarks: null,
      // The redefense is a new sitting: the chair starts it again, and its
      // minutes must be confirmed again (earlier minutes stay as history).
      startedAt: null,
      minutesConfirmedAt: null
    }
  });

  await db.evaluation.updateMany({
    where: { defenseScheduleId: scheduleId },
    data: {
      recommendation: EvaluationRecommendation.PENDING,
      remarks: null,
      submittedAt: null
    }
  });

  // The rejected vote left this stage's panel checkpoint at NEEDS_REVISION,
  // which is what was driving a stale "Redefense Required" alert on the
  // student dashboard even though voting had already restarted. The panel is
  // actively re-voting, not asking for a revision, so this clears back to
  // IN_REVIEW ("in progress") instead — resolved again by the normal
  // recordDefenseVoteOutcome call once the new vote actually finishes.
  const stage = getNewTitleRecoveryStage(scheduleTitle) ?? 'proposal';
  const panelCheckpointKey = stage === 'concept' ? 'concept-panel-approval' : 'proposal-panel-evaluation';
  const panelCheckpoint = await db.milestoneCheckpoint.findUnique({
    where: { projectId_key: { projectId, key: panelCheckpointKey } }
  });

  if (panelCheckpoint) {
    await db.milestoneCheckpoint.update({
      where: { id: panelCheckpoint.id },
      data: {
        status: MilestoneCheckpointStatus.IN_REVIEW,
        panelReviewStatus: MilestoneCheckpointReviewStatus.PENDING,
        latestFeedback: `The group is presenting backup title "${title}" — the panel gives a new verdict in this same session.`,
        latestFeedbackBy: 'Defense Panel Chair',
        latestFeedbackAt: new Date()
      }
    });
    await updateMilestoneRollup(db, panelCheckpoint.milestoneId);
  }
}

function getReviewFieldForRole(role: UserRole) {
  return role === UserRole.PANEL
    ? 'panelReviewStatus'
    : 'adviserReviewStatus';
}

function mapSubmissionStatusToCheckpointStatus(status: SubmissionStatus) {
  if (status === SubmissionStatus.APPROVED) return MilestoneCheckpointStatus.COMPLETED;
  if (status === SubmissionStatus.NEEDS_REVISION || status === SubmissionStatus.REJECTED) return MilestoneCheckpointStatus.NEEDS_REVISION;
  if (status === SubmissionStatus.UNDER_REVIEW) return MilestoneCheckpointStatus.IN_REVIEW;
  return MilestoneCheckpointStatus.SUBMITTED;
}

function mapSubmissionStatusToReviewStatus(status: SubmissionStatus) {
  if (status === SubmissionStatus.APPROVED) return MilestoneCheckpointReviewStatus.APPROVED;
  if (status === SubmissionStatus.NEEDS_REVISION || status === SubmissionStatus.REJECTED) return MilestoneCheckpointReviewStatus.NEEDS_REVISION;
  if (status === SubmissionStatus.UNDER_REVIEW) return MilestoneCheckpointReviewStatus.IN_REVIEW;
  return MilestoneCheckpointReviewStatus.PENDING;
}

function getCompanionReviewCheckpointKeys(sourceKey: string | null | undefined, role: UserRole, nextStatus: SubmissionStatus) {
  const source = sourceKey || '';
  const isApproval = nextStatus === SubmissionStatus.APPROVED;
  const isReviewedConceptTitle =
    source === 'concept-title' &&
    (
      nextStatus === SubmissionStatus.APPROVED ||
      nextStatus === SubmissionStatus.NEEDS_REVISION ||
      nextStatus === SubmissionStatus.REJECTED
    );

  if (role === UserRole.PANEL) {
    if (source.startsWith('concept-')) {
      return ['concept-panel-approval'];
    }

    if (source.startsWith('proposal-')) {
      return isApproval
        ? ['proposal-panel-evaluation', 'proposal-final-approval']
        : ['proposal-panel-evaluation'];
    }

    if (source.startsWith('mock-')) {
      return isApproval
        ? ['mock-panel-comments', 'mock-revisions-completed']
        : ['mock-panel-comments'];
    }

    if (source.startsWith('final-')) {
      return isApproval
        ? ['final-panel-approval', 'final-revisions-submitted']
        : ['final-panel-approval'];
    }

    return [];
  }

  if (isReviewedConceptTitle) {
    // concept-defense-application is no longer bundled into the title decision —
    // it's uploaded and independently reviewed after the adviser has already
    // approved the idea, so it needs its own review action (syncEvidenceReview).
    return ['concept-adviser-approval'];
  }

  // A "*-defense-application" source is always the independent oral-defense-evidence
  // review — it must never cascade into that stage's other adviser checkpoint
  // (concept-adviser-approval / proposal-adviser-review / etc.). Without this guard,
  // the prefix checks below would catch it too (they only exist for the title/chapters/
  // monitoring submissions), silently overwriting an already-decided, unrelated
  // checkpoint's status, timestamps, and feedback with the evidence decision instead.
  if (source.endsWith('-defense-application')) {
    return [];
  }

  if (source.startsWith('concept-')) {
    return ['concept-adviser-approval'];
  }

  if (source.startsWith('proposal-')) {
    return ['proposal-adviser-review'];
  }

  if (source.startsWith('development-')) {
    return ['development-adviser-monitoring'];
  }

  return [];
}

async function syncCompanionReviewCheckpoints(
  db: DbClient,
  {
    projectId,
    sourceKey,
    nextStatus,
    reviewNotes,
    reviewerName,
    reviewerRole
  }: {
    projectId: string;
    sourceKey?: string | null;
    nextStatus: SubmissionStatus;
    reviewNotes?: string | null;
    reviewerName?: string | null;
    reviewerRole: UserRole;
  }
) {
  const companionKeys = getCompanionReviewCheckpointKeys(sourceKey, reviewerRole, nextStatus)
    .filter((key) => key !== sourceKey);

  if (!companionKeys.length) {
    return;
  }

  const nextCheckpointStatus = mapSubmissionStatusToCheckpointStatus(nextStatus);
  const nextReviewStatus = mapSubmissionStatusToReviewStatus(nextStatus);
  const reviewedAt = REVIEWED_SUBMISSION_STATUSES.has(nextStatus) ? new Date() : null;
  const reviewField = getReviewFieldForRole(reviewerRole);
  const feedback = String(reviewNotes ?? '').trim();

  for (const key of companionKeys) {
    const checkpoint = await db.milestoneCheckpoint.findUnique({
      where: {
        projectId_key: {
          projectId,
          key
        }
      }
    });

    if (!checkpoint) {
      continue;
    }

    if (sourceKey === 'concept-title' && NO_FABRICATE_ON_REPAIR_KEYS.has(key) && !hasCheckpointActivity(checkpoint)) {
      continue;
    }

    const updatedCheckpoint = await db.milestoneCheckpoint.update({
      where: { id: checkpoint.id },
      data: {
        status: nextCheckpointStatus,
        [reviewField]: nextReviewStatus,
        reviewedAt,
        completedAt: nextCheckpointStatus === MilestoneCheckpointStatus.COMPLETED ? new Date() : null,
        latestFeedback: feedback || undefined,
        latestFeedbackBy: feedback ? reviewerName || 'Faculty Reviewer' : undefined,
        latestFeedbackAt: feedback ? new Date() : undefined
      }
    });

    await updateMilestoneRollup(db, updatedCheckpoint.milestoneId);
  }
}

export async function syncCheckpointReview(
  db: DbClient,
  {
    submissionId,
    nextStatus,
    reviewNotes,
    reviewerName,
    reviewerRole,
    resolveOpenRound = false
  }: {
    submissionId: string;
    nextStatus: SubmissionStatus;
    reviewNotes?: string | null;
    reviewerName?: string | null;
    reviewerRole: UserRole;
    // Set this when the decision covers every file in the checkpoint's current
    // open round (e.g. a multi-photo evidence batch decided as one unit) rather
    // than a single independently-reviewable file — see call site comment.
    resolveOpenRound?: boolean;
  }
) {
  let submission = await db.submission.findUnique({
    where: { id: submissionId },
    include: {
      files: true,
      checkpoint: true
    }
  });

  if (!submission) {
    return null;
  }

  if (!submission.checkpointId) {
    const file = submission.files?.[0] ?? null;
    const checkpoint = await resolveMilestoneCheckpointForSubmission(db, {
      projectId: submission.projectId,
      documentCategory: file?.documentCategory,
      fileName: file?.fileName || submission.title
    });

    if (!checkpoint) {
      return null;
    }

    await db.submission.update({
      where: { id: submission.id },
      data: {
        milestoneId: checkpoint.milestoneId,
        checkpointId: checkpoint.id
      }
    });

    if (file?.id) {
      await db.uploadedFile.update({
        where: { id: file.id },
        data: { checkpointId: checkpoint.id }
      });
    }

    submission = {
      ...submission,
      milestoneId: checkpoint.milestoneId,
      checkpointId: checkpoint.id,
      checkpoint
    };
  }

  const nextCheckpointStatus = mapSubmissionStatusToCheckpointStatus(nextStatus);
  const nextReviewStatus = mapSubmissionStatusToReviewStatus(nextStatus);
  const reviewedAt = REVIEWED_SUBMISSION_STATUSES.has(nextStatus) ? new Date() : null;
  const reviewField = getReviewFieldForRole(reviewerRole);
  const feedback = String(reviewNotes ?? '').trim();

  // A round can span several files (a multi-photo evidence batch), each its own
  // Submission row — when the caller says this decision covers the whole round,
  // apply it to every still-open Submission under the checkpoint, otherwise
  // every sibling file uploaded in that batch stays stuck at SUBMITTED forever
  // even after the checkpoint itself is marked approved/needs-revision.
  if (resolveOpenRound) {
    await db.submission.updateMany({
      where: {
        checkpointId: submission.checkpointId,
        OR: [{ status: SubmissionStatus.SUBMITTED }, { id: submission.id }]
      },
      data: {
        status: nextStatus,
        reviewedAt
      }
    });
  }

  const updatedCheckpoint = await db.milestoneCheckpoint.update({
    where: { id: submission.checkpointId },
    data: {
      status: nextCheckpointStatus,
      [reviewField]: nextReviewStatus,
      reviewedAt,
      completedAt: nextCheckpointStatus === MilestoneCheckpointStatus.COMPLETED ? new Date() : null,
      latestFeedback: feedback || undefined,
      latestFeedbackBy: feedback ? reviewerName || 'Faculty Reviewer' : undefined,
      latestFeedbackAt: feedback ? new Date() : undefined
    }
  });

  await updateMilestoneRollup(db, updatedCheckpoint.milestoneId);
  await syncCompanionReviewCheckpoints(db, {
    projectId: submission.projectId,
    sourceKey: submission.checkpoint?.key,
    nextStatus,
    reviewNotes,
    reviewerName,
    reviewerRole
  });

  return updatedCheckpoint;
}
