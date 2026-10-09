'use client';

import { useEffect, useMemo, useState } from 'react';
import { RbacDialog, RbacNotice } from '@/components/rbac/rbac-dialog';
import { RowActionsMenu, type RowAction } from '@/components/shared/row-actions-menu';
import { ROLE_CATALOG } from '@/lib/rbac/catalog';

export type DirectoryUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  isSuspended?: boolean;
  suspendedAt?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  studentId?: string | null;
  department?: string | null;
  yearLevel?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type Banner = { tone: 'success' | 'warning'; title: string; body: string };
type StatusFilter = 'all' | 'active' | 'suspended' | 'incomplete';
type SortKey = 'updated' | 'name' | 'role';

type ProgramHeadAccountsDirectoryProps = {
  users: DirectoryUser[];
  isLoading: boolean;
  isRefreshing: boolean;
  banner: Banner | null;
  onDismissBanner: () => void;
  onRefresh: () => void;
  onAddAdviser: () => void;
  onEdit: (user: DirectoryUser) => void;
  onManageRoles: (user: DirectoryUser) => void;
  /** Resolves true when the change was saved. */
  onSetSuspended: (user: DirectoryUser, suspended: boolean) => Promise<boolean>;
  busyUserId: string | null;
};

const PAGE_SIZE = 10;

// Role pills: one hue per role so the table scans quickly. Tints work on light and dark surfaces.
const ROLE_TONES: Record<string, string> = {
  student: 'bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300',
  adviser: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300',
  panel: 'bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-300',
  focal_person: 'bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300',
  secretary: 'bg-teal-500/10 text-teal-700 ring-teal-500/20 dark:text-teal-300',
  partner: 'bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-300'
};
const AVATAR_TONES = ['from-[#003a8f] to-[#1a4fb8]', 'from-emerald-600 to-teal-500', 'from-violet-600 to-indigo-500', 'from-amber-500 to-orange-500', 'from-sky-600 to-cyan-500', 'from-rose-600 to-pink-500'];

