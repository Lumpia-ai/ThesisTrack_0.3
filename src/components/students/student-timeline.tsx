'use client';

import Link from 'next/link';
import { Fragment, useMemo, useState } from 'react';
import type { StudentDashboardData } from '@/lib/services/student-workspace';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger';
type StageKey = 'concept' | 'proposal' | 'development' | 'mock-defense' | 'final-defense' | 'completion';
type StageStatus = 'completed' | 'in-review' | 'needs-revision' | 'rejected' | 'pending' | 'locked';
type CheckpointStatus = 'completed' | 'in-review' | 'needs-revision' | 'rejected' | 'pending' | 'locked';
type ReviewStatus = 'approved' | 'in-review' | 'needs-revision' | 'rejected' | 'pending' | 'not-required';

type CheckpointBlueprint = {
  id: string;
  label: string;
  kind:
    | 'title-submitted'
    | 'concept-defense-application'
    | 'adviser-approval'
    | 'concept-presentation-scheduled'
    | 'concept-panel-approval'
    | 'chapters-uploaded'
    | 'adviser-review'
    | 'proposal-defense-application'
    | 'proposal-defense-scheduled'
    | 'panel-evaluation'
    | 'final-approval'
    | 'prototype-uploaded'
    | 'progress-report'
    | 'testing-evidence'
    | 'monitoring-approval'
    | 'presentation-uploaded'
    | 'mock-defense-scheduled'
    | 'panel-comments'
    | 'revisions-completed'
    | 'final-manuscript'
    | 'final-defense-application'
    | 'final-defense-scheduled'
    | 'panel-approval'
    | 'final-revisions'
    | 'approved-manuscript'
    | 'approval-sheet'
    | 'repository-submission'
    | 'archive-confirmation';
};

type StageBlueprint = {
  key: StageKey;
  title: string;
  summary: string;
  defaultTarget: string;
  route: string;
  actionLabel: string;
  icon: string;
  evidenceCategories: string[];
  evidenceKeywords: string[];
  scheduleKeywords: string[];
  feedbackKeywords: string[];
  checkpoints: CheckpointBlueprint[];
};

type StageEvidence = {
  id: string;
  fileName: string;
  fileType: string;
  sizeLabel: string;
  uploadDateLabel: string;
  reviewStatus: string;
};

type StageFeedback = {
  id: string;
  title: string;
  content: string;
  facultyName: string;
  mode: string;
  status: string;
  dateLabel: string;
};

type SavedCheckpoint = StudentDashboardData['milestoneCheckpoints'][number];

type BuiltCheckpoint = CheckpointBlueprint & {
  status: CheckpointStatus;
  note: string;
  recordId?: string;
  studentStartDate?: string;
  studentTargetDate?: string;
  completedAt?: string;
  submittedAt?: string;
  reviewedAt?: string;
};

type BuiltStage = {
  id: string;
  key: StageKey;
  index: number;
  title: string;
  summary: string;
  targetDate: string;
  route: string;
  actionLabel: string;
  icon: string;
  status: StageStatus;
  progress: number;
  isOverdue?: boolean;
  completedCheckpoints: number;
  checkpoints: BuiltCheckpoint[];
  evidence: StageEvidence[];
  adviserReview: ReviewStatus;
  panelReview: ReviewStatus;
  latestFeedback: StageFeedback | null;
};

const SCHEDULE_CHECKPOINT_KINDS = new Set<CheckpointBlueprint['kind']>([
  'concept-presentation-scheduled',
  'proposal-defense-scheduled',
  'mock-defense-scheduled',
  'final-defense-scheduled'
]);

const STUDENT_TASK_KINDS = new Set<CheckpointBlueprint['kind']>([
  'title-submitted',
  'concept-defense-application',
  'chapters-uploaded',
  'proposal-defense-application',
  'prototype-uploaded',
  'progress-report',
  'testing-evidence',
  'presentation-uploaded',
  'revisions-completed',
  'final-manuscript',
  'final-defense-application',
  'final-revisions',
  'approved-manuscript',
  'approval-sheet',
  'repository-submission'
]);

// Who has to act on each checkpoint, so students can tell their own tasks
// from steps that are waiting on faculty.
type CheckpointOwner = 'student' | 'adviser' | 'panel' | 'program-head' | 'library';

const PANEL_CHECKPOINT_KINDS = new Set<CheckpointBlueprint['kind']>([
  'concept-panel-approval',
  'panel-evaluation',
  'panel-comments',
  'panel-approval'
]);

const OWNER_META: Record<CheckpointOwner, { label: string; icon: string; className: string }> = {
  // Owner tags stay neutral so they never compete with the status colors;
  // only "You" is tinted, to pick out the student's own steps.
  student: { label: 'You', icon: 'fa-user', className: 'border-[var(--primary)]/30 bg-[var(--primary-soft)] text-[var(--primary)]' },
  adviser: { label: 'Adviser', icon: 'fa-user-tie', className: 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]' },
  panel: { label: 'Panel', icon: 'fa-users', className: 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]' },
  'program-head': { label: 'Program Head', icon: 'fa-calendar-check', className: 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]' },
  library: { label: 'Library', icon: 'fa-book', className: 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]' }
};

function getCheckpointOwner(kind: CheckpointBlueprint['kind']): CheckpointOwner {
  if (STUDENT_TASK_KINDS.has(kind)) return 'student';
  if (SCHEDULE_CHECKPOINT_KINDS.has(kind)) return 'program-head';
  if (PANEL_CHECKPOINT_KINDS.has(kind)) return 'panel';
  if (kind === 'archive-confirmation') return 'library';
  return 'adviser';
}

