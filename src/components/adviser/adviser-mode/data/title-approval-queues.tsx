'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import {
  DEFENSE_APPLICATION_STAGES,
  OtherDocumentReviewModal,
  getEvidenceReviewMeta,
  getGroupPendingStageCount,
  type OtherDocumentsGroup
} from '@/components/adviser/adviser-mode/data/title-workspace-sections';
import {
  formatTitleDate,
  getSimilarityMeta,
  getTitleStatusMeta,
  type AdviserTitleRecord,
  type TitleSortOption,
  type TitleStatus
} from '@/components/adviser/adviser-mode/data/title-workspace-data';
import type { DocumentFileSummary } from '@/components/documents/document-file-controls';
import { getDocumentCategoryStage, getProjectFileCategoryLabel } from '@/components/students/student-project-files.shared';
import { DASH_COLORS } from '@/components/adviser/shared/config/dashboard-types';

/* Same blue-ramp meanings as the rest of the adviser module: stronger blue = healthier. */
export const TITLE_STATUS_TONE: Record<TitleStatus, string> = {
  pending: DASH_COLORS.warning,
  approved: DASH_COLORS.good,
  'needs-revision': DASH_COLORS.critical,
  rejected: DASH_COLORS.criticalStrong,
  draft: DASH_COLORS.neutral
};

const toneStyle = (color: string) => ({ '--tone': color }) as CSSProperties;

function evidenceTone(status?: string) {
  switch (status) {
    case 'COMPLETED':
    case 'APPROVED':
      return DASH_COLORS.good;
    case 'NEEDS_REVISION':
      return DASH_COLORS.critical;
    case 'REJECTED':
      return DASH_COLORS.criticalStrong;
    case 'SUBMITTED':
    case 'IN_REVIEW':
      return DASH_COLORS.warning;
    default:
      return DASH_COLORS.neutral;
  }
}

function StatusPill({ color, label }: { color: string; label: string }) {
  return (
    <span className="adviser-dash-status">
      <span className="adviser-dash-swatch" style={{ background: color }} aria-hidden="true" />
      {label}
    </span>
  );
}

/* ---------- Shared panel ---------- */

export function QueuePanel({
  id,
  title,
  count,
  toolbar,
  children
}: {
  id: string;
  title: string;
  count: number;
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="adviser-dash-card adviser-groups-panel adviser-queue" aria-labelledby={`${id}-title`}>
      <header className="adviser-queue-head">
        <h2 id={`${id}-title`}>{title}</h2>
        <span className="adviser-dash-count">{count}</span>
      </header>
      {toolbar}
      {children}
    </section>
  );
}

function QueueEmpty({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="adviser-subs-empty">
      <span aria-hidden="true">
        <i className={`fas ${icon}`} />
      </span>
      <p>{children}</p>
    </div>
  );
}

function QueueRow({
  color,
  label,
  onOpen,
  children
}: {
  color: string;
  label: string;
  onOpen: () => void;
  children: ReactNode;
}) {
  return (
    <li
      className="adviser-queue-row"
      style={toneStyle(color)}
      tabIndex={0}
      aria-label={label}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      {children}
    </li>
  );
}

function QueueAction({ label, icon = 'fa-arrow-right', onClick, disabled }: { label: string; icon?: string; onClick: () => void; disabled?: boolean }) {
  return (
    <div className="adviser-subs-actions">
      <button
        type="button"
        className="adviser-subs-review"
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
      >
        {label}
        <i aria-hidden="true" className={`fas ${icon}`} />
      </button>
    </div>
  );
}

/* ---------- Title proposals ---------- */

export const TITLE_STATUS_OPTIONS: ReadonlyArray<{ value: TitleStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Ready for Concept Presentation' },
  { value: 'needs-revision', label: 'Revise' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'draft', label: 'Draft' }
];

