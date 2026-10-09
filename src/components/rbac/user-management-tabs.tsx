'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { requestJson } from './rbac-client';

export type UserManagementView = 'accounts' | 'requests';

/**
 * User Management's two views (accounts, account requests), kept in the URL as ?tab=requests so links and
 * the old /…/applications address can open the requests view directly. Also loads the pending-request count.
 */
export function useUserManagementView(basePath: string) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<UserManagementView>(() => (searchParams.get('tab') === 'requests' ? 'requests' : 'accounts'));
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  const refreshPendingCount = useCallback(async () => {
    try {
      const data = await requestJson<{ applications: unknown[] }>('/api/applications?status=pending');
      setPendingCount(data.applications.length);
    } catch {
      setPendingCount(null);
    }
  }, []);

  useEffect(() => {
    void refreshPendingCount();
  }, [refreshPendingCount]);

  const changeView = useCallback(
    (nextView: UserManagementView) => {
      setView(nextView);
      router.replace(nextView === 'requests' ? `${basePath}?tab=requests` : basePath, { scroll: false });
    },
    [basePath, router]
  );

  return { view, changeView, pendingCount, refreshPendingCount };
}

export function UserManagementTabs({
  view,
  onChange,
  pendingCount
}: {
  view: UserManagementView;
  onChange: (view: UserManagementView) => void;
  pendingCount: number | null;
}) {
  return (
    <div
      className="grid w-full grid-cols-2 gap-1 rounded-2xl sm:inline-flex sm:w-fit bg-[var(--surface,#fff)] p-1.5 shadow-[0_4px_20px_rgba(15,23,42,0.05)] ring-1 ring-[var(--border,#e2e8f0)]"
      role="tablist"
      aria-label="User management sections"
    >
      {(
        [
          { value: 'accounts', label: 'Accounts', short: 'Accounts', icon: 'fa-users-gear' },
          { value: 'requests', label: 'Account requests', short: 'Requests', icon: 'fa-user-check' }
        ] as const
      ).map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={view === option.value}
          className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition sm:px-4 ${
            view === option.value
              ? 'bg-[var(--primary-soft,rgba(0,58,143,0.1))] text-[var(--primary,#003a8f)] ring-1 ring-inset ring-[var(--primary,#003a8f)]/30'
              : 'text-[var(--muted,#64748b)] hover:bg-[var(--surface-alt,#f1f5f9)] hover:text-[var(--text,#0f172a)]'
          }`}
          onClick={() => onChange(option.value)}
        >
          <i className={`fas ${option.icon}`} aria-hidden="true" />
          <span className="sm:hidden">{option.short}</span>
          <span className="hidden sm:inline">{option.label}</span>
          {option.value === 'requests' && pendingCount ? (
            <span
              className="inline-flex min-w-[1.4rem] items-center justify-center rounded-full bg-amber-400 px-1.5 text-xs font-extrabold text-slate-900"
              aria-label={`${pendingCount} pending`}
            >
              {pendingCount}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
