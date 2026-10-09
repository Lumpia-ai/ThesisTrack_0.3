'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogoIcon } from '@/components/branding/logo-icon';
import { getRoleRedirectPath, logoutWithApi } from '@/lib/client-auth';
import { authUi, cx } from './auth-ui';

type ApplicationSummary = {
  id: string;
  requestedRoleLabel: string;
  department: { id: string; name: string } | null;
  documentLabel: string;
  status: 'pending' | 'verified' | 'rejected';
  decisionNote: string | null;
  reviewedAt: string | null;
  submittedAt: string;
};

type AccountSummary = {
  status: 'pending_verification' | 'pending_role_assignment' | 'active' | 'rejected';
  hasAccess: boolean;
  blockedReason: string | null;
  workspace: { role: Parameters<typeof getRoleRedirectPath>[0] } | null;
};

type StatusResponse = {
  success?: boolean;
  message?: string;
  user?: { name: string; email: string };
  account?: AccountSummary;
  applications?: ApplicationSummary[];
};

type Tone = 'info' | 'success' | 'danger';

const STATUS_COPY: Record<AccountSummary['status'], { title: string; body: string; tone: Tone; icon: string }> = {
  pending_verification: {
    title: 'Waiting for identity verification',
    body: 'We received your registration. A reviewer will check your document and verify your identity. You can sign out and come back any time.',
    tone: 'info',
    icon: 'fa-hourglass-half'
  },
  pending_role_assignment: {
    title: 'Verified, waiting for a role',
    body: 'Your identity has been verified. Your account opens as soon as a role is assigned to you.',
    tone: 'info',
    icon: 'fa-user-check'
  },
  active: {
    title: 'Your account is active',
    body: 'You can now use ThesisTrack.',
    tone: 'success',
    icon: 'fa-circle-check'
  },
  rejected: {
    title: 'Registration not approved',
    body: 'Your registration was not approved. See the reviewer\'s note below, or contact the office that reviewed it.',
    tone: 'danger',
    icon: 'fa-circle-xmark'
  }
};

const TONE_CLASSES: Record<Tone, { banner: string; icon: string; title: string }> = {
  info: { banner: 'border-[#003A8F]/15 bg-[#EAF1FB]', icon: 'bg-white text-[#003A8F] ring-[#003A8F]/15', title: 'text-[#003A8F]' },
  success: { banner: 'border-emerald-200 bg-emerald-50', icon: 'bg-white text-emerald-600 ring-emerald-200', title: 'text-emerald-800' },
  danger: { banner: 'border-red-200 bg-red-50', icon: 'bg-white text-red-600 ring-red-200', title: 'text-red-800' }
};

const APPLICATION_STATUS: Record<ApplicationSummary['status'], { label: string; pill: string; icon: string }> = {
  pending: { label: 'Pending review', pill: 'bg-amber-50 text-amber-700 ring-amber-200', icon: 'fa-clock' },
  verified: { label: 'Verified', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: 'fa-circle-check' },
  rejected: { label: 'Rejected', pill: 'bg-red-50 text-red-700 ring-red-200', icon: 'fa-circle-xmark' }
};

type StepState = 'done' | 'current' | 'upcoming' | 'failed';

/** The three stages every account goes through, and where this one stands. */
function getProgressSteps(status: AccountSummary['status']): Array<{ label: string; state: StepState }> {
  const verification: StepState =
    status === 'rejected' ? 'failed' : status === 'pending_verification' ? 'current' : 'done';
  const role: StepState =
    status === 'active' ? 'done' : status === 'pending_role_assignment' ? 'current' : 'upcoming';

  return [
    { label: 'Registered', state: 'done' },
    { label: 'Identity verified', state: verification },
    { label: 'Role assigned', state: role }
  ];
}

const STEP_DOT: Record<StepState, string> = {
  done: 'border-[#003A8F] bg-[#003A8F] text-white',
  current: 'border-[#003A8F] bg-white text-[#003A8F] ring-4 ring-[#003A8F]/10',
  upcoming: 'border-slate-300 bg-white text-slate-400',
  failed: 'border-red-500 bg-red-500 text-white'
};

