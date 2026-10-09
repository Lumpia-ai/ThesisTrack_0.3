'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'next/navigation';
import { createPortal } from 'react-dom';
import { AdviserPageHeader } from '@/components/adviser/shared/components/adviser-page-header';
import { AdviserShellActions } from '@/components/adviser/shared/components/adviser-shell-actions';
import { NAV_ITEMS, WORKSPACE_META, isNavItemActive, getShortName, getToastIcon } from '@/components/adviser/shared/config/dashboard-utils';
import { useWorkspaceMode } from '@/components/adviser/shared/hooks/use-workspace-mode';
import {
  EvidenceReviewDrawer,
  TitleDetailsDrawer,
  type DefenseApplicationStageKey,
  type OtherDocumentsGroup
} from '@/components/adviser/adviser-mode/data/title-workspace-sections';
import {
  EvidenceQueue,
  OtherDocumentsQueue,
  QueuePanel,
  TitleQueue,
  TitleToolbar,
  getEvidenceQueue
} from '@/components/adviser/adviser-mode/data/title-approval-queues';
import { DASH_COLORS } from '@/components/adviser/shared/config/dashboard-types';
import { getFilePreviewKind, getSignedUrlPreview } from '@/lib/storage/file-preview';
import {
  TITLE_SORT_OPTIONS,
  getAcademicYearOptions,
  getDefaultActionForStatus,
  sortTitleRecords,
  type AdviserTitleRecord,
  type TitleSortOption,
  type TitleStatus
} from '@/components/adviser/adviser-mode/data/title-workspace-data';
import { getAdviserReviewQueueFiles } from '@/components/adviser/adviser-mode/data/submission-workspace-data';
import { getAdviserClearedLabel } from '@/lib/stage-labels';
import type { DocumentFileSummary } from '@/components/documents/document-file-controls';
import { DOCUMENT_STORAGE_BUCKETS } from '@/lib/storage/upload-config';
import type { AdviserDashboardData } from '@/lib/mock/adviser-dashboard';

const EVIDENCE_REVIEW_FIELD_BY_CHECKPOINT_KEY: Record<DefenseApplicationStageKey, 'evidenceReview' | 'proposalEvidenceReview' | 'finalEvidenceReview'> = {
  'concept-defense-application': 'evidenceReview',
  'proposal-defense-application': 'proposalEvidenceReview',
  'final-defense-application': 'finalEvidenceReview'
};

