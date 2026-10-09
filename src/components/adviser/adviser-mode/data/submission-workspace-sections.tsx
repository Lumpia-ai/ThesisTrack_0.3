import Link from 'next/link';
import type { CSSProperties } from 'react';
import type {
  AdviserSubmissionRecord,
  SubmissionMilestone,
  SubmissionSortOption,
  SubmissionStatus,
  SubmissionType
} from '@/components/adviser/adviser-mode/data/submission-workspace-data';
import {
  SUBMISSION_SORT_OPTIONS,
  formatSubmissionDate,
  getDeadlineLabel,
  getReviewReferenceDate
} from '@/components/adviser/adviser-mode/data/submission-workspace-data';
import { DASH_COLORS } from '@/components/adviser/shared/config/dashboard-types';

/* One meaning per color, shared with the adviser dashboard (blue ramp: stronger = healthier). */
export const SUBMISSION_STATUS_TONE: Record<SubmissionStatus, { label: string; color: string }> = {
  'pending-review': { label: 'Pending review', color: DASH_COLORS.warning },
  'under-review': { label: 'Under review', color: DASH_COLORS.series },
  'needs-revision': { label: 'Revise', color: DASH_COLORS.critical },
  approved: { label: 'Cleared by Adviser', color: DASH_COLORS.good }
};

const toneStyle = (color: string) => ({ '--tone': color }) as CSSProperties;
const dayInMilliseconds = 1000 * 60 * 60 * 24;

function startOfUtcDay(value: string) {
  const date = new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function getDeadlineDelta(deadline: string | null) {
  if (!deadline) return Number.POSITIVE_INFINITY;
  return Math.round((startOfUtcDay(deadline) - startOfUtcDay(getReviewReferenceDate())) / dayInMilliseconds);
}

/** The due-date cue for a submission: one label, one icon, one tone. */
export function getDeadlineVisual(deadline: string | null, status: SubmissionStatus) {
  if (status === 'approved') return { label: 'Cleared', icon: 'fa-circle-check', color: DASH_COLORS.good };
  if (!deadline) return { label: 'No due date', icon: 'fa-calendar', color: DASH_COLORS.neutral };

  const delta = getDeadlineDelta(deadline);
  if (delta < 0) return { label: getDeadlineLabel(deadline), icon: 'fa-triangle-exclamation', color: DASH_COLORS.critical };
  if (delta <= 1) return { label: getDeadlineLabel(deadline), icon: 'fa-bell', color: DASH_COLORS.warning };
  return { label: getDeadlineLabel(deadline), icon: 'fa-calendar-day', color: DASH_COLORS.series };
}

function getFileIcon(extension: string) {
  const value = extension.toLowerCase();
  if (value === 'pdf') return 'fa-file-pdf';
  if (['doc', 'docx'].includes(value)) return 'fa-file-word';
  if (['ppt', 'pptx'].includes(value)) return 'fa-file-powerpoint';
  if (['xls', 'xlsx', 'csv'].includes(value)) return 'fa-file-excel';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(value)) return 'fa-file-image';
  return 'fa-file-lines';
}

function isDecidedOnTitlePage(submission: AdviserSubmissionRecord) {
  return submission.type === 'Title' || submission.type === 'Evidence' || submission.type === 'Backup';
}

/* ---------- Stat tiles ---------- */

export type SubmissionStat = {
  id: string;
  label: string;
  value: string | number;
  icon: string;
  color: string;
  helper?: string;
  /** The status this tile filters the list to when clicked; omit for informational tiles. */
  filterStatus?: SubmissionStatus;
};

