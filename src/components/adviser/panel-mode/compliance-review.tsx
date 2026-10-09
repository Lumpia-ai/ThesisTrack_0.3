'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdviserPageHeader } from '@/components/adviser/shared/components/adviser-page-header';
import { AdviserShellActions } from '@/components/adviser/shared/components/adviser-shell-actions';
import { useWorkspaceMode } from '@/components/adviser/shared/hooks/use-workspace-mode';
import { TitleSummaryCards, type TitleSummaryMetric } from '@/components/adviser/adviser-mode/data/title-workspace-sections';
import type { AdviserDashboardData } from '@/lib/mock/adviser-dashboard';
import {
  COMPLIANCE_REVIEW_STATUS_META,
  COMPLIANCE_STATUS_META,
  formatComplianceDate,
  getComplianceStatusKey,
  getCompliancePreviewHref,
  type ComplianceDefense,
  type ComplianceSubmissionItem
} from '@/lib/compliance-display';

type StatusFilter = 'all' | 'awaiting-me' | 'NOT_SUBMITTED' | 'UNDER_REVIEW' | 'NEEDS_REVISION' | 'APPROVED';

const FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'awaiting-me', label: 'Awaiting My Review' },
  { value: 'NOT_SUBMITTED', label: 'Awaiting Submission' },
  { value: 'NEEDS_REVISION', label: 'Needs Revision' },
  { value: 'APPROVED', label: 'Approved' }
];

function isAwaitingMyReview(defense: ComplianceDefense) {
  const latest = defense.submissions[0];
  return Boolean(latest?.canReview && latest.myReviewStatus === 'PENDING');
}

