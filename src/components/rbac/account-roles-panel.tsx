'use client';

import { useCallback, useEffect, useState } from 'react';
import { RbacDialog, RbacNotice } from './rbac-dialog';
import {
  ACCOUNT_STATUS_BADGE,
  ACCOUNT_STATUS_LABELS,
  ApiRequestError,
  type HistoryEntry,
  type RoleAssignment,
  type RolesSummary,
  formatDateTime,
  requestJson
} from './rbac-client';

type AccountRolesPanelProps = {
  /** The account to manage; null keeps the panel closed. */
  userId: string | null;
  onClose: () => void;
  /** Called after a role is granted or removed, so the caller can refresh its list. */
  onChanged?: () => void;
  /** Preselects this role in "Assign a role" (e.g. the role the applicant asked for). */
  suggestedRole?: string;
};

const fieldClass =
  'w-full rounded-xl border border-[var(--border,#e2e8f0)] bg-[var(--surface,#fff)] px-3 py-2.5 text-sm text-[var(--text,#0f172a)] outline-none transition focus:border-[var(--primary,#003a8f)] focus:ring-4 focus:ring-[var(--primary,#003a8f)]/10 disabled:opacity-60';
const labelClass = 'mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted,#64748b)]';

function scopeLabel(assignment: RoleAssignment) {
  if (assignment.scope === 'INSTITUTION') {
    return 'Institution-wide';
  }

  if (assignment.scope === 'NONE') {
    return 'No department (own records only)';
  }

  return `${assignment.departmentId ?? assignment.scope} department`;
}

/**
 * Roles & history for one account: the roles they hold (with remove), the roles the signed-in reviewer may
 * assign, and the account's audit trail. Everything shown and allowed comes from the server's policy.
 */
