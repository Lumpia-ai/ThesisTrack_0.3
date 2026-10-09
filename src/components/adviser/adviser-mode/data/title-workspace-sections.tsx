import { AdviserTitleEditSection } from '@/components/adviser/adviser-mode/adviser-title-edit-section';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type {
  AdviserTitleRecord,
  SimilarTitleRecord,
  TitleSortOption,
  TitleStatus
} from '@/components/adviser/adviser-mode/data/title-workspace-data';
import {
  formatTitleDate,
  getSimilarityMeta,
  getTitleStatusMeta
} from '@/components/adviser/adviser-mode/data/title-workspace-data';
import {
  type TitleSubmissionDocumentData
} from '@/lib/title-submission-document';
import { PremiumAnimatedButton } from '@/components/ui/premium-animated-button';
import { DASH_COLORS } from '@/components/adviser/shared/config/dashboard-types';
import { ADVISER_REVISE_LABEL, getAdviserClearedLabel } from '@/lib/stage-labels';
import { getFilePreviewKind, getGoogleViewerUrl, getSignedUrlPreview } from '@/lib/storage/file-preview';
import type { DocumentFileSummary } from '@/components/documents/document-file-controls';
import { formatFileSizeLabel, getProjectFileCategoryLabel } from '@/components/students/student-project-files.shared';

export type TitleSummaryMetric = {
  id: string;
  label: string;
  value: number;
  helperText: string;
  icon: string;
  iconClassName: string;
};

type TitleDetailsDrawerProps = {
  record: AdviserTitleRecord | null;
  remarksDraft: string;
  onRemarksChange: (value: string) => void;
  onClose: () => void;
  onApprove: (record: AdviserTitleRecord) => Promise<void> | void;
  onRequestRevision: (record: AdviserTitleRecord) => Promise<void> | void;
  onReject: (record: AdviserTitleRecord) => Promise<void> | void;
  // Adviser-only title correction (the group is locked after submitting).
  onTitleChanged?: (record: AdviserTitleRecord, title: string) => void;
  onMessage?: (message: string, type: 'success' | 'error') => void;
};

export type EvidenceReviewDrawerProps = {
  record: AdviserTitleRecord | null;
  onClose: () => void;
  // No "rejected" option here — the underlying MilestoneCheckpointStatus/ReviewStatus
  // enums have no distinct rejected value, so it would silently save as needs_revision
  // anyway (see the mapping in syncCheckpointReview). Only offer decisions the checkpoint
  // model can actually represent.
  onReviewEvidence: (
    record: AdviserTitleRecord,
    decision: 'approved' | 'needs_revision',
    remarks: string,
    checkpointKey: DefenseApplicationStageKey
  ) => Promise<void> | void;
};

export type DefenseApplicationStageKey =
  | 'concept-defense-application'
  | 'proposal-defense-application'
  | 'final-defense-application';

export const DEFENSE_APPLICATION_STAGES: Array<{
  checkpointKey: DefenseApplicationStageKey;
  stageLabel: string;
  reviewField: 'evidenceReview' | 'proposalEvidenceReview' | 'finalEvidenceReview';
  alwaysShow: boolean;
}> = [
  { checkpointKey: 'concept-defense-application', stageLabel: 'Concept', reviewField: 'evidenceReview', alwaysShow: true },
  { checkpointKey: 'proposal-defense-application', stageLabel: 'Proposal', reviewField: 'proposalEvidenceReview', alwaysShow: false },
  { checkpointKey: 'final-defense-application', stageLabel: 'Final', reviewField: 'finalEvidenceReview', alwaysShow: false }
];

// A group's title can be fully decided while a later-stage evidence round (e.g.
// Proposal or Final defense application evidence) is still awaiting the adviser —
// so "is this group still actionable" can't be judged from record.status alone.
// Shared by the card (badge count) and the list (default pending-only filter) so
// they can't drift apart.
export function getGroupPendingStageCount(record: AdviserTitleRecord) {
  return DEFENSE_APPLICATION_STAGES.filter((stage) => {
    const evidenceReview = record[stage.reviewField];
    const status = evidenceReview?.status;
    const hasFileForStage = (evidenceReview?.files?.length ?? 0) > 0;
    // A stage with nothing uploaded yet isn't "awaiting" the adviser — it's
    // waiting on the student, so it shouldn't inflate this count.
    return hasFileForStage && (status === 'SUBMITTED' || status === 'IN_REVIEW' || !status);
  }).length;
}

type TitleUploadedFile = AdviserTitleRecord['uploadedFiles'][number];

const GENERATED_PREVIEW_ID = 'generated';
const OFFICE_FILE_EXTENSIONS = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'];
const IMAGE_FILE_EXTENSIONS = ['jpg', 'jpeg', 'png'];
const COMPLIANCE_EVIDENCE_CATEGORIES: Record<string, string> = {
  'concept-defense-application': 'Concept',
  'proposal-defense-application': 'Proposal',
  'final-defense-application': 'Final'
};

function getTitleFileExtension(fileName: string, fileType?: string | null) {
  const extension = fileName.split('.').pop()?.toLowerCase();

  if (extension && extension !== fileName.toLowerCase()) {
    return extension;
  }

  if (fileType?.includes('pdf')) return 'pdf';
  if (fileType?.includes('word')) return 'docx';
  if (fileType?.includes('presentation')) return 'pptx';
  if (fileType?.includes('spreadsheet') || fileType?.includes('excel')) return 'xlsx';

  return 'file';
}

