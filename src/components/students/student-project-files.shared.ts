import type { StudentDashboardData } from '@/lib/services/student-workspace';
import { ADVISER_REVISE_LABEL, getAdviserClearedLabel, getCheckpointKeyForFileLabel } from '@/lib/stage-labels';

export type PortalRole = 'student' | 'adviser' | 'admin';

export type ProjectFileStatus = 'approved' | 'pending' | 'under_review' | 'revision' | 'rejected';

export type ProjectFileTag = 'Draft' | 'Final' | 'Revision';

export type ProjectFileSortOption = 'newest' | 'oldest' | 'status';

export type ProjectFileCategoryOption = {
  key: string;
  label: string;
};

export type ProjectFileHistoryEntry = {
  id: string;
  versionMajor: number;
  versionMinor: number;
  status: ProjectFileStatus;
  uploadedBy: string;
  uploadedAt: string;
  versionNotes: string;
  reviewedBy?: string;
  reviewedAt?: string;
  // Only set for a grouped multi-file record (e.g. an evidence category with
  // several individually-uploaded photos rolled into one row) — lets the
  // version history drawer open/download this specific file directly.
  fileUrl?: string;
  fileName?: string;
};

export type ProjectFileRecord = {
  id: string;
  projectId: string;
  category: string;
  // Stage-aware display label from the server, e.g. "Concept · Presentation Slides".
  label?: string | null;
  stageLabel?: string | null;
  fileName: string;
  fileUrl: string;
  versionMajor: number;
  versionMinor: number;
  status: ProjectFileStatus;
  tag: ProjectFileTag;
  versionNotes: string;
  uploadedBy: string;
  uploadedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string | null;
  latestReviewComment?: {
    id: string;
    body: string;
    decision: string;
    createdAt: string | Date;
    authorName?: string | null;
  } | null;
  reviewComments?: Array<{
    id: string;
    body: string;
    decision: string;
    createdAt: string | Date;
    authorName?: string | null;
  }>;
  isFinal: boolean;
  isRepositoryCopy: boolean;
  fileType: string;
  sizeLabel: string;
  uploadedById?: string;
  history: ProjectFileHistoryEntry[];
  isSuperseded?: boolean;
};

export const MAX_UPLOAD_FILES = 10;

export type ProjectFileUploadState = {
  files: File[];
  category: string;
  versionNotes: string;
  status: ProjectFileStatus;
  uploadedBy: string;
  uploadedAt: string;
  tag: ProjectFileTag;
};

// 'title-proposal' and 'concept-paper' were removed — both are already fully
// handled by Title Submission's bundled upload, so offering them again here
// was redundant and confusing (a file uploaded here under either category
// wasn't tracked against any real checkpoint anyway).
export const PROJECT_FILE_CATEGORY_OPTIONS: ProjectFileCategoryOption[] = [
  { key: 'proposal', label: 'Proposal' },
  { key: 'chapter-1', label: 'Chapter 1' },
  { key: 'chapter-2', label: 'Chapter 2' },
  { key: 'chapter-3', label: 'Chapter 3' },
  { key: 'chapter-4', label: 'Chapter 4' },
  { key: 'chapter-5', label: 'Chapter 5' },
  { key: 'system-files', label: 'System Files' },
  { key: 'presentation-files', label: 'Presentation' },
  { key: 'supporting-documents', label: 'Supporting Docs' },
  { key: 'final-manuscript', label: 'Final Manuscript' },
  { key: 'concept-defense-application', label: 'Oral Defense Application Evidence (Concept)' },
  { key: 'proposal-defense-application', label: 'Oral Defense Application Evidence (Proposal)' },
  { key: 'final-defense-application', label: 'Oral Defense Application Evidence (Final)' },
  { key: 'award-recognition', label: 'Award / Recognition' },
  { key: 'activity-evidence', label: 'Activity Evidence' },
  { key: 'other', label: 'Other' }
];

export const PROJECT_FILE_FILTER_OPTIONS = [
  { key: 'all', label: 'All Project Files' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'chapters', label: 'Chapter 1-5' },
  { key: 'system-files', label: 'System Files' },
  { key: 'presentation-files', label: 'Presentation' },
  { key: 'supporting-documents', label: 'Supporting Docs' },
  { key: 'concept-defense-application', label: 'Oral Defense Application Evidence (Concept)' },
  { key: 'proposal-defense-application', label: 'Oral Defense Application Evidence (Proposal)' },
  { key: 'final-defense-application', label: 'Oral Defense Application Evidence (Final)' },
  { key: 'award-recognition', label: 'Award / Recognition' },
  { key: 'activity-evidence', label: 'Activity Evidence' },
  { key: 'other', label: 'Other' }
];