// Student-saved "backup titles" (see /api/title-drafts) are auto-sent here for
// review the moment a student saves or edits one — independent of whether
// they're ever actually used. Approving one doesn't make it "the" project
// title; it just clears that specific idea, so a later replacement-title
// submission built from it can skip a second review cycle (see
// POST /api/title-submissions' isPreApprovedSubmission check).
type AdviserBackupTitleDraft = {
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

const BACKUP_FILE_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png'];

function getBackupFileExtension(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

function getBackupFileIcon(fileName: string) {
  const extension = getBackupFileExtension(fileName);
  if (extension === 'pdf') return 'fa-file-pdf';
  if (['doc', 'docx'].includes(extension)) return 'fa-file-word';
  if (['xls', 'xlsx'].includes(extension)) return 'fa-file-excel';
  if (['ppt', 'pptx'].includes(extension)) return 'fa-file-powerpoint';
  if (BACKUP_FILE_IMAGE_EXTENSIONS.includes(extension)) return 'fa-file-image';
  return 'fa-file-lines';
}

// Combined preview + decision modal — same visual pattern as the real Title
// review's document modal (signed URL + Google Docs viewer for office
// formats), plus a decision aside like the real title/evidence review
// drawers. Supports switching between files when a backup has more than one;
// the decision itself always covers the whole backup, not a single file.
function BackupDecisionModal({
  draft,
  isSaving,
  onClose,
  onDecide
}: {
  draft: AdviserBackupTitleDraft;
  isSaving: boolean;
  onClose: () => void;
  onDecide: (draft: AdviserBackupTitleDraft, decision: 'approve' | 'needs_revision', feedback: string) => void;
}) {
  const files = draft.files || [];
  const [isMounted, setIsMounted] = useState(false);
  const [activeFileId, setActiveFileId] = useState<string | null>(files[0]?.id ?? null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

  const activeFile = files.find((file) => file.id === activeFileId) ?? null;

  useEffect(() => setIsMounted(true), []);
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.removeProperty('overflow'); };
  }, []);

  useEffect(() => {
    if (!activeFile) {
      setSignedUrl(null);
      return;
    }

    let cancelled = false;
    setSignedUrl(null);
    setPreviewError(null);

    (async () => {
      try {
        const response = await fetch(`/api/title-drafts/files/${activeFile.id}/signed-url`, { method: 'POST' });
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
    })();

    return () => {
      cancelled = true;
    };
  }, [activeFile]);

  if (!isMounted) {
    return null;
  }

  const extension = activeFile ? getBackupFileExtension(activeFile.name) : '';
  const isImageFile = BACKUP_FILE_IMAGE_EXTENSIONS.includes(extension);
  // Raw storage links keep whatever content type the upload had, so PDFs/Office go through the
  // Google viewer, images use <img>, and other types are not embedded (no surprise downloads).
  const previewKind = activeFile ? getFilePreviewKind(activeFile.name) : 'none';
  const previewUrl = activeFile ? getSignedUrlPreview(activeFile.name, signedUrl) : null;
  const downloadHref = activeFile ? `/api/title-drafts/files/${activeFile.id}/download` : null;

  return createPortal(
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-6" onClick={onClose}>
      <div
        aria-label="Backup title review"
        aria-modal="true"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-full w-full max-w-[1560px] flex-col overflow-hidden rounded-[2rem] bg-white/95 backdrop-blur-3xl shadow-[0_24px_80px_rgba(15,23,42,0.28)] ring-1 ring-white/60"
      >
        <header className="relative shrink-0 border-b border-slate-100 bg-white/80 backdrop-blur px-6 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--primary)]">
                <i className="fas fa-bookmark opacity-70" aria-hidden="true" /> Backup Title Review
              </p>
              <h2 className="mt-2 truncate text-2xl font-black tracking-tight text-slate-900 leading-tight" title={draft.title}>
                &quot;{draft.title}&quot;
              </h2>
            </div>
            <button
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100/80 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 focus:outline-none"
              type="button"
              onClick={onClose}
            >
              <i className="fas fa-xmark text-lg" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-inset ring-slate-200/80">
              {draft.groupCode || draft.groupTitle || 'Group'}
            </span>
            {draft.updatedByName ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1 text-xs font-bold text-slate-500 ring-1 ring-inset ring-slate-200/60">
                <i className="fas fa-user text-[10px]" aria-hidden="true" /> {draft.updatedByName}
              </span>
            ) : null}
            {draft.isPriority ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-200/60">
                <i className="fas fa-star text-[10px]" aria-hidden="true" /> Student&apos;s Best Pick
              </span>
            ) : null}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50/40 px-4 py-4 sm:px-6 sm:py-6 custom-scrollbar">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
            <div className="min-w-0 space-y-5">
              {draft.description || draft.keywords.length > 0 ? (
                <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
                  <p className="text-[11px] font-black uppercase tracking-[0.15em] text-[var(--primary)]">Description</p>
                  {draft.description ? (
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-700">{draft.description}</p>
                  ) : (
                    <p className="mt-2 text-sm italic text-slate-400">No description provided.</p>
                  )}
                  {draft.keywords.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {draft.keywords.map((keyword) => (
                        <span key={keyword} className="inline-flex items-center rounded-full bg-[var(--primary)]/5 px-2.5 py-1 text-[11px] font-bold text-[var(--primary)] ring-1 ring-inset ring-[var(--primary)]/15">
                          #{keyword}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </section>
              ) : null}

              <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
                <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.15em] text-[var(--primary)]">
                      {extension ? extension.toUpperCase() : 'FILE'} Preview
                    </p>
                    <h3 className="mt-1 truncate text-lg font-black text-slate-950">
                      {activeFile ? activeFile.name : 'No files attached'}
                    </h3>
                  </div>
                  {activeFile ? (
                    <div className="flex items-center gap-2">
                      <a
                        className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-[var(--primary)] transition hover:bg-[var(--primary)]/5"
                        href={previewUrl || downloadHref || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <i className="fas fa-up-right-from-square text-[10px]" aria-hidden="true" />
                        Open
                      </a>
                      <a
                        className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-[var(--primary)] transition hover:bg-[var(--primary)]/5"
                        href={downloadHref || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <i className="fas fa-download text-[10px]" aria-hidden="true" />
                        Download
                      </a>
                    </div>
                  ) : null}
                </div>

                {files.length > 1 ? (
                  <div className="flex flex-wrap gap-1.5 border-b border-slate-100 bg-slate-50/60 p-3">
                    {files.map((file) => (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => setActiveFileId(file.id)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                          file.id === activeFileId
                            ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-[var(--primary)]/40'
                        }`}
                      >
                        <i className={`fas ${getBackupFileIcon(file.name)}`} aria-hidden="true" />
                        <span className="max-w-[140px] truncate">{file.name}</span>
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="bg-slate-100 p-3 sm:p-4">
                  {!activeFile ? (
                    <div className="flex h-[min(55vh,600px)] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white text-center">
                      <i className="fas fa-paperclip text-2xl text-slate-300" aria-hidden="true" />
                      <p className="text-sm font-bold text-slate-500">No files attached to this backup</p>
                    </div>
                  ) : previewError ? (
                    <div className="flex h-[min(55vh,600px)] w-full flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-center">
                      <i className="fas fa-triangle-exclamation text-2xl text-amber-500" aria-hidden="true" />
                      <p className="text-sm font-bold text-slate-600">{previewError}</p>
                      <p className="text-xs text-slate-400">Use Download instead.</p>
                    </div>
                  ) : previewKind === 'none' ? (
                    <div className="flex h-[min(55vh,600px)] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white text-center">
                      <i className="fas fa-file-circle-question text-2xl text-slate-300" aria-hidden="true" />
                      <p className="text-sm font-bold text-slate-600">No inline preview for this file type.</p>
                      <a className="text-xs font-bold text-blue-700 underline" href={downloadHref ?? undefined} target="_blank" rel="noopener noreferrer">Download to view it</a>
                    </div>
                  ) : previewUrl && isImageFile ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt={activeFile.name}
                      className="mx-auto h-[min(55vh,600px)] w-full rounded-xl border border-slate-200 bg-white object-contain"
                    />
                  ) : previewUrl ? (
                    <iframe
                      className="h-[min(55vh,600px)] w-full rounded-xl border border-slate-200 bg-white"
                      src={previewUrl}
                      title={`${activeFile.name} preview`}
                    />
                  ) : (
                    <div className="flex h-[min(55vh,600px)] w-full flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white">
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
                    <i className="fas fa-clipboard-check" /> Backup Decision
                  </p>
                  <h3 className="mt-1 text-lg font-black">Ready for Decision</h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-blue-100">
                    Approving doesn&apos;t make this the project title — it just clears this idea, so the student can use it instantly if a new title is ever required.
                  </p>
                </div>

                <div className="p-5">
                  <label className="block">
                    <span className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-blue-700">
                      <i className="fas fa-comment-dots" /> Feedback
                    </span>
                    <textarea
                      className="mt-3 min-h-[130px] w-full rounded-xl border border-blue-200/80 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-inner outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      placeholder="Notes for the student (optional)..."
                      value={feedback}
                      onChange={(event) => setFeedback(event.target.value)}
                    />
                  </label>

                  <div className="mt-4 grid gap-3">
                    <button
                      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-black text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 hover:shadow-lg focus:outline-none disabled:opacity-50"
                      type="button"
                      disabled={isSaving}
                      onClick={() => onDecide(draft, 'approve', feedback)}
                    >
                      <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-check'}`} /> Ready as Backup Title
                    </button>
                    <button
                      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-50 px-6 text-sm font-black text-amber-700 shadow-sm ring-1 ring-inset ring-amber-200 transition hover:bg-amber-100 hover:ring-amber-300 focus:outline-none disabled:opacity-50"
                      type="button"
                      disabled={isSaving}
                      onClick={() => onDecide(draft, 'needs_revision', feedback)}
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

// One row per backup title, same shape as the other approval queues; the preview +
// decision modal lives outside the rows so its clicks never bubble into a row.
function BackupTitleQueue({
  drafts,
  savingId,
  openId,
  onDecide
}: {
  drafts: AdviserBackupTitleDraft[];
  savingId: string | null;
  /** Deep link (?open=backup:<id>): opens that backup's decision modal once. */
  openId?: string | null;
  onDecide: (draft: AdviserBackupTitleDraft, decision: 'approve' | 'needs_revision', feedback: string) => void;
}) {
  const [decidingId, setDecidingId] = useState<string | null>(null);

  useEffect(() => {
    if (openId && drafts.some((draft) => draft.id === openId)) setDecidingId(openId);
  }, [openId, drafts]);
  const deciding = drafts.find((draft) => draft.id === decidingId) ?? null;

  return (
    <>
      <ul className="adviser-subs-list">
        {drafts.map((draft) => {
          // Defensive against a stale/mid-refetch draft shape — one bad row shouldn't take down the queue.
          const files = draft.files || [];
          const isSaving = savingId === draft.id;
          const open = () => setDecidingId(draft.id);

          return (
            <li
              key={draft.id}
              className="adviser-queue-row"
              style={{ '--tone': DASH_COLORS.warning } as CSSProperties}
              tabIndex={0}
              aria-label={`Backup title ${draft.title}, ${draft.groupCode || draft.groupTitle || 'group'}. Open to decide.`}
              onClick={open}
              onKeyDown={(event) => {
                if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  open();
                }
              }}
            >
              <span className="adviser-subs-file" aria-hidden="true">
                <i className={`fas ${draft.isPriority ? 'fa-star' : 'fa-bookmark'}`} />
              </span>
              <div className="adviser-subs-main">
                <strong title={draft.title}>{draft.title}</strong>
                <small>
                  <span className="adviser-subs-code">{draft.groupCode || draft.groupTitle || 'Group'}</span>
                  {draft.isPriority ? "Student's best pick · " : ''}
                  Updated {new Date(draft.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </small>
              </div>
              <div className="adviser-subs-stage">
                <span>{files[0]?.name || 'No file attached'}</span>
                <small>{files.length ? `${files.length} file${files.length === 1 ? '' : 's'}` : 'Title only'}</small>
              </div>
              <span className="adviser-dash-status">
                <span className="adviser-dash-swatch" style={{ background: DASH_COLORS.warning }} aria-hidden="true" />
                Awaiting review
              </span>
              <div className="adviser-subs-actions">
                <button
                  type="button"
                  className="adviser-subs-review"
                  disabled={isSaving}
                  onClick={(event) => {
                    event.stopPropagation();
                    open();
                  }}
                >
                  {isSaving ? 'Saving' : 'Decide'}
                  <i aria-hidden="true" className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-arrow-right'}`} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {deciding ? (
        <BackupDecisionModal
          draft={deciding}
          isSaving={savingId === deciding.id}
          onClose={() => setDecidingId(null)}
          onDecide={(draft, decision, feedback) => {
            onDecide(draft, decision, feedback);
            setDecidingId(null);
          }}
        />
      ) : null}
    </>
  );
}

export function AdviserTitleApproval({ data }: { data: AdviserDashboardData }) {
  const { workspaceMode, switchWorkspace, pathname, basePath } = useWorkspaceMode();
  const [titleRecords, setTitleRecords] = useState<AdviserTitleRecord[]>([]);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [isLoadingTitles, setIsLoadingTitles] = useState(true);
  // Every filter starts at "all" so the adviser sees the full record first and narrows from there.
  const [statusFilter, setStatusFilter] = useState<TitleStatus | 'all'>('all');
  const [academicYearFilter, setAcademicYearFilter] = useState('all');
  const [searchValue, setSearchValue] = useState('');
  const [sortBy, setSortBy] = useState<TitleSortOption>('newest');
  const [selectedTitleId, setSelectedTitleId] = useState<string | null>(null);
  const [remarksDraft, setRemarksDraft] = useState('');
  const [selectedEvidenceTitleId, setSelectedEvidenceTitleId] = useState<string | null>(null);
  const [otherDocuments, setOtherDocuments] = useState<DocumentFileSummary[]>([]);
  const [isLoadingOtherDocuments, setIsLoadingOtherDocuments] = useState(true);
  const [savingOtherDocumentId, setSavingOtherDocumentId] = useState<string | null>(null);
  const [backupDrafts, setBackupDrafts] = useState<AdviserBackupTitleDraft[]>([]);
  const [isLoadingBackupDrafts, setIsLoadingBackupDrafts] = useState(true);
  const [savingBackupDraftId, setSavingBackupDraftId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ id: number; message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const adviserMeta = WORKSPACE_META[workspaceMode];
  const searchParams = useSearchParams();
  const handledDeepLink = useRef(false);
  const [openBackupId, setOpenBackupId] = useState<string | null>(null);

  function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const id = Date.now();
    setToast({ id, message, type });

    window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 3200);
  }

  useEffect(() => {
    let cancelled = false;

    const loadTitles = async () => {
      setIsLoadingTitles(true);
      setTitleError(null);

      try {
        const response = await fetch('/api/title-submissions?limit=50', { cache: 'no-store' });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.message || 'Unable to load title submissions.');
        }

        if (!cancelled) {
          setTitleRecords(payload?.titles || []);
        }
      } catch (error) {
        if (!cancelled) {
          setTitleError(error instanceof Error ? error.message : 'Unable to load title submissions.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingTitles(false);
        }
      }
    };

    loadTitles();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadOtherDocuments = async () => {
      setIsLoadingOtherDocuments(true);

      try {
        const response = await fetch(
          `/api/document-files?bucketName=${DOCUMENT_STORAGE_BUCKETS.THESIS_DOCUMENTS}&limit=100`,
          { cache: 'no-store' }
        );

        if (!response.ok) {
          return;
        }

        const payload = await response.json();

        if (!cancelled) {
          // getAdviserReviewQueueFiles() is shared with the Document Submissions
          // audit page, which intentionally shows every status — it doesn't filter
          // out already-decided files. This queue's whole purpose is "still
          // pending," so filter that in here too, otherwise a file approved from
          // this section would silently reappear the next time this page loads.
          const pendingOnly = getAdviserReviewQueueFiles(payload.files || []).filter((file) => {
            const status = String(file.submissionStatus || '').toUpperCase();
            return status === 'SUBMITTED' || status === 'UNDER_REVIEW';
          });
          setOtherDocuments(pendingOnly);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingOtherDocuments(false);
        }
      }
    };

    loadOtherDocuments();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadBackupDrafts = async () => {
      setIsLoadingBackupDrafts(true);

      try {
        const response = await fetch('/api/title-drafts/adviser', { cache: 'no-store' });
        if (!response.ok) {
          return;
        }
        const payload = await response.json();
        if (!cancelled) {
          // The endpoint returns every backup regardless of status (useful for
          // a future audit view) — this queue's whole purpose is "still needs
          // action," so only PENDING ones belong here.
          const pendingOnly = (payload.drafts || [])
            .filter((draft: AdviserBackupTitleDraft) => draft.reviewStatus === 'PENDING')
            .sort((a: AdviserBackupTitleDraft, b: AdviserBackupTitleDraft) => (b.isPriority ? 1 : 0) - (a.isPriority ? 1 : 0));
          setBackupDrafts(pendingOnly);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingBackupDrafts(false);
        }
      }
    };

    loadBackupDrafts();

    return () => {
      cancelled = true;
    };
  }, []);

  const applyBackupDraftDecision = async (
    draft: AdviserBackupTitleDraft,
    decision: 'approve' | 'needs_revision',
    feedback: string
  ) => {
    setSavingBackupDraftId(draft.id);

    try {
      const response = await fetch('/api/title-drafts/adviser', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: draft.id, decision, feedback: feedback.trim() })
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to update this backup title.');
      }

      // The queue's purpose is "still needs action" — a decided draft (whether
      // approved or sent back) drops out immediately rather than lingering here
      // until the next full reload.
      setBackupDrafts((current) => current.filter((item) => item.id !== draft.id));
      window.dispatchEvent(new Event('thesistrack:notifications-updated'));
      showToast(
        decision === 'approve' ? `Approved backup title "${draft.title}".` : `Requested revision for "${draft.title}".`,
        'success'
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to update this backup title.', 'error');
    } finally {
      setSavingBackupDraftId(null);
    }
  };

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedTitleId(null);
        setSelectedEvidenceTitleId(null);
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!selectedTitleId) {
      document.body.style.removeProperty('overflow');
      return;
    }

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.removeProperty('overflow');
    };
  }, [selectedTitleId]);

  const otherDocumentGroups = useMemo<OtherDocumentsGroup[]>(() => {
    const groupsByProject = new Map<string, OtherDocumentsGroup>();

    otherDocuments.forEach((file) => {
      if (!file.projectId) {
        return;
      }

      const existing = groupsByProject.get(file.projectId);
      if (existing) {
        existing.files.push(file);
        return;
      }

      groupsByProject.set(file.projectId, {
        projectId: file.projectId,
        projectTitle: file.projectTitle || file.groupTitle || 'Untitled Project',
        groupLabel: file.groupCode || file.groupTitle || 'Assigned Project',
        groupMembers: file.groupMembers || [],
        files: [file]
      });
    });

    return Array.from(groupsByProject.values());
  }, [otherDocuments]);

  const applyOtherDocumentDecision = async (file: DocumentFileSummary, decision: 'approved' | 'needs_revision', remarks: string) => {
    const trimmedRemarks = remarks.trim();
    const notes = trimmedRemarks || (decision === 'approved'
      ? `${getAdviserClearedLabel({ checkpointKey: file.checkpointKey, stage: file.stage })}. The student can now view the adviser remarks and status.`
      : 'Revision requested. Please address adviser feedback and upload a new version.');

    setSavingOtherDocumentId(file.id);

    try {
      const response = await fetch(`/api/document-files/${file.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: decision, notes })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || 'Unable to update the review status.');
      }

      setOtherDocuments((current) => current.filter((item) => item.id !== file.id));
      window.dispatchEvent(new Event('thesistrack:notifications-updated'));
      showToast(
        decision === 'approved'
          ? `${getAdviserClearedLabel({ checkpointKey: file.checkpointKey, stage: file.stage })}: "${file.fileName}".`
          : `Revision requested for "${file.fileName}".`,
        'success'
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update the review status.';
      setTitleError(message);
      showToast(message, 'error');
    } finally {
      setSavingOtherDocumentId(null);
    }
  };

  const academicYearOptions = useMemo(() => getAcademicYearOptions(titleRecords), [titleRecords]);

  const selectedRecord = useMemo(
    () => titleRecords.find((record) => record.id === selectedTitleId) ?? null,
    [selectedTitleId, titleRecords]
  );

  const selectedEvidenceRecord = useMemo(
    () => titleRecords.find((record) => record.id === selectedEvidenceTitleId) ?? null,
    [selectedEvidenceTitleId, titleRecords]
  );

  useEffect(() => {
    if (!selectedRecord) {
      setRemarksDraft('');
      return;
    }

    setRemarksDraft(selectedRecord.adviserAction);
  }, [selectedRecord]);

  const filteredRecords = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    const filtered = titleRecords.filter((record) => {
      // Evidence pendingness used to also keep an otherwise-decided title
      // showing here, back when Evidence was bundled into this same card.
      // Now that Evidence Review Queue is its own section, this filter only
      // needs to reflect the title decision itself.
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
      const matchesAcademicYear =
        academicYearFilter === 'all' || record.academicYear === academicYearFilter;
      const matchesSearch =
        !normalizedSearch ||
        [
          record.groupId,
          record.title,
          record.description,
          record.keywords.join(' '),
          record.memberPreview.join(' '),
          record.adviserAction
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);

      return matchesStatus && matchesAcademicYear && matchesSearch;
    });

    return sortTitleRecords(filtered, sortBy);
  }, [academicYearFilter, searchValue, sortBy, statusFilter, titleRecords]);

  const evidenceQueue = useMemo(() => getEvidenceQueue(titleRecords), [titleRecords]);

  // Deep links from Document Submissions: ?open=title:<id> | evidence:<id> | backup:<id>
  // open that item's decision modal directly, so the adviser never has to hunt for it.
  useEffect(() => {
    if (handledDeepLink.current) return;
    const [kind, ...rest] = (searchParams.get('open') || '').split(':');
    const id = rest.join(':');
    if (!kind || !id) return;

    if (kind === 'backup') {
      if (isLoadingBackupDrafts) return;
      handledDeepLink.current = true;
      setOpenBackupId(id);
      document.getElementById('queue-backups')?.scrollIntoView({ block: 'start' });
      return;
    }

    if (isLoadingTitles) return;
    handledDeepLink.current = true;
    if (!titleRecords.some((record) => record.id === id)) return;
    if (kind === 'evidence') setSelectedEvidenceTitleId(id);
    else setSelectedTitleId(id);
  }, [searchParams, isLoadingTitles, isLoadingBackupDrafts, titleRecords]);
  const otherDocumentCount = otherDocuments.filter((file) => file.projectId).length;

  const clearTitleFilters = () => {
    setStatusFilter('all');
    setAcademicYearFilter('all');
    setSearchValue('');
    setSortBy('newest');
  };

  // One tile per queue on the page; each one jumps to (and, for titles, filters) its queue.
  const stats = useMemo(() => {
    const pendingTitles = titleRecords.filter((record) => record.status === 'pending').length;
    const approvedTitles = titleRecords.filter((record) => record.status === 'approved').length;
    const waiting = (count: number) => (count > 0 ? DASH_COLORS.warning : DASH_COLORS.good);

    return [
      { id: 'titles', icon: 'fa-file-signature', label: 'Titles to decide', value: pendingTitles, color: waiting(pendingTitles), target: 'queue-titles', status: 'pending' as const },
      { id: 'evidence', icon: 'fa-folder-open', label: 'Evidence to review', value: evidenceQueue.length, color: waiting(evidenceQueue.length), target: 'queue-evidence' },
      { id: 'documents', icon: 'fa-file-lines', label: 'Documents to review', value: otherDocumentCount, color: waiting(otherDocumentCount), target: 'queue-documents' },
      { id: 'backups', icon: 'fa-bookmark', label: 'Backup titles', value: backupDrafts.length, color: waiting(backupDrafts.length), target: 'queue-backups' },
      { id: 'approved', icon: 'fa-circle-check', label: 'Ready for presentation', value: approvedTitles, color: DASH_COLORS.good, target: 'queue-titles', status: 'approved' as const }
    ];
  }, [backupDrafts.length, evidenceQueue.length, otherDocumentCount, titleRecords]);

  const isLoadingQueues = isLoadingTitles || isLoadingOtherDocuments || isLoadingBackupDrafts;

  const applyDecision = async (
    record: AdviserTitleRecord,
    nextStatus: TitleStatus,
    customRemarks?: string
  ) => {
    const trimmedRemarks = customRemarks?.trim() || '';
    const isPlaceholderRemark = trimmedRemarks.toLowerCase() === getDefaultActionForStatus('pending').toLowerCase();
    const nextRemarks = trimmedRemarks && !isPlaceholderRemark
      ? trimmedRemarks
      : getDefaultActionForStatus(nextStatus);

    try {
      const response = await fetch('/api/title-submissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: record.id,
          decision: nextStatus === 'needs-revision' ? 'needs_revision' : nextStatus,
          remarks: nextRemarks
        })
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to update the title decision.');
      }

      setTitleRecords((current) =>
        current.map((item) => (item.id === record.id ? payload.title : item))
      );

      if (selectedTitleId === record.id) {
        setSelectedTitleId(null);
        setRemarksDraft('');
      }
      window.dispatchEvent(new Event('thesistrack:notifications-updated'));
    } catch (error) {
      setTitleError(error instanceof Error ? error.message : 'Unable to update the title decision.');
    }
  };

  const applyEvidenceDecision = async (
    record: AdviserTitleRecord,
    decision: 'approved' | 'needs_revision' | 'rejected',
    remarks: string,
    checkpointKey: DefenseApplicationStageKey
  ) => {
    const response = await fetch('/api/defense-application-evidence', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: record.id, decision, remarks: remarks.trim(), checkpointKey })
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.message || 'Unable to update the evidence review.');
    }

    const reviewField = EVIDENCE_REVIEW_FIELD_BY_CHECKPOINT_KEY[checkpointKey];
    const nextStatus = payload?.checkpoint?.status || record[reviewField]?.status || 'SUBMITTED';

    setTitleRecords((current) =>
      current.map((item) =>
        item.id === record.id
          ? {
              ...item,
              [reviewField]: {
                status: nextStatus,
                feedback: remarks.trim() || item[reviewField]?.feedback || null,
                feedbackBy: remarks.trim() ? 'You' : item[reviewField]?.feedbackBy || null,
                uploaderNote: item[reviewField]?.uploaderNote || null,
                files: item[reviewField]?.files || []
              }
            }
          : item
      )
    );

    window.dispatchEvent(new Event('thesistrack:notifications-updated'));
  };

  return (
    <>
        <AdviserPageHeader
          title="Title & Evidence Approval"
          description="Decide on proposed capstone project titles and review Oral Defense Application evidence, plus other pending documents, from your assigned IT groups."
          actions={
            <AdviserShellActions
              basePath={basePath}
              fullName={data.profile.fullName}
              notificationCount={data.profile.notificationCount}
              workspaceMode={workspaceMode}
              onSwitchWorkspace={switchWorkspace}
            />
          }
        />

        <div className="adviser-dash adviser-approvals">
          <section className="adviser-dash-hero is-five" aria-label="Approval overview">
            {stats.map((stat) => {
              const isActive = Boolean(stat.status) && statusFilter === stat.status;
              return (
                <button
                  key={stat.id}
                  type="button"
                  aria-pressed={stat.status ? isActive : undefined}
                  className={isActive ? 'is-active' : undefined}
                  style={{ '--tone': stat.color } as CSSProperties}
                  title={stat.status ? (isActive ? 'Show all titles' : `Show ${stat.label.toLowerCase()}`) : `Jump to ${stat.label.toLowerCase()}`}
                  onClick={() => {
                    if (stat.status) {
                      setStatusFilter(isActive ? 'all' : stat.status);
                    }
                    document.getElementById(stat.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  <span className="adviser-dash-hero-icon">
                    <i aria-hidden="true" className={`fas ${stat.icon}`} />
                  </span>
                  <span className="adviser-dash-hero-copy">
                    {isLoadingQueues ? <span className="adviser-subs-skeleton-value" aria-hidden="true" /> : <strong>{stat.value}</strong>}
                    <small>{stat.label}</small>
                  </span>
                </button>
              );
            })}
          </section>

          {titleError ? (
            <div className="project-files-state is-danger">
              <i className="fas fa-circle-exclamation" aria-hidden="true" />
              <span>{titleError}</span>
            </div>
          ) : null}

          <QueuePanel
            id="queue-titles"
            title="Title proposals"
            count={titleRecords.length}
            toolbar={
              <TitleToolbar
                statusFilter={statusFilter}
                academicYearFilter={academicYearFilter}
                sortBy={sortBy}
                searchValue={searchValue}
                academicYearOptions={academicYearOptions}
                sortOptions={TITLE_SORT_OPTIONS}
                resultCount={filteredRecords.length}
                totalCount={titleRecords.length}
                onStatusChange={setStatusFilter}
                onAcademicYearChange={setAcademicYearFilter}
                onSortChange={setSortBy}
                onSearchChange={setSearchValue}
                onClear={clearTitleFilters}
              />
            }
          >
            <TitleQueue titles={filteredRecords} isLoading={isLoadingTitles} onOpen={(record) => setSelectedTitleId(record.id)} />
          </QueuePanel>

          {!isLoadingTitles && evidenceQueue.length ? (
            <QueuePanel id="queue-evidence" title="Defense application evidence" count={evidenceQueue.length}>
              <EvidenceQueue records={evidenceQueue} onOpen={(record) => setSelectedEvidenceTitleId(record.id)} />
            </QueuePanel>
          ) : null}

          {!isLoadingOtherDocuments && otherDocumentCount ? (
            <QueuePanel id="queue-documents" title="Other documents" count={otherDocumentCount}>
              <OtherDocumentsQueue groups={otherDocumentGroups} savingFileId={savingOtherDocumentId} onDecide={applyOtherDocumentDecision} />
            </QueuePanel>
          ) : null}

          {!isLoadingBackupDrafts && backupDrafts.length ? (
            <QueuePanel id="queue-backups" title="Backup titles" count={backupDrafts.length}>
              <BackupTitleQueue drafts={backupDrafts} savingId={savingBackupDraftId} openId={openBackupId} onDecide={applyBackupDraftDecision} />
            </QueuePanel>
          ) : null}
        </div>

        {selectedRecord ? (
          <TitleDetailsDrawer
            record={selectedRecord}
            remarksDraft={remarksDraft}
            onRemarksChange={setRemarksDraft}
            onClose={() => setSelectedTitleId(null)}
            onApprove={(r) => applyDecision(r, 'approved', remarksDraft)}
            onRequestRevision={(r) => applyDecision(r, 'needs-revision', remarksDraft)}
            onReject={(r) => applyDecision(r, 'rejected', remarksDraft)}
            onTitleChanged={(r, title) =>
              setTitleRecords((current) => current.map((item) => (item.id === r.id ? { ...item, title } : item)))
            }
            onMessage={showToast}
          />
        ) : null}

        {selectedEvidenceRecord ? (
          <EvidenceReviewDrawer
            record={selectedEvidenceRecord}
            onClose={() => setSelectedEvidenceTitleId(null)}
            onReviewEvidence={applyEvidenceDecision}
          />
        ) : null}

        {toast ? (
          <div className="notification">
            <i
              className={`fas ${getToastIcon(toast.type)}`}
              style={{
                color:
                  toast.type === 'success'
                    ? 'var(--success)'
                    : toast.type === 'error'
                      ? 'var(--danger)'
                      : 'var(--primary)'
              }}
            />
            <span>{toast.message}</span>
          </div>
        ) : null}
      </>
  );
}