export function SubmissionStats({
  stats,
  isLoading,
  activeStatus,
  onSelect
}: {
  stats: SubmissionStat[];
  isLoading?: boolean;
  activeStatus: SubmissionStatus | 'all';
  onSelect: (status: SubmissionStatus | 'all') => void;
}) {
  return (
    <section className="adviser-dash-hero is-five" aria-label="Review overview">
      {stats.map((stat) => {
        const content = (
          <>
            <span className="adviser-dash-hero-icon">
              <i aria-hidden="true" className={`fas ${stat.icon}`} />
            </span>
            <span className="adviser-dash-hero-copy">
              {isLoading ? <span className="adviser-subs-skeleton-value" aria-hidden="true" /> : <strong>{stat.value}</strong>}
              <small>{stat.label}</small>
            </span>
          </>
        );

        if (!stat.filterStatus) {
          return (
            <div key={stat.id} title={stat.helper} style={toneStyle(stat.color)}>
              {content}
            </div>
          );
        }

        const isActive = activeStatus === stat.filterStatus;
        const filterStatus = stat.filterStatus;
        return (
          <button
            key={stat.id}
            type="button"
            title={stat.helper ?? (isActive ? 'Show all submissions' : `Show only: ${stat.label.toLowerCase()}`)}
            aria-pressed={isActive}
            className={isActive ? 'is-active' : undefined}
            style={toneStyle(stat.color)}
            onClick={() => onSelect(isActive ? 'all' : filterStatus)}
          >
            {content}
          </button>
        );
      })}
    </section>
  );
}

/* ---------- Toolbar ---------- */