export const PROJECT_FILE_SORT_OPTIONS: Array<{ key: ProjectFileSortOption; label: string }> = [
  { key: 'newest', label: 'Newest First' },
  { key: 'oldest', label: 'Oldest First' },
  { key: 'status', label: 'Status Priority' }
];

export const PROJECT_FILE_TAG_OPTIONS: ProjectFileTag[] = ['Draft', 'Revision', 'Final'];

export const PROJECT_FILE_PAGE_SIZE_OPTIONS = [5, 10, 20];

export function normalizeProjectFileStatus(value: string): ProjectFileStatus {
  const normalized = value.toLowerCase();

  if (normalized.includes('approved') || normalized.includes('official')) {
    return 'approved';
  }

  if (normalized.includes('under_review') || normalized.includes('under review') || normalized.includes('still reviewing') || normalized.includes('accepted')) {
    return 'under_review';
  }

  if (normalized.includes('revision')) {
    return 'revision';
  }

  if (normalized.includes('rejected') || normalized.includes('declined')) {
    return 'rejected';
  }

  return 'pending';
}

type ProjectFileStageContext = Pick<ProjectFileRecord, 'label' | 'stageLabel'>;

// What the adviser clearing this file means at its stage, e.g. a concept paper
// reads "Ready for Concept Presentation" — never a bare "Approved", since only
// the panel approves at the defense.
export function getProjectFileClearedLabel(file?: ProjectFileStageContext) {
  return getAdviserClearedLabel({
    checkpointKey: getCheckpointKeyForFileLabel(file?.label),
    stage: file?.stageLabel
  });
}

export function formatProjectFileStatus(status: ProjectFileStatus, file?: ProjectFileStageContext) {
  switch (status) {
    case 'approved':
      return getProjectFileClearedLabel(file);
    case 'under_review':
      return 'Under Adviser Review';
    case 'revision':
      return ADVISER_REVISE_LABEL;
    case 'rejected':
      return 'Declined';
    default:
      return 'Pending Review';
  }
}

export function formatProjectFileAdviserStatus(status: ProjectFileStatus, file?: ProjectFileStageContext) {
  switch (status) {
    case 'approved':
      return getProjectFileClearedLabel(file);
    case 'under_review':
      return 'Under Adviser Review';
    case 'revision':
      return ADVISER_REVISE_LABEL;
    case 'rejected':
      return 'Declined by Adviser';
    default:
      return 'Sent to Adviser';
  }
}

export function getProjectFileTone(status: ProjectFileStatus): 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'approved':
      return 'success';
    case 'under_review':
      return 'info';
    case 'revision':
    case 'rejected':
      return 'danger';
    default:
      return 'warning';
  }
}

export function getProjectFileTagFromStatus(status: ProjectFileStatus): ProjectFileTag {
  switch (status) {
    case 'approved':
      return 'Final';
    case 'under_review':
      return 'Revision';
    case 'revision':
    case 'rejected':
      return 'Revision';
    default:
      return 'Draft';
  }
}

// Mirrors CHECKPOINT_MATCHERS in src/lib/milestone-checkpoint-tracking.ts — a
// category name alone (e.g. "System Files") doesn't tell an adviser which
// workflow stage it actually belongs to, so this maps it to the same stage
// that category resolves to a checkpoint under. Evidence/achievement
// categories are excluded on purpose — they never reach this lookup since
// callers already filter those out before showing "which stage" badges.
const DOCUMENT_CATEGORY_STAGE: Record<string, string> = {
  proposal: 'Proposal',
  'chapter-1': 'Proposal',
  'chapter-2': 'Proposal',
  'chapter-3': 'Proposal',
  'chapter-4': 'Proposal',
  'chapter-5': 'Proposal',
  'supporting-documents': 'Proposal',
  'system-files': 'Development',
  'presentation-files': 'Final Defense',
  'final-manuscript': 'Final Defense'
};

export function getDocumentCategoryStage(category: string) {
  return DOCUMENT_CATEGORY_STAGE[category] || 'Proposal';
}

export function getProjectFileCategoryLabel(category: string) {
  return PROJECT_FILE_CATEGORY_OPTIONS.find((item) => item.key === category)?.label
    || category
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
}