export function TitleToolbar({
  statusFilter,
  academicYearFilter,
  sortBy,
  searchValue,
  academicYearOptions,
  sortOptions,
  resultCount,
  totalCount,
  onStatusChange,
  onAcademicYearChange,
  onSortChange,
  onSearchChange,
  onClear
}: {
  statusFilter: TitleStatus | 'all';
  academicYearFilter: string;
  sortBy: TitleSortOption;
  searchValue: string;
  academicYearOptions: string[];
  sortOptions: ReadonlyArray<{ value: TitleSortOption; label: string }>;
  resultCount: number;
  totalCount: number;
  onStatusChange: (value: TitleStatus | 'all') => void;
  onAcademicYearChange: (value: string) => void;
  onSortChange: (value: TitleSortOption) => void;
  onSearchChange: (value: string) => void;
  onClear: () => void;
}) {
  const hasFilters = statusFilter !== 'all' || academicYearFilter !== 'all' || searchValue.trim() !== '' || sortBy !== 'newest';

  return (
    <div className="adviser-groups-toolbar">
      <label className="adviser-groups-search">
        <i aria-hidden="true" className="fas fa-search"></i>
        <input
          type="search"
          placeholder="Search title, group, or keyword"
          aria-label="Search title proposals"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          className="adviser-groups-control"
        />
      </label>

      <select
        className="adviser-groups-control is-select"
        aria-label="Filter by status"
        value={statusFilter}
        onChange={(event) => onStatusChange(event.target.value as TitleStatus | 'all')}
      >
        {TITLE_STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>

      <select
        className="adviser-groups-control is-select"
        aria-label="Filter by academic year"
        value={academicYearFilter}
        onChange={(event) => onAcademicYearChange(event.target.value)}
      >
        <option value="all">All academic years</option>
        {academicYearOptions.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>

      <select
        className="adviser-groups-control is-select"
        aria-label="Sort title proposals"
        value={sortBy}
        onChange={(event) => onSortChange(event.target.value as TitleSortOption)}
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>Sort: {option.label}</option>
        ))}
      </select>

      <div className="adviser-groups-toolbar-end">
        <span className="adviser-groups-result">
          {resultCount === totalCount ? `${totalCount} titles` : `${resultCount} of ${totalCount}`}
        </span>
        {hasFilters ? (
          <button type="button" className="adviser-subs-clear" onClick={onClear}>
            <i aria-hidden="true" className="fas fa-xmark"></i>
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function TitleQueue({
  titles,
  isLoading,
  onOpen
}: {
  titles: AdviserTitleRecord[];
  isLoading: boolean;
  onOpen: (record: AdviserTitleRecord) => void;
}) {
  if (isLoading) {
    return (
      <ul className="adviser-subs-list" aria-hidden="true">
        {[0, 1].map((item) => (
          <li key={item} className="adviser-subs-row is-skeleton" />
        ))}
      </ul>
    );
  }

  if (!titles.length) {
    return <QueueEmpty icon="fa-file-signature">No title proposals match these filters.</QueueEmpty>;
  }

  return (
    <ul className="adviser-subs-list">
      <li className="adviser-queue-row is-head" aria-hidden="true">
        <span />
        <span>Title proposal</span>
        <span>Similarity</span>
        <span>Status</span>
        <span />
      </li>
      {titles.map((record) => {
        const status = getTitleStatusMeta(record.status);
        const similarity = getSimilarityMeta(record.similarityScore, record.similarTitles);
        const color = TITLE_STATUS_TONE[record.status];

        return (
          <QueueRow
            key={record.id}
            color={color}
            label={`${record.title}, ${record.groupId}, ${status.label}. Open preview.`}
            onOpen={() => onOpen(record)}
          >
            <span className="adviser-subs-file" aria-hidden="true">
              <i className="fas fa-file-signature" />
            </span>
            <div className="adviser-subs-main">
              <strong title={record.title}>{record.title}</strong>
              <small>
                <span className="adviser-subs-code">{record.groupId}</span>
                {record.membersCount} members · {record.academicYear} · {formatTitleDate(record.submittedAt)}
              </small>
            </div>
            <div className="adviser-subs-stage">
              <span>{record.similarityScore}% match</span>
              <small>
                {record.similarTitles.length
                  ? `${similarity.label} · ${record.similarTitles.length} related`
                  : similarity.label}
              </small>
            </div>
            <StatusPill color={color} label={status.label} />
            <QueueAction label={record.status === 'pending' ? 'Decide' : 'Open'} onClick={() => onOpen(record)} />
          </QueueRow>
        );
      })}
    </ul>
  );
}

/* ---------- Defense application evidence ---------- */

export function getEvidenceQueue(titles: AdviserTitleRecord[]) {
  return titles.filter((record) => getGroupPendingStageCount(record) > 0);
}

export function EvidenceQueue({ records, onOpen }: { records: AdviserTitleRecord[]; onOpen: (record: AdviserTitleRecord) => void }) {
  return (
    <ul className="adviser-subs-list">
      {records.map((record) => {
        const pending = getGroupPendingStageCount(record);
        const stages = DEFENSE_APPLICATION_STAGES.filter((stage) => {
          if (stage.alwaysShow) return true;
          const review = record[stage.reviewField];
          return (review?.files?.length ?? 0) > 0 || (review ? review.status !== 'PENDING' : false);
        });

        return (
          <QueueRow
            key={record.id}
            color={DASH_COLORS.warning}
            label={`${record.groupId} evidence, ${pending} stage${pending === 1 ? '' : 's'} awaiting review. Open.`}
            onOpen={() => onOpen(record)}
          >
            <span className="adviser-subs-file" aria-hidden="true">
              <i className="fas fa-folder-open" />
            </span>
            <div className="adviser-subs-main">
              <strong title={record.title}>{record.title}</strong>
              <small>
                <span className="adviser-subs-code">{record.groupId}</span>
                Oral defense application evidence
              </small>
            </div>
            <div className="adviser-queue-chips">
              {stages.map((stage) => {
                const status = record[stage.reviewField]?.status;
                return (
                  <span key={stage.checkpointKey} className="adviser-queue-chip" style={toneStyle(evidenceTone(status))}>
                    <span className="adviser-dash-swatch" aria-hidden="true" />
                    {stage.stageLabel}: {getEvidenceReviewMeta(status, stage.stageLabel).label}
                  </span>
                );
              })}
            </div>
            <StatusPill color={DASH_COLORS.warning} label={`${pending} to review`} />
            <QueueAction label="Review" onClick={() => onOpen(record)} />
          </QueueRow>
        );
      })}
    </ul>
  );
}

/* ---------- Other pending documents ---------- */

export function OtherDocumentsQueue({
  groups,
  savingFileId,
  onDecide
}: {
  groups: OtherDocumentsGroup[];
  savingFileId: string | null;
  onDecide: (file: DocumentFileSummary, decision: 'approved' | 'needs_revision', remarks: string) => void;
}) {
  const [reviewing, setReviewing] = useState<DocumentFileSummary | null>(null);

  return (
    <>
      <ul className="adviser-subs-list">
        {groups.flatMap((group) =>
          group.files.map((file) => {
            const isSaving = savingFileId === file.id;
            return (
              <QueueRow
                key={file.id}
                color={DASH_COLORS.warning}
                label={`${file.fileName}, ${group.groupLabel}. Open to review.`}
                onOpen={() => setReviewing(file)}
              >
                <span className="adviser-subs-file" aria-hidden="true">
                  <i className="fas fa-file-lines" />
                </span>
                <div className="adviser-subs-main">
                  <strong title={file.fileName}>{file.fileName}</strong>
                  <small>
                    <span className="adviser-subs-code">{group.groupLabel}</span>
                    {group.projectTitle}
                  </small>
                </div>
                <div className="adviser-subs-stage">
                  <span>{getProjectFileCategoryLabel(file.documentCategory)}</span>
                  <small>{getDocumentCategoryStage(file.documentCategory)} stage · {formatTitleDate(String(file.createdAt))}</small>
                </div>
                <StatusPill color={DASH_COLORS.warning} label="Awaiting review" />
                <QueueAction
                  label={isSaving ? 'Saving' : 'Review'}
                  icon={isSaving ? 'fa-spinner fa-spin' : 'fa-arrow-right'}
                  disabled={isSaving}
                  onClick={() => setReviewing(file)}
                />
              </QueueRow>
            );
          })
        )}
      </ul>

      {reviewing ? (
        <OtherDocumentReviewModal
          file={reviewing}
          isSaving={savingFileId === reviewing.id}
          onClose={() => setReviewing(null)}
          onDecide={(decision, remarks) => {
            onDecide(reviewing, decision, remarks);
            setReviewing(null);
          }}
        />
      ) : null}
    </>
  );
}
