'use client';

import { getFilePreviewKind, getSignedUrlPreview } from '@/lib/storage/file-preview';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StudentDashboardData } from '@/lib/services/student-workspace';
import { DOCUMENT_STORAGE_BUCKETS } from '@/lib/storage/upload-config';
import { FileItem } from '@/components/students/student-project-file-item';
import { FileTable } from '@/components/students/student-project-file-table';
import type {
  PortalRole,
  ProjectFileHistoryEntry,
  ProjectFileRecord,
  ProjectFileSortOption
} from '@/components/students/student-project-files.shared';
import {
  PROJECT_FILE_FILTER_OPTIONS,
  compareProjectFileVersions,
  formatFileSizeLabel,
  formatProjectFileDateTime,
  formatProjectFileStatus,
  getProjectFileCategoryLabel,
  getProjectFileTone,
  getProjectFileTypeIcon,
  getProjectFileVersionLabel,
  hasCompletedConceptStage,
  markSupersededProjectFiles,
  matchesProjectFileFilter,
  getProjectFileCapstone,
  getProjectFileStageKey,
  normalizeProjectFileStatus,
  sortProjectFiles
} from '@/components/students/student-project-files.shared';

type ToastTone = 'success' | 'danger' | 'warning';

type ToastState = {
  tone: ToastTone;
  message: string;
} | null;

function resolveUserRole(groupRole?: string): PortalRole {
  const normalized = groupRole?.toLowerCase() || '';

  if (normalized.includes('admin')) {
    return 'admin';
  }

  if (normalized.includes('adviser') || normalized.includes('faculty')) {
    return 'adviser';
  }

  return 'student';
}

// Oral Defense Application Evidence is typically a multi-photo batch — each
// photo is its own uploaded_files/Submission row on the backend (so the
// adviser can review a whole round together), but showing one tracker row
// per photo is just noise for the student. Roll every photo under a given
// evidence category into a single row; the individual files are still
// reachable from that row's Version History drawer.
const DEFENSE_EVIDENCE_CATEGORIES = new Set([
  'concept-defense-application',
  'proposal-defense-application',
  'final-defense-application'
]);

function groupEvidenceFiles(records: ProjectFileRecord[]): ProjectFileRecord[] {
  const grouped: ProjectFileRecord[] = [];
  const byCategory = new Map<string, ProjectFileRecord[]>();

  for (const record of records) {
    if (!DEFENSE_EVIDENCE_CATEGORIES.has(record.category)) {
      grouped.push(record);
      continue;
    }

    const bucket = byCategory.get(record.category) || [];
    bucket.push(record);
    byCategory.set(record.category, bucket);
  }

  for (const items of byCategory.values()) {
    if (items.length === 1) {
      grouped.push(items[0]);
      continue;
    }

    const sorted = [...items].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    const latest = sorted[0];

    grouped.push({
      ...latest,
      fileName: `${items.length} Evidence Files`,
      history: sorted.map((item, index): ProjectFileHistoryEntry => ({
        id: item.id,
        versionMajor: 1,
        versionMinor: sorted.length - index,
        status: item.status,
        uploadedBy: item.uploadedBy,
        uploadedAt: item.uploadedAt,
        versionNotes: item.fileName,
        reviewedBy: item.reviewedBy,
        reviewedAt: item.reviewedAt,
        fileUrl: item.fileUrl,
        fileName: item.fileName
      }))
    });
  }

  return grouped;
}

function getFileStatusFromSubmission(file: any) {
  return normalizeProjectFileStatus(String(file.submissionStatus || 'pending'));
}

function parseReviewCommentBody(body?: string | null) {
  const trimmedBody = String(body || '').trim();
  const match = trimmedBody.match(/^Area:\s*(.+?)\n\n([\s\S]*)$/i);

  if (!match) {
    return {
      area: '',
      text: trimmedBody
    };
  }

  return {
    area: match[1]?.trim() || '',
    text: match[2]?.trim() || ''
  };
}

function getReviewCommentsFromSubmission(file: any) {
  const comments = Array.isArray(file.reviewComments) ? file.reviewComments : [];

  if (comments.length) {
    return comments;
  }

  return file.latestReviewComment ? [file.latestReviewComment] : [];
}