export function AccountRolesPanel({ userId, onClose, onChanged, suggestedRole }: AccountRolesPanelProps) {
  const [tab, setTab] = useState<'roles' | 'history'>('roles');
  const [summary, setSummary] = useState<RolesSummary | null>(null);
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [grantRole, setGrantRole] = useState('');
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeError, setRevokeError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showRemoved, setShowRemoved] = useState(false);

  const load = useCallback(async (id: string) => {
    setLoadError('');

    try {
      const data = await requestJson<RolesSummary>(`/api/users/${encodeURIComponent(id)}/roles`);
      setSummary(data);
      setGrantRole((current) => {
        const options = data.grantableRoles.map((option) => option.role);
        if (current && options.includes(current)) return current;
        return suggestedRole && options.includes(suggestedRole) ? suggestedRole : '';
      });
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load this account.');
    }
  }, [suggestedRole]);

  const loadHistory = useCallback(async (id: string) => {
    try {
      const data = await requestJson<{ history: HistoryEntry[] }>(`/api/users/${encodeURIComponent(id)}/history`);
      setHistory(data.history);
    } catch (error) {
      setHistory([]);
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to load the history.' });
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      return;
    }

    setTab('roles');
    setSummary(null);
    setHistory(null);
    setNotice(null);
    setRevokingId(null);
    setShowRemoved(false);
    void load(userId);
  }, [userId, load]);

  useEffect(() => {
    if (userId && tab === 'history' && history === null) {
      void loadHistory(userId);
    }
  }, [userId, tab, history, loadHistory]);

  const handleGrant = async () => {
    if (!userId || !grantRole) {
      return;
    }

    setBusy(true);
    setNotice(null);

    try {
      const data = await requestJson<RolesSummary & { message: string }>(`/api/users/${encodeURIComponent(userId)}/roles`, {
        method: 'POST',
        body: { role: grantRole }
      });
      setSummary(data);
      setGrantRole('');
      setHistory(null);
      setNotice({ tone: 'success', text: data.message });
      onChanged?.();
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to assign the role.' });
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async (assignment: RoleAssignment) => {
    if (!userId) {
      return;
    }

    if (revokeReason.trim().length < 5) {
      setRevokeError('Give a short reason (at least 5 characters).');
      return;
    }

    setBusy(true);
    setNotice(null);
    setRevokeError('');

    try {
      const data = await requestJson<RolesSummary & { message: string }>(
        `/api/users/${encodeURIComponent(userId)}/roles/${encodeURIComponent(assignment.id)}/revoke`,
        { method: 'POST', body: { reason: revokeReason.trim() } }
      );
      setSummary(data);
      setRevokingId(null);
      setRevokeReason('');
      setHistory(null);
      setNotice({ tone: 'success', text: data.message });
      onChanged?.();
    } catch (error) {
      if (error instanceof ApiRequestError && error.fieldErrors.reason) {
        setRevokeError(error.fieldErrors.reason);
      } else {
        setNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Unable to remove the role.' });
      }
    } finally {
      setBusy(false);
    }
  };

  const active = summary?.assignments.filter((assignment) => assignment.status === 'active') ?? [];
  const removed = summary?.assignments.filter((assignment) => assignment.status !== 'active') ?? [];
  const user = summary?.user;

  return (
    <RbacDialog
      open={Boolean(userId)}
      title={user ? user.name : 'Roles & history'}
      subtitle={
        user ? (
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="break-all">{user.email}</span>
            {user.department ? <span>· {user.department}</span> : null}
            <span className={`status-badge ${ACCOUNT_STATUS_BADGE[user.accountStatus]}`}>{ACCOUNT_STATUS_LABELS[user.accountStatus]}</span>
            {user.isSuspended ? <span className="status-badge status-critical">Suspended</span> : null}
          </span>
        ) : null
      }
      onClose={onClose}
      busy={busy}
      maxWidth={680}
    >
      {loadError ? (
        <RbacNotice tone="error">{loadError}</RbacNotice>
      ) : !summary ? (
        <p className="m-0 flex items-center gap-2 text-sm text-[var(--muted,#64748b)]">
          <i className="fas fa-spinner fa-spin" aria-hidden="true" /> Loading account…
        </p>
      ) : (
        <div className="grid gap-4">
          <div className="inline-flex w-fit rounded-xl bg-[var(--surface-alt,#f1f5f9)] p-1" role="tablist" aria-label="Account sections">
            {(['roles', 'history'] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-bold transition ${
                  tab === value
                    ? 'bg-[var(--surface,#fff)] text-[var(--text,#0f172a)] shadow-sm'
                    : 'text-[var(--muted,#64748b)] hover:text-[var(--text,#0f172a)]'
                }`}
                onClick={() => setTab(value)}
              >
                {value === 'roles' ? 'Roles' : 'History'}
              </button>
            ))}
          </div>

          {notice ? <RbacNotice tone={notice.tone}>{notice.text}</RbacNotice> : null}

          {tab === 'roles' ? (
            <>
              <section aria-labelledby="rbac-active-roles">
                <h4 className={labelClass} id="rbac-active-roles">
                  Current roles
                </h4>
                {active.length ? (
                  <ul className="m-0 grid list-none gap-2 p-0">
                    {active.map((assignment) => (
                      <li key={assignment.id} className="rounded-xl border border-[var(--border,#e2e8f0)] p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <strong className="block text-sm text-[var(--text,#0f172a)]">{assignment.label}</strong>
                            <span className="text-xs text-[var(--muted,#64748b)]">
                              {scopeLabel(assignment)} · since {formatDateTime(assignment.grantedAt)}
                              {assignment.grantedBy ? ` by ${assignment.grantedBy.name}` : ' (set up by the system)'}
                            </span>
                          </div>
                          {assignment.canRevoke && revokingId !== assignment.id ? (
                            <button
                              type="button"
                              className="btn btn-outline small"
                              onClick={() => {
                                setRevokingId(assignment.id);
                                setRevokeReason('');
                                setRevokeError('');
                              }}
                              disabled={busy}
                            >
                              <i className="fas fa-user-minus" aria-hidden="true" /> Remove
                            </button>
                          ) : null}
                        </div>
                        {revokingId === assignment.id ? (
                          <div className="mt-3 grid gap-2">
                            <label className={labelClass} htmlFor={`revoke-${assignment.id}`}>
                              Reason for removing {assignment.label}
                            </label>
                            <textarea
                              id={`revoke-${assignment.id}`}
                              className={`${fieldClass} min-h-[72px] resize-y`}
                              value={revokeReason}
                              onChange={(event) => {
                                setRevokeReason(event.target.value);
                                setRevokeError('');
                              }}
                              maxLength={500}
                              disabled={busy}
                              aria-invalid={revokeError ? 'true' : 'false'}
                              aria-describedby={revokeError ? `revoke-${assignment.id}-error` : undefined}
                              data-autofocus
                            />
                            {revokeError ? (
                              <span className="text-xs font-semibold text-red-600" id={`revoke-${assignment.id}-error`}>
                                {revokeError}
                              </span>
                            ) : (
                              <span className="text-xs text-[var(--muted,#64748b)]">
                                Kept in the account history. They lose access to this workspace right away.
                              </span>
                            )}
                            <div className="flex flex-wrap justify-end gap-2">
                              <button type="button" className="btn btn-outline small" onClick={() => setRevokingId(null)} disabled={busy}>
                                Cancel
                              </button>
                              <button type="button" className="btn btn-danger small" onClick={() => void handleRevoke(assignment)} disabled={busy}>
                                {busy ? <i className="fas fa-spinner fa-spin" aria-hidden="true" /> : null} Remove role
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="m-0 text-sm text-[var(--muted,#64748b)]">No active roles. The account can&apos;t open any workspace yet.</p>
                )}
              </section>

              <section aria-labelledby="rbac-assign-role">
                <h4 className={labelClass} id="rbac-assign-role">
                  Assign a role
                </h4>
                {user?.accountStatus === 'pending_verification' ? (
                  <p className="m-0 text-sm text-[var(--muted,#64748b)]">Verify this person&apos;s identity before assigning a role.</p>
                ) : active.some((assignment) => assignment.role === 'student') ? (
                  <p className="m-0 flex items-start gap-2 text-sm text-[var(--muted,#64748b)]">
                    <i className="fas fa-lock mt-0.5" aria-hidden="true" />
                    Student accounts can only hold the Student role, so no other role can be added.
                  </p>
                ) : summary.grantableRoles.length ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <label className="sr-only" htmlFor="rbac-grant-role">
                      Role to assign
                    </label>
                    <select
                      id="rbac-grant-role"
                      className={fieldClass}
                      value={grantRole}
                      onChange={(event) => setGrantRole(event.target.value)}
                      disabled={busy}
                    >
                      <option value="">Choose a role…</option>
                      {summary.grantableRoles.map((option) => (
                        <option key={option.role} value={option.role}>
                          {option.label}
                          {option.role === suggestedRole ? ' (requested)' : ''}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="btn btn-primary shrink-0" onClick={() => void handleGrant()} disabled={busy || !grantRole}>
                      {busy ? <i className="fas fa-spinner fa-spin" aria-hidden="true" /> : <i className="fas fa-user-plus" aria-hidden="true" />} Assign
                    </button>
                  </div>
                ) : (
                  <p className="m-0 text-sm text-[var(--muted,#64748b)]">
                    There are no roles you can assign to this person. Department roles are assigned by that department&apos;s Program
                    Head; institution roles by a System Administrator.
                  </p>
                )}
              </section>

              {removed.length ? (
                <section>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 bg-transparent p-0 text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted,#64748b)] hover:text-[var(--text,#0f172a)]"
                    onClick={() => setShowRemoved((current) => !current)}
                    aria-expanded={showRemoved}
                  >
                    <i className={`fas fa-chevron-${showRemoved ? 'down' : 'right'} text-[0.65rem]`} aria-hidden="true" />
                    Removed roles ({removed.length})
                  </button>
                  {showRemoved ? (
                    <ul className="m-0 mt-2 grid list-none gap-2 p-0">
                      {removed.map((assignment) => (
                        <li key={assignment.id} className="rounded-xl border border-dashed border-[var(--border,#e2e8f0)] p-3 text-xs text-[var(--muted,#64748b)]">
                          <strong className="text-sm text-[var(--text,#0f172a)] line-through">{assignment.label}</strong>
                          <div>
                            Removed {formatDateTime(assignment.revokedAt)}
                            {assignment.revokedBy ? ` by ${assignment.revokedBy.name}` : ''}
                            {assignment.revokeReason ? ` — “${assignment.revokeReason}”` : ''}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ) : null}
            </>
          ) : history === null ? (
            <p className="m-0 flex items-center gap-2 text-sm text-[var(--muted,#64748b)]">
              <i className="fas fa-spinner fa-spin" aria-hidden="true" /> Loading history…
            </p>
          ) : history.length ? (
            <ol className="m-0 grid list-none gap-0 border-l-2 border-[var(--border,#e2e8f0)] p-0 pl-4">
              {history.map((entry) => (
                <li key={entry.id} className="relative pb-4 last:pb-0">
                  <span className="absolute -left-[1.4rem] top-1 h-2.5 w-2.5 rounded-full bg-[var(--primary,#003a8f)] ring-4 ring-[var(--surface,#fff)]" aria-hidden="true" />
                  <strong className="block text-sm text-[var(--text,#0f172a)]">
                    {entry.label}
                    {entry.role ? `: ${entry.role}` : ''}
                    {entry.from && entry.to ? ` (${entry.from.replace(/_/g, ' ')} → ${entry.to.replace(/_/g, ' ')})` : ''}
                  </strong>
                  <span className="text-xs text-[var(--muted,#64748b)]">
                    {formatDateTime(entry.createdAt)}
                    {entry.actor ? ` · ${entry.actor.name}` : ''}
                  </span>
                  {entry.note ? <p className="m-0 mt-1 text-sm text-[var(--text,#0f172a)]">“{entry.note}”</p> : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="m-0 text-sm text-[var(--muted,#64748b)]">No recorded activity for this account yet.</p>
          )}
        </div>
      )}
    </RbacDialog>
  );
}