export function roleLabelFor(role: string) {
  const info = ROLE_CATALOG[role.toUpperCase() as keyof typeof ROLE_CATALOG];
  return info?.label ?? role.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function canManageAccount(user: DirectoryUser) {
  // Program Heads may edit, suspend and restore Adviser accounts only (enforced again by the server).
  return user.role === 'adviser';
}

function missingDetails(user: DirectoryUser) {
  const missing: string[] = [];
  if (!user.department) missing.push('department');
  if (user.role === 'student') {
    if (!user.studentId) missing.push('student ID');
    if (!user.yearLevel) missing.push('year level');
  }
  return missing;
}

function initialsOf(user: DirectoryUser) {
  const source = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name;
  return source.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('');
}

function avatarTone(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function RolePill({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${ROLE_TONES[role] ?? 'bg-slate-500/10 text-slate-700 ring-slate-500/20 dark:text-slate-300'}`}>
      {roleLabelFor(role)}
    </span>
  );
}

function StatusCell({ user }: { user: DirectoryUser }) {
  const missing = missingDetails(user);

  return (
    <div className="grid gap-1">
      <span
        className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
          user.isSuspended ? 'bg-red-500/10 text-red-700 dark:text-red-300' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${user.isSuspended ? 'bg-red-500' : 'bg-emerald-500'}`} aria-hidden="true" />
        {user.isSuspended ? 'Suspended' : 'Active'}
      </span>
      {missing.length ? (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
          <i className="fas fa-triangle-exclamation text-[10px]" aria-hidden="true" /> Missing {missing.join(', ')}
        </span>
      ) : null}
    </div>
  );
}

function Avatar({ user, size = 'md' }: { user: DirectoryUser; size?: 'md' | 'lg' }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white shadow-sm ${avatarTone(user.id)} ${
        size === 'lg' ? 'h-14 w-14 text-lg' : 'h-10 w-10 text-sm'
      } ${user.isSuspended ? 'opacity-50 grayscale' : ''}`}
      aria-hidden="true"
    >
      {initialsOf(user)}
    </span>
  );
}

export function ProgramHeadAccountsDirectory({
  users,
  isLoading,
  isRefreshing,
  banner,
  onDismissBanner,
  onRefresh,
  onAddAdviser,
  onEdit,
  onManageRoles,
  onSetSuspended,
  busyUserId
}: ProgramHeadAccountsDirectoryProps) {
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortKey>('updated');
  const [page, setPage] = useState(1);
  const [detailsUser, setDetailsUser] = useState<DirectoryUser | null>(null);
  const [confirmSuspend, setConfirmSuspend] = useState<DirectoryUser | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      all: users.length,
      active: users.filter((user) => !user.isSuspended).length,
      suspended: users.filter((user) => user.isSuspended).length,
      incomplete: users.filter((user) => missingDetails(user).length > 0).length
    }),
    [users]
  );

  const roleCounts = useMemo(() => {
    const map = new Map<string, number>();
    users.forEach((user) => map.set(user.role, (map.get(user.role) ?? 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [users]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = users.filter((user) => {
      if (roleFilter !== 'all' && user.role !== roleFilter) return false;
      if (statusFilter === 'active' && user.isSuspended) return false;
      if (statusFilter === 'suspended' && !user.isSuspended) return false;
      if (statusFilter === 'incomplete' && !missingDetails(user).length) return false;
      if (!needle) return true;
      return [user.name, user.email, user.studentId, user.department, roleLabelFor(user.role)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });

    return filtered.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'role') return roleLabelFor(a.role).localeCompare(roleLabelFor(b.role)) || a.name.localeCompare(b.name);
      return new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime();
    });
  }, [users, query, roleFilter, statusFilter, sort]);

  // Back to page 1 whenever the result set changes shape.
  useEffect(() => setPage(1), [query, roleFilter, statusFilter, sort]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const hasFilters = Boolean(query) || roleFilter !== 'all' || statusFilter !== 'all';

  const clearFilters = () => {
    setQuery('');
    setRoleFilter('all');
    setStatusFilter('all');
  };

  const copyEmail = async (user: DirectoryUser) => {
    try {
      await navigator.clipboard.writeText(user.email);
      setCopiedId(user.id);
      window.setTimeout(() => setCopiedId((current) => (current === user.id ? null : current)), 1800);
    } catch {
      // Clipboard can be blocked; the email is visible in the row anyway.
    }
  };

  const actionsFor = (user: DirectoryUser): RowAction[] => {
    const manageable = canManageAccount(user);
    const list: RowAction[] = [
      { label: 'View details', icon: 'fa-id-card', onSelect: () => setDetailsUser(user) },
      { label: 'Manage roles', icon: 'fa-user-shield', onSelect: () => onManageRoles(user) },
      { label: 'Copy email', icon: 'fa-copy', onSelect: () => void copyEmail(user) }
    ];

    if (manageable) {
      list.push({ label: 'Edit account', icon: 'fa-pen', onSelect: () => onEdit(user), separated: true });
      list.push(
        user.isSuspended
          ? { label: 'Restore access', icon: 'fa-rotate-left', onSelect: () => void onSetSuspended(user, false), disabled: busyUserId === user.id }
          : { label: 'Suspend account', icon: 'fa-user-slash', onSelect: () => setConfirmSuspend(user), danger: true, disabled: busyUserId === user.id }
      );
    }

    return list;
  };

  const statusTiles: { value: StatusFilter; label: string; icon: string; tone: string }[] = [
    { value: 'all', label: 'All accounts', icon: 'fa-users', tone: 'text-[var(--primary,#003a8f)] bg-[var(--primary,#003a8f)]/10' },
    { value: 'active', label: 'Active', icon: 'fa-circle-check', tone: 'text-emerald-600 bg-emerald-500/10' },
    { value: 'suspended', label: 'Suspended', icon: 'fa-user-slash', tone: 'text-red-600 bg-red-500/10' },
    { value: 'incomplete', label: 'Needs details', icon: 'fa-triangle-exclamation', tone: 'text-amber-600 bg-amber-500/10' }
  ];

  const chipClass = (active: boolean) =>
    `inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset transition ${
      active
        ? 'bg-[var(--primary-soft,rgba(0,58,143,0.1))] text-[var(--primary,#003a8f)] ring-[var(--primary,#003a8f)]/30'
        : 'bg-[var(--surface,#fff)] text-[var(--muted,#64748b)] ring-[var(--border,#e2e8f0)] hover:text-[var(--text,#0f172a)]'
    }`;

  return (
    <>
      {banner ? (
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <RbacNotice tone={banner.tone === 'success' ? 'success' : 'error'}>
              <strong>{banner.title}.</strong> {banner.body}
            </RbacNotice>
          </div>
          <button type="button" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--muted,#64748b)] hover:bg-[var(--surface-alt,#f1f5f9)]" onClick={onDismissBanner} aria-label="Dismiss message">
            <i className="fas fa-xmark" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {/* Status tiles double as the status filter. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="group" aria-label="Filter by status">
        {statusTiles.map((tile) => {
          const active = statusFilter === tile.value;
          return (
            <button
              key={tile.value}
              type="button"
              aria-pressed={active}
              className={`flex items-center gap-3 rounded-2xl bg-[var(--surface,#fff)] p-3 text-left sm:p-4 shadow-[0_4px_20px_rgba(15,23,42,0.04)] ring-1 transition hover:-translate-y-0.5 ${
                active ? 'ring-2 ring-[var(--primary,#003a8f)]' : 'ring-[var(--border,#e2e8f0)]'
              }`}
              onClick={() => setStatusFilter(active && tile.value !== 'all' ? 'all' : tile.value)}
            >
              <span className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:inline-flex ${tile.tone}`}>
                <i className={`fas ${tile.icon}`} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <strong className="block text-2xl font-extrabold leading-none text-[var(--text,#0f172a)]">{isLoading ? '–' : counts[tile.value]}</strong>
                <span className="mt-1 block text-xs font-semibold text-[var(--muted,#64748b)]">{tile.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-2xl bg-[var(--surface,#fff)] shadow-[0_4px_20px_rgba(15,23,42,0.05)] ring-1 ring-[var(--border,#e2e8f0)]">
        <div className="flex flex-col gap-4 border-b border-[var(--border,#e2e8f0)] px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="m-0 text-lg font-extrabold text-[var(--text,#0f172a)]">Department accounts</h3>
              <p className="m-0 mt-0.5 text-sm text-[var(--muted,#64748b)]" aria-live="polite">
                {isLoading ? 'Loading accounts…' : `${visible.length} of ${users.length} account${users.length === 1 ? '' : 's'}${hasFilters ? ' match your filters' : ''}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[var(--muted,#64748b)] ring-1 ring-[var(--border,#e2e8f0)] transition hover:text-[var(--text,#0f172a)] disabled:opacity-50"
                onClick={onRefresh}
                disabled={isRefreshing}
                aria-label="Refresh accounts"
                title="Refresh"
              >
                <i className={`fas fa-rotate ${isRefreshing ? 'fa-spin' : ''}`} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onAddAdviser}
              >
                <i className="fas fa-user-plus" aria-hidden="true" /> Add adviser
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative lg:w-80">
              <label className="sr-only" htmlFor="ph-accounts-search">
                Search accounts
              </label>
              <i className="fas fa-magnifying-glass pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-[var(--muted,#64748b)]" aria-hidden="true" />
              <input
                id="ph-accounts-search"
                type="search"
                className="h-10 w-full rounded-xl border border-[var(--border,#e2e8f0)] bg-[var(--surface,#fff)] pl-9 pr-3 text-sm text-[var(--text,#0f172a)] outline-none transition focus:border-[var(--primary,#003a8f)] focus:ring-4 focus:ring-[var(--primary,#003a8f)]/10"
                placeholder="Search name, email, student ID"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="-mx-1 flex min-w-0 flex-1 gap-2 overflow-x-auto px-1 py-0.5" role="group" aria-label="Filter by role">
              <button type="button" className={chipClass(roleFilter === 'all')} aria-pressed={roleFilter === 'all'} onClick={() => setRoleFilter('all')}>
                All roles <span className="opacity-70">{users.length}</span>
              </button>
              {roleCounts.map(([role, count]) => (
                <button key={role} type="button" className={chipClass(roleFilter === role)} aria-pressed={roleFilter === role} onClick={() => setRoleFilter(roleFilter === role ? 'all' : role)}>
                  {roleLabelFor(role)} <span className="opacity-70">{count}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <label className="whitespace-nowrap text-xs font-bold text-[var(--muted,#64748b)]" htmlFor="ph-accounts-sort">
                Sort
              </label>
              <select
                id="ph-accounts-sort"
                className="h-10 rounded-xl border border-[var(--border,#e2e8f0)] bg-[var(--surface,#fff)] px-3 text-sm font-semibold text-[var(--text,#0f172a)] outline-none focus:border-[var(--primary,#003a8f)]"
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
              >
                <option value="updated">Recently updated</option>
                <option value="name">Name (A–Z)</option>
                <option value="role">Role</option>
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-0" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex animate-pulse items-center gap-4 border-b border-[var(--border,#e2e8f0)] px-6 py-4 last:border-0">
                <span className="h-10 w-10 rounded-full bg-[var(--surface-alt,#f1f5f9)]" />
                <span className="h-3 w-48 rounded bg-[var(--surface-alt,#f1f5f9)]" />
                <span className="ml-auto h-3 w-24 rounded bg-[var(--surface-alt,#f1f5f9)]" />
              </div>
            ))}
          </div>
        ) : !visible.length ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-alt,#f1f5f9)] text-xl text-[var(--muted,#64748b)]">
              <i className={`fas ${hasFilters ? 'fa-filter-circle-xmark' : 'fa-users'}`} aria-hidden="true" />
            </span>
            <div>
              <strong className="block text-[var(--text,#0f172a)]">{hasFilters ? 'No accounts match your filters' : 'No accounts in your department yet'}</strong>
              <span className="text-sm text-[var(--muted,#64748b)]">
                {hasFilters ? 'Try a different search, role or status.' : 'Approved account requests and advisers you add appear here.'}
              </span>
            </div>
            {hasFilters ? (
              <button type="button" className="rounded-xl px-3 py-2 text-sm font-bold text-[var(--primary,#003a8f)] ring-1 ring-[var(--border,#e2e8f0)] hover:bg-[var(--surface-alt,#f1f5f9)]" onClick={clearFilters}>
                Clear filters
              </button>
            ) : null}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--muted,#64748b)]">
                    <th className="px-6 py-3 font-extrabold">User</th>
                    <th className="px-4 py-3 font-extrabold">Role</th>
                    <th className="px-4 py-3 font-extrabold">Department</th>
                    <th className="hidden px-4 py-3 font-extrabold lg:table-cell">Student ID</th>
                    <th className="px-4 py-3 font-extrabold">Status</th>
                    <th className="hidden px-4 py-3 font-extrabold xl:table-cell">Updated</th>
                    <th className="w-14 px-4 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((user) => (
                    <tr key={user.id} className="border-t border-[var(--border,#e2e8f0)] transition hover:bg-[var(--surface-alt,#f8fafc)]">
                      <td className="px-6 py-3.5">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar user={user} />
                          <div className="min-w-0">
                            <button
                              type="button"
                              className="block max-w-full truncate bg-transparent p-0 text-left text-sm font-bold text-[var(--text,#0f172a)] hover:text-[var(--primary,#003a8f)] hover:underline"
                              onClick={() => setDetailsUser(user)}
                            >
                              {user.name}
                            </button>
                            <span className="block truncate text-xs text-[var(--muted,#64748b)]">{user.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <RolePill role={user.role} />
                      </td>
                      <td className="px-4 py-3.5 text-sm font-semibold text-[var(--text,#0f172a)]">
                        {user.department || <span className="text-xs font-normal italic text-[var(--muted,#64748b)]">Unassigned</span>}
                      </td>
                      <td className="hidden px-4 py-3.5 lg:table-cell">
                        {user.studentId ? (
                          <code className="rounded-md bg-slate-500/10 px-2 py-1 font-mono text-xs font-bold text-[var(--text,#0f172a)]">{user.studentId}</code>
                        ) : (
                          <span className="text-xs text-[var(--muted,#64748b)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusCell user={user} />
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-3.5 text-sm text-[var(--muted,#64748b)] xl:table-cell">{formatDate(user.updatedAt)}</td>
                      <td className="px-4 py-3.5 text-right">
                        {busyUserId === user.id ? (
                          <i className="fas fa-spinner fa-spin text-[var(--muted,#64748b)]" aria-label="Saving" />
                        ) : (
                          <RowActionsMenu label={`Actions for ${user.name}`} actions={actionsFor(user)} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Phone cards */}
            <ul className="m-0 grid list-none gap-0 p-0 md:hidden">
              {pageRows.map((user) => (
                <li key={user.id} className="flex items-start gap-3 border-t border-[var(--border,#e2e8f0)] px-4 py-4 first:border-t-0">
                  <Avatar user={user} />
                  <div className="min-w-0 flex-1">
                    <button type="button" className="block max-w-full truncate bg-transparent p-0 text-left text-sm font-bold text-[var(--text,#0f172a)]" onClick={() => setDetailsUser(user)}>
                      {user.name}
                    </button>
                    <span className="block truncate text-xs text-[var(--muted,#64748b)]">{user.email}</span>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <RolePill role={user.role} />
                      {user.department ? <span className="text-xs font-semibold text-[var(--muted,#64748b)]">{user.department}</span> : null}
                    </div>
                    <div className="mt-2">
                      <StatusCell user={user} />
                    </div>
                  </div>
                  {busyUserId === user.id ? (
                    <i className="fas fa-spinner fa-spin mt-2 text-[var(--muted,#64748b)]" aria-label="Saving" />
                  ) : (
                    <RowActionsMenu label={`Actions for ${user.name}`} actions={actionsFor(user)} />
                  )}
                </li>
              ))}
            </ul>

            {pageCount > 1 ? (
              <nav className="flex flex-col items-center justify-between gap-3 border-t border-[var(--border,#e2e8f0)] px-4 py-3 text-sm sm:flex-row sm:px-6" aria-label="Accounts pages">
                <span className="text-[var(--muted,#64748b)]">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, visible.length)} of {visible.length}
                </span>
                <div className="flex items-center gap-1">
                  <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-[var(--border,#e2e8f0)] disabled:opacity-40" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1} aria-label="Previous page">
                    <i className="fas fa-chevron-left text-xs" aria-hidden="true" />
                  </button>
                  {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
                    <button
                      key={number}
                      type="button"
                      className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2 font-bold ${
                        number === currentPage ? 'bg-[var(--primary-soft,rgba(0,58,143,0.1))] text-[var(--primary,#003a8f)] ring-1 ring-inset ring-[var(--primary,#003a8f)]/30' : 'text-[var(--muted,#64748b)] hover:bg-[var(--surface-alt,#f1f5f9)]'
                      }`}
                      aria-current={number === currentPage ? 'page' : undefined}
                      onClick={() => setPage(number)}
                    >
                      {number}
                    </button>
                  ))}
                  <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-[var(--border,#e2e8f0)] disabled:opacity-40" onClick={() => setPage(currentPage + 1)} disabled={currentPage === pageCount} aria-label="Next page">
                    <i className="fas fa-chevron-right text-xs" aria-hidden="true" />
                  </button>
                </div>
              </nav>
            ) : null}
          </>
        )}
      </section>

      {/* Account details */}
      <RbacDialog
        open={Boolean(detailsUser)}
        title="Account details"
        onClose={() => setDetailsUser(null)}
        maxWidth={560}
        footer={
          detailsUser ? (
            <>
              <button type="button" className="btn btn-outline" onClick={() => setDetailsUser(null)}>
                Close
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  const user = detailsUser;
                  setDetailsUser(null);
                  onManageRoles(user);
                }}
              >
                <i className="fas fa-user-shield" aria-hidden="true" /> Manage roles
              </button>
              {canManageAccount(detailsUser) ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    const user = detailsUser;
                    setDetailsUser(null);
                    onEdit(user);
                  }}
                >
                  <i className="fas fa-pen" aria-hidden="true" /> Edit account
                </button>
              ) : null}
            </>
          ) : null
        }
      >
        {detailsUser ? (
          <div className="grid gap-5">
            <div className="flex items-center gap-4">
              <Avatar user={detailsUser} size="lg" />
              <div className="min-w-0">
                <strong className="block truncate text-lg text-[var(--text,#0f172a)]">{detailsUser.name}</strong>
                <span className="block truncate text-sm text-[var(--muted,#64748b)]">{detailsUser.email}</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  <RolePill role={detailsUser.role} />
                </div>
              </div>
            </div>
            <dl className="m-0 grid gap-x-4 gap-y-3 sm:grid-cols-2">
              {(
                [
                  ['Department', detailsUser.department || 'Unassigned'],
                  ['Status', detailsUser.isSuspended ? `Suspended${detailsUser.suspendedAt ? ` since ${formatDate(detailsUser.suspendedAt)}` : ''}` : 'Active, can sign in'],
                  ...(detailsUser.role === 'student'
                    ? ([
                        ['Student ID', detailsUser.studentId || 'Not set'],
                        ['Year level', detailsUser.yearLevel || 'Not set']
                      ] as const)
                    : []),
                  ['Account created', formatDate(detailsUser.createdAt)],
                  ['Last updated', formatDate(detailsUser.updatedAt)]
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted,#64748b)]">{label}</dt>
                  <dd className="m-0 mt-1 text-sm text-[var(--text,#0f172a)]">{value}</dd>
                </div>
              ))}
            </dl>
            {missingDetails(detailsUser).length ? (
              <RbacNotice tone="info">Profile is missing {missingDetails(detailsUser).join(', ')}.</RbacNotice>
            ) : null}
            {!canManageAccount(detailsUser) ? (
              <p className="m-0 text-xs text-[var(--muted,#64748b)]">
                <i className="fas fa-lock mr-1" aria-hidden="true" />
                Program Heads can edit and suspend Adviser accounts. Other accounts are view-only here; roles can still be managed.
              </p>
            ) : null}
          </div>
        ) : null}
      </RbacDialog>

      {copiedId ? (
        <div className="fixed bottom-5 left-1/2 z-[9999] -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg" role="status">
          <i className="fas fa-check mr-2 text-emerald-400" aria-hidden="true" />
          Email copied
        </div>
      ) : null}

      {/* Suspend confirmation */}
      <RbacDialog
        open={Boolean(confirmSuspend)}
        title={confirmSuspend ? `Suspend ${confirmSuspend.name}?` : 'Suspend account'}
        onClose={() => setConfirmSuspend(null)}
        busy={Boolean(confirmSuspend && busyUserId === confirmSuspend.id)}
        maxWidth={460}
        footer={
          confirmSuspend ? (
            <>
              <button type="button" className="btn btn-outline" onClick={() => setConfirmSuspend(null)} data-autofocus disabled={busyUserId === confirmSuspend.id}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={busyUserId === confirmSuspend.id}
                onClick={async () => {
                  const saved = await onSetSuspended(confirmSuspend, true);
                  if (saved) setConfirmSuspend(null);
                }}
              >
                {busyUserId === confirmSuspend.id ? <i className="fas fa-spinner fa-spin" aria-hidden="true" /> : <i className="fas fa-user-slash" aria-hidden="true" />} Suspend
              </button>
            </>
          ) : null
        }
      >
        <p className="m-0 text-sm leading-6 text-[var(--text,#0f172a)]">
          They won&apos;t be able to sign in until you restore access. Their records and project history stay as they are.
        </p>
      </RbacDialog>
    </>
  );
}
