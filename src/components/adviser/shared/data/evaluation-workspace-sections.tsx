import { type CSSProperties, useEffect, useState } from 'react';
import { DASH_COLORS } from '@/components/adviser/shared/config/dashboard-types';
import { createPortal } from 'react-dom';
import type {
  EvaluationDateFilter,
  EvaluationRecommendation,
  EvaluationRecord,
  EvaluationStatus,
  EvaluationWorkspaceMode,
  StudentEvaluationRecommendation
} from '@/components/adviser/shared/data/evaluation-workspace-data';
import {
  EVALUATION_REFERENCE_DATE,
  calculateStudentEvaluationCount,
  calculateEvaluationScore,
  deriveStudentEvaluationRecommendation,
  formatEvaluationDate,
  formatEvaluationDateTime,
  getEvaluationStatusMeta,
  getRecommendationMeta,
  getStudentEvaluationRecommendationMeta,
  getStudentPreview
} from '@/components/adviser/shared/data/evaluation-workspace-data';

type EvaluationModalProps = {
  draft: EvaluationRecord | null;
  readOnly: boolean;
  workspaceMode: EvaluationWorkspaceMode;
  onAddCriterion: () => void;
  onClose: () => void;
  onCriterionLabelChange: (criterionId: string, value: string) => void;
  onCriterionMaxScoreChange: (criterionId: string, value: number) => void;
  onCriterionScoreChange: (criterionId: string, value: number) => void;
  onCriterionCommentChange: (criterionId: string, value: string) => void;
  onStudentCriterionScoreChange: (studentId: string, criterionId: string, value: number) => void;
  onStudentCommentChange: (studentId: string, value: string) => void;
  onStudentRecommendationChange: (studentId: string, value: StudentEvaluationRecommendation) => void;
  onOverallCommentsChange: (value: string) => void;
  onRecommendationChange: (value: EvaluationRecommendation) => void;
  onSubmit: () => void;
};

function getDepartmentBadgeClass(department: string) {
  if (department === 'IT') {
    return 'bg-[rgba(0,58,143,0.08)] text-[var(--primary)] ring-1 ring-inset ring-[rgba(0,58,143,0.10)]';
  }

  if (department === 'MET') {
    return 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200';
  }

  if (department === 'TCM') {
    return 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200';
  }

  return 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200';
}