export function SubmissionToolbar({
  typeFilter,
  milestoneFilter,
  sortBy,
  searchValue,
  typeOptions,
  milestoneOptions,
  resultCount,
  totalCount,
  hasActiveFilters,
  onTypeChange,
  onMilestoneChange,
  onSortChange,
  onSearchChange,
  onClearFilters
}: {
  typeFilter: SubmissionType | 'all';
  milestoneFilter: SubmissionMilestone | 'all';
  sortBy: SubmissionSortOption;
  searchValue: string;
  typeOptions: SubmissionType[];
  milestoneOptions: SubmissionMilestone[];
  resultCount: number;
  totalCount: number;
  hasActiveFilters: boolean;
  onTypeChange: (value: SubmissionType | 'all') => void;
  onMilestoneChange: (value: SubmissionMilestone | 'all') => void;
  onSortChange: (value: SubmissionSortOption) => void;
  onSearchChange: (value: string) => void;
  onClearFilters: () => void;
}) {
  return (
    <div className="adviser-groups-toolbar">
      <label className="adviser-groups-search">
        <i aria-hidden="true" className="fas fa-search"></i>
        <input
          type="search"
          placeholder="Search groups, projects, or documents"
          aria-label="Search submissions"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          className="adviser-groups-control"
        />
      </label>

      <select
        className="adviser-groups-control is-select"
        aria-label="Filter by type"
        value={typeFilter}
        onChange={(event) => onTypeChange(event.target.value as SubmissionType | 'all')}
      >
        <option value="all">All types</option>
        {typeOptions.map((type) => (
          <option key={type} value={type}>{type}</option>
        ))}
      </select>

      <select
        className="adviser-groups-control is-select"
        aria-label="Filter by project stage"
        value={milestoneFilter}
        onChange={(event) => onMilestoneChange(event.target.value as SubmissionMilestone | 'all')}
      >
        <option value="all">All project stages</option>
        {milestoneOptions.map((milestone) => (
          <option key={milestone} value={milestone}>{milestone}</option>
        ))}
      </select>

      <select
        className="adviser-groups-control is-select"
        aria-label="Sort submissions"
        value={sortBy}
        onChange={(event) => onSortChange(event.target.value as SubmissionSortOption)}
      >
        {SUBMISSION_SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>Sort: {option.label}</option>
        ))}
      </select>

      <div className="adviser-groups-toolbar-end">
        <span className="adviser-groups-result">
          {resultCount === totalCount ? `${totalCount} submissions` : `${resultCount} of ${totalCount}`}
        </span>
        {hasActiveFilters ? (
          <button type="button" className="adviser-subs-clear" onClick={onClearFilters}>
            <i aria-hidden="true" className="fas fa-xmark"></i>
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* ---------- List ---------- */

export function SubmissionList({
  submissions,
  hasActiveFilters,
  isLoading,
  onClearFilters,
  onDownloadSubmission,
  onViewSubmission
}: {
  submissions: AdviserSubmissionRecord[];
  hasActiveFilters: boolean;
  isLoading?: boolean;
  onClearFilters: () => void;
  onViewSubmission: (submission: AdviserSubmissionRecord) => void;
  onDownloadSubmission: (submission: AdviserSubmissionRecord) => void;
}) {
  if (isLoading) {
    return (
      <ul className="adviser-subs-list" aria-hidden="true">
        {[0, 1, 2].map((item) => (
          <li key={item} className="adviser-subs-row is-skeleton" />
        ))}
      </ul>
    );
  }

  if (!submissions.length) {
    return (
      <div className="adviser-subs-empty">
        <span aria-hidden="true">
          <i className="fas fa-folder-open" />
        </span>
        <p>{hasActiveFilters ? 'No submissions match these filters.' : 'No submissions from your groups yet.'}</p>
        {hasActiveFilters ? (
          <button type="button" className="adviser-subs-clear" onClick={onClearFilters}>
            Clear filters
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <ul className="adviser-subs-list">
      <li className="adviser-subs-head" aria-hidden="true">
        <span />
        <span>Document</span>
        <span>Stage</span>
        <span>Status</span>
        <span />
      </li>
      {submissions.map((submission) => (
        <SubmissionRow
          key={submission.id}
          submission={submission}
          onDownloadSubmission={onDownloadSubmission}
          onViewSubmission={onViewSubmission}
        />
      ))}
    </ul>
  );
}

function SubmissionRow({
  submission,
  onDownloadSubmission,
  onViewSubmission
}: {
  submission: AdviserSubmissionRecord;
  onDownloadSubmission: (submission: AdviserSubmissionRecord) => void;
  onViewSubmission: (submission: AdviserSubmissionRecord) => void;
}) {
  const status = SUBMISSION_STATUS_TONE[submission.status];
  const deadline = getDeadlineVisual(submission.deadline, submission.status);
  const canDownload = Boolean(submission.previewFileId || submission.fileUrl);
  const note = submission.latestReviewComment?.body;

  return (
    <li
      className="adviser-subs-row"
      style={toneStyle(status.color)}
      tabIndex={0}
      aria-label={`${submission.submissionTitle}, ${submission.groupId}, ${submission.statusLabel}. Open.`}
      onClick={() => onViewSubmission(submission)}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onViewSubmission(submission);
        }
      }}
    >
      <span className="adviser-subs-file" aria-hidden="true">
        <i className={`fas ${getFileIcon(submission.fileExtension)}`} />
      </span>

      <div className="adviser-subs-main">
        <strong title={submission.submissionTitle}>{submission.submissionTitle}</strong>
        <small>
          <span className="adviser-subs-code">{submission.groupId}</span>
          {submission.projectTitle}
        </small>
        {note ? (
          <small className="adviser-subs-note" title={note}>
            <i aria-hidden="true" className="fas fa-comment-dots" />
            {note}
          </small>
        ) : null}
      </div>

      <div className="adviser-subs-stage">
        <span>{submission.milestone}</span>
        <small>
          {submission.type} · {submission.version} · {formatSubmissionDate(submission.submittedAt)}
        </small>
      </div>

      {/* Status and due date share one column; the due cue only appears while the item is still open. */}
      <div className="adviser-subs-status">
        <span className="adviser-dash-status">
          <span className="adviser-dash-swatch" style={{ background: status.color }} aria-hidden="true" />
          {submission.statusLabel}
        </span>
        {submission.status !== 'approved' && submission.deadline ? (
          <span className="adviser-subs-due" style={toneStyle(deadline.color)} title={formatSubmissionDate(submission.deadline)}>
            <i aria-hidden="true" className={`fas ${deadline.icon}`} />
            {deadline.label}
          </span>
        ) : null}
      </div>

      <div className="adviser-subs-actions">
        {canDownload ? (
          <button
            type="button"
            className="adviser-subs-icon-btn"
            aria-label={`Download ${submission.submissionTitle}`}
            title="Download"
            onClick={(event) => {
              event.stopPropagation();
              onDownloadSubmission(submission);
            }}
          >
            <i aria-hidden="true" className="fas fa-download" />
          </button>
        ) : (
          <span className="adviser-subs-icon-slot" aria-hidden="true" />
        )}
        <Link
          href={submission.workspaceHref}
          className={`adviser-subs-review${submission.status === 'approved' ? ' is-quiet' : ''}`}
          title={isDecidedOnTitlePage(submission) ? 'Approve or reject on Title & Evidence Approval' : 'Open the full review workspace'}
          onClick={(event) => event.stopPropagation()}
        >
          {submission.status === 'approved' ? 'Open' : isDecidedOnTitlePage(submission) ? 'Decide' : 'Review'}
          <i aria-hidden="true" className="fas fa-arrow-right" />
        </Link>
      </div>
    </li>
  );
}
