'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AccountRolesPanel } from './account-roles-panel';
import { RbacDialog, RbacNotice } from './rbac-dialog';
import {
  ACCOUNT_STATUS_BADGE,
  ACCOUNT_STATUS_LABELS,
  ApiRequestError,
  type ApplicationStatus,
  type ApplicationSummary,
  formatDateTime,
  openApplicationDocument,
  requestJson
} from './rbac-client';

type QueueTab = ApplicationStatus | 'all';

const TABS: { value: QueueTab; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' }
];

const APPLICATION_BADGE: Record<ApplicationStatus, { className: string; label: string }> = {
  pending: { className: 'status-pending', label: 'Pending review' },
  verified: { className: 'status-approved', label: 'Verified' },
  rejected: { className: 'status-critical', label: 'Rejected' }
};

const fieldClass =
  'w-full rounded-xl border border-[var(--border,#e2e8f0)] bg-[var(--surface,#fff)] px-3 py-2.5 text-sm text-[var(--text,#0f172a)] outline-none transition focus:border-[var(--primary,#003a8f)] focus:ring-4 focus:ring-[var(--primary,#003a8f)]/10 disabled:opacity-60';
const labelClass = 'mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted,#64748b)]';

type ReviewStep = 'review' | 'verified';

type AccountReviewQueueProps = {
  /** Who this reviewer handles, shown under the heading (differs for System Admin and Program Head). */
  scopeDescription: string;
  /** Called after a request is decided or a role changes (e.g. to refresh a pending count elsewhere). */
  onChange?: () => void;
};

/**
 * Account requests: the reviewer's queue of self-registrations. Opening a request shows the applicant and
 * their identity document; verifying confirms identity only, then offers to assign the requested role
 * (a separate, audited step). Rejecting needs a note the applicant sees on their status page.
 */
