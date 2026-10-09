'use client';

import Link from 'next/link';
import { useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { AdviserProgressReportsPanel } from '@/components/adviser/adviser-mode/adviser-groups';
import type {
  AdviserProgressRecord,
  ProgressMilestone,
  ProgressSortOption,
  ProgressStatus
} from '@/components/adviser/adviser-mode/data/progress-workspace-data';
import {
  IT_PROGRESS_MILESTONES,
  formatProgressDate,
  getAttentionReason,
  getDeadlineLabel,
  getLastUpdateLabel,
  getProgressStatusMeta
} from '@/components/adviser/adviser-mode/data/progress-workspace-data';
import { DASH_COLORS } from '@/components/adviser/shared/config/dashboard-types';

/* Same blue-ramp meanings as the rest of the adviser module (stronger blue = healthier). */
export const PROGRESS_STATUS_TONE: Record<ProgressStatus, string> = {
  completed: DASH_COLORS.good,
  'on-track': DASH_COLORS.series,
  'at-risk': DASH_COLORS.warning,
  delayed: DASH_COLORS.critical
};

const toneStyle = (color: string) => ({ '--tone': color }) as CSSProperties;

/* ---------- Milestone pipeline ---------- */

export function MilestonePipeline({
  records,
  averageProgress,
  activeMilestone,
  onSelect
}: {
  records: AdviserProgressRecord[];
  averageProgress: number;
  activeMilestone: ProgressMilestone | 'all';
  onSelect: (milestone: ProgressMilestone | 'all') => void;
}) {
  return (
    <section className="adviser-dash-card adviser-pipeline" aria-labelledby="adviser-pipeline-title">
      <header className="adviser-queue-head">
        <h2 id="adviser-pipeline-title">Project Stages pipeline</h2>
        <span className="adviser-pipeline-meta">Average progress {averageProgress}%</span>
      </header>
      {/* One chip per stage: name + group count. Doubles as the milestone filter. */}
      <ol className="adviser-pipeline-stages">
        {IT_PROGRESS_MILESTONES.map((stage) => {
          const count = records.filter((record) => record.currentMilestone === stage).length;
          const isActive = activeMilestone === stage;

          return (
            <li key={stage}>
              <button
                type="button"
                aria-pressed={isActive}
                aria-label={`${stage}: ${count} group${count === 1 ? '' : 's'}`}
                className={`${isActive ? 'is-active' : ''} ${count ? 'has-groups' : ''}`.trim() || undefined}
                title={isActive ? 'Show all stages' : `Show groups in ${stage}`}
                onClick={() => onSelect(isActive ? 'all' : stage)}
              >
                <span className="adviser-pipeline-label">{stage}</span>
                <strong>{count}</strong>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ---------- Toolbar ---------- */

export function ProgressToolbar({
  statusFilter,
  statusOptions,
  onStatusChange,
  searchValue,
  sortBy,
  sortOptions,
  resultCount,
  totalCount,
  hasFilters,
  onSearchChange,
  onSortChange,
  onClear
}: {
  statusFilter: ProgressStatus | 'all';
  statusOptions: ReadonlyArray<{ value: ProgressStatus | 'all'; label: string; count: number }>;
  onStatusChange: (value: ProgressStatus | 'all') => void;
  searchValue: string;
  sortBy: ProgressSortOption;
  sortOptions: ReadonlyArray<{ value: ProgressSortOption; label: string }>;
  resultCount: number;
  totalCount: number;
  hasFilters: boolean;
  onSearchChange: (value: string) => void;
  onSortChange: (value: ProgressSortOption) => void;
  onClear: () => void;
}) {
  return (
    <div className="adviser-groups-toolbar">
      {/* Status filter with counts; replaces the old row of stat cards. */}
      <div className="adviser-groups-segmented" role="group" aria-label="Filter by status">
        {statusOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={statusFilter === option.value}
            className={statusFilter === option.value ? 'is-active' : undefined}
            onClick={() => onStatusChange(option.value)}
          >
            {option.label}
            <span className="adviser-groups-count">{option.count}</span>
          </button>
        ))}
      </div>
      <label className="adviser-groups-search">
        <i aria-hidden="true" className="fas fa-search"></i>
        <input
          type="search"
          placeholder="Search groups or project titles"
          aria-label="Search groups"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          className="adviser-groups-control"
        />
      </label>
      <select
        className="adviser-groups-control is-select"
        aria-label="Sort groups"
        value={sortBy}
        onChange={(event) => onSortChange(event.target.value as ProgressSortOption)}
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>Sort: {option.label}</option>
        ))}
      </select>
      <div className="adviser-groups-toolbar-end">
        {/* The Groups tile already shows the total; only show a count while filters narrow the list. */}
        {resultCount !== totalCount ? (
          <span className="adviser-groups-result">
            {resultCount} of {totalCount}
          </span>
        ) : null}
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

/* ---------- Group rows ---------- */

export function ProgressGroupList({ records, onOpen }: { records: AdviserProgressRecord[]; onOpen: (record: AdviserProgressRecord) => void }) {
  if (!records.length) {
    return (
      <div className="adviser-subs-empty">
        <span aria-hidden="true">
          <i className="fas fa-chart-line" />
        </span>
        <p>No groups match these filters.</p>
      </div>
    );
  }

  return (
    <ul className="adviser-subs-list">
      <li className="adviser-progress-row is-head" aria-hidden="true">
        <span>Group</span>
        <span>Project Stage</span>
        <span>Progress</span>
        <span>Status</span>
        <span />
      </li>
      {records.map((record) => (
        <ProgressGroupRow key={record.id} record={record} onOpen={onOpen} />
      ))}
    </ul>
  );
}

function ProgressGroupRow({ record, onOpen }: { record: AdviserProgressRecord; onOpen: (record: AdviserProgressRecord) => void }) {
  const color = PROGRESS_STATUS_TONE[record.status];
  const statusLabel = getProgressStatusMeta(record.status).label;
  const stageIndex = IT_PROGRESS_MILESTONES.indexOf(record.currentMilestone);
  const needsAttention = record.status === 'at-risk' || record.status === 'delayed';

  return (
    <li
      className="adviser-progress-row is-clickable"
      style={toneStyle(color)}
      tabIndex={0}
      aria-label={`${record.projectTitle}, ${record.groupId}, ${statusLabel}. Open progress details.`}
      onClick={() => onOpen(record)}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onOpen(record);
        }
      }}
    >
      <div className="adviser-subs-main">
        <strong title={record.projectTitle}>{record.projectTitle}</strong>
        <small>
          <span className="adviser-subs-code">{record.groupId}</span>
          {getLastUpdateLabel(record.lastUpdate)}
        </small>
        {needsAttention ? (
          <small className="adviser-subs-note">
            <i aria-hidden="true" className="fas fa-flag" />
            {getAttentionReason(record)}
          </small>
        ) : null}
      </div>

      <div className="adviser-progress-stage">
        <span className="adviser-progress-dots" aria-hidden="true">
          {IT_PROGRESS_MILESTONES.map((stage, index) => (
            <span
              key={stage}
              className={
                record.status === 'completed' || index < stageIndex ? 'is-done' : index === stageIndex ? 'is-current' : undefined
              }
            />
          ))}
        </span>
        <span>{record.currentMilestone}</span>
        <small title={record.deadline ? formatProgressDate(record.deadline) : undefined}>{getDeadlineLabel(record.deadline)}</small>
      </div>

      <div className="adviser-progress-cell">
        <div className="adviser-progress-meter" role="img" aria-label={`${record.progress}% complete`}>
          <span className="adviser-dash-groups-track">
            <span style={{ width: `${Math.min(100, Math.max(0, record.progress))}%`, background: color }} />
          </span>
          <strong>{record.progress}%</strong>
        </div>
        {record.checkpointSummary ? <small>{record.checkpointSummary}</small> : null}
      </div>

      <span className="adviser-dash-status">
        <span className="adviser-dash-swatch" style={{ background: color }} aria-hidden="true" />
        {statusLabel}
      </span>

      <div className="adviser-subs-actions">
        <button
          type="button"
          className={`adviser-subs-review${needsAttention ? '' : ' is-quiet'}`}
          onClick={(event) => {
            event.stopPropagation();
            onOpen(record);
          }}
        >
          Details
          <i aria-hidden="true" className="fas fa-arrow-right" />
        </button>
      </div>
    </li>
  );
}

/* ---------- Progress reports summary ---------- */

export function ProgressReportsSummary({
  filedThisWeek,
  awaitingFeedback,
  totalFiled
}: {
  filedThisWeek: number;
  awaitingFeedback: number;
  totalFiled: number;
}) {
  const facts = [
    { label: 'Filed this week', value: filedThisWeek, color: DASH_COLORS.series },
    { label: 'Awaiting your feedback', value: awaitingFeedback, color: awaitingFeedback ? DASH_COLORS.warning : DASH_COLORS.good },
    { label: 'Total filed', value: totalFiled, color: DASH_COLORS.neutral }
  ];

  return (
    <section className="adviser-dash-card adviser-reports-summary" aria-labelledby="adviser-reports-summary-title">
      <header className="adviser-queue-head">
        <h2 id="adviser-reports-summary-title">Progress reports</h2>
      </header>
      <dl>
        {facts.map((fact) => (
          <div key={fact.label} style={toneStyle(fact.color)}>
            <dd>{fact.value}</dd>
            <dt>{fact.label}</dt>
          </div>
        ))}
      </dl>
      <p className="adviser-reports-summary-hint">Open a group&apos;s details to read its reports and leave feedback.</p>
    </section>
  );
}

/* ---------- Group progress drawer ---------- */

type MilestoneStage = {
  id: string;
  title: string;
  sequence: number;
  status: string;
  dueAt: string | null;
  completedAt: string | null;
  totalCheckpoints: number;
  completedCheckpoints: number;
};

function useProjectMilestones(projectId: string | null) {
  const [state, setState] = useState<{ loading: boolean; error: string | null; milestones: MilestoneStage[] }>({
    loading: Boolean(projectId),
    error: null,
    milestones: []
  });

  useEffect(() => {
    if (!projectId) {
      setState({ loading: false, error: null, milestones: [] });
      return;
    }

    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: null }));

    fetch(`/api/projects/${encodeURIComponent(projectId)}/milestones`, { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.message || 'Unable to load project stages.');
        if (!cancelled) setState({ loading: false, error: null, milestones: payload?.milestones || [] });
      })
      .catch((error) => {
        if (!cancelled) setState({ loading: false, error: error instanceof Error ? error.message : 'Unable to load project stages.', milestones: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return state;
}

function getStageState(stage: MilestoneStage) {
  const done = stage.status === 'COMPLETED' || stage.status === 'APPROVED' || (stage.totalCheckpoints > 0 && stage.completedCheckpoints === stage.totalCheckpoints);
  if (done) return { key: 'done', label: stage.completedAt ? `Completed ${formatProgressDate(stage.completedAt)}` : 'Completed', color: DASH_COLORS.good };

  const overdue = Boolean(stage.dueAt) && new Date(stage.dueAt as string).getTime() < Date.now();
  if (overdue) return { key: 'overdue', label: `Overdue since ${formatProgressDate(stage.dueAt as string)}`, color: DASH_COLORS.critical };
  if (stage.status === 'NEEDS_REVISION') return { key: 'revision', label: 'Revision requested', color: DASH_COLORS.critical };

  const started = stage.completedCheckpoints > 0 || ['IN_PROGRESS', 'SUBMITTED'].includes(stage.status);
  if (started) return { key: 'current', label: stage.dueAt ? `Due ${formatProgressDate(stage.dueAt)}` : 'In progress', color: DASH_COLORS.series };

  return { key: 'upcoming', label: stage.dueAt ? `Due ${formatProgressDate(stage.dueAt)}` : 'Not started', color: DASH_COLORS.neutral };
}

export function ProgressDetailDrawer({
  record,
  submissionsHref,
  onClose
}: {
  record: AdviserProgressRecord;
  submissionsHref: string;
  onClose: () => void;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const milestones = useProjectMilestones(record.projectId);
  const color = PROGRESS_STATUS_TONE[record.status];

  useEffect(() => {
    setIsMounted(true);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.removeProperty('overflow');
    };
  }, [onClose]);

  if (!isMounted) return null;

  return createPortal(
    <div className="adviser-pdr-overlay" onClick={onClose}>
      <aside
        className="adviser-pdr"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adviser-pdr-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="adviser-gdm-header">
          <div className="adviser-tdm-heading">
            <h2 id="adviser-pdr-title" title={record.projectTitle}>{record.projectTitle}</h2>
            <p className="adviser-tdm-meta">
              <span className="adviser-tdm-code">{record.groupId}</span>
              <span>{record.stageTitle || record.currentMilestone}</span>
              <span>{getLastUpdateLabel(record.lastUpdate)}</span>
            </p>
          </div>
          <button type="button" className="adviser-tdm-close" aria-label="Close" onClick={onClose}>
            <i className="fas fa-xmark" aria-hidden="true" />
          </button>
        </header>

        <div className="adviser-gdm-body">
          <section className="adviser-gdm-section">
            <div className="adviser-gdm-section-head">
              <h3>Overall progress</h3>
              <span className="adviser-tdm-status" style={toneStyle(color)}>
                <span aria-hidden="true" />
                {getProgressStatusMeta(record.status).label}
              </span>
            </div>
            <div className="adviser-gdm-progress">
              <strong>{record.progress}%</strong>
              <div>
                <span className="adviser-dash-groups-track adviser-pdr-track">
                  <span style={{ width: `${Math.min(100, Math.max(0, record.progress))}%`, background: color }} />
                </span>
                <small>{record.checkpointSummary || 'No checkpoints completed yet'}</small>
              </div>
            </div>
            {record.status === 'at-risk' || record.status === 'delayed' ? (
              <p className="adviser-subs-note adviser-pdr-reason">
                <i aria-hidden="true" className="fas fa-flag" />
                {getAttentionReason(record)}
              </p>
            ) : null}
          </section>

          <section className="adviser-gdm-section">
            <div className="adviser-gdm-section-head">
              <h3>Stages</h3>
              <Link href={submissionsHref} className="adviser-gdm-link">
                Review submissions
                <i className="fas fa-arrow-right" aria-hidden="true" />
              </Link>
            </div>
            {!record.projectId ? (
              <p className="adviser-gdm-hint">This group has no project yet, so there are no stages to track.</p>
            ) : milestones.loading ? (
              <p className="adviser-gdm-hint">Loading stages…</p>
            ) : milestones.error ? (
              <p className="adviser-gdm-error">{milestones.error}</p>
            ) : (
              <ol className="adviser-pdr-stages">
                {milestones.milestones.map((stage) => {
                  const state = getStageState(stage);
                  const share = stage.totalCheckpoints ? Math.round((stage.completedCheckpoints / stage.totalCheckpoints) * 100) : 0;
                  return (
                    <li key={stage.id} className={`is-${state.key}`} style={toneStyle(state.color)}>
                      <span className="adviser-pdr-marker" aria-hidden="true">
                        {state.key === 'done' ? <i className="fas fa-check" /> : stage.sequence}
                      </span>
                      <div className="adviser-pdr-stage">
                        <div className="adviser-pdr-stage-head">
                          <strong>{stage.title}</strong>
                          <span>
                            {stage.completedCheckpoints}/{stage.totalCheckpoints}
                          </span>
                        </div>
                        <span className="adviser-dash-groups-track adviser-pdr-track is-thin">
                          <span style={{ width: `${share}%`, background: state.color }} />
                        </span>
                        <small>{state.label}</small>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {record.projectId ? <AdviserProgressReportsPanel projectId={record.projectId} /> : null}
        </div>
      </aside>
    </div>,
    document.body
  );
}