// Capstone 1 (3rd yr, 2nd sem) = Concept + Proposal; Capstone 2 (4th yr, 1st
// sem) = Development, Final Defense, Completion. Pre-Final is no longer a
// stage, so old Pre-Final files count as Final Defense.
export type ProjectFileStageKey = 'concept' | 'proposal' | 'development' | 'final' | 'completion';

export const CAPSTONE_STAGE_OPTIONS: Record<1 | 2, Array<{ key: ProjectFileStageKey; label: string }>> = {
  1: [
    { key: 'concept', label: 'Concept' },
    { key: 'proposal', label: 'Proposal' }
  ],
  2: [
    { key: 'development', label: 'Development' },
    { key: 'final', label: 'Final Defense' },
    { key: 'completion', label: 'Completion' }
  ]
};

// The stage a file was filed under, falling back to its category for older uploads.
export function getProjectFileStageKey(file: ProjectFileRecord): ProjectFileStageKey | null {
  const stage = String(file.stageLabel || (file.label?.includes(' · ') ? file.label.split(' · ')[0] : '')).trim().toLowerCase();

  if (stage === 'concept' || stage === 'proposal' || stage === 'development' || stage === 'completion') return stage;
  if (stage === 'final' || stage === 'pre-final') return 'final';

  const category = file.category.toLowerCase();
  if (category.startsWith('concept') || category.startsWith('title')) return 'concept';
  if (category.startsWith('proposal') || ['chapter-1', 'chapter-2', 'chapter-3'].includes(category)) return 'proposal';
  if (category === 'system-files') return 'development';
  if (category.startsWith('final') || ['chapter-4', 'chapter-5'].includes(category)) return 'final';

  return null;
}

export function getProjectFileCapstone(file: ProjectFileRecord): 1 | 2 | null {
  const stage = getProjectFileStageKey(file);
  if (!stage) return null;
  return stage === 'concept' || stage === 'proposal' ? 1 : 2;
}

export function matchesProjectFileFilter(file: ProjectFileRecord, filter: string) {
  if (filter === 'all') {
    return true;
  }

  if (filter === 'chapters') {
    return file.category.startsWith('chapter-');
  }

  return file.category === filter;
}

export function compareProjectFileVersions(
  left: Pick<ProjectFileRecord, 'versionMajor' | 'versionMinor'>,
  right: Pick<ProjectFileRecord, 'versionMajor' | 'versionMinor'>
) {
  if (left.versionMajor !== right.versionMajor) {
    return left.versionMajor - right.versionMajor;
  }

  return left.versionMinor - right.versionMinor;
}

export function sortProjectFiles(files: ProjectFileRecord[], sortBy: ProjectFileSortOption) {
  const statusOrder: Record<ProjectFileStatus, number> = {
    rejected: 0,
    revision: 1,
    pending: 2,
    under_review: 3,
    approved: 4
  };

  return [...files].sort((left, right) => {
    if (sortBy === 'status') {
      const toneDelta = statusOrder[left.status] - statusOrder[right.status];
      if (toneDelta !== 0) {
        return toneDelta;
      }
    }

    const leftDate = new Date(left.uploadedAt).getTime();
    const rightDate = new Date(right.uploadedAt).getTime();

    if (sortBy === 'oldest') {
      return leftDate - rightDate;
    }

    return rightDate - leftDate;
  });
}

export function formatProjectFileDate(value?: string) {
  if (!value) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(value));
}

