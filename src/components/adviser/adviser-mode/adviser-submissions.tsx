'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { type DocumentFileSummary } from '@/components/documents/document-file-controls';
import { DOCUMENT_STORAGE_BUCKETS } from '@/lib/storage/upload-config';
import {
  SUBMISSION_STATUS_TONE,
  SubmissionList,
  SubmissionStats,
  SubmissionToolbar,
  getDeadlineVisual,
  type SubmissionStat
} from '@/components/adviser/adviser-mode/data/submission-workspace-sections';
import { DASH_COLORS } from '@/components/adviser/shared/config/dashboard-types';
import {
  compareSubmissionReviewOrder,
  formatSubmissionDate,
  getAdviserReviewQueueFiles,
  getApprovedThisWeekCount,
  getSubmissionMilestoneOptions,
  getSubmissionTypeOptions,
  toAdviserSubmissionRecord,
  toAdviserSubmissionRecordFromBackup,
  toAdviserSubmissionRecordFromTitle,
  toAdviserSubmissionRecordsFromEvidence,
  type AdviserBackupTitleSummary,
  type AdviserSubmissionRecord,
  type SubmissionMilestone,
  type SubmissionSortOption,
  type SubmissionStatus,
  type SubmissionType,
  type TitleSubmissionSummary
} from '@/components/adviser/adviser-mode/data/submission-workspace-data';
import type { AdviserDashboardData } from '@/lib/mock/adviser-dashboard';

