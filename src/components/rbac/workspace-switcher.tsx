'use client';

import { useEffect, useState } from 'react';
import { resetAuthVerificationCache } from '@/components/auth/protected-route';
import { getRoleRedirectPath, persistAuthenticatedUser } from '@/lib/client-auth';
import { requestJson } from './rbac-client';

type WorkspaceOption = { id: string; role: string; label: string; departmentId: string | null };
type AccountSummary = { workspace: WorkspaceOption | null; workspaces: WorkspaceOption[] };

// Loaded once per page load and shared by every menu instance.
let accountRequest: Promise<AccountSummary | null> | null = null;

function loadAccount() {
  accountRequest ??= requestJson<{ account: AccountSummary }>('/api/auth/workspace')
    .then((data) => data.account)
    .catch(() => null);
  return accountRequest;
}

/**
 * "Switch role" for people who hold more than one role (e.g. an Adviser who is also a Panel Member). Roles never
 * combine: each workspace is one role, and the server only accepts the user's own active assignments. Renders
 * nothing for single-role accounts.
 */
export function WorkspaceSwitcher({ renderSection }: { renderSection: (content: React.ReactNode) => React.ReactNode }) {
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void loadAccount().then((summary) => {
      if (!cancelled) setAccount(summary);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!account || account.workspaces.length < 2) {
    return null;
  }

  const switchTo = async (option: WorkspaceOption) => {
    setSwitchingId(option.id);
    setError('');

    try {
      const data = await requestJson<{ user: Parameters<typeof persistAuthenticatedUser>[0] & { role: Parameters<typeof getRoleRedirectPath>[0] } }>(
        '/api/auth/workspace',
        { method: 'POST', body: { workspaceId: option.id } }
      );
      persistAuthenticatedUser(data.user);
      resetAuthVerificationCache();
      // Full navigation so every portal-level cache starts fresh in the new role.
      window.location.assign(getRoleRedirectPath(data.user.role));
    } catch (switchError) {
      setError(switchError instanceof Error ? switchError.message : 'Unable to switch roles.');
      setSwitchingId(null);
    }
  };

  return renderSection(
    <>
      <span className="portal-shell-profile-dropdown-label">Switch role</span>
      <div className="grid gap-1" role="group" aria-label="Your roles">
        {account.workspaces.map((option) => {
          const isCurrent = option.id === account.workspace?.id;

          return (
            <button
              key={option.id}
              type="button"
              className={`portal-shell-profile-link${isCurrent ? ' is-current' : ''}`}
              aria-current={isCurrent ? 'true' : undefined}
              disabled={isCurrent || Boolean(switchingId)}
              onClick={() => void switchTo(option)}
            >
              <i
                aria-hidden="true"
                className={`fas ${switchingId === option.id ? 'fa-spinner fa-spin' : isCurrent ? 'fa-circle-check' : 'fa-repeat'}`}
              />
              <span className="min-w-0 flex-1 text-left">
                {option.label}
                {option.departmentId ? ` · ${option.departmentId}` : ''}
              </span>
              {isCurrent ? <small className="opacity-70">Current</small> : null}
            </button>
          );
        })}
      </div>
      {error ? (
        <p className="m-0 mt-1 text-xs font-semibold text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