function OwnerChip({ owner }: { owner: CheckpointOwner }) {
  const meta = OWNER_META[owner];

  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${meta.className}`}>
      <i className={`fas ${meta.icon} text-[9px]`} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

// Capstone 1 (3rd year, 2nd semester) covers Concept → Proposal; Capstone 2
// (4th year, 1st semester) covers Development → Completion. Pre-Final Defense
// is no longer part of the workflow.
const CAPSTONE_GROUPS: Array<{ id: 1 | 2; label: string; term: string; stageKeys: StageKey[] }> = [
  { id: 1, label: 'Capstone/Thesis 1', term: '3rd year · 2nd semester', stageKeys: ['concept', 'proposal'] },
  { id: 2, label: 'Capstone/Thesis 2', term: '4th year · 1st semester', stageKeys: ['development', 'final-defense', 'completion'] }
];

const STAGE_BLUEPRINTS: StageBlueprint[] = [
  {
    key: 'concept',
    title: 'Concept',
    summary: 'Define the research topic, problem scope, and initial capstone direction.',
    defaultTarget: 'Target set by adviser',
    route: '/students/title-submission',
    actionLabel: 'Open Title Submission',
    icon: 'fa-lightbulb',
    evidenceCategories: ['concept', 'title', 'title-submission', 'title-proposal', 'title proposal', 'concept-paper', 'concept paper', 'concept proposal'],
    evidenceKeywords: ['concept', 'title'],
    scheduleKeywords: ['concept', 'title', 'presentation', 'defense'],
    feedbackKeywords: ['concept', 'title'],
    checkpoints: [
      { id: 'concept-title', label: 'Title & concept paper submitted', kind: 'title-submitted' },
      { id: 'concept-adviser-approval', label: 'Adviser idea approval', kind: 'adviser-approval' },
      { id: 'concept-defense-application', label: 'Oral defense application uploaded', kind: 'concept-defense-application' },
      { id: 'concept-presentation-scheduled', label: 'Concept presentation scheduled', kind: 'concept-presentation-scheduled' },
      { id: 'concept-panel-approval', label: 'Panel concept approval', kind: 'concept-panel-approval' }
    ]
  },
  {
    key: 'proposal',
    title: 'Proposal',
    summary: 'Submit the formal project proposal for adviser and panel evaluation and approval.',
    defaultTarget: 'Proposal target pending',
    route: '/students/project-files',
    actionLabel: 'Upload Requirement',
    icon: 'fa-file-lines',
    evidenceCategories: ['proposal', 'chapters-1-3', 'manuscript', 'chapter-1', 'chapter-2', 'chapter-3', 'chapter-4', 'chapter-5'],
    evidenceKeywords: ['proposal', 'chapter 1', 'chapter 2', 'chapter 3', 'chapters 1-3'],
    scheduleKeywords: ['proposal', 'defense'],
    feedbackKeywords: ['proposal', 'chapter'],
    checkpoints: [
      { id: 'proposal-chapters', label: 'Proposal document uploaded', kind: 'chapters-uploaded' },
      { id: 'proposal-adviser-review', label: 'Adviser initial review', kind: 'adviser-review' },
      { id: 'proposal-defense-application', label: 'Oral defense application uploaded', kind: 'proposal-defense-application' },
      { id: 'proposal-defense-scheduled', label: 'Proposal defense scheduled', kind: 'proposal-defense-scheduled' },
      { id: 'proposal-panel-evaluation', label: 'Panel evaluation', kind: 'panel-evaluation' },
      { id: 'proposal-final-approval', label: 'Final approval', kind: 'final-approval' }
    ]
  },
  {
    key: 'development',
    title: 'Development',
    summary: 'Build the system, submit progress reports, and provide implementation evidence.',
    defaultTarget: 'Development target pending',
    route: '/students/project-overview',
    actionLabel: 'View Project',
    icon: 'fa-laptop-code',
    evidenceCategories: ['system-files', 'prototype', 'testing', 'development', 'progress-report'],
    evidenceKeywords: ['prototype', 'testing', 'test', 'system', 'development', 'progress report'],
    scheduleKeywords: ['development', 'monitoring', 'consultation'],
    feedbackKeywords: ['development', 'prototype', 'testing', 'progress'],
    checkpoints: [
      { id: 'development-prototype', label: 'System / Prototype uploaded', kind: 'prototype-uploaded' },
      { id: 'development-progress-report', label: 'Progress report submitted', kind: 'progress-report' },
      { id: 'development-testing-evidence', label: 'Testing evidence uploaded', kind: 'testing-evidence' },
      { id: 'development-adviser-monitoring', label: 'Adviser monitoring approval', kind: 'monitoring-approval' }
    ]
  },
  {
    key: 'final-defense',
    title: 'Final Defense',
    summary: 'Defend the completed project before the panel and submit final revisions.',
    defaultTarget: 'Final defense target pending',
    route: '/students/faculty-feedback',
    actionLabel: 'View Feedback',
    icon: 'fa-landmark',
    evidenceCategories: ['final-manuscript', 'presentation-files', 'final-defense', 'revisions'],
    evidenceKeywords: ['final manuscript', 'final defense', 'presentation', 'final revision'],
    scheduleKeywords: ['final', 'defense'],
    feedbackKeywords: ['final', 'defense', 'panel', 'revision'],
    checkpoints: [
      { id: 'final-manuscript', label: 'Final manuscript uploaded', kind: 'final-manuscript' },
      { id: 'final-defense-application', label: 'Oral defense application uploaded', kind: 'final-defense-application' },
      { id: 'final-defense-scheduled', label: 'Final defense scheduled', kind: 'final-defense-scheduled' },
      { id: 'final-panel-approval', label: 'Panel approval', kind: 'panel-approval' },
      { id: 'final-revisions-submitted', label: 'Final revisions submitted', kind: 'final-revisions' }
    ]
  },
  {
    key: 'completion',
    title: 'Completion',
    summary: 'Finalize approved deliverables, repository submission, and archive confirmation.',
    defaultTarget: 'Completion target pending',
    route: '/students/repository',
    actionLabel: 'Open Repository',
    icon: 'fa-graduation-cap',
    evidenceCategories: ['approved-manuscript', 'approval-sheet', 'repository', 'archive'],
    evidenceKeywords: ['approved manuscript', 'approval sheet', 'repository', 'archive'],
    scheduleKeywords: ['completion', 'archive'],
    feedbackKeywords: ['completion', 'approved', 'repository', 'archive'],
    checkpoints: [
      { id: 'completion-approved-manuscript', label: 'Approved manuscript uploaded', kind: 'approved-manuscript' },
      { id: 'completion-approval-sheet', label: 'Approval sheet uploaded', kind: 'approval-sheet' },
      { id: 'completion-repository-submission', label: 'Repository submission completed', kind: 'repository-submission' },
      { id: 'completion-archive-confirmation', label: 'Archive confirmation', kind: 'archive-confirmation' }
    ]
  }
];

function normalizeText(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function includesAny(value: string, keywords: string[]) {
  const normalized = normalizeText(value);
  return keywords.some((keyword) => normalized.includes(keyword));
}

function normalizeEvidenceText(value: unknown) {
  return normalizeText(value).replace(/[-_]+/g, ' ');
}

function isConceptStageEvidenceDocument(document: StudentDashboardData['documents'][number]) {
  const category = normalizeEvidenceText(document.category);
  const fileName = normalizeEvidenceText(document.fileName);

  return category === 'title' ||
    category.includes('title proposal') ||
    category.includes('title submission') ||
    category.includes('concept paper') ||
    category.includes('concept proposal') ||
    fileName.includes('title proposal') ||
    fileName.includes('title submission') ||
    fileName.includes('concept paper') ||
    fileName.includes('concept proposal');
}

function isConceptStageFeedback(feedback: StageFeedback) {
  const haystack = normalizeEvidenceText(`${feedback.title} ${feedback.content} ${feedback.mode}`);

  return haystack.includes('title proposal') ||
    haystack.includes('title submission') ||
    haystack.includes('concept paper') ||
    haystack.includes('concept proposal');
}

function isApprovedStatus(value?: string) {
  const normalized = normalizeText(value);
  return normalized.includes('approved') || normalized.includes('completed') || normalized.includes('complete') || normalized.includes('accepted');
}

function isRevisionStatus(value?: string) {
  const normalized = normalizeText(value);
  return normalized.includes('needs revision') || normalized.includes('revision') || normalized.includes('rejected') || normalized.includes('delayed');
}

function isReviewStatus(value?: string) {
  const normalized = normalizeText(value);
  return normalized.includes('review') || normalized.includes('ongoing') || normalized.includes('current') || normalized.includes('active');
}

function normalizeStageStatus(value?: string): StageStatus | null {
  if (!value) return null;
  const normalized = normalizeText(value);
  if (isApprovedStatus(value)) return 'completed';
  if (isRevisionStatus(value)) return 'needs-revision';
  if (normalized.includes('in_progress') || normalized.includes('submitted') || normalized.includes('under_review')) return 'in-review';
  if (isReviewStatus(value)) return 'in-review';
  if (normalized.includes('pending')) return 'pending';
  return null;
}

function formatStageStatus(status: StageStatus) {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'in-review':
      return 'In Review';
    case 'needs-revision':
      return 'Needs Revision';
    case 'rejected':
      return 'Rejected';
    case 'locked':
      return 'Locked';
    default:
      return 'Pending';
  }
}

function getStatusTone(status: StageStatus | CheckpointStatus | ReviewStatus): BadgeTone {
  if (status === 'completed' || status === 'approved') return 'success';
  if (status === 'rejected') return 'danger';
  if (status === 'needs-revision' || status === 'in-review' || status === 'pending') return 'warning';
  return 'neutral';
}

function getReviewLabel(status: ReviewStatus) {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'in-review':
      return 'In Review';
    case 'needs-revision':
      return 'Needs Revision';
    case 'rejected':
      return 'Rejected';
    case 'pending':
      return 'Pending';
    case 'not-required':
      return 'Not Required';
    default:
      return 'Pending';
  }
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getStageDocuments(stage: StageBlueprint, data: StudentDashboardData): StageEvidence[] {
  const documents = data.documents.filter((document) => {
    if (isConceptStageEvidenceDocument(document)) {
      return stage.key === 'concept';
    }

    const category = normalizeEvidenceText(document.category);
    
    // Exact category match
    if (stage.evidenceCategories.some((item) => category === normalizeEvidenceText(item))) {
      return true;
    }

    // Prevent fuzzy matching if it strictly belongs to another stage
    const matchesOtherStageCategory = STAGE_BLUEPRINTS.some(otherStage => 
      otherStage.key !== stage.key && otherStage.evidenceCategories.some(item => category === normalizeEvidenceText(item))
    );
    if (matchesOtherStageCategory) {
      return false;
    }

    const haystack = `${document.fileName} ${document.fileType} ${document.category}`;
    return includesAny(haystack, stage.evidenceKeywords);
  });

  const titleAttachments =
    stage.key === 'concept'
      ? data.titleRegistration.attachments.map((attachment) => ({
          id: attachment.id,
          fileName: attachment.fileName,
          fileType: attachment.fileType,
          sizeLabel: attachment.sizeLabel,
          uploadDateLabel: attachment.uploadedAtLabel,
          reviewStatus: attachment.status
        }))
      : [];

  return [...titleAttachments, ...documents].map((item) => ({
    id: item.id,
    fileName: item.fileName,
    fileType: item.fileType,
    sizeLabel: item.sizeLabel,
    uploadDateLabel: item.uploadDateLabel,
    reviewStatus: item.reviewStatus
  }));
}

function getStageSchedules(stage: StageBlueprint, data: StudentDashboardData) {
  return data.schedules.filter((schedule) => {
    const haystack = `${schedule.title} ${schedule.type} ${schedule.description}`;
    return includesAny(haystack, stage.scheduleKeywords);
  });
}

function getStageFeedback(stage: StageBlueprint, data: StudentDashboardData): StageFeedback[] {
  return data.feedback.filter((feedback) => {
    if (isConceptStageFeedback(feedback)) {
      return stage.key === 'concept';
    }

    const haystack = `${feedback.title} ${feedback.content} ${feedback.submissionTitle ?? ''} ${feedback.mode}`;
    return includesAny(haystack, stage.feedbackKeywords);
  });
}

function hasApprovedDocument(evidence: StageEvidence[]) {
  return evidence.some((item) => isApprovedStatus(item.reviewStatus));
}

function hasSubmittedTitle(data: StudentDashboardData) {
  return Boolean(
    data.titleRegistration.proposedTitle ||
      data.titleRegistration.submissions?.length ||
      data.titleRegistration.status?.toLowerCase() === 'submitted'
  );
}

function hasRepositorySubmission(data: StudentDashboardData) {
  const status = normalizeText(data.project.repositoryStatus);
  return Boolean(status && status !== 'n/a' && status !== 'not submitted' && status !== 'draft');
}

function formatSavedDate(value?: string) {
  if (!value) return '';

  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
  } catch {
    return '';
  }
}

function mapSavedCheckpointStatus(status?: string): CheckpointStatus {
  const normalized = normalizeText(status).replace(/_/g, '-');
  if (normalized.includes('completed') || normalized.includes('approved')) return 'completed';
  if (normalized.includes('rejected')) return 'rejected';
  if (normalized.includes('needs-revision')) return 'needs-revision';
  if (normalized.includes('in-review') || normalized.includes('submitted') || normalized.includes('under-review')) return 'in-review';
  if (normalized.includes('locked')) return 'locked';
  return 'pending';
}

function mapSavedReviewStatus(status?: string): ReviewStatus {
  const normalized = normalizeText(status).replace(/_/g, '-');
  if (normalized.includes('not-required')) return 'not-required';
  if (normalized.includes('approved') || normalized.includes('completed')) return 'approved';
  if (normalized.includes('rejected')) return 'rejected';
  if (normalized.includes('needs-revision')) return 'needs-revision';
  if (normalized.includes('in-review') || normalized.includes('submitted') || normalized.includes('under-review')) return 'in-review';
  return 'pending';
}

function isPendingCheckpointFeedback(value?: string) {
  const normalized = normalizeText(value);

  return normalized.includes('pending adviser review') ||
    normalized.includes('waiting for review') ||
    normalized.includes('review is in progress');
}

function getSavedCheckpointNote(record: SavedCheckpoint, status: CheckpointStatus) {
  if (record.latestFeedback && !(status === 'completed' && isPendingCheckpointFeedback(record.latestFeedback))) {
    return record.latestFeedback;
  }

  if (status === 'completed') {
    return record.completedAt
      ? `Completed on ${formatSavedDate(record.completedAt)}.`
      : 'Completed and saved in checkpoint tracking.';
  }

  if (status === 'needs-revision') {
    return record.reviewedAt
      ? `Revision requested on ${formatSavedDate(record.reviewedAt)}.`
      : 'Revision requested by faculty.';
  }

  if (status === 'in-review') {
    return record.submittedAt
      ? `Submitted on ${formatSavedDate(record.submittedAt)} and waiting for review.`
      : 'Submitted and waiting for review.';
  }

  return 'Waiting for requirement submission.';
}

function buildCheckpointRecordMap(data: StudentDashboardData) {
  return new Map(data.milestoneCheckpoints.map((checkpoint) => [checkpoint.key, checkpoint]));
}

function getPersistedStageReviewStatus(records: SavedCheckpoint[], reviewKey: 'adviserReviewStatus' | 'panelReviewStatus') {
  if (!records.length) return null;
  const statuses = records.map((record) => mapSavedReviewStatus(record[reviewKey]));
  if (statuses.includes('needs-revision')) return 'needs-revision';
  if (statuses.includes('in-review')) return 'in-review';
  const requiredStatuses = statuses.filter((status) => status !== 'not-required');
  if (!requiredStatuses.length) return 'not-required';
  if (requiredStatuses.every((status) => status === 'approved')) return 'approved';
  if (requiredStatuses.some((status) => status === 'approved')) return 'in-review';
  return 'pending';
}

function getCheckpointStatus(
  checkpoint: CheckpointBlueprint,
  stage: StageBlueprint,
  data: StudentDashboardData,
  evidence: StageEvidence[],
  schedules: StudentDashboardData['schedules'],
  feedback: StageFeedback[],
  rawStageStatus: StageStatus | null,
  record?: SavedCheckpoint
): BuiltCheckpoint {
  if (record) {
    const status = mapSavedCheckpointStatus(record.status);

    return {
      ...checkpoint,
      status,
      note: getSavedCheckpointNote(record, status),
      recordId: record.id,
      studentStartDate: record.studentStartDate,
      studentTargetDate: record.studentTargetDate,
      completedAt: record.completedAt,
      submittedAt: record.submittedAt,
      reviewedAt: record.reviewedAt
    };
  }

  if (rawStageStatus === 'completed') {
    return { ...checkpoint, status: 'completed', note: 'Cleared for this stage.' };
  }

  const hasEvidence = evidence.length > 0;
  const adviserFeedback = feedback.find((item) => normalizeText(item.mode).includes('adviser'));
  const panelFeedback = feedback.find((item) => normalizeText(item.mode).includes('panel'));
  const revisionFeedback = feedback.find((item) => isRevisionStatus(item.status) || isRevisionStatus(item.content));
  const approvedFeedback = feedback.find((item) => isApprovedStatus(item.status));

  switch (checkpoint.kind) {
    case 'title-submitted':
      return hasSubmittedTitle(data)
        ? { ...checkpoint, status: 'completed', note: 'Project title has been submitted.' }
        : { ...checkpoint, status: 'pending', note: 'Waiting for title submission.' };
    case 'concept-defense-application':
      return { ...checkpoint, status: 'pending', note: 'Upload a photo of the signed Application for Oral Defense of Thesis (Concept).' };
    case 'adviser-approval':
      if (isApprovedStatus(data.titleRegistration.registrationStatus)) {
        return { ...checkpoint, status: 'completed', note: 'Adviser cleared the idea for concept presentation.' };
      }
      return hasSubmittedTitle(data)
        ? { ...checkpoint, status: 'in-review', note: 'Adviser review is in progress.' }
        : { ...checkpoint, status: 'pending', note: 'Requires title and concept evidence first.' };
    case 'concept-presentation-scheduled':
      return schedules.length
        ? { ...checkpoint, status: 'completed', note: schedules[0].startDateLabel }
        : isApprovedStatus(data.titleRegistration.registrationStatus)
          ? { ...checkpoint, status: 'pending', note: 'Ready to request or wait for concept presentation schedule.' }
          : { ...checkpoint, status: 'locked', note: 'Adviser idea approval and approved oral defense application evidence are required first.' };
    case 'concept-panel-approval':
      if (feedback.some((item) => normalizeText(item.mode).includes('panel') && isApprovedStatus(item.status))) {
        return { ...checkpoint, status: 'completed', note: 'Panel approved the concept after presentation.' };
      }
      if (feedback.some((item) => normalizeText(item.mode).includes('panel') && isRevisionStatus(item.status))) {
        return { ...checkpoint, status: 'needs-revision', note: 'Panel requested concept revisions.' };
      }
      return schedules.length
        ? { ...checkpoint, status: 'in-review', note: 'Waiting for panel concept approval.' }
        : { ...checkpoint, status: 'pending', note: 'Requires concept presentation first.' };
    case 'chapters-uploaded':
      return hasEvidence
        ? { ...checkpoint, status: 'completed', note: `${evidence.length} proposal file${evidence.length === 1 ? '' : 's'} submitted.` }
        : { ...checkpoint, status: 'pending', note: 'Upload the proposal manuscript or chapter documents.' };
    case 'adviser-review':
      if (revisionFeedback) return { ...checkpoint, status: 'needs-revision', note: 'Adviser feedback requires revision.' };
      if (adviserFeedback || approvedFeedback) return { ...checkpoint, status: 'completed', note: 'Adviser review has been logged.' };
      return hasEvidence
        ? { ...checkpoint, status: 'in-review', note: 'Waiting for adviser review.' }
        : { ...checkpoint, status: 'pending', note: 'Submit proposal files first.' };
    case 'proposal-defense-application':
      return { ...checkpoint, status: 'pending', note: 'Upload a photo of the signed Application for Oral Defense of Thesis (Proposal).' };
    case 'proposal-defense-scheduled':
      return schedules.length
        ? { ...checkpoint, status: 'completed', note: schedules[0].startDateLabel }
        : { ...checkpoint, status: 'pending', note: 'No proposal defense schedule yet.' };
    case 'panel-evaluation':
      if (panelFeedback) return { ...checkpoint, status: isRevisionStatus(panelFeedback.status) ? 'needs-revision' : 'completed', note: 'Panel evaluation is recorded.' };
      return schedules.length
        ? { ...checkpoint, status: 'in-review', note: 'Panel evaluation pending after schedule.' }
        : { ...checkpoint, status: 'pending', note: 'Requires scheduled defense.' };
    case 'final-approval':
      if (approvedFeedback || hasApprovedDocument(evidence)) return { ...checkpoint, status: 'completed', note: 'Final proposal approval is recorded.' };
      return panelFeedback
        ? { ...checkpoint, status: 'in-review', note: 'Final approval is being evaluated.' }
        : { ...checkpoint, status: 'pending', note: 'Requires panel evaluation.' };
    case 'prototype-uploaded':
      return hasEvidence
        ? { ...checkpoint, status: 'completed', note: 'System/prototype evidence is available.' }
        : { ...checkpoint, status: 'pending', note: 'Upload your system, prototype, or implementation evidence.' };
    case 'progress-report':
      return data.progressReports.length
        ? { ...checkpoint, status: 'completed', note: `${data.progressReports.length} progress report${data.progressReports.length === 1 ? '' : 's'} submitted.` }
        : { ...checkpoint, status: 'pending', note: 'Submit a progress report.' };
    case 'testing-evidence':
      return evidence.some((item) => includesAny(item.fileName, ['test', 'testing', 'qa', 'evaluation']))
        ? { ...checkpoint, status: 'completed', note: 'Testing evidence is attached.' }
        : hasEvidence
          ? { ...checkpoint, status: 'in-review', note: 'Development evidence is under review.' }
          : { ...checkpoint, status: 'pending', note: 'Upload testing evidence.' };
    case 'monitoring-approval':
      if (adviserFeedback && isRevisionStatus(adviserFeedback.status)) return { ...checkpoint, status: 'needs-revision', note: 'Adviser monitoring needs revision.' };
      return adviserFeedback || hasApprovedDocument(evidence)
        ? { ...checkpoint, status: 'completed', note: 'Adviser monitoring is cleared.' }
        : data.progressReports.length
          ? { ...checkpoint, status: 'in-review', note: 'Monitoring approval is pending.' }
          : { ...checkpoint, status: 'pending', note: 'Requires progress evidence.' };
    case 'presentation-uploaded':
      return hasEvidence
        ? { ...checkpoint, status: 'completed', note: 'Presentation file is uploaded.' }
        : { ...checkpoint, status: 'pending', note: 'Upload the presentation deck.' };
    case 'mock-defense-scheduled':
      return schedules.length
        ? { ...checkpoint, status: 'completed', note: schedules[0].startDateLabel }
        : { ...checkpoint, status: 'pending', note: 'Pre-final defense is not scheduled.' };
    case 'panel-comments':
      return panelFeedback
        ? { ...checkpoint, status: 'completed', note: 'Panel comments have been received.' }
        : schedules.length
          ? { ...checkpoint, status: 'in-review', note: 'Waiting for panel comments.' }
          : { ...checkpoint, status: 'pending', note: 'Requires pre-final defense schedule.' };
    case 'revisions-completed':
      if (revisionFeedback) return { ...checkpoint, status: 'needs-revision', note: 'Revisions are still open.' };
      return approvedFeedback
        ? { ...checkpoint, status: 'completed', note: 'Revisions are marked complete.' }
        : panelFeedback
          ? { ...checkpoint, status: 'in-review', note: 'Revision completion is being checked.' }
          : { ...checkpoint, status: 'pending', note: 'Waiting for panel comments.' };
    case 'final-manuscript':
      return hasEvidence
        ? { ...checkpoint, status: 'completed', note: 'Final manuscript is uploaded.' }
        : { ...checkpoint, status: 'pending', note: 'Upload the final manuscript.' };
    case 'final-defense-application':
      return { ...checkpoint, status: 'pending', note: 'Upload a photo of the signed Application for Oral Defense of Thesis (Final).' };
    case 'final-defense-scheduled':
      return schedules.length
        ? { ...checkpoint, status: 'completed', note: schedules[0].startDateLabel }
        : { ...checkpoint, status: 'pending', note: 'Final defense is not scheduled.' };
    case 'panel-approval':
      if (panelFeedback && isApprovedStatus(panelFeedback.status)) return { ...checkpoint, status: 'completed', note: 'Panel approval is recorded.' };
      if (panelFeedback && isRevisionStatus(panelFeedback.status)) return { ...checkpoint, status: 'needs-revision', note: 'Panel requires revision.' };
      return schedules.length
        ? { ...checkpoint, status: 'in-review', note: 'Panel approval pending.' }
        : { ...checkpoint, status: 'pending', note: 'Requires final defense schedule.' };
    case 'final-revisions':
      if (revisionFeedback) return { ...checkpoint, status: 'needs-revision', note: 'Final revisions are still open.' };
      return approvedFeedback || hasApprovedDocument(evidence)
        ? { ...checkpoint, status: 'completed', note: 'Final revisions are submitted.' }
        : panelFeedback
          ? { ...checkpoint, status: 'in-review', note: 'Final revisions are being validated.' }
          : { ...checkpoint, status: 'pending', note: 'Requires panel decision first.' };
    case 'approved-manuscript':
      return evidence.some((item) => includesAny(item.fileName, ['approved', 'manuscript']) || isApprovedStatus(item.reviewStatus))
        ? { ...checkpoint, status: 'completed', note: 'Approved manuscript is attached.' }
        : { ...checkpoint, status: 'pending', note: 'Upload approved manuscript.' };
    case 'approval-sheet':
      return evidence.some((item) => includesAny(item.fileName, ['approval sheet', 'approval']))
        ? { ...checkpoint, status: 'completed', note: 'Approval sheet is attached.' }
        : { ...checkpoint, status: 'pending', note: 'Upload approval sheet.' };
    case 'repository-submission':
      return hasRepositorySubmission(data)
        ? { ...checkpoint, status: 'completed', note: data.project.repositoryStatus }
        : { ...checkpoint, status: 'pending', note: 'Repository submission is not complete.' };
    case 'archive-confirmation':
      return isApprovedStatus(data.project.repositoryStatus)
        ? { ...checkpoint, status: 'completed', note: 'Archive confirmation is recorded.' }
        : hasRepositorySubmission(data)
          ? { ...checkpoint, status: 'in-review', note: 'Archive confirmation is pending.' }
          : { ...checkpoint, status: 'pending', note: 'Requires repository submission.' };
    default:
      return { ...checkpoint, status: 'pending', note: 'Waiting for requirement update.' };
  }
}

function getReviewStatus(stage: StageBlueprint, feedback: StageFeedback[], evidence: StageEvidence[], kind: 'adviser' | 'panel'): ReviewStatus {
  const reviewerFeedback = feedback.find((item) => normalizeText(item.mode).includes(kind));
  if (reviewerFeedback) {
    if (isRevisionStatus(reviewerFeedback.status) || isRevisionStatus(reviewerFeedback.content)) return 'needs-revision';
    if (isApprovedStatus(reviewerFeedback.status)) return 'approved';
    return 'in-review';
  }

  if (hasApprovedDocument(evidence)) return 'approved';
  if (evidence.length) return 'in-review';
  return 'pending';
}

function buildStages(data: StudentDashboardData): BuiltStage[] {
  const milestoneMap = new Map(data.milestones.map((item) => [normalizeText(item.title), item]));
  const workflowMap = new Map(data.dashboard?.workflow.map((item) => [normalizeText(item.title), item]) ?? []);
  const checkpointRecordMap = buildCheckpointRecordMap(data);
  const activeMilestone = normalizeText(data.project.currentMilestone);

  const rawStages = STAGE_BLUEPRINTS.map((stage, index) => {
    const milestone = milestoneMap.get(normalizeText(stage.title));
    const workflowStep = workflowMap.get(normalizeText(stage.title));
    const rawStatus =
      normalizeStageStatus(milestone?.status) ||
      normalizeStageStatus(workflowStep?.status) ||
      (activeMilestone && activeMilestone === normalizeText(stage.title) ? 'in-review' : null);
    const evidence = getStageDocuments(stage, data);
    const schedules = getStageSchedules(stage, data);
    const feedback = getStageFeedback(stage, data);
    const checkpointRecords = stage.checkpoints
      .map((checkpoint) => checkpointRecordMap.get(checkpoint.id))
      .filter((checkpoint): checkpoint is SavedCheckpoint => Boolean(checkpoint));
    const checkpoints = stage.checkpoints.map((checkpoint) =>
      getCheckpointStatus(checkpoint, stage, data, evidence, schedules, feedback, rawStatus, checkpointRecordMap.get(checkpoint.id))
    );
    const completedCheckpoints = checkpoints.filter((checkpoint) => checkpoint.status === 'completed').length;

    return {
      blueprint: stage,
      index,
      milestone,
      workflowStep,
      rawStatus,
      evidence,
      schedules,
      feedback,
      checkpointRecords,
      checkpoints,
      completedCheckpoints
    };
  });

  const explicitActiveIndex = rawStages.findIndex((stage) => stage.rawStatus === 'in-review' || stage.rawStatus === 'needs-revision');
  const currentIndex =
    explicitActiveIndex >= 0
      ? explicitActiveIndex
      : Math.max(
          0,
          rawStages.findIndex((stage) => stage.completedCheckpoints < stage.checkpoints.length && stage.rawStatus !== 'completed')
        );

  return rawStages.map((stage) => {
    const allCheckpointsComplete = stage.completedCheckpoints === stage.checkpoints.length;
    const hasRevision = stage.checkpoints.some((checkpoint) => checkpoint.status === 'needs-revision');
    const hasRejection = stage.checkpoints.some((checkpoint) => checkpoint.status === 'rejected');
    const hasReview = stage.checkpoints.some((checkpoint) => checkpoint.status === 'in-review');
    let status: StageStatus;

    if (stage.rawStatus === 'completed' || (stage.index < currentIndex && !hasRevision && !hasRejection)) {
      status = 'completed';
    } else if (stage.index > currentIndex) {
      status = 'locked';
    } else if (stage.rawStatus === 'rejected' || hasRejection) {
      status = 'rejected';
    } else if (stage.rawStatus === 'needs-revision' || hasRevision) {
      status = 'needs-revision';
    } else if (allCheckpointsComplete) {
      status = 'completed';
    } else if (stage.rawStatus === 'in-review' || hasReview || stage.completedCheckpoints > 0) {
      status = 'in-review';
    } else {
      status = 'pending';
    }

    const progress = allCheckpointsComplete
      ? 100
      : clampPercent((stage.completedCheckpoints / Math.max(stage.checkpoints.length, 1)) * 100);
    const latestCheckpointFeedback = [...stage.checkpointRecords]
      .filter((checkpoint) => checkpoint.latestFeedback)
      .sort((left, right) => new Date(right.latestFeedbackAt || right.reviewedAt || right.submittedAt || 0).getTime() - new Date(left.latestFeedbackAt || left.reviewedAt || left.submittedAt || 0).getTime())[0];

    const targetDateStr = stage.milestone?.dateLabel || stage.workflowStep?.dateLabel || stage.blueprint.defaultTarget;
    // Basic date parsing to check if overdue, ignoring placeholder text
    const parsedDate = new Date(targetDateStr);
    const isOverdue = status !== 'completed' && 
                      status !== 'locked' && 
                      !isNaN(parsedDate.getTime()) && 
                      parsedDate.getTime() < Date.now();

    return {
      id: stage.milestone?.id || stage.workflowStep?.id || `stage-${stage.blueprint.key}`,
      key: stage.blueprint.key,
      index: stage.index,
      title: stage.blueprint.title,
      summary: stage.milestone?.summary || stage.workflowStep?.summary || stage.blueprint.summary,
      targetDate: stage.milestone?.dateLabel || stage.workflowStep?.dateLabel || stage.blueprint.defaultTarget,
      route: stage.milestone?.route || stage.workflowStep?.route || stage.blueprint.route,
      actionLabel: stage.milestone?.actionLabel || stage.workflowStep?.actionLabel || stage.blueprint.actionLabel,
      icon: stage.blueprint.icon,
      status,
      progress,
      isOverdue,
      completedCheckpoints: stage.completedCheckpoints,
      checkpoints: status === 'locked'
        ? stage.checkpoints.map((checkpoint) => ({ ...checkpoint, status: 'locked' as const, note: 'Complete the previous stage to unlock this requirement.' }))
        : stage.checkpoints,
      evidence: stage.evidence,
      adviserReview: status === 'completed'
        ? 'approved'
        : getPersistedStageReviewStatus(stage.checkpointRecords, 'adviserReviewStatus') || getReviewStatus(stage.blueprint, stage.feedback, stage.evidence, 'adviser'),
      panelReview: status === 'completed'
        ? 'approved'
        : getPersistedStageReviewStatus(stage.checkpointRecords, 'panelReviewStatus') || getReviewStatus(stage.blueprint, stage.feedback, stage.evidence, 'panel'),
      latestFeedback: latestCheckpointFeedback
        ? {
            id: latestCheckpointFeedback.id,
            title: `Feedback on ${latestCheckpointFeedback.title}`,
            content: latestCheckpointFeedback.latestFeedback || '',
            facultyName: latestCheckpointFeedback.latestFeedbackBy || 'Faculty',
            mode: 'Checkpoint Review',
            status: latestCheckpointFeedback.status,
            dateLabel: formatSavedDate(latestCheckpointFeedback.latestFeedbackAt || latestCheckpointFeedback.reviewedAt)
          }
        : stage.feedback[0] || null
    };
  });
}

function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: BadgeTone; icon?: string }) {
  return (
    <span className={`milestone-status-badge is-${tone}`}>
      {icon ? <i className={`fas ${icon}`} aria-hidden="true" /> : null}
      {label}
    </span>
  );
}

// The checklist under each stage checkpoint. Wording follows the system's own
// rules rather than guesses:
// - checkpoint meaning: THESIS_MILESTONE_WORKFLOW in src/lib/milestone-checkpoint-tracking.ts
// - which upload completes which checkpoint: FIXED_CATEGORY_CHECKPOINT_KEYS /
//   CHECKPOINT_KEYWORD_RULES there, using the Submit Docs category names
// - title rules: src/lib/title-lock.ts (2 backup titles, locked after submit)
// - defense revisions: src/lib/compliance.ts (Proposal + Final defense only)
type CheckpointChecklist = {
  items: string[];
  where?: { label: string; href: string };
};

const SUBMIT_DOCS = '/students/submit';
const ORAL_DEFENSE_FORM = (stage: string) => [
  `Photo or scan of the signed Application for Oral Defense of Thesis (${stage})`,
  'Signed by the Research Head, Director, and Program Head',
  `Submitted under “Oral Defense Application Evidence (${stage})”`
];

const CHECKPOINT_CHECKLISTS: Record<string, CheckpointChecklist> = {
  // Concept
  'concept-title': {
    items: [
      'Proposed title and research type tag',
      'At least 2 backup titles',
      'Concept paper (PDF or DOCX, max 10MB)',
      'Submitted together for adviser review — the title locks after submission'
    ],
    where: { label: 'My Title', href: '/students/title-submission' }
  },
  'concept-adviser-approval': {
    items: ['Adviser reviews the title and concept paper', 'Marked “Ready for Concept Presentation”']
  },
  'concept-defense-application': { items: ORAL_DEFENSE_FORM('Concept'), where: { label: 'Submit Docs', href: SUBMIT_DOCS } },
  'concept-presentation-scheduled': {
    items: ['Requires the adviser-approved oral defense application', 'Program Head records the presentation schedule']
  },
  'concept-panel-approval': { items: ['Group presents the concept', 'Panel records its decision'] },

  // Proposal
  'proposal-chapters': {
    items: ['Proposal manuscript — Chapters 1 to 3', 'Submitted under “Proposal” or “Chapter 1” – “Chapter 3”'],
    where: { label: 'Submit Docs', href: SUBMIT_DOCS }
  },
  'proposal-adviser-review': { items: ['Adviser completes the first review of the proposal manuscript'] },
  'proposal-defense-application': { items: ORAL_DEFENSE_FORM('Proposal'), where: { label: 'Submit Docs', href: SUBMIT_DOCS } },
  'proposal-defense-scheduled': {
    items: ['Requires the adviser-approved oral defense application', 'Program Head records the defense schedule']
  },
  'proposal-panel-evaluation': { items: ['Group defends the proposal', 'Panel records its evaluation'] },
  'proposal-final-approval': {
    items: ['Panel-required revisions complied with in Defense Compliance', 'Proposal stage receives final clearance'],
    where: { label: 'Defense Compliance', href: '/students/compliance' }
  },

  // Development
  'development-prototype': {
    items: ['System / prototype build or implementation evidence', 'Submitted under “System Files”'],
    where: { label: 'Submit Docs', href: SUBMIT_DOCS }
  },
  'development-progress-report': {
    items: ['Development progress report'],
    where: { label: 'Progress Reports', href: '/students/progress-reports' }
  },
  'development-testing-evidence': {
    items: ['Testing or validation evidence (test results, screenshots)'],
    where: { label: 'Submit Docs', href: SUBMIT_DOCS }
  },
  'development-adviser-monitoring': { items: ['Adviser clears the development monitoring checkpoint'] },
  // Final Defense
  'final-manuscript': {
    items: ['Full manuscript — Chapters 1 to 5', 'Submitted under “Final Manuscript”', 'Final defense presentation slides — submitted under “Presentation”'],
    where: { label: 'Submit Docs', href: SUBMIT_DOCS }
  },
  'final-defense-application': { items: ORAL_DEFENSE_FORM('Final'), where: { label: 'Submit Docs', href: SUBMIT_DOCS } },
  'final-defense-scheduled': {
    items: ['Requires the adviser-approved oral defense application', 'Program Head records the defense schedule']
  },
  'final-panel-approval': { items: ['Group defends the final project', 'Panel records its approval'] },
  'final-revisions-submitted': {
    items: ['Revised final manuscript per the panel’s required revisions', 'Complied with in Defense Compliance and cleared'],
    where: { label: 'Defense Compliance', href: '/students/compliance' }
  },

  // Completion
  'completion-approved-manuscript': {
    items: ['Panel-approved final manuscript'],
    where: { label: 'Submit Docs', href: SUBMIT_DOCS }
  },
  'completion-approval-sheet': {
    items: ['Signed approval sheet'],
    where: { label: 'Submit Docs', href: SUBMIT_DOCS }
  },
  'completion-repository-submission': {
    items: ['Final research files submitted to the repository'],
    where: { label: 'Repository', href: '/students/repository' }
  },
  'completion-archive-confirmation': { items: ['Archive confirmation recorded for your project'] }
};

const CHECKPOINT_STATE_STYLE: Record<CheckpointStatus, { icon: string; dot: string; label: string; text: string }> = {
  completed: { icon: 'fa-check', dot: 'bg-emerald-500 text-white', label: 'Done', text: 'text-emerald-700' },
  'in-review': { icon: 'fa-hourglass-half', dot: 'bg-amber-400 text-white', label: 'In review', text: 'text-amber-700' },
  'needs-revision': { icon: 'fa-rotate-right', dot: 'bg-rose-500 text-white', label: 'Revise', text: 'text-rose-700' },
  rejected: { icon: 'fa-xmark', dot: 'bg-rose-500 text-white', label: 'Rejected', text: 'text-rose-700' },
  pending: { icon: 'fa-arrow-right', dot: 'bg-[var(--primary)] text-white ring-4 ring-[var(--primary-soft)]', label: 'Your turn', text: 'text-[var(--primary)]' },
  locked: { icon: 'fa-lock', dot: 'border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-meta)]', label: 'Locked', text: 'text-[var(--text-meta)]' }
};

const WAITING_STYLE = {
  icon: 'fa-hourglass-start',
  dot: 'border border-slate-300 bg-slate-100 text-slate-500',
  label: 'Waiting',
  text: 'text-slate-500'
};

function StageDetails({ stage }: { stage: BuiltStage }) {
  // Steps unlock in order: a step that hasn't started yet stays locked until
  // the one before it is done. Steps already submitted keep their real status.
  const rows = stage.checkpoints.map((checkpoint, index) => {
    const previous = stage.checkpoints[index - 1];
    const waitingOnPrevious =
      previous && previous.status !== 'completed' && (checkpoint.status === 'pending' || checkpoint.status === 'locked');

    return { checkpoint, displayStatus: (waitingOnPrevious ? 'locked' : checkpoint.status) as CheckpointStatus, previous };
  });

  return (
    <div className="grid grid-cols-1 gap-4 border-t border-[var(--border)] p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-widest text-[var(--primary)]">Stage Checkpoints</span>
          <span className="text-xs font-bold text-[var(--muted)]">{stage.completedCheckpoints}/{stage.checkpoints.length} done</span>
        </div>

        <ol className="flex flex-col">
          {rows.map(({ checkpoint, displayStatus, previous }, index) => {
            const owner = getCheckpointOwner(checkpoint.kind);
            // A faculty step that's due isn't the student's to-do: show it as
            // "Waiting" (neutral) instead of the navy "To do".
            const style = displayStatus === 'pending' && owner !== 'student' ? WAITING_STYLE : CHECKPOINT_STATE_STYLE[displayStatus];
            const checklist = CHECKPOINT_CHECKLISTS[checkpoint.id];
            const isActionable = owner === 'student' && (displayStatus === 'pending' || displayStatus === 'needs-revision');

            return (
              <li key={checkpoint.id} className="relative flex gap-3 pb-4 last:pb-0">
                {index < rows.length - 1 ? (
                  <span
                    className={`absolute left-[13px] top-7 bottom-0 w-0.5 ${displayStatus === 'completed' && rows[index + 1]?.displayStatus === 'completed' ? 'bg-emerald-300' : 'bg-[var(--border)]'}`}
                    aria-hidden="true"
                  />
                ) : null}
                <span className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] ${style.dot}`}>
                  <i className={`fas ${style.icon}`} aria-hidden="true" />
                </span>

                <div className={`min-w-0 flex-1 ${displayStatus === 'locked' ? 'opacity-60' : ''}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-[15px] font-bold text-[var(--text)]">{checkpoint.label}</strong>
                    <OwnerChip owner={owner} />
                    <span className={`ml-auto text-[11px] font-extrabold uppercase tracking-wide ${style.text}`}>{style.label}</span>
                  </div>

                  {displayStatus === 'locked' && previous ? (
                    <p className="mt-0.5 text-[13px] text-[var(--text-meta)]">Unlocks after “{previous.label}”.</p>
                  ) : null}

                  {/* Every checkpoint's checklist is always visible (locked ones
                      included) so students can see what's coming. */}
                  {checklist ? (
                    <ul className="mt-2 flex flex-col gap-1">
                      {checklist.items.map((requirement) => {
                        // Done = green check; submitted, waiting on review = amber clock.
                        // Student items are checkboxes; faculty items are plain bullets.
                        const icon =
                          displayStatus === 'completed'
                            ? 'fa-square-check text-emerald-600'
                            : displayStatus === 'in-review'
                              ? 'fa-clock text-amber-500'
                              : owner === 'student'
                                ? 'fa-square text-[var(--border-strong)]'
                                : 'fa-circle text-[5px] text-[var(--border-strong)]';

                        return (
                          <li key={requirement} className="flex items-start gap-2 text-[13px] text-[var(--muted)]">
                            <span className="mt-0.5 flex w-3 shrink-0 justify-center">
                              <i className={`fas ${icon}`} aria-hidden="true" />
                            </span>
                            {requirement}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}

                  {checklist?.where && owner === 'student' ? (
                    isActionable ? (
                      <Link
                        prefetch={false}
                        href={checklist.where.href}
                        className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-bold text-[var(--primary)] hover:underline"
                      >
                        {displayStatus === 'needs-revision' ? 'Upload revision' : 'Submit'} in {checklist.where.label}
                        <i className="fas fa-arrow-right text-[10px]" aria-hidden="true" />
                      </Link>
                    ) : (
                      <p className="mt-1.5 text-xs text-[var(--text-meta)]">
                        <i className="fas fa-location-dot mr-1" aria-hidden="true" />
                        {displayStatus === 'completed' || displayStatus === 'in-review' ? 'Submitted in' : 'Submit in'} {checklist.where.label}
                      </p>
                    )
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <aside className="flex flex-col gap-3">
        <div className="rounded-xl border border-[var(--border)] p-3">
          <span className="text-[11px] font-black uppercase tracking-widest text-[var(--primary)]">Reviews</span>
          <div className="mt-2 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-semibold text-[var(--text)]">Adviser</span>
              <Badge label={getReviewLabel(stage.adviserReview)} tone={getStatusTone(stage.adviserReview)} />
            </div>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-semibold text-[var(--text)]">Panel</span>
              <Badge label={getReviewLabel(stage.panelReview)} tone={getStatusTone(stage.panelReview)} />
            </div>
          </div>
        </div>

        {stage.latestFeedback ? (
          <Link
            prefetch={false}
            href="/students/faculty-feedback"
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-3 transition hover:border-[var(--primary)]/30"
          >
            <span className="text-[11px] font-black uppercase tracking-widest text-[var(--primary)]">Latest feedback</span>
            <p className="mt-1 line-clamp-2 text-xs text-[var(--text)]">{stage.latestFeedback.content}</p>
            <small className="mt-1 block text-[11px] text-[var(--text-meta)]">
              {stage.latestFeedback.facultyName} · {stage.latestFeedback.dateLabel}
            </small>
          </Link>
        ) : null}

        <Link
          prefetch={false}
          href="/students/project-files"
          className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2.5 text-xs font-bold text-[var(--text)] transition hover:border-[var(--primary)]/30 hover:text-[var(--primary)]"
        >
          <span className="flex items-center gap-2">
            <i className="fas fa-folder-open text-[var(--primary)]" aria-hidden="true" />
            {stage.evidence.length} file{stage.evidence.length === 1 ? '' : 's'} submitted for this stage
          </span>
          <i className="fas fa-arrow-right text-[10px]" aria-hidden="true" />
        </Link>
      </aside>
    </div>
  );
}

export function StudentTimeline({ data }: { data: StudentDashboardData }) {
  const stages = useMemo(() => buildStages(data), [data]);
  const activeStage =
    stages.find((stage) => stage.status === 'in-review' || stage.status === 'needs-revision' || stage.status === 'pending') ||
    [...stages].reverse().find((stage) => stage.status === 'completed') ||
    stages[0];
  const activeIndex = activeStage?.index ?? 0;
  const completedStages = stages.filter((stage) => stage.status === 'completed').length;
  
  // Pre-Final Defense was dropped from the workflow; its saved checkpoints
  // (keys starting with "mock-") no longer count toward progress.
  const workflowCheckpoints = (data.milestoneCheckpoints ?? []).filter((cp) => !cp.key.startsWith('mock-'));
  const totalCheckpoints = workflowCheckpoints.length;
  const completedCheckpoints = workflowCheckpoints.filter(cp => cp.status === 'COMPLETED').length;
  const calculatedProgress = totalCheckpoints > 0 
    ? Math.round((completedCheckpoints / totalCheckpoints) * 100)
    : clampPercent((completedStages / Math.max(stages.length, 1)) * 100);
    
  // The stored percentage still counts Pre-Final, so prefer our own figure when checkpoints exist.
  const overallProgress = totalCheckpoints > 0 ? calculatedProgress : data.project.progressPercentage || calculatedProgress;
  const [expandedStages, setExpandedStages] = useState<Set<string>>(() => new Set(activeStage ? [activeStage.key] : ['concept']));
  const [viewMode, setViewMode] = useState<'roadmap' | 'gantt'>('roadmap');
  const [targetDatesOverrides, setTargetDatesOverrides] = useState<Record<string, string>>({});
  const [startDatesOverrides, setStartDatesOverrides] = useState<Record<string, string>>({});
  // First unfinished checkpoint in the current stage, and who has to act on it.
  const nextCheckpoint = activeStage?.checkpoints.find((checkpoint) => checkpoint.status !== 'completed') ?? null;
  const nextOwner = nextCheckpoint ? getCheckpointOwner(nextCheckpoint.kind) : null;
  // Placeholder labels like "No date" / "Target set by adviser" aren't worth showing.
  const hasTargetDate = Boolean(activeStage?.targetDate && /\d/.test(activeStage.targetDate));

  // One reminder for the current stage: is anything on the student right now?
  const reminder = (() => {
    if (!activeStage) return null;

    if (!nextCheckpoint) {
      return {
        title: 'Stage complete',
        message: `Every ${activeStage.title} checkpoint is done.`,
        icon: 'fa-circle-check',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        iconClassName: 'bg-emerald-100 text-emerald-700',
        link: null
      };
    }

    const checklist = CHECKPOINT_CHECKLISTS[nextCheckpoint.id];
    const where = checklist?.where ?? null;

    if (nextOwner === 'student' && nextCheckpoint.status === 'needs-revision') {
      return {
        title: 'Revision needed',
        message: `“${nextCheckpoint.label}” was sent back. Check the feedback and upload a revised version.`,
        icon: 'fa-rotate-right',
        className: 'border-rose-200 bg-rose-50 text-rose-700',
        iconClassName: 'bg-rose-100 text-rose-700',
        link: where ? { href: where.href, label: `Upload in ${where.label}` } : null
      };
    }

    if (nextOwner === 'student' && nextCheckpoint.status === 'in-review') {
      return {
        title: 'Waiting for review',
        message: `You submitted “${nextCheckpoint.label}”${nextCheckpoint.submittedAt ? ` on ${formatSavedDate(nextCheckpoint.submittedAt)}` : ''}. Nothing to do until it’s reviewed.`,
        icon: 'fa-hourglass-half',
        className: 'border-amber-200 bg-amber-50 text-amber-700',
        iconClassName: 'bg-amber-100 text-amber-700',
        link: null
      };
    }

    if (nextOwner === 'student') {
      return {
        title: 'Your turn',
        message: checklist ? `Submit: ${checklist.items[0]}.` : nextCheckpoint.label,
        icon: 'fa-bell',
        className: 'border-[var(--primary)]/25 bg-[var(--primary-soft)] text-[var(--primary)]',
        iconClassName: 'bg-[var(--primary)] text-white',
        link: where ? { href: where.href, label: `Go to ${where.label}` } : null
      };
    }

    return {
      title: `Waiting on the ${OWNER_META[nextOwner!].label}`,
      message: `${nextCheckpoint.label} — nothing for you to do right now.`,
      icon: 'fa-hourglass-start',
      className: 'border-slate-200 bg-slate-50 text-slate-600',
      iconClassName: 'bg-slate-200 text-slate-600',
      link: null
    };
  })();

  const handleUpdateTargetDate = async (checkpointId: string, recordId: string | undefined, dateValue: string) => {
    if (!recordId) {
      alert("This checkpoint has not been initialized in the database yet.");
      return;
    }
    
    setTargetDatesOverrides(prev => ({ ...prev, [checkpointId]: dateValue }));
    
    try {
      const res = await fetch('/api/checkpoints/target-date', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkpointId: recordId, targetDate: dateValue || null })
      });
      if (!res.ok) throw new Error("Failed to save date");
    } catch (error) {
      alert("Failed to save target date. Please try again.");
    }
  };

  const handleUpdateStartDate = async (checkpointId: string, recordId: string | undefined, dateValue: string) => {
    if (!recordId) {
      alert("This checkpoint has not been initialized in the database yet.");
      return;
    }
    
    setStartDatesOverrides(prev => ({ ...prev, [checkpointId]: dateValue }));
    
    try {
      const res = await fetch('/api/checkpoints/target-date', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkpointId: recordId, startDate: dateValue || null })
      });
      if (!res.ok) throw new Error("Failed to save date");
    } catch (error) {
      alert("Failed to save start date. Please try again.");
    }
  };

  const toggleStage = (stageKey: string) => {
    setExpandedStages((current) => {
      const next = new Set(current);
      if (next.has(stageKey)) {
        next.delete(stageKey);
      } else {
        next.add(stageKey);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedStages((current) =>
      current.size === stages.length ? new Set([activeStage?.key ?? 'concept']) : new Set(stages.map((stage) => stage.key))
    );
  };

  // Calculate dynamic target weeks
  const projectStart = new Date(data.project?.created_at || new Date());
  const projectStartMs = projectStart.getTime();
  let maxWeekOffset = 4; // minimum 1 month

  const checkpointSpans: Record<string, { start: number, end: number }> = {};

  stages.forEach((stage, sIndex) => {
    stage.checkpoints.forEach((cp, cpIndex) => {
      let effectiveEndDateStr = targetDatesOverrides[cp.id] !== undefined ? targetDatesOverrides[cp.id] : cp.studentTargetDate;
      let effectiveStartDateStr = startDatesOverrides[cp.id] !== undefined ? startDatesOverrides[cp.id] : (cp as any).studentStartDate;
      
      // Fallback: Use actual action dates if student hasn't explicitly set target dates
      if (!effectiveStartDateStr && cp.submittedAt) {
        effectiveStartDateStr = cp.submittedAt;
      }
      
      if (!effectiveEndDateStr) {
        if (cp.status === 'completed' && cp.completedAt) {
          effectiveEndDateStr = cp.completedAt;
        } else if ((cp.status === 'in-review' || cp.status === 'needs-revision' || cp.status === 'rejected') && cp.reviewedAt) {
          effectiveEndDateStr = cp.reviewedAt;
        } else if (cp.submittedAt) {
          effectiveEndDateStr = cp.submittedAt;
        }
      }
      
      if (!effectiveStartDateStr && effectiveEndDateStr) {
        effectiveStartDateStr = effectiveEndDateStr;
      }
      
      let startWeek = -1;
      let endWeek = -1;

      if (effectiveStartDateStr) {
        startWeek = Math.max(0, Math.ceil((new Date(effectiveStartDateStr).getTime() - projectStartMs) / (1000 * 60 * 60 * 24 * 7)));
      }
      
      if (effectiveEndDateStr) {
        endWeek = Math.max(0, Math.ceil((new Date(effectiveEndDateStr).getTime() - projectStartMs) / (1000 * 60 * 60 * 24 * 7)));
      }
      
      if (startWeek !== -1 || endWeek !== -1) {
        if (startWeek === -1) startWeek = endWeek;
        if (endWeek === -1) endWeek = startWeek;

        if (endWeek > maxWeekOffset) maxWeekOffset = endWeek;
        
        checkpointSpans[cp.id] = {
          start: startWeek,
          end: endWeek
        };
      }
    });
  });

  // Ensure we always have full months (blocks of 4 weeks)
  const totalColumns = Math.ceil((maxWeekOffset + 2) / 4) * 4;
  
  // Calculate current week for the "Today" vertical line
  const currentWeekIndex = Math.max(0, Math.ceil((Date.now() - projectStartMs) / (1000 * 60 * 60 * 24 * 7)));

  return (
    <div className="student-milestones-page">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .milestones-gantt-container, .milestones-gantt-container * {
            visibility: visible;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .milestones-gantt-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .gantt-waterfall-grid {
            border: 2px solid #475569 !important;
            box-shadow: none !important;
            width: 100% !important;
            grid-template-columns: 180px 65px 105px 105px repeat(${totalColumns}, minmax(15px, 1fr)) !important;
          }
          .gantt-waterfall-grid div {
            border-color: #475569 !important;
          }
          .gantt-waterfall-grid div[style*="border-bottom"],
          .gantt-waterfall-grid div[style*="borderBottom"] {
            border-bottom: 1pt solid #475569 !important;
          }
          .gantt-waterfall-grid div[style*="border-right"],
          .gantt-waterfall-grid div[style*="borderRight"] {
            border-right: 1pt solid #475569 !important;
          }
          .gantt-waterfall-grid * {
            font-size: 0.65rem !important;
          }
          .gantt-waterfall-grid .premium-date-picker {
            font-size: 0.55rem !important;
            padding: 0 !important;
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
            color: black !important;
          }
          .gantt-waterfall-grid .premium-date-picker::-webkit-calendar-picker-indicator {
            display: none !important;
          }
          .today-highlight-cell {
            background: transparent !important;
            border-left: none !important;
            border-right: 1px dashed #475569 !important;
          }
          @page {
            size: landscape;
            margin: 0.5cm;
          }
        }
        
        /* Premium Gantt Chart Enhancements */
        .gantt-bar-segment {
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease, filter 0.2s;
        }
        .gantt-bar-segment:hover {
          filter: brightness(1.15);
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
          z-index: 10;
          position: relative;
        }
        .premium-date-picker {
          width: 100%;
          box-sizing: border-box;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 6px;
          padding: 3px 4px;
          color: var(--foreground);
          font-weight: 500;
          transition: all 0.2s ease;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.02);
        }
        .premium-date-picker:hover, .premium-date-picker:focus {
          background: white;
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
          outline: none;
        }
        .today-highlight-cell {
          background: linear-gradient(180deg, rgba(59, 130, 246, 0.02) 0%, rgba(59, 130, 246, 0.06) 100%) !important;
          border-left: 1px solid rgba(59, 130, 246, 0.3) !important;
          border-right: 1px solid rgba(59, 130, 246, 0.3) !important;
        }
      ` }} />
      <div className="milestones-workflow-shell">
        {/* One "where am I" card: replaces the intro text, six metric cards and
            the spotlight, which all repeated the current/next stage and progress. */}
        <section
          className="rounded-2xl border border-[var(--border)] border-t-[3px] border-t-[var(--primary)] bg-[var(--surface)] p-5 shadow-sm"
          aria-label="Current project stage"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-widest text-[var(--text-meta)]">
                Current stage · {activeStage ? `Stage ${activeStage.index + 1} of ${stages.length}` : 'Not started'}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-black tracking-tight text-[var(--text)]">{activeStage?.title ?? 'No active stage yet'}</h2>
                {activeStage ? (
                  <Badge label={formatStageStatus(activeStage.status)} tone={getStatusTone(activeStage.status)} />
                ) : null}
              </div>
            </div>

            {activeStage ? (
              <div className="w-full max-w-xs shrink-0 sm:w-64">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--muted)]">
                    {activeStage.completedCheckpoints} of {activeStage.checkpoints.length} checkpoints
                  </span>
                  <strong className="text-[var(--text)]">{activeStage.progress}%</strong>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-alt)]">
                  <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${activeStage.progress}%` }} />
                </div>
                {hasTargetDate ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--muted)]">
                    <i className="fas fa-flag text-[var(--text-meta)]" aria-hidden="true" />
                    Target <strong className="text-[var(--text)]">{activeStage.targetDate}</strong>
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Reminder: one line telling the student whether anything is on them. */}
          {reminder ? (
            <div className={`mt-4 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${reminder.className}`} role="status">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${reminder.iconClassName}`}>
                <i className={`fas ${reminder.icon}`} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black uppercase tracking-widest">{reminder.title}</p>
                <p className="text-sm text-[var(--text)]">{reminder.message}</p>
              </div>
              {reminder.link ? (
                <Link
                  prefetch={false}
                  href={reminder.link.href}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-bold text-white transition hover:brightness-110"
                >
                  {reminder.link.label}
                  <i className="fas fa-arrow-right text-[10px]" aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          ) : null}

          {/* All stages at a glance, plus overall progress. */}
          <div className="mt-5 border-t border-[var(--border)] pt-4">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-widest text-[var(--text-meta)]">All stages</span>
              <span className="font-semibold text-[var(--muted)]">
                Overall <strong className="text-[var(--text)]">{overallProgress}%</strong> · {completedStages} of {stages.length} stages complete
              </span>
            </div>
            {/* Stages grouped by capstone term. */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr_3fr]">
              {CAPSTONE_GROUPS.map((group) => (
                <div key={group.id}>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--text-meta)]">
                    {group.label} <span className="font-semibold normal-case tracking-normal">· {group.term}</span>
                  </p>
                  <ol className={`grid gap-2 ${group.stageKeys.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                    {stages
                      .filter((stage) => group.stageKeys.includes(stage.key))
                      .map((stage) => {
                        const isCurrent = stage.key === activeStage?.key;
                        const tone =
                          stage.status === 'completed'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : isCurrent
                              ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]'
                              : stage.status === 'needs-revision' || stage.status === 'rejected'
                                ? 'border-rose-200 bg-rose-50 text-rose-700'
                                : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-meta)]';

                        return (
                          <li key={stage.key} className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${tone}`}>
                            <i
                              className={`fas ${stage.status === 'completed' ? 'fa-circle-check' : stage.status === 'locked' ? 'fa-lock' : stage.icon} text-xs`}
                              aria-hidden="true"
                            />
                            <span className="min-w-0 truncate text-xs font-bold">{stage.title}</span>
                          </li>
                        );
                      })}
                  </ol>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="milestones-roadmap-card" aria-label="Project stages roadmap">
          <div className="milestones-card-head">
            <div>
              <span className="milestone-section-kicker">Project Stages Roadmap</span>
              <h3>Academic stages from concept to completion</h3>
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="mr-1 font-semibold text-[var(--muted)]">Who acts on each step:</span>
                {(Object.keys(OWNER_META) as CheckpointOwner[]).map((owner) => (
                  <OwnerChip key={owner} owner={owner} />
                ))}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              {viewMode === 'gantt' && (
                <button 
                  type="button" 
                  onClick={() => window.print()}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    background: 'white', border: '1px solid var(--border)',
                    padding: '0.5rem 1rem', borderRadius: '6px',
                    fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                    color: 'var(--foreground)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-alt)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                >
                  <i className="fas fa-file-pdf" aria-hidden="true" style={{ color: 'var(--danger)' }} />
                  Export PDF
                </button>
              )}
              <div className="milestones-view-toggles">
                <button className={viewMode === 'roadmap' ? 'is-active' : ''} type="button" onClick={() => setViewMode('roadmap')}>
                  <i className="fas fa-list-ul" aria-hidden="true" /> List
                </button>
                <button className={viewMode === 'gantt' ? 'is-active' : ''} type="button" onClick={() => setViewMode('gantt')}>
                  <i className="fas fa-chart-gantt" aria-hidden="true" /> Gantt
                </button>
              </div>
            </div>
          </div>

          {viewMode === 'roadmap' ? (
            <div className="milestones-roadmap-list">
              {stages.map((stage) => {
                const expanded = expandedStages.has(stage.key);
                const isActive = stage.index === activeIndex && stage.status !== 'completed';
                // Label the first stage of each capstone term.
                const groupStart = CAPSTONE_GROUPS.find((group) => group.stageKeys[0] === stage.key);
                return (
                  <Fragment key={stage.key}>
                  {groupStart ? (
                    <div className="flex items-baseline gap-2 pb-1 pt-2 first:pt-0">
                      <span className="text-[11px] font-black uppercase tracking-widest text-[var(--primary)]">{groupStart.label}</span>
                      <span className="text-xs font-semibold text-[var(--muted)]">{groupStart.term}</span>
                    </div>
                  ) : null}
                  <article className={`milestone-roadmap-item is-${stage.status}${isActive ? ' is-active' : ''}`}>
                    <div className="milestone-roadmap-line" aria-hidden="true">
                      <span className="milestone-roadmap-node">
                        <i className={`fas ${stage.status === 'completed' ? 'fa-check' : stage.status === 'locked' ? 'fa-lock' : stage.icon}`} />
                      </span>
                    </div>

                    <div className="milestone-roadmap-panel">
                      <button
                        className="milestone-stage-summary"
                        type="button"
                        aria-expanded={expanded}
                        onClick={() => toggleStage(stage.key)}
                      >
                        <span className="milestone-stage-copy">
                          <span className="milestone-stage-number">Stage {stage.index + 1}</span>
                          <strong>{stage.title}</strong>
                          <small>{stage.summary}</small>
                        </span>
                        <span className="milestone-stage-meta">
                          <Badge
                            label={formatStageStatus(stage.status)}
                            tone={getStatusTone(stage.status)}
                            icon={stage.status === 'locked' ? 'fa-lock' : undefined}
                          />
                          <span className="milestone-stage-target">
                            <span>Target date</span>
                            <strong>{stage.targetDate}</strong>
                          </span>
                          <i className={`fas ${expanded ? 'fa-chevron-up' : 'fa-chevron-down'} milestone-stage-chevron`} aria-hidden="true" />
                        </span>
                      </button>

                      {expanded ? <StageDetails stage={stage} /> : null}
                    </div>
                  </article>
                  </Fragment>
                );
              })}
            </div>
          ) : (
            <div className="milestones-gantt-container" style={{ overflowX: 'auto', paddingBottom: '1rem', margin: '0 -1.5rem', padding: '0 1.5rem 1.5rem 1.5rem' }}>
              <div 
                className="gantt-waterfall-grid" 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: `250px 80px 135px 135px repeat(${totalColumns}, minmax(40px, 1fr))`,
                  minWidth: 'max-content',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  background: 'var(--card)',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                }}
              >
                {(() => {
                  return (
                    <div style={{ display: 'contents' }}>
                      {/* Left Pane Headers spanning 2 rows */}
                      <div style={{ gridRow: 'span 2', padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid var(--border)', borderRight: '1px solid var(--border)', background: 'var(--surface-alt)', position: 'sticky', left: 0, zIndex: 20, display: 'flex', alignItems: 'center' }}>TASK</div>
                      <div style={{ gridRow: 'span 2', padding: '0.75rem', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid var(--border)', borderRight: '1px solid var(--border)', background: 'var(--surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>PROGRESS</div>
                      <div style={{ gridRow: 'span 2', padding: '0.75rem', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid var(--border)', borderRight: '1px solid var(--border)', background: 'var(--surface-alt)', display: 'flex', alignItems: 'center' }}>START DATE</div>
                      <div style={{ gridRow: 'span 2', padding: '0.75rem', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid var(--border)', borderRight: '2px solid var(--border)', background: 'var(--surface-alt)', display: 'flex', alignItems: 'center' }}>TARGET DATE</div>
                      
                      {/* Timeline Headers: Months (Row 1) */}
                      {Array.from({ length: Math.ceil(totalColumns / 4) }).map((_, i) => {
                        const weeksInMonth = Math.min(4, totalColumns - (i * 4));
                        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                        // Anchor the Gantt chart from the month the project actually started
                        const projectStartMonth = new Date(data.project?.created_at || new Date()).getMonth();
                        const displayMonth = monthNames[(projectStartMonth + i) % 12];
                        
                        return (
                          <div key={`month-${i}`} style={{
                            gridColumn: `span ${weeksInMonth}`,
                            padding: '0.5rem',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            borderBottom: '1px solid var(--border)',
                            borderRight: '1px solid var(--border)',
                            background: 'var(--surface-alt)',
                            textAlign: 'center',
                            color: 'var(--foreground)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            {displayMonth}
                          </div>
                        );
                      })}

                      {/* Timeline Headers: Weeks (Row 2) */}
                      {Array.from({ length: totalColumns }).map((_, i) => (
                        <div key={`week-${i}`} style={{
                          padding: '0.5rem 0',
                          fontWeight: 600,
                          fontSize: '0.7rem',
                          borderBottom: '2px solid var(--border)',
                          borderRight: '1px dashed var(--border)',
                          background: 'var(--surface-alt)',
                          textAlign: 'center',
                          color: 'var(--muted-foreground)'
                        }}>
                          W{(i % 4) + 1}
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {(() => {
                   let currentWeekOffset = 0;
                   
                   return stages.map((stage) => {
                     const stageDuration = stage.checkpoints.length;
                     
                     // Stage Row (Group Header)
                     const stageRow = (
                       <div style={{ display: 'contents' }} key={`row-${stage.id}`}>
                         <div style={{ 
                           padding: '0.6rem 1rem', 
                           fontWeight: 700, 
                           fontSize: '0.85rem',
                           background: 'rgba(59, 130, 246, 0.08)',
                           borderBottom: '1px solid var(--border)',
                           borderRight: '1px solid var(--border)',
                           position: 'sticky',
                           left: 0,
                           zIndex: 10,
                           display: 'flex',
                           alignItems: 'center',
                           gap: '0.6rem',
                           color: 'var(--foreground)'
                         }}>
                           <i className={`fas ${stage.icon}`} style={{ color: 'var(--primary)', width: '16px', textAlign: 'center' }} />
                           {stage.title}
                         </div>
                         <div style={{ padding: '0.6rem', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', background: 'rgba(59, 130, 246, 0.08)', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>
                           {stage.progress}%
                         </div>
                         <div style={{ padding: '0.6rem', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', background: 'rgba(59, 130, 246, 0.08)' }}></div>
                         <div style={{ padding: '0.6rem', borderBottom: '1px solid var(--border)', borderRight: '2px solid var(--border)', background: 'rgba(59, 130, 246, 0.08)', fontSize: '0.75rem', color: stage.isOverdue ? 'var(--danger)' : 'var(--muted-foreground)', fontWeight: stage.isOverdue ? 700 : 500 }}>
                           {stage.isOverdue ? 'OVERDUE' : stage.targetDate}
                         </div>
                         <div style={{ 
                           gridColumn: `span ${totalColumns}`, 
                           background: 'rgba(59, 130, 246, 0.03)', 
                           borderBottom: '1px solid var(--border)' 
                         }}></div>
                       </div>
                     );

                     const checkpointRows = stage.checkpoints.map((cp) => {
                       const effectiveEndDateStr = targetDatesOverrides[cp.id] !== undefined ? targetDatesOverrides[cp.id] : cp.studentTargetDate;
                       const effectiveStartDateStr = startDatesOverrides[cp.id] !== undefined ? startDatesOverrides[cp.id] : (cp as any).studentStartDate;

                       return (
                         <div style={{ display: 'contents' }} key={`row-cp-${cp.id}`}>
                           <div style={{ 
                             padding: '0.5rem 1rem 0.5rem 2.2rem', 
                             fontSize: '0.8rem',
                             background: 'var(--surface)',
                             borderBottom: '1px solid var(--border)',
                             borderRight: '1px solid var(--border)',
                             position: 'sticky',
                             left: 0,
                             zIndex: 10,
                             display: 'flex',
                             alignItems: 'center',
                             gap: '0.5rem',
                             color: cp.status === 'completed' ? 'var(--foreground)' : 'var(--muted-foreground)'
                           }}>
                             <i className={`fas ${cp.status === 'completed' ? 'fa-check' : cp.status === 'locked' ? 'fa-lock' : 'fa-circle'}`} style={{ fontSize: '0.5rem', opacity: 0.7 }} />
                             {cp.label}
                           </div>
                           <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', background: 'var(--surface)', textAlign: 'center', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                             {cp.status === 'completed' ? '100%' : '0%'}
                           </div>
                           <div style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                             <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                               {STUDENT_TASK_KINDS.has(cp.kind) ? (
                                 <input 
                                   type="date" 
                                   className="premium-date-picker"
                                   value={effectiveStartDateStr ? new Date(effectiveStartDateStr).toISOString().split('T')[0] : ''}
                                   onChange={(e) => handleUpdateStartDate(cp.id, cp.recordId, e.target.value)}
                                   style={{ fontSize: '0.65rem', width: '100%', boxSizing: 'border-box' }}
                                   disabled={cp.status === 'completed' || cp.status === 'locked'}
                                 />
                               ) : (
                                 <span style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)', opacity: 0.7, padding: '4px', userSelect: 'none' }}>-</span>
                               )}
                             </div>
                           </div>
                           <div style={{ padding: '0.3rem 0.5rem', borderBottom: '1px solid var(--border)', borderRight: '2px solid var(--border)', background: 'var(--surface)', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                             <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                               {STUDENT_TASK_KINDS.has(cp.kind) ? (
                                 <input 
                                   type="date" 
                                   className="premium-date-picker"
                                   value={effectiveEndDateStr ? new Date(effectiveEndDateStr).toISOString().split('T')[0] : ''}
                                   onChange={(e) => handleUpdateTargetDate(cp.id, cp.recordId, e.target.value)}
                                   style={{ fontSize: '0.7rem' }}
                                   disabled={cp.status === 'completed' || cp.status === 'locked'}
                                 />
                               ) : (
                                 <span style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)', opacity: 0.7, padding: '4px', userSelect: 'none' }}>
                                   {effectiveEndDateStr ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(effectiveEndDateStr)) : (SCHEDULE_CHECKPOINT_KINDS.has(cp.kind as any) ? 'Dept. Chair Action' : 'Faculty Action')}
                                 </span>
                               )}
                             </div>
                           </div>
                           {Array.from({ length: totalColumns }).map((_, colIndex) => {
                              const span = checkpointSpans[cp.id];
                              let isTargetCell = false;
                              let isFirstCell = false;
                              let isLastCell = false;
                              
                              if (span) {
                                const blocksToFill = Math.max(1, span.end - span.start);
                                isTargetCell = colIndex >= span.start && colIndex < span.start + blocksToFill;
                                isFirstCell = isTargetCell && colIndex === span.start;
                                isLastCell = isTargetCell && colIndex === span.start + blocksToFill - 1;
                              }
                              
                              const isToday = colIndex === currentWeekIndex;
                              let bgColor = 'var(--primary)';
                              let statusText = 'Pending';
                              
                              if (cp.status === 'completed') {
                                bgColor = 'var(--success)';
                                statusText = 'Completed';
                              } else if (cp.status === 'in-review') {
                                bgColor = 'var(--warning)';
                                statusText = 'In Review';
                              } else if (cp.status === 'needs-revision') {
                                bgColor = '#F97316'; // Orange-500 instead of Red
                                statusText = 'Needs Revision';
                              } else if (cp.status === 'rejected') {
                                bgColor = 'var(--danger)'; // Red for rejected
                                statusText = 'Rejected';
                              } else if (cp.status === 'locked') {
                                statusText = 'Locked';
                              }
                              
                              const tooltipText = `${cp.label}: ${statusText}`;
                              
                              return (
                                <div key={`cell-${colIndex}`} className={isToday ? 'today-highlight-cell' : ''} style={{ 
                                  borderBottom: '1px solid var(--border)', 
                                  borderRight: '1px dashed var(--border)',
                                  background: isToday ? 'transparent' : 'var(--surface)',
                                  padding: '4px 0' // Add padding so it looks like a sleek horizontal bar
                                }}>
                                  {isTargetCell && (
                                    <div className="gantt-bar-segment" title={tooltipText} style={{ 
                                      height: '100%', 
                                      width: '100%', 
                                      background: bgColor,
                                      minHeight: '20px',
                                      opacity: cp.status === 'locked' ? 0.3 : 1,
                                      borderTopLeftRadius: isFirstCell ? '6px' : '0',
                                      borderBottomLeftRadius: isFirstCell ? '6px' : '0',
                                      borderTopRightRadius: isLastCell ? '6px' : '0',
                                      borderBottomRightRadius: isLastCell ? '6px' : '0',
                                      boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.2)'
                                    }} />
                                  )}
                                </div>
                              );
                            })}
                         </div>
                       );
                     });

                     currentWeekOffset += stageDuration;
                     return [stageRow, ...checkpointRows];
                   });
                })()}
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