export function AdviserSubmissions({ data: _data }: { data: AdviserDashboardData }) {
  const [typeFilter, setTypeFilter] = useState<SubmissionType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | 'all'>('all');
  const [milestoneFilter, setMilestoneFilter] = useState<SubmissionMilestone | 'all'>('all');
  const [sortBy, setSortBy] = useState<SubmissionSortOption>('deadline');
  const [searchValue, setSearchValue] = useState('');
  const [studentDocuments, setStudentDocuments] = useState<DocumentFileSummary[]>([]);
  const [titleSubmissions, setTitleSubmissions] = useState<TitleSubmissionSummary[]>([]);
  const [backupTitles, setBackupTitles] = useState<AdviserBackupTitleSummary[]>([]);
  const [studentDocumentError, setStudentDocumentError] = useState<string | null>(null);
  const [isLoadingStudentDocuments, setIsLoadingStudentDocuments] = useState(true);
  const router = useRouter();

  const submissions = useMemo<AdviserSubmissionRecord[]>(
    () => [
      ...studentDocuments.map((file, index) => toAdviserSubmissionRecord(file, index)),
      ...titleSubmissions.map((title) => toAdviserSubmissionRecordFromTitle(title)),
      ...titleSubmissions.flatMap((title) => toAdviserSubmissionRecordsFromEvidence(title)),
      ...backupTitles.map((draft) => toAdviserSubmissionRecordFromBackup(draft))
    ],
    [studentDocuments, titleSubmissions, backupTitles]
  );

  const typeOptions = useMemo(() => getSubmissionTypeOptions(submissions), [submissions]);
  const milestoneOptions = useMemo(() => getSubmissionMilestoneOptions(submissions), [submissions]);
  const hasActiveFilters =
    typeFilter !== 'all' || statusFilter !== 'all' || milestoneFilter !== 'all' || searchValue.trim().length > 0 || sortBy !== 'deadline';

  const clearFilters = () => {
    setTypeFilter('all');
    setStatusFilter('all');
    setMilestoneFilter('all');
    setSortBy('deadline');
    setSearchValue('');
  };

  useEffect(() => {
    let cancelled = false;

    const loadStudentDocuments = async () => {
      setIsLoadingStudentDocuments(true);
      setStudentDocumentError(null);

      try {
        const response = await fetch(`/api/document-files?bucketName=${DOCUMENT_STORAGE_BUCKETS.THESIS_DOCUMENTS}&limit=50`, {
          cache: 'no-store'
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.message || 'Unable to load student thesis documents.');
        }

        if (!cancelled) {
          setStudentDocuments(getAdviserReviewQueueFiles(payload?.files || []));
        }
      } catch (error) {
        if (!cancelled) {
          setStudentDocumentError(error instanceof Error ? error.message : 'Unable to load student thesis documents.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingStudentDocuments(false);
        }
      }
    };

    const loadTitleSubmissions = async () => {
      try {
        const response = await fetch('/api/title-submissions?limit=50', { cache: 'no-store' });
        const payload = await response.json().catch(() => null);

        if (response.ok && !cancelled) {
          setTitleSubmissions(payload?.titles || []);
        }
      } catch {
        // Best-effort: titles are additive to this queue, not the primary data source,
        // so a failure here shouldn't block or error out the document review list.
      }
    };

    const loadBackupTitles = async () => {
      try {
        const response = await fetch('/api/title-drafts/adviser', { cache: 'no-store' });
        const payload = await response.json().catch(() => null);

        if (response.ok && !cancelled) {
          setBackupTitles(payload?.drafts || []);
        }
      } catch {
        // Best-effort, same reasoning as loadTitleSubmissions above.
      }
    };

    loadStudentDocuments();
    loadTitleSubmissions();
    loadBackupTitles();

    return () => {
      cancelled = true;
    };
  }, []);

  function downloadSubmissionDocument(submission: AdviserSubmissionRecord) {
    // Title and Evidence rows use a synthetic id (not a real document-files id),
    // so route through the real file id when one exists rather than assuming
    // submission.id names a downloadable file.
    if (submission.previewFileId) {
      window.open(`/api/document-files/${submission.previewFileId}/download`, '_blank', 'noopener,noreferrer');
      return;
    }

    if (submission.fileUrl) {
      window.open(submission.fileUrl, '_blank', 'noopener,noreferrer');
    }
  }

  const filteredSubmissions = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();
    const statusPriority: Record<SubmissionStatus, number> = {
      'needs-revision': 0,
      'pending-review': 1,
      'under-review': 2,
      approved: 3
    };

    return submissions.filter((submission) => {
      const matchesType = typeFilter === 'all' || submission.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || submission.status === statusFilter;
      const matchesMilestone = milestoneFilter === 'all' || submission.milestone === milestoneFilter;
      const matchesSearch =
        !normalizedSearch ||
        [
          submission.groupId,
          submission.projectTitle,
          submission.submissionTitle,
          submission.submittedBy,
          submission.reviewFocus,
          submission.nextAction,
          submission.commentCategories.join(' ')
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);

      return matchesType && matchesStatus && matchesMilestone && matchesSearch;
    }).sort((left, right) => {
      if (sortBy === 'submitted') {
        return new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime();
      }

      if (sortBy === 'status') {
        return statusPriority[left.status] - statusPriority[right.status] || compareSubmissionReviewOrder(left, right);
      }

      if (sortBy === 'version') {
        return right.currentVersionNumber - left.currentVersionNumber || compareSubmissionReviewOrder(left, right);
      }

      return compareSubmissionReviewOrder(left, right) || statusPriority[left.status] - statusPriority[right.status];
    });
  }, [milestoneFilter, searchValue, sortBy, statusFilter, submissions, typeFilter]);

  const needsRevisionCount = useMemo(
    () => submissions.filter((submission) => submission.status === 'needs-revision').length,
    [submissions]
  );
  const underReviewCount = useMemo(
    () => submissions.filter((submission) => submission.status === 'under-review').length,
    [submissions]
  );
  const pendingReviewCount = useMemo(
    () => submissions.filter((submission) => submission.status === 'pending-review').length,
    [submissions]
  );
  const approvedThisWeekCount = useMemo(() => getApprovedThisWeekCount(submissions), [submissions]);
  const nextDueSubmission = useMemo(
    () =>
      [...submissions]
        .filter((submission) => submission.status !== 'approved' && submission.deadline)
        .sort(compareSubmissionReviewOrder)[0] ?? null,
    [submissions]
  );

  const stats = useMemo<SubmissionStat[]>(() => {
    const nextDue = nextDueSubmission ? getDeadlineVisual(nextDueSubmission.deadline, nextDueSubmission.status) : null;

    return [
      {
        id: 'pending-review',
        label: 'Pending review',
        value: pendingReviewCount,
        icon: 'fa-inbox',
        color: pendingReviewCount ? SUBMISSION_STATUS_TONE['pending-review'].color : DASH_COLORS.good,
        filterStatus: 'pending-review'
      },
      {
        id: 'under-review',
        label: 'Under review',
        value: underReviewCount,
        icon: 'fa-magnifying-glass',
        color: SUBMISSION_STATUS_TONE['under-review'].color,
        filterStatus: 'under-review'
      },
      {
        id: 'needs-revision',
        label: 'Revision requested',
        value: needsRevisionCount,
        icon: 'fa-rotate-left',
        color: needsRevisionCount ? SUBMISSION_STATUS_TONE['needs-revision'].color : DASH_COLORS.good,
        filterStatus: 'needs-revision'
      },
      {
        id: 'approved-this-week',
        label: 'Approved this week',
        value: approvedThisWeekCount,
        icon: 'fa-circle-check',
        color: SUBMISSION_STATUS_TONE.approved.color,
        // Counts the last 7 days; clicking shows every approved item, which the adviser can narrow further.
        helper: 'Show all approved submissions',
        filterStatus: 'approved'
      },
      {
        id: 'next-due',
        label: nextDueSubmission ? `Next due · ${nextDueSubmission.groupId}` : 'No due dates set',
        value: nextDueSubmission?.deadline ? formatSubmissionDate(nextDueSubmission.deadline).replace(/,\s*\d{4}$/, '') : '—',
        icon: nextDue?.icon ?? 'fa-calendar',
        color: nextDue?.color ?? DASH_COLORS.neutral,
        helper: nextDueSubmission ? `${nextDueSubmission.submissionTitle} — ${nextDue?.label}` : 'No adviser due dates have been set.'
      }
    ];
  }, [approvedThisWeekCount, needsRevisionCount, nextDueSubmission, pendingReviewCount, underReviewCount]);

  return (
    <>
      <div className="adviser-dash adviser-subs">
        <SubmissionStats
          stats={stats}
          isLoading={isLoadingStudentDocuments}
          activeStatus={statusFilter}
          onSelect={setStatusFilter}
        />

        {studentDocumentError ? (
          <div className="project-files-state is-danger">
            <i className="fas fa-circle-exclamation" aria-hidden="true" />
            <span>{studentDocumentError}</span>
          </div>
        ) : null}

        <section className="adviser-dash-card adviser-groups-panel" aria-label="Submissions">
          <SubmissionToolbar
            hasActiveFilters={hasActiveFilters}
            milestoneFilter={milestoneFilter}
            milestoneOptions={milestoneOptions}
            onClearFilters={clearFilters}
            onMilestoneChange={setMilestoneFilter}
            onSearchChange={setSearchValue}
            onSortChange={setSortBy}
            onTypeChange={setTypeFilter}
            resultCount={filteredSubmissions.length}
            searchValue={searchValue}
            sortBy={sortBy}
            totalCount={submissions.length}
            typeFilter={typeFilter}
            typeOptions={typeOptions}
          />

          <SubmissionList
            hasActiveFilters={hasActiveFilters}
            isLoading={isLoadingStudentDocuments}
            onClearFilters={clearFilters}
            onDownloadSubmission={downloadSubmissionDocument}
            onViewSubmission={(submission) => router.push(submission.workspaceHref)}
            submissions={filteredSubmissions}
          />
        </section>
      </div>

    </>
  );
}