function StatusBadge({ meta }: { meta: { label: string; className: string; icon: string } }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
      <i className={`fas ${meta.icon}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

function SubmissionDetails({ submission }: { submission: ComplianceSubmissionItem }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-[var(--muted)]">
          Version {submission.version} · submitted by {submission.submittedByName || 'the group'} on {formatComplianceDate(submission.submittedAt)}
        </div>
        {submission.file ? (
          <a
            href={getCompliancePreviewHref(submission.file.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--text)] shadow-sm hover:bg-[var(--surface-alt)]"
          >
            <i className="fas fa-file-lines" aria-hidden="true" />
            {submission.file.fileName}
          </a>
        ) : (
          <span className="text-sm text-[var(--muted)]">File no longer available</span>
        )}
      </div>

      {submission.notes ? (
        <div className="rounded-xl bg-[var(--surface-alt)] p-4 text-sm leading-6 text-[var(--text)] whitespace-pre-wrap">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Group&apos;s notes</div>
          {submission.notes}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--surface-alt)] text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="px-4 py-2.5">Panelist</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {submission.reviews.map((review) => (
              <tr key={review.id} className="border-t border-[var(--border)] align-top">
                <td className="px-4 py-3 font-medium text-[var(--text)]">{review.reviewerName}</td>
                <td className="px-4 py-3">
                  <StatusBadge meta={COMPLIANCE_REVIEW_STATUS_META[review.status]} />
                </td>
                <td className="px-4 py-3 text-[var(--muted)] whitespace-pre-wrap">{review.remarks || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReviewForm({
  submission,
  isSubmitting,
  onSubmit
}: {
  submission: ComplianceSubmissionItem;
  isSubmitting: boolean;
  onSubmit: (decision: 'verified' | 'needs_revision', remarks: string) => void;
}) {
  const [remarks, setRemarks] = useState(submission.myReviewRemarks ?? '');

  useEffect(() => {
    setRemarks(submission.myReviewRemarks ?? '');
  }, [submission.id, submission.myReviewRemarks]);

  return (
    <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
      <div className="text-sm font-semibold text-[var(--text)]">
        Your review
        {submission.myReviewStatus && submission.myReviewStatus !== 'PENDING' ? (
          <span className="ml-2 font-normal text-[var(--muted)]">
            (currently {COMPLIANCE_REVIEW_STATUS_META[submission.myReviewStatus].label.toLowerCase()} — you can change it until every panelist verifies)
          </span>
        ) : null}
      </div>
      <textarea
        value={remarks}
        onChange={(event) => setRemarks(event.target.value)}
        rows={3}
        placeholder="Remarks for the group (required when requesting revisions)"
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[#003A8F]/20"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => onSubmit('verified', remarks)}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
        >
          <i className="fas fa-check" aria-hidden="true" />
          Mark Verified
        </button>
        <button
          type="button"
          disabled={isSubmitting || !remarks.trim()}
          onClick={() => onSubmit('needs_revision', remarks)}
          title={remarks.trim() ? undefined : 'Add remarks describing what still needs revision'}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 disabled:opacity-60"
        >
          <i className="fas fa-rotate-left" aria-hidden="true" />
          Request Revision
        </button>
      </div>
    </div>
  );
}

export function ComplianceReview({ data }: { data: AdviserDashboardData }) {
  const { workspaceMode, switchWorkspace, basePath } = useWorkspaceMode();
  const [defenses, setDefenses] = useState<ComplianceDefense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchValue, setSearchValue] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadDefenses() {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await fetch('/api/compliance', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to load compliance submissions.');
      }

      setDefenses((payload?.defenses ?? []) as ComplianceDefense[]);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load compliance submissions.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDefenses();
  }, []);

  const filteredDefenses = useMemo(() => {
    const search = searchValue.trim().toLowerCase();

    return defenses.filter((defense) => {
      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'awaiting-me' ? isAwaitingMyReview(defense) : getComplianceStatusKey(defense) === statusFilter);
      const matchesSearch = !search
        || [defense.projectTitle, defense.groupCode, defense.scheduleType, ...defense.students].join(' ').toLowerCase().includes(search);

      return matchesStatus && matchesSearch;
    });
  }, [defenses, searchValue, statusFilter]);

  const summaryMetrics = useMemo<TitleSummaryMetric[]>(() => [
    {
      id: 'awaiting-me',
      label: 'Awaiting My Review',
      value: defenses.filter(isAwaitingMyReview).length,
      helperText: 'Submitted compliance you have not reviewed yet.',
      icon: 'fa-hourglass-half',
      iconClassName: 'bg-blue-50 text-blue-600'
    },
    {
      id: 'not-submitted',
      label: 'Awaiting Submission',
      value: defenses.filter((defense) => defense.defensePassed && !defense.complianceStatus).length,
      helperText: 'Passed defenses where the group has not submitted yet.',
      icon: 'fa-inbox',
      iconClassName: 'bg-slate-100 text-slate-600'
    },
    {
      id: 'needs-revision',
      label: 'Needs Revision',
      value: defenses.filter((defense) => defense.complianceStatus === 'NEEDS_REVISION').length,
      helperText: 'Returned to the group for another round.',
      icon: 'fa-rotate-left',
      iconClassName: 'bg-amber-50 text-amber-600'
    },
    {
      id: 'approved',
      label: 'Approved',
      value: defenses.filter((defense) => defense.complianceStatus === 'APPROVED').length,
      helperText: 'Every panelist verified the compliance.',
      icon: 'fa-circle-check',
      iconClassName: 'bg-emerald-50 text-emerald-600'
    }
  ], [defenses]);

  async function submitReview(submission: ComplianceSubmissionItem, decision: 'verified' | 'needs_revision', remarks: string) {
    setIsSubmitting(true);
    setLoadError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/compliance/${submission.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, remarks })
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to save your review.');
      }

      setNotice(payload?.message || 'Your compliance review was saved.');
      await loadDefenses();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to save your review.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <AdviserPageHeader
        title="Compliance Review"
        description="Review the revisions groups submit after their Proposal or Final Defense. You only see groups whose defense panel you sat on."
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

      <div className="mx-auto max-w-[1600px] space-y-6">
        <TitleSummaryCards metrics={summaryMetrics} />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatusFilter(filter.value)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                  statusFilter === filter.value
                    ? 'bg-[#003A8F] text-white shadow-sm'
                    : 'bg-[var(--surface)] text-[var(--text)] ring-1 ring-[var(--border)] hover:bg-[var(--surface-alt)]'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search group, title, or student"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm lg:w-80"
          />
        </div>

        {loadError ? (
          <div className="project-files-state is-danger">
            <i className="fas fa-circle-exclamation" aria-hidden="true" />
            <span>{loadError}</span>
          </div>
        ) : null}

        {notice ? (
          <div className="project-files-state">
            <i className="fas fa-circle-check text-emerald-600" aria-hidden="true" />
            <span>{notice}</span>
          </div>
        ) : null}

        {isLoading ? (
          <div className="project-files-state">
            <span className="project-files-spinner" aria-hidden="true" />
            <span>Loading compliance submissions...</span>
          </div>
        ) : defenses.length === 0 ? (
          <div className="rounded-[1.75rem] border border-slate-100/50 bg-gradient-to-br from-slate-50 to-blue-50/40 px-6 py-16 text-center shadow-sm">
            <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-brand/10 to-brand/5 text-brand shadow-sm">
              <i className="fas fa-list-check text-2xl" />
            </div>
            <h3 className="mt-6 text-xl font-bold text-[var(--text-dark)]">No Compliance to Review</h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--text-light)]">
              Groups appear here after a Proposal or Final Defense you were assigned to as a panelist is completed.
            </p>
          </div>
        ) : filteredDefenses.length === 0 ? (
          <div className="project-files-state">
            <span>No groups match this filter.</span>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDefenses.map((defense) => {
              const latest = defense.submissions[0] ?? null;
              const earlier = defense.submissions.slice(1);
              const isExpanded = expandedId === defense.scheduleId;
              const myRole = defense.panelists.find((panelist) => panelist.isViewer)?.panelRole;

              return (
                <article key={defense.scheduleId} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : defense.scheduleId)}
                    className="flex w-full flex-col gap-3 p-5 text-left md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                        <span>{defense.groupCode}</span>
                        <span aria-hidden="true">·</span>
                        <span>{defense.scheduleType}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatComplianceDate(defense.scheduledAt)}</span>
                        {myRole ? <span className="rounded bg-[var(--surface-alt)] px-1.5 py-0.5 normal-case">You: {myRole === 'CHAIR' ? 'Chair' : 'Member'}</span> : null}
                      </div>
                      <h3 className="truncate text-base font-semibold text-[var(--text)]">{defense.projectTitle}</h3>
                      <p className="truncate text-sm text-[var(--muted)]">{defense.students.join(', ') || 'No members listed'}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {isAwaitingMyReview(defense) ? (
                        <span className="rounded-full bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white">Your review needed</span>
                      ) : null}
                      {defense.defensePassed || latest ? (
                        <StatusBadge meta={COMPLIANCE_STATUS_META[getComplianceStatusKey(defense)]} />
                      ) : (
                        <StatusBadge meta={{ label: 'Defense not passed', className: 'bg-rose-50 text-rose-700', icon: 'fa-xmark' }} />
                      )}
                      <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-[var(--muted)]`} aria-hidden="true" />
                    </div>
                  </button>

                  {isExpanded ? (
                    <div className="space-y-5 border-t border-[var(--border)] p-5">
                      {latest ? (
                        <>
                          <SubmissionDetails submission={latest} />
                          {latest.canReview ? (
                            <ReviewForm
                              submission={latest}
                              isSubmitting={isSubmitting}
                              onSubmit={(decision, remarks) => submitReview(latest, decision, remarks)}
                            />
                          ) : null}
                        </>
                      ) : (
                        <p className="text-sm text-[var(--muted)]">
                          {defense.defensePassed
                            ? 'The group has not submitted their compliance yet. You will be notified when they do.'
                            : 'This defense did not pass, so no compliance is expected for it.'}
                        </p>
                      )}

                      {earlier.length ? (
                        <details className="rounded-xl border border-[var(--border)] p-4">
                          <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">
                            Earlier versions ({earlier.length})
                          </summary>
                          <div className="mt-4 space-y-6">
                            {earlier.map((submission) => (
                              <SubmissionDetails key={submission.id} submission={submission} />
                            ))}
                          </div>
                        </details>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