function getStartOfUtcDay(value: string) {
  const date = new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function getScheduleMeta(defenseDate: string) {
  const dayDifference = Math.round(
    (getStartOfUtcDay(defenseDate) - getStartOfUtcDay(EVALUATION_REFERENCE_DATE)) / (1000 * 60 * 60 * 24)
  );

  if (dayDifference === 0) {
    return {
      label: 'Today',
      className: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200'
    };
  }

  if (dayDifference === 1) {
    return {
      label: 'Tomorrow',
      className: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200'
    };
  }

  if (dayDifference > 1) {
    return {
      label: `In ${dayDifference} days`,
      className: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
    };
  }

  if (dayDifference === -1) {
    return {
      label: '1 day ago',
      className: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200'
    };
  }

  return {
    label: `${Math.abs(dayDifference)} days ago`,
    className: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200'
  };
}

function getProgressWidth(score: number, maxScore: number) {
  if (!maxScore) {
    return '0%';
  }

  return `${Math.round((score / maxScore) * 100)}%`;
}

function getInitials(name: string) {
  const parts = name
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || 'ST';
}

function getStudentReviewState(studentEvaluation: EvaluationRecord['studentEvaluations'][number]) {
  if (studentEvaluation.score !== null) {
    return {
      label: 'Finalized',
      className: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
    };
  }

  return {
    label: 'Draft',
    className: 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200'
  };
}

export function ScoreBadge({
  score,
  recommendation,
  detail
}: {
  score: number | null;
  recommendation: EvaluationRecommendation;
  detail?: string;
}) {
  const recommendationMeta = getRecommendationMeta(recommendation);
  const badgeClassName = recommendationMeta?.className ?? 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200';

  return (
    <div className="flex items-center gap-3">
      {score !== null ? (
        (() => {
          const circumference = 2 * Math.PI * 16;
          const offset = circumference - (score / 100) * circumference;
          const scoreColor = score >= 90 ? '#059669' : score >= 75 ? '#0369a1' : '#d97706';
          return (
            <div className="relative h-11 w-11 shrink-0">
              <svg className="-rotate-90" viewBox="0 0 36 36" width="44" height="44">
                <circle cx="18" cy="18" r="16" fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
                <circle cx="18" cy="18" r="16" fill="none" stroke={scoreColor} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.7s ease' }} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-[var(--text-dark)]">{score}%</span>
            </div>
          );
        })()
      ) : (
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${badgeClassName}`}>
          <i className="fas fa-gavel text-sm" />
        </div>
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <span className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badgeClassName}`}>
          {recommendation}
        </span>
        {detail ? <span className="text-[11px] leading-4 text-[var(--text-light)]">{detail}</span> : null}
      </div>
    </div>
  );
}

/* Same blue-ramp meanings as the rest of the adviser module (stronger blue = healthier). */
export const EVALUATION_STATUS_TONE: Record<EvaluationStatus, string> = {
  completed: DASH_COLORS.good,
  scheduled: DASH_COLORS.series,
  pending: DASH_COLORS.warning,
  overdue: DASH_COLORS.critical
};

const evaluationToneStyle = (color: string) => ({ '--tone': color }) as CSSProperties;

export function EvaluationToolbar({
  statusFilter,
  statusOptions,
  dateFilter,
  dateOptions,
  searchValue,
  resultCount,
  totalCount,
  onStatusChange,
  onDateChange,
  onSearchChange,
  onClear
}: {
  statusFilter: EvaluationStatus | 'all';
  statusOptions: ReadonlyArray<{ value: EvaluationStatus | 'all'; label: string; count: number }>;
  dateFilter: EvaluationDateFilter;
  dateOptions: ReadonlyArray<{ value: EvaluationDateFilter; label: string }>;
  searchValue: string;
  resultCount: number;
  totalCount: number;
  onStatusChange: (value: EvaluationStatus | 'all') => void;
  onDateChange: (value: EvaluationDateFilter) => void;
  onSearchChange: (value: string) => void;
  onClear: () => void;
}) {
  const hasFilters = statusFilter !== 'all' || dateFilter !== 'all' || searchValue.trim() !== '';

  return (
    <div className="adviser-groups-toolbar">
      {/* Status filter with counts; replaces the old summary cards. */}
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
          placeholder="Search project, group, or student"
          aria-label="Search evaluations"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          className="adviser-groups-control"
        />
      </label>
      <select
        className="adviser-groups-control is-select"
        aria-label="Filter by defense date"
        value={dateFilter}
        onChange={(event) => onDateChange(event.target.value as EvaluationDateFilter)}
      >
        {dateOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <div className="adviser-groups-toolbar-end">
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

export function EvaluationList({
  records,
  onEvaluate,
  onViewScore
}: {
  records: EvaluationRecord[];
  onEvaluate: (record: EvaluationRecord) => void;
  onViewScore: (record: EvaluationRecord) => void;
}) {
  if (!records.length) {
    return (
      <div className="adviser-subs-empty">
        <span aria-hidden="true">
          <i className="fas fa-clipboard-check" />
        </span>
        <p>No evaluations match these filters.</p>
      </div>
    );
  }

  return (
    <ul className="adviser-subs-list">
      <li className="adviser-eval-row is-head" aria-hidden="true">
        <span>Project</span>
        <span>Defense</span>
        <span>Status</span>
        <span>Result</span>
        <span />
      </li>
      {records.map((record) => {
        const color = EVALUATION_STATUS_TONE[record.status];
        const isCompleted = record.status === 'completed';
        const schedule = getScheduleMeta(record.defenseDate);
        const open = () => (isCompleted ? onViewScore(record) : onEvaluate(record));

        return (
          <li
            key={record.id}
            className="adviser-eval-row"
            style={evaluationToneStyle(color)}
            tabIndex={0}
            aria-label={`${record.projectTitle}, ${record.groupId}, ${getEvaluationStatusMeta(record.status).label}.`}
            onClick={open}
            onKeyDown={(event) => {
              if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault();
                open();
              }
            }}
          >
            <div className="adviser-subs-main">
              <strong title={record.projectTitle}>{record.projectTitle}</strong>
              <small>
                <span className="adviser-subs-code">{record.groupId}</span>
                {getStudentPreview(record.students, 3)}
              </small>
            </div>

            <div className="adviser-subs-stage">
              <span>{formatEvaluationDateTime(record.defenseDate)}</span>
              <small>{schedule.label}</small>
            </div>

            <span className="adviser-dash-status">
              <span className="adviser-dash-swatch" style={{ background: color }} aria-hidden="true" />
              {getEvaluationStatusMeta(record.status).label}
            </span>

            <div className="adviser-eval-result">
              {isCompleted && record.recommendation ? (
                <>
                  <strong>{record.score !== null ? `${record.score}%` : '—'}</strong>
                  <small>
                    {record.recommendation} · {calculateStudentEvaluationCount(record)}/{record.studentEvaluations.length} students
                  </small>
                </>
              ) : (
                <small>Not submitted</small>
              )}
            </div>

            <div className="adviser-subs-actions">
              <button
                type="button"
                className={`adviser-subs-review${isCompleted ? ' is-quiet' : ''}`}
                onClick={(event) => {
                  event.stopPropagation();
                  open();
                }}
              >
                {isCompleted ? 'View' : 'Evaluate'}
                <i aria-hidden="true" className="fas fa-arrow-right" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function EvaluationModal({
  draft,
  readOnly,
  workspaceMode,
  onAddCriterion,
  onClose,
  onCriterionLabelChange,
  onCriterionMaxScoreChange,
  onCriterionScoreChange,
  onCriterionCommentChange,
  onStudentCriterionScoreChange,
  onStudentCommentChange,
  onStudentRecommendationChange,
  onOverallCommentsChange,
  onRecommendationChange,
  onSubmit
}: EvaluationModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (draft) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [!!draft]);

  if (!draft || !mounted) {
    return null;
  }

  const liveScore = calculateEvaluationScore(draft.rubric);
  const recommendation = draft.recommendation ?? 'With Revision';
  const statusMeta = getEvaluationStatusMeta(draft.status);
  const canCustomizeRubric = workspaceMode === 'adviser' && !readOnly;
  const reviewedStudentCount = calculateStudentEvaluationCount(draft);
  const scheduleMeta = getScheduleMeta(draft.defenseDate);
  const liveStudentAverage = draft.studentEvaluations.length
    ? Math.round(
        draft.studentEvaluations.reduce(
          (sum, studentEvaluation) => sum + calculateEvaluationScore(studentEvaluation.rubric),
          0
        ) / draft.studentEvaluations.length
      )
    : 0;
  const submissionLabel = draft.submittedAt ? formatEvaluationDateTime(draft.submittedAt) : 'Not yet submitted';

  return createPortal(
    <div className="fixed inset-0 z-[1300] flex items-start justify-center bg-slate-950/30 p-4 sm:p-6" onClick={onClose}>
      <div
        aria-label="Evaluation form"
        aria-modal="true"
        className="max-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-y-auto rounded-[1.75rem] bg-white p-5 shadow-[0_28px_90px_rgba(15,23,42,0.28)] sm:p-6"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-light)]">
              {readOnly ? 'Submitted Evaluation' : 'Evaluation Form'}
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-[var(--text-dark)]">
              {draft.projectTitle}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-light)]">
              Review the group rubric, document student-level performance, and record the final recommendation in one place.
            </p>
          </div>
          <button
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
            type="button"
            onClick={onClose}
          >
            <i className="fas fa-xmark" />
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getDepartmentBadgeClass(draft.department)}`}
          >
            {draft.department}
          </span>
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.badgeClassName}`}>
            {statusMeta.label}
          </span>
          {draft.status === 'completed' && draft.recommendation ? (
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRecommendationMeta(draft.recommendation).className}`}
            >
              {draft.recommendation}
            </span>
          ) : null}
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${scheduleMeta.className}`}>
            {scheduleMeta.label}
          </span>
        </div>

        <section className="mt-6 rounded-[1.5rem] border border-[rgba(0,58,143,0.08)] bg-[rgba(0,58,143,0.04)] p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h3 className="text-lg font-bold text-[var(--text-dark)]">Evaluation Summary</h3>
              <p className="mt-1 text-sm text-[var(--text-light)]">
                Keep the group score, student reviews, and formal recommendation aligned before submitting.
              </p>
            </div>
            <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--primary)] ring-1 ring-inset ring-[rgba(0,58,143,0.10)]">
              {readOnly ? 'Read only' : 'Editable draft'}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Group ID"
              helperText="Current defense record"
              value={draft.groupId}
            />
            <SummaryCard
              label="Live Group Score"
              helperText="Calculated from the rubric below"
              value={`${liveScore}%`}
            />
            <SummaryCard
              label="Student Reviews"
              helperText={`${reviewedStudentCount}/${draft.studentEvaluations.length} finalized`}
              value={`${draft.studentEvaluations.length} assigned`}
            />
            <SummaryCard
              label="Submitted"
              helperText={draft.submittedAt ? 'Formal evaluation record' : 'Waiting for submission'}
              value={submissionLabel}
            />
          </div>
        </section>

        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.9fr)]">
          <section className="space-y-4">
            <section className="rounded-[1.5rem] bg-slate-50/90 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-dark)]">Group Rubric</h3>
                  <p className="text-sm text-[var(--text-light)]">
                    {canCustomizeRubric
                      ? 'The adviser can rename criteria, adjust max points, add more rubric items, and complete the scoring notes here.'
                      : 'Score each rubric area and explain the rating with concise section notes.'}
                  </p>
                </div>
                <div className="rounded-[1.15rem] bg-white px-4 py-3 text-right shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-light)]">Defense Schedule</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--text-dark)]">{formatEvaluationDateTime(draft.defenseDate)}</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {draft.rubric.map((criterion) => {
                  const scoreWidth = getProgressWidth(criterion.score, criterion.maxScore);

                  return (
                    <article key={criterion.id} className="rounded-[1.25rem] border border-slate-100 bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              {canCustomizeRubric ? (
                                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_132px]">
                                  <label className="space-y-2">
                                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-light)]">
                                      Criterion
                                    </span>
                                    <input
                                      className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[var(--text-dark)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[rgba(0,58,143,0.10)]"
                                      placeholder="Criterion name"
                                      type="text"
                                      value={criterion.label}
                                      onChange={(event) => onCriterionLabelChange(criterion.id, event.target.value)}
                                    />
                                  </label>
                                  <label className="space-y-2">
                                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-light)]">
                                      Max Points
                                    </span>
                                    <input
                                      className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[var(--text-dark)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[rgba(0,58,143,0.10)]"
                                      max={50}
                                      min={1}
                                      step={1}
                                      type="number"
                                      value={criterion.maxScore}
                                      onChange={(event) =>
                                        onCriterionMaxScoreChange(criterion.id, Number(event.target.value))
                                      }
                                    />
                                  </label>
                                </div>
                              ) : (
                                <div>
                                  <p className="text-sm font-semibold text-[var(--text-dark)]">{criterion.label}</p>
                                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--text-light)]">
                                    Max {criterion.maxScore} points
                                  </p>
                                </div>
                              )}
                            </div>
                            <span className="rounded-full bg-[rgba(0,58,143,0.06)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">
                              {criterion.score}/{criterion.maxScore}
                            </span>
                          </div>

                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-[var(--primary)]"
                              style={{ width: scoreWidth }}
                            />
                          </div>

                          <textarea
                            className="mt-4 min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-[var(--text-dark)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[rgba(0,58,143,0.10)] disabled:cursor-not-allowed disabled:bg-slate-50"
                            disabled={readOnly}
                            placeholder="Section comments"
                            value={criterion.comment}
                            onChange={(event) => onCriterionCommentChange(criterion.id, event.target.value)}
                          />
                        </div>

                        <label className="w-full rounded-[1.15rem] bg-slate-50 p-3 lg:w-[118px]">
                          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-light)]">
                            Score
                          </span>
                          <input
                            className="mt-3 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-center text-lg font-semibold text-[var(--text-dark)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[rgba(0,58,143,0.10)] disabled:cursor-not-allowed disabled:bg-slate-50"
                            disabled={readOnly}
                            max={criterion.maxScore}
                            min={0}
                            step={1}
                            type="number"
                            value={criterion.score}
                            onChange={(event) => onCriterionScoreChange(criterion.id, Number(event.target.value))}
                          />
                        </label>
                      </div>
                    </article>
                  );
                })}
              </div>

              {canCustomizeRubric ? (
                <div className="mt-4 flex justify-end">
                  <button
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)]"
                    type="button"
                    onClick={onAddCriterion}
                  >
                    <i className="fas fa-plus text-xs" />
                    <span className="ml-2">Add Criterion</span>
                  </button>
                </div>
              ) : null}
            </section>
          </section>

          <section className="space-y-4">
            <div className="rounded-[1.5rem] bg-[rgba(248,250,252,0.98)] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-light)]">
                    Student Evaluations
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-light)]">
                    Capture each student's contribution, communication, and documentation ownership using the same review standard.
                  </p>
                </div>
                <div className="rounded-[1.15rem] bg-white px-4 py-3 text-right shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-light)]">
                    Average Student Score
                  </p>
                  <p className="mt-1 text-lg font-bold text-[var(--primary)]">{liveStudentAverage}%</p>
                </div>
              </div>

              <div className="mt-4 rounded-[1.25rem] bg-white px-4 py-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-dark)]">
                      {draft.studentEvaluations.length} student review{draft.studentEvaluations.length === 1 ? '' : 's'}
                    </p>
                    <p className="text-sm text-[var(--text-light)]">
                      {reviewedStudentCount} finalized and {draft.studentEvaluations.length - reviewedStudentCount} still in draft.
                    </p>
                  </div>
                  <span className="rounded-full bg-[rgba(0,58,143,0.06)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">
                    Individual review tracker
                  </span>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {draft.studentEvaluations.map((studentEvaluation) => {
                  const liveStudentScore = calculateEvaluationScore(studentEvaluation.rubric);
                  const studentRecommendation =
                    studentEvaluation.recommendation ?? deriveStudentEvaluationRecommendation(liveStudentScore);
                  const studentState = getStudentReviewState(studentEvaluation);

                  return (
                    <article key={studentEvaluation.id} className="rounded-[1.25rem] bg-white p-4 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(0,58,143,0.08)] text-sm font-bold text-[var(--primary)]">
                            {getInitials(studentEvaluation.studentName)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--text-dark)]">
                              {studentEvaluation.studentName}
                            </p>
                            <p className="mt-1 text-xs text-[var(--text-light)]">
                              Individual defense performance review
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${studentState.className}`}
                          >
                            {studentState.label}
                          </span>
                          <span className="rounded-full bg-[rgba(0,58,143,0.06)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">
                            {studentEvaluation.score ?? liveStudentScore}%
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[var(--primary)]"
                          style={{ width: getProgressWidth(studentEvaluation.score ?? liveStudentScore, 100) }}
                        />
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {studentEvaluation.rubric.map((criterion) => (
                          <label key={criterion.id} className="rounded-[1.1rem] bg-slate-50 p-3">
                            <div className="flex items-start justify-between gap-2">
                              <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-light)]">
                                {criterion.label}
                              </span>
                              <span className="text-xs font-semibold text-[var(--text-light)]">
                                {criterion.score}/{criterion.maxScore}
                              </span>
                            </div>
                            <input
                              className="mt-3 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-center text-base font-semibold text-[var(--text-dark)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[rgba(0,58,143,0.10)] disabled:cursor-not-allowed disabled:bg-slate-50"
                              disabled={readOnly}
                              max={criterion.maxScore}
                              min={0}
                              step={1}
                              type="number"
                              value={criterion.score}
                              onChange={(event) =>
                                onStudentCriterionScoreChange(
                                  studentEvaluation.id,
                                  criterion.id,
                                  Number(event.target.value)
                                )
                              }
                            />
                          </label>
                        ))}
                      </div>

                      <textarea
                        className="mt-4 min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-[var(--text-dark)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[rgba(0,58,143,0.10)] disabled:cursor-not-allowed disabled:bg-slate-50"
                        disabled={readOnly}
                        placeholder="Individual performance comments"
                        value={studentEvaluation.comment}
                        onChange={(event) => onStudentCommentChange(studentEvaluation.id, event.target.value)}
                      />

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <select
                          className="min-h-11 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-[var(--text-dark)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[rgba(0,58,143,0.10)] disabled:cursor-not-allowed disabled:bg-slate-50"
                          disabled={readOnly}
                          value={studentRecommendation}
                          onChange={(event) =>
                            onStudentRecommendationChange(
                              studentEvaluation.id,
                              event.target.value as StudentEvaluationRecommendation
                            )
                          }
                        >
                          <option value="Excellent">Excellent</option>
                          <option value="Satisfactory">Satisfactory</option>
                          <option value="Needs Support">Needs Support</option>
                        </select>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStudentEvaluationRecommendationMeta(studentRecommendation).className}`}
                        >
                          {studentRecommendation}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-[rgba(248,250,252,0.98)] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-light)]">
                Overall Comments
              </p>
              <p className="mt-1 text-sm text-[var(--text-light)]">
                Summarize the defense outcome, required revisions, and any remarks that should appear in the final record.
              </p>
              <textarea
                className="mt-3 min-h-36 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-[var(--text-dark)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[rgba(0,58,143,0.10)] disabled:cursor-not-allowed disabled:bg-slate-50"
                disabled={readOnly}
                placeholder="Summarize the defense outcome and formal remarks."
                value={draft.overallComments}
                onChange={(event) => onOverallCommentsChange(event.target.value)}
              />
            </div>

            <div className="rounded-[1.5rem] bg-[rgba(248,250,252,0.98)] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-light)]">
                Final Recommendation
              </p>
              <p className="mt-1 text-sm text-[var(--text-light)]">
                Select the final defense outcome that best matches the rubric and your written comments.
              </p>
              <select
                className="mt-3 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-[var(--text-dark)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[rgba(0,58,143,0.10)] disabled:cursor-not-allowed disabled:bg-slate-50"
                disabled={readOnly}
                value={recommendation}
                onChange={(event) => onRecommendationChange(event.target.value as EvaluationRecommendation)}
              >
                <option value="Passed">Passed</option>
                <option value="With Revision">With Revision</option>
                <option value="Failed">Failed</option>
              </select>

              <div className="mt-4">
                <ScoreBadge recommendation={recommendation} score={draft.score ?? liveScore} />
              </div>
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 -mx-5 -mb-5 mt-6 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--text-light)]">
              {readOnly
                ? 'This evaluation has already been submitted and is available for review only.'
                : 'Overall comments are required before the evaluation can be submitted.'}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                type="button"
                onClick={onClose}
              >
                {readOnly ? 'Close' : 'Cancel'}
              </button>
              {!readOnly ? (
                <button
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)]"
                  type="button"
                  onClick={onSubmit}
                >
                  Submit Evaluation
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function SummaryCard({
  label,
  value,
  helperText
}: {
  label: string;
  value: string;
  helperText?: string;
}) {
  return (
    <article className="rounded-[1.15rem] bg-white/95 p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-light)]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--text-dark)]">{value}</p>
      {helperText ? <p className="mt-2 text-xs leading-5 text-[var(--text-light)]">{helperText}</p> : null}
    </article>
  );
}
