'use client';

import type { CSSProperties } from 'react';
import type {
  AdviserReportsModule,
  CompletedProjectRecord,
  ReportDateRange,
  ReportStatusFilter,
  ReportType
} from '@/components/adviser/shared/data/report-workspace-data';
import { formatReportDate } from '@/components/adviser/shared/data/report-workspace-data';
import { DashCard, StatusDonut } from '@/components/adviser/shared/config/dashboard-sections';
import { DASH_COLORS } from '@/components/adviser/shared/config/dashboard-types';

const toneStyle = (color: string) => ({ '--tone': color }) as CSSProperties;

/* Same blue-ramp meanings as the rest of the adviser module (stronger blue = healthier). */
const PROGRESS_INDICATOR_TONE: Record<string, string> = {
  'on-track': DASH_COLORS.series,
  'at-risk': DASH_COLORS.warning,
  delayed: DASH_COLORS.critical
};

const SUPERVISION_LEVEL_TONE: Record<AdviserReportsModule['supervisionSummary']['supervisionLevel'], string> = {
  Light: DASH_COLORS.good,
  Moderate: DASH_COLORS.series,
  High: DASH_COLORS.warning
};

/* ---------- Toolbar ---------- */

export function ReportToolbar({
  dateRange,
  reportType,
  status,
  dateOptions,
  reportTypeOptions,
  statusOptions,
  hasActiveFilters,
  onDateRangeChange,
  onReportTypeChange,
  onStatusChange,
  onClearFilters,
  onExport
}: {
  dateRange: ReportDateRange;
  reportType: ReportType;
  status: ReportStatusFilter;
  dateOptions: Array<{ value: ReportDateRange; label: string }>;
  reportTypeOptions: Array<{ value: ReportType; label: string }>;
  statusOptions: Array<{ value: ReportStatusFilter; label: string }>;
  hasActiveFilters: boolean;
  onDateRangeChange: (value: ReportDateRange) => void;
  onReportTypeChange: (value: ReportType) => void;
  onStatusChange: (value: ReportStatusFilter) => void;
  onClearFilters: () => void;
  onExport: () => void;
}) {
  return (
    <section className="adviser-dash-card adviser-groups-panel" aria-label="Report scope">
      <div className="adviser-groups-toolbar adviser-report-toolbar">
        {/* Report type is really "which sections to show", so it reads best as tabs. */}
        <div className="adviser-groups-segmented" role="group" aria-label="Report sections">
          {reportTypeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={reportType === option.value}
              className={reportType === option.value ? 'is-active' : undefined}
              onClick={() => onReportTypeChange(option.value)}
            >
              {option.value === 'all' ? 'All' : option.label.replace(/ (Summary|Overview)$/, '')}
            </button>
          ))}
        </div>
        <select
          className="adviser-groups-control is-select"
          aria-label="Date range"
          value={dateRange}
          onChange={(event) => onDateRangeChange(event.target.value as ReportDateRange)}
        >
          {dateOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <select
          className="adviser-groups-control is-select"
          aria-label="Record status"
          value={status}
          onChange={(event) => onStatusChange(event.target.value as ReportStatusFilter)}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <div className="adviser-groups-toolbar-end">
          {hasActiveFilters ? (
            <button type="button" className="adviser-subs-clear" onClick={onClearFilters}>
              <i aria-hidden="true" className="fas fa-xmark"></i>
              Clear
            </button>
          ) : null}
          <button type="button" className="adviser-subs-review" onClick={onExport}>
            <i aria-hidden="true" className="fas fa-file-csv"></i>
            Export CSV
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------- Shared bits ---------- */

function FactList({ facts }: { facts: Array<{ label: string; value: string | number; color?: string }> }) {
  return (
    <dl className="adviser-report-facts">
      {facts.map((fact) => (
        <div key={fact.label} style={fact.color ? toneStyle(fact.color) : undefined}>
          <dd>{fact.value}</dd>
          <dt>{fact.label}</dt>
        </div>
      ))}
    </dl>
  );
}

/* ---------- Sections ---------- */

export function ReportEvaluationCard({
  summary,
  pendingEvaluations
}: {
  summary: AdviserReportsModule['evaluationSummary'];
  pendingEvaluations: number;
}) {
  return (
    <DashCard title="Evaluations" meta={`${summary.totalReviewedGroups} reviewed`}>
      <div className="adviser-report-stack">
        <FactList
          facts={[
            { label: 'Average score', value: summary.scoredGroups ? `${summary.averageScore}%` : '—' },
            { label: 'Scored groups', value: `${summary.scoredGroups}/${summary.totalReviewedGroups}` },
            { label: 'Pending evaluations', value: pendingEvaluations, color: pendingEvaluations ? DASH_COLORS.warning : DASH_COLORS.good }
          ]}
        />
        <StatusDonut
          slices={[
            { key: 'passed', label: 'Passed', value: summary.passedGroups, color: DASH_COLORS.good },
            { key: 'revision', label: 'With revision', value: summary.withRevision, color: DASH_COLORS.warning },
            { key: 'failed', label: 'Failed', value: summary.failedGroups, color: DASH_COLORS.critical }
          ]}
          totalLabel="outcomes"
          emptyMessage="No evaluation outcomes in this scope."
        />
      </div>
    </DashCard>
  );
}

export function ReportProgressCard({
  summary,
  awaitingFeedback
}: {
  summary: AdviserReportsModule['progressSummary'];
  awaitingFeedback: number | null;
}) {
  return (
    <DashCard title="Progress">
      <div className="adviser-report-stack">
        <div className="adviser-gdm-progress adviser-report-progress">
          <strong>{summary.averageCompletion}%</strong>
          <div>
            <span className="adviser-dash-groups-track adviser-pdr-track">
              <span style={{ width: `${summary.averageCompletion}%`, background: DASH_COLORS.series }} />
            </span>
            <small>Average completion across the groups in scope</small>
          </div>
        </div>
        <ul className="adviser-dash-bars adviser-report-bars">
          {summary.indicators.map((indicator) => {
            const color = PROGRESS_INDICATOR_TONE[indicator.id] ?? DASH_COLORS.series;
            return (
              <li key={indicator.id} className={indicator.count ? undefined : 'is-zero'}>
                <div className="adviser-dash-bars-head">
                  <span>
                    <span className="adviser-dash-swatch" style={{ background: color }} aria-hidden="true" />
                    {indicator.label}
                  </span>
                  <strong>
                    {indicator.count} <small>· {indicator.percentage}%</small>
                  </strong>
                </div>
                <span className="adviser-dash-bars-track">
                  {indicator.count ? <span style={{ width: `${indicator.percentage}%`, background: color }} /> : null}
                </span>
              </li>
            );
          })}
        </ul>
        {awaitingFeedback !== null ? (
          <p className="adviser-report-note">
            <i className="fas fa-comment-dots" aria-hidden="true" />
            {awaitingFeedback} progress report{awaitingFeedback === 1 ? '' : 's'} awaiting your feedback
          </p>
        ) : null}
      </div>
    </DashCard>
  );
}

export function ReportSupervisionCard({ summary }: { summary: AdviserReportsModule['supervisionSummary'] }) {
  const levelColor = SUPERVISION_LEVEL_TONE[summary.supervisionLevel];

  return (
    <DashCard title="Supervision load">
      <div className="adviser-report-stack">
        <p className="adviser-report-level" style={toneStyle(levelColor)}>
          <span className="adviser-dash-status">
            <span className="adviser-dash-swatch" style={{ background: levelColor }} aria-hidden="true" />
            {summary.supervisionLevel}
          </span>
          {summary.helperText}
        </p>
        <FactList
          facts={[
            { label: 'Groups handled', value: summary.totalGroupsHandled },
            { label: 'Upcoming defenses', value: summary.upcomingDefenses },
            { label: 'Evaluations this week', value: summary.evaluationsThisWeek }
          ]}
        />
      </div>
    </DashCard>
  );
}

export function ReportCompletedProjects({
  projects,
  viewAllHref
}: {
  projects: CompletedProjectRecord[];
  viewAllHref: string;
}) {
  return (
    <section className="adviser-dash-card adviser-groups-panel" aria-labelledby="adviser-report-completed-title">
      <header className="adviser-queue-head">
        <h2 id="adviser-report-completed-title">Completed projects</h2>
        <span className="adviser-dash-count">{projects.length}</span>
        <a className="adviser-gdm-link adviser-report-viewall" href={viewAllHref}>
          Open archive
          <i className="fas fa-arrow-right" aria-hidden="true" />
        </a>
      </header>
      {projects.length ? (
        <ul className="adviser-subs-list adviser-report-completed">
          <li className="adviser-report-row is-head" aria-hidden="true">
            <span>Project</span>
            <span>Final score</span>
            <span>Recommendation</span>
            <span>Completed</span>
          </li>
          {projects.map((project) => (
            <li key={project.id} className="adviser-report-row">
              <div className="adviser-subs-main">
                <strong title={project.projectTitle}>{project.projectTitle}</strong>
                <small>
                  <span className="adviser-subs-code">{project.groupId}</span>
                </small>
              </div>
              <strong className="adviser-report-score">{project.finalScore !== null ? `${project.finalScore}%` : '—'}</strong>
              <span className="adviser-report-text" title={project.recommendation}>{project.recommendation}</span>
              <span className="adviser-report-text">{formatReportDate(project.completedAt)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="adviser-subs-empty">
          <span aria-hidden="true">
            <i className="fas fa-folder-open" />
          </span>
          <p>No completed projects in this scope.</p>
        </div>
      )}
    </section>
  );
}