function getTitleFileIcon(file: TitleUploadedFile) {
  const extension = getTitleFileExtension(file.name, file.fileType);

  if (extension === 'pdf') return 'fa-file-pdf';
  if (['doc', 'docx'].includes(extension)) return 'fa-file-word';
  if (['ppt', 'pptx'].includes(extension)) return 'fa-file-powerpoint';
  if (['xls', 'xlsx', 'csv'].includes(extension)) return 'fa-file-excel';
  if (IMAGE_FILE_EXTENSIONS.includes(extension)) return 'fa-file-image';

  return 'fa-file-lines';
}

function isTitleOfficeFile(file: TitleUploadedFile) {
  const extension = getTitleFileExtension(file.name, file.fileType);

  return OFFICE_FILE_EXTENSIONS.includes(extension);
}

function isTitleImageFile(file: TitleUploadedFile) {
  const extension = getTitleFileExtension(file.name, file.fileType);

  return IMAGE_FILE_EXTENSIONS.includes(extension);
}

// Flags the photo evidence of a signed Application for Oral Defense of Thesis
// (any stage) so the adviser drawer can label it distinctly from the concept
// paper / chapters / manuscript instead of listing it as a generic "attachment".
function isComplianceEvidenceFile(file: TitleUploadedFile) {
  return Boolean(file.documentCategory && COMPLIANCE_EVIDENCE_CATEGORIES[file.documentCategory]);
}

function getTitleFilePreviewUrl(file: TitleUploadedFile, signedUrl?: string) {
  if (signedUrl && isTitleOfficeFile(file)) {
    return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(signedUrl)}`;
  }

  return file.previewUrl || file.url.replace('/download', '/preview');
}

function formatTitleFileSize(size?: number | null) {
  if (!size) {
    return 'Size unavailable';
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

export function getEvidenceReviewMeta(status?: string, stageLabel?: string) {
  switch (status) {
    case 'COMPLETED':
    case 'APPROVED':
      return { label: stageLabel ? getAdviserClearedLabel({ stage: stageLabel }) : 'Cleared by Adviser', className: 'bg-emerald-50 text-emerald-700 ring-emerald-100', icon: 'fa-circle-check' };
    case 'NEEDS_REVISION':
      return { label: ADVISER_REVISE_LABEL, className: 'bg-amber-50 text-amber-700 ring-amber-100', icon: 'fa-rotate-left' };
    case 'REJECTED':
      return { label: 'Rejected', className: 'bg-rose-50 text-rose-700 ring-rose-100', icon: 'fa-ban' };
    case 'SUBMITTED':
    case 'IN_REVIEW':
      return { label: 'Pending Review', className: 'bg-blue-50 text-blue-700 ring-blue-100', icon: 'fa-hourglass-half' };
    default:
      return { label: 'Not Uploaded Yet', className: 'bg-slate-100 text-slate-600 ring-slate-200', icon: 'fa-circle-exclamation' };
  }
}

function formatEvidenceUploadedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function getTitleDecisionPanelCopy(status: TitleStatus) {
  if (status === 'approved') {
    return {
      title: 'Decision Recorded',
      description: 'The title is Ready for Concept Presentation. You can still revise the decision if the record needs correction.',
      note: 'Students see Ongoing Concept, and the Program Head can now schedule the presentation and assign panel members.'
    };
  }

  if (status === 'needs-revision') {
    return {
      title: 'Revision Requested',
      description: 'The proposal has been returned. Add or adjust remarks before updating the decision.',
      note: 'Students see the revision state and can prepare a corrected title package.'
    };
  }

  if (status === 'rejected') {
    return {
      title: 'Title Rejected',
      description: 'The proposal was declined. Use this panel if the decision needs to be changed.',
      note: 'Students see the rejected state and should submit another proposal.'
    };
  }

  return {
    title: 'Ready for Decision',
    description: 'Review the title, similarity, members, and attached proposal before recording a decision.',
    note: 'This action updates the student timeline and sends a title review notification.'
  };
}

function createAdviserTitleDocumentData(record: AdviserTitleRecord): TitleSubmissionDocumentData {
  const statusMeta = getTitleStatusMeta(record.status);
  const similarityMeta = getSimilarityMeta(record.similarityScore, record.similarTitles);

  return {
    documentId: record.id,
    groupId: record.groupId,
    department: record.department,
    academicYear: record.academicYear,
    adviser: 'Assigned adviser',
    proposedTitle: record.title,
    description: record.description,
    background: record.description,
    statementOfProblem:
      'The title is under adviser review to verify scope clarity, similarity risk, and alignment with the intended capstone direction.',
    objectives: [
      'Validate the clarity and scope of the proposed title.',
      'Check title similarity against existing records.',
      'Confirm whether the title is ready for approval, revision, or rejection.'
    ],
    category: `${record.department} Capstone Title Proposal`,
    keywords: record.keywords,
    groupMembers: record.memberPreview,
    status: statusMeta.label,
    submittedAt: record.submittedAt,
    updatedAt: record.submittedAt,
    latestReviewer: 'Adviser Review Queue',
    latestAction: record.adviserAction,
    validationStatus: similarityMeta.label,
    validationNote: similarityMeta.helperClass.includes('rose')
      ? 'Related titles need adviser attention before approval.'
      : 'Similarity result is available for adviser validation.',
    similarityScore: record.similarityScore,
    similarTitles: record.similarTitles.map((item) => ({
      title: item.title,
      similarityScore: item.similarityScore,
      label: `${item.similarityScore}% similarity`
    })),
    attachments: record.uploadedFiles.map((file) => ({
      fileName: file.name,
      fileType: getTitleFileExtension(file.name, file.fileType).toUpperCase(),
      sizeLabel: formatTitleFileSize(file.size),
      status: 'Attached to title proposal'
    })),
    remarks: record.adviserAction
  };
}

export function TitleSummaryCards({ metrics }: { metrics: TitleSummaryMetric[] }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
      {metrics.map((metric) => (
        <article
          key={metric.id}
          className="group relative flex min-h-[160px] flex-col justify-between overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] backdrop-blur-xl p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[var(--primary)]/30 hover:shadow-lg hover:shadow-[var(--primary)]/10"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--primary)] to-[var(--color-info)] opacity-60 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-[var(--text-meta)]">{metric.label}</p>
              <p className="mt-2 text-4xl font-extrabold tracking-tight text-[var(--text)] transition-colors group-hover:text-[var(--primary)]">
                {metric.value}
              </p>
            </div>
            <span
              className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg shadow-sm ring-1 ring-inset ring-current/10 transition-transform duration-300 group-hover:scale-110 ${metric.iconClassName}`}
            >
              <i className={`fas ${metric.icon}`} />
            </span>
          </div>
          <p className="mt-4 text-xs font-medium leading-[1.6] text-[var(--muted)]">{metric.helperText}</p>
        </article>
      ))}
    </div>
  );
}