const STEP_LABEL: Record<StepState, string> = {
  done: 'text-[#003A8F]',
  current: 'text-[#102033]',
  upcoming: 'text-slate-400',
  failed: 'text-red-700'
};

function formatDate(value: string | null) {
  return value
    ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : '';
}

/** The only page a pending, rejected or role-less account can open: its own application status. */
export function AccountStatusPage() {
  const router = useRouter();
  const [data, setData] = useState<StatusResponse | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/account/application', { cache: 'no-store', credentials: 'same-origin' });
      const payload = (await response.json().catch(() => null)) as StatusResponse | null;

      if (response.status === 401) {
        router.replace('/login');
        return;
      }

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Unable to load your application status.');
      }

      setData(payload);
      setLastChecked(new Date());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load your application status.');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSignOut = async () => {
    await logoutWithApi();
    window.location.href = '/login';
  };

  const account = data?.account;
  const copy = account ? STATUS_COPY[account.status] : null;
  const isActiveWithoutRole = account?.status === 'active' && !account.hasAccess;
  const tone: Tone | null = copy ? (isActiveWithoutRole ? 'info' : copy.tone) : null;
  const steps = account ? getProgressSteps(account.status) : [];
  const canOpenDashboard = Boolean(account?.hasAccess && account.workspace);

  return (
    <main className={authUi.page}>
      <div className={authUi.pageWash} aria-hidden="true" />
      <div className={authUi.pagePattern} aria-hidden="true" />

      <section className={authUi.shell} aria-labelledby="account-status-title">
        <div className="w-full max-w-xl rounded-[28px] border border-white/60 bg-white/95 p-6 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.25)] backdrop-blur sm:p-8">
          <header className="mb-6 flex items-center gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white p-2 shadow ring-1 ring-slate-900/5">
              <LogoIcon style={{ width: 'auto' }} className="h-full" />
            </span>
            <div className="min-w-0">
              <h1 id="account-status-title" className="m-0 text-xl font-extrabold text-[#102033]">Account status</h1>
              {data?.user ? (
                <p className="m-0 truncate text-sm font-medium text-slate-500">
                  <span className="font-semibold text-slate-700">{data.user.name}</span> · {data.user.email}
                </p>
              ) : null}
            </div>
          </header>

          {isLoading && !data ? (
            <div className="grid gap-3" role="status" aria-label="Loading your application">
              <div className="h-8 animate-pulse rounded-full bg-slate-100" />
              <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-36 animate-pulse rounded-2xl bg-slate-100" />
            </div>
          ) : null}

          {error ? (
            <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700" role="alert">
              <i className="fas fa-triangle-exclamation mt-0.5" aria-hidden="true" />
              {error}
            </div>
          ) : null}

          {steps.length ? (
            <ol className="m-0 mb-5 flex list-none items-start p-0" aria-label="Registration progress">
              {steps.map((step, index) => (
                <li key={step.label} className="relative flex flex-1 flex-col items-center text-center">
                  {index > 0 ? (
                    <span
                      className={cx(
                        'absolute right-1/2 top-3.5 h-0.5 w-full -translate-y-1/2',
                        step.state === 'upcoming' ? 'bg-slate-200' : step.state === 'failed' ? 'bg-red-300' : 'bg-[#003A8F]'
                      )}
                      aria-hidden="true"
                    />
                  ) : null}
                  <span
                    className={cx('relative inline-flex h-7 w-7 items-center justify-center rounded-full border-2 text-[0.7rem] font-extrabold', STEP_DOT[step.state])}
                    aria-hidden="true"
                  >
                    {step.state === 'done' ? (
                      <i className="fas fa-check" />
                    ) : step.state === 'failed' ? (
                      <i className="fas fa-xmark" />
                    ) : step.state === 'current' ? (
                      <span className="h-2 w-2 animate-pulse rounded-full bg-[#003A8F]" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className={cx('mt-1.5 text-xs font-bold', STEP_LABEL[step.state])}>
                    {step.label}
                    <span className="sr-only">
                      {step.state === 'done' ? ', done' : step.state === 'current' ? ', in progress' : step.state === 'failed' ? ', not approved' : ', not yet'}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          ) : null}

          {copy && tone ? (
            <div className={cx('mb-5 flex items-start gap-3 rounded-2xl border p-4', TONE_CLASSES[tone].banner)} role="status">
              <span className={cx('inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1', TONE_CLASSES[tone].icon)} aria-hidden="true">
                <i className={`fas ${isActiveWithoutRole ? 'fa-user-lock' : copy.icon}`} />
              </span>
              <div className="min-w-0">
                <strong className={cx('block text-[15px] font-extrabold', TONE_CLASSES[tone].title)}>
                  {isActiveWithoutRole ? 'Your account has no usable role' : copy.title}
                </strong>
                <p className="m-0 mt-1 text-sm font-medium leading-6 text-slate-600">
                  {isActiveWithoutRole ? account?.blockedReason : copy.body}
                </p>
              </div>
            </div>
          ) : null}

          {data?.applications?.length ? (
            <div className="space-y-3">
              {data.applications.map((application) => {
                const status = APPLICATION_STATUS[application.status];
                const rows = [
                  { icon: 'fa-user-tag', label: 'Requested role', value: application.requestedRoleLabel },
                  application.department ? { icon: 'fa-building-columns', label: 'Department', value: application.department.name } : null,
                  { icon: 'fa-id-card', label: 'Document', value: application.documentLabel },
                  { icon: 'fa-calendar', label: 'Submitted', value: formatDate(application.submittedAt) },
                  application.reviewedAt ? { icon: 'fa-calendar-check', label: 'Reviewed', value: formatDate(application.reviewedAt) } : null
                ].filter((row): row is { icon: string; label: string; value: string } => row !== null);

                return (
                  <section key={application.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-label="Your application">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
                      <h2 className="m-0 text-[13px] font-extrabold uppercase tracking-wide text-slate-500">Your application</h2>
                      <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1', status.pill)}>
                        <i className={`fas ${status.icon} text-[0.65rem]`} aria-hidden="true" />
                        {status.label}
                      </span>
                    </div>
                    <dl className="m-0 grid gap-x-4 gap-y-2.5 p-4 text-sm sm:grid-cols-[auto_1fr]">
                      {rows.map((row) => (
                        <div key={row.label} className="contents">
                          <dt className="flex items-center gap-2 font-semibold text-slate-500">
                            <i className={`fas ${row.icon} w-4 text-center text-xs text-slate-400`} aria-hidden="true" />
                            {row.label}
                          </dt>
                          <dd className="m-0 -mt-1.5 pl-6 font-semibold text-slate-800 sm:mt-0 sm:pl-0">{row.value}</dd>
                        </div>
                      ))}
                    </dl>
                    {application.decisionNote ? (
                      <div className="mx-4 mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="m-0 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                          <i className="fas fa-comment-dots" aria-hidden="true" /> Reviewer note
                        </p>
                        <p className="m-0 mt-1 whitespace-pre-line text-sm font-medium text-slate-800">{application.decisionNote}</p>
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {canOpenDashboard ? (
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#003A8F] px-4 text-sm font-bold text-white shadow-[0_8px_18px_rgba(0,58,143,0.22)] transition hover:bg-[#002F75]"
                onClick={() => {
                  window.location.href = getRoleRedirectPath(account!.workspace!.role);
                }}
              >
                Go to your dashboard
                <i className="fas fa-arrow-right" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#003A8F] bg-[#003A8F] px-4 text-sm font-bold text-white shadow-[0_8px_18px_rgba(0,58,143,0.22)] transition hover:bg-[#002F75] disabled:cursor-wait disabled:opacity-80"
                onClick={() => void load()}
                disabled={isLoading}
              >
                <i className={cx('fas fa-rotate', isLoading && 'animate-spin')} aria-hidden="true" />
                {isLoading ? 'Checking…' : 'Check status'}
              </button>
            )}
            {lastChecked && !canOpenDashboard ? (
              <span className="text-xs font-medium text-slate-500" aria-live="polite">
                Last checked {lastChecked.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              </span>
            ) : null}
            <button
              type="button"
              className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-slate-500 transition hover:bg-red-50 hover:text-red-700"
              onClick={() => void handleSignOut()}
            >
              <i className="fas fa-right-from-bracket" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
