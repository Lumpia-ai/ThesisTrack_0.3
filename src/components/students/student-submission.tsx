'use client';

import { type ChangeEvent, type DragEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { StudentDashboardData } from '@/lib/services/student-workspace';
import { PremiumAnimatedButton } from '@/components/ui/premium-animated-button';
import { getAdviserClearedLabel } from '@/lib/stage-labels';
import {
  ACHIEVEMENT_DOCUMENT_CATEGORIES,
  DOCUMENT_AND_IMAGE_FILE_ACCEPT,
  DOCUMENT_FILE_ACCEPT,
  DOCUMENT_STORAGE_BUCKETS,
  EVIDENCE_FILE_TYPE_CATEGORIES,
  validateFileSize,
  validateFileType
} from '@/lib/storage/upload-config';
import {
  MAX_UPLOAD_FILES,
  PROJECT_FILE_CATEGORY_OPTIONS,
  formatFileSizeLabel,
  getProjectFileTypeIcon,
  getSkippedEvidenceStageKey,
  hasCompletedConceptStage
} from '@/components/students/student-project-files.shared';

// Title is submitted on the dedicated Title Submission workspace, which has
// the similarity-check and multi-candidate compare/choose-favorite features
// this quick form can't safely duplicate — so it's deliberately not one of
// the categories offered here.
const SUBMISSION_CATEGORY_OPTIONS = PROJECT_FILE_CATEGORY_OPTIONS;

// Groups the flat category list into scannable clusters for the picker UI —
// purely a presentation grouping, doesn't change what's actually offered.
const CATEGORY_GROUPS: Array<{ id: string; label: string; icon: string; keys: string[] }> = [
  {
    id: 'thesis',
    label: 'Thesis Documents',
    icon: 'fa-file-lines',
    keys: ['proposal', 'chapter-1', 'chapter-2', 'chapter-3', 'chapter-4', 'chapter-5', 'system-files', 'presentation-files', 'supporting-documents', 'final-manuscript']
  },
  {
    id: 'evidence',
    label: 'Oral Defense Evidence',
    icon: 'fa-file-shield',
    keys: ['concept-defense-application', 'proposal-defense-application', 'final-defense-application']
  },
  {
    id: 'achievement',
    label: 'Achievements',
    icon: 'fa-award',
    keys: ['award-recognition', 'activity-evidence']
  },
  {
    id: 'other',
    label: 'Other',
    icon: 'fa-ellipsis',
    keys: ['other']
  }
];

const OTHER_CATEGORY_KEY = 'other';

type NoticeState = { tone: 'success' | 'warning' | 'danger'; message: string } | null;

type ExistingFileSummary = {
  id?: string;
  fileName?: string;
  label?: string | null;
  checkpointKey?: string | null;
  stage?: string | null;
  createdAt?: string | null;
  documentCategory: string;
  submissionStatus: string | null;
};

// Status wording for the recent-submissions list. An adviser clearance is named
// after what it readies the group for, never a bare "Approved".
type SubmissionStatusDisplay = {
  label: string;
  className: string;
  accent: string;
  icon: string;
  group: 'cleared' | 'review' | 'revise' | 'other';
};

function getSubmissionStatusDisplay(file: ExistingFileSummary): SubmissionStatusDisplay {
  switch (String(file.submissionStatus || '').toUpperCase()) {
    case 'APPROVED':
      return {
        label: getAdviserClearedLabel({ checkpointKey: file.checkpointKey, stage: file.stage }),
        className: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        accent: 'bg-emerald-500',
        icon: 'fa-circle-check',
        group: 'cleared'
      };
    case 'NEEDS_REVISION':
      return { label: 'Needs revision', className: 'bg-red-50 text-red-700 border-red-100', accent: 'bg-red-500', icon: 'fa-rotate-right', group: 'revise' };
    case 'REJECTED':
      return { label: 'Rejected', className: 'bg-red-50 text-red-700 border-red-100', accent: 'bg-red-500', icon: 'fa-circle-xmark', group: 'revise' };
    case 'UNDER_REVIEW':
      return { label: 'In review', className: 'bg-amber-50 text-amber-700 border-amber-100', accent: 'bg-amber-400', icon: 'fa-hourglass-half', group: 'review' };
    case 'SUBMITTED':
      return { label: 'Submitted', className: 'bg-amber-50 text-amber-700 border-amber-100', accent: 'bg-amber-400', icon: 'fa-paper-plane', group: 'review' };
    default:
      return { label: 'Uploaded', className: 'bg-slate-50 text-slate-600 border-slate-200', accent: 'bg-slate-300', icon: 'fa-cloud-arrow-up', group: 'other' };
  }
}

// Tints the file icon by type so a list of uploads is scannable at a glance.
function getFileTint(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'bg-red-50 text-red-600';
  if (['doc', 'docx'].includes(ext)) return 'bg-blue-50 text-blue-600';
  if (['ppt', 'pptx'].includes(ext)) return 'bg-orange-50 text-orange-600';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'bg-emerald-50 text-emerald-600';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) return 'bg-violet-50 text-violet-600';
  return 'bg-slate-100 text-slate-600';
}

function formatRelativeDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return formatShortDate(value);
}

function formatShortDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
}

const PENDING_SUBMISSION_STATUSES = new Set(['SUBMITTED', 'UNDER_REVIEW']);

function getFileIcon(fileName: string, fileType?: string) {
  return getProjectFileTypeIcon(fileName, fileType);
}

type CategoryState = { locked: boolean; pending: boolean; skipsAhead: boolean };

// Grouped dropdown for the category. A native <select> can't show the per-option
// lock / awaiting-review / out-of-order markers, so this is a small listbox.
function CategoryDropdown({
  value,
  disabled,
  getState,
  onChange
}: {
  value: string;
  disabled: boolean;
  getState: (key: string) => CategoryState;
  onChange: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = SUBMISSION_CATEGORY_OPTIONS.find((option) => option.key === value);
  const selectedGroup = CATEGORY_GROUPS.find((group) => group.keys.includes(value));

  useEffect(() => {
    if (!open) return;

    const handlePointer = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full items-center gap-3 rounded-xl border bg-[var(--surface)] px-3.5 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
          open ? 'border-brand ring-4 ring-brand/10' : 'border-[var(--border)] hover:border-brand/50'
        }`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <i className={`fas ${selectedGroup?.icon ?? 'fa-file-lines'}`} aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-grow flex-col">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-meta)]">
            {selectedGroup?.label ?? 'Category'}
          </span>
          <span className="truncate text-sm font-bold text-[var(--text)]">{selected?.label ?? 'Select a category'}</span>
        </span>
        <i className={`fas fa-chevron-down text-xs text-[var(--text-meta)] transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="Document category"
          className="absolute left-0 right-0 z-30 mt-2 max-h-[22rem] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-[0_20px_40px_rgba(15,23,42,0.14)]"
        >
          {CATEGORY_GROUPS.map((group) => (
            <div key={group.id} className="py-1">
              <p className="flex items-center gap-2 px-2.5 pb-1 pt-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--text-meta)]">
                <i className={`fas ${group.icon}`} aria-hidden="true" /> {group.label}
              </p>
              {group.keys.map((key) => {
                const option = SUBMISSION_CATEGORY_OPTIONS.find((item) => item.key === key);
                if (!option) return null;

                const state = getState(key);
                const isActive = key === value;

                return (
                  <button
                    key={key}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => {
                      onChange(key);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition ${
                      isActive ? 'bg-brand/10 font-bold text-brand' : 'font-semibold text-[var(--text)] hover:bg-[var(--surface-alt)]'
                    } ${state.locked ? 'text-[var(--text-meta)]' : ''}`}
                  >
                    <span className="flex-grow truncate">{option.label}</span>
                    {state.locked ? (
                      <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[var(--text-meta)]">
                        <i className="fas fa-lock text-[10px]" aria-hidden="true" /> Locked
                      </span>
                    ) : state.pending ? (
                      <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-amber-600">
                        <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" /> In review
                      </span>
                    ) : state.skipsAhead ? (
                      <i className="fas fa-triangle-exclamation shrink-0 text-[11px] text-amber-500" aria-label="Ahead of your current stage" />
                    ) : null}
                    {isActive ? <i className="fas fa-check shrink-0 text-xs" aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function StudentSubmission({ data }: { data: StudentDashboardData }) {
  const isConceptStageComplete = useMemo(() => hasCompletedConceptStage(data), [data]);

  const [category, setCategory] = useState('concept-defense-application');
  const [existingFiles, setExistingFiles] = useState<ExistingFileSummary[]>([]);
  const [isLoadingExisting, setIsLoadingExisting] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Generic document fields
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [versionNotes, setVersionNotes] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(
          `/api/document-files?bucketName=${DOCUMENT_STORAGE_BUCKETS.THESIS_DOCUMENTS}&page=1&limit=50`,
          { cache: 'no-store' }
        );

        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        const files: ExistingFileSummary[] = (payload.files || []).map((file: any) => ({
          id: file.id,
          fileName: file.fileName,
          label: file.label,
          checkpointKey: file.checkpointKey,
          stage: file.stage,
          createdAt: file.createdAt,
          documentCategory: file.documentCategory,
          submissionStatus: file.submissionStatus
        }));

        if (!cancelled) {
          setExistingFiles(files);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingExisting(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const isOtherCategory = category === OTHER_CATEGORY_KEY;
  const isAchievementCategory = ACHIEVEMENT_DOCUMENT_CATEGORIES.has(category);
  const isEvidenceCategory = EVIDENCE_FILE_TYPE_CATEGORIES.has(category);
  const isCategoryLocked = !isAchievementCategory && category !== 'concept-defense-application' && !isConceptStageComplete;

  // A category already has a submission awaiting adviser review — resubmitting
  // now would create a confusing duplicate round instead of adding to the open
  // one (mirrors the same guard on the Document Tracker page). "Other" is exempt:
  // it's a catch-all for unrelated, independent items (a certificate, a consent
  // form, ...), so one pending "Other" file shouldn't block every future one.
  const hasPendingRoundForCategory = !isAchievementCategory && !isOtherCategory &&
    existingFiles.some(
      (file) => file.documentCategory === category && PENDING_SUBMISSION_STATUSES.has(String(file.submissionStatus || '').toUpperCase())
    );

  // Same lock/pending logic as above, but evaluated for an arbitrary category —
  // used to badge each option in the picker grid, not just the one currently selected.
  const isCategoryLockedFor = (key: string) =>
    !ACHIEVEMENT_DOCUMENT_CATEGORIES.has(key) && key !== 'concept-defense-application' && !isConceptStageComplete;

  const hasPendingRoundFor = (key: string) =>
    key !== OTHER_CATEGORY_KEY && !ACHIEVEMENT_DOCUMENT_CATEGORIES.has(key) &&
    existingFiles.some(
      (file) => file.documentCategory === key && PENDING_SUBMISSION_STATUSES.has(String(file.submissionStatus || '').toUpperCase())
    );

  // Non-blocking heads-up: the evidence categories are meant to go Concept → Proposal →
  // Final in order, but nothing stops a student from picking Final while Proposal is
  // still pending — this flags that instead of silently letting it through.
  const skippedEvidenceStageKey = getSkippedEvidenceStageKey(data, category);
  const skippedEvidenceStageLabel = skippedEvidenceStageKey
    ? SUBMISSION_CATEGORY_OPTIONS.find((option) => option.key === skippedEvidenceStageKey)?.label || skippedEvidenceStageKey
    : null;

  const resetDocumentForm = () => {
    setDocumentFiles([]);
    setVersionNotes('');
  };

  const handleFilesPicked = (fileList: FileList | File[] | null) => {
    const incoming = fileList ? Array.from(fileList) : [];

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (!incoming.length) {
      return;
    }

    const invalidReasons: string[] = [];
    const validIncoming = incoming.filter((file) => {
      const typeError = validateFileType(file.name, file.type, isEvidenceCategory);
      const sizeError = validateFileSize(file.size, DOCUMENT_STORAGE_BUCKETS.THESIS_DOCUMENTS);
      const reason = typeError || sizeError;

      if (reason) {
        invalidReasons.push(`${file.name}: ${reason}`);
        return false;
      }

      return true;
    });

    if (invalidReasons.length) {
      setNotice({ tone: 'warning', message: invalidReasons.join(' ') });
    }

    setDocumentFiles((current) => [...current, ...validIncoming].slice(0, MAX_UPLOAD_FILES));
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFilesPicked(event.target.files);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    handleFilesPicked(event.dataTransfer.files);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  };

  const activeFiles = documentFiles;
  const removeStagedFile = (index: number) => {
    setDocumentFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
  };

  const handleSubmitDocuments = async () => {
    setNotice(null);

    if (!documentFiles.length) {
      setNotice({ tone: 'warning', message: 'Select at least one file before submitting it to the project workspace.' });
      return;
    }

    if (isOtherCategory && !versionNotes.trim()) {
      setNotice({ tone: 'warning', message: 'Please specify what you’re submitting before sending it to your adviser.' });
      return;
    }

    if (hasPendingRoundForCategory) {
      setNotice({ tone: 'warning', message: 'This category already has files awaiting your adviser’s review. Wait for a decision before submitting again.' });
      return;
    }

    setIsSubmitting(true);
    const failures: string[] = [];
    let successCount = 0;
    const uploadedNames: string[] = [];

    for (const file of documentFiles) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucketName', DOCUMENT_STORAGE_BUCKETS.THESIS_DOCUMENTS);
        formData.append('projectId', data.project.project_id || data.project.id);
        formData.append('documentCategory', category);
        if (versionNotes.trim()) {
          formData.append('notes', versionNotes.trim());
        }

        const response = await fetch('/api/document-files', { method: 'POST', body: formData });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message || `Unable to upload ${file.name}.`);
        }

        successCount += 1;
        uploadedNames.push(file.name);
      } catch (error) {
        failures.push(error instanceof Error ? error.message : `Unable to upload ${file.name}.`);
      }
    }

    if (successCount) {
      const uploadedAt = new Date().toISOString();
      // Newest first, matching the API's createdAt-desc order.
      setExistingFiles((current) => [
        ...uploadedNames.map((fileName) => ({
          fileName,
          documentCategory: category,
          submissionStatus: 'SUBMITTED',
          createdAt: uploadedAt
        })),
        ...current
      ]);
    }

    if (failures.length) {
      setNotice({
        tone: successCount ? 'warning' : 'danger',
        message: successCount
          ? `${successCount} of ${documentFiles.length} file(s) uploaded. ${failures.join(' ')}`
          : failures.join(' ')
      });
    } else {
      const locksCategoryUntilReviewed = !isAchievementCategory && !isOtherCategory;
      const baseMessage = successCount === 1 ? `${documentFiles[0].name} uploaded securely.` : `${successCount} files uploaded securely.`;

      setNotice({
        tone: 'success',
        message: locksCategoryUntilReviewed
          ? `${baseMessage} Your adviser will review it before you can submit to this category again.`
          : baseMessage
      });
      resetDocumentForm();
    }

    setIsSubmitting(false);
  };

  if (!data.group?.id) {
    return (
      <div className="student-project-files-page student-submit-page">
        <header className="top-nav">
          <div className="top-nav-leading">
            <div className="page-title">
              <div className="page-title-context">
                <span className="page-kicker">Student Workspace</span>
                <span className="page-breadcrumb" aria-hidden="true">
                  <i className="fas fa-angle-right" />
                  <span>Submit Documents</span>
                </span>
              </div>
              <h1>Submit Documents</h1>
            </div>
          </div>
        </header>
        <div className="page-body p-8 sm:p-12">
          <div className="mx-auto max-w-xl rounded-[1.75rem] bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-100/50 p-12 text-center shadow-sm">
            <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-brand/10 to-brand/5 text-brand shadow-sm">
              <i className="fas fa-users-slash text-2xl" aria-hidden="true" />
            </div>
            <h3 className="mt-6 text-xl font-bold text-[var(--text-dark)]">Group Assignment Required</h3>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[var(--text-light)]">
              You must be assigned to a project group before you can submit a title or documents. Please contact your coordinator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const recentSubmissions = existingFiles.filter((file) => file.fileName).slice(0, 5);
  const statusCounts = existingFiles.reduce(
    (counts, file) => {
      const group = getSubmissionStatusDisplay(file).group;
      if (group !== 'other') counts[group] += 1;
      return counts;
    },
    { review: 0, cleared: 0, revise: 0 }
  );

  return (
    <div className="student-project-files-page student-submit-page">
      <header className="top-nav">
        <div className="top-nav-leading">
          <div className="page-title">
            <div className="page-title-context">
              <span className="page-kicker">Student Workspace</span>
              <span className="page-breadcrumb" aria-hidden="true">
                <i className="fas fa-angle-right" />
                <span>Submit Documents</span>
              </span>
            </div>
            <h1>Submit Documents</h1>
          </div>
        </div>
      </header>

      <div className="page-body">
          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(340px,1fr)]">
            {/* One card, three numbered sections — keeps the steps aligned and
                status messages next to the step they're about. */}
            <div className="flex min-w-0 flex-col gap-4">
            <article className="flex-1 divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
              {/* Step 1 — category */}
              <section className="flex flex-col gap-3 p-5 sm:p-6">
                <StepHeading step={1} title="What are you submitting?" hint="Pick the document category." />
                <div className="flex flex-col gap-3">
                  <CategoryDropdown
                    value={category}
                    disabled={isSubmitting}
                    getState={(key) => {
                      const locked = isCategoryLockedFor(key);
                      return {
                        locked,
                        pending: hasPendingRoundFor(key),
                        skipsAhead: !locked && Boolean(getSkippedEvidenceStageKey(data, key))
                      };
                    }}
                    onChange={(key) => {
                      setCategory(key);
                      setNotice(null);
                    }}
                  />

                  {isCategoryLocked ? (
                    <InlineNotice tone="warning" icon="fa-lock">
                      This category opens once Stage 1: Concept Proposal is complete.
                    </InlineNotice>
                  ) : !isLoadingExisting && hasPendingRoundForCategory ? (
                    <InlineNotice tone="warning" icon="fa-clock">
                      This category already has a file awaiting your adviser&apos;s review. Wait for a decision before submitting again.
                    </InlineNotice>
                  ) : !isLoadingExisting && skippedEvidenceStageLabel ? (
                    <InlineNotice tone="warning" icon="fa-triangle-exclamation">
                      You&apos;re submitting ahead of your current stage — {skippedEvidenceStageLabel} isn&apos;t approved yet. You can still submit, but it may get flagged during review.
                    </InlineNotice>
                  ) : null}

                  {isOtherCategory && (
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="other-specification" className="text-sm font-bold text-[var(--text)]">
                        Describe the document <span className="text-rose-500">*</span>
                      </label>
                      <p className="text-xs text-[var(--muted)]">
                        Explain how this relates to your current project stage
                        {data.project.currentMilestone && data.project.currentMilestone !== 'Not assigned' ? (
                          <> — <span className="font-bold text-brand">{data.project.currentMilestone}</span></>
                        ) : null}.
                      </p>
                      <textarea
                        id="other-specification"
                        value={versionNotes}
                        onChange={(event) => setVersionNotes(event.target.value)}
                        placeholder={
                          data.project.currentMilestone && data.project.currentMilestone !== 'Not assigned'
                            ? `e.g. A supporting document for ${data.project.currentMilestone}`
                            : 'e.g. A supporting document not covered by the other categories'
                        }
                        disabled={isSubmitting}
                        className="min-h-[80px] w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3 text-sm font-medium outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
                      />
                    </div>
                  )}
                </div>
              </section>

              {/* Step 2 — attach files */}
              <section className="flex flex-col gap-3 p-5 sm:p-6">
                <StepHeading
                  step={2}
                  title="Attach your file(s)"
                  hint={`Up to ${MAX_UPLOAD_FILES} files${isEvidenceCategory ? ' — photos of signed forms are accepted' : ''}.`}
                />
                <div>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`group relative flex w-full flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed py-8 transition-all duration-300 cursor-pointer ${
                        isDragOver
                          ? 'border-brand bg-brand/5 shadow-inner scale-[1.01]'
                          : activeFiles.length
                            ? 'border-emerald-300 bg-emerald-50/30'
                            : 'border-[var(--border-strong)] bg-[var(--surface-alt)] hover:border-brand/60 hover:bg-brand/5 hover:shadow-sm'
                      }`}
                    >
                      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

                      <div className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface)] shadow-md mb-3 transition-transform duration-500 ${isDragOver || activeFiles.length ? 'scale-110' : 'group-hover:scale-110 rotate-3 group-hover:rotate-0'}`}>
                        <i className={`fas ${activeFiles.length ? 'fa-layer-group text-emerald-600' : 'fa-cloud-arrow-up text-brand'} text-xl`} aria-hidden="true" />
                      </div>

                      <h4 className="relative z-10 text-base font-extrabold text-[var(--text)]">
                        {activeFiles.length ? `${activeFiles.length} file${activeFiles.length === 1 ? '' : 's'} selected` : 'Drag and drop your file(s) here'}
                      </h4>
                      <p className="relative z-10 mt-1 text-sm text-[var(--muted)]">
                        {activeFiles.length ? 'Click to add more, or submit below.' : 'or click to browse'}
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        accept={isEvidenceCategory ? DOCUMENT_AND_IMAGE_FILE_ACCEPT : DOCUMENT_FILE_ACCEPT}
                        onChange={handleFileInputChange}
                      />
                    </div>

                    {activeFiles.length > 0 && (
                      <ul className="mt-4 space-y-2">
                        {activeFiles.map((file, index) => (
                          <li key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm shadow-sm">
                            <span className="flex min-w-0 items-center gap-2.5 font-semibold text-[var(--text)]">
                              <i className={`fas ${getFileIcon(file.name, file.type)} text-brand shrink-0`} aria-hidden="true" />
                              <span className="truncate">{file.name}</span>
                              <span className="text-[var(--text-meta)] font-normal shrink-0">{formatFileSizeLabel(file.size)}</span>
                            </span>
                            <button type="button" className="shrink-0 rounded-lg p-1.5 text-rose-500 hover:bg-rose-50" onClick={() => removeStagedFile(index)} aria-label={`Remove ${file.name}`}>
                              <i className="fas fa-xmark" aria-hidden="true" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                </div>
              </section>

              {/* Step 3 — notes + submit */}
              <section className="flex flex-col gap-3 p-5 sm:p-6">
                <StepHeading
                  step={3}
                  title={isOtherCategory ? 'Review & submit' : 'Version notes'}
                  hint={isOtherCategory ? 'Your description above is sent with the file.' : 'Optional — tell your adviser what changed.'}
                />
                <div className="flex flex-col gap-4">
                    {!isOtherCategory && (
                      <textarea
                        id="submission-notes"
                        aria-label="Version notes (optional)"
                        value={versionNotes}
                        onChange={(event) => setVersionNotes(event.target.value)}
                        placeholder="Summarize what this file contains or what changed..."
                        disabled={isSubmitting}
                        className="min-h-[90px] resize-y rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3 text-sm font-medium outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
                      />
                    )}

                    {notice ? (
                      <InlineNotice
                        tone={notice.tone}
                        icon={notice.tone === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}
                      >
                        {notice.message}
                      </InlineNotice>
                    ) : null}

                    <div className="flex justify-end">
                      <PremiumAnimatedButton
                        type="button"
                        onPress={handleSubmitDocuments}
                        disabled={isSubmitting || isCategoryLocked || hasPendingRoundForCategory || (isOtherCategory && !versionNotes.trim())}
                        className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand to-brand-dark px-8 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-brand/20 transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <i className="fas fa-paper-plane" aria-hidden="true" />
                        Submit to Adviser
                      </PremiumAnimatedButton>
                    </div>
                </div>
              </section>
            </article>
            </div>

            {/* Sidebar — recent submissions, so students see what's already in
                (and still under review) before uploading again. Stretches to the
                form card's height (not sticky) so both cards' tops and bottoms line up. */}
            <aside className="flex min-w-0">
              <article className="flex w-full flex-col overflow-hidden rounded-2xl border border-[var(--border)] border-t-[3px] border-t-brand bg-[var(--surface)] shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
                {/* Header with an at-a-glance count of every submission's status */}
                <div className="border-b border-[var(--border)] px-5 pb-4 pt-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand/15 bg-brand/5 text-brand">
                      <i className="fas fa-clock-rotate-left" aria-hidden="true" />
                    </span>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-meta)]">Recent submissions</span>
                      <h3 className="text-[15px] font-extrabold leading-tight text-[var(--text-dark)]">Your latest uploads</h3>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {[
                      { label: 'In review', value: statusCounts.review, className: 'border-amber-200 text-amber-700', dot: 'bg-amber-400' },
                      { label: 'Cleared', value: statusCounts.cleared, className: 'border-emerald-200 text-emerald-700', dot: 'bg-emerald-500' },
                      { label: 'To revise', value: statusCounts.revise, className: 'border-red-200 text-red-700', dot: 'bg-red-500' }
                    ].map((stat) => (
                      <div key={stat.label} className={`rounded-xl border bg-[var(--surface)] px-3 py-2 ${stat.className}`}>
                        <strong className="block text-lg font-extrabold leading-none">{stat.value}</strong>
                        <span className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold text-[var(--muted)]">
                          <span className={`h-1.5 w-1.5 rounded-full ${stat.dot}`} aria-hidden="true" />
                          {stat.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-grow flex-col p-4">
                  {isLoadingExisting ? (
                    <p className="py-4 text-sm text-[var(--muted)]">Loading your files...</p>
                  ) : recentSubmissions.length ? (
                    <ul className="mb-4 flex flex-col gap-2">
                      {recentSubmissions.map((file, index) => {
                        const status = getSubmissionStatusDisplay(file);
                        const categoryLabel =
                          file.label ||
                          SUBMISSION_CATEGORY_OPTIONS.find((option) => option.key === file.documentCategory)?.label ||
                          file.documentCategory;

                        return (
                          <li
                            key={file.id ?? `${file.fileName}-${index}`}
                            className="relative flex items-start gap-3 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] py-3 pl-4 pr-3 transition hover:-translate-y-px hover:border-brand/30 hover:shadow-md"
                          >
                            <span className={`absolute inset-y-0 left-0 w-1 ${status.accent}`} aria-hidden="true" />
                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${getFileTint(file.fileName || '')}`}>
                              <i className={`fas ${getFileIcon(file.fileName || '')}`} aria-hidden="true" />
                            </span>
                            <div className="flex min-w-0 flex-grow flex-col gap-1">
                              <div className="flex items-start justify-between gap-2">
                                <strong className="truncate text-[13px] font-bold leading-tight text-[var(--text)]" title={file.fileName}>
                                  {file.fileName}
                                </strong>
                                {file.createdAt ? (
                                  <span className="shrink-0 text-[10px] font-semibold text-[var(--text-meta)]" title={formatShortDate(file.createdAt)}>
                                    {formatRelativeDate(file.createdAt)}
                                  </span>
                                ) : null}
                              </div>
                              <span className="truncate text-xs text-[var(--muted)]">{categoryLabel}</span>
                              <span className={`mt-0.5 inline-flex items-center gap-1.5 self-start rounded-full border px-2 py-0.5 text-[11px] font-bold ${status.className}`}>
                                <i className={`fas ${status.icon} text-[9px]`} aria-hidden="true" />
                                {status.label}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="mb-4 flex flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-alt)] px-4 py-8 text-center">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
                        <i className="fas fa-inbox" aria-hidden="true" />
                      </span>
                      <strong className="text-sm text-[var(--text)]">Nothing submitted yet</strong>
                      <span className="text-xs text-[var(--muted)]">Your uploads will appear here.</span>
                    </div>
                  )}

                  <Link
                    prefetch={false}
                    href="/students/project-files"
                    className="group mt-auto flex items-center justify-between rounded-xl bg-brand/5 px-4 py-3 text-sm font-bold text-brand ring-1 ring-brand/15 transition hover:bg-brand hover:text-white"
                  >
                    <span className="flex items-center gap-2">
                      <i className="fas fa-folder-open" aria-hidden="true" />
                      Open the Document Tracker
                    </span>
                    <i className="fas fa-arrow-right text-xs transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            </aside>
          </div>
      </div>
    </div>
  );
}

function StepHeading({ step, title, hint }: { step: number; title: string; hint: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-black text-white">{step}</span>
      <div className="flex flex-col">
        <h3 className="text-[15px] font-extrabold leading-tight text-[var(--text-dark)]">{title}</h3>
        <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted)]">{hint}</p>
      </div>
    </div>
  );
}

function InlineNotice({
  tone,
  icon,
  children
}: {
  tone: 'success' | 'warning' | 'danger';
  icon: string;
  children: ReactNode;
}) {
  const toneClass =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-rose-200 bg-rose-50 text-rose-800';

  return (
    <div className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-[13px] font-semibold leading-snug ${toneClass}`}>
      <i className={`fas ${icon} mt-0.5 shrink-0`} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