export type OtherDocumentsGroup = {
  projectId: string;
  projectTitle: string;
  groupLabel: string;
  groupMembers: Array<{ userId?: string; name: string; role: string; isLeader: boolean }>;
  files: DocumentFileSummary[];
};

export function OtherDocumentReviewModal({
  file,
  isSaving,
  onClose,
  onDecide
}: {
  file: DocumentFileSummary;
  isSaving: boolean;
  onClose: () => void;
  onDecide: (decision: 'approved' | 'needs_revision', remarks: string) => void;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');
  useEffect(() => { setIsMounted(true); }, []);
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.removeProperty('overflow'); };
  }, []);

  // Office files (doc/docx/ppt/pptx/xls/xlsx) can't render natively in an
  // iframe — pointed at the raw file, the browser just downloads it instead
  // of showing it. Same fix as the Title drawer's preview: fetch a signed URL
  // and hand it to Google's viewer for those types.
  useEffect(() => {
    let cancelled = false;

    const loadSignedUrl = async () => {
      try {
        const response = await fetch(`/api/document-files/${file.id}/signed-url`, { method: 'POST' });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.message || payload?.error || 'Unable to prepare document preview.');
        }

        if (!cancelled) {
          setSignedUrl(payload.signedUrl);
        }
      } catch (error) {
        if (!cancelled) {
          setPreviewError(error instanceof Error ? error.message : 'Unable to prepare document preview.');
        }
      }
    };

    loadSignedUrl();

    return () => {
      cancelled = true;
    };
  }, [file.id]);

  if (!isMounted) {
    return null;
  }

  // Office via the Google viewer; PDF/images via the preview route (correct content type);
  // anything else is not embedded, so opening the modal can never trigger a download.
  const previewKind = getFilePreviewKind(file.fileName);
  const previewUrl =
    previewKind === 'office'
      ? signedUrl ? getGoogleViewerUrl(signedUrl) : null
      : previewKind === 'none'
        ? null
        : `/api/document-files/${file.id}/preview`;

  return createPortal(
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-6" onClick={onClose}>
      <div
        aria-label="Document review modal"
        aria-modal="true"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-full w-full max-w-[1560px] flex-col overflow-hidden rounded-[2rem] bg-white/95 backdrop-blur-3xl shadow-[0_24px_80px_rgba(15,23,42,0.28)] ring-1 ring-white/60"
      >
        <header className="relative shrink-0 border-b border-slate-100 bg-white/80 backdrop-blur px-6 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-600">
                <i className="fas fa-file-lines opacity-70" /> Document Review
              </p>
              <h2 className="mt-2 truncate text-2xl font-black tracking-tight text-slate-900 leading-tight" title={file.fileName}>{file.fileName}</h2>
            </div>
            <button
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100/80 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 focus:outline-none"
              type="button"
              onClick={onClose}
            >
              <i className="fas fa-xmark text-lg" />
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-inset ring-slate-200/80">
              {getProjectFileCategoryLabel(file.documentCategory)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-200/60">
              <i className="fas fa-hard-drive text-[10px]" aria-hidden="true" />
              {formatFileSizeLabel(file.fileSize || 0)}
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50/40 px-4 py-4 sm:px-6 sm:py-6 custom-scrollbar">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
            <div className="min-w-0 space-y-5">
              <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
                <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.15em] text-blue-700">
                      {getTitleFileExtension(file.fileName, file.fileType).toUpperCase()} Preview
                    </p>
                    <h2 className="mt-1 truncate text-lg font-black text-slate-950">Document Preview</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-blue-700 transition hover:bg-blue-50"
                      href={previewUrl || `/api/document-files/${file.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i className="fas fa-up-right-from-square text-[10px]" aria-hidden="true" />
                      Open
                    </a>
                    <a
                      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-blue-700 transition hover:bg-blue-50"
                      href={`/api/document-files/${file.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i className="fas fa-download text-[10px]" aria-hidden="true" />
                      Download
                    </a>
                  </div>
                </div>

                <div className="bg-slate-100 p-3 sm:p-4">
                  {previewError ? (
                    <div className="flex h-[min(70vh,780px)] w-full flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-center">
                      <i className="fas fa-triangle-exclamation text-2xl text-amber-500" aria-hidden="true" />
                      <p className="text-sm font-bold text-slate-600">{previewError}</p>
                      <p className="text-xs text-slate-400">Use Download instead.</p>
                    </div>
                  ) : previewKind === 'none' ? (
                    <div className="flex h-[min(70vh,780px)] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white text-center">
                      <i className="fas fa-file-circle-question text-2xl text-slate-300" aria-hidden="true" />
                      <p className="text-sm font-bold text-slate-600">No inline preview for this file type.</p>
                      <a className="text-xs font-bold text-blue-700 underline" href={`/api/document-files/${file.id}/download`} target="_blank" rel="noopener noreferrer">Download to view it</a>
                    </div>
                  ) : previewUrl ? (
                    <iframe
                      className="h-[min(70vh,780px)] w-full rounded-xl border border-slate-200 bg-white"
                      src={previewUrl}
                      title={`${file.fileName} preview`}
                    />
                  ) : (
                    <div className="flex h-[min(70vh,780px)] w-full flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white">
                      <i className="fas fa-spinner fa-spin text-2xl text-[var(--primary)]" aria-hidden="true" />
                      <p className="text-sm font-bold text-slate-500">Preparing preview...</p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <aside className="space-y-5 self-start xl:sticky xl:top-0">
              <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
                <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 p-5 text-white">
                  <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-blue-100">
                    <i className="fas fa-clipboard-check" /> Document Decision
                  </p>
                  <h3 className="mt-1 text-lg font-black">Ready for Decision</h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-blue-100">
                    Review the document, then clear it for the next step or send it back for revision.
                  </p>
                </div>

                <div className="p-5">
                  <label className="block">
                    <span className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-blue-700">
                      <i className="fas fa-comment-dots" /> Adviser Remarks
                    </span>
                    <textarea
                      className="mt-3 min-h-[130px] w-full rounded-xl border border-blue-200/80 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-inner outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      placeholder="Add notes for approval or revision..."
                      value={remarks}
                      onChange={(event) => setRemarks(event.target.value)}
                    />
                  </label>

                  <div className="mt-4 grid gap-3">
                    <button
                      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-black text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 hover:shadow-lg focus:outline-none disabled:opacity-50"
                      type="button"
                      disabled={isSaving}
                      onClick={() => onDecide('approved', remarks)}
                    >
                      <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-check'}`} /> {getAdviserClearedLabel({ checkpointKey: file.checkpointKey, stage: file.stage })}
                    </button>
                    <button
                      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-50 px-6 text-sm font-black text-amber-700 shadow-sm ring-1 ring-inset ring-amber-200 transition hover:bg-amber-100 hover:ring-amber-300 focus:outline-none disabled:opacity-50"
                      type="button"
                      disabled={isSaving}
                      onClick={() => onDecide('needs_revision', remarks)}
                    >
                      <i className="fas fa-rotate-left" /> Request Revision
                    </button>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Same blue-ramp meanings as the approval queues (stronger blue = healthier).
const TITLE_STATUS_COLORS: Record<TitleStatus, string> = {
  pending: DASH_COLORS.warning,
  approved: DASH_COLORS.good,
  'needs-revision': DASH_COLORS.critical,
  rejected: DASH_COLORS.criticalStrong,
  draft: DASH_COLORS.neutral
};

const TITLE_CONFIRM_COPY = {
  approve: {
    title: 'Mark this title Ready for Concept Presentation?',
    body: 'The group moves to Ongoing Concept and the Program Head can schedule their Concept Presentation. The title is only approved once the panel decides.',
    confirm: 'Ready for Concept Presentation'
  },
  revise: {
    title: 'Request a revision?',
    body: 'The group is notified and will need to revise and resubmit the proposal.',
    confirm: 'Request revision'
  },
  reject: {
    title: 'Reject this title?',
    body: 'The proposal is declined and the group will need to submit a different title.',
    confirm: 'Reject title'
  }
} as const;

export function TitleDetailsDrawer({
  record,
  remarksDraft,
  onRemarksChange,
  onClose,
  onApprove,
  onRequestRevision,
  onReject,
  onTitleChanged,
  onMessage
}: TitleDetailsDrawerProps) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);
  useEffect(() => {
    if (record) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [!!record]);

  const [selectedPreviewId, setSelectedPreviewId] = useState<string>(GENERATED_PREVIEW_ID);
  const [signedPreviewUrls, setSignedPreviewUrls] = useState<Record<string, string>>({});
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'revise' | 'reject' | null>(null);
  // Evidence photos now live only in the separate EvidenceReviewDrawer, so this drawer's
  // file preview/attached-documents lists stay scoped to the title proposal's own files.
  const uploadedFiles = (record?.uploadedFiles ?? []).filter((file) => !isComplianceEvidenceFile(file));
  const firstUploadedFileId = uploadedFiles[0]?.id;
  const documentData = useMemo(() => (record ? createAdviserTitleDocumentData(record) : null), [record]);
  const selectedUploadedFile = uploadedFiles.find((file) => file.id === selectedPreviewId) || null;
  const selectedSignedUrl = selectedUploadedFile ? signedPreviewUrls[selectedUploadedFile.id] : '';
  const selectedFileIsOffice = selectedUploadedFile ? isTitleOfficeFile(selectedUploadedFile) : false;

  useEffect(() => {
    if (firstUploadedFileId) {
      setSelectedPreviewId(firstUploadedFileId);
    }
  }, [record?.id, firstUploadedFileId]);

  useEffect(() => {
    if (!selectedUploadedFile || !selectedFileIsOffice) {
      setPreviewError(null);
      return;
    }

    if (selectedSignedUrl) {
      setPreviewError(null);
      return;
    }

    let cancelled = false;
    setPreviewError(null);

    const loadSignedPreviewUrl = async () => {
      try {
        const response = await fetch(`/api/document-files/${selectedUploadedFile.id}/signed-url`, {
          method: 'POST'
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload?.signedUrl) {
          throw new Error(payload?.message || payload?.error || 'Unable to prepare document preview.');
        }

        if (!cancelled) {
          setSignedPreviewUrls((current) => ({
            ...current,
            [selectedUploadedFile.id]: payload.signedUrl
          }));
        }
      } catch (error) {
        if (!cancelled) {
          setPreviewError(error instanceof Error ? error.message : 'Unable to prepare document preview.');
        }
      }
    };

    loadSignedPreviewUrl();

    return () => {
      cancelled = true;
    };
  }, [selectedUploadedFile?.id, selectedFileIsOffice, selectedSignedUrl]);

  if (!record || !documentData || !isMounted) {
    return null;
  }

  const statusMeta = getTitleStatusMeta(record.status);
  const statusColor = TITLE_STATUS_COLORS[record.status];
  const decisionPanelCopy = getTitleDecisionPanelCopy(record.status);
  const similarityMeta = getSimilarityMeta(record.similarityScore, record.similarTitles);
  const selectedPreviewUrl = selectedUploadedFile
    ? getTitleFilePreviewUrl(selectedUploadedFile, selectedSignedUrl)
    : null;
  const openHref = selectedUploadedFile
    ? selectedPreviewUrl || selectedUploadedFile.previewUrl || selectedUploadedFile.url
    : null;
  const members = record.groupMembers?.length
    ? record.groupMembers
    : record.memberPreview.map((name) => ({ name, isLeader: false }));
  const confirmCopy = confirmAction ? TITLE_CONFIRM_COPY[confirmAction] : null;

  return createPortal(
    <div className="adviser-tdm-overlay" onClick={onClose}>
      <div
        aria-labelledby="adviser-tdm-title"
        aria-modal="true"
        className="adviser-title-details-modal adviser-tdm"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="adviser-tdm-header">
          <div className="adviser-tdm-heading">
            <p className="adviser-tdm-kicker">Title proposal</p>
            <h2 id="adviser-tdm-title" title={record.title}>{record.title}</h2>
            <p className="adviser-tdm-meta">
              <span className="adviser-tdm-code">{record.groupId}</span>
              <span>{record.academicYear}</span>
              <span>Submitted {formatTitleDate(record.submittedAt)}</span>
              <span>{record.membersCount} members</span>
            </p>
          </div>
          <span className="adviser-tdm-status" style={{ '--tone': statusColor } as CSSProperties}>
            <span aria-hidden="true" />
            {statusMeta.label}
          </span>
          <button className="adviser-tdm-close" type="button" aria-label="Close" onClick={onClose}>
            <i className="fas fa-xmark" aria-hidden="true" />
          </button>
        </header>

        <div className="adviser-tdm-body">
          <section className="adviser-tdm-preview" aria-label="Proposal files">
            <div className="adviser-tdm-filebar">
              <div className="adviser-tdm-tabs" role="tablist" aria-label="Attached files">
                {uploadedFiles.length ? (
                  uploadedFiles.map((file) => (
                    <button
                      key={file.id}
                      type="button"
                      role="tab"
                      aria-selected={selectedPreviewId === file.id}
                      className={selectedPreviewId === file.id ? 'is-active' : undefined}
                      title={`${file.name} · ${formatTitleFileSize(file.size)}`}
                      onClick={() => setSelectedPreviewId(file.id)}
                    >
                      <i className={`fas ${getTitleFileIcon(file)}`} aria-hidden="true" />
                      <span>{file.name}</span>
                    </button>
                  ))
                ) : (
                  <span className="adviser-tdm-muted">No files attached</span>
                )}
              </div>
              {selectedUploadedFile && openHref ? (
                <div className="adviser-tdm-file-actions">
                  <a href={openHref} target="_blank" rel="noopener noreferrer" title="Open in a new tab">
                    <i className="fas fa-up-right-from-square" aria-hidden="true" />
                    Open
                  </a>
                  <a href={selectedUploadedFile.url} target="_blank" rel="noopener noreferrer" title="Download">
                    <i className="fas fa-download" aria-hidden="true" />
                    Download
                  </a>
                </div>
              ) : null}
            </div>

            <div className="adviser-tdm-viewer">
              {!selectedUploadedFile ? (
                <div className="adviser-tdm-state">
                  <i className="fas fa-file-circle-question" aria-hidden="true" />
                  <p>No file was uploaded with this proposal.</p>
                </div>
              ) : selectedFileIsOffice && !selectedSignedUrl ? (
                <div className="adviser-tdm-state">
                  <i className={`fas ${previewError ? 'fa-circle-exclamation' : 'fa-spinner fa-spin'}`} aria-hidden="true" />
                  <p>{previewError ? 'Preview unavailable for this file.' : 'Preparing document preview…'}</p>
                  {previewError ? (
                    <>
                      <small>{previewError}</small>
                      <a href={selectedUploadedFile.url} target="_blank" rel="noopener noreferrer">
                        Open file instead
                      </a>
                    </>
                  ) : null}
                </div>
              ) : isTitleImageFile(selectedUploadedFile) && openHref ? (
                <div className="adviser-tdm-image">
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL, not a static asset */}
                  <img src={openHref} alt={`${selectedUploadedFile.name} preview`} />
                </div>
              ) : openHref && getFilePreviewKind(selectedUploadedFile.name) !== 'none' ? (
                <iframe src={openHref} title={`${selectedUploadedFile.name} preview`} />
              ) : (
                <div className="adviser-tdm-state">
                  <i className="fas fa-file-circle-question" aria-hidden="true" />
                  <p>No inline preview for this file type.</p>
                  <a href={selectedUploadedFile.url} target="_blank" rel="noopener noreferrer">Download to view it</a>
                </div>
              )}
            </div>
          </section>

          <aside className="adviser-tdm-aside" aria-label="Review">
            <section className="adviser-tdm-section">
              <h3>Decision</h3>
              {record.status !== 'pending' ? <p className="adviser-tdm-note">{decisionPanelCopy.description}</p> : null}
              <label className="adviser-tdm-label" htmlFor="adviser-tdm-remarks">Remarks to the group</label>
              <textarea
                id="adviser-tdm-remarks"
                className="adviser-tdm-textarea"
                placeholder="Explain your decision so the group knows what to do next"
                value={remarksDraft}
                onChange={(event) => onRemarksChange(event.target.value)}
              />
              <div className="adviser-tdm-actions">
                <button type="button" className="adviser-tdm-btn is-primary" onClick={() => setConfirmAction('approve')}>
                  <i className="fas fa-check" aria-hidden="true" />
                  Ready for Concept Presentation
                </button>
                <button type="button" className="adviser-tdm-btn" onClick={() => setConfirmAction('revise')}>
                  <i className="fas fa-rotate-left" aria-hidden="true" />
                  Request revision
                </button>
                <button type="button" className="adviser-tdm-btn is-danger" onClick={() => setConfirmAction('reject')}>
                  <i className="fas fa-ban" aria-hidden="true" />
                  Reject
                </button>
              </div>
            </section>

            {onTitleChanged ? (
              <AdviserTitleEditSection
                projectId={record.id}
                onTitleChanged={(title) => onTitleChanged(record, title)}
                onMessage={(message, type) => onMessage?.(message, type)}
              />
            ) : null}

            <section className="adviser-tdm-section">
              <h3>Similarity</h3>
              <p className="adviser-tdm-figure">
                <strong>{record.similarityScore}%</strong>
                <span>{similarityMeta.label}</span>
              </p>
              {record.similarTitles.length ? (
                <ul className="adviser-tdm-list">
                  {record.similarTitles.map((item) => (
                    <li key={item.id}>
                      <span>{item.title}</span>
                      <strong>{item.similarityScore}%</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="adviser-tdm-muted">No related titles found in the archive.</p>
              )}
            </section>

            <section className="adviser-tdm-section">
              <h3>Description</h3>
              <p className="adviser-tdm-text">{record.description || 'No description provided.'}</p>
              {record.keywords.length ? (
                <div className="adviser-tdm-tags">
                  {record.keywords.map((keyword) => (
                    <span key={keyword}>{keyword}</span>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="adviser-tdm-section">
              <h3>Members</h3>
              <ul className="adviser-tdm-members">
                {members.map((member, index) => (
                  <li key={`${member.name}-${index}`}>
                    <span aria-hidden="true">{member.name.trim().charAt(0).toUpperCase() || '?'}</span>
                    {member.name}
                    {member.isLeader ? <small>Leader</small> : null}
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>

        {confirmAction && confirmCopy ? (
          <div className="adviser-tdm-confirm" role="alertdialog" aria-labelledby="adviser-tdm-confirm-title">
            <div>
              <h3 id="adviser-tdm-confirm-title">{confirmCopy.title}</h3>
              <p>{confirmCopy.body}</p>
              <div className="adviser-tdm-confirm-actions">
                <button type="button" className="adviser-tdm-btn" onClick={() => setConfirmAction(null)}>
                  Cancel
                </button>
                <PremiumAnimatedButton
                  className={`adviser-tdm-btn ${confirmAction === 'reject' ? 'is-danger-solid' : 'is-primary'}`}
                  onPress={async () => {
                    if (confirmAction === 'approve') await onApprove(record);
                    if (confirmAction === 'revise') await onRequestRevision(record);
                    if (confirmAction === 'reject') await onReject(record);
                    await new Promise((resolve) => setTimeout(resolve, 600)); // Minimum animation time
                    setConfirmAction(null);
                  }}
                >
                  {confirmCopy.confirm}
                </PremiumAnimatedButton>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}

// Fully separate from TitleDetailsDrawer/its "Open Preview" button — a title decision and
// an evidence decision are independent checkpoints on the backend (see applyDecision vs
// applyEvidenceDecision in adviser-title-approval.tsx), and this drawer keeps that true in
// the UI too: approving a title here can never also affect evidence status, because there's
// no shared approve action or shared state between the two anymore.
export function EvidenceReviewDrawer({ record, onClose, onReviewEvidence }: EvidenceReviewDrawerProps) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);
  useEffect(() => {
    if (record) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [!!record]);

  const [evidenceRemarksDrafts, setEvidenceRemarksDrafts] = useState<Record<string, string>>({});
  const [submittingEvidenceKey, setSubmittingEvidenceKey] = useState<DefenseApplicationStageKey | null>(null);
  // Which photo is currently shown per stage, when a stage has more than one uploaded file.
  const [evidenceSlideIndex, setEvidenceSlideIndex] = useState<Record<string, number>>({});
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  // A native window.confirm() can silently return false (or never appear at all) in some
  // embedded/webview browser contexts, which made Approve/Reject look like they did nothing.
  // This in-app confirm (same pattern as TitleDetailsDrawer's) doesn't depend on the browser's
  // own dialog implementation.
  const [confirmEvidenceAction, setConfirmEvidenceAction] = useState<{
    checkpointKey: DefenseApplicationStageKey;
    decision: 'approved' | 'needs_revision';
    stageLabel: string;
  } | null>(null);

  // A group can have multiple evidence stages pending at once, so a single decision
  // shouldn't close the drawer out from under the adviser if other stages still need
  // review. This flag is set right after a successful decision, and the effect below
  // closes the drawer once the record (re-derived from fresh parent state) shows no
  // pending stages left.
  const justDecidedRef = useRef(false);
  useEffect(() => {
    if (record && justDecidedRef.current && getGroupPendingStageCount(record) === 0) {
      justDecidedRef.current = false;
      onClose();
    }
  }, [record, onClose]);

  const submitEvidenceDecision = async (
    checkpointKey: DefenseApplicationStageKey,
    decision: 'approved' | 'needs_revision'
  ) => {
    if (!record || submittingEvidenceKey) {
      return;
    }

    setEvidenceError(null);
    setSubmittingEvidenceKey(checkpointKey);

    try {
      await onReviewEvidence(record, decision, evidenceRemarksDrafts[checkpointKey] || '', checkpointKey);
      setEvidenceRemarksDrafts((current) => ({ ...current, [checkpointKey]: '' }));
      justDecidedRef.current = true;
    } catch (error) {
      setEvidenceError(error instanceof Error ? error.message : 'Unable to update the evidence review.');
    } finally {
      setSubmittingEvidenceKey(null);
    }
  };

  if (!record || !isMounted) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-6" onClick={onClose}>
      <div
        aria-label="Oral defense application evidence modal"
        aria-modal="true"
        className="relative flex flex-col max-h-full w-full max-w-[900px] overflow-hidden rounded-[2rem] bg-white/95 backdrop-blur-3xl shadow-[0_24px_80px_rgba(15,23,42,0.28)] ring-1 ring-white/60 transition-all scale-100"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="relative shrink-0 border-b border-slate-100 bg-white/80 backdrop-blur px-6 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-amber-600">
                <i className="fas fa-file-signature opacity-70" /> Oral Defense Application Evidence
              </p>
              <h2 className="mt-2 truncate text-2xl font-black tracking-tight text-slate-900 leading-tight">{record.title}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {record.groupId} · Reviewed independently from the title decision
              </p>
            </div>
            <button
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100/80 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 focus:outline-none"
              type="button"
              onClick={onClose}
            >
              <i className="fas fa-xmark text-lg" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50/40 px-4 py-4 sm:px-6 sm:py-6 custom-scrollbar space-y-5">
          {evidenceError && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm font-medium text-rose-800 shadow-sm">
              <i className="fas fa-circle-exclamation mt-0.5 shrink-0" aria-hidden="true" />
              <p>{evidenceError}</p>
            </div>
          )}

          {DEFENSE_APPLICATION_STAGES.map((stage) => {
            const evidenceReview = record[stage.reviewField];
            // Sourced from the checkpoint's latest submission (evidenceReview.files),
            // not a category-wide filter over every file ever uploaded — otherwise a
            // resubmission after "Needs Revision" would pile up next to the old,
            // already-superseded photo instead of replacing it in this carousel.
            const evidenceFiles = evidenceReview?.files ?? [];
            const slideIndex = Math.min(evidenceSlideIndex[stage.checkpointKey] ?? 0, Math.max(evidenceFiles.length - 1, 0));
            const evidenceFile = evidenceFiles[slideIndex] ?? null;
            // ensureProjectMilestoneWorkflow pre-creates every stage's checkpoint row up
            // front, so evidenceReview exists (status PENDING) even for a stage the group
            // hasn't reached yet — checking the file/status is what actually tells us
            // whether there's real activity to show.
            const hasStageActivity = evidenceFiles.length > 0 || (evidenceReview ? evidenceReview.status !== 'PENDING' : false);
            // Once a stage is already decided there's nothing left to act on here — it
            // already has a read-only home on Document Submissions (see
            // toAdviserSubmissionRecordsFromEvidence in submission-workspace-data.ts),
            // so this drawer (which exists to collect pending decisions) doesn't need
            // to keep showing it too. This also removes the chance of an accidental
            // re-decision flipping an approved stage back to Needs Revision, which now
            // deletes its stored photo (see defense-application-evidence/route.ts).
            const isDecided = evidenceReview
              ? ['APPROVED', 'COMPLETED', 'REJECTED'].includes(evidenceReview.status)
              : false;

            // Proposal/Final cards only appear once there's something to review — no point
            // cluttering the drawer with a card for a stage the group hasn't reached yet
            // (Concept's card otherwise always shows). A decided stage never shows here
            // regardless of alwaysShow.
            if (isDecided || (!stage.alwaysShow && !hasStageActivity)) {
              return null;
            }

            const remarksValue = evidenceRemarksDrafts[stage.checkpointKey] || '';
            const isSubmitting = submittingEvidenceKey === stage.checkpointKey;

            return (
              <section
                key={stage.checkpointKey}
                className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.06)]"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-slate-500">
                      <i className="fas fa-file-signature" /> {stage.stageLabel} Stage
                    </p>
                    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-black ring-1 ring-inset ${getEvidenceReviewMeta(evidenceReview?.status).className}`}>
                      <i className={`fas ${getEvidenceReviewMeta(evidenceReview?.status).icon}`} aria-hidden="true" />
                      {getEvidenceReviewMeta(evidenceReview?.status, stage.stageLabel).label}
                    </span>
                  </div>

                  {evidenceFile ? (
                    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      <div className="relative">
                        {isTitleImageFile(evidenceFile) ? (
                          <img
                            src={evidenceFile.previewUrl || evidenceFile.url}
                            alt={`${stage.stageLabel} evidence ${slideIndex + 1} of ${evidenceFiles.length}`}
                            className="max-h-[420px] w-full bg-slate-950/5 object-contain"
                          />
                        ) : (
                          <div className="flex items-center gap-3 p-4">
                            <i className={`fas ${getTitleFileIcon(evidenceFile)} text-2xl text-blue-600`} aria-hidden="true" />
                            <span className="truncate text-sm font-bold text-slate-800">{evidenceFile.name}</span>
                          </div>
                        )}

                        {evidenceFiles.length > 1 && (
                          <>
                            <button
                              type="button"
                              aria-label="Previous evidence photo"
                              className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/60 text-white shadow-sm transition hover:bg-slate-900/80"
                              onClick={() =>
                                setEvidenceSlideIndex((current) => ({
                                  ...current,
                                  [stage.checkpointKey]: (slideIndex - 1 + evidenceFiles.length) % evidenceFiles.length
                                }))
                              }
                            >
                              <i className="fas fa-chevron-left text-xs" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              aria-label="Next evidence photo"
                              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/60 text-white shadow-sm transition hover:bg-slate-900/80"
                              onClick={() =>
                                setEvidenceSlideIndex((current) => ({
                                  ...current,
                                  [stage.checkpointKey]: (slideIndex + 1) % evidenceFiles.length
                                }))
                              }
                            >
                              <i className="fas fa-chevron-right text-xs" aria-hidden="true" />
                            </button>
                            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/60 px-2.5 py-1 text-[11px] font-bold text-white">
                              {slideIndex + 1} / {evidenceFiles.length}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-white px-4 py-2.5">
                        <span className="truncate text-xs font-bold text-slate-500">
                          {evidenceFile.name}
                          {evidenceFile.uploadedAt ? (
                            <span className="font-medium text-slate-400"> · {formatEvidenceUploadedAt(evidenceFile.uploadedAt)}</span>
                          ) : null}
                        </span>
                        <div className="flex shrink-0 gap-2">
                          <a
                            className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-black text-blue-700 transition hover:bg-blue-50"
                            href={evidenceFile.previewUrl || evidenceFile.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <i className="fas fa-up-right-from-square text-[10px]" aria-hidden="true" /> Open
                          </a>
                          <a
                            className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-black text-blue-700 transition hover:bg-blue-50"
                            href={evidenceFile.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <i className="fas fa-download text-[10px]" aria-hidden="true" /> Download
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {evidenceReview?.uploaderNote ? (
                    <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-sm font-medium text-slate-700">
                      <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-blue-700">
                        <i className="fas fa-comment" aria-hidden="true" /> Student&apos;s Note
                      </p>
                      <p className="mt-1.5">{evidenceReview.uploaderNote}</p>
                    </div>
                  ) : null}

                  {evidenceReview?.feedback ? (
                    <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-100">
                      <strong className="text-slate-900">
                        {evidenceReview.feedbackBy || 'Adviser'}:
                      </strong>{' '}
                      {evidenceReview.feedback}
                    </div>
                  ) : null}

                  {evidenceReview && isDecided ? (
                    <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-500 ring-1 ring-inset ring-slate-100">
                      <i className="fas fa-circle-check text-emerald-500" aria-hidden="true" />
                      Decision recorded for this stage. Re-review happens only after the group resubmits.
                    </div>
                  ) : evidenceReview ? (
                    <>
                      <label className="mt-4 block">
                        <span className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-slate-500">
                          <i className="fas fa-comment-dots" /> Evidence Remarks
                        </span>
                        <textarea
                          className="mt-3 min-h-[80px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-inner outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                          placeholder="Add notes about the signatures or clearance..."
                          value={remarksValue}
                          onChange={(event) => setEvidenceRemarksDrafts((current) => ({ ...current, [stage.checkpointKey]: event.target.value }))}
                        />
                      </label>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => setConfirmEvidenceAction({ checkpointKey: stage.checkpointKey, decision: 'approved', stageLabel: stage.stageLabel })}
                        >
                          <i className="fas fa-check" /> {getAdviserClearedLabel({ stage: stage.stageLabel })}
                        </button>
                        <button
                          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-amber-50 px-3 text-xs font-black text-amber-700 shadow-sm ring-1 ring-inset ring-amber-200 transition hover:bg-amber-100 disabled:opacity-60"
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => setConfirmEvidenceAction({ checkpointKey: stage.checkpointKey, decision: 'needs_revision', stageLabel: stage.stageLabel })}
                        >
                          <i className="fas fa-rotate-left" /> Revise
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="mt-3 rounded-xl bg-amber-50/70 p-3 text-sm font-medium text-amber-800 ring-1 ring-inset ring-amber-100">
                      Waiting for the group to upload the signed application photo from Document Submissions.
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        {confirmEvidenceAction && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
              <div className="flex items-start gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                  confirmEvidenceAction.decision === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                }`}>
                  <i className={`fas ${
                    confirmEvidenceAction.decision === 'approved' ? 'fa-check' : 'fa-rotate-left'
                  } text-xl`} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {confirmEvidenceAction.decision === 'approved' ? getAdviserClearedLabel({ stage: confirmEvidenceAction.stageLabel }) : 'Request Revision'}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    {confirmEvidenceAction.decision === 'approved'
                      ? `Verify the ${confirmEvidenceAction.stageLabel.toLowerCase()} stage's oral defense application evidence and forward the group to the Program Head for scheduling?`
                      : `Send the ${confirmEvidenceAction.stageLabel.toLowerCase()} stage's evidence back for revision?`}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
                  onClick={() => setConfirmEvidenceAction(null)}
                >
                  Cancel
                </button>
                <PremiumAnimatedButton
                  className={`rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm ${
                    confirmEvidenceAction.decision === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                  onPress={async () => {
                    const { checkpointKey, decision } = confirmEvidenceAction;
                    await submitEvidenceDecision(checkpointKey, decision);
                    await new Promise((resolve) => setTimeout(resolve, 600));
                    setConfirmEvidenceAction(null);
                  }}
                >
                  Confirm Decision
                </PremiumAnimatedButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
