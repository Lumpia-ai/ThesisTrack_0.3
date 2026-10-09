'use client';

import { RepositoryTitleCheckPanel } from '@/components/students/repository-title-check-panel';
import { checkTitleAgainstRepository, getTooSimilarMessage, REPOSITORY_SIMILARITY_LIMIT } from '@/lib/repository-title-check';
import Link from 'next/link';
import { type CSSProperties, type ChangeEvent, type FormEvent, type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { getFilePreviewKind, getSignedUrlPreview } from '@/lib/storage/file-preview';
import { formatFileSizeLabel } from '@/components/students/student-project-files.shared';
import { PremiumAnimatedButton } from '@/components/ui/premium-animated-button';
import type {
  StudentDashboardData,
  StudentTitleAttachment,
  StudentTitleSubmissionRecord,
  StudentTitleWorkflowStep
} from '@/lib/services/student-workspace';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';
type NoticeTone = 'success' | 'warning' | 'danger' | 'info';
type NoticeState = {
  tone: NoticeTone;
  message: string;
} | null;

function sortByDateDesc<T extends { date: string }>(items: T[]) {
  return [...items].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
}

function formatDateLabel(value: string) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(parsedDate);
}

function formatDateTimeLabel(value: string) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(parsedDate);
}

function formatShortDateLabel(value: string) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(parsedDate);
}

function formatTimeLabel(value: string) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(parsedDate);
}

function getStatusTone(status: string): BadgeTone {
  // Defensive: matches against space-separated multi-word phrases below, so
  // normalize away underscores in case a raw enum ever reaches this function
  // directly instead of a pre-formatted display label.
  const normalized = status.toLowerCase().replace(/_/g, ' ');

  if (
    ['approved', 'completed', 'resolved', 'similarity cleared', 'cleared', 'ready'].includes(normalized)
  ) {
    return 'success';
  }

  if (['under review', 'current', 'ongoing', 'in progress', 'group leader access'].includes(normalized)) {
    return 'info';
  }

  if (['pending', 'pending review', 'submitted', 'resubmitted'].includes(normalized)) {
    return 'warning';
  }

  if (['needs revision', 'returned for revision', 'revision requested'].includes(normalized)) {
    return 'accent';
  }

  if (['rejected', 'overdue'].includes(normalized)) {
    return 'danger';
  }

  if (['archived', 'member view', 'draft', 'withdrawn'].includes(normalized)) {
    return 'neutral';
  }

  return 'neutral';
}

