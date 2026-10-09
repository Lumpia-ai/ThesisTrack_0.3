'use client';

import { useMemo, useState } from 'react';
import type { StudentDashboardData } from '@/lib/services/student-workspace';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';
type ProgressReportEntry = StudentDashboardData['progressReports'][number];

const BADGE_TONE_STYLES: Record<BadgeTone, string> = {
  neutral: 'border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text)]',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-rose-200 bg-rose-50 text-rose-700',
  info: 'border-blue-200 bg-blue-50 text-blue-700'
};

function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: BadgeTone; icon?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none ${BADGE_TONE_STYLES[tone]}`}>
      {icon ? <i className={`fas ${icon} text-[10px]`} aria-hidden="true" /> : null}
      {label}
    </span>
  );
}

function getInitials(value: string) {
  return value.split(' ').filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'GM';
}

function formatPercentTone(value: number): BadgeTone {
  if (value >= 75) return 'success';
  if (value >= 40) return 'info';
  if (value > 0) return 'warning';
  return 'neutral';
}

export function StudentProgressReports({ data }: { data: StudentDashboardData }) {
  const [reports, setReports] = useState<ProgressReportEntry[]>(() => data.progressReports || []);
  const [progressNote, setProgressNote] = useState('');
  const [accomplishments, setAccomplishments] = useState<string[]>([]);
  const [accomplishmentDraft, setAccomplishmentDraft] = useState('');
  const [problemsEncountered, setProblemsEncountered] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [percentageCompleted, setPercentageCompleted] = useState(50);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const latestReport = reports[0] || null;
  const previousReport = reports[1] || null;
  const trendDelta = latestReport ? latestReport.percentageCompleted - (previousReport?.percentageCompleted ?? latestReport.percentageCompleted) : 0;

  const daysSinceLastReport = latestReport
    ? Math.floor((Date.now() - new Date(latestReport.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const isOverdue = daysSinceLastReport !== null && daysSinceLastReport > 7;
  const isRegression = latestReport ? percentageCompleted < latestReport.percentageCompleted : false;

  const commitAccomplishmentDraft = () => {
    const value = accomplishmentDraft.trim();
    if (value && !accomplishments.includes(value)) {
      setAccomplishments((current) => [...current, value]);
    }
    setAccomplishmentDraft('');
  };

  const removeAccomplishment = (value: string) => {
    setAccomplishments((current) => current.filter((item) => item !== value));
  };

  const averageCompletion = useMemo(() => {
    if (!reports.length) return 0;
    return Math.round(reports.reduce((sum, report) => sum + report.percentageCompleted, 0) / reports.length);
  }, [reports]);

  const reportsThisMonth = useMemo(() => {
    const now = new Date();
    return reports.filter((report) => {
      const date = new Date(report.created_at);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    }).length;
  }, [reports]);

  const trendSeries = useMemo(() => [...reports].slice(0, 8).reverse(), [reports]);

  const summaryCards: Array<{ label: string; value: string | number; note: string; icon: string; tone: BadgeTone }> = [
    {
      label: 'Reports Submitted',
      value: reports.length,
      note: reports.length ? `${reportsThisMonth} filed this month.` : 'Submit your first weekly update below.',
      icon: 'fa-file-signature',
      tone: 'info'
    },
    {
      label: 'Latest Completion',
      value: latestReport ? `${latestReport.percentageCompleted}%` : '—',
      note: latestReport
        ? trendDelta === 0
          ? 'No change since the last report.'
          : `${trendDelta > 0 ? '+' : ''}${trendDelta}% vs. previous report.`
        : 'No report filed yet.',
      icon: trendDelta > 0 ? 'fa-arrow-trend-up' : trendDelta < 0 ? 'fa-arrow-trend-down' : 'fa-minus',
      tone: formatPercentTone(latestReport?.percentageCompleted ?? 0)
    },
    {
      label: 'Average Completion',
      value: reports.length ? `${averageCompletion}%` : '—',
      note: 'Across every report your group has filed.',
      icon: 'fa-chart-simple',
      tone: 'neutral'
    }
  ];

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedNote = progressNote.trim();
    if (!trimmedNote) {
      setErrorMessage('Add a short progress summary before submitting.');
      return;
    }

    const pendingDraft = accomplishmentDraft.trim();
    const finalAccomplishments = pendingDraft && !accomplishments.includes(pendingDraft) ? [...accomplishments, pendingDraft] : accomplishments;

    setSubmitting(true);
    try {
      const response = await fetch('/api/progress-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          progressNote: trimmedNote,
          accomplishments: finalAccomplishments,
          problemsEncountered: problemsEncountered.trim(),
          nextSteps: nextSteps.trim(),
          percentageCompleted
        })
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.report) {
        throw new Error(payload.message || 'Failed to submit the progress report.');
      }

      setReports((current) => [payload.report as ProgressReportEntry, ...current]);
      setProgressNote('');
      setAccomplishments([]);
      setAccomplishmentDraft('');
      setProblemsEncountered('');
      setNextSteps('');
      setPercentageCompleted(50);
      setSuccessMessage('Progress report submitted. Your adviser has been notified.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit the progress report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <header className="top-nav">
        <div className="top-nav-leading">
          <div className="page-title">
            <div className="page-title-context">
              <span className="page-kicker">Student Workspace</span>
              <span className="page-breadcrumb" aria-hidden="true">
                <i className="fas fa-angle-right" />
                <span>Progress Reports</span>
              </span>
            </div>
            <h1>Progress Reports</h1>
            <p>Keep your adviser informed with weekly updates on accomplishments, blockers, and completion progress.</p>
          </div>
        </div>
      </header>

      <div className="page-body">
        <section className="grid gap-5 rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)] xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,1fr)]">
          <div className="grid gap-3">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#003A8F]">Weekly Accountability</span>
            <h2 className="max-w-[24ch] text-[clamp(1.6rem,3vw,2.1rem)] font-extrabold leading-tight text-slate-950">
              Submit and track your group's progress over time
            </h2>
            <p className="max-w-[62ch] text-sm leading-7 text-[var(--muted)]">
              Every report you file here notifies your adviser and counts toward the development checkpoint on your project roadmap.
            </p>
            {isOverdue ? (
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-700">
                <i className="fas fa-hourglass-half" aria-hidden="true" />
                It's been {daysSinceLastReport} days since your last report — weekly updates keep your adviser in the loop.
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {summaryCards.map((item) => (
              <article key={item.label} className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-alt)] p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${BADGE_TONE_STYLES[item.tone]}`}>
                    <i className={`fas ${item.icon}`} aria-hidden="true" />
                  </span>
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--muted)]">{item.label}</span>
                </div>
                <strong className="mt-3 block text-2xl font-extrabold leading-none text-slate-950">{item.value}</strong>
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{item.note}</p>
              </article>
            ))}
          </div>
        </section>

        {trendSeries.length > 1 ? (
          <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#003A8F]">Completion Trend</span>
                <h3 className="mt-1 text-base font-bold text-slate-950">Last {trendSeries.length} reports</h3>
              </div>
              <Badge label={`${latestReport?.percentageCompleted ?? 0}% latest`} tone={formatPercentTone(latestReport?.percentageCompleted ?? 0)} />
            </div>
            <div className="mt-4 flex items-end gap-2">
              {trendSeries.map((report) => (
                <div key={report.id} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-24 w-full items-end rounded-lg bg-[var(--surface-alt)]">
                    <div
                      className="w-full rounded-lg bg-[#003A8F] transition-all"
                      style={{ height: `${Math.max(4, report.percentageCompleted)}%` }}
                      title={`${report.percentageCompleted}% on ${report.dateLabel}`}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-[var(--muted)]">{report.percentageCompleted}%</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <article className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#003A8F]">New Report</span>
            <h3 className="mt-2 text-xl font-bold text-slate-950">Submit a progress update</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Any group member can file a report — only the leader is required to.</p>

            <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
              <label className="grid gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Progress Summary</span>
                <textarea
                  className="min-h-[88px] rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-3 text-sm text-[var(--text)] outline-none transition focus:border-[#003A8F] focus:bg-[var(--surface)] focus:ring-4 focus:ring-[#003A8F]/10"
                  placeholder="Brief summary of the work done during this reporting period..."
                  value={progressNote}
                  onChange={(event) => setProgressNote(event.target.value)}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Completed Activities</span>
                <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-2 transition focus-within:border-[#003A8F] focus-within:bg-[var(--surface)] focus-within:ring-4 focus-within:ring-[#003A8F]/10">
                  {accomplishments.map((item) => (
                    <span key={item} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--text)] ring-1 ring-[var(--border)]">
                      {item}
                      <button
                        type="button"
                        className="text-[var(--text-meta)] transition hover:text-rose-600"
                        aria-label={`Remove ${item}`}
                        onClick={() => removeAccomplishment(item)}
                      >
                        <i className="fas fa-xmark text-[10px]" aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                  <input
                    className="min-w-[160px] flex-1 border-0 bg-transparent px-1 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-meta)]"
                    placeholder={accomplishments.length ? 'Add another…' : 'e.g. updated evidence, completed field work — press Enter to add'}
                    value={accomplishmentDraft}
                    onChange={(event) => setAccomplishmentDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ',') {
                        event.preventDefault();
                        commitAccomplishmentDraft();
                      } else if (event.key === 'Backspace' && !accomplishmentDraft && accomplishments.length) {
                        setAccomplishments((current) => current.slice(0, -1));
                      }
                    }}
                    onBlur={commitAccomplishmentDraft}
                  />
                </div>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Problems Encountered</span>
                  <textarea
                    className="min-h-[72px] rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-3 text-sm text-[var(--text)] outline-none transition focus:border-[#003A8F] focus:bg-[var(--surface)] focus:ring-4 focus:ring-[#003A8F]/10"
                    placeholder="Any hurdles, evidence gaps, or blockers..."
                    value={problemsEncountered}
                    onChange={(event) => setProblemsEncountered(event.target.value)}
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Next Steps</span>
                  <textarea
                    className="min-h-[72px] rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-3 text-sm text-[var(--text)] outline-none transition focus:border-[#003A8F] focus:bg-[var(--surface)] focus:ring-4 focus:ring-[#003A8F]/10"
                    placeholder="What the group will work on next..."
                    value={nextSteps}
                    onChange={(event) => setNextSteps(event.target.value)}
                  />
                </label>
              </div>

              <label className="grid gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
                    Estimated Project Completion — <strong className="text-[#003A8F]">{percentageCompleted}%</strong>
                  </span>
                  {latestReport ? (
                    <span className="text-[11px] font-medium text-[var(--text-meta)]">
                      Last report: {latestReport.percentageCompleted}% on {latestReport.dateLabel}
                    </span>
                  ) : null}
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={percentageCompleted}
                  onChange={(event) => setPercentageCompleted(Number(event.target.value))}
                  className="accent-[#003A8F]"
                />
                {isRegression ? (
                  <p className="text-xs text-amber-700">
                    <i className="fas fa-triangle-exclamation mr-1" aria-hidden="true" />
                    This is lower than your last reported completion ({latestReport?.percentageCompleted}%) — that's fine if something changed, just double-check it's intentional.
                  </p>
                ) : null}
              </label>

              {errorMessage ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  <i className="fas fa-triangle-exclamation mr-2" aria-hidden="true" />
                  {errorMessage}
                </div>
              ) : null}

              {successMessage ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  <i className="fas fa-circle-check mr-2" aria-hidden="true" />
                  {successMessage}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#002c6b] bg-[#003A8F] px-4 text-sm font-semibold text-white shadow-sm transition duration-150 hover:-translate-y-px hover:bg-[#002c6b] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? <i className="fas fa-spinner fa-spin" aria-hidden="true" /> : <i className="fas fa-paper-plane" aria-hidden="true" />}
                  {submitting ? 'Submitting…' : 'Submit Report'}
                </button>
                <span className="text-xs text-[var(--muted)]">Your adviser is notified immediately and it's logged in Project History.</span>
              </div>
            </form>
          </article>

          <article className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#003A8F]">Historical Reports</span>
                <h3 className="mt-2 text-xl font-bold text-slate-950">Past progress logs</h3>
              </div>
              <Badge label={`${reports.length} filed`} tone="neutral" icon="fa-clock-rotate-left" />
            </div>

            {reports.length ? (
              <div className="mt-5 max-h-[720px] space-y-4 overflow-y-auto pr-1">
                {reports.map((report) => (
                  <article key={report.id} className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-alt)] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-sm font-bold text-[#003A8F]">
                          {getInitials(report.submittedByName)}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-[var(--text)]">{report.submittedByName}</p>
                          <p className="text-xs text-[var(--muted)]">{report.dateLabel}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {report.feedback.length ? (
                          <Badge label="Reviewed" tone="success" icon="fa-check-double" />
                        ) : (
                          <Badge label="Awaiting Review" tone="warning" icon="fa-hourglass-half" />
                        )}
                        <Badge label={`${report.percentageCompleted}% complete`} tone={formatPercentTone(report.percentageCompleted)} />
                      </div>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-[var(--text)]">{report.progressDescription}</p>

                    {report.accomplishments.length ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {report.accomplishments.map((item, index) => (
                          <span key={`${report.id}-acc-${index}`} className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--muted)]">
                            <i className="fas fa-check text-emerald-500 mr-1" aria-hidden="true" />
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {report.problemsEncountered || report.nextSteps ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {report.problemsEncountered ? (
                          <div className="rounded-xl bg-[var(--surface)] p-2.5">
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Blockers</p>
                            <p className="mt-1 text-xs leading-5 text-[var(--text)]">{report.problemsEncountered}</p>
                          </div>
                        ) : null}
                        {report.nextSteps ? (
                          <div className="rounded-xl bg-[var(--surface)] p-2.5">
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Next Steps</p>
                            <p className="mt-1 text-xs leading-5 text-[var(--text)]">{report.nextSteps}</p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {report.feedback.length ? (
                      <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-3">
                        {report.feedback.map((comment) => (
                          <div key={comment.id} className="rounded-xl bg-blue-50/60 p-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[11px] font-bold text-[#003A8F]">
                                <i className="fas fa-user-graduate mr-1" aria-hidden="true" /> {comment.authorName}
                              </p>
                              <p className="text-[10px] text-[var(--text-meta)]">
                                {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(comment.createdAt))}
                              </p>
                            </div>
                            <p className="mt-1 text-xs leading-5 text-[var(--text)]">{comment.body}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-[20px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-alt)] p-8 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#003A8F]">
                  <i className="fas fa-file-signature text-lg" aria-hidden="true" />
                </span>
                <strong className="mt-4 block text-lg font-bold text-slate-950">No reports filed yet</strong>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">When you submit a progress report, it will appear here in the historical log.</p>
              </div>
            )}
          </article>
        </section>
      </div>
    </>
  );
}