function getStatusNoteFromSubmission(file: any) {
  const reviewComments = getReviewCommentsFromSubmission(file);
  const reviewComment = parseReviewCommentBody(reviewComments[0]?.body);

  if (reviewComment.text) {
    const prefix = reviewComments.length > 1
      ? `${reviewComments.length} adviser comments are available for this version.\n\n`
      : '';

    return `${prefix}${reviewComment.area ? `Area: ${reviewComment.area}\n\n` : ''}${reviewComment.text}`;
  }

  if (file.submissionStatus === 'UNDER_REVIEW') {
    return 'Under Adviser Review. Your adviser is currently reviewing your submission.';
  }

  if (file.submissionStatus === 'APPROVED') {
    return 'Cleared by your adviser for the next step. Adviser remarks are available.';
  }

  if (file.submissionStatus === 'NEEDS_REVISION') {
    return 'Revise. Your adviser sent this back — review the comments and upload a revised version.';
  }

  return `Secure private document stored in ${file.bucketName}.`;
}

async function getApiErrorMessage(response: Response) {
  try {
    const payload = await response.json();
    return payload?.message || 'Request failed. Please try again.';
  } catch {
    return 'Request failed. Please try again.';
  }
}

function GroupAssignmentRequired({ hasPendingInvite }: { hasPendingInvite?: boolean }) {
  return (
    <div className="student-project-files-page">
      <header className="top-nav">
        <div className="top-nav-leading">
          <div className="page-title">
            <div className="page-title-context">
              <span className="page-kicker">Student Workspace</span>
              <span className="page-breadcrumb" aria-hidden="true">
                <i className="fas fa-angle-right" />
                <span>Project Files</span>
              </span>
            </div>
            <h1>Project Files</h1>
            <p>Keep drafts, revisions, and approved project documents organized in one workspace.</p>
          </div>
        </div>
      </header>

      <div className="page-body p-8 sm:p-12 lg:p-16">
        <div className="mx-auto max-w-2xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-sm p-12 sm:p-16 text-center shadow-xl shadow-slate-200/40 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50/50 -z-10"></div>
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 group-hover:opacity-70 transition-opacity duration-700 -z-10"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 group-hover:opacity-70 transition-opacity duration-700 -z-10"></div>

          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-[var(--muted)] shadow-inner mb-8 transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 ring-4 ring-white">
            <i className={`fas ${hasPendingInvite ? 'fa-envelope-open-text text-blue-500' : 'fa-users-slash'} text-4xl`} aria-hidden="true" />
          </div>
          <h3 className="text-3xl font-extrabold tracking-tight text-[var(--text)]">
            {hasPendingInvite ? 'Action Required: Group Invitation' : 'Group Assignment Required'}
          </h3>
          <p className="mx-auto mt-5 max-w-lg text-base font-medium text-[var(--muted)] leading-relaxed">
            {hasPendingInvite 
              ? 'You have a pending group invitation. You must accept the assignment before you can access the project files repository.'
              : 'You must be assigned to a project group before you can access the project files repository and begin uploading chapters or documents. Please contact your coordinator.'}
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

function TitleApprovalRequired() {
  return (
    <div className="student-project-files-page">
      <header className="top-nav">
        <div className="top-nav-leading">
          <div className="page-title">
            <div className="page-title-context">
              <span className="page-kicker">Student Workspace</span>
              <span className="page-breadcrumb" aria-hidden="true">
                <i className="fas fa-angle-right" />
                <span>Project Files</span>
              </span>
            </div>
            <h1>Project Files</h1>
            <p>Keep drafts, revisions, and approved project documents organized in one workspace.</p>
          </div>
        </div>
      </header>

      <div className="page-body p-8 sm:p-12 lg:p-16">
        <div className="mx-auto max-w-2xl rounded-3xl border border-indigo-200/80 bg-[var(--surface)] backdrop-blur-sm p-12 sm:p-16 text-center shadow-xl shadow-indigo-200/40 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/50 -z-10"></div>
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 group-hover:opacity-60 transition-opacity duration-700 -z-10"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 group-hover:opacity-60 transition-opacity duration-700 -z-10"></div>

          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-blue-100 text-indigo-600 shadow-inner mb-8 transform group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500 ring-4 ring-white">
            <i className="fas fa-lock text-4xl" aria-hidden="true" />
          </div>
          <h3 className="text-3xl font-extrabold tracking-tight text-[var(--text)]">Stage 1 Required</h3>
          <p className="mx-auto mt-5 max-w-lg text-base font-medium text-[var(--muted)] leading-relaxed">
            Complete Stage 1: Concept Proposal in the <strong className="text-indigo-700">Title Submission</strong> workspace before accessing the project files repository. Once Stage 1 is marked complete, your group can begin uploading chapters, revisions, and project documents.
          </p>
        </div>
      </div>
    </div>
  );
}

export function StudentProjectFiles({ data }: { data: StudentDashboardData }) {
  const trackerSectionRef = useRef<HTMLElement | null>(null);
  const createdObjectUrlsRef = useRef(new Set<string>());
  const currentUserRole = useMemo(() => resolveUserRole(data.profile.groupRole), [data.profile.groupRole]);
  const currentUserId = data.profile.user_id;
  const adviserName = data.project.adviser || data.profile.adviser || 'Assigned Adviser';
  const isGroupLeader = Boolean(data.profile.groupRole && data.profile.groupRole.toLowerCase().includes('leader'));

  const [files, setFiles] = useState<ProjectFileRecord[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<ProjectFileSortOption>('newest');
  const [pageSize, setPageSize] = useState(10);
  // 'all', a whole term ('c1' / 'c2'), or a single stage key ('proposal', 'final', ...).
  const [capstoneFilter, setCapstoneFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [historyFile, setHistoryFile] = useState<ProjectFileRecord | null>(null);
  // The same dialog shows either the version history or just the adviser comments.
  const [historyMode, setHistoryMode] = useState<'history' | 'comments'>('history');
  const [preview, setPreview] = useState<{
    file: ProjectFileRecord;
    name: string;
    kind: ReturnType<typeof getFilePreviewKind>;
    url: string | null;
    error: string | null;
  } | null>(null);

  const isConceptStageComplete = useMemo(() => hasCompletedConceptStage(data), [data]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setHistoryFile(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('is-modal-open', Boolean(historyFile));

    return () => {
      document.body.classList.remove('is-modal-open');
    };
  }, [historyFile, preview]);



  useEffect(() => {
    let cancelled = false;

    const loadStoredDocuments = async () => {
      try {
        const response = await fetch(`/api/document-files?bucketName=${DOCUMENT_STORAGE_BUCKETS.THESIS_DOCUMENTS}&page=1&limit=50`, {
          cache: 'no-store'
        });

        if (!response.ok) {
          if (!cancelled) setIsLoadingFiles(false);
          return;
        }

        const payload = await response.json();
        const storedFiles: ProjectFileRecord[] = (payload.files || []).map((file: any) => ({
          id: file.id,
          projectId: file.projectId || data.project.project_id,
          category: file.documentCategory || 'proposal',
          label: file.label || null,
          stageLabel: file.stageLabel || null,
          fileName: file.fileName,
          fileUrl: `/api/document-files/${file.id}/download`,
          versionMajor: 1,
          versionMinor: 0,
          status: getFileStatusFromSubmission(file),
          tag: getFileStatusFromSubmission(file) === 'approved' ? 'Final' : getFileStatusFromSubmission(file) === 'pending' ? 'Draft' : 'Revision',
          versionNotes: getStatusNoteFromSubmission(file),
          uploadedBy: file.uploadedByName || (file.uploadedBy === currentUserId ? data.profile.fullName : 'Project Member'),
          uploadedAt: file.createdAt,
          reviewedAt: file.reviewedAt || undefined,
          reviewedBy: file.reviewedAt ? adviserName : undefined,
          rejectionReason: file.rejectionReason || null, latestReviewComment: file.latestReviewComment || null,
          reviewComments: file.reviewComments || [],
          isFinal: file.bucketName === DOCUMENT_STORAGE_BUCKETS.FINAL_REPOSITORY || getFileStatusFromSubmission(file) === 'approved',
          isRepositoryCopy: file.bucketName === DOCUMENT_STORAGE_BUCKETS.FINAL_REPOSITORY || getFileStatusFromSubmission(file) === 'approved',
          fileType: file.fileType,
          sizeLabel: formatFileSizeLabel(file.fileSize || 0),
          uploadedById: file.uploadedBy,
          history: [
            {
              id: `${file.id}-history`,
              versionMajor: 1,
              versionMinor: 0,
              status: getFileStatusFromSubmission(file),
              uploadedBy: file.uploadedByName || (file.uploadedBy === currentUserId ? data.profile.fullName : 'Project Member'),
              uploadedAt: file.createdAt,
              versionNotes: getStatusNoteFromSubmission(file),
              reviewedBy: file.reviewedAt ? adviserName : undefined,
              reviewedAt: file.reviewedAt || undefined
            }
          ]
        }));

        if (!cancelled) {
          setFiles((current) => {
            const localPendingFiles = current.filter((file) => file.fileUrl.startsWith('blob:'));
            return sortProjectFiles([...groupEvidenceFiles(storedFiles), ...localPendingFiles], 'newest');
          });
          setIsLoadingFiles(false);
        }
      } catch {
        if (!cancelled) setIsLoadingFiles(false);
        // Keep the workspace usable; real uploads will appear after the API is available.
      }
    };

    loadStoredDocuments();

    return () => {
      cancelled = true;
    };
  }, [adviserName, currentUserId, data.profile.fullName, data.project.project_id]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => () => {
    createdObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    createdObjectUrlsRef.current.clear();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, capstoneFilter, searchTerm, sortBy, pageSize]);

  const trackedFilesCount = files.length;
  const pendingReviewCount = files.filter((item) => item.status === 'pending' || item.status === 'under_review').length;
  const revisionCount = files.filter((item) => item.status === 'revision').length;
  const approvedRepositoryCount = files.filter((item) => item.status === 'approved').length;
  const quickFilterOptions = useMemo(
    () => PROJECT_FILE_FILTER_OPTIONS.filter((item) => ['all', 'chapters', 'system-files', 'presentation-files', 'supporting-documents', 'concept-defense-application', 'award-recognition', 'activity-evidence'].includes(item.key)),
    []
  );
  const quickFilterCounts = useMemo(
    () => Object.fromEntries(quickFilterOptions.map((item) => [item.key, files.filter((file) => matchesProjectFileFilter(file, item.key)).length])),
    [files, quickFilterOptions]
  );
  const hasActiveTableFilters = categoryFilter !== 'all' || capstoneFilter !== 'all' || sortBy !== 'newest' || searchTerm.trim().length > 0 || pageSize !== 10;

  const annotatedFiles = useMemo(() => markSupersededProjectFiles(files), [files]);

  const filteredFiles = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return sortProjectFiles(
      annotatedFiles.filter((file) => {

        if (
          capstoneFilter !== 'all' &&
          (capstoneFilter === 'c1' ? getProjectFileCapstone(file) !== 1
            : capstoneFilter === 'c2' ? getProjectFileCapstone(file) !== 2
            : getProjectFileStageKey(file) !== capstoneFilter)
        ) {
          return false;
        }

        if (!matchesProjectFileFilter(file, categoryFilter)) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        return [
          file.fileName,
          (file.label || getProjectFileCategoryLabel(file.category)),
          file.versionNotes,
          file.uploadedBy,
          file.sizeLabel,
          formatProjectFileStatus(file.status, file),
          getProjectFileVersionLabel(file),
          file.tag
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);
      }),
      sortBy
    );
  }, [annotatedFiles, categoryFilter, capstoneFilter, searchTerm, sortBy]);

  const totalCount = filteredFiles.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const paginatedFiles = filteredFiles.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage((previousPage) => Math.min(previousPage, totalPages));
  }, [totalPages]);

  const historyEntries = useMemo(() => {
    if (!historyFile) {
      return [];
    }

    return [...historyFile.history].sort((left, right) => {
      const versionDelta = compareProjectFileVersions(right, left);

      if (versionDelta !== 0) {
        return versionDelta;
      }

      return new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime();
    });
  }, [historyFile, preview]);

  const openTrackerSection = useCallback(() => {
    trackerSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);


  const resetTrackerControls = () => {
    setCategoryFilter('all');
    setCapstoneFilter('all');
    setSearchTerm('');
    setSortBy('newest');
    setPageSize(10);
    setCurrentPage(1);
  };

  // Clicking a file opens it in an in-page preview (no new tab, so nothing for
  // the browser's pop-up blocker to stop). PDFs and images load from /preview;
  // Word/PowerPoint files need a short-lived signed URL for the online viewer.
  const handleViewFile = useCallback(async (file: ProjectFileRecord) => {
    // Grouped evidence rows ("4 Evidence Files") reuse the newest photo's id;
    // its real name is on the first history entry.
    const realName = file.history[0]?.fileName || file.fileName;
    const kind = getFilePreviewKind(realName);

    if (file.fileUrl.startsWith('blob:')) {
      setPreview({ file, name: realName, kind, url: file.fileUrl, error: null });
      return;
    }

    // Only images load directly. PDFs and Office files go through the online
    // viewer: pointing an iframe at a raw PDF makes some browsers (Edge, or
    // Chrome set to "download PDFs") save the file instead of showing it.
    if (kind === 'image') {
      setPreview({ file, name: realName, kind, url: `/api/document-files/${file.id}/preview`, error: null });
      return;
    }

    setPreview({ file, name: realName, kind, url: null, error: null });

    try {
      const response = await fetch(`/api/document-files/${file.id}/signed-url`, { method: 'POST' });

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response));
      }

      const payload = await response.json();
      const viewUrl = getSignedUrlPreview(realName, payload.signedUrl);

      setPreview((current) =>
        current?.file.id === file.id
          ? { ...current, url: viewUrl, error: viewUrl ? null : 'Preview is not available for this file.' }
          : current
      );
    } catch (error) {
      setPreview((current) =>
        current?.file.id === file.id
          ? { ...current, error: error instanceof Error ? error.message : 'Preview is not available for this file.' }
          : current
      );
    }
  }, []);

  const handleDownloadFile = useCallback((file: ProjectFileRecord) => {
    if (file.fileUrl.startsWith('blob:')) {
      const link = document.createElement('a');
      link.href = file.fileUrl;
      link.download = file.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    window.open(`/api/document-files/${file.id}/download`, '_blank', 'noopener,noreferrer');
  }, []);

  const handleDeleteFile = useCallback(async (file: ProjectFileRecord) => {
    setPageError(null);

    if (file.fileUrl.startsWith('blob:')) {
      setFiles((current) => current.filter((item) => item.id !== file.id));
      setHistoryFile((current) => (current?.id === file.id ? null : current));
      URL.revokeObjectURL(file.fileUrl);
      createdObjectUrlsRef.current.delete(file.fileUrl);
      setToast({
        tone: 'success',
        message: `${file.fileName} removed from the active project tracker.`
      });
      return;
    }

    try {
      const response = await fetch(`/api/document-files/${file.id}`, { method: 'DELETE' });

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response));
      }

      setFiles((current) => current.filter((item) => item.id !== file.id));
      setHistoryFile((current) => (current?.id === file.id ? null : current));
      setToast({
        tone: 'success',
        message: `${file.fileName} deleted from private storage.`
      });
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to delete the document.');
    }
  }, []);

  const handleApproveFile = useCallback((file: ProjectFileRecord) => {
    const reviewedAt = new Date().toISOString();
    const nextVersionMinor = file.versionMinor + 1;
    const approvalNotes = `${(file.label || getProjectFileCategoryLabel(file.category))} approved by ${adviserName} and stored as the final repository copy.`;

    setFiles((current) => current.map((item) => {
      if (item.id !== file.id) {
        return item;
      }

      return {
        ...item,
        versionMinor: nextVersionMinor,
        status: 'approved',
        tag: 'Final',
        versionNotes: approvalNotes,
        uploadedAt: reviewedAt,
        reviewedBy: adviserName,
        reviewedAt,
        isFinal: true,
        isRepositoryCopy: true,
        history: [
          ...item.history,
          {
            id: `${item.id}-approved-${Date.now()}`,
            versionMajor: item.versionMajor,
            versionMinor: nextVersionMinor,
            status: 'approved',
            uploadedBy: item.uploadedBy,
            uploadedAt: reviewedAt,
            versionNotes: approvalNotes,
            reviewedBy: adviserName,
            reviewedAt
          }
        ]
      };
    }));

    setToast({
      tone: 'success',
      message: `${file.fileName} approved and added to the official repository section.`
    });
  }, [adviserName]);

  const handleViewHistory = useCallback((file: ProjectFileRecord) => {
    setHistoryMode('history');
    setHistoryFile(file);
  }, []);

  const handleViewComments = useCallback((file: ProjectFileRecord) => {
    setHistoryMode('comments');
    setHistoryFile(file);
  }, []);

  useEffect(() => {
    if (!historyFile && !preview) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setHistoryFile(null);
        setPreview(null);
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [historyFile, preview]);

  const needsAttentionCount = pendingReviewCount + revisionCount;
  const hasProjectFiles = trackedFilesCount > 0;
  const toastIcon = toast?.tone === 'success'
    ? 'fa-circle-check'
    : toast?.tone === 'danger'
      ? 'fa-circle-exclamation'
      : 'fa-circle-info';

  if (!data.group?.id) {
    return <GroupAssignmentRequired hasPendingInvite={!!data.profile.pendingGroupInviteId} />;
  }

  // Project Files workspace stays visible, but uploads open only after Stage 1: Concept is complete.

  return (
    <>
      <div className="student-project-files-page student-tracker-page">
        <header className="top-nav">
          <div className="top-nav-leading">
            <div className="page-title">
              <div className="page-title-context">
                <span className="page-kicker">Student Workspace</span>
                <span className="page-breadcrumb" aria-hidden="true">
                  <i className="fas fa-angle-right" />
                  <span>Document Tracker</span>
                </span>
              </div>
              <h1>Document Tracker</h1>
            </div>
          </div>
          <div className="project-files-header-actions">
            <Link
              className="btn btn-primary project-files-upload-button"
              href="/students/submit"
              title="Submit a document from the Submit Documents page"
            >
              <i className="fas fa-cloud-arrow-up" aria-hidden="true" />
              Submit Documents
            </Link>
          </div>
        </header>

        <div className="page-body flex flex-col gap-4">
          <article ref={trackerSectionRef} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-[var(--text-meta)]">All documents</span>
                <h3 className="text-lg font-bold tracking-tight text-[var(--text)]">
                  {trackedFilesCount} file{trackedFilesCount === 1 ? '' : 's'}
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {hasActiveTableFilters ? (
                  <button className="table-btn" type="button" onClick={resetTrackerControls}>
                    <i className="fas fa-rotate-left" aria-hidden="true" /> Clear filters
                  </button>
                ) : null}
              </div>
            </div>

              <FileTable
                files={paginatedFiles}
                totalCount={totalCount}
                currentUserRole={currentUserRole}
                currentUserId={currentUserId}
                categoryFilter={categoryFilter}
                searchTerm={searchTerm}
                sortBy={sortBy}
                pageSize={pageSize}
                currentPage={currentPage}
                totalPages={totalPages}
                isLoading={isLoadingFiles}
                errorMessage={pageError}
                onCategoryFilterChange={setCategoryFilter}
                capstoneFilter={capstoneFilter}
                onCapstoneFilterChange={setCapstoneFilter}
                onSearchTermChange={setSearchTerm}
                onSortByChange={setSortBy}
                onPageSizeChange={setPageSize}
                onPageChange={setCurrentPage}
                onView={handleViewFile}
                onDownload={handleDownloadFile}
                onDelete={handleDeleteFile}
                onApprove={handleApproveFile}
                onViewHistory={handleViewHistory}
                onViewComments={handleViewComments}
              />
            </article>


        </div>

        {/* File preview: opens when a file name is clicked in the table. */}
        {/* Portaled to <body>: inside the app shell the fixed overlay ends up
            under the fixed top bar (an ancestor creates its own stacking context).
            Mounted on .student-shell (not <body>) so the dark-theme variables still apply. */}
        {preview && typeof document !== 'undefined' ? createPortal(
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
            onClick={() => setPreview(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Preview of ${preview.name}`}
              onClick={(event) => event.stopPropagation()}
              className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
            >
              <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <i className={`fas ${getProjectFileTypeIcon(preview.name, preview.file.fileType)}`} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-bold text-[var(--text)]" title={preview.name}>{preview.name}</h3>
                  <p className="truncate text-xs text-[var(--muted)]">
                    {preview.file.label || getProjectFileCategoryLabel(preview.file.category)} · {formatProjectFileStatus(preview.file.status, preview.file)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadFile(preview.file)}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-[#003A8F] transition hover:bg-blue-50"
                >
                  <i className="fas fa-download text-[10px]" aria-hidden="true" /> Download
                </button>
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  aria-label="Close preview"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-meta)] transition hover:bg-[var(--surface-alt)] hover:text-[var(--text)]"
                >
                  <i className="fas fa-xmark" aria-hidden="true" />
                </button>
              </div>

              <div className="flex flex-1 items-center justify-center overflow-hidden bg-[var(--surface-alt)]">
                {preview.error ? (
                  <div className="flex flex-col items-center gap-2 p-8 text-center">
                    <i className="fas fa-file-circle-exclamation text-3xl text-[var(--text-meta)]" aria-hidden="true" />
                    <p className="text-sm font-semibold text-[var(--text)]">{preview.error}</p>
                    <p className="text-xs text-[var(--muted)]">You can still download the file to open it.</p>
                  </div>
                ) : !preview.url ? (
                  <p className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <i className="fas fa-spinner fa-spin" aria-hidden="true" /> Preparing preview…
                  </p>
                ) : preview.kind === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element -- private storage URL, not a static asset
                  <img src={preview.url} alt={preview.name} className="max-h-full max-w-full object-contain" />
                ) : preview.kind === 'none' ? (
                  <div className="flex flex-col items-center gap-2 p-8 text-center">
                    <i className="fas fa-file text-3xl text-[var(--text-meta)]" aria-hidden="true" />
                    <p className="text-sm font-semibold text-[var(--text)]">This file type can’t be previewed here.</p>
                    <p className="text-xs text-[var(--muted)]">Download it to open it on your device.</p>
                  </div>
                ) : (
                  <iframe src={preview.url} title={`Preview of ${preview.name}`} className="h-full w-full border-0 bg-white" />
                )}
              </div>
            </div>
          </div>
        , document.querySelector('.student-shell') ?? document.body) : null}

        {/* Version history dialog: fixed above the app shell (the old modal-shell
            sat under the fixed top bar, hiding its heading and close button). */}
        {historyFile && typeof document !== 'undefined' ? createPortal(
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
            onClick={() => setHistoryFile(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="project-file-history-title"
              onClick={(event) => event.stopPropagation()}
              className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
            >
              {/* Header: what file this is */}
              <div className="flex items-start gap-3 border-b border-[var(--border)] px-5 py-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <i className={`fas ${getProjectFileTypeIcon(historyFile.fileName, historyFile.fileType)}`} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-black uppercase tracking-widest text-[var(--text-meta)]">{historyMode === 'comments' ? 'Adviser feedback' : 'Version history'}</span>
                  <h3 id="project-file-history-title" className="line-clamp-2 break-words text-base font-bold leading-snug text-[var(--text)]">
                    {historyFile.fileName}
                  </h3>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    {historyFile.label || getProjectFileCategoryLabel(historyFile.category)} · {getProjectFileVersionLabel(historyFile)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryFile(null)}
                  aria-label="Close"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-meta)] transition hover:bg-[var(--surface-alt)] hover:text-[var(--text)]"
                >
                  <i className="fas fa-xmark" aria-hidden="true" />
                </button>
              </div>

              <div className="flex flex-col gap-5 overflow-y-auto px-5 py-4">
                {/* Summary: status, upload and review at a glance (history mode only). */}
                {historyMode === 'history' ? (
                <dl className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-3 sm:grid-cols-3">
                  <div>
                    <dt className="text-[10px] font-black uppercase tracking-widest text-[var(--text-meta)]">Status</dt>
                    {/* Plain text + dot, same size as the Uploaded/Reviewed values. */}
                    <dd className={`mt-1 flex items-start gap-1.5 text-[13px] font-semibold leading-snug ${
                      { success: 'text-emerald-700', warning: 'text-amber-700', danger: 'text-rose-700', info: 'text-blue-700' }[getProjectFileTone(historyFile.status)]
                    }`}>
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-current" aria-hidden="true" />
                      {formatProjectFileStatus(historyFile.status, historyFile)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-black uppercase tracking-widest text-[var(--text-meta)]">Uploaded</dt>
                    <dd className="mt-1 text-[13px] font-semibold text-[var(--text)]">{formatProjectFileDateTime(historyFile.uploadedAt)}</dd>
                    <dd className="text-xs text-[var(--muted)]">{historyFile.uploadedBy}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-black uppercase tracking-widest text-[var(--text-meta)]">Reviewed</dt>
                    {historyFile.reviewedAt ? (
                      <>
                        <dd className="mt-1 text-[13px] font-semibold text-[var(--text)]">{formatProjectFileDateTime(historyFile.reviewedAt)}</dd>
                        <dd className="text-xs text-[var(--muted)]">{historyFile.reviewedBy || adviserName}</dd>
                      </>
                    ) : (
                      <dd className="mt-1 text-[13px] font-semibold text-amber-700">Waiting for review</dd>
                    )}
                  </div>
                </dl>
                ) : null}

                {/* Comments only in comments mode — version history is just the versions. */}
                {historyMode === 'comments' && historyFile.reviewComments?.length ? (
                  <section>
                    <ul className="flex flex-col gap-2">
                      {historyFile.reviewComments.map((comment) => {
                        const parsedComment = parseReviewCommentBody(comment.body);

                        return (
                          <li key={comment.id} className="rounded-xl border-l-4 border-[#003A8F] bg-blue-50/50 px-3 py-2.5">
                            <p className="text-sm leading-relaxed text-[var(--text)]">{parsedComment.text}</p>
                            <p className="mt-1 text-[11px] font-semibold text-[var(--muted)]">
                              {comment.authorName || adviserName} · {formatProjectFileDateTime(String(comment.createdAt))}
                              {parsedComment.area ? <span className="text-[#003A8F]"> · {parsedComment.area}</span> : null}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ) : historyMode === 'comments' ? (
                  <p className="text-sm text-[var(--muted)]">No adviser comments on this file yet.</p>
                ) : null}

                {historyMode === 'history' ? (
                <section>
                  <h4 className="mb-2 text-[11px] font-black uppercase tracking-widest text-[var(--text-meta)]">
                    {historyEntries.length === 1 ? 'File' : `Versions · ${historyEntries.length}`}
                  </h4>
                  <ol className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)]">
                    {historyEntries.map((entry, index) => {
                      const commentBodies = (historyFile.reviewComments ?? []).map((comment) => parseReviewCommentBody(comment.body).text.trim());
                      // Skip storage boilerplate and notes that just repeat the feedback above.
                      const note =
                        entry.versionNotes &&
                        !/stored in thesis-documents/i.test(entry.versionNotes) &&
                        !commentBodies.includes(entry.versionNotes.trim())
                          ? entry.versionNotes
                          : '';
                      const showStatus = historyEntries.length > 1;

                      return (
                        <li key={entry.id} className="flex items-start gap-3 px-3 py-3">
                          <span className="mt-0.5 flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md bg-[var(--primary-soft)] px-1.5 text-[10px] font-black text-[var(--primary)]">
                            {historyEntries.length > 1 ? `#${index + 1}` : `v${entry.versionMajor}.${entry.versionMinor}`}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <strong className="truncate text-[13px] font-bold text-[var(--text)]">
                                {entry.fileName || historyFile.fileName}
                              </strong>
                              {showStatus ? (
                                <span className={`ui-badge is-${getProjectFileTone(entry.status)}`}>{formatProjectFileStatus(entry.status, historyFile)}</span>
                              ) : null}
                            </div>
                            <p className="mt-0.5 text-xs text-[var(--muted)]">
                              <i className="fas fa-arrow-up-from-bracket mr-1 text-[10px] text-[var(--text-meta)]" aria-hidden="true" />
                              {formatProjectFileDateTime(entry.uploadedAt)} · {entry.uploadedBy}
                            </p>
                            {entry.reviewedAt ? (
                              <p className="text-xs text-[var(--muted)]">
                                <i className="fas fa-user-check mr-1 text-[10px] text-[var(--text-meta)]" aria-hidden="true" />
                                Reviewed {formatProjectFileDateTime(entry.reviewedAt)}{entry.reviewedBy ? ` · ${entry.reviewedBy}` : ''}
                              </p>
                            ) : null}
                            {note ? <p className="mt-1 text-xs text-[var(--text)]">{note}</p> : null}
                          </div>
                          {entry.fileUrl || index === 0 ? (
                            <a
                              href={entry.fileUrl || historyFile.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Download ${entry.fileName || historyFile.fileName}`}
                              className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-[#003A8F] transition hover:bg-blue-50"
                            >
                              <i className="fas fa-download text-[10px]" aria-hidden="true" /> Download
                            </a>
                          ) : null}
                        </li>
                      );
                    })}
                  </ol>
                </section>
                ) : null}
              </div>
            </div>
          </div>
        , document.querySelector('.student-shell') ?? document.body) : null}
      </div>

      {toast ? (
        <div className="toast-stack" aria-live="polite">
          <div className={`toast-item is-${toast.tone}`}>
            <i className={`fas ${toastIcon}`} aria-hidden="true" />
            <span>{toast.message}</span>
          </div>
        </div>
      ) : null}

    </>
  );
}