// Several panels on this page collapsed the full BadgeTone spectrum into a binary
// success/not-success check, which is why a rejected proposal used to render with
// the same amber "warning" styling as a routine pending one, and a withdrawn
// proposal had no distinct look at all. One shared mapping keeps every panel that
// reads `titleStatusTone` visually consistent with what actually happened.
function getToneSurfaceClasses(tone: BadgeTone) {
  switch (tone) {
    case 'success':
      return { soft: 'bg-[var(--info-soft)]', text: 'text-[var(--info)]', border: 'border-[var(--info)]' };
    case 'info':
      return { soft: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
    case 'accent':
      return { soft: 'bg-[var(--warning-soft)]', text: 'text-[var(--warning)]', border: 'border-[var(--warning)]' };
    case 'danger':
      return { soft: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' };
    case 'neutral':
      return { soft: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' };
    case 'warning':
    default:
      return { soft: 'bg-[var(--warning-soft)]', text: 'text-[var(--warning)]', border: 'border-[var(--warning)]' };
  }
}

function getWorkflowStatusLabel(status: StudentTitleWorkflowStep['status']) {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'current':
      return 'Current';
    case 'needs_revision':
      return 'Needs Revision';
    case 'rejected':
      return 'Rejected';
    case 'archived':
      return 'Archived';
    case 'pending':
    default:
      return 'Pending';
  }
}

function getWorkflowStatusTone(status: StudentTitleWorkflowStep['status']): BadgeTone {
  switch (status) {
    case 'completed':
      return 'success';
    case 'current':
      return 'info';
    case 'needs_revision':
      return 'accent';
    case 'rejected':
      return 'danger';
    case 'archived':
      return 'neutral';
    case 'pending':
    default:
      return 'warning';
  }
}

function formatProposalLabel(proposalNumber: number) {
  return `Proposal ${String(proposalNumber).padStart(2, '0')}`;
}

function getBackupReviewBadge(status: string) {
  if (status === 'APPROVED') {
    return { label: 'Adviser Approved', className: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200', icon: 'fa-circle-check' };
  }
  if (status === 'NEEDS_REVISION') {
    return { label: 'Needs Revision', className: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200', icon: 'fa-triangle-exclamation' };
  }
  return { label: 'Awaiting Review', className: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200', icon: 'fa-clock' };
}

function getFileTypeIcon(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  if (extension === 'pdf') return 'fa-file-pdf';
  if (['doc', 'docx'].includes(extension)) return 'fa-file-word';
  if (['xls', 'xlsx'].includes(extension)) return 'fa-file-excel';
  if (['ppt', 'pptx'].includes(extension)) return 'fa-file-powerpoint';
  return 'fa-file-lines';
}

function formatBackupFileSize(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) return null;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function deriveTitleFromFileName(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function createSubmissionFromRegistration(
  title: StudentDashboardData['titleRegistration']
): StudentTitleSubmissionRecord {
  return {
    id: title.registrationStatus.toLowerCase() === 'draft' ? `title-local-${title.id}` : title.id,
    proposalNumber: 1,
    proposalLabel: formatProposalLabel(1),
    isCurrent: true,
    user_id: title.user_id,
    project_id: title.project_id,
    status: title.status,
    created_at: title.created_at,
    updated_at: title.updated_at,
    proposedTitle: title.proposedTitle,
    briefDescription: title.briefDescription,
    background: title.background,
    statementOfProblem: title.statementOfProblem,
    objectives: title.objectives,
    category: title.category,
    keywords: title.keywords,
    groupMembers: title.groupMembers,
    adviser: title.adviser,
    registrationStatus: title.registrationStatus,
    lastReviewedAt: title.lastReviewedAt,
    statusNote: title.statusNote,
    reviewSummary: title.reviewSummary,
    workflow: title.workflow,
    revisionHistory: title.revisionHistory,
    reviewerFeedback: title.reviewerFeedback,
    validation: title.validation,
    attachments: title.attachments
  };
}

function buildInitialSubmissions(data: StudentDashboardData): StudentTitleSubmissionRecord[] {
  const seed = data.titleRegistration.submissions?.length ? data.titleRegistration.submissions : [createSubmissionFromRegistration(data.titleRegistration)];

  return [...seed].sort((left, right) => {
    if (left.isCurrent && !right.isCurrent) {
      return -1;
    }

    if (!left.isCurrent && right.isCurrent) {
      return 1;
    }

    return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
  });
}

function buildFallbackWorkflow(title: StudentTitleSubmissionRecord): StudentTitleWorkflowStep[] {
  const normalizedStatus = title.registrationStatus.toLowerCase();

  const draftStatus = normalizedStatus === 'draft' ? 'current' : 'completed';
  const submittedStatus = ['draft'].includes(normalizedStatus) ? 'pending' : 'completed';

  let reviewStatus: StudentTitleWorkflowStep['status'] = 'pending';
  let approvedStatus: StudentTitleWorkflowStep['status'] = 'pending';
  let archivedStatus: StudentTitleWorkflowStep['status'] = 'pending';

  if (['pending review', 'submitted', 'resubmitted', 'under review'].includes(normalizedStatus)) {
    reviewStatus = 'current';
  } else if (normalizedStatus === 'needs revision') {
    reviewStatus = 'needs_revision';
  } else if (normalizedStatus === 'rejected') {
    reviewStatus = 'rejected';
  } else if (normalizedStatus === 'approved') {
    reviewStatus = 'completed';
    approvedStatus = 'current';
  } else if (normalizedStatus === 'archived') {
    reviewStatus = 'completed';
    approvedStatus = 'completed';
    archivedStatus = 'current';
  }

  return [
    {
      id: `${title.id}-workflow-draft`,
      title: 'Draft',
      status: draftStatus,
      date: title.created_at,
      dateLabel: formatDateLabel(title.created_at),
      note: 'The proposal is being prepared with the required title sections and supporting files.'
    },
    {
      id: `${title.id}-workflow-submitted`,
      title: 'Submitted',
      status: submittedStatus,
      date: title.revisionHistory.length ? title.revisionHistory[title.revisionHistory.length - 1]?.date : undefined,
      dateLabel: title.revisionHistory.length
        ? formatDateLabel(title.revisionHistory[title.revisionHistory.length - 1]?.date || title.created_at)
        : undefined,
      note: 'The proposal package was forwarded to the adviser review queue.'
    },
    {
      id: `${title.id}-workflow-review`,
      title: 'Under Review',
      status: reviewStatus,
      date: title.lastReviewedAt,
      dateLabel: formatDateLabel(title.lastReviewedAt),
      note: 'Background, problem statement, objectives, and attachments are being checked for title validation.'
    },
    {
      id: `${title.id}-workflow-approved`,
      title: TITLE_CLEARED_LABEL,
      status: approvedStatus,
      date: normalizedStatus === 'approved' || normalizedStatus === 'archived' ? title.lastReviewedAt : undefined,
      dateLabel:
        normalizedStatus === 'approved' || normalizedStatus === 'archived'
          ? formatDateLabel(title.lastReviewedAt)
          : undefined,
      note: 'The adviser cleared this title. The Program Head schedules the Concept Presentation, where the panel decides whether it is approved.'
    },
    {
      id: `${title.id}-workflow-archived`,
      title: 'Archived',
      status: archivedStatus,
      note: 'The final title package is preserved for record-keeping once the study is finalized.'
    }
  ];
}

function createDraftSubmission(
  data: StudentDashboardData,
  proposalNumber: number,
  isLeader: boolean
): StudentTitleSubmissionRecord {
  const timestamp = new Date().toISOString();

  return {
    id: `title-local-${proposalNumber}-${Date.now()}`,
    proposalNumber,
    proposalLabel: formatProposalLabel(proposalNumber),
    isCurrent: true,
    user_id: data.profile.user_id,
    project_id: data.profile.project_id,
    status: 'active',
    created_at: timestamp,
    updated_at: timestamp,
    proposedTitle: '',
    briefDescription: '',
    background: '',
    statementOfProblem: '',
    objectives: [''],
    category: data.titleRegistration.category,
    keywords: [...data.titleRegistration.keywords],
    groupMembers: [...data.group.members.map((member) => member.fullName)],
    adviser: data.titleRegistration.adviser,
    registrationStatus: 'Draft',
    lastReviewedAt: timestamp,
    statusNote: 'Draft proposal is being prepared. Upload the title proposal document file for adviser review.',
    reviewSummary: {
      latestAction: 'Draft created',
      nextStep: 'Upload at least one title proposal document before submitting this record for adviser review.',
      lastReviewedBy: 'Not yet reviewed',
      accessRole: isLeader ? 'Group leader access' : 'Member view',
      accessNote: isLeader
        ? 'Only the group leader can send the proposal package for adviser review.'
        : `Coordinate with ${data.group.leaderName} for official title submission.`
    },
    revisionHistory: [],
    reviewerFeedback: [],
    validation: {
      status: 'Pending validation',
      checkedAt: timestamp,
      checkedAtLabel: 'Awaiting validation',
      note: 'Similarity checking will start after the title proposal package is submitted.',
      matchedTitles: []
    },
    attachments: []
  };
}

function isEmptyLocalDraftSubmission(submission: StudentTitleSubmissionRecord) {
  return canDeleteDraftSubmission(submission) &&
    submission.attachments.length === 0 &&
    !submission.proposedTitle.trim() &&
    !submission.briefDescription.trim();
}

function isDraftSubmission(submission: StudentTitleSubmissionRecord) {
  return submission.registrationStatus.trim().toLowerCase() === 'draft';
}

function canDeleteDraftSubmission(submission: StudentTitleSubmissionRecord) {
  return submission.id.startsWith('title-local-') && isDraftSubmission(submission);
}

function shouldShowProposalSubmission(submission: StudentTitleSubmissionRecord) {
  return !isDraftSubmission(submission) || canDeleteDraftSubmission(submission);
}

function createAttachmentFromFile(file: File, uploadedBy: string, downloadUrl?: string): StudentTitleAttachment {
  const uploadedAt = new Date().toISOString();

  return {
    id: `title-attachment-local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fileName: file.name,
    fileType: file.type || file.name.split('.').pop()?.toUpperCase() || 'FILE',
    sizeLabel: formatFileSizeLabel(file.size),
    uploadedAt,
    uploadedAtLabel: formatDateTimeLabel(uploadedAt),
    uploadedBy,
    status: 'Attached',
    downloadUrl,
    file
  };
}

// The adviser clearing a title only readies it for the Concept Presentation —
// the panel decides there whether it's approved. Records keep "Approved" /
// "Needs Revision" internally (other logic compares against those), so only
// what the student sees is mapped here.
const TITLE_CLEARED_LABEL = 'Ready for Concept Presentation';

function getTitleStatusDisplay(status: string) {
  if (status === 'Approved') return TITLE_CLEARED_LABEL;
  if (status === 'Needs Revision') return 'Revise';
  return status;
}

function mapTitleStatusLabel(status: string, rejectionReason?: string | null) {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'needs-revision':
      return 'Needs Revision';
    case 'rejected':
      // The API maps both an adviser rejection and a student's own withdrawal
      // (choosing a different candidate) onto the same underlying archived
      // status — distinguish them here using the reason text so a withdrawn
      // proposal doesn't read like the adviser turned it down.
      return rejectionReason?.startsWith('Withdrawn') ? 'Withdrawn' : 'Rejected';
    case 'draft':
      return 'Draft';
    default:
      return 'Pending Review';
  }
}

function canChooseSubmission(submission: Pick<StudentTitleSubmissionRecord, 'registrationStatus'>) {
  return submission.registrationStatus === 'Pending Review' || submission.registrationStatus === 'Needs Revision';
}

function mapApiTitleToSubmission(title: any, index: number, data: StudentDashboardData): StudentTitleSubmissionRecord {
  const statusLabel = mapTitleStatusLabel(title.status, title.rejectionReason);
  const reviewedAt = title.reviewedAt || title.updatedAt || title.submittedAt;
  const latestComment = title.latestReviewComment;

  return {
    id: title.id,
    proposalNumber: index + 1,
    proposalLabel: formatProposalLabel(index + 1),
    isCurrent: index === 0,
    user_id: data.profile.user_id,
    project_id: title.id,
    status: 'active',
    created_at: title.submittedAt,
    updated_at: title.updatedAt || title.submittedAt,
    proposedTitle: title.title,
    briefDescription: title.description,
    background: title.description,
    statementOfProblem: 'Included in the submitted title proposal package.',
    objectives: ['Validate the proposed title with the assigned adviser.'],
    category: `${title.department || data.profile.department || 'IT'} Capstone Title Proposal`,
    keywords: title.keywords || [],
    groupMembers: title.memberPreview || data.group.members.map((member) => member.fullName),
    adviser: data.titleRegistration.adviser,
    registrationStatus: statusLabel,
    lastReviewedAt: reviewedAt,
    statusNote: latestComment?.body || title.adviserAction || 'Submitted for adviser title validation.',
    reviewSummary: {
      latestAction: statusLabel,
      nextStep:
        title.status === 'approved'
          ? 'Use this approved title in dashboard, project overview, documents, and future submissions.'
          : title.status === 'needs-revision'
            ? 'Revise the title based on adviser notes, then submit another proposal.'
            : title.status === 'rejected'
              ? 'Submit a different title proposal for adviser validation.'
              : 'Wait for adviser validation or submit another title option.',
      lastReviewedBy: latestComment?.authorName || data.titleRegistration.adviser,
      accessRole: data.profile.groupRole || 'Student access',
      accessNote: 'Any student in the assigned group can submit title proposals for adviser review.'
    },
    workflow: undefined,
    revisionHistory: [
      {
        id: `${title.id}-history`,
        status: statusLabel,
        date: reviewedAt,
        dateLabel: formatDateLabel(reviewedAt),
        note: latestComment?.body || title.adviserAction || 'Title proposal was submitted for adviser review.',
        reviewedBy: latestComment?.authorName || data.titleRegistration.adviser
      }
    ],
    reviewerFeedback: latestComment
      ? [
          {
            id: latestComment.id,
            author: latestComment.authorName || data.titleRegistration.adviser,
            role: 'Research Adviser',
            status: statusLabel,
            date: String(latestComment.createdAt),
            dateLabel: formatDateLabel(String(latestComment.createdAt)),
            note: latestComment.body,
            route: '#title-submission-form',
            actionLabel: 'Review title notes'
          }
        ]
      : [],
    validation: {
      status: title.similarityScore ? 'Possible match found' : 'No close matches found',
      checkedAt: title.updatedAt || title.submittedAt,
      checkedAtLabel: 'Automatic similarity check',
      note: title.similarityScore
        ? 'This title shares significant wording with existing titles below. Review them before your adviser does.'
        : 'No other submitted title currently shares enough wording with this one to flag.',
      matchedTitles: ((title.similarTitles || []) as Array<{ id: string; title: string; groupCode: string | null; score: number }>).map(
        (match) => ({
          id: match.id,
          title: match.title,
          matchLabel: `${match.score}% similar${match.groupCode ? ` · ${match.groupCode}` : ''}`
        })
      )
    },
    // Concept paper files only: the API also returns oral defense evidence
    // photos, which belong in Defense Compliance, not the title proposal.
    attachments: (title.uploadedFiles || [])
      .filter((file: any) => !String(file.documentCategory || '').toLowerCase().endsWith('defense-application'))
      .map((file: any) => ({
      id: file.id,
      file: null,
      fileName: file.name,
      fileType: file.name.split('.').pop() || '',
      sizeLabel: `${Math.round(file.size / 1024)} KB`,
      downloadUrl: file.url,
      // Each file's own upload date + time; older payloads fall back to the
      // proposal's submit date.
      uploadedAtLabel: formatDateTimeLabel(file.uploadedAt || title.submittedAt),
      uploadedBy: file.uploadedByName || undefined
    }))
  };
}

function Badge({
  label,
  tone = 'neutral',
  icon
}: {
  label: string;
  tone?: BadgeTone;
  icon?: string;
}) {
  return (
    <span className={`ui-badge is-${tone} whitespace-nowrap`}>
      {icon ? <i className={`fas ${icon}`} aria-hidden="true" /> : null}
      {label}
    </span>
  );
}

export function StudentTitleSubmission({ data }: { data: StudentDashboardData }) {
  if (!data.group?.id) {
    const hasPendingInvite = !!data.profile.pendingGroupInviteId;
    return (
      <div className="student-title-registration-page">
        <header className="top-nav">
          <div className="top-nav-leading">
            <div className="page-title">
              <div className="page-title-context">
                <span className="page-kicker">Student Workspace</span>
                <span className="page-breadcrumb" aria-hidden="true">
                  <i className="fas fa-angle-right" />
                  <span>Title Submission</span>
                </span>
              </div>
              <h1>Title Submission</h1>
              <p>Submit and track your proposed thesis titles for adviser validation.</p>
            </div>
          </div>
        </header>

        <div className="page-body p-6">
          <div className="mx-auto mt-12 max-w-2xl rounded-[1.25rem] border border-[var(--border)] bg-[var(--surface)] p-12 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[var(--surface-alt)] text-[var(--text-meta)] shadow-sm">
              <i className={`fas ${hasPendingInvite ? 'fa-envelope-open-text text-blue-500' : 'fa-users-slash'} text-3xl`} aria-hidden="true" />
            </div>
            <h3 className="mt-6 text-2xl font-bold tracking-tight text-[var(--text)]">
              {hasPendingInvite ? 'Action Required: Group Invitation' : 'Group Assignment Required'}
            </h3>
            <p className="mx-auto mt-4 max-w-lg text-[var(--muted)] leading-relaxed">
              {hasPendingInvite
                ? 'You have a pending group invitation. You must accept the assignment before you can access the Title Submission workspace and submit proposals.'
                : 'You must be assigned to a project group before you can access the Title Submission workspace and submit proposals. Please contact your coordinator to be added to a group.'}
            </p>
            {hasPendingInvite && (
              <div className="mt-8">
                <Link prefetch={false} href="/students/notifications" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md hover:-translate-y-0.5">
                  <i className="fas fa-bell" aria-hidden="true" /> Review Invitation
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isLeader = Boolean(data.profile.groupRole && data.profile.groupRole.toLowerCase().includes('leader'));
  const canUpload = true;
  const initialSubmissions = useMemo(
    () => buildInitialSubmissions(data),
    [data]
  );
  const [submissions, setSubmissions] = useState<StudentTitleSubmissionRecord[]>(initialSubmissions);
  const [activeSubmissionId, setActiveSubmissionId] = useState(
    initialSubmissions.find((item) => item.isCurrent)?.id ?? initialSubmissions[0]?.id ?? ''
  );
  const [activeTab, setActiveTab] = useState('Details');
  const [customKeywordDraft, setCustomKeywordDraft] = useState('');
  const [notice, setNotice] = useState<NoticeState>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingTitles, setIsLoadingTitles] = useState(true);
  const [isSubmittingTitle, setIsSubmittingTitle] = useState(false);
  const [isFeedbackHighlighted, setIsFeedbackHighlighted] = useState(false);
  const [insightsTab, setInsightsTab] = useState<'Overview' | 'Feedback' | 'History'>('Overview');
  // Permanent title lock, decided by the server (src/lib/title-lock.ts): true
  // once the group has submitted. Every title/backup editing control is
  // replaced with a read-only view while this is true.
  const [titleLocked, setTitleLocked] = useState(false);
  const [titleHistory, setTitleHistory] = useState<Array<{
    id: string;
    previousTitle: string;
    updatedTitle: string;
    target: 'primary' | 'backup';
    remarks: string | null;
    changedBy: string;
    changedAt: string;
  }>>([]);
  type BackupTitleDraft = {
    id: string;
    title: string;
    description: string;
    keywords: string[];
    updatedAt: string;
    reviewStatus: 'PENDING' | 'APPROVED' | 'NEEDS_REVISION' | 'IN_REVIEW' | 'NOT_REQUIRED';
    reviewFeedback: string | null;
    isPriority: boolean;
    files: Array<{ id: string; name: string; url: string; fileType: string; size: number | null }>;
  };
  const MAX_BACKUP_DRAFTS = 5;
  const MIN_BACKUP_TITLES = 2;
  const [backupDrafts, setBackupDrafts] = useState<BackupTitleDraft[]>([]);
  const [isLoadingBackupDrafts, setIsLoadingBackupDrafts] = useState(true);
  const [isSavingBackupDraft, setIsSavingBackupDraft] = useState(false);
  const [deletingBackupDraftId, setDeletingBackupDraftId] = useState<string | null>(null);
  const [isUploadingBackupFile, setIsUploadingBackupFile] = useState(false);
  const [removingBackupFileId, setRemovingBackupFileId] = useState<string | null>(null);
  // Tracks which saved backup was last applied to the form via "Use this" /
  // "Use backup" — sent along on submit so the server can check whether it's
  // still an adviser-approved backup being submitted unmodified (see
  // handleSubmitProposal and POST /api/title-submissions' isPreApprovedSubmission
  // check). Cleared on any manual edit to the title/description/keywords below,
  // since that means it's no longer the exact content the adviser approved.
  const [appliedBackupDraftId, setAppliedBackupDraftId] = useState<string | null>(null);
  // The backup card used to save whatever was currently typed into the main
  // title form far below it on the page — confusing, since there was nothing
  // visually connecting the two. It now has its own small, self-contained
  // add/edit form so preparing a backup never requires touching the real
  // submission form at all. `null` = closed, `'new'` = adding, or a draft id =
  // editing that draft in place.
  const [backupFormMode, setBackupFormMode] = useState<'new' | string | null>(null);
  const [backupFormTitle, setBackupFormTitle] = useState('');
  const [backupFormDescription, setBackupFormDescription] = useState('');
  const [backupFormKeywords, setBackupFormKeywords] = useState('');
  // A brand-new backup has no id yet, so files picked while creating one can't
  // upload immediately — staged here and uploaded automatically right after
  // the draft itself is created, in the same Save Backup click.
  const [backupFormStagedFiles, setBackupFormStagedFiles] = useState<File[]>([]);
  const [isDraggingBackupFile, setIsDraggingBackupFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const backupFileInputRef = useRef<HTMLInputElement | null>(null);
  const detailsPanelRef = useRef<HTMLDivElement | null>(null);
  const adviserFeedbackRef = useRef<HTMLDivElement | null>(null);
  const feedbackHighlightTimerRef = useRef<number | null>(null);
  const createdObjectUrlsRef = useRef(new Set<string>());

  const handleRequestPermission = async () => {
    const leader = data.group.members.find((m) => m.isLeader);
    if (!leader?.user_id) {
      setNotice({ tone: 'danger', message: 'Could not identify the group leader.' });
      return;
    }

    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: leader.user_id,
          title: 'Upload Permission Request',
          message: `${data.profile.fullName} is requesting permission to upload title proposal files.`,
          type: 'info',
          entityType: 'group',
          entityId: data.group.id
        })
      });

      if (res.ok) {
        setNotice({ tone: 'success', message: `Upload permission request sent to ${data.group.leaderName}.` });
      } else {
        throw new Error('Failed to send request');
      }
    } catch (e) {
      setNotice({ tone: 'danger', message: 'Failed to send upload request.' });
    }
  };

  useEffect(() => {
    let cancelled = false;
    let pollInterval: NodeJS.Timeout;

    const loadRealTitleSubmissions = async (isBackground = false) => {
      if (!isBackground) setIsLoadingTitles(true);

      try {
        const response = await fetch('/api/title-submissions?page=1&limit=20', { cache: 'no-store' });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.message || 'Unable to load title submissions.');
        }

        // Server-decided lock (see src/lib/title-lock.ts): once submitted, the
        // page is read-only no matter what local state says.
        const isLocked = Boolean(payload?.titleLocked);
        const realSubmissions = (payload?.titles || []).map((title: any, index: number) =>
          mapApiTitleToSubmission(title, index, data)
        );

        if (!cancelled) {
          const nextSubmissions: StudentTitleSubmissionRecord[] = realSubmissions;
          setTitleLocked(isLocked);
          setTitleHistory(Array.isArray(payload?.titleHistory) ? payload.titleHistory : []);
          
          setSubmissions((currentSubmissions) => {
            const localSubmissions = isLocked ? [] : currentSubmissions.filter((s) =>
              s.id.startsWith('title-local-') && !isEmptyLocalDraftSubmission(s)
            );
            
            const mergedReal = nextSubmissions.map((nextSub) => {
              const currentSub = currentSubmissions.find((s) => s.id === nextSub.id);
              if (currentSub) {
                const localAttachments = currentSub.attachments.filter((a) => a.id.includes('local-'));
                return {
                  ...nextSub,
                  // preserve what the user is typing — unless locked, where the
                  // server copy (possibly edited by the adviser) is authoritative
                  proposedTitle: isLocked ? nextSub.proposedTitle : currentSub.proposedTitle,
                  briefDescription: isLocked ? nextSub.briefDescription : currentSub.briefDescription,
                  attachments: [
                    ...nextSub.attachments,
                    ...localAttachments.filter(la => !nextSub.attachments.some(na => na.fileName === la.fileName))
                  ]
                };
              }
              return nextSub;
            });

            if (mergedReal.length === 0 && localSubmissions.length === 0) {
              return currentSubmissions;
            }
            
            return [...localSubmissions, ...mergedReal];
          });

          if (!isBackground) {
            setActiveSubmissionId((currentId) => {
              if (currentId.startsWith('title-local-') && !isLocked) return currentId;
              const stillExists = nextSubmissions.some(s => s.id === currentId);
              return stillExists ? currentId : (nextSubmissions.find(item => item.isCurrent)?.id ?? nextSubmissions[0]?.id ?? '');
            });
          }
        }
      } catch (error) {
        if (!cancelled && !isBackground) {
          setSubmissions(initialSubmissions);
          setActiveSubmissionId((currentId) => {
            if (currentId.startsWith('title-local-')) return currentId;
            return initialSubmissions.find((item) => item.isCurrent)?.id ?? initialSubmissions[0]?.id ?? '';
          });
          setNotice({ tone: 'warning', message: error instanceof Error ? error.message : 'Unable to load title submissions.' });
        }
      } finally {
        if (!cancelled && !isBackground) {
          setIsLoadingTitles(false);
        }
      }
    };

    loadRealTitleSubmissions();
    
    return () => {
      cancelled = true;
    };
  }, [data, initialSubmissions]);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timer = window.setTimeout(() => setNotice(null), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(
    () => () => {
      createdObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      createdObjectUrlsRef.current.clear();
    },
    []
  );

  useEffect(
    () => () => {
      if (feedbackHighlightTimerRef.current !== null) {
        window.clearTimeout(feedbackHighlightTimerRef.current);
      }
    },
    []
  );

  const visibleSubmissions = submissions.filter(shouldShowProposalSubmission);
  const choosablePendingCount = submissions.filter(canChooseSubmission).length;

  // "Avg. Days" and "Approval" used to be permanently hardcoded to "N/A" — this
  // computes them for real from submissions the adviser has actually decided on
  // (Approved / Needs Revision / Rejected). Pending ones are excluded since their
  // "reviewed at" date is really just a submitted-at fallback, not a real review.
  const decidedSubmissions = submissions.filter((submission) =>
    ['Approved', 'Needs Revision', 'Rejected'].includes(submission.registrationStatus)
  );
  const avgReviewDaysLabel = decidedSubmissions.length
    ? `${Math.max(0, Math.round(
        decidedSubmissions.reduce((sum, submission) => {
          const days = (new Date(submission.lastReviewedAt).getTime() - new Date(submission.created_at).getTime()) / (1000 * 60 * 60 * 24);
          return sum + Math.max(0, days);
        }, 0) / decidedSubmissions.length
      ))}`
    : 'N/A';
  const approvalRateLabel = decidedSubmissions.length
    ? `${Math.round((decidedSubmissions.filter((submission) => submission.registrationStatus === 'Approved').length / decidedSubmissions.length) * 100)}%`
    : 'N/A';
  const activeSubmission =
    visibleSubmissions.find((submission) => submission.id === activeSubmissionId) ??
    visibleSubmissions[0] ??
    submissions.find((submission) => submission.id === activeSubmissionId) ??
    submissions[0] ??
    null;

  // Keep activeSubmissionId aligned when refreshes remove local-only drafts.
  useEffect(() => {
    if (activeSubmission && activeSubmission.id !== activeSubmissionId) {
      setActiveSubmissionId(activeSubmission.id);
    }
  }, [activeSubmission, activeSubmissionId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch('/api/title-drafts', { cache: 'no-store' });
        if (!response.ok) return;
        const payload = await response.json();
        if (!cancelled) {
          setBackupDrafts(Array.isArray(payload.drafts) ? payload.drafts : []);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingBackupDrafts(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const openNewBackupForm = () => {
    if (backupDrafts.length >= MAX_BACKUP_DRAFTS) {
      setNotice({ tone: 'warning', message: `You can keep at most ${MAX_BACKUP_DRAFTS} backup titles. Delete one before adding another.` });
      return;
    }
    setBackupFormTitle('');
    setBackupFormDescription('');
    setBackupFormKeywords('');
    setBackupFormStagedFiles([]);
    setBackupFormMode('new');
  };

  const openEditBackupForm = (draft: BackupTitleDraft) => {
    setBackupFormTitle(draft.title);
    setBackupFormDescription(draft.description);
    setBackupFormKeywords(draft.keywords.join(', '));
    setBackupFormStagedFiles([]);
    setBackupFormMode(draft.id);
  };

  const closeBackupForm = () => {
    setBackupFormMode(null);
    setBackupFormTitle('');
    setBackupFormDescription('');
    setBackupFormKeywords('');
    setBackupFormStagedFiles([]);
  };

  const handleSubmitBackupForm = async () => {
    const title = backupFormTitle.trim();
    if (!title) {
      setNotice({ tone: 'warning', message: 'Enter a title before saving it as a backup.' });
      return;
    }

    const keywords = backupFormKeywords
      .split(',')
      .map((keyword) => keyword.trim())
      .filter(Boolean);
    const isEditing = backupFormMode && backupFormMode !== 'new';
    const stagedFiles = backupFormStagedFiles;

    setIsSavingBackupDraft(true);
    try {
      const response = await fetch(isEditing ? `/api/title-drafts/${backupFormMode}` : '/api/title-drafts', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: backupFormDescription.trim(), keywords })
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to save this backup title.');
      }

      setBackupDrafts((current) =>
        isEditing
          ? current.map((draft) => (draft.id === payload.draft.id ? payload.draft : draft))
          : [payload.draft, ...current]
      );
      setBackupFormStagedFiles([]);

      // Files can already be attached before saving (staged, then uploaded
      // automatically right here) — so a brand-new backup no longer needs to
      // stay open afterward the way it used to. Close it, same as clicking
      // Done. Editing an existing one still stays open, since that upload
      // area is its normal working state, not a one-time post-create step.
      if (!isEditing && stagedFiles.length > 0) {
        const uploaded = await handleUploadBackupFiles(payload.draft.id, stagedFiles, { silent: true });
        setNotice({
          tone: uploaded ? 'success' : 'warning',
          message: uploaded
            ? 'Saved with attached files — sent to your adviser for review.'
            : 'Backup saved, but the attached files failed to upload. Edit it to try again.'
        });
      } else {
        setNotice({ tone: 'success', message: isEditing ? 'Backup title updated.' : 'Saved as a backup title.' });
      }

      if (isEditing) {
        setBackupFormMode(payload.draft.id);
      } else {
        closeBackupForm();
      }
    } catch (error) {
      setNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Unable to save this backup title.' });
    } finally {
      setIsSavingBackupDraft(false);
    }
  };

  const handleApplyBackupDraft = (draft: BackupTitleDraft) => {
    updateActiveSubmission((submission) => ({
      ...submission,
      proposedTitle: draft.title,
      briefDescription: draft.description,
      keywords: draft.keywords
    }));
    setAppliedBackupDraftId(draft.id);
    setNotice({
      tone: 'info',
      message: draft.reviewStatus === 'APPROVED'
        ? draft.files.length
          ? 'Adviser-approved backup loaded, files included — submit it as-is to skip waiting for another review.'
          : 'Adviser-approved backup loaded — submit it as-is to skip waiting for another review.'
        : 'Backup title loaded into the form below — review it before submitting.'
    });
  };

  const handleDeleteBackupDraft = async (draftId: string) => {
    setDeletingBackupDraftId(draftId);
    try {
      const response = await fetch(`/api/title-drafts/${draftId}`, { method: 'DELETE' });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || 'Unable to delete this backup title.');
      }
      setBackupDrafts((current) => current.filter((draft) => draft.id !== draftId));
    } catch (error) {
      setNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Unable to delete this backup title.' });
    } finally {
      setDeletingBackupDraftId(null);
    }
  };

  const handleUploadBackupFiles = async (draftId: string, files: File[], options?: { silent?: boolean }) => {
    if (!files.length) {
      return true;
    }

    setIsUploadingBackupFile(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));

      const response = await fetch(`/api/title-drafts/${draftId}/files`, {
        method: 'POST',
        body: formData
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to upload this file.');
      }

      setBackupDrafts((current) =>
        current.map((draft) =>
          draft.id === draftId
            ? { ...draft, files: [...draft.files, ...payload.files], reviewStatus: 'PENDING', reviewFeedback: null }
            : draft
        )
      );
      if (!options?.silent) {
        setNotice({ tone: 'success', message: 'File attached — sent back to your adviser for review.' });
      }
      return true;
    } catch (error) {
      setNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Unable to upload this file.' });
      return false;
    } finally {
      setIsUploadingBackupFile(false);
    }
  };

  const handleRemoveBackupFile = async (draftId: string, fileId: string) => {
    setRemovingBackupFileId(fileId);
    try {
      const response = await fetch(`/api/title-drafts/files/${fileId}`, { method: 'DELETE' });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || 'Unable to remove this file.');
      }

      setBackupDrafts((current) =>
        current.map((draft) =>
          draft.id === draftId
            ? { ...draft, files: draft.files.filter((file) => file.id !== fileId), reviewStatus: 'PENDING', reviewFeedback: null }
            : draft
        )
      );
    } catch (error) {
      setNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Unable to remove this file.' });
    } finally {
      setRemovingBackupFileId(null);
    }
  };

  // Radio-style: starring one clears the flag on every other backup, so
  // there's always at most one "this is my best one" pick. The server enforces
  // the exclusivity too (see PATCH /api/title-drafts/[id]) — this local update
  // just mirrors it immediately instead of waiting on a refetch.
  const handleTogglePriorityBackupDraft = async (draft: BackupTitleDraft) => {
    const nextIsPriority = !draft.isPriority;

    setBackupDrafts((current) =>
      current.map((item) => ({ ...item, isPriority: item.id === draft.id ? nextIsPriority : nextIsPriority ? false : item.isPriority }))
    );

    try {
      const response = await fetch(`/api/title-drafts/${draft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPriority: nextIsPriority })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || 'Unable to update your priority pick.');
      }
    } catch (error) {
      setNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Unable to update your priority pick.' });
      // Roll back to what the server actually last confirmed.
      setBackupDrafts((current) => current.map((item) => (item.id === draft.id ? { ...item, isPriority: draft.isPriority } : item)));
    }
  };

  const revisionHistory = useMemo(
    () => (activeSubmission ? sortByDateDesc(activeSubmission.revisionHistory) : []),
    [activeSubmission]
  );
  const reviewerFeedback = useMemo(
    () => (activeSubmission ? sortByDateDesc(activeSubmission.reviewerFeedback ?? []) : []),
    [activeSubmission]
  );
  const workflow = useMemo(
    () =>
      activeSubmission
        ? activeSubmission.workflow?.length
          ? activeSubmission.workflow
          : buildFallbackWorkflow(activeSubmission)
        : [],
    [activeSubmission]
  );

  const totalAttachments = submissions.reduce((count, submission) => count + submission.attachments.length, 0);
  const pendingReviewCount = submissions.filter((submission) =>
    ['pending review', 'submitted', 'resubmitted', 'under review'].includes(
      submission.registrationStatus.toLowerCase()
    )
  ).length;
  const approvedCount = submissions.filter(
    (submission) => submission.registrationStatus.toLowerCase() === 'approved'
  ).length;
  const rejectedCount = submissions.filter(
    (submission) => submission.registrationStatus.toLowerCase() === 'rejected'
  ).length;
  // Find the most recent rejected/needs-revision submission for the status banner
  const latestRejectedSubmission = submissions.find(
    (s) => ['rejected', 'needs revision'].includes(s.registrationStatus.toLowerCase())
  );
  const latestApprovedSubmission = submissions.find(
    (s) => s.registrationStatus.toLowerCase() === 'approved'
  );
  const isViewingDraft = activeSubmission ? isDraftSubmission(activeSubmission) : false;
  const showRejectionBanner = !!latestRejectedSubmission && isViewingDraft;
  const showApprovalBanner = !!latestApprovedSubmission && isViewingDraft && !latestRejectedSubmission;

  // Title as typed (ignoring the placeholder used before a project exists).
  const rawTitle = activeSubmission?.proposedTitle ?? '';
  const typedTitle = rawTitle === 'No active project' ? '' : rawTitle.trim();

  if (!activeSubmission) {
    return null;
  }

  const trackedSubmissions = visibleSubmissions.length ? visibleSubmissions : submissions;
  const latestVisibleUpdatedSubmission = [...trackedSubmissions].sort(
    (left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
  )[0];

  const titleStatusTone = getStatusTone(activeSubmission.registrationStatus);
  const adviserStatusToneClasses = getToneSurfaceClasses(titleStatusTone);
  const lastReviewedLabel = revisionHistory[0]?.dateLabel ?? formatDateLabel(activeSubmission.lastReviewedAt);
  const latestReviewer =
    activeSubmission.reviewSummary?.lastReviewedBy ??
    reviewerFeedback[0]?.author ??
    revisionHistory[0]?.reviewedBy ??
    'Awaiting review';
  const latestAction =
    activeSubmission.reviewSummary?.latestAction ?? revisionHistory[0]?.status ?? 'Awaiting adviser action';
  const accessRoleLabel =
    activeSubmission.reviewSummary?.accessRole ?? (isLeader ? 'Group leader access' : 'Member view');
  const accessNote =
    activeSubmission.reviewSummary?.accessNote ??
    (isLeader
      ? 'Only the group leader can submit official title packages for review.'
      : `Coordinate with ${data.group.leaderName} for official title updates.`);
  const nextStep =
    activeSubmission.reviewSummary?.nextStep ??
    'Complete the required proposal package and wait for adviser validation once submitted.';
  const currentWorkflowStep =
    workflow.find((step) => ['current', 'needs_revision', 'rejected'].includes(step.status)) ??
    workflow.find((step) => step.status === 'pending') ??
    workflow[workflow.length - 1] ??
    null;
  const nextWorkflowStep =
    workflow.find((step) => step.status === 'pending' || step.status === 'archived') ?? null;
  const latestAttachment = activeSubmission.attachments[0] ?? null;

  const heroStats = [
    {
      id: 'proposals',
      label: 'Tracked title proposals',
      value: `${trackedSubmissions.length}`,
      note:
        trackedSubmissions.length > 1
          ? 'Students can prepare and compare multiple title proposals in one workspace.'
          : 'Add another proposal to compare alternative title directions before adviser review.'
    },
    {
      id: 'pending',
      label: 'Needs review',
      value: pendingReviewCount ? `${pendingReviewCount}` : 'Clear',
      note: pendingReviewCount
        ? `${pendingReviewCount} proposal package${pendingReviewCount === 1 ? '' : 's'} waiting for adviser action.`
        : 'No title package is currently waiting in the review queue.'
    },
    {
      id: 'approved',
      label: 'Approved titles',
      value: `${approvedCount}`,
      note: approvedCount
        ? `${approvedCount} proposal${approvedCount === 1 ? '' : 's'} already cleared for the project record.`
        : 'Approved titles will appear here once adviser validation is completed.'
    },
    {
      id: 'attachments',
      label: 'Proposal files',
      value: `${totalAttachments}`,
      note: latestVisibleUpdatedSubmission
        ? `${latestVisibleUpdatedSubmission.proposalLabel} was last updated ${formatDateTimeLabel(latestVisibleUpdatedSubmission.updated_at)}.`
        : 'Upload the title package so each proposal has a supporting file record.'
    }
  ];

  const hasApprovedTitle = approvedCount > 0;

  const formSummaryItems = [
    {
      id: 'updated',
      label: 'Last updated',
      value: formatDateLabel(activeSubmission.updated_at),
      note: `${activeSubmission.attachments.length} attachment${activeSubmission.attachments.length === 1 ? '' : 's'} linked`
    },
    {
      id: 'workflow',
      label: 'Workflow stage',
      value: currentWorkflowStep?.title ?? getTitleStatusDisplay(activeSubmission.registrationStatus),
      note: currentWorkflowStep?.note ?? 'Workflow state updates will appear here.'
    },
    {
      id: 'active-file',
      label: 'Latest file',
      value: latestAttachment?.fileName ?? 'No file attached yet',
      note: latestAttachment
        ? `${latestAttachment.fileType} | ${latestAttachment.sizeLabel}`
        : 'Upload the title proposal document to prepare this record for submission.'
    }
  ];

  const statusMetaItems = [
    { id: 'reviewer', label: 'Latest reviewer', value: latestReviewer, note: latestAction },
    { id: 'review-date', label: 'Last review date', value: lastReviewedLabel, note: activeSubmission.statusNote },
    {
      id: 'next-step',
      label: 'Next step',
      value: nextWorkflowStep?.title ?? 'Archive-ready monitoring',
      note: nextStep
    },
    { id: 'role', label: 'Access role', value: accessRoleLabel, note: accessNote }
  ];


  const updateActiveSubmission = (
    updater: (submission: StudentTitleSubmissionRecord) => StudentTitleSubmissionRecord
  ) => {
    setSubmissions((current) =>
      current.map((submission) =>
        submission.id === activeSubmission.id ? updater(submission) : submission
      )
    );
  };

  const handleAddCustomKeyword = () => {
    const trimmed = customKeywordDraft.trim();

    if (!trimmed || activeSubmission.keywords.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
      setCustomKeywordDraft('');
      return;
    }

    updateActiveSubmission((submission) => ({ ...submission, keywords: [...submission.keywords, trimmed] }));
    setCustomKeywordDraft('');
    setAppliedBackupDraftId(null);
  };

  const handleRemoveKeyword = (keyword: string) => {
    updateActiveSubmission((submission) => ({
      ...submission,
      keywords: submission.keywords.filter((item) => item !== keyword)
    }));
    setAppliedBackupDraftId(null);
  };

  const handleSelectSubmission = (submissionId: string) => {
    setActiveSubmissionId(submissionId);
    setSubmissions((current) =>
      current.map((submission) => ({
        ...submission,
        isCurrent: submission.id === submissionId
      }))
    );
  };

  const handleCreateSubmission = () => {
    if (titleLocked) {
      setNotice({ tone: 'info', message: 'Your title proposal is submitted and locked. Contact your adviser if the title needs to change.' });
      return;
    }

    if (!canUpload) {
      setNotice({
        tone: 'warning',
        message: 'Only authorized group members can create a new title proposal.'
      });
      return;
    }

    const hasEmptyDraft = submissions.some(isEmptyLocalDraftSubmission);

    if (hasEmptyDraft) {
      setNotice({
        tone: 'warning',
        message: 'You already have an empty draft proposal. Please use it or delete it first.'
      });
      return;
    }

    const nextProposalNumber =
      submissions.reduce((highest, submission) => Math.max(highest, submission.proposalNumber), 0) + 1;
    const draftSubmission = createDraftSubmission(data, nextProposalNumber, isLeader);

    setSubmissions((current) => [
      draftSubmission,
      ...current.map((submission) => ({
        ...submission,
        isCurrent: false
      }))
    ]);
    setActiveSubmissionId(draftSubmission.id);
    setNotice({
      tone: 'info',
      message: `${draftSubmission.proposalLabel} is ready. Upload the title proposal file to prepare it for review.`
    });
  };

  const handleDeleteDraftSubmission = (submissionIdToDelete?: string) => {
    const targetId = typeof submissionIdToDelete === 'string' ? submissionIdToDelete : activeSubmissionId;
    const targetSubmission = submissions.find(s => s.id === targetId);

    if (!targetSubmission || !canDeleteDraftSubmission(targetSubmission)) {
      setNotice({
        tone: 'warning',
        message: 'Only unsent draft title proposals can be deleted.'
      });
      return;
    }

    const shouldDelete = window.confirm(`Delete ${targetSubmission.proposalLabel}? Attached files in this draft will be removed from this session.`);
    if (!shouldDelete) {
      return;
    }

    targetSubmission.attachments.forEach((attachment) => {
      if (attachment.downloadUrl) {
        URL.revokeObjectURL(attachment.downloadUrl);
        createdObjectUrlsRef.current.delete(attachment.downloadUrl);
      }
    });

    const remainingSubmissions = submissions.filter((submission) => submission.id !== targetSubmission.id);

    if (!remainingSubmissions.length) {
      const draftSubmission = createDraftSubmission(data, 1, isLeader);
      setSubmissions([draftSubmission]);
      setActiveSubmissionId(draftSubmission.id);
      setNotice({
        tone: 'info',
        message: `${targetSubmission.proposalLabel} was deleted. A new draft is ready.`
      });
      return;
    }

    if (targetId === activeSubmissionId) {
      const nextActiveSubmission = remainingSubmissions[0];
      setSubmissions(
        remainingSubmissions.map((submission) => ({
          ...submission,
          isCurrent: submission.id === nextActiveSubmission.id
        }))
      );
      setActiveSubmissionId(nextActiveSubmission.id);
    } else {
      setSubmissions(remainingSubmissions);
    }

    setNotice({
      tone: 'success',
      message: `${targetSubmission.proposalLabel} draft was deleted.`
    });
  };

  const [isChoosingTitle, setIsChoosingTitle] = useState(false);

  const handleChooseTitle = async (submissionId: string) => {
    const target = submissions.find((submission) => submission.id === submissionId);
    if (!target || !canChooseSubmission(target) || isChoosingTitle) {
      return;
    }

    const otherPendingCount = submissions.filter(
      (submission) => submission.id !== submissionId && canChooseSubmission(submission)
    ).length;

    const confirmed = window.confirm(
      otherPendingCount
        ? `Choose "${target.proposedTitle || target.proposalLabel}" as your group's final title? Your other ${otherPendingCount} pending proposal${otherPendingCount === 1 ? '' : 's'} will be withdrawn.`
        : `Choose "${target.proposedTitle || target.proposalLabel}" as your group's final title?`
    );
    if (!confirmed) {
      return;
    }

    setIsChoosingTitle(true);

    try {
      const response = await fetch(`/api/title-submissions/${submissionId}/choose`, { method: 'POST' });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to choose this title.');
      }

      setSubmissions((current) =>
        current.map((submission) => {
          if (submission.id === submissionId || !canChooseSubmission(submission)) {
            return submission;
          }
          return { ...submission, registrationStatus: 'Withdrawn' };
        })
      );
      setNotice({
        tone: 'success',
        message: `${target.proposalLabel} is now your group's chosen title. Your adviser has been notified.`
      });
    } catch (error) {
      setNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Unable to choose this title.' });
    } finally {
      setIsChoosingTitle(false);
    }
  };

  const handleBrowseAttachments = () => {
    if (!canUpload) {
      setNotice({
        tone: 'warning',
        message: 'Only authorized users can upload proposal files.'
      });
      return;
    }
    fileInputRef.current?.click();
  };

  const processFiles = (filesList: FileList | File[]) => {
    if (!canUpload) {
      setNotice({
        tone: 'warning',
        message: 'Only authorized users can upload files.'
      });
      return;
    }

    const files = Array.from(filesList);

    if (!files.length) {
      return;
    }

    const attachments = files.map((file) => {
      const downloadUrl = URL.createObjectURL(file);
      createdObjectUrlsRef.current.add(downloadUrl);
      return createAttachmentFromFile(file, data.profile.fullName, downloadUrl);
    });

    updateActiveSubmission((submission) => ({
      ...submission,
      proposedTitle:
        submission.proposedTitle.trim() || deriveTitleFromFileName(files[0]?.name || 'Untitled title proposal'),
      attachments: [...attachments, ...submission.attachments],
      updated_at: new Date().toISOString()
    }));

    setNotice({
      tone: 'success',
      message: `${files.length} proposal file${files.length === 1 ? '' : 's'} attached to ${activeSubmission.proposalLabel}.`
    });
  };

  const handleAttachmentInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      processFiles(event.target.files);
    }
    event.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (canUpload) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!canUpload) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    updateActiveSubmission((submission) => {
      const attachmentToRemove = submission.attachments.find((attachment) => attachment.id === attachmentId);

      if (attachmentToRemove?.downloadUrl) {
        URL.revokeObjectURL(attachmentToRemove.downloadUrl);
        createdObjectUrlsRef.current.delete(attachmentToRemove.downloadUrl);
      }

      return {
        ...submission,
        attachments: submission.attachments.filter((attachment) => attachment.id !== attachmentId),
        updated_at: new Date().toISOString()
      };
    });
  };

  // Students view their concept paper in the browser; they don't get a
  // download link. PDFs and images open inline via /preview; Word/PowerPoint
  // files go through a short-lived signed URL rendered by the online viewer
  // (same path the adviser's review drawer uses).
  const handleViewAttachment = async (attachment: StudentTitleAttachment) => {
    const url = attachment.downloadUrl;

    if (!url) {
      return;
    }

    // Not uploaded yet (still a local draft file) — open the in-browser copy.
    if (url.startsWith('blob:')) {
      window.open(url, '_blank', 'noopener');
      return;
    }

    if (getFilePreviewKind(attachment.fileName) !== 'office') {
      window.open(`/api/document-files/${attachment.id}/preview`, '_blank', 'noopener');
      return;
    }

    // Opened before the await so the browser doesn't treat it as a pop-up.
    const viewer = window.open('', '_blank');

    try {
      const response = await fetch(`/api/document-files/${attachment.id}/signed-url`, { method: 'POST' });
      const payload = await response.json().catch(() => null);
      const viewUrl = response.ok ? getSignedUrlPreview(attachment.fileName, payload?.signedUrl) : null;

      if (!viewUrl) {
        throw new Error(payload?.message || 'A preview isn’t available for this file.');
      }

      if (viewer) {
        viewer.location.href = viewUrl;
      } else {
        window.open(viewUrl, '_blank', 'noopener');
      }
    } catch (error) {
      viewer?.close();
      setNotice({ tone: 'warning', message: error instanceof Error ? error.message : 'A preview isn’t available for this file.' });
    }
  };

  const handleOpenAttachment = (attachment?: StudentTitleAttachment | null) => {
    if (!attachment?.downloadUrl) {
      setNotice({
        tone: 'info',
        message: 'Preview is available for files uploaded in this session.'
      });
      return;
    }

    window.open(attachment.downloadUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadAttachment = (attachment?: StudentTitleAttachment | null) => {
    if (!attachment?.downloadUrl) {
      setNotice({
        tone: 'info',
        message: 'Download is available for files uploaded in this session.'
      });
      return;
    }

    const link = document.createElement('a');
    link.href = attachment.downloadUrl;
    link.download = attachment.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleSubmitProposal = async (event?: FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault();

    if (!canUpload) {
      setNotice({
        tone: 'warning',
        message: `Only ${data.group.leaderName} can submit the official title proposal package.`
      });
      return;
    }

    if (!activeSubmission.keywords.length) {
      setNotice({
        tone: 'warning',
        message: 'Add at least one research type or technology tag before submission.'
      });
      return;
    }

    // A pre-approved backup's own attached files carry over automatically on
    // submit (re-parented server-side, see POST /api/title-submissions) — so
    // applying one that already has files satisfies this requirement without
    // needing a fresh attachment here too.
    if (!activeSubmission.attachments.length && !appliedBackupCarriesFiles) {
      setNotice({
        tone: 'warning',
        message: 'Attach at least one title proposal document before submission.'
      });
      return;
    }

    const submittedAt = new Date().toISOString();
    const revisionLabel = activeSubmission.revisionHistory.length ? 'Resubmitted' : 'Submitted';
    const submittedTitle = activeSubmission.proposedTitle.trim()
      || deriveTitleFromFileName(activeSubmission.attachments[0]?.fileName || '')
      || `${activeSubmission.proposalLabel} Title Proposal`;

    setIsSubmittingTitle(true);

    try {
      const formData = new FormData();
      formData.append('title', submittedTitle);
      formData.append('description', activeSubmission.briefDescription.trim() || 'Title proposal document uploaded for adviser review.');
      formData.append('keywords', JSON.stringify(activeSubmission.keywords));
      if (appliedBackupDraftId) {
        formData.append('backupDraftId', appliedBackupDraftId);
      }

      activeSubmission.attachments.forEach((fileObj) => {
        if (fileObj.file) {
          formData.append('files', fileObj.file);
        }
      });

      const response = await fetch('/api/title-submissions', {
        method: 'POST',
        body: formData
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to submit the title proposal.');
      }

      setAppliedBackupDraftId(null);

      const realSubmission = mapApiTitleToSubmission(payload.title, 0, data);
      realSubmission.attachments = activeSubmission.attachments;
      realSubmission.revisionHistory = [
        {
          id: `${realSubmission.id}-submission-${Date.now()}`,
          status: revisionLabel,
          date: submittedAt,
          dateLabel: formatDateLabel(submittedAt),
          note: `${realSubmission.proposalLabel} was submitted with ${activeSubmission.attachments.length} attached proposal file${activeSubmission.attachments.length === 1 ? '' : 's'} for adviser validation.`,
          reviewedBy: 'Student Group'
        },
        ...realSubmission.revisionHistory
      ];

      setSubmissions((current) => [
        realSubmission,
        ...current
          .filter((submission) => submission.id !== activeSubmission.id)
          .map((submission) => ({ ...submission, isCurrent: false }))
      ]);
      setActiveSubmissionId(realSubmission.id);
      setNotice({
        tone: 'success',
        message: `${realSubmission.proposalLabel} was submitted to your adviser.`
      });
      window.dispatchEvent(new Event('thesistrack:notifications-updated'));
    } catch (error) {
      setNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Unable to submit the title proposal.' });
    } finally {
      setIsSubmittingTitle(false);
    }
  };

  const computeTimelineStep = (submission: StudentTitleSubmissionRecord) => {
    const status = submission.registrationStatus.toLowerCase();
    if (status === 'archived') return 4;
    if (status === 'approved') return 4;
    // Withdrawn lands on the same track position as rejected — it reached a
    // terminal decision point, just one the student made rather than the
    // adviser. Without this it fell through to "Uploaded," implying a
    // withdrawn proposal was just sitting unsent, which it wasn't.
    if (status === 'under review' || status === 'needs revision' || status === 'rejected' || status === 'withdrawn') return 3;
    if (['pending review', 'submitted', 'resubmitted'].includes(status)) return 2;
    if (submission.attachments.length > 0) return 1;
    return 0; // Draft
  };

  const currentStepIndex = computeTimelineStep(activeSubmission);

  const TIMELINE_STEPS = [
    { id: 0, label: 'Draft', icon: 'fa-pen-to-square' },
    { id: 1, label: 'Uploaded', icon: 'fa-file-arrow-up' },
    { id: 2, label: 'Submitted', icon: 'fa-paper-plane' },
    {
      id: 3,
      label: activeSubmission.registrationStatus.toLowerCase() === 'rejected' ? 'Rejected' :
             activeSubmission.registrationStatus.toLowerCase() === 'needs revision' ? 'Revise' :
             activeSubmission.registrationStatus.toLowerCase() === 'withdrawn' ? 'Withdrawn' : 'Under Review',
      icon: activeSubmission.registrationStatus.toLowerCase() === 'rejected' ? 'fa-ban' :
            activeSubmission.registrationStatus.toLowerCase() === 'needs revision' ? 'fa-rotate-left' :
            activeSubmission.registrationStatus.toLowerCase() === 'withdrawn' ? 'fa-box-archive' : 'fa-magnifying-glass'
    },
    { id: 4, label: TITLE_CLEARED_LABEL, icon: 'fa-person-chalkboard' }
  ];
  const submissionProgressPercent = Math.min(
    100,
    Math.max(0, Math.round((currentStepIndex / Math.max(1, TIMELINE_STEPS.length - 1)) * 100))
  );
  const normalizedRegistrationStatus = activeSubmission.registrationStatus.toLowerCase();
  const hasFeedbackAction = normalizedRegistrationStatus === 'rejected' || normalizedRegistrationStatus === 'needs revision';
  const primaryProgressPercent = hasFeedbackAction ? Math.min(submissionProgressPercent, 52) : submissionProgressPercent;
  const titleProgressStyle = {
    '--title-progress': `${submissionProgressPercent}%`,
    '--title-primary-progress': `${primaryProgressPercent}%`,
    '--title-accent-start': hasFeedbackAction ? `${primaryProgressPercent}%` : `${submissionProgressPercent}%`,
    '--title-progress-value': submissionProgressPercent
  } as CSSProperties;
  const isApprovedTimeline = normalizedRegistrationStatus === 'approved';
  const getTimelineStateLabel = (stepId: number, isCompleted: boolean, isCurrent: boolean) => {
    if (isCompleted) {
      return 'Complete';
    }

    if (isCurrent) {
      if (normalizedRegistrationStatus === 'needs revision') return 'Revise';
      if (normalizedRegistrationStatus === 'rejected') return 'Rejected';
      if (stepId === 0) return 'Preparing';
      if (stepId === 1) return 'File attached';
      if (stepId === 2) return 'Submitted';
      if (stepId === 3) return 'Adviser reviewing';
      return TITLE_CLEARED_LABEL;
    }

    if (stepId === 1) return 'Needs file';
    if (stepId === 2) return 'Not submitted';
    if (stepId === 3) return 'Awaiting adviser';
    if (stepId === 4) return 'Decision pending';
    return 'Pending';
  };
  const hasTitle = Boolean(activeSubmission.proposedTitle.trim());
  const hasResearchType = activeSubmission.keywords.length > 0;
  // A title proposal is 1 primary + at least MIN_BACKUP_TITLES backups, all
  // different (the server enforces the same rule on submit). Only drafts are
  // gated — once submitted, the whole proposal is locked anyway.
  const normalizeTitleKey = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();
  const backupTitleKeys = backupDrafts.map((draft) => normalizeTitleKey(draft.title));
  const hasDuplicateTitles =
    new Set([normalizeTitleKey(activeSubmission.proposedTitle), ...backupTitleKeys]).size !== backupTitleKeys.length + 1;
  const backupTitlesStillNeeded = Math.max(0, MIN_BACKUP_TITLES - backupDrafts.length);
  const needsBackupTitle =
    !titleLocked && normalizedRegistrationStatus === 'draft' && (backupTitlesStillNeeded > 0 || hasDuplicateTitles);
  // 20% repository similarity rule: the primary title and every backup title
  // must each be at or below the limit (the server repeats this check on submit).
  const titlesTooSimilar = titleLocked || normalizedRegistrationStatus !== 'draft'
    ? []
    : [
        { label: 'Primary title', title: activeSubmission.proposedTitle },
        ...backupDrafts.map((draft, index) => ({ label: `Backup title ${index + 1}`, title: draft.title }))
      ]
        .filter((item) => item.title.trim())
        .map((item) => ({ ...item, highest: checkTitleAgainstRepository(item.title).highest }))
        .filter((item) => item.highest > REPOSITORY_SIMILARITY_LIMIT);
  const isDetailsComplete = hasTitle && hasResearchType && !needsBackupTitle && titlesTooSimilar.length === 0;
  const hasDocuments = activeSubmission.attachments.length > 0;
  // Mirrors the same check in handleSubmitProposal — used here to show a hint
  // instead of leaving the dropzone looking unfulfilled when it actually isn't.
  const appliedBackupDraft = appliedBackupDraftId ? backupDrafts.find((draft) => draft.id === appliedBackupDraftId) ?? null : null;
  const appliedBackupCarriesFiles = Boolean(appliedBackupDraft?.files.length);
  const canSubmitProposal = canUpload && !isSubmittingTitle && hasDocuments && isDetailsComplete;
  // The submit banner's "ready?" message used to always blame the concept paper,
  // even when the title or the (now-required) research type tag was what was
  // actually missing — this lists whatever's genuinely still outstanding.
  const missingBeforeSubmit = [
    !hasTitle ? 'a proposed title' : null,
    !hasResearchType ? 'a research type tag' : null,
    backupTitlesStillNeeded > 0 && needsBackupTitle
      ? `${backupTitlesStillNeeded} more backup title${backupTitlesStillNeeded === 1 ? '' : 's'}`
      : null,
    hasDuplicateTitles && needsBackupTitle ? 'distinct titles (no duplicates)' : null,
    titlesTooSimilar.length
      ? `revised titles at or below ${REPOSITORY_SIMILARITY_LIMIT}% repository similarity (${titlesTooSimilar.map((item) => `${item.label} ${item.highest}%`).join(', ')})`
      : null,
    !hasDocuments ? 'your concept paper' : null
  ].filter((item): item is string => Boolean(item));
  const draftReadinessMessage = missingBeforeSubmit.length
    ? `Add ${missingBeforeSubmit.join(', ')} before submitting.`
    : 'Everything is ready — submit when you are.';
  const nextActionLabel =
    currentStepIndex === 0
      ? 'Upload concept paper'
      : currentStepIndex === 1
        ? 'Submit for adviser review'
        : currentStepIndex >= 4
          ? 'Title approved'
          : normalizedRegistrationStatus === 'needs revision'
            ? 'Revise and resubmit'
            : normalizedRegistrationStatus === 'rejected'
              ? 'Prepare new title'
              : 'Wait for adviser review';
  const readinessItems = [
    {
      id: 'title',
      label: 'Proposed title',
      detail: hasTitle ? 'Ready for the proposal package' : 'Enter the official title before upload',
      complete: hasTitle
    },
    {
      id: 'research-type',
      label: 'Research type',
      detail: hasResearchType
        ? `${activeSubmission.keywords.length} tag${activeSubmission.keywords.length === 1 ? '' : 's'} added`
        : 'Tag at least one research type or technology',
      complete: hasResearchType
    },
    {
      id: 'documents',
      label: 'Concept paper',
      detail: hasDocuments
        ? `${activeSubmission.attachments.length} file${activeSubmission.attachments.length === 1 ? '' : 's'} attached`
        : 'Attach a PDF or DOCX concept paper',
      complete: hasDocuments
    },
    {
      id: 'submission',
      label: 'Review request',
      detail: normalizedRegistrationStatus === 'draft' ? 'Not yet sent to adviser' : getTitleStatusDisplay(activeSubmission.registrationStatus),
      complete: normalizedRegistrationStatus !== 'draft'
    }
  ];
  // Split into what's actually tracked (title text, a file present) versus what's
  // just reference material — the old version showed all 8 as individual
  // checkmarks that flipped together off one boolean, implying section-by-section
  // tracking inside the uploaded file that doesn't exist.
  const documentChecklistItems = [
    { id: 'title', label: 'Title', complete: hasTitle },
    { id: 'concept-paper', label: 'Concept paper uploaded', complete: hasDocuments }
  ];
  const conceptPaperReferenceItems = [
    'Background of the study',
    'Statement of the problem',
    'Objectives of the study',
    'Significance of the study',
    'Scope and limitations',
    'Conceptual framework',
    'References'
  ];
  const titleSubmissionTabs = [
    { id: 'Details', icon: 'fa-pen-to-square' },
    { id: 'Documents', icon: 'fa-file-arrow-up' }
  ];
  const timelineDateSource = activeSubmission.lastReviewedAt || activeSubmission.updated_at;
  const timelineDateLabel = formatShortDateLabel(timelineDateSource);
  const timelineTimeLabel = formatTimeLabel(timelineDateSource);
  const reviewProgressLabel = isApprovedTimeline ? 'Completed' : hasFeedbackAction ? 'Action Required' : 'In Progress';
  const reviewProgressTone = isApprovedTimeline ? 'is-complete' : hasFeedbackAction ? 'is-warning' : '';
  const feedbackNote =
    activeSubmission.statusNote?.trim() ||
    'Please review the feedback and update your title proposal accordingly.';
  const scrollIntoView = (targetRef: RefObject<HTMLElement | null>) => {
    window.setTimeout(() => {
      targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };
  const handleViewOverview = () => {
    setActiveTab('Details');
    scrollIntoView(detailsPanelRef);
  };
  const handleViewFeedback = () => {
    // Insights (and its Feedback tab) only shows on the Documents tab.
    setActiveTab(isDetailsComplete ? 'Documents' : 'Details');
    setInsightsTab('Feedback');
    scrollIntoView(adviserFeedbackRef);
    window.setTimeout(() => adviserFeedbackRef.current?.focus({ preventScroll: true }), 180);

    if (feedbackHighlightTimerRef.current !== null) {
      window.clearTimeout(feedbackHighlightTimerRef.current);
    }

    setIsFeedbackHighlighted(true);
    feedbackHighlightTimerRef.current = window.setTimeout(() => {
      setIsFeedbackHighlighted(false);
      feedbackHighlightTimerRef.current = null;
    }, 2200);
  };
  return (
    <div className="student-title-submission-page relative flex flex-col gap-4">
      {notice && (
        <div className={`fixed bottom-8 right-6 z-[9999] rounded-xl p-4 shadow-xl flex items-start gap-3 w-96 animate-in slide-in-from-right-8 fade-in duration-300 border ${
          notice.tone === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
          notice.tone === 'danger' ? 'bg-rose-50 text-rose-800 border-rose-200' :
          notice.tone === 'warning' ? 'bg-amber-50 text-amber-800 border-amber-200' :
          'bg-blue-50 text-blue-800 border-blue-200'
        }`}>
          <div className="mt-0.5 text-lg">
            {notice.tone === 'success' && <i className="fas fa-check-circle text-emerald-500"></i>}
            {notice.tone === 'danger' && <i className="fas fa-exclamation-circle text-rose-500"></i>}
            {notice.tone === 'warning' && <i className="fas fa-triangle-exclamation text-amber-500"></i>}
            {notice.tone === 'info' && <i className="fas fa-info-circle text-blue-500"></i>}
          </div>
          <p className="text-sm font-bold flex-1 leading-snug">{notice.message}</p>
          <button onClick={() => setNotice(null)} className="text-current opacity-50 hover:opacity-100 transition-opacity"><i className="fas fa-times"></i></button>
        </div>
      )}
      
      {data.project.newTitleRequired && (
        <div className="w-full rounded-2xl border border-rose-200 bg-rose-50/80 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
              <i className="fas fa-rotate-left text-sm" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black uppercase tracking-wide text-rose-700">New Title Required</p>
              <p className="mt-1 text-sm font-semibold text-rose-900">
                Your previous title &quot;{data.project.newTitleRequired.previousTitle}&quot; was not approved after{' '}
                {data.project.newTitleRequired.stage === 'concept' ? 'Concept Presentation' : 'Proposal Defense'}.
                {data.project.newTitleRequired.reason ? ` Panel remarks: ${data.project.newTitleRequired.reason}` : ''}
              </p>
              {titleLocked ? (
                <p className="mt-2 text-sm text-rose-800">
                  Your submitted titles are locked. Your adviser will change the title — either by using one of your submitted backup titles or by editing the wording — so no action is needed here.
                </p>
              ) : backupDrafts.length > 0 ? (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-rose-700/80">
                    <i className="fas fa-bolt mr-1.5" aria-hidden="true" />
                    Pick a saved backup to fill the form instantly
                  </p>
                  <div className="flex flex-col gap-2">
                    {[...backupDrafts]
                      .sort((a, b) => {
                        const priorityDelta = (b.isPriority ? 1 : 0) - (a.isPriority ? 1 : 0);
                        if (priorityDelta !== 0) return priorityDelta;
                        return (a.reviewStatus === 'APPROVED' ? -1 : 0) - (b.reviewStatus === 'APPROVED' ? -1 : 0);
                      })
                      .map((draft) => {
                        const badge = getBackupReviewBadge(draft.reviewStatus);
                        return (
                          <button
                            key={draft.id}
                            type="button"
                            onClick={() => handleApplyBackupDraft(draft)}
                            className={`flex items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 text-left shadow-sm transition hover:border-rose-400 hover:bg-rose-50 ${draft.isPriority ? 'border-amber-300' : 'border-rose-200'}`}
                          >
                            <span className="min-w-0">
                              <span className="flex items-center gap-2">
                                {draft.isPriority && <i className="fas fa-star text-amber-400" aria-hidden="true" />}
                                <span className="block truncate text-sm font-bold text-slate-800">&quot;{draft.title}&quot;</span>
                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.className}`}>
                                  <i className={`fas ${badge.icon} mr-1`} aria-hidden="true" />
                                  {badge.label}
                                </span>
                              </span>
                              {draft.description && (
                                <span className="mt-0.5 block truncate text-xs text-slate-500">{draft.description}</span>
                              )}
                            </span>
                            <span className="shrink-0 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white">
                              {draft.reviewStatus === 'APPROVED' ? 'Use & skip review' : 'Use this'}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                  <p className="mt-2 text-xs text-rose-800">Or type a genuinely different title below.</p>
                </div>
              ) : (
                <p className="mt-1 text-sm text-rose-800">
                  You have no saved backups — type a genuinely different title in the form below to continue.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status card: title + meta on top, progress stepper below. */}
      <div className="w-full overflow-hidden rounded-2xl border border-[var(--border)] border-t-[3px] border-t-[var(--primary)] bg-[var(--surface)] shadow-sm">
        <div className="flex flex-col gap-4 px-6 pb-4 pt-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-widest text-[var(--text-meta)]">
              Proposal {String(activeSubmission.proposalNumber).padStart(2, '0')}
            </p>
            <h2 className="mt-1 text-2xl font-black leading-tight tracking-tight text-[var(--text)]">
              {activeSubmission.proposedTitle || 'Untitled Proposal'}
            </h2>
            <p className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] font-semibold text-[var(--muted)]">
              <span className="flex items-center gap-2"><i className="fas fa-user-tie text-[var(--text-meta)]" aria-hidden="true" /> {activeSubmission.adviser}</span>
              <span className="flex items-center gap-2"><i className="fas fa-building text-[var(--text-meta)]" aria-hidden="true" /> {data.profile.department || 'Not set'}</span>
              <span className="flex items-center gap-2"><i className="fas fa-clock text-[var(--text-meta)]" aria-hidden="true" /> Updated {formatDateTimeLabel(activeSubmission.updated_at)}</span>
            </p>
          </div>
          <span className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider ${
            titleStatusTone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
            titleStatusTone === 'warning' || titleStatusTone === 'accent' ? 'border-amber-200 bg-amber-50 text-amber-700' :
            titleStatusTone === 'danger' ? 'border-rose-200 bg-rose-50 text-rose-700' :
            'border-[var(--border)] bg-[var(--surface-alt)] text-[var(--muted)]'
          }`}>
            {titleLocked ? <i className="fas fa-lock text-[9px]" aria-hidden="true" /> : null}
            {getTitleStatusDisplay(activeSubmission.registrationStatus)}
          </span>
        </div>

        {/* Stepper: each step owns the line segments on either side of its
            circle, so lines start/stop exactly at the circles and the labels
            stay centered under them at any width. */}
        <div className="overflow-x-auto border-t border-[var(--border)] px-6 py-4">
          <ol className="flex min-w-[560px]">
            {TIMELINE_STEPS.map((step, idx) => {
              const isDone = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              const isFinalApproved = step.label === TITLE_CLEARED_LABEL && idx <= currentStepIndex;
              const currentTone =
                step.label === 'Rejected' ? 'bg-rose-500 text-white ring-rose-100' :
                step.label === 'Revise' ? 'bg-amber-500 text-white ring-amber-100' :
                step.label === 'Withdrawn' ? 'bg-slate-400 text-white ring-slate-100' :
                'bg-[var(--primary)] text-white ring-[var(--primary-soft)]';
              const circleClass = isFinalApproved
                ? 'bg-emerald-500 text-white ring-4 ring-emerald-100'
                : isCurrent
                  ? `${currentTone} ring-4`
                  : isDone
                    ? 'bg-[var(--primary)] text-white'
                    : 'border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--text-meta)]';
              const lineDone = (position: number) => position <= currentStepIndex;

              return (
                <li key={step.id} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex w-full items-center">
                    <span className={`h-0.5 flex-1 ${idx === 0 ? 'opacity-0' : lineDone(idx) ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`} />
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm ${circleClass}`}>
                      <i className={`fas ${step.icon}`} aria-hidden="true" />
                    </span>
                    <span className={`h-0.5 flex-1 ${idx === TIMELINE_STEPS.length - 1 ? 'opacity-0' : lineDone(idx + 1) ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`} />
                  </div>
                  <span className={`px-1 text-center text-[11px] font-extrabold uppercase tracking-wide ${
                    isCurrent || isFinalApproved ? 'text-[var(--text)]' : isDone ? 'text-[var(--muted)]' : 'text-[var(--text-meta)]'
                  }`}>
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
          {/* Action Banner (Proceed to Next Stage) — hidden while still on the
              Details tab in draft state, since the Details tab's own "Continue
              to Documents" footer already covers that exact next step; showing
              both stacked competing "you're not ready" messages read as two
              separate buttons fighting for the same job. */}
          {/* Hidden once approved: the badge and stepper above already say so, and
              with the title locked there is no next action for the student here. */}
          {!(activeTab === 'Details' && normalizedRegistrationStatus === 'draft') && normalizedRegistrationStatus !== 'approved' && (
          <div className={`title-submission-cta-panel flex flex-col items-center justify-between gap-4 border-t px-6 py-4 sm:flex-row ${
            normalizedRegistrationStatus === 'rejected' ? 'border-rose-100 bg-rose-50/50' :
            normalizedRegistrationStatus === 'needs revision' ? 'border-amber-100 bg-amber-50/50' :
            normalizedRegistrationStatus === 'approved' ? 'border-emerald-100 bg-emerald-50/50' :
            'border-[var(--border)] bg-[var(--surface-alt)]'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${normalizedRegistrationStatus === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' : normalizedRegistrationStatus === 'needs revision' ? 'bg-amber-50 text-amber-600 border-amber-100' : normalizedRegistrationStatus === 'withdrawn' ? 'bg-slate-100 text-slate-500 border-slate-200' : normalizedRegistrationStatus === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                <i className={`fas ${normalizedRegistrationStatus === 'rejected' ? 'fa-circle-xmark' : normalizedRegistrationStatus === 'needs revision' ? 'fa-file-pen' : normalizedRegistrationStatus === 'withdrawn' ? 'fa-box-archive' : 'fa-clipboard-check'}`}></i>
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-[var(--text)]">
                   {normalizedRegistrationStatus === 'approved'
                     ? 'Your proposal has been approved!'
                     : normalizedRegistrationStatus === 'rejected'
                     ? 'Your proposal was rejected'
                     : normalizedRegistrationStatus === 'needs revision'
                     ? 'Your proposal needs revision'
                     : normalizedRegistrationStatus === 'withdrawn'
                     ? 'This proposal was withdrawn'
                     : normalizedRegistrationStatus !== 'draft'
                     ? 'Proposal submitted successfully'
                     : 'Ready to submit your proposal?'}
                </h4>
                <p className="text-xs text-[var(--muted)] font-medium">
                   {normalizedRegistrationStatus === 'approved'
                     ? 'Please proceed to the official title registration to complete the process.'
                     : normalizedRegistrationStatus === 'rejected'
                     ? (titleLocked ? 'Your title stays locked — your adviser will update it with you if a change is needed.' : 'Please review the adviser feedback and submit a new title proposal.')
                     : normalizedRegistrationStatus === 'needs revision'
                     ? (titleLocked ? 'Revise your concept paper based on the feedback. Title changes are handled by your adviser.' : 'Please revise your concept paper based on feedback and resubmit.')
                     : normalizedRegistrationStatus === 'withdrawn'
                     ? 'Your group chose a different title to move forward with — this one is no longer active.'
                     : normalizedRegistrationStatus !== 'draft'
                     ? 'Your adviser has been notified and is currently reviewing your concept paper.'
                     : draftReadinessMessage}
                </p>
              </div>
            </div>

            {normalizedRegistrationStatus === 'approved' ? (titleLocked ? null : (
              <div className="flex flex-col sm:flex-row items-center gap-3 z-10 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleCreateSubmission}
                  className="w-full sm:w-auto bg-[var(--surface)] border border-[var(--border)] hover:border-[#003A8F] hover:text-[var(--info)] text-[var(--muted)] text-[13px] font-extrabold px-4 py-2 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <i className="fas fa-plus"></i> Submit Another Title
                </button>
              </div>
            )) : normalizedRegistrationStatus !== 'draft' ? (
              <div className="flex flex-col sm:flex-row items-center gap-3 z-10 w-full sm:w-auto">
                <button
                  disabled
                  className={`w-full sm:w-auto text-[13px] font-extrabold px-4 py-2 rounded-xl flex items-center justify-center gap-3 whitespace-nowrap cursor-not-allowed ${normalizedRegistrationStatus === 'rejected' ? 'bg-rose-50 text-rose-600 border border-rose-200' : normalizedRegistrationStatus === 'needs revision' ? 'bg-amber-50 text-amber-600 border border-amber-200' : normalizedRegistrationStatus === 'withdrawn' ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'bg-[var(--surface-alt)] text-[var(--text-meta)]'}`}
                >
                  {normalizedRegistrationStatus === 'rejected' ? 'Proposal Rejected' : normalizedRegistrationStatus === 'needs revision' ? 'Revision Required' : normalizedRegistrationStatus === 'withdrawn' ? 'Withdrawn by Your Group' : 'Proposal Under Review'} <i className={`fas ${normalizedRegistrationStatus === 'rejected' ? 'fa-ban' : normalizedRegistrationStatus === 'needs revision' ? 'fa-rotate-left' : normalizedRegistrationStatus === 'withdrawn' ? 'fa-box-archive' : 'fa-clock'} text-xs`}></i>
                </button>
                {!titleLocked && canChooseSubmission(activeSubmission) && choosablePendingCount > 1 && (
                  <button
                    type="button"
                    disabled={isChoosingTitle}
                    onClick={() => handleChooseTitle(activeSubmission.id)}
                    title="Choose this as your group's final title and withdraw the others"
                    className="w-full sm:w-auto bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 text-[13px] font-extrabold px-4 py-2 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-60"
                  >
                    <i className="fas fa-circle-check"></i> Choose as Final Title
                  </button>
                )}
                {!titleLocked && (
                  <button
                    type="button"
                    onClick={handleCreateSubmission}
                    className="w-full sm:w-auto bg-[var(--surface)] border border-[var(--border)] hover:border-[#003A8F] hover:text-[var(--info)] text-[var(--muted)] text-[13px] font-extrabold px-4 py-2 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <i className="fas fa-plus"></i> Submit Another Title
                  </button>
                )}
              </div>
            ) : (
              <div className="w-full sm:w-auto z-10">
                 <PremiumAnimatedButton 
                   type="button"
                   onPress={async () => {
                     await handleSubmitProposal();
                     await new Promise(r => setTimeout(r, 600)); // Minimum animation time
                   }}
                   disabled={!canSubmitProposal}
                   className="w-full sm:w-auto bg-[#003A8F] hover:bg-[#1E40AF] text-white text-[13px] font-extrabold px-4 py-2 rounded-xl shadow-lg shadow-[#003A8F]/30 transition-transform active:scale-95 flex items-center justify-center gap-3 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {isSubmittingTitle ? 'Submitting...' : 'Submit for Adviser Review'} <i className="fas fa-paper-plane text-xs"></i>
                 </PremiumAnimatedButton>
              </div>
            )}
          </div>
          )}
      </div>

      {/* Modern Premium Pill Tabs */}
      <div className="clear-both float-none flex w-full items-center gap-2 bg-[var(--surface)] p-1.5 rounded-2xl border border-[var(--border)] max-w-fit shadow-sm">
        {titleSubmissionTabs.map((tab) => {
          const isDisabled = tab.id === 'Documents' && !isDetailsComplete;
          const isActive = activeTab === tab.id;
          return (
            <button 
              key={tab.id}
              onClick={() => {
                if (!isDisabled) setActiveTab(tab.id);
              }}
              disabled={isDisabled}
              aria-pressed={isActive}
              className={`px-7 py-2.5 text-[13px] font-extrabold rounded-xl transition-all duration-300 flex items-center gap-2.5 ${isActive ? 'bg-[var(--primary)] text-white shadow-[0_4px_12px_rgba(0,58,143,0.3)]' : isDisabled ? 'text-[var(--text-meta)] cursor-not-allowed opacity-50 bg-[var(--surface-alt)]' : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)]'}`}
            >
              <i className={`fas ${isDisabled ? 'fa-lock text-[10px]' : tab.icon} ${isActive ? 'text-white/80' : ''}`} aria-hidden="true"></i>
              {tab.id}
            </button>
          );
        })}
      </div>

      {/* Main Grid */}
      <div className={`title-submission-main-grid grid grid-cols-1 items-stretch gap-4 ${activeTab === 'Documents' ? 'lg:grid-cols-[minmax(0,1.55fr)_minmax(360px,1fr)]' : ''}`}>

        {/* Left Column (Documents View) */}
        <div className="title-submission-main-stack flex min-w-0 flex-col gap-4 [&>*:last-child]:flex-1">
          {activeTab === 'Documents' && (
            <>
              {/* Concept paper files — one card: compact drop zone + the file list
                  (this replaces the old Upload card, the always-empty preview for
                  Word files, and the Version History table that repeated the list). */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--text)]">
                      Concept Paper Files
                      {titleLocked ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-alt)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-meta)]">
                          <i className="fas fa-lock text-[8px]" aria-hidden="true" /> View only
                        </span>
                      ) : null}
                    </h3>
                    <p className="text-xs text-[var(--muted)]">
                      {titleLocked
                        ? 'Submitted with your title proposal. These files are locked and can only be opened or downloaded.'
                        : activeSubmission.attachments.length
                          ? `${activeSubmission.attachments.length} file${activeSubmission.attachments.length === 1 ? '' : 's'} attached · newest is the current version`
                          : 'Attach your concept paper (PDF or DOCX, up to 10MB).'}
                    </p>
                  </div>
                  {titleLocked ? (
                    <Link
                      prefetch={false}
                      href="/students/submit"
                      className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold text-[var(--primary)] transition hover:border-[var(--primary)]/40 hover:bg-[var(--primary-soft)]"
                    >
                      <i className="fas fa-cloud-arrow-up" aria-hidden="true" />
                      Upload revisions in Submit Docs
                    </Link>
                  ) : null}
                </div>

                {/* Submitted concept paper is part of the locked proposal — no
                    drop zone (adding files here never reached the server anyway;
                    later revisions go through Submit Docs with adviser review). */}
                {!titleLocked && appliedBackupCarriesFiles && !hasDocuments && (
                  <p className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">
                    <i className="fas fa-paperclip" aria-hidden="true" />
                    {appliedBackupDraft!.files.length} file{appliedBackupDraft!.files.length === 1 ? '' : 's'} from your backup will carry over automatically — no need to attach anything here.
                  </p>
                )}

                {!titleLocked && (
                <button
                  type="button"
                  onClick={handleBrowseAttachments}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  disabled={!canUpload}
                  className={`group flex w-full items-center gap-4 rounded-xl border-2 border-dashed px-5 py-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ${isDragging ? 'border-[#003A8F] bg-[#003A8F]/5' : 'border-[var(--border-strong)] bg-[var(--surface-alt)] hover:border-[#003A8F]/50 hover:bg-[#003A8F]/5'}`}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)] text-[#003A8F] shadow-sm">
                    <i className="fas fa-cloud-arrow-up text-lg" aria-hidden="true" />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-bold text-[var(--text)]">
                      Drag & drop your file here, or <span className="text-blue-600">browse</span>
                    </span>
                    <span className="text-[11px] font-semibold text-[var(--text-meta)]">PDF, DOCX · max 10MB</span>
                  </span>
                  <input
                    ref={fileInputRef}
                    hidden
                    multiple
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleAttachmentInputChange}
                  />
                </button>
                )}

                {activeSubmission.attachments.length > 0 ? (
                  // Capped at ~6 rows so a long file list scrolls inside the card
                  // instead of stretching the whole page.
                  <ul className="mt-4 max-h-[396px] divide-y divide-[var(--border)] overflow-y-auto overscroll-contain rounded-xl border border-[var(--border)] [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin]">
                    {activeSubmission.attachments.map((attachment, index) => {
                      const lowerName = attachment.fileName.toLowerCase();
                      const isPdf = lowerName.endsWith('.pdf');
                      const isImage = /\.(png|jpe?g|gif|webp|heic)$/.test(lowerName);
                      const fileVisual = isPdf
                        ? { icon: 'fa-file-pdf', tint: 'bg-red-50 text-red-600' }
                        : isImage
                          ? { icon: 'fa-file-image', tint: 'bg-violet-50 text-violet-600' }
                          : { icon: 'fa-file-word', tint: 'bg-blue-50 text-blue-600' };

                      return (
                        <li key={attachment.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-alt)]">
                          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${fileVisual.tint}`}>
                            <i className={`fas ${fileVisual.icon}`} aria-hidden="true" />
                          </span>
                          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="truncate text-sm font-bold text-[var(--text)]" title={attachment.fileName}>
                                {attachment.fileName}
                              </span>
                              {index === 0 && (
                                <span className="shrink-0 rounded bg-[var(--info-soft)] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-[var(--info)]">
                                  Current
                                </span>
                              )}
                            </span>
                            <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-semibold text-[var(--muted)]">
                              <span className="flex items-center gap-1.5" title="Upload date and time"><i className="fas fa-clock text-[10px] text-[var(--text-meta)]" aria-hidden="true" />{attachment.uploadedAtLabel}</span>
                              <span>{attachment.sizeLabel}</span>
                              <span className="flex items-center gap-1.5"><i className="fas fa-user text-[10px] text-[var(--text-meta)]" aria-hidden="true" />{attachment.uploadedBy || data.group.leaderName || 'Group Member'}</span>
                            </span>
                          </div>
                          {attachment.downloadUrl && (
                            <button
                              type="button"
                              onClick={() => handleViewAttachment(attachment)}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-meta)] transition hover:border-[#003A8F]/40 hover:text-[#003A8F]"
                              title="View file"
                              aria-label={`View ${attachment.fileName}`}
                            >
                              <i className="fas fa-eye text-xs" aria-hidden="true" />
                            </button>
                          )}
                          {!titleLocked && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleRemoveAttachment(attachment.id);
                            }}
                            disabled={!canUpload}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-meta)] transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Remove file"
                          >
                            <i className="fas fa-trash-can text-xs" aria-hidden="true" />
                          </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>

              {/* Inline preview only when there's something to preview (the current file is a PDF). */}
              {activeSubmission.attachments[0]?.downloadUrl && activeSubmission.attachments[0].fileName.toLowerCase().endsWith('.pdf') && (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
                  <h3 className="mb-3 text-sm font-bold text-[var(--text)]">Preview · {activeSubmission.attachments[0].fileName}</h3>
                  <div className="relative h-[480px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-alt)]">
                    <object data={activeSubmission.attachments[0].downloadUrl} type="application/pdf" className="absolute inset-0 h-full w-full">
                      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                        <i className="fas fa-file-pdf mb-3 text-3xl text-[var(--muted)]" aria-hidden="true" />
                        <p className="text-sm font-bold text-[var(--muted)]">Your browser can&apos;t show PDFs inline.</p>
                      </div>
                    </object>
                  </div>
                </div>
              )}

              {/* What the concept paper should cover — a writing guide, so only shown before submitting. */}
              {!titleLocked && (
              <div className="rounded-2xl border border-[var(--border)] border-l-4 border-l-[var(--primary)] bg-[var(--surface)] p-5 shadow-sm">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/20">
                      <i className="fas fa-list-check" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-[var(--text)]">Your concept paper should cover</h3>
                      <p className="text-xs text-[var(--muted)]">A guide for what to include in your file — not checked automatically.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {documentChecklistItems.map((item) => (
                      <span
                        key={item.id}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                          item.complete
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-meta)]'
                        }`}
                      >
                        <i className={`fas ${item.complete ? 'fa-circle-check' : 'fa-circle'} text-[10px]`} aria-hidden="true" />
                        {item.label}
                      </span>
                    ))}
                  </div>
                </div>

                <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {[...conceptPaperReferenceItems.map((label) => ({ label, optional: false })), { label: 'Appendices', optional: true }].map((item, index) => (
                    <li
                      key={item.label}
                      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition hover:-translate-y-px hover:shadow-sm ${
                        item.optional
                          ? 'border-dashed border-[var(--border-strong)] bg-[var(--surface)]'
                          : 'border-[var(--border)] bg-[var(--surface-alt)] hover:border-[var(--primary)]/30'
                      }`}
                    >
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                        item.optional ? 'bg-[var(--surface-alt)] text-[var(--text-meta)]' : 'bg-[var(--primary-soft)] text-[var(--primary)]'
                      }`}>
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 text-[13px] font-semibold leading-tight text-[var(--text)]">{item.label}</span>
                      {item.optional ? (
                        <span className="shrink-0 text-[9px] font-extrabold uppercase tracking-widest text-[var(--text-meta)]">Optional</span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
              )}
            </>
          )}

          
          {activeTab === 'Details' && titleLocked && (
            // Read-only view of the submitted proposal. No edit/delete/add
            // controls — the server rejects those for students anyway.
            <div ref={detailsPanelRef} className="relative flex flex-1 flex-col gap-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-bright)] text-lg text-white shadow-md shadow-[var(--primary)]/20">
                    <i className="fas fa-lock" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-[var(--text)]">Research Title</h3>
                    <p className="mt-1 text-sm font-medium text-[var(--muted)]">Your submitted title proposal.</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-alt)] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
                  <i className="fas fa-lock text-[10px]" aria-hidden="true" /> Submitted · Locked
                </span>
              </div>

              <p className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-[13px] font-semibold leading-relaxed text-blue-900">
                <i className="fas fa-circle-info mt-0.5 shrink-0" aria-hidden="true" />
                You&apos;ve already submitted your title proposal. Your submitted titles are locked and can no longer be edited. If a correction or title change is needed, please contact your adviser.
              </p>

              <div>
                <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-[var(--text-meta)]">Primary Title</p>
                <p className="rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3 text-[15px] font-bold leading-snug text-[var(--text)]">
                  {activeSubmission.proposedTitle || 'Untitled Proposal'}
                </p>
              </div>

              <div>
                <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-[var(--text-meta)]">Backup Titles</p>
                {backupDrafts.length ? (
                  <ol className="flex flex-col gap-2">
                    {backupDrafts.map((draft, index) => (
                      <li key={draft.id} className="flex items-start gap-3 rounded-xl border border-[var(--border)] px-4 py-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-alt)] text-[11px] font-black text-[var(--muted)]">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold leading-snug text-[var(--text)]">{draft.title}</p>
                          {draft.description ? (
                            <p className="mt-0.5 text-xs text-[var(--muted)]">{draft.description}</p>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-[var(--muted)]">No backup titles were saved with this proposal.</p>
                )}
              </div>

              {activeSubmission.keywords.length ? (
                <div>
                  <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-[var(--text-meta)]">Research Type / Technology Focus</p>
                  <div className="flex flex-wrap gap-2">
                    {activeSubmission.keywords.map((keyword) => (
                      <span key={keyword} className="rounded-full border border-[var(--border)] bg-[var(--surface-alt)] px-3 py-1 text-xs font-bold text-[var(--text)]">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {titleHistory.length ? (
                <div className="border-t border-[var(--border)] pt-5">
                  <p className="mb-3 text-[11px] font-black uppercase tracking-widest text-[var(--text-meta)]">Title changes by your adviser</p>
                  <ul className="flex flex-col gap-3">
                    {titleHistory.map((entry) => (
                      <li key={entry.id} className="rounded-xl border border-[var(--border)] px-4 py-3">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-meta)]">
                          {entry.target === 'primary' ? 'Primary title' : 'Backup title'} · {entry.changedBy} · {formatDateTimeLabel(entry.changedAt)}
                        </p>
                        <p className="mt-1.5 text-[13px] text-[var(--muted)] line-through">{entry.previousTitle}</p>
                        <p className="text-[13px] font-bold text-[var(--text)]">{entry.updatedTitle}</p>
                        {entry.remarks ? <p className="mt-1 text-xs italic text-[var(--muted)]">“{entry.remarks}”</p> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}

          {activeTab === 'Details' && !titleLocked && (
            <div ref={detailsPanelRef} className="relative flex flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[var(--primary-soft)] to-transparent rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3"></div>
              
              <div className="mb-6 flex items-center gap-4">
                <div className="h-11 w-11 shrink-0 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-bright)] text-white flex items-center justify-center text-lg shadow-md shadow-[var(--primary)]/20"><i className="fas fa-file-signature"></i></div>
                <div>
                  <h3 className="text-xl font-black text-[var(--text)] tracking-tight">Proposal Details</h3>
                  <p className="text-sm text-[var(--muted)] font-medium mt-1">Provide the official title, tag its research type, and add a brief note to your adviser.</p>
                </div>
              </div>

              <div className="space-y-6 relative z-10">
                <div className="group/field">
                  <label htmlFor="proposedTitle" className="block text-[12px] font-black text-[var(--text)] uppercase tracking-widest mb-3">
                    Proposed Title <span className="text-rose-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-[var(--muted)] group-focus-within/field:text-[var(--primary)] transition-colors">
                      <i className="fas fa-heading"></i>
                    </div>
                    <input
                      id="proposedTitle"
                      type="text"
                      value={activeSubmission.proposedTitle === 'No active project' ? '' : activeSubmission.proposedTitle}
                      onChange={(e) => {
                        updateActiveSubmission(sub => ({ ...sub, proposedTitle: e.target.value }));
                        setAppliedBackupDraftId(null);
                      }}
                      placeholder="Enter the official, finalized title of your study"
                      className="block w-full rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] py-4 pl-12 pr-4 text-[var(--text)] shadow-sm transition-all placeholder:text-[var(--muted)] focus:bg-[var(--surface)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] hover:border-[var(--border-strong)] text-[15px] font-bold outline-none disabled:opacity-60 disabled:bg-[var(--surface-alt)]"
                      disabled={!canUpload}
                    />
                  </div>
                  <p className="text-[11px] font-bold text-[var(--muted)] mt-3 flex items-center gap-2">
                    <i className="fas fa-circle-info text-[var(--info)]"></i> A proposed title is required before you can proceed to upload documents.
                  </p>
                  {/* Live Repository matches + the 20% similarity rule (mock Repository only). */}
                  {!titleLocked ? <RepositoryTitleCheckPanel title={typedTitle} label="This proposed title" /> : null}
                </div>

                <div className="group/field">
                  <label htmlFor="researchTypeDraft" className="block text-[12px] font-black text-[var(--text)] uppercase tracking-widest mb-3">
                    Research Type / Technology Focus <span className="text-rose-500 ml-1">*</span>
                  </label>
                  <div className="relative flex items-center gap-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-[var(--muted)] group-focus-within/field:text-[var(--primary)] transition-colors">
                        <i className="fas fa-tag text-[13px]"></i>
                      </div>
                      <input
                        id="researchTypeDraft"
                        type="text"
                        value={customKeywordDraft}
                        onChange={(event) => setCustomKeywordDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            handleAddCustomKeyword();
                          }
                        }}
                        placeholder="e.g. Prototype, Web Application, IoT, Renewable Energy — press Enter"
                        disabled={!canUpload}
                        className="block w-full rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] py-4 pl-12 pr-4 text-[var(--text)] shadow-sm transition-all placeholder:text-[var(--muted)] focus:bg-[var(--surface)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] hover:border-[var(--border-strong)] text-[15px] font-bold outline-none disabled:opacity-60 disabled:bg-[var(--surface-alt)]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddCustomKeyword}
                      disabled={!canUpload || !customKeywordDraft.trim()}
                      className="shrink-0 rounded-2xl bg-[var(--surface-alt)] border-2 border-[var(--border)] px-5 py-4 text-[13px] font-black text-[var(--text)] transition-all hover:border-[var(--border-strong)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                  </div>

                  {activeSubmission.keywords.length ? (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {activeSubmission.keywords.map((keyword) => (
                        <span
                          key={keyword}
                          className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--primary)] bg-[var(--primary-soft)] px-3.5 py-1.5 text-[12px] font-bold text-[var(--primary)]"
                        >
                          {keyword}
                          <button
                            type="button"
                            onClick={() => handleRemoveKeyword(keyword)}
                            disabled={!canUpload}
                            className="ml-0.5 text-[var(--primary)] hover:text-rose-600 transition-colors disabled:opacity-60"
                            aria-label={`Remove ${keyword} tag`}
                          >
                            <i className="fas fa-xmark text-[11px]" aria-hidden="true" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] font-bold text-[var(--muted)] mt-3 flex items-center gap-2">
                      <i className="fas fa-circle-info text-[var(--info)]"></i> Add at least one research type or technology tag before you can proceed to upload documents.
                    </p>
                  )}
                </div>

                <div className="group/field">
                  <label htmlFor="briefDescription" className="block text-[12px] font-black text-[var(--text)] uppercase tracking-widest mb-3 flex items-center gap-3">
                    Note to Adviser <span className="text-[var(--text-meta)] font-bold text-[9px] px-2 py-0.5 bg-[var(--surface-alt)] rounded border border-[var(--border)]">OPTIONAL</span>
                  </label>
                  <div className="relative">
                    <div className="absolute top-4 left-0 flex items-start pl-4 pointer-events-none text-[var(--muted)] group-focus-within/field:text-[var(--primary)] transition-colors">
                      <i className="fas fa-comment-dots"></i>
                    </div>
                    <textarea
                      id="briefDescription"
                      value={
                        activeSubmission.briefDescription === 'Title proposal document uploaded for adviser review. The required contents are expected inside the attached file.' || 
                        activeSubmission.briefDescription === 'Title proposal submitted for adviser validation.'
                        ? '' : activeSubmission.briefDescription
                      }
                      onChange={(e) => {
                        updateActiveSubmission(sub => ({ ...sub, briefDescription: e.target.value }));
                        setAppliedBackupDraftId(null);
                      }}
                      placeholder="Add specific questions, context, or areas you want your adviser to focus on..."
                      className="block w-full rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] py-4 pl-12 pr-4 text-[var(--text)] shadow-sm transition-all placeholder:text-[var(--muted)] focus:bg-[var(--surface)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-soft)] hover:border-[var(--border-strong)] text-[14px] font-medium outline-none min-h-[110px] resize-y disabled:opacity-60 disabled:bg-[var(--surface-alt)] leading-relaxed"
                      disabled={!canUpload}
                    />
                  </div>
                </div>
              </div>
              
      {/* Lets a group prepare several replacement titles ahead of time (e.g. 2nd/3rd
          choice ideas), so if a New Title decision ever happens they don't have to
          write one from scratch under pressure. Placed below the actual submission
          status card on purpose — it's prep/housekeeping, not the primary thing a
          student came to this page to check, so it shouldn't outrank their real
          proposal status at the top of the page. Has its own small add/edit form —
          saving one never touches the real submission form above. */}
      {!isLoadingBackupDrafts && (
        <div className="relative z-10 mt-6 border-t border-[var(--border)] pt-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
                <i className="fas fa-bookmark text-slate-400" aria-hidden="true" />
                Backup Titles
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">
                  {backupDrafts.length}/{MAX_BACKUP_DRAFTS}
                </span>
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Prepare a few alternate titles now so you&apos;re never starting from scratch if the panel ever requires a new one.
              </p>
            </div>
            <button
              type="button"
              onClick={openNewBackupForm}
              disabled={backupDrafts.length >= MAX_BACKUP_DRAFTS}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[var(--primary)] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
              title={backupDrafts.length >= MAX_BACKUP_DRAFTS ? `You can keep at most ${MAX_BACKUP_DRAFTS} backup titles.` : undefined}
            >
              <i className="fas fa-plus" aria-hidden="true" />
              Add backup title
            </button>
          </div>

          {backupFormMode && (() => {
            const isNewDraft = backupFormMode === 'new';
            const editingDraft = isNewDraft ? null : backupDrafts.find((draft) => draft.id === backupFormMode) ?? null;
            const currentFileCount = isNewDraft ? backupFormStagedFiles.length : (editingDraft?.files.length ?? 0);
            const dropzoneDisabled = isNewDraft ? currentFileCount >= 5 : (isUploadingBackupFile || currentFileCount >= 5);

            const handleFilesPicked = (picked: File[]) => {
              if (!picked.length) return;
              if (isNewDraft) {
                setBackupFormStagedFiles((current) => [...current, ...picked].slice(0, 5));
              } else if (editingDraft) {
                handleUploadBackupFiles(editingDraft.id, picked);
              }
            };

            return (
              <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--primary)]/15 bg-gradient-to-br from-[var(--primary)]/[0.04] via-white to-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-[var(--primary)]/10 bg-white/70 px-5 py-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
                    <i className={`fas ${isNewDraft ? 'fa-plus' : 'fa-pen'} text-sm`} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-[var(--text)]">{isNewDraft ? 'New Backup Title' : 'Edit Backup Title'}</p>
                    <p className="text-xs text-slate-500">Saved privately — never submitted until you choose to use it.</p>
                  </div>
                </div>

                <div className="grid gap-4 p-5">
                  <div>
                    <label htmlFor="backupFormTitle" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Title
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <i className="fas fa-heading text-sm" aria-hidden="true" />
                      </div>
                      <input
                        id="backupFormTitle"
                        type="text"
                        autoFocus
                        value={backupFormTitle}
                        onChange={(e) => setBackupFormTitle(e.target.value)}
                        placeholder="e.g. AI-Powered Attendance Monitoring System"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm font-semibold text-slate-800 shadow-sm transition focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/10"
                      />
                    </div>
                    {/* Same live Repository matches + 20% rule as the primary title. */}
                    <RepositoryTitleCheckPanel title={backupFormTitle} label="This backup title" />
                  </div>

                  <div>
                    <label htmlFor="backupFormDescription" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Description <span className="font-normal normal-case text-slate-400">(optional)</span>
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute left-3 top-3 text-slate-400">
                        <i className="fas fa-align-left text-sm" aria-hidden="true" />
                      </div>
                      <textarea
                        id="backupFormDescription"
                        value={backupFormDescription}
                        onChange={(e) => setBackupFormDescription(e.target.value)}
                        rows={2}
                        placeholder="A brief summary of the idea"
                        className="w-full resize-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 shadow-sm transition focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/10"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="backupFormKeywords" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Keywords <span className="font-normal normal-case text-slate-400">(optional, comma-separated)</span>
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <i className="fas fa-tags text-sm" aria-hidden="true" />
                      </div>
                      <input
                        id="backupFormKeywords"
                        type="text"
                        value={backupFormKeywords}
                        onChange={(e) => setBackupFormKeywords(e.target.value)}
                        placeholder="e.g. IoT, Mobile App, Machine Learning"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 shadow-sm transition focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Supporting Files <span className="font-normal normal-case text-slate-400">(optional — helps your adviser review it)</span>
                    </label>

                    {currentFileCount > 0 && (
                      <ul className="mb-2 flex flex-col gap-1.5">
                        {isNewDraft
                          ? backupFormStagedFiles.map((file, index) => (
                              <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                                <span className="flex min-w-0 items-center gap-2.5 text-xs font-bold text-slate-700">
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                    <i className={`fas ${getFileTypeIcon(file.name)}`} aria-hidden="true" />
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block truncate">{file.name}</span>
                                    {formatBackupFileSize(file.size) && (
                                      <span className="block font-normal text-slate-400">{formatBackupFileSize(file.size)}</span>
                                    )}
                                  </span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setBackupFormStagedFiles((current) => current.filter((_, i) => i !== index))}
                                  className="shrink-0 text-slate-400 transition hover:text-rose-600"
                                  title="Remove file"
                                >
                                  <i className="fas fa-trash text-xs" aria-hidden="true" />
                                </button>
                              </li>
                            ))
                          : (editingDraft?.files ?? []).map((file) => (
                              <li key={file.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                                <a
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex min-w-0 items-center gap-2.5 text-xs font-bold text-slate-700 hover:text-[var(--primary)]"
                                >
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                    <i className={`fas ${getFileTypeIcon(file.name)}`} aria-hidden="true" />
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block truncate">{file.name}</span>
                                    {formatBackupFileSize(file.size) && (
                                      <span className="block font-normal text-slate-400">{formatBackupFileSize(file.size)}</span>
                                    )}
                                  </span>
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBackupFile(editingDraft!.id, file.id)}
                                  disabled={removingBackupFileId === file.id}
                                  className="shrink-0 text-slate-400 transition hover:text-rose-600 disabled:opacity-60"
                                  title="Remove file"
                                >
                                  <i className="fas fa-trash text-xs" aria-hidden="true" />
                                </button>
                              </li>
                            ))}
                      </ul>
                    )}

                    <button
                      type="button"
                      onClick={() => backupFileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (!dropzoneDisabled) setIsDraggingBackupFile(true);
                      }}
                      onDragLeave={() => setIsDraggingBackupFile(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingBackupFile(false);
                        if (dropzoneDisabled) return;
                        handleFilesPicked(Array.from(e.dataTransfer.files || []));
                      }}
                      disabled={dropzoneDisabled}
                      className={`flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-5 text-center transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        isDraggingBackupFile
                          ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                          : 'border-slate-200 bg-slate-50/60 hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/[0.03]'
                      }`}
                    >
                      <i className="fas fa-cloud-arrow-up text-lg text-slate-400" aria-hidden="true" />
                      <p className="text-xs font-bold text-slate-600">
                        {isUploadingBackupFile ? 'Uploading…' : 'Drag & drop files, or click to browse'}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        {currentFileCount >= 5 ? 'Maximum of 5 files reached' : 'PDF, DOC, PPT, XLS — up to 5 files'}
                      </p>
                      <input
                        ref={backupFileInputRef}
                        hidden
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                        onChange={(e) => {
                          handleFilesPicked(Array.from(e.target.files || []));
                          e.target.value = '';
                        }}
                      />
                    </button>
                    {isNewDraft && <p className="mt-1.5 text-xs text-slate-400">Attached automatically when you save.</p>}
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={closeBackupForm}
                      className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-100"
                    >
                      {isNewDraft ? 'Cancel' : 'Done'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitBackupForm}
                      disabled={isSavingBackupDraft}
                      className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"
                    >
                      <i className={`fas ${isSavingBackupDraft ? 'fa-circle-notch fa-spin' : 'fa-floppy-disk'}`} aria-hidden="true" />
                      {isSavingBackupDraft ? 'Saving…' : isNewDraft ? 'Save Backup' : 'Update Backup'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {backupDrafts.length > 0 ? (
            <ul className="mt-4 flex flex-col gap-2">
              {[...backupDrafts]
                .sort((a, b) => (b.isPriority ? 1 : 0) - (a.isPriority ? 1 : 0))
                .map((draft) => {
                const badge = getBackupReviewBadge(draft.reviewStatus);
                return (
                <li
                  key={draft.id}
                  className={`flex items-start justify-between gap-3 rounded-xl border p-3 transition ${
                    draft.isPriority
                      ? 'border-amber-300 bg-amber-50/60'
                      : backupFormMode === draft.id
                        ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                        : 'border-slate-100 bg-slate-50/70'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleTogglePriorityBackupDraft(draft)}
                    className={`mt-0.5 shrink-0 text-lg transition ${draft.isPriority ? 'text-amber-400' : 'text-slate-300 hover:text-amber-300'}`}
                    title={draft.isPriority ? 'Your best pick — click to unstar' : 'Mark as your best pick'}
                  >
                    <i className={draft.isPriority ? 'fas fa-star' : 'far fa-star'} aria-hidden="true" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-bold text-slate-800">&quot;{draft.title}&quot;</p>
                      {(() => {
                        // Same 20% rule as the primary title, shown on every saved backup.
                        const backupCheck = checkTitleAgainstRepository(draft.title);
                        return backupCheck.allowed ? (
                          <span className="shrink-0 text-[10px] font-bold text-emerald-700" title="Highest similarity with a repository study">
                            <i className="fas fa-circle-check mr-1" aria-hidden="true" />{backupCheck.highest}% · Allowed
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-inset ring-rose-200" title={getTooSimilarMessage("This backup title", backupCheck.highest)}>
                            <i className="fas fa-ban mr-1" aria-hidden="true" />{backupCheck.highest}% · Too similar — edit this title
                          </span>
                        );
                      })()}
                      {draft.isPriority && (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-inset ring-amber-300">
                          Best Pick
                        </span>
                      )}
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.className}`}>
                        <i className={`fas ${badge.icon} mr-1`} aria-hidden="true" />
                        {badge.label}
                      </span>
                    </div>
                    {draft.description && (
                      <p className="mt-0.5 truncate text-xs text-slate-500">{draft.description}</p>
                    )}
                    {draft.reviewStatus === 'NEEDS_REVISION' && draft.reviewFeedback && (
                      <p className="mt-1 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800">
                        <i className="fas fa-comment-dots mr-1" aria-hidden="true" />
                        {draft.reviewFeedback}
                      </p>
                    )}
                    {draft.keywords.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {draft.keywords.map((keyword) => (
                          <span
                            key={keyword}
                            className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-bold text-slate-600"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-400">
                      <span>
                        Saved {new Date(draft.updatedAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </span>
                      {draft.files.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <i className="fas fa-paperclip" aria-hidden="true" />
                          {draft.files.length} file{draft.files.length === 1 ? '' : 's'}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleApplyBackupDraft(draft)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-100"
                      title="Use this title for a submission"
                    >
                      <i className="fas fa-arrow-up-right-from-square" aria-hidden="true" />
                      Use
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditBackupForm(draft)}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-400 shadow-sm transition hover:bg-slate-100 hover:text-[var(--primary)]"
                      title="Edit backup title"
                    >
                      <i className="fas fa-pen" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBackupDraft(draft.id)}
                      disabled={deletingBackupDraftId === draft.id}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-400 shadow-sm transition hover:bg-slate-100 hover:text-rose-600 disabled:opacity-60"
                      title="Delete backup title"
                    >
                      <i className="fas fa-trash" aria-hidden="true" />
                    </button>
                  </div>
                </li>
                );
              })}
            </ul>
          ) : (
            !backupFormMode && (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3">
                <i className="fas fa-bookmark text-slate-300" aria-hidden="true" />
                <p className="text-xs font-semibold text-[var(--muted)]">No backups saved yet.</p>
              </div>
            )
          )}
        </div>
      )}
              <div className="mt-6 flex flex-wrap items-center justify-end gap-3 relative z-10">
                 {(needsBackupTitle || titlesTooSimilar.length > 0) && hasTitle && hasResearchType ? (
                   <p className="flex items-center gap-2 text-xs font-semibold text-amber-700">
                     <i className="fas fa-bookmark" aria-hidden="true" />
                     {backupTitlesStillNeeded > 0
                       ? `Save ${backupTitlesStillNeeded} more backup title${backupTitlesStillNeeded === 1 ? '' : 's'} above to continue (at least ${MIN_BACKUP_TITLES} required).`
                       : titlesTooSimilar.length
                         ? `Revise before continuing: ${titlesTooSimilar.map((item) => `${item.label} (${item.highest}%)`).join(', ')} — over the ${REPOSITORY_SIMILARITY_LIMIT}% repository similarity limit.`
                         : 'Your primary and backup titles must all be different.'}
                   </p>
                 ) : null}
                 <button
                   onClick={() => {
                     if (isDetailsComplete) {
                       setActiveTab('Documents');
                     }
                   }}
                   disabled={!isDetailsComplete}
                   className={`text-sm font-extrabold px-8 py-3.5 rounded-xl shadow-md transition-all flex items-center gap-3 ${!isDetailsComplete ? 'bg-[var(--surface-alt)] cursor-not-allowed text-[var(--text-meta)] shadow-none border border-[var(--border)]' : 'bg-gradient-to-r from-[var(--primary)] to-[var(--primary-bright)] text-white hover:shadow-lg hover:-translate-y-0.5 border border-transparent'}`}
                 >
                   Continue to Documents <i className="fas fa-arrow-right"></i>
                 </button>
              </div>
            </div>
          )}
          

        </div>

        {/* Right Column - Unified Insights Panel */}
        {/* Insights is about the submission's progress, so it only shows on Documents. */}
        <div className={`title-submission-side-rail min-w-0 flex-col ${activeTab === 'Documents' ? 'flex' : 'hidden'}`}>
          <div className="relative flex-1 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary-soft)] rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>

            {/* Panel header: ring + segmented tabs — replaces 6 separately-scrolling
                cards (Workflow Progress, Recent Activity, Your Proposals, Adviser
                Review, Duplicate Check, Analytics) with one panel, since a student
                only ever needs one of those views at a time, not all six stacked. */}
            <div className="p-6 pb-0 relative z-10">
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <h3 className="text-[12px] font-black text-[var(--text)] uppercase tracking-widest mb-1">Insights</h3>
                  <p className="text-xs font-semibold text-[var(--muted)]">{nextActionLabel}</p>
                </div>
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--surface-alt)] shadow-inner border border-[var(--border)]">
                  <svg className="absolute inset-0 h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
                    <path className="text-[var(--border)]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                    <path className={`transition-all duration-1000 ease-out ${
                      activeSubmission.registrationStatus.toLowerCase() === 'rejected' ? 'text-rose-500' :
                      activeSubmission.registrationStatus.toLowerCase() === 'needs revision' ? 'text-amber-500' :
                      activeSubmission.registrationStatus.toLowerCase() === 'approved' ? 'text-emerald-500' :
                      'text-[var(--primary)]'
                    }`} strokeDasharray={`${submissionProgressPercent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                  </svg>
                  <span className="text-[13px] font-black text-[var(--text)]">{submissionProgressPercent}%</span>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-[var(--surface-alt)] p-1 rounded-xl border border-[var(--border)] mb-6">
                {(['Overview', 'Feedback', 'History'] as const).map((tab) => {
                  const hasFeedbackFlag = tab === 'Feedback' && Boolean(activeSubmission.validation?.matchedTitles.length);
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setInsightsTab(tab)}
                      className={`relative flex-1 min-h-[34px] rounded-lg text-[11px] font-extrabold uppercase tracking-wide transition-all ${
                        insightsTab === tab ? 'bg-[var(--surface)] text-[var(--primary)] shadow-sm' : 'text-[var(--muted)] hover:text-[var(--text)]'
                      }`}
                    >
                      {tab}
                      {hasFeedbackFlag && (
                        <span className="absolute top-1.5 right-2.5 h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-6 pb-6 relative z-10">
              {insightsTab === 'Overview' && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-5">
                    {readinessItems.map((item, idx) => (
                      <div key={item.id} className="flex gap-4 relative">
                        {idx !== readinessItems.length - 1 && (
                          <div className={`absolute top-8 left-3 w-0.5 h-full -ml-[1px] ${item.complete ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'} transition-colors duration-500`}></div>
                        )}
                        <div className="relative z-10 shrink-0">
                          <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors duration-500 ${item.complete ? 'border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm shadow-[var(--primary)]/30' : 'border-[var(--border-strong)] bg-[var(--surface)] text-[var(--muted)]'}`}>
                            <i className={`fas ${item.complete ? 'fa-check text-[10px]' : 'fa-circle text-[6px]'}`} aria-hidden="true" />
                          </div>
                        </div>
                        <div className={`flex flex-col pb-2 ${!item.complete ? 'opacity-70' : ''}`}>
                          <strong className={`text-[13px] font-extrabold ${item.complete ? 'text-[var(--text)]' : 'text-[var(--muted)]'}`}>{item.label}</strong>
                          <small className="text-[11px] font-semibold text-[var(--text-meta)] mt-0.5">{item.detail}</small>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-5 border-t border-[var(--border)]">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--text-meta)] mb-4">Recent Activity</p>
                    {activeSubmission.revisionHistory.length > 0 ? (
                      <div className="relative border-l-2 border-[var(--border)] ml-2 space-y-5">
                        {activeSubmission.revisionHistory.slice(0, 4).map((hist, i) => (
                          <div key={i} className="relative pl-5">
                            <div className={`absolute -left-[9px] top-0.5 h-4 w-4 rounded-full border-[3px] border-[var(--border)] shadow-sm ${hist.status.toLowerCase().includes('approved') ? 'bg-[#003A8F]' : hist.status.toLowerCase().includes('submitted') ? 'bg-[#F6BE00]' : 'bg-[var(--border)]'}`}></div>
                            <p className="text-xs font-bold text-[var(--text)] leading-snug">{hist.note}</p>
                            <p className="text-[10px] font-bold text-[var(--text-meta)] mt-1.5 uppercase tracking-wide">{hist.dateLabel}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center py-3">
                        <div className="h-11 w-11 rounded-2xl bg-[var(--surface-alt)] flex items-center justify-center text-[var(--text-meta)] mb-3">
                          <i className="fas fa-clock-rotate-left text-base"></i>
                        </div>
                        <p className="text-xs font-bold text-[var(--muted)]">No activity yet</p>
                        <p className="text-[11px] font-medium text-[var(--text-meta)] mt-1 max-w-[200px] leading-relaxed">Submit this proposal to your adviser to start the activity log.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {insightsTab === 'Feedback' && (
                <div ref={adviserFeedbackRef} tabIndex={-1} className={`space-y-6 ${isFeedbackHighlighted ? 'is-feedback-focused' : ''}`}>
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--text-meta)] mb-4">Adviser Review Status</p>
                    <div className="flex items-center gap-4 mb-4">
                      <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(activeSubmission.adviser)}&background=0D8ABC&color=fff`} alt={activeSubmission.adviser} className="h-12 w-12 rounded-full shadow-sm ring-2 ring-white" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-extrabold text-[var(--text)] flex items-center justify-between w-full">
                          <span className="truncate">{activeSubmission.adviser}</span>
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 uppercase tracking-widest ${adviserStatusToneClasses.soft} ${adviserStatusToneClasses.text}`}>
                            {getTitleStatusDisplay(activeSubmission.registrationStatus)}
                          </span>
                        </p>
                        <p className="text-[11px] text-[var(--text-meta)] font-bold mt-1.5 uppercase tracking-wide">Reviewed on {formatDateTimeLabel(activeSubmission.lastReviewedAt)}</p>
                      </div>
                    </div>
                    <div className={`p-4 rounded-xl text-[13px] font-semibold leading-relaxed border ${adviserStatusToneClasses.soft} ${adviserStatusToneClasses.border} ${adviserStatusToneClasses.text}`}>
                      {activeSubmission.statusNote || 'Waiting for adviser review. Comments and remarks will appear here.'}
                    </div>
                  </div>

                  {normalizedRegistrationStatus !== 'draft' && activeSubmission.validation && (
                    <div className="pt-5 border-t border-[var(--border)]">
                      <div className="flex justify-between items-center mb-4">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--text-meta)]">Duplicate Title Check</p>
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center shadow-sm border ${
                          activeSubmission.validation.matchedTitles.length ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                        }`}>
                          <i className={`fas ${activeSubmission.validation.matchedTitles.length ? 'fa-triangle-exclamation' : 'fa-check'} text-xs`}></i>
                        </div>
                      </div>
                      <p className="text-[13px] font-semibold text-[var(--text)] mb-1">{activeSubmission.validation.status}</p>
                      <p className="text-[11px] text-[var(--text-meta)] font-medium leading-relaxed mb-4">{activeSubmission.validation.note}</p>
                      {activeSubmission.validation.matchedTitles.length > 0 && (
                        <ul className="space-y-2">
                          {activeSubmission.validation.matchedTitles.map((match) => (
                            <li key={match.id} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                              <p className="text-[12px] font-bold text-amber-900 leading-snug">{match.title}</p>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700 mt-1">{match.matchLabel}</p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}

              {insightsTab === 'History' && (
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--text-meta)] mb-2">Your Proposals</p>
                    {visibleSubmissions.length > 1 ? (
                      <>
                        <p className="text-[11px] font-semibold text-[var(--text-meta)] mb-4 leading-relaxed">
                          {choosablePendingCount > 1
                            ? `You have ${choosablePendingCount} candidate titles waiting on a decision. Tap the checkmark on your favorite to make it your group's final pick — the rest will be withdrawn.`
                            : 'Every title your group has submitted, including past ones. Tap a row to view its full details and feedback.'}
                        </p>
                        <div className="space-y-2">
                          {visibleSubmissions.map((sub) => (
                            <div
                              role="button"
                              tabIndex={0}
                              key={sub.id}
                              onClick={() => handleSelectSubmission(sub.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleSelectSubmission(sub.id);
                                }
                              }}
                              className={`w-full text-left p-3 rounded-xl text-sm font-bold border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                                activeSubmissionId === sub.id
                                ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                                : 'bg-[var(--surface)] border-[var(--border)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-alt)]'
                              }`}
                            >
                              <span className="truncate flex-1">{sub.proposalLabel}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-[9px] px-2 py-0.5 rounded uppercase tracking-widest ${
                                  sub.registrationStatus.toLowerCase() === 'approved' ? 'bg-[var(--info-soft)] text-[var(--info)]' :
                                  sub.registrationStatus.toLowerCase() === 'draft' ? 'bg-slate-200 text-[var(--muted)]' :
                                  sub.registrationStatus.toLowerCase() === 'withdrawn' ? 'bg-slate-100 text-[var(--text-meta)]' :
                                  sub.registrationStatus.toLowerCase() === 'rejected' ? 'bg-rose-100 text-rose-700' :
                                  'bg-[var(--warning-soft)] text-[var(--warning)]'
                                }`}>
                                  {getTitleStatusDisplay(sub.registrationStatus)}
                                </span>
                                {canChooseSubmission(sub) && (
                                  <button
                                    type="button"
                                    disabled={isChoosingTitle}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleChooseTitle(sub.id);
                                    }}
                                    className="text-[var(--text-meta)] hover:text-emerald-600 transition-colors p-1 rounded hover:bg-emerald-50 ml-1 disabled:opacity-50"
                                    aria-label={`Choose ${sub.proposalLabel} as your final title`}
                                    title="Choose as Final Title"
                                  >
                                    <i className="fas fa-circle-check text-xs"></i>
                                  </button>
                                )}
                                {canDeleteDraftSubmission(sub) && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteDraftSubmission(sub.id);
                                    }}
                                    className="text-[var(--text-meta)] hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50 ml-1"
                                    aria-label={`Delete ${sub.proposalLabel} draft`}
                                    title="Delete Draft"
                                  >
                                    <i className="fas fa-trash-alt text-xs"></i>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-[11px] font-semibold text-[var(--text-meta)] leading-relaxed">
                        You've only submitted one title so far. Once your group has more than one candidate, they'll all show up here so you can pick a favorite.
                      </p>
                    )}
                  </div>

                  <div className="pt-5 border-t border-[var(--border)]">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--text-meta)] mb-4">Submission Analytics</p>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="flex flex-col items-center text-center p-3 rounded-[1rem] border border-[var(--border)] bg-[var(--surface-alt)]">
                        <div className="h-7 w-7 rounded-lg bg-[var(--info-soft)] text-[var(--info)] flex items-center justify-center mb-2 shadow-sm"><i className="fas fa-file-lines text-xs"></i></div>
                        <span className="text-sm font-extrabold text-[var(--text)]">{submissions.filter(s => !['draft', 'pending', 'awaiting title'].includes(s.registrationStatus?.toLowerCase())).length}</span>
                        <span className="text-[8px] font-bold text-[var(--text-meta)] uppercase tracking-widest mt-1">Submits</span>
                      </div>
                      <div className="flex flex-col items-center text-center p-3 rounded-[1rem] border border-[var(--border)] bg-[var(--surface-alt)]">
                        <div className="h-7 w-7 rounded-lg bg-[var(--surface-alt)] text-[var(--muted)] flex items-center justify-center mb-2 shadow-sm"><i className="fas fa-clock text-xs"></i></div>
                        <span className="text-sm font-extrabold text-[var(--text)]">{avgReviewDaysLabel}</span>
                        <span className="text-[8px] font-bold text-[var(--text-meta)] uppercase tracking-widest mt-1">Avg. Days</span>
                      </div>
                      <div className="flex flex-col items-center text-center p-3 rounded-[1rem] border border-[var(--border)] bg-[var(--surface-alt)]">
                        <div className="h-7 w-7 rounded-lg bg-[var(--warning-soft)] text-[var(--warning)] flex items-center justify-center mb-2 shadow-sm"><i className="fas fa-shield-halved text-xs"></i></div>
                        <span className="text-sm font-extrabold text-[var(--text)]">{approvalRateLabel}</span>
                        <span className="text-[8px] font-bold text-[var(--text-meta)] uppercase tracking-widest mt-1">Approval</span>
                      </div>
                      <div className="flex flex-col items-center text-center p-3 rounded-[1rem] border border-[var(--border)] bg-[var(--surface-alt)]">
                        <div className="h-7 w-7 rounded-lg bg-[var(--info-soft)] text-[var(--info)] flex items-center justify-center mb-2 shadow-sm"><i className="fas fa-chart-pie text-xs"></i></div>
                        <span className="text-sm font-extrabold text-[var(--text)]">{submissionProgressPercent}%</span>
                        <span className="text-[8px] font-bold text-[var(--text-meta)] uppercase tracking-widest mt-1">Complete</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
