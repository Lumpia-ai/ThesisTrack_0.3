'use client';

import { useMemo, useState } from 'react';
import {
  PARTNER_FEEDBACK,
  PARTNER_IMPLEMENTATIONS,
  getPartnerStatusTone,
  type PartnerFeedbackEntry
} from '@/components/partner/partner-data';
import {
  PartnerModal,
  PartnerStatusBadge
} from '@/components/partner/partner-primitives';
import { PartnerShell } from '@/components/partner/partner-shell';

const FEEDBACK_STATS = [
  {
    title: 'Reports Submitted',
    icon: 'fa-file-alt',
    accent: '#2563EB',
    soft: 'rgba(37, 99, 235, 0.14)',
    note: 'All time',
    value: () => PARTNER_FEEDBACK.length
  },
  {
    title: 'Needs Follow-up',
    icon: 'fa-exclamation-circle',
    accent: '#F59E0B',
    soft: 'rgba(245, 158, 11, 0.14)',
    note: 'Awaiting response',
    value: () => PARTNER_FEEDBACK.filter((entry) => entry.status === 'Needs Follow-up').length
  },
  {
    title: 'Resolved Items',
    icon: 'fa-check-circle',
    accent: '#16A34A',
    soft: 'rgba(22, 163, 74, 0.14)',
    note: 'Closed out',
    value: () => PARTNER_FEEDBACK.filter((entry) => entry.status === 'Resolved').length
  },
  {
    title: 'Active Implementations',
    icon: 'fa-rocket',
    accent: '#8B5CF6',
    soft: 'rgba(139, 92, 246, 0.14)',
    note: 'Reportable projects',
    value: () => PARTNER_IMPLEMENTATIONS.length
  }
];

const CATEGORY_META: Record<PartnerFeedbackEntry['category'], { icon: string; accent: string; soft: string }> = {
  'Progress Report': { icon: 'fa-chart-line', accent: '#2563EB', soft: 'rgba(37, 99, 235, 0.14)' },
  'Issue Log': { icon: 'fa-triangle-exclamation', accent: '#F43F5E', soft: 'rgba(244, 63, 94, 0.14)' },
  'Impact Feedback': { icon: 'fa-bullseye', accent: '#16A34A', soft: 'rgba(22, 163, 74, 0.14)' }
};

