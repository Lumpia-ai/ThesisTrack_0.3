import type { DocumentFileSummary } from '@/components/documents/document-file-controls';
import { ACHIEVEMENT_DOCUMENT_CATEGORIES } from '@/lib/storage/upload-config';
import { ADVISER_REVISE_LABEL, getAdviserClearedLabel } from '@/lib/stage-labels';

export function getReviewReferenceDate() {
  return new Date().toISOString();
}

export type SubmissionStatus = 'pending-review' | 'under-review' | 'needs-revision' | 'approved';
export type SubmissionType = 'Title' | 'Concept' | 'Proposal' | 'Chapter' | 'Development' | 'Pre-Final' | 'Final' | 'Evidence' | 'Backup';
export type SubmissionMilestone =
  | 'Title Screening'
  | 'Concept Paper Review'
  | 'Proposal Screening'
  | 'Development Check'
  | 'Pre-Final Defense Check'
  | 'Chapter 1 Review'
  | 'Chapter 3 Review'
  | 'Final Manuscript Check'
  | 'Defense Clearance'
  | 'Backup Title';
export type SubmissionSortOption = 'deadline' | 'submitted' | 'status' | 'version';
export type CommentCategory = 'General' | 'Formatting' | 'Technical' | 'Methodology' | 'Approved Remark';

export type AdviserSubmissionComment = {
  id: string;
  category: CommentCategory;
  body: string;
  authorId?: string | null;
  authorName: string;
  version: string;
  createdAt: string;
};

export type AdviserSubmissionVersion = {
  id: string;
  version: string;
  label: string;
  uploadedAt: string;
  uploader: string;
  isCurrent: boolean;
};

export type AdviserSubmissionTimelineEvent = {
  id: string;
  label: string;
  actor: string;
  occurredAt: string;
  isComplete: boolean;
};

export type AdviserSubmissionRecord = {
  id: string;
  groupId: string;
  projectTitle: string;
  submissionTitle: string;
  type: SubmissionType;
  milestone: SubmissionMilestone;
  status: SubmissionStatus;
  statusLabel: string;
  version: string;
  currentVersionNumber: number;
  submittedAt: string;
  deadline: string | null;
  submittedBy?: string;
  groupMembers?: Array<{
    userId?: string;
    name: string;
    role: string;
    isLeader: boolean;
  }>;
  latestReviewComment?: {
    id: string;
    body: string;
    decision: string;
    createdAt: string | Date;
    authorName?: string | null;
    authorId?: string | null;
  } | null;
  reviewedAt?: string | null;
  reviewFocus: string;
  nextAction: string;
  fileUrl: string;
  fileType: string;
  fileExtension: string;
  // The real uploaded_files id backing this card's file, for preview/signed-url
  // calls. Null when there's genuinely nothing uploaded yet. Distinct from `id`
  // above, which for Title/Evidence records is a synthetic composite key, not
  // a real file id.
  previewFileId: string | null;
  // Every file behind this card, in order — a multi-photo evidence batch or a
  // multi-file title submission has more than one, so the details modal can
  // step through them instead of only ever showing the first.
  previewFiles: Array<{ id: string; name: string; fileType?: string }>;
  documentCategory: string;
  // Not IT-only — see src/lib/landing/departments-data.ts. Not currently sourced
  // from real data (DocumentFileSummary has no department field yet) or displayed
  // anywhere on this page, but the type shouldn't force it to a single value.
  department: string;
  uploadedBy?: string;
  approvedAt?: string;
  workspaceHref: string;
  deadlineProgress: number;
  workflowStepIndex: number;
  commentCategories: CommentCategory[];
  comments: AdviserSubmissionComment[];
  versionHistory: AdviserSubmissionVersion[];
  timeline: AdviserSubmissionTimelineEvent[];
};

export const IT_REVIEW_CHECKLIST = [
  'Confirm correct document version',
  'Verify previous comments are addressed',
  'Check completeness of sections',
  'Provide clear feedback',
  'Approve only when ready'
] as const;

export const REVIEW_WORKFLOW_STEPS = [
  { id: 'submitted', label: 'Submitted', icon: 'fa-check' },
  { id: 'under-review', label: 'Under Review', icon: 'fa-magnifying-glass' },
  { id: 'revision-requested', label: 'Revision Requested', icon: 'fa-rotate-left' },
  { id: 'resubmitted', label: 'Resubmitted', icon: 'fa-file-circle-plus' },
  { id: 'approved', label: 'Cleared by Adviser', icon: 'fa-circle-check' }
] as const;

export const SUBMISSION_SORT_OPTIONS: ReadonlyArray<{ value: SubmissionSortOption; label: string }> = [
  { value: 'deadline', label: 'Review Order' },
  { value: 'submitted', label: 'Recently Submitted' },
  { value: 'status', label: 'Review Priority' },
  { value: 'version', label: 'Current Version' }
];

const TITLE_SUBMISSION_CATEGORY_PATTERNS = [
  'title proposal',
  'title submission',
  'title approval',
  'proposed title'
];