export function formatProjectFileDateTime(value?: string) {
  if (!value) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

export function formatFileSizeLabel(sizeInBytes: number) {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  }

  if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getProjectFileTypeIcon(fileName: string, fileType?: string) {
  const extension = fileName.split('.').pop()?.toLowerCase() || fileType?.toLowerCase() || '';

  if (extension.includes('pdf')) return 'fa-file-pdf';
  if (extension.includes('ppt')) return 'fa-file-powerpoint';
  if (extension.includes('doc')) return 'fa-file-word';
  if (extension.includes('zip') || extension.includes('rar')) return 'fa-file-zipper';
  if (extension.includes('png') || extension.includes('jpg') || extension.includes('jpeg') || extension.includes('webp')) return 'fa-file-image';
  return 'fa-file-lines';
}

export function formatProjectFileVersionLabel(versionMajor: number, versionMinor: number) {
  return `v${versionMajor}.${versionMinor}`;
}

export function getProjectFileVersionLabel(file: Pick<ProjectFileRecord, 'versionMajor' | 'versionMinor'>) {
  return formatProjectFileVersionLabel(file.versionMajor, file.versionMinor);
}

export function isProjectFileDeleteAllowed(file: ProjectFileRecord, role: PortalRole, currentUserId: string) {
  if (file.status === 'approved' || file.isRepositoryCopy) {
    return false;
  }

  if (role === 'admin') {
    return true;
  }

  if (role === 'adviser') {
    return false;
  }

  return file.uploadedById === currentUserId;
}

export function isProjectFileApproveAllowed(file: ProjectFileRecord, role: PortalRole) {
  return role === 'adviser' && file.status !== 'approved';
}

// Once a newer round has been uploaded for a category, that round's own
// rejected/needs-revision files are done — they're history now, not something
// still awaiting the student's action, so they read as "Superseded" instead
// of a live "Needs Revision" that looks like it's still the active ask.
export function markSupersededProjectFiles(files: ProjectFileRecord[]): ProjectFileRecord[] {
  return files.map((file) => {
    if ((file.status !== 'revision' && file.status !== 'rejected') || !file.reviewedAt) {
      return { ...file, isSuperseded: false };
    }

    const decisionTime = new Date(file.reviewedAt).getTime();
    const isSuperseded = files.some(
      (other) => other.id !== file.id && other.category === file.category && new Date(other.uploadedAt).getTime() > decisionTime
    );

    return { ...file, isSuperseded };
  });
}

const COMPLETED_STAGE_STATUSES = new Set(['approved', 'completed']);

function normalizeStageStatus(value: unknown) {
  return String(value || '').trim().replace(/[_-]+/g, ' ').toLowerCase();
}

function isCompletedStageStatus(value: unknown) {
  return COMPLETED_STAGE_STATUSES.has(normalizeStageStatus(value));
}

// Shared by the Document Submission page and the unified Submit page — both
// need to know whether uploads outside the concept-gate-exempt categories
// (achievement log, oral defense evidence) are unlocked yet.
export function hasCompletedConceptStage(data: StudentDashboardData) {
  const conceptMilestone = data.milestones.find((milestone) =>
    milestone.title.trim().toLowerCase().includes('concept')
  );

  const conceptCheckpoints = data.milestoneCheckpoints.filter((checkpoint) =>
    checkpoint.milestoneSequence === 1 ||
    checkpoint.milestoneTitle.trim().toLowerCase().includes('concept') ||
    checkpoint.key.startsWith('concept-')
  );
  const requiredConceptCheckpoints = conceptCheckpoints.filter((checkpoint) => checkpoint.required);

  if (requiredConceptCheckpoints.length > 0) {
    return requiredConceptCheckpoints.every((checkpoint) => isCompletedStageStatus(checkpoint.status));
  }

  return Boolean(conceptMilestone && isCompletedStageStatus(conceptMilestone.status));
}

// The 3 Oral Defense Application Evidence categories are meant to be submitted in
// this order — Concept, then Proposal, then Final. Nothing on the backend actually
// blocks submitting Final while Proposal is still pending/needs-revision, so this
// lets the Submit page warn a student who's about to jump ahead of their real stage.
const EVIDENCE_STAGE_KEYS_IN_ORDER = ['concept-defense-application', 'proposal-defense-application', 'final-defense-application'];

export function getSkippedEvidenceStageKey(data: StudentDashboardData, targetCategoryKey: string): string | null {
  const targetIndex = EVIDENCE_STAGE_KEYS_IN_ORDER.indexOf(targetCategoryKey);

  if (targetIndex <= 0) {
    return null;
  }

  for (let index = 0; index < targetIndex; index += 1) {
    const stageKey = EVIDENCE_STAGE_KEYS_IN_ORDER[index];
    const checkpoint = data.milestoneCheckpoints.find((item) => item.key === stageKey);

    if (!checkpoint || !isCompletedStageStatus(checkpoint.status)) {
      return stageKey;
    }
  }

  return null;
}

export function getNextProjectFileVersionParts(files: ProjectFileRecord[], category: string) {
  const categoryFiles = files.filter((item) => item.category === category);

  if (!categoryFiles.length) {
    return { versionMajor: 1, versionMinor: 0 };
  }

  const latestVersion = [...categoryFiles].sort((left, right) => compareProjectFileVersions(right, left))[0];

  return {
    versionMajor: latestVersion.versionMajor,
    versionMinor: latestVersion.versionMinor + 1
  };
}

export function getNextProjectFileVersion(files: ProjectFileRecord[], category: string) {
  const nextVersion = getNextProjectFileVersionParts(files, category);
  return formatProjectFileVersionLabel(nextVersion.versionMajor, nextVersion.versionMinor);
}
