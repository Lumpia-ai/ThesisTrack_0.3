'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DOCUMENT_AND_IMAGE_FILE_ACCEPT } from '@/lib/storage/upload-config';
import {
  COMPLIANCE_REVIEW_STATUS_META,
  COMPLIANCE_STATUS_META,
  formatComplianceDate,
  getComplianceStatusKey,
  getCompliancePreviewHref,
  type ComplianceDefense,
  type ComplianceSubmissionItem
} from '@/lib/compliance-display';

function StatusBadge({ meta }: { meta: { label: string; className: string; icon: string } }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
      <i className={`fas ${meta.icon}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

function SubmissionCard({ submission }: { submission: ComplianceSubmissionItem }) {
  return (
    <div className="space-y-3 rounded-xl border border-[var(--border)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
          Version {submission.version}
          <StatusBadge meta={COMPLIANCE_STATUS_META[submission.status]} />
        </div>
        <span className="text-xs text-[var(--muted)]">
          Submitted {formatComplianceDate(submission.submittedAt)}{submission.submittedByName ? ` by ${submission.submittedByName}` : ''}
        </span>
      </div>

      {submission.file ? (
        <a
          href={getCompliancePreviewHref(submission.file.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#003A8F] hover:underline"
        >
          <i className="fas fa-file-lines" aria-hidden="true" />
          {submission.file.fileName}
        </a>
      ) : null}

      <ul className="divide-y divide-[var(--border)] rounded-lg bg-[var(--surface-alt)]">
        {submission.reviews.map((review) => (
          <li key={review.id} className="flex flex-col gap-1 px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <div className="text-sm font-medium text-[var(--text)]">{review.reviewerName}</div>
              {review.remarks ? (
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-[var(--muted)]">{review.remarks}</p>
              ) : null}
            </div>
            <StatusBadge meta={COMPLIANCE_REVIEW_STATUS_META[review.status]} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SubmitForm({ defense, onSubmitted }: { defense: ComplianceDefense; onSubmitted: (message: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isResubmission = defense.submissions.length > 0;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!file) {
      setError('Attach your compliance document.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('defenseScheduleId', defense.scheduleId);
      formData.append('notes', notes);
      formData.append('file', file);

      const response = await fetch('/api/compliance', { method: 'POST', body: formData });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to submit your compliance.');
      }

      setFile(null);
      setNotes('');
      onSubmitted(payload?.message || 'Compliance submitted to your panel.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit your compliance.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
      <div className="text-sm font-semibold text-[var(--text)]">
        {isResubmission ? 'Submit revised compliance' : 'Submit compliance'}
      </div>
      <p className="text-xs leading-5 text-[var(--muted)]">
        Upload your compliance matrix or revised manuscript showing how you addressed the panel&apos;s recommendations.
        It goes to every panelist of this defense ({defense.panelists.map((panelist) => panelist.name).join(', ')}).
      </p>
      <input
        type="file"
        accept={DOCUMENT_AND_IMAGE_FILE_ACCEPT}
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        className="block w-full text-sm text-[var(--text)] file:mr-3 file:rounded-lg file:border-0 file:bg-[#003A8F] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
      />
      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        rows={3}
        placeholder="Optional notes for the panel (e.g. pages where each revision was made)"
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[#003A8F]/20"
      />
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <button
        type="submit"
        disabled={isSubmitting || !file}
        className="inline-flex items-center gap-2 rounded-lg bg-[#003A8F] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#002c6b] disabled:opacity-60"
      >
        <i className="fas fa-paper-plane" aria-hidden="true" />
        {isSubmitting ? 'Submitting...' : 'Submit to Panel'}
      </button>
    </form>
  );
}

export function StudentCompliance() {
  const [defenses, setDefenses] = useState<ComplianceDefense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadDefenses() {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await fetch('/api/compliance', { cache: 'no-store' });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to load your defense compliance.');
      }

      setDefenses((payload?.defenses ?? []) as ComplianceDefense[]);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load your defense compliance.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDefenses();
  }, []);

  // Only these two defenses end with panel-required revisions (see src/lib/compliance.ts).
  const complianceDefenses = [
    { type: 'Proposal Defense', term: 'Capstone/Thesis 1', icon: 'fa-file-lines' },
    { type: 'Final Defense', term: 'Capstone/Thesis 2', icon: 'fa-landmark' }
  ];

  return (
    <div className="student-compliance-page">
      <header className="top-nav">
        <div className="top-nav-leading">
          <div className="page-title">
            <div className="page-title-context">
              <span className="page-kicker">Student Workspace</span>
              <span className="page-breadcrumb" aria-hidden="true">
                <i className="fas fa-angle-right" />
                <span>Defense Compliance</span>
              </span>
            </div>
            <h1>Defense Compliance</h1>
          </div>
        </div>
      </header>

      <div className="page-body grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Last card stretches so both columns end on the same line. */}
        <div className="flex min-w-0 flex-col gap-4 [&>*:last-child]:flex-1">
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
              <span>Loading your defense compliance...</span>
            </div>
          ) : defenses.length === 0 ? (
            <section className="flex flex-col rounded-2xl border border-[var(--border)] border-t-[3px] border-t-[var(--primary)] bg-[var(--surface)] p-5 shadow-sm">
              <span className="text-[11px] font-black uppercase tracking-widest text-[var(--text-meta)]">Your compliance</span>
              <h2 className="mt-1 text-lg font-bold text-[var(--text)]">Nothing to comply with yet</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Compliance opens here after your group passes one of these defenses.
              </p>

              <ul className="mt-4 divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)]">
                {complianceDefenses.map((item) => (
                  <li key={item.type} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-alt)] text-[var(--text-meta)]">
                      <i className={`fas ${item.icon}`} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <strong className="block text-sm font-bold text-[var(--text)]">{item.type}</strong>
                      <span className="block text-xs text-[var(--muted)]">{item.term}</span>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-meta)]">
                      <span className="h-2 w-2 rounded-full bg-slate-300" aria-hidden="true" />
                      Not started
                    </span>
                  </li>
                ))}
              </ul>

              <Link href="/students/schedule" className="mt-auto inline-flex items-center gap-2 self-start pt-4 text-sm font-semibold text-[#003A8F] hover:underline">
                <i className="fas fa-calendar-check" aria-hidden="true" />
                Check your defense schedule
              </Link>
            </section>
          ) : (
            defenses.map((defense) => {
              const latest = defense.submissions[0] ?? null;
              const earlier = defense.submissions.slice(1);

              return (
                <section key={defense.scheduleId} className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                        {defense.scheduleType} · {formatComplianceDate(defense.scheduledAt)}
                      </div>
                      <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">{defense.projectTitle}</h2>
                    </div>
                    <StatusBadge meta={COMPLIANCE_STATUS_META[getComplianceStatusKey(defense)]} />
                  </div>

                  {latest ? <SubmissionCard submission={latest} /> : null}

                  {defense.canSubmit ? (
                    <SubmitForm
                      defense={defense}
                      onSubmitted={(message) => {
                        setNotice(message);
                        loadDefenses();
                      }}
                    />
                  ) : defense.submitBlockedReason && defense.complianceStatus !== 'APPROVED' ? (
                    <p className="text-sm text-[var(--muted)]">{defense.submitBlockedReason}</p>
                  ) : null}

                  {earlier.length ? (
                    <details className="rounded-xl border border-[var(--border)] p-4">
                      <summary className="cursor-pointer text-sm font-semibold text-[var(--text)]">
                        Earlier versions ({earlier.length})
                      </summary>
                      <div className="mt-4 space-y-3">
                        {earlier.map((submission) => (
                          <SubmissionCard key={submission.id} submission={submission} />
                        ))}
                      </div>
                    </details>
                  ) : null}
                </section>
              );
            })
          )}
        </div>

        {/* How it works — replaces the long header paragraph. */}
        <aside className="rounded-2xl border border-[var(--border)] border-t-[3px] border-t-[var(--primary)] bg-[var(--surface)] p-5 shadow-sm">
          <span className="text-[11px] font-black uppercase tracking-widest text-[var(--text-meta)]">How it works</span>
          <ol className="mt-3 flex flex-col">
            {[
              { title: 'Pass your defense', detail: 'Proposal or Final Defense, with panel-required revisions.' },
              { title: 'Submit proof of revisions', detail: 'Upload your revised document and explain what you changed.' },
              { title: 'Each panelist verifies', detail: 'Every panel member checks your revisions separately.' },
              { title: 'Cleared', detail: 'Compliance is cleared once every panelist has verified it.' }
            ].map((step, index, steps) => (
              <li key={step.title} className="relative flex gap-3 pb-4 last:pb-0">
                {index < steps.length - 1 ? (
                  <span className="absolute bottom-0 left-[13px] top-7 w-0.5 bg-[var(--border)]" aria-hidden="true" />
                ) : null}
                <span className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-xs font-black text-[var(--primary)]">
                  {index + 1}
                </span>
                <div className="min-w-0 pt-0.5">
                  <strong className="block text-sm font-bold text-[var(--text)]">{step.title}</strong>
                  <span className="block text-xs leading-relaxed text-[var(--muted)]">{step.detail}</span>
                </div>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
