export type TitleStatus = 'pending' | 'approved' | 'needs-revision' | 'rejected' | 'draft';
export type TitleSortOption = 'newest' | 'oldest' | 'highest-similarity';

export type SimilarTitleRecord = {
  id: string;
  title: string;
  similarityScore: number;
};

export type AdviserTitleRecord = {
  id: string;
  groupId: string;
  title: string;
  description: string;
  // Not IT-only — this platform also serves Manufacturing Engineering Technology,
  // Technology Communication Management, Energy Systems, and Naval Architecture /
  // Marine Engineering (see src/lib/landing/departments-data.ts).
  department: string;
  status: TitleStatus;
  submittedAt: string;
  keywords: string[];
  similarityScore: number;
  similarTitles: SimilarTitleRecord[];
  membersCount: number;
  memberPreview: string[];
  groupMembers?: Array<{
    name: string;
    role: string;
    isLeader: boolean;
  }>;
  adviserAction: string;
  academicYear: string;
  uploadedFiles: Array<{
    id: string;
    name: string;
    url: string;
    previewUrl?: string;
    fileType?: string;
    size: number | null;
    documentCategory?: string | null;
  }>;
  // Independent review status for each stage's oral defense application
  // evidence photo — reviewed separately from (and typically after) that
  // stage's other decisions. `evidenceReview` is the Concept-stage one (kept
  // under its original name for backward compatibility); Proposal and Final
  // each get their own, since a group's evidence photo differs per stage.
  evidenceReview: EvidenceReview;
  proposalEvidenceReview: EvidenceReview;
  finalEvidenceReview: EvidenceReview;
};

export type EvidenceReview = {
  status: string;
  feedback: string | null;
  feedbackBy: string | null;
  uploaderNote: string | null;
  // Only the files belonging to this stage's latest submission — not every file
  // ever uploaded under this document category — so a resubmission after "Needs
  // Revision" replaces the old photo here instead of piling up alongside it.
  files: Array<{
    id: string;
    name: string;
    url: string;
    previewUrl?: string;
    fileType?: string;
    size: number | null;
    documentCategory?: string | null;
    uploadedAt?: string | null;
  }>;
} | null;

export const TITLE_SORT_OPTIONS: Array<{ value: TitleSortOption; label: string }> = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'highest-similarity', label: 'Highest Similarity' }
];

const titleStatusMeta: Record<
  TitleStatus,
  {
    label: string;
    badgeClassName: string;
    icon: string;
  }
> = {
  pending: {
    label: 'Pending',
    badgeClassName: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
    icon: 'fa-clock'
  },
  approved: {
    label: 'Ready for Concept Presentation',
    badgeClassName: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
    icon: 'fa-circle-check'
  },
  'needs-revision': {
    label: 'Revise',
    badgeClassName: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
    icon: 'fa-rotate-left'
  },
  rejected: {
    label: 'Rejected',
    badgeClassName: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
    icon: 'fa-ban'
  },
  draft: {
    label: 'Draft',
    badgeClassName: 'bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-200',
    icon: 'fa-file'
  }
};

export function getTitleStatusMeta(status: TitleStatus) {
  return titleStatusMeta[status];
}

export function formatTitleDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(value));
}

export function formatMemberPreview(members: string[], maxVisible = 2) {
  const visibleMembers = members.slice(0, maxVisible);
  const remainingCount = Math.max(0, members.length - visibleMembers.length);

  if (!visibleMembers.length) {
    return 'No members listed';
  }

  const preview = visibleMembers.join(', ');
  return remainingCount ? `${preview} +${remainingCount}` : preview;
}

export function getAcademicYearOptions(records: AdviserTitleRecord[]) {
  return Array.from(new Set(records.map((record) => record.academicYear)));
}

export function sortTitleRecords(records: AdviserTitleRecord[], sortBy: TitleSortOption) {
  return [...records].sort((left, right) => {
    if (sortBy === 'oldest') {
      return new Date(left.submittedAt).getTime() - new Date(right.submittedAt).getTime();
    }

    if (sortBy === 'highest-similarity') {
      return right.similarityScore - left.similarityScore;
    }

    return new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime();
  });
}

export function getSimilarityMeta(score: number, similarTitles: SimilarTitleRecord[]) {
  if (score >= 75 || similarTitles.length >= 2) {
    return {
      label: 'Similar Titles Found',
      toneClass: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
      helperClass: 'text-rose-600'
    };
  }

  if (score >= 45) {
    return {
      label: 'Needs Validation',
      toneClass: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
      helperClass: 'text-amber-600'
    };
  }

  return {
    label: 'Similarity Cleared',
    toneClass: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
    helperClass: 'text-emerald-600'
  };
}

export function getDefaultActionForStatus(status: TitleStatus) {
  if (status === 'approved') {
    return 'Approved. Proceed with official title registration and align the title across all project records.';
  }

  if (status === 'needs-revision') {
    return 'Revise the title wording, improve scope clarity, and resubmit for adviser validation.';
  }

  if (status === 'rejected') {
    return 'Rejected. Submit a more original and scope-aligned title before the next adviser review cycle.';
  }

  return 'Pending adviser review for originality, scope fit, and academic clarity.';
}