export function AccountReviewQueue({ scopeDescription, onChange }: AccountReviewQueueProps) {
  const [tab, setTab] = useState<QueueTab>('pending');
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [banner, setBanner] = useState<string>('');
  const [documentError, setDocumentError] = useState<{ id: string; text: string } | null>(null);
  const [openingDocument, setOpeningDocument] = useState<string | null>(null);

  // Review dialog
  const [reviewing, setReviewing] = useState<ApplicationSummary | null>(null);
  const [reviewStep, setReviewStep] = useState<ReviewStep>('review');
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewBusy, setReviewBusy] = useState<'verify' | 'reject' | 'assign' | null>(null);

  // Roles panel
  const [rolesFor, setRolesFor] = useState<{ userId: string; suggestedRole?: string } | null>(null);

  const load = useCallback(async (status: QueueTab) => {
    setIsLoading(true);
    setLoadError('');

    try {
      const data = await requestJson<{ applications: ApplicationSummary[] }>(`/api/applications?status=${status}`);
      setApplications(data.applications);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load account requests.');
      setApplications([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(tab);
  }, [tab, load]);

  const refreshAfterChange = () => {
    void load(tab);
    onChange?.();
  };

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    if (!needle) {
      return applications;
    }

    return applications.filter((application) =>
      [application.applicant.name, application.applicant.email, application.applicant.studentId, application.requestedRoleLabel]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [applications, query]);

  const openReview = (application: ApplicationSummary) => {
    setReviewing(application);
    setReviewStep('review');
    setNote('');
    setNoteError('');
    setReviewError('');
  };

  const closeReview = () => {
    if (reviewBusy) {
      return;
    }

    setReviewing(null);
  };

  const handleOpenDocument = async (application: ApplicationSummary, side: 'front' | 'back' = 'front') => {
    setDocumentError(null);
    setOpeningDocument(`${application.id}:${side}`);

    try {
      await openApplicationDocument(application.id, side);
    } catch (error) {
      setDocumentError({ id: application.id, text: error instanceof Error ? error.message : 'Unable to open the document.' });
    } finally {
      setOpeningDocument(null);
    }
  };

  const decide = async (decision: 'verify' | 'reject') => {
    if (!reviewing) {
      return;
    }

    if (decision === 'reject' && note.trim().length < 5) {
      setNoteError('Write a short reason the applicant will see (at least 5 characters).');
      return;
    }

    setReviewBusy(decision);
    setReviewError('');
    setNoteError('');

    try {
      const data = await requestJson<{ message: string; application: ApplicationSummary }>(
        `/api/applications/${encodeURIComponent(reviewing.id)}/${decision}`,
        { method: 'POST', body: { note: note.trim() || undefined } }
      );

      if (decision === 'verify') {
        setReviewing(data.application);
        setReviewStep('verified');
      } else {
        setReviewing(null);
        setBanner(data.message);
      }

      refreshAfterChange();
    } catch (error) {
      if (error instanceof ApiRequestError && error.fieldErrors.note) {
        setNoteError(error.fieldErrors.note);
      }
      setReviewError(error instanceof Error ? error.message : 'Unable to save the decision.');
    } finally {
      setReviewBusy(null);
    }
  };

  const assignRequestedRole = async () => {
    if (!reviewing) {
      return;
    }

    setReviewBusy('assign');
    setReviewError('');

    try {
      const data = await requestJson<{ message: string }>(`/api/users/${encodeURIComponent(reviewing.applicant.id)}/roles`, {
        method: 'POST',
        body: { role: reviewing.requestedRole }
      });
      setReviewing(null);
      setBanner(`${data.message} The account is now active.`);
      refreshAfterChange();
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : 'Unable to assign the role.');
    } finally {
      setReviewBusy(null);
    }
  };

  const emptyMessage =
    tab === 'pending'
      ? 'No account requests are waiting for review.'
      : tab === 'verified'
        ? 'No verified requests yet.'
        : tab === 'rejected'
          ? 'No rejected requests.'
          : 'No account requests yet.';

  return (
    <div className="grid gap-4">
      {banner ? (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <RbacNotice tone="success">{banner}</RbacNotice>
          </div>
          <button type="button" className="btn btn-outline small" onClick={() => setBanner('')}>
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Own card styling (not admin-section-card): that class is only styled in the System Admin portal. */}
      <section className="overflow-hidden rounded-2xl bg-[var(--surface,#fff)] shadow-[0_4px_20px_rgba(15,23,42,0.05)] ring-1 ring-[var(--border,#e2e8f0)]">
        <div className="flex flex-col gap-3 border-b border-[var(--border,#e2e8f0)] px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div className="min-w-0">
            <h3 className="m-0 text-lg font-extrabold text-[var(--text,#0f172a)]">Account requests</h3>
            <p className="m-0 mt-1 text-sm leading-6 text-[var(--muted,#64748b)]">{scopeDescription}</p>
          </div>
          <button type="button" className="btn btn-outline small shrink-0 self-start" onClick={() => void load(tab)} disabled={isLoading}>
            <i className={`fas fa-rotate${isLoading ? ' fa-spin' : ''}`} aria-hidden="true" /> Refresh
          </button>
        </div>
        <div className="grid gap-4 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex w-fit flex-wrap rounded-xl bg-[var(--surface-alt,#f1f5f9)] p-1" role="group" aria-label="Filter by status">
              {TABS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={tab === option.value}
                  className={`rounded-lg px-3.5 py-1.5 text-sm font-bold transition ${
                    tab === option.value
                      ? 'bg-[var(--surface,#fff)] text-[var(--text,#0f172a)] shadow-sm'
                      : 'text-[var(--muted,#64748b)] hover:text-[var(--text,#0f172a)]'
                  }`}
                  onClick={() => setTab(option.value)}
                >
                  {option.label}
                  {tab === option.value && !isLoading ? ` (${applications.length})` : ''}
                </button>
              ))}
            </div>
            <div className="relative md:w-72">
              <label className="sr-only" htmlFor="rbac-queue-search">
                Search requests
              </label>
              <i className="fas fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted,#64748b)]" aria-hidden="true" />
              <input
                id="rbac-queue-search"
                className={`${fieldClass} pl-8`}
                type="search"
                placeholder="Search name, email, ID, role"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>

          {loadError ? <RbacNotice tone="error">{loadError}</RbacNotice> : null}

          {isLoading ? (
            <p className="m-0 flex items-center gap-2 py-6 text-sm text-[var(--muted,#64748b)]">
              <i className="fas fa-spinner fa-spin" aria-hidden="true" /> Loading account requests…
            </p>
          ) : !visible.length && !loadError ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-[var(--muted,#64748b)]">
              <i className="fas fa-inbox text-2xl" aria-hidden="true" />
              {query ? 'No requests match your search.' : emptyMessage}
            </div>
          ) : (
            <ul className="m-0 grid list-none gap-2.5 p-0">
              {visible.map((application) => {
                const { applicant } = application;
                const badge = APPLICATION_BADGE[application.status];
                const needsRole = application.status === 'verified' && applicant.accountStatus === 'pending_role_assignment';

                return (
                  <li
                    key={application.id}
                    className="grid gap-3 rounded-2xl border border-[var(--border,#e2e8f0)] bg-[var(--surface,#fff)] p-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center"
                  >
                    <div className="min-w-0">
                      <strong className="block truncate text-sm text-[var(--text,#0f172a)]">{applicant.name}</strong>
                      <span className="block truncate text-xs text-[var(--muted,#64748b)]">{applicant.email}</span>
                      {applicant.studentId ? (
                        <span className="block text-xs text-[var(--muted,#64748b)]">
                          Student ID {applicant.studentId}
                          {applicant.yearLevel ? ` · Year ${applicant.yearLevel}` : ''}
                        </span>
                      ) : null}
                    </div>

                    <div className="min-w-0 text-sm">
                      <span className="block font-bold text-[var(--text,#0f172a)]">{application.requestedRoleLabel}</span>
                      <span className="block text-xs text-[var(--muted,#64748b)]">
                        {application.department ? application.department.name : 'Institution-wide'}
                      </span>
                    </div>

                    <div className="min-w-0 text-xs text-[var(--muted,#64748b)]">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`status-badge ${badge.className}`}>{badge.label}</span>
                        {needsRole ? <span className={`status-badge ${ACCOUNT_STATUS_BADGE.pending_role_assignment}`}>Needs a role</span> : null}
                        {applicant.isSuspended ? <span className="status-badge status-critical">Suspended</span> : null}
                      </div>
                      <span className="mt-1 block">
                        {application.status === 'pending'
                          ? `Submitted ${formatDateTime(application.submittedAt)}`
                          : `${badge.label} ${formatDateTime(application.reviewedAt)}${application.reviewedBy ? ` by ${application.reviewedBy.name}` : ''}`}
                      </span>
                      {application.status === 'rejected' && application.decisionNote ? (
                        <span className="mt-1 block italic">“{application.decisionNote}”</span>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {application.status === 'pending' ? (
                        <button type="button" className="btn btn-primary small" onClick={() => openReview(application)}>
                          <i className="fas fa-user-check" aria-hidden="true" /> Review
                        </button>
                      ) : needsRole ? (
                        <button
                          type="button"
                          className="btn btn-primary small"
                          onClick={() => setRolesFor({ userId: applicant.id, suggestedRole: application.requestedRole })}
                        >
                          <i className="fas fa-user-plus" aria-hidden="true" /> Assign role
                        </button>
                      ) : null}
                      {application.status !== 'pending' ? (
                        <button type="button" className="btn btn-outline small" onClick={() => setRolesFor({ userId: applicant.id })}>
                          <i className="fas fa-clock-rotate-left" aria-hidden="true" /> Roles & history
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <RbacDialog
        open={Boolean(reviewing)}
        title={reviewStep === 'verified' ? 'Identity verified' : 'Review account request'}
        subtitle={reviewing ? `${reviewing.applicant.name} · ${reviewing.requestedRoleLabel}` : null}
        onClose={closeReview}
        busy={Boolean(reviewBusy)}
        focusKey={reviewStep}
        footer={
          reviewing && reviewStep === 'review' ? (
            <>
              <button type="button" className="btn btn-outline" onClick={closeReview} disabled={Boolean(reviewBusy)}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={() => void decide('reject')} disabled={Boolean(reviewBusy)}>
                {reviewBusy === 'reject' ? <i className="fas fa-spinner fa-spin" aria-hidden="true" /> : <i className="fas fa-ban" aria-hidden="true" />}{' '}
                Reject
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void decide('verify')} disabled={Boolean(reviewBusy)}>
                {reviewBusy === 'verify' ? <i className="fas fa-spinner fa-spin" aria-hidden="true" /> : <i className="fas fa-check" aria-hidden="true" />}{' '}
                Verify identity
              </button>
            </>
          ) : reviewing ? (
            <>
              <button type="button" className="btn btn-outline" onClick={closeReview} disabled={Boolean(reviewBusy)}>
                Not now
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void assignRequestedRole()} disabled={Boolean(reviewBusy)} data-autofocus>
                {reviewBusy === 'assign' ? <i className="fas fa-spinner fa-spin" aria-hidden="true" /> : <i className="fas fa-user-plus" aria-hidden="true" />}{' '}
                Assign {reviewing.requestedRoleLabel} role
              </button>
            </>
          ) : null
        }
      >
        {reviewing && reviewStep === 'review' ? (
          <div className="grid gap-4">
            <dl className="m-0 grid gap-x-4 gap-y-3 sm:grid-cols-2">
              {(
                [
                  ['Name', reviewing.applicant.name],
                  ['Email', reviewing.applicant.email],
                  ['Requested role', reviewing.requestedRoleLabel],
                  ['Department', reviewing.department?.name ?? 'Institution-wide'],
                  ...(reviewing.applicant.studentId ? [['Student ID', reviewing.applicant.studentId] as const] : []),
                  ...(reviewing.applicant.yearLevel ? [['Year level', reviewing.applicant.yearLevel] as const] : []),
                  ['Submitted', formatDateTime(reviewing.submittedAt)]
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className={labelClass}>{label}</dt>
                  <dd className="m-0 break-words text-sm text-[var(--text,#0f172a)]">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border,#e2e8f0)] bg-[var(--surface-alt,#f8fafc)] p-3">
              <div className="flex min-w-0 items-center gap-3">
                <i className="fas fa-id-card text-xl text-[var(--primary,#003a8f)]" aria-hidden="true" />
                <div className="min-w-0">
                  <strong className="block text-sm text-[var(--text,#0f172a)]">{reviewing.documentLabel}</strong>
                  <span className="block truncate text-xs text-[var(--muted,#64748b)]">
                    {!reviewing.document ? 'No file on record' : reviewing.documentBack ? 'Front and back' : reviewing.document.fileName}
                  </span>
                </div>
              </div>
              {reviewing.document ? (
                <div className="flex flex-wrap gap-2">
                  {(reviewing.documentBack ? (['front', 'back'] as const) : (['front'] as const)).map((side, index) => {
                    const opening = openingDocument === `${reviewing.id}:${side}`;

                    return (
                      <button
                        key={side}
                        type="button"
                        className="btn btn-outline small"
                        onClick={() => void handleOpenDocument(reviewing, side)}
                        disabled={Boolean(openingDocument)}
                        data-autofocus={index === 0 ? true : undefined}
                      >
                        <i className={`fas ${opening ? 'fa-spinner fa-spin' : 'fa-arrow-up-right-from-square'}`} aria-hidden="true" />{' '}
                        {reviewing.documentBack ? (side === 'front' ? 'Front' : 'Back') : 'Open document'}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
            {documentError?.id === reviewing.id ? <RbacNotice tone="error">{documentError.text}</RbacNotice> : null}
            <p className="m-0 -mt-2 text-xs text-[var(--muted,#64748b)]">
              The link works for 60 seconds, and each view is recorded in the applicant&apos;s history.
            </p>

            <div>
              <label className={labelClass} htmlFor="rbac-review-note">
                Note to the applicant <span className="normal-case tracking-normal">(required to reject)</span>
              </label>
              <textarea
                id="rbac-review-note"
                className={`${fieldClass} min-h-[88px] resize-y`}
                value={note}
                onChange={(event) => {
                  setNote(event.target.value);
                  setNoteError('');
                }}
                maxLength={1000}
                placeholder="e.g. The ID photo is unreadable. Please register again with a clearer copy."
                disabled={Boolean(reviewBusy)}
                aria-invalid={noteError ? 'true' : 'false'}
                aria-describedby={noteError ? 'rbac-review-note-error' : 'rbac-review-note-help'}
              />
              {noteError ? (
                <span className="mt-1 block text-xs font-semibold text-red-600" id="rbac-review-note-error">
                  {noteError}
                </span>
              ) : (
                <span className="mt-1 block text-xs text-[var(--muted,#64748b)]" id="rbac-review-note-help">
                  The applicant sees this on their account status page.
                </span>
              )}
            </div>

            {reviewError ? <RbacNotice tone="error">{reviewError}</RbacNotice> : null}
          </div>
        ) : reviewing ? (
          <div className="grid gap-3">
            <RbacNotice tone="success">
              {reviewing.applicant.name}&apos;s identity is verified. The account stays closed until a role is assigned.
            </RbacNotice>
            <p className="m-0 text-sm text-[var(--text,#0f172a)]">
              They asked for <strong>{reviewing.requestedRoleLabel}</strong>
              {reviewing.department ? ` in ${reviewing.department.name}` : ''}. Assign it now, or later from the{' '}
              <strong>Verified</strong> tab.
            </p>
            <p className="m-0 text-xs text-[var(--muted,#64748b)]">
              Account status: {ACCOUNT_STATUS_LABELS[reviewing.applicant.accountStatus]}
            </p>
            {reviewError ? <RbacNotice tone="error">{reviewError}</RbacNotice> : null}
          </div>
        ) : null}
      </RbacDialog>

      <AccountRolesPanel
        userId={rolesFor?.userId ?? null}
        suggestedRole={rolesFor?.suggestedRole}
        onClose={() => setRolesFor(null)}
        onChanged={refreshAfterChange}
      />
    </div>
  );
}