export function PartnerFeedback() {
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [selectedFeedbackId, setSelectedFeedbackId] = useState('');
  const [submitOpen, setSubmitOpen] = useState(false);

  const feedbackEntries = useMemo(() => {
    return PARTNER_FEEDBACK.filter((entry) => {
      return categoryFilter === 'All Categories' || entry.category === categoryFilter;
    });
  }, [categoryFilter]);

  const selectedFeedback = PARTNER_FEEDBACK.find((entry) => entry.id === selectedFeedbackId) ?? PARTNER_FEEDBACK[0];

  return (
    <PartnerShell
      activeNav="feedback"
      title="Feedback & Reports"
      description="Share partner observations, issue logs, and rollout updates"
      notificationCount={2}
    >
      <div className="flex flex-col gap-8">
        {/* KPI Stat Bar */}
        <section className="grid grid-cols-1 divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
          {FEEDBACK_STATS.map((stat) => (
            <div key={stat.title} className="flex items-center gap-4 p-5">
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl"
                style={{ background: stat.soft, color: stat.accent }}
              >
                <i aria-hidden="true" className={`fas ${stat.icon}`} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold uppercase tracking-wide text-[var(--muted)]">{stat.title}</p>
                <p className="text-2xl font-extrabold leading-tight text-[var(--text)]">{stat.value()}</p>
                <p className="truncate text-xs font-medium text-[var(--muted)]">{stat.note}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Filter and Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 px-1 font-bold text-[var(--muted)]">
              <i aria-hidden="true" className="fas fa-filter" /> Category
            </span>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="min-w-[200px] cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] px-4 py-2.5 text-sm font-semibold text-[var(--muted)] outline-none"
            >
              <option>All Categories</option>
              <option>Progress Report</option>
              <option>Issue Log</option>
              <option>Impact Feedback</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => setSubmitOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
          >
            <i aria-hidden="true" className="fas fa-plus" /> New Feedback Report
          </button>
        </div>

        {/* Feedback Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {feedbackEntries.map((entry) => {
            const meta = CATEGORY_META[entry.category];

            return (
              <article
                key={entry.id}
                className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-md)]"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg"
                    style={{ background: meta.soft, color: meta.accent }}
                  >
                    <i aria-hidden="true" className={`fas ${meta.icon}`} />
                  </span>
                  <h3 className="text-base font-extrabold leading-snug text-[var(--text)]">{entry.title}</h3>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: meta.soft, color: meta.accent }}>
                    {entry.category}
                  </span>
                  <span className="font-semibold text-[var(--muted)]">
                    <i aria-hidden="true" className="far fa-calendar-alt mr-1.5" />
                    {entry.submittedAt}
                  </span>
                </div>

                <p className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] p-4 text-sm leading-relaxed text-[var(--muted)]">
                  {entry.summary}
                </p>

                <div className="mt-auto flex items-center justify-between border-t border-[var(--border)] pt-4">
                  <PartnerStatusBadge tone={getPartnerStatusTone(entry.status)}>{entry.status}</PartnerStatusBadge>
                  <button
                    type="button"
                    onClick={() => setSelectedFeedbackId(entry.id)}
                    className="rounded-lg border border-[var(--primary)] px-4 py-1.5 text-sm font-bold text-[var(--primary)] transition hover:bg-[var(--primary-soft)]"
                  >
                    Open Entry
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {/* Info Note */}
        <section className="flex items-start gap-5 rounded-2xl border border-[var(--border)] border-t-4 border-t-[var(--primary)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-xl text-[var(--primary)]">
            <i aria-hidden="true" className="fas fa-info-circle" />
          </span>
          <div>
            <h3 className="text-base font-extrabold text-[var(--text)]">Partner Reporting Notes</h3>
            <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
              Use this area for implementation blockers, user feedback, and operational impact documentation.
            </p>
            <p className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] p-4 text-sm leading-relaxed text-[var(--muted)]">
              Reporting records support TTO validation, refinement requests, and implementation closeout. Keep summaries
              concise and attach evidence during scheduled reviews.
            </p>
          </div>
        </section>
      </div>

      <PartnerModal
        open={Boolean(selectedFeedbackId)}
        title={selectedFeedback.title}
        onClose={() => setSelectedFeedbackId('')}
        footer={
          <div className="flex w-full justify-end">
            <button
              type="button"
              onClick={() => setSelectedFeedbackId('')}
              className="rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
            >
              Close
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 py-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[var(--surface-alt)] px-3 py-1.5 text-xs font-bold text-[var(--muted-strong)]">
              {selectedFeedback.category}
            </span>
            <span className="text-sm font-semibold text-[var(--muted)]">
              <i aria-hidden="true" className="far fa-calendar-alt mr-1.5" />
              {selectedFeedback.submittedAt}
            </span>
            <PartnerStatusBadge tone={getPartnerStatusTone(selectedFeedback.status)}>{selectedFeedback.status}</PartnerStatusBadge>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] p-5">
            <span className="mb-3 block text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Summary details</span>
            <p className="text-sm leading-relaxed text-[var(--text)]">{selectedFeedback.summary}</p>
          </div>
        </div>
      </PartnerModal>

      <PartnerModal
        open={submitOpen}
        title="New Feedback Report"
        onClose={() => setSubmitOpen(false)}
        footer={
          <div className="flex w-full justify-end gap-4">
            <button
              type="button"
              onClick={() => setSubmitOpen(false)}
              className="rounded-xl border border-[var(--border-strong)] px-5 py-2.5 text-sm font-bold text-[var(--muted)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setSubmitOpen(false)}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
            >
              Submit Report
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-5 py-1">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-[var(--muted-strong)]" htmlFor="partner-feedback-implementation">
              Implementation Project
            </label>
            <select
              id="partner-feedback-implementation"
              className="cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] px-4 py-3 text-sm font-semibold text-[var(--text)] outline-none"
            >
              {PARTNER_IMPLEMENTATIONS.map((implementation) => (
                <option key={implementation.id} value={implementation.id}>
                  {implementation.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-[var(--muted-strong)]" htmlFor="partner-feedback-category">
              Report Category
            </label>
            <select
              defaultValue="Progress Report"
              id="partner-feedback-category"
              className="cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] px-4 py-3 text-sm font-semibold text-[var(--text)] outline-none"
            >
              <option>Progress Report</option>
              <option>Issue Log</option>
              <option>Impact Feedback</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-[var(--muted-strong)]" htmlFor="partner-feedback-summary">
              Detailed Summary
            </label>
            <textarea
              id="partner-feedback-summary"
              rows={5}
              placeholder="Describe the progress, issue, or feedback in detail..."
              className="resize-y rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] p-3 text-sm text-[var(--text)] outline-none"
            />
          </div>
        </div>
      </PartnerModal>
    </PartnerShell>
  );
}