const submissionStatusMeta: Record<
  SubmissionStatus,
  {
    label: string;
    badgeClassName: string;
    actionLabel: string;
    tone: 'orange' | 'blue' | 'red' | 'green';
  }
> = {
  'pending-review': {
    label: 'Pending Review',
    badgeClassName: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200',
    actionLabel: 'Still Reviewing',
    tone: 'orange'
  },
  'under-review': {
    label: 'Under Review',
    badgeClassName: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200',
    actionLabel: 'Continue Review',
    tone: 'orange'
  },
  'needs-revision': {
    label: 'Revision Requested',
    badgeClassName: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
    actionLabel: 'Await Resubmission',
    tone: 'red'
  },
  approved: {
    label: 'Cleared by Adviser',
    badgeClassName: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
    actionLabel: 'View Summary',
    tone: 'green'
  }
};

const statusFilterOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'pending-review', label: 'Pending Review' },
  { value: 'under-review', label: 'Under Review' },
  { value: 'needs-revision', label: 'Needs Revision' },
  { value: 'approved', label: 'Cleared by Adviser' }
] as const;

const dayInMilliseconds = 1000 * 60 * 60 * 24;

function startOfUtcDay(value: string) {
  const date = new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function addDays(value: string | Date, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function asIsoString(value: string | Date | null | undefined) {
  return value ? new Date(value).toISOString() : null;
}

export function getFileExtension(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() || 'doc';
}

export function isTitleSubmissionFile(file: Pick<DocumentFileSummary, 'documentCategory' | 'fileName'>) {
  const category = String(file.documentCategory || '').trim().toLowerCase();
  const fileName = String(file.fileName || '').trim().toLowerCase();

  return TITLE_SUBMISSION_CATEGORY_PATTERNS.some((pattern) => category.includes(pattern))
    || (category === 'proposal' && fileName.includes('title'));
}

// Every stage's oral defense application evidence photo has its own independent
// review flow on Title & Evidence Approval (separate from that stage's other
// decisions) — none of them should also show up as a generic pending document here.
const DEFENSE_APPLICATION_EVIDENCE_CATEGORIES = new Set([
  'concept-defense-application',
  'proposal-defense-application',
  'final-defense-application'
]);

function isDefenseApplicationEvidenceFile(file: Pick<DocumentFileSummary, 'documentCategory'>) {
  return DEFENSE_APPLICATION_EVIDENCE_CATEGORIES.has(String(file.documentCategory || '').trim().toLowerCase());
}

// Once a project resubmits a category, the earlier rejected/needs-revision file
// in that same category is done — the adviser already acted on it and a newer
// attempt exists. Without this, an old resolved round keeps showing up in the
// review queue (and its "Needs Revision" count) forever, alongside its own
// resubmission's real, current status.
function isSupersededSubmissionFile(file: DocumentFileSummary, allFiles: DocumentFileSummary[]) {
  const status = String(file.submissionStatus || '').toUpperCase();
  if (status !== 'NEEDS_REVISION' || !file.reviewedAt) {
    return false;
  }

  const decisionTime = new Date(file.reviewedAt).getTime();
  const category = file.documentCategory;
  const projectId = file.projectId;

  return allFiles.some(
    (other) =>
      other.id !== file.id &&
      other.projectId === projectId &&
      other.documentCategory === category &&
      new Date(other.createdAt).getTime() > decisionTime
  );
}

export function getAdviserReviewQueueFiles(files: DocumentFileSummary[]) {
  return files.filter((file) => {
    if (isTitleSubmissionFile(file) || isDefenseApplicationEvidenceFile(file)) {
      return false;
    }

    // Award/Recognition and Activity Evidence are a read-only achievement log
    // with no adviser review step — never surface them as a pending submission.
    if (ACHIEVEMENT_DOCUMENT_CATEGORIES.has(String(file.documentCategory || ''))) {
      return false;
    }

    return !isSupersededSubmissionFile(file, files);
  });
}

function getWorkflowStepIndex(status: SubmissionStatus, currentVersionNumber: number) {
  if (status === 'approved') return 4;
  if (status === 'needs-revision') return 2;
  if (currentVersionNumber > 1) return 3;
  if (status === 'under-review') return 1;
  return 0;
}

function getDeadlineProgress(submittedAt: string, deadline: string | null, status: SubmissionStatus) {
  if (status === 'approved') {
    return 100;
  }

  if (!deadline) {
    return 0;
  }

  const submittedTime = new Date(submittedAt).getTime();
  const deadlineTime = new Date(deadline).getTime();
  const now = new Date(getReviewReferenceDate()).getTime();
  const totalWindow = Math.max(1, deadlineTime - submittedTime);
  const elapsed = Math.max(0, now - submittedTime);

  return Math.min(100, Math.max(8, Math.round((elapsed / totalWindow) * 100)));
}

function mapSubmissionStatus(status?: string | null): SubmissionStatus {
  switch (String(status || '').toUpperCase()) {
    case 'UNDER_REVIEW':
      return 'under-review';
    case 'APPROVED':
      return 'approved';
    case 'NEEDS_REVISION':
      return 'needs-revision';
    default:
      return 'pending-review';
  }
}

// The file's own stage (from the checkpoint it was filed under) decides its
// type and milestone. Category keywords are only a fallback for legacy files
// with no checkpoint — they used to file anything without "chapter" or
// "final" in it, concept papers included, under Proposal.
function fileToType(file: DocumentFileSummary): SubmissionType {
  const category = (file.documentCategory || '').toLowerCase();
  switch (file.stage) {
    case 'concept': return 'Concept';
    case 'proposal': return category.includes('chapter') ? 'Chapter' : 'Proposal';
    case 'development': return 'Development';
    case 'mock-defense': return 'Pre-Final';
    case 'final-defense':
    case 'completion': return 'Final';
    default: return categoryToType(category);
  }
}

function fileToMilestone(file: DocumentFileSummary): SubmissionMilestone {
  switch (file.stage) {
    case 'concept': return 'Concept Paper Review';
    case 'proposal': return categoryToMilestone((file.documentCategory || '').replace(/-/g, ' '));
    case 'development': return 'Development Check';
    case 'mock-defense': return 'Pre-Final Defense Check';
    case 'final-defense':
    case 'completion': return 'Final Manuscript Check';
    default: return categoryToMilestone(file.documentCategory || '');
  }
}

function categoryToType(category: string): SubmissionType {
  const normalized = category.toLowerCase();

  if (normalized.includes('final') || normalized.includes('repository')) {
    return 'Final';
  }

  if (normalized.includes('chapter')) {
    return 'Chapter';
  }

  return 'Proposal';
}

function categoryToMilestone(category: string): SubmissionMilestone {
  const normalized = category.toLowerCase();

  if (normalized.includes('chapter 3')) return 'Chapter 3 Review';
  if (normalized.includes('chapter')) return 'Chapter 1 Review';
  if (normalized.includes('final') || normalized.includes('repository')) return 'Final Manuscript Check';

  return 'Proposal Screening';
}

function inferCommentCategories(
  status: SubmissionStatus,
  milestone: SubmissionMilestone,
  latestComment?: { body?: string | null; decision?: string | null } | null
): CommentCategory[] {
  const body = String(latestComment?.body || '').toLowerCase();
  const categories = new Set<CommentCategory>();

  if (status === 'approved') {
    categories.add('Approved Remark');
  }

  if (body.includes('format') || body.includes('citation') || body.includes('reference')) {
    categories.add('Formatting');
  }

  if (body.includes('system') || body.includes('architecture') || body.includes('technical') || body.includes('code')) {
    categories.add('Technical');
  }

  if (body.includes('method') || body.includes('data') || milestone.toLowerCase().includes('chapter')) {
    categories.add('Methodology');
  }

  categories.add('General');

  return Array.from(categories).slice(0, 4);
}

function buildComments(
  status: SubmissionStatus,
  version: string,
  milestone: SubmissionMilestone,
  reviewComments: NonNullable<DocumentFileSummary['reviewComments']> = [],
  latestComment?: AdviserSubmissionRecord['latestReviewComment']
): AdviserSubmissionComment[] {
  const comments = reviewComments.length
    ? reviewComments
    : latestComment
      ? [latestComment]
      : [];

  if (!comments.length) {
    return [];
  }

  return comments.map((comment) => {
    const [category = 'General'] = inferCommentCategories(status, milestone, comment);

    return {
      id: comment.id,
      category,
      body: comment.body,
      authorId: comment.authorId,
      authorName: comment.authorName || 'Adviser',
      version,
      createdAt: new Date(comment.createdAt).toISOString()
    };
  });
}

function buildVersionHistory(file: DocumentFileSummary, currentVersionNumber: number, submittedBy: string) {
  return Array.from({ length: Math.max(1, currentVersionNumber) }, (_, index): AdviserSubmissionVersion => {
    const versionNumber = index + 1;
    const isCurrent = versionNumber === currentVersionNumber;
    const uploadedAt = versionNumber === currentVersionNumber
      ? asIsoString(file.submittedAt) || asIsoString(file.createdAt) || getReviewReferenceDate()
      : addDays(file.createdAt, index * 2);

    return {
      id: `${file.id}-v${versionNumber}`,
      version: `v${versionNumber}`,
      label: versionNumber === 1
        ? 'Original Submission'
        : versionNumber === currentVersionNumber && currentVersionNumber >= 3
          ? 'Final Revision'
          : 'Resubmitted Draft',
      uploadedAt,
      uploader: versionNumber === 1 ? submittedBy : 'Student Resubmission',
      isCurrent
    };
  }).sort((left, right) => Number(right.version.slice(1)) - Number(left.version.slice(1)));
}

function buildTimeline({
  file,
  status,
  submittedBy,
  adviserName,
  reviewedAt,
  currentVersionNumber
}: {
  file: DocumentFileSummary;
  status: SubmissionStatus;
  submittedBy: string;
  adviserName: string;
  reviewedAt: string | null;
  currentVersionNumber: number;
}): AdviserSubmissionTimelineEvent[] {
  const submittedAt = asIsoString(file.submittedAt) || asIsoString(file.createdAt) || getReviewReferenceDate();
  const reviewDate = reviewedAt || addDays(submittedAt, 1);
  const revisionDate = reviewedAt || addDays(submittedAt, 2);
  const resubmittedDate = currentVersionNumber > 1 ? addDays(submittedAt, 3) : addDays(submittedAt, 4);
  const approvedDate = status === 'approved'
    ? reviewedAt || asIsoString(file.updatedAt) || addDays(submittedAt, 5)
    : addDays(submittedAt, 5);
  const hasRevisionRequested = status === 'needs-revision' || (status === 'approved' && currentVersionNumber > 1);
  const hasResubmitted = currentVersionNumber > 1;

  return [
    {
      id: 'submitted',
      label: 'Submitted by student',
      actor: submittedBy,
      occurredAt: submittedAt,
      isComplete: true
    },
    {
      id: 'under-review',
      label: 'Adviser started review',
      actor: adviserName,
      occurredAt: reviewDate,
      isComplete: status !== 'pending-review'
    },
    {
      id: 'revision-requested',
      label: 'Revision requested',
      actor: adviserName,
      occurredAt: revisionDate,
      isComplete: hasRevisionRequested
    },
    {
      id: 'resubmitted',
      label: 'Student resubmitted',
      actor: submittedBy,
      occurredAt: resubmittedDate,
      isComplete: hasResubmitted
    },
    {
      id: 'approved',
      label: getAdviserClearedLabel({ checkpointKey: file.checkpointKey, stage: file.stage }),
      actor: adviserName,
      occurredAt: approvedDate,
      isComplete: status === 'approved'
    }
  ];
}

export function toAdviserSubmissionRecord(file: DocumentFileSummary, index = 0): AdviserSubmissionRecord {
  const submittedAt = asIsoString(file.submittedAt) || asIsoString(file.createdAt) || getReviewReferenceDate();
  const deadline = null;
  const type = fileToType(file);
  const milestone = fileToMilestone(file);
  const status = mapSubmissionStatus(file.submissionStatus);
  const currentVersionNumber = file.submissionVersion || index + 1 || 1;
  const version = `v${currentVersionNumber}`;
  const submittedBy = file.uploadedByName || 'Project Member';
  const reviewedAt = asIsoString(file.reviewedAt);
  const approvedAt = status === 'approved'
    ? reviewedAt || asIsoString(file.updatedAt) || submittedAt
    : undefined;
  const latestReviewComment = file.latestReviewComment || null;
  const adviserName = latestReviewComment?.authorName || 'Adviser';
  const commentCategories = inferCommentCategories(status, milestone, latestReviewComment);

  return {
    id: file.id,
    groupId: file.groupCode || file.groupTitle || 'Assigned Project',
    projectTitle: file.projectTitle || file.groupTitle || 'Student thesis project',
    submissionTitle: file.fileName,
    type,
    milestone,
    status,
    statusLabel: getSubmissionStatusLabel(status, getAdviserClearedLabel({ checkpointKey: file.checkpointKey, stage: file.stage })),
    version,
    currentVersionNumber,
    submittedAt,
    deadline,
    submittedBy,
    uploadedBy: file.uploadedBy,
    groupMembers: file.groupMembers || [],
    latestReviewComment,
    reviewedAt,
    reviewFocus: `${submittedBy} submitted ${file.label || file.documentCategory || 'a document'} for adviser review under ${file.groupCode || file.groupTitle || 'the assigned project'}.`,
    nextAction: status === 'approved'
      ? `${getAdviserClearedLabel({ checkpointKey: file.checkpointKey, stage: file.stage })}. The student can view the adviser remarks and status.`
      : status === 'needs-revision'
        ? 'Student resubmission is unlocked. Wait for the next version or send a reminder.'
        : status === 'under-review'
          ? 'Review session is active. Student tracker now shows Under Adviser Review.'
          : 'Start review to move this submission into the adviser review workspace.',
    fileUrl: `/api/document-files/${file.id}/download`,
    fileType: file.fileType,
    fileExtension: getFileExtension(file.fileName),
    previewFileId: file.id,
    previewFiles: [{ id: file.id, name: file.fileName, fileType: file.fileType }],
    documentCategory: file.documentCategory,
    department: 'IT',
    approvedAt,
    workspaceHref: `/adviser/adviser-mode/submissions/${file.id}`,
    deadlineProgress: getDeadlineProgress(submittedAt, deadline, status),
    workflowStepIndex: getWorkflowStepIndex(status, currentVersionNumber),
    commentCategories,
    comments: buildComments(status, version, milestone, file.reviewComments || [], latestReviewComment),
    versionHistory: buildVersionHistory(file, currentVersionNumber, submittedBy),
    timeline: buildTimeline({ file, status, submittedBy, adviserName, reviewedAt, currentVersionNumber })
  };
}

export type TitleSubmissionSummary = {
  id: string;
  groupId: string;
  groupTitle: string | null;
  title: string;
  status: 'draft' | 'pending' | 'approved' | 'needs-revision' | 'rejected';
  submittedAt: string;
  reviewedAt: string | null;
  membersCount: number;
  groupMembers: Array<{ name: string; role: string; isLeader: boolean }>;
  latestReviewComment: {
    id: string;
    body: string;
    decision: string;
    createdAt: string;
    authorName?: string | null;
  } | null;
  uploadedFiles: Array<{ id: string; name: string; url: string; fileType: string }>;
  // Oral Defense Application evidence for each stage — returned by the same
  // /api/title-submissions endpoint alongside the title fields above, but kept
  // optional here since this narrower type predates evidence being surfaced
  // through this file.
  evidenceReview?: EvidenceReviewSummary;
  proposalEvidenceReview?: EvidenceReviewSummary;
  finalEvidenceReview?: EvidenceReviewSummary;
};

export type EvidenceReviewSummary = {
  status: string;
  feedback: string | null;
  feedbackBy: string | null;
  uploaderNote: string | null;
  files: Array<{ id: string; name: string; url: string; fileType?: string; size: number | null; documentCategory?: string | null }>;
} | null;

function mapTitleStatus(status: TitleSubmissionSummary['status']): SubmissionStatus {
  switch (status) {
    case 'approved':
      return 'approved';
    case 'needs-revision':
    case 'rejected':
      return 'needs-revision';
    default:
      return 'pending-review';
  }
}

/**
 * Surfaces title proposals inside the same Document Submissions list as chapters
 * and manuscripts, read-only — the actual Approve/Reject actions still only live
 * on the dedicated Title & Evidence Approval page, since that flow drives Group/Project
 * status and shouldn't be duplicated here. This just makes titles visible and
 * filterable alongside everything else an adviser has waiting on them, the same
 * way Oral Defense Application evidence already is.
 */
export function toAdviserSubmissionRecordFromTitle(title: TitleSubmissionSummary): AdviserSubmissionRecord {
  const submittedAt = asIsoString(title.submittedAt) || getReviewReferenceDate();
  const status = mapTitleStatus(title.status);
  const milestone: SubmissionMilestone = 'Title Screening';
  const submittedBy = title.groupMembers.find((member) => member.isLeader)?.name
    || title.groupMembers[0]?.name
    || 'Project Member';
  const reviewedAt = asIsoString(title.reviewedAt);
  const attachedFile = title.uploadedFiles[0] || null;
  const commentCategories = inferCommentCategories(status, milestone, title.latestReviewComment);

  return {
    id: `title-${title.id}`,
    groupId: title.groupId,
    projectTitle: `${title.groupTitle || title.groupId} — Title Proposal`,
    submissionTitle: title.title,
    type: 'Title',
    milestone,
    status,
    statusLabel: getSubmissionStatusLabel(status, getAdviserClearedLabel({ stage: 'concept' })),
    version: 'v1',
    currentVersionNumber: 1,
    submittedAt,
    deadline: null,
    submittedBy,
    groupMembers: title.groupMembers,
    latestReviewComment: title.latestReviewComment,
    reviewedAt,
    reviewFocus: `${submittedBy} proposed a title for adviser review under ${title.groupId}.`,
    nextAction: 'Open Title & Evidence Approval to accept, request revision, or reject this proposed title.',
    fileUrl: attachedFile?.url || '',
    fileType: attachedFile?.fileType || 'title',
    fileExtension: attachedFile ? getFileExtension(attachedFile.name) : 'title',
    previewFileId: attachedFile?.id || null,
    previewFiles: title.uploadedFiles.map((uploadedFile) => ({
      id: uploadedFile.id,
      name: uploadedFile.name,
      fileType: uploadedFile.fileType
    })),
    documentCategory: 'Title Proposal',
    department: 'IT',
    approvedAt: status === 'approved' ? reviewedAt || submittedAt : undefined,
    workspaceHref: `/adviser/adviser-mode/title-approvals?open=title:${encodeURIComponent(title.id)}`,
    deadlineProgress: getDeadlineProgress(submittedAt, null, status),
    workflowStepIndex: getWorkflowStepIndex(status, 1),
    commentCategories,
    comments: title.latestReviewComment
      ? buildComments(status, 'v1', milestone, [], title.latestReviewComment)
      : [],
    versionHistory: [{
      id: `title-${title.id}-v1`,
      version: 'v1',
      label: 'Title Proposal',
      uploadedAt: submittedAt,
      uploader: submittedBy,
      isCurrent: true
    }],
    timeline: [
      { id: 'submitted', label: 'Submitted by student', actor: submittedBy, occurredAt: submittedAt, isComplete: true },
      { id: 'under-review', label: 'Adviser review pending', actor: 'Adviser', occurredAt: submittedAt, isComplete: status !== 'pending-review' },
      { id: 'revision-requested', label: 'Revision requested', actor: 'Adviser', occurredAt: reviewedAt || submittedAt, isComplete: status === 'needs-revision' },
      { id: 'resubmitted', label: 'Student resubmitted', actor: submittedBy, occurredAt: submittedAt, isComplete: false },
      { id: 'approved', label: getAdviserClearedLabel({ stage: 'concept' }), actor: 'Adviser', occurredAt: reviewedAt || submittedAt, isComplete: status === 'approved' }
    ]
  };
}

// Shape returned by GET /api/title-drafts/adviser — kept as a local type here
// rather than importing it from the page component, to avoid a data-layer
// file depending on a component file.
export type AdviserBackupTitleSummary = {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  updatedAt: string;
  reviewStatus: 'PENDING' | 'APPROVED' | 'NEEDS_REVISION' | 'IN_REVIEW' | 'NOT_REQUIRED';
  reviewFeedback: string | null;
  reviewedAt: string | null;
  isPriority: boolean;
  groupId: string;
  groupCode: string | null;
  groupTitle: string | null;
  groupMembers: Array<{ name: string; isLeader: boolean }>;
  updatedByName: string | null;
  files: Array<{ id: string; name: string; url: string; fileType: string; size: number | null }>;
};

function mapBackupStatus(status: AdviserBackupTitleSummary['reviewStatus']): SubmissionStatus {
  switch (status) {
    case 'APPROVED':
      return 'approved';
    case 'NEEDS_REVISION':
      return 'needs-revision';
    case 'IN_REVIEW':
      return 'under-review';
    default:
      return 'pending-review';
  }
}

/**
 * Surfaces backup titles (see /api/title-drafts) inside the same Document
 * Submissions list, read-only — same reasoning as the title/evidence rows
 * above: the actual Approve/Needs Revision decision only lives on Title &
 * Evidence Approval's Backup Titles Awaiting Review section, this just makes
 * a group's backups visible/filterable alongside everything else an adviser
 * has waiting on them.
 */
export function toAdviserSubmissionRecordFromBackup(draft: AdviserBackupTitleSummary): AdviserSubmissionRecord {
  const submittedAt = asIsoString(draft.updatedAt) || getReviewReferenceDate();
  const status = mapBackupStatus(draft.reviewStatus);
  const milestone: SubmissionMilestone = 'Backup Title';
  const groupMembers = draft.groupMembers.map((member) => ({
    name: member.name,
    role: member.isLeader ? 'Leader' : 'Member',
    isLeader: member.isLeader
  }));
  const submittedBy = groupMembers.find((member) => member.isLeader)?.name
    || groupMembers[0]?.name
    || draft.updatedByName
    || 'Project Member';
  const reviewedAt = asIsoString(draft.reviewedAt);
  const attachedFile = draft.files[0] || null;
  const latestReviewComment = draft.reviewFeedback
    ? {
        id: `backup-${draft.id}-feedback`,
        body: draft.reviewFeedback,
        decision: status === 'approved' ? 'approve' : 'request_changes',
        createdAt: reviewedAt || submittedAt,
        authorName: 'Adviser'
      }
    : null;
  const commentCategories = inferCommentCategories(status, milestone, latestReviewComment);

  return {
    id: `backup-${draft.id}`,
    groupId: draft.groupCode || draft.groupId,
    projectTitle: `${draft.groupTitle || draft.groupCode || draft.groupId} — Backup Title`,
    submissionTitle: draft.title,
    type: 'Backup',
    milestone,
    status,
    statusLabel: getSubmissionStatusLabel(status, BACKUP_TITLE_CLEARED_LABEL),
    version: 'v1',
    currentVersionNumber: 1,
    submittedAt,
    deadline: null,
    submittedBy,
    groupMembers,
    latestReviewComment,
    reviewedAt,
    reviewFocus: `${submittedBy} prepared a backup title in advance, in case a new title is ever required.`,
    nextAction: 'Open Title & Evidence Approval to approve or request revision on this backup title.',
    fileUrl: attachedFile?.url || '',
    fileType: attachedFile?.fileType || 'backup',
    fileExtension: attachedFile ? getFileExtension(attachedFile.name) : 'backup',
    // Backup files have no Project yet (they're pre-submission drafts), so
    // they're only reachable through their own dedicated, group-scoped
    // download route — the generic /api/document-files/[id]/download route
    // would 403 here since there's no project relation to authorize against.
    // Leaving previewFileId null keeps downloadSubmissionDocument() on the
    // fileUrl fallback instead of assuming the generic route applies.
    previewFileId: null,
    previewFiles: draft.files.map((file) => ({ id: file.id, name: file.name, fileType: file.fileType })),
    documentCategory: 'Backup Title',
    department: 'IT',
    approvedAt: status === 'approved' ? reviewedAt || submittedAt : undefined,
    workspaceHref: `/adviser/adviser-mode/title-approvals?open=backup:${encodeURIComponent(draft.id)}`,
    deadlineProgress: getDeadlineProgress(submittedAt, null, status),
    workflowStepIndex: getWorkflowStepIndex(status, 1),
    commentCategories,
    comments: latestReviewComment
      ? buildComments(status, 'v1', milestone, [], latestReviewComment)
      : [],
    versionHistory: [{
      id: `backup-${draft.id}-v1`,
      version: 'v1',
      label: 'Backup Title',
      uploadedAt: submittedAt,
      uploader: submittedBy,
      isCurrent: true
    }],
    timeline: [
      { id: 'saved', label: 'Saved by student', actor: submittedBy, occurredAt: submittedAt, isComplete: true },
      { id: 'under-review', label: 'Adviser review pending', actor: 'Adviser', occurredAt: submittedAt, isComplete: status !== 'pending-review' },
      { id: 'revision-requested', label: 'Revision requested', actor: 'Adviser', occurredAt: reviewedAt || submittedAt, isComplete: status === 'needs-revision' },
      { id: 'approved', label: BACKUP_TITLE_CLEARED_LABEL, actor: 'Adviser', occurredAt: reviewedAt || submittedAt, isComplete: status === 'approved' }
    ]
  };
}

const EVIDENCE_STAGES: Array<{
  field: 'evidenceReview' | 'proposalEvidenceReview' | 'finalEvidenceReview';
  stageLabel: string;
}> = [
  { field: 'evidenceReview', stageLabel: 'Concept' },
  { field: 'proposalEvidenceReview', stageLabel: 'Proposal' },
  { field: 'finalEvidenceReview', stageLabel: 'Final' }
];

// Checkpoint statuses (MilestoneCheckpointStatus) use IN_REVIEW, not
// mapSubmissionStatus()'s UNDER_REVIEW — evidence needs its own mapping so an
// in-review stage doesn't fall through to "pending-review".
function mapEvidenceStatus(status?: string | null): SubmissionStatus {
  switch (String(status || '').toUpperCase()) {
    case 'IN_REVIEW':
      return 'under-review';
    case 'APPROVED':
    case 'COMPLETED':
      return 'approved';
    case 'NEEDS_REVISION':
      return 'needs-revision';
    default:
      return 'pending-review';
  }
}

/**
 * Surfaces each stage's Oral Defense Application evidence inside the same
 * Document Submissions list, read-only — the actual Approve/Needs Revision
 * decision only lives on Title & Evidence Approval's Review Evidence drawer,
 * this just makes it visible/filterable alongside everything else. Only
 * stages with an uploaded file produce a card; a stage nothing's been
 * uploaded for yet isn't waiting on the adviser.
 */
export function toAdviserSubmissionRecordsFromEvidence(title: TitleSubmissionSummary): AdviserSubmissionRecord[] {
  const submittedAt = asIsoString(title.submittedAt) || getReviewReferenceDate();
  const submittedBy = title.groupMembers.find((member) => member.isLeader)?.name
    || title.groupMembers[0]?.name
    || 'Project Member';

  return EVIDENCE_STAGES.flatMap((stage) => {
    const review = title[stage.field];
    const hasFile = (review?.files?.length ?? 0) > 0;

    if (!review || !hasFile) {
      return [];
    }

    const status = mapEvidenceStatus(review.status);
    const milestone: SubmissionMilestone = 'Defense Clearance';
    // Evidence has no submission-level timestamp of its own in this payload —
    // approximate with the title's own submission/review time.
    const reviewedAt = status === 'approved' || status === 'needs-revision'
      ? asIsoString(title.reviewedAt) || submittedAt
      : null;
    const attachedFile = review.files[0] || null;
    const latestReviewComment = review.feedback
      ? {
          id: `evidence-${title.id}-${stage.field}`,
          body: review.feedback,
          decision: status === 'approved' ? 'approved' : status === 'needs-revision' ? 'needs_revision' : 'comment',
          createdAt: reviewedAt || submittedAt,
          authorName: review.feedbackBy || 'Adviser'
        }
      : null;
    const commentCategories = inferCommentCategories(status, milestone, latestReviewComment);

    const record: AdviserSubmissionRecord = {
      id: `evidence-${title.id}-${stage.field}`,
      groupId: title.groupId,
      projectTitle: `${title.groupTitle || title.groupId} — ${stage.stageLabel} Evidence`,
      submissionTitle: `${stage.stageLabel} Oral Defense Application Evidence`,
      type: 'Evidence',
      milestone,
      status,
      statusLabel: getSubmissionStatusLabel(status, getAdviserClearedLabel({ stage: stage.stageLabel })),
      version: 'v1',
      currentVersionNumber: 1,
      submittedAt,
      deadline: null,
      submittedBy,
      groupMembers: title.groupMembers,
      latestReviewComment,
      reviewedAt,
      reviewFocus: `${submittedBy} uploaded ${stage.stageLabel.toLowerCase()}-stage oral defense application evidence for adviser review.`,
      nextAction: 'Open Title & Evidence Approval to review this stage\'s evidence.',
      fileUrl: attachedFile?.url || '',
      fileType: attachedFile?.fileType || 'image',
      fileExtension: attachedFile ? getFileExtension(attachedFile.name) : 'jpg',
      previewFileId: attachedFile?.id || null,
      previewFiles: review.files.map((evidenceFile) => ({
        id: evidenceFile.id,
        name: evidenceFile.name,
        fileType: evidenceFile.fileType
      })),
      documentCategory: `${stage.stageLabel} Evidence`,
      department: 'IT',
      approvedAt: status === 'approved' ? reviewedAt || submittedAt : undefined,
      workspaceHref: `/adviser/adviser-mode/title-approvals?open=evidence:${encodeURIComponent(title.id)}`,
      deadlineProgress: getDeadlineProgress(submittedAt, null, status),
      workflowStepIndex: getWorkflowStepIndex(status, 1),
      commentCategories,
      comments: latestReviewComment ? buildComments(status, 'v1', milestone, [], latestReviewComment) : [],
      versionHistory: [{
        id: `evidence-${title.id}-${stage.field}-v1`,
        version: 'v1',
        label: `${stage.stageLabel} Evidence`,
        uploadedAt: submittedAt,
        uploader: submittedBy,
        isCurrent: true
      }],
      timeline: [
        { id: 'submitted', label: 'Submitted by student', actor: submittedBy, occurredAt: submittedAt, isComplete: true },
        { id: 'under-review', label: 'Adviser review pending', actor: 'Adviser', occurredAt: submittedAt, isComplete: status !== 'pending-review' },
        { id: 'revision-requested', label: 'Revision requested', actor: 'Adviser', occurredAt: reviewedAt || submittedAt, isComplete: status === 'needs-revision' },
        { id: 'resubmitted', label: 'Student resubmitted', actor: submittedBy, occurredAt: submittedAt, isComplete: false },
        { id: 'approved', label: getAdviserClearedLabel({ stage: stage.stageLabel }), actor: 'Adviser', occurredAt: reviewedAt || submittedAt, isComplete: status === 'approved' }
      ]
    };

    return [record];
  });
}

export function getSubmissionStatusMeta(status: SubmissionStatus) {
  return submissionStatusMeta[status];
}

export function getCommentCategoryMeta(category: CommentCategory) {
  switch (category) {
    case 'Formatting':
      return 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200';
    case 'Technical':
      return 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200';
    case 'Methodology':
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200';
    case 'Approved Remark':
      return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-200';
    case 'General':
    default:
      return 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200';
  }
}

export function formatSubmissionDate(value: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(value));
}

export function formatSubmissionDateTime(value: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

export function getDeadlineLabel(deadline: string | null | undefined, referenceDate = getReviewReferenceDate()) {
  if (!deadline) {
    return 'No deadline set';
  }

  const diffInDays = Math.round((startOfUtcDay(deadline) - startOfUtcDay(referenceDate)) / dayInMilliseconds);

  if (diffInDays < 0) {
    const overdueDays = Math.abs(diffInDays);
    return `Overdue ${overdueDays} day${overdueDays === 1 ? '' : 's'}`;
  }

  if (diffInDays === 0) {
    return 'Due today';
  }

  if (diffInDays === 1) {
    return 'Due tomorrow';
  }

  return `Due in ${diffInDays} days`;
}

export function getDeadlineToneClass(deadline: string | null | undefined, referenceDate = getReviewReferenceDate()) {
  if (!deadline) {
    return 'text-slate-500';
  }

  const diffInDays = Math.round((startOfUtcDay(deadline) - startOfUtcDay(referenceDate)) / dayInMilliseconds);

  if (diffInDays < 0) {
    return 'text-red-600';
  }

  if (diffInDays <= 1) {
    return 'text-orange-600';
  }

  return 'text-slate-600';
}

export function compareSubmissionReviewOrder(left: AdviserSubmissionRecord, right: AdviserSubmissionRecord) {
  if (left.deadline && right.deadline) {
    return new Date(left.deadline).getTime() - new Date(right.deadline).getTime();
  }

  if (left.deadline || right.deadline) {
    return left.deadline ? -1 : 1;
  }

  return new Date(left.submittedAt).getTime() - new Date(right.submittedAt).getTime();
}

export function getApprovedThisWeekCount(
  submissions: AdviserSubmissionRecord[],
  referenceDate = getReviewReferenceDate()
) {
  const referenceDay = startOfUtcDay(referenceDate);
  const weekStart = referenceDay - dayInMilliseconds * 6;

  return submissions.filter((submission) => {
    if (submission.status !== 'approved' || !submission.approvedAt) {
      return false;
    }

    const approvedDay = startOfUtcDay(submission.approvedAt);
    return approvedDay >= weekStart && approvedDay <= referenceDay;
  }).length;
}

export function getPriorityQueue(submissions: AdviserSubmissionRecord[]) {
  return [...submissions]
    .filter((submission) => submission.status !== 'approved')
    .sort(compareSubmissionReviewOrder)
    .slice(0, 3);
}

export function getSubmissionTypeOptions(submissions: AdviserSubmissionRecord[]) {
  return Array.from(new Set(submissions.map((submission) => submission.type)));
}

export function getSubmissionMilestoneOptions(submissions: AdviserSubmissionRecord[]) {
  return Array.from(new Set(submissions.map((submission) => submission.milestone)));
}

export const SUBMISSION_STATUS_FILTER_OPTIONS = statusFilterOptions;

// A backup title the adviser cleared is kept on standby for the Concept
// Presentation — it isn't the group's approved title.
export const BACKUP_TITLE_CLEARED_LABEL = 'Ready as Backup Title';

// The badge text for one submission: what the adviser's clearance means at this
// file's stage ("Ready for Concept Presentation"), or "Revise" when sent back.
export function getSubmissionStatusLabel(status: SubmissionStatus, clearedLabel: string) {
  if (status === 'approved') return clearedLabel;
  if (status === 'needs-revision') return ADVISER_REVISE_LABEL;
  return getSubmissionStatusMeta(status).label;
}
