'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AccountReviewQueue } from '@/components/rbac/account-review-queue';
import { AccountRolesPanel } from '@/components/rbac/account-roles-panel';
import { UserManagementTabs, useUserManagementView } from '@/components/rbac/user-management-tabs';
import { SystemAdminShell } from '@/components/system-admin/system-admin-shell';
import usersStyles from './system-admin-users.module.css';

type ApiUserRole =
  | 'admin'
  | 'system_admin'
  | 'research_head'
  | 'student'
  | 'adviser'
  | 'panel'
  | 'program_head'
  | 'partner'
  | 'tech_transfer'
  | 'library'
  | 'focal_person';

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: ApiUserRole;
  isSuspended?: boolean;
  suspendedAt?: string | null;
  suspendedUntil?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  studentId?: string | null;
  department?: string | null;
  yearLevel?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type UserListResponse = {
  success?: boolean;
  users?: ManagedUser[];
  message?: string;
};

type UserMutationResponse = {
  success?: boolean;
  message?: string;
  user?: ManagedUser;
  fieldErrors?: Record<string, string>;
};

type UserFormState = {
  firstName: string;
  lastName: string;
  email: string;
  role: Exclude<ApiUserRole, 'admin' | 'student'>;
  department: string;
  password: string;
  confirmPassword: string;
};

type StatusFilter = 'all' | 'active' | 'suspended';
type SuspensionDuration = {
  key: string;
  label: string;
  helper: string;
};

type BannerState = {
  tone: 'success' | 'warning';
  title: string;
  body: string;
};

const ROLE_LABELS: Record<ApiUserRole, string> = {
  admin: 'Legacy Admin',
  system_admin: 'System Administrator',
  research_head: 'Research Head',
  student: 'Student',
  adviser: 'Adviser',
  panel: 'Panelist',
  program_head: 'Program Head',
  partner: 'Industry Partner',
  tech_transfer: 'Tech Transfer',
  library: 'Library Personnel',
  focal_person: 'Research Focal Person'
};

const STAFF_ROLE_OPTIONS: Array<{
  value: UserFormState['role'];
  label: string;
  description: string;
  boundary: string;
  category: 'technical' | 'oversight' | 'academic' | 'workflow' | 'external';
  icon: string;
}> = [
  {
    value: 'system_admin',
    label: 'System Administrator',
    description: 'Technical super admin for platform settings, RBAC, logs, backups, and maintenance.',
    boundary: 'No research monitoring workflow ownership.',
    category: 'technical',
    icon: 'fa-server'
  },
  {
    value: 'research_head',
    label: 'Research Head',
    description: 'Functional research oversight without technical maintenance controls.',
    boundary: 'Cannot create Program Head or Adviser accounts.',
    category: 'oversight',
    icon: 'fa-building-columns'
  },
  {
    value: 'focal_person',
    label: 'Research Focal Person',
    description: 'Coordinates research in one department and endorses its work to the Research Head.',
    boundary: 'Final approval stays with the Research Head.',
    category: 'academic',
    icon: 'fa-user-check'
  },
  {
    value: 'program_head',
    label: 'Program Head',
    description: 'Academic manager for adviser accounts and department monitoring.',
    boundary: 'No system settings or cross-role management.',
    category: 'academic',
    icon: 'fa-user-tie'
  },
  {
    value: 'adviser',
    label: 'Adviser',
    description: 'Faculty adviser access for group supervision and submission reviews.',
    boundary: 'Usually provisioned by Program Head.',
    category: 'academic',
    icon: 'fa-chalkboard-user'
  },
  {
    value: 'panel',
    label: 'Panelist',
    description: 'Defense review and evaluation access.',
    boundary: 'Evaluation workflow only.',
    category: 'academic',
    icon: 'fa-clipboard-check'
  },
  {
    value: 'library',
    label: 'Library Personnel',
    description: 'Repository validation and archival workflow access.',
    boundary: 'Repository workflow only.',
    category: 'workflow',
    icon: 'fa-book-open-reader'
  },
  {
    value: 'partner',
    label: 'Industry Partner',
    description: 'Partner collaboration, matching, feedback, and deployment status access.',
    boundary: 'External collaboration only.',
    category: 'external',
    icon: 'fa-handshake'
  }
];

const ROLE_DECORATION: Record<ApiUserRole, {
  icon: string;
  category: 'technical' | 'oversight' | 'academic' | 'workflow' | 'external' | 'student' | 'legacy';
}> = {
  admin: { icon: 'fa-user-shield', category: 'legacy' },
  system_admin: { icon: 'fa-server', category: 'technical' },
  research_head: { icon: 'fa-building-columns', category: 'oversight' },
  student: { icon: 'fa-user-graduate', category: 'student' },
  adviser: { icon: 'fa-chalkboard-user', category: 'academic' },
  panel: { icon: 'fa-clipboard-check', category: 'academic' },
  program_head: { icon: 'fa-user-tie', category: 'academic' },
  partner: { icon: 'fa-handshake', category: 'external' },
  tech_transfer: { icon: 'fa-arrow-up-right-dots', category: 'workflow' },
  library: { icon: 'fa-book-open-reader', category: 'workflow' },
  focal_person: { icon: 'fa-user-check', category: 'academic' }
};

const EMPTY_USER_FORM: UserFormState = {
  firstName: '',
  lastName: '',
  email: '',
  role: 'program_head',
  department: '',
  password: '',
  confirmPassword: ''
};

const SUSPENSION_DURATIONS: SuspensionDuration[] = [
  { key: '1m', label: '1 minute', helper: 'Quick access test' },
  { key: '1h', label: '1 hour', helper: 'Short account hold' },
  { key: '6h', label: '6 hours', helper: 'Same-day review' },
  { key: '24h', label: '1 day', helper: 'Temporary suspension' },
  { key: '7d', label: '1 week', helper: 'Formal review window' },
  { key: '30d', label: '30 days', helper: 'Extended restriction' },
  { key: 'indefinite', label: 'Until restored', helper: 'Manual restore required' }
];

async function parseApiPayload<T>(response: Response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return null;
}

function formatDate(value?: string | null) {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function getInitials(user: ManagedUser) {
  const source = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name;

  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

function getPasswordScore(value: string) {
  if (!value) {
    return 0;
  }

  let score = 0;

  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  return Math.min(score, 5);
}

function getPasswordStrengthLabel(score: number) {
  if (score >= 5) return 'Excellent';
  if (score >= 4) return 'Strong';
  if (score >= 3) return 'Good';
  if (score >= 2) return 'Fair';
  if (score >= 1) return 'Weak';
  return 'Not set';
}

function generateTemporaryPassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@#$%&*?';
  const all = `${upper}${lower}${numbers}${symbols}`;
  const required = [upper, lower, numbers, symbols].map((group) => group[Math.floor(Math.random() * group.length)]);
  const extra = Array.from({ length: 8 }, () => all[Math.floor(Math.random() * all.length)]);

  return [...required, ...extra]
    .sort(() => Math.random() - 0.5)
    .join('');
}

function isStaffManagedRole(role: ApiUserRole): role is UserFormState['role'] {
  return STAFF_ROLE_OPTIONS.some((option) => option.value === role);
}

const USERS_PAGE_SIZE = 7;

// Page buttons to show: always first and last, the current page with one neighbour on each side,
// and 'gap' markers where pages are skipped (e.g. 1 … 4 5 6 … 12).
function getPageNumbers(current: number, total: number): Array<number | 'gap'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages: Array<number | 'gap'> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) pages.push('gap');
  for (let value = start; value <= end; value += 1) pages.push(value);
  if (end < total - 1) pages.push('gap');
  pages.push(total);

  return pages;
}

export function SystemAdminUsers() {
  // ?create=1 (from the dashboard) opens the create modal; the param is then dropped so a reload doesn't reopen it.
  const searchParams = useSearchParams();
  const router = useRouter();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | ApiUserRole>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(() => searchParams.get('create') !== null);
  const [detailsUser, setDetailsUser] = useState<ManagedUser | null>(null);
  const [rolesUserId, setRolesUserId] = useState<string | null>(null);
  // ?tab=requests opens the account requests view; the old /system-admin/applications redirects here.
  const { view, changeView, pendingCount, refreshPendingCount } = useUserManagementView('/system-admin/users');
  const [showTemporaryPassword, setShowTemporaryPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [form, setForm] = useState<UserFormState>(EMPTY_USER_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [activeSuspensionUserId, setActiveSuspensionUserId] = useState<string | null>(null);
  const [openSuspensionUserId, setOpenSuspensionUserId] = useState<string | null>(null);

  const loadUsers = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const response = await fetch('/api/users', {
        cache: 'no-store',
        credentials: 'same-origin'
      });
      const payload = await parseApiPayload<UserListResponse>(response);

      if (!response.ok || !payload?.success || !payload.users) {
        throw new Error(payload?.message || 'Unable to load user records.');
      }

      setUsers(payload.users);
      setBanner(null);
    } catch (error) {
      setBanner({
        tone: 'warning',
        title: 'Unable to load users',
        body: error instanceof Error && error.message ? error.message : 'The user directory could not be loaded.'
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (searchParams.get('create') !== null) {
      router.replace('/system-admin/users', { scroll: false });
    }
  }, [router, searchParams]);

  // Search, role, and department filters; the status tabs count within this set.
  const matchingUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return users.filter((user) => {
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesDepartment = departmentFilter === 'all' || (user.department || 'Unassigned') === departmentFilter;
      const matchesQuery =
        !normalizedQuery ||
        user.name.toLowerCase().includes(normalizedQuery) ||
        user.email.toLowerCase().includes(normalizedQuery) ||
        (user.department || '').toLowerCase().includes(normalizedQuery) ||
        (user.studentId || '').toLowerCase().includes(normalizedQuery);

      return matchesRole && matchesDepartment && matchesQuery;
    });
  }, [departmentFilter, query, roleFilter, users]);

  const filteredUsers = useMemo(
    () =>
      matchingUsers.filter(
        (user) => statusFilter === 'all' || (statusFilter === 'suspended') === Boolean(user.isSuspended)
      ),
    [matchingUsers, statusFilter]
  );

  // USERS_PAGE_SIZE accounts per page; any filter change goes back to page 1.
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [departmentFilter, query, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PAGE_SIZE));
  // Clamp so suspending/restoring the last row on the last page doesn't leave an empty page.
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * USERS_PAGE_SIZE;
  const pagedUsers = filteredUsers.slice(pageStart, pageStart + USERS_PAGE_SIZE);
  // With more than one page, pad a short last page with blank rows so the table height and
  // the pagination buttons stay in the same place on every page.
  const fillerRowCount = totalPages > 1 ? USERS_PAGE_SIZE - pagedUsers.length : 0;
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  const departments = useMemo(() => {
    const values = users
      .map((user) => user.department || 'Unassigned')
      .filter(Boolean);

    return Array.from(new Set(values)).sort();
  }, [users]);

  const suspendedCount = matchingUsers.filter((user) => user.isSuspended).length;
  const statusTabs: Array<{ value: StatusFilter; label: string; count: number }> = [
    { value: 'all', label: 'All', count: matchingUsers.length },
    { value: 'active', label: 'Active', count: matchingUsers.length - suspendedCount },
    { value: 'suspended', label: 'Suspended', count: suspendedCount }
  ];
  const hasActiveFilters = Boolean(query || roleFilter !== 'all' || statusFilter !== 'all' || departmentFilter !== 'all');
  const clearFilters = () => {
    setQuery('');
    setRoleFilter('all');
    setStatusFilter('all');
    setDepartmentFilter('all');
  };
  const selectedRoleOption =
    STAFF_ROLE_OPTIONS.find((role) => role.value === form.role) ?? STAFF_ROLE_OPTIONS[0];
  const passwordScore = getPasswordScore(form.password);
  const passwordStrengthLabel = getPasswordStrengthLabel(passwordScore);
  const passwordMismatch = Boolean(form.password && form.confirmPassword && form.password !== form.confirmPassword);

  const updateFormField = (field: keyof UserFormState, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value
    }));

    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const closeCreateModal = () => {
    setIsCreateOpen(false);
    setShowTemporaryPassword(false);
    setShowConfirmPassword(false);
    setForm(EMPTY_USER_FORM);
    setFieldErrors({});
  };

  const openCreateModal = () => {
    setForm(EMPTY_USER_FORM);
    setFieldErrors({});
    setShowTemporaryPassword(false);
    setShowConfirmPassword(false);
    setIsCreateOpen(true);
  };

  const handleGeneratePassword = () => {
    const password = generateTemporaryPassword();

    setForm((current) => ({
      ...current,
      password,
      confirmPassword: password
    }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.password;
      delete next.confirmPassword;
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          role: form.role,
          department: form.department.trim(),
          password: form.password,
          confirmPassword: form.confirmPassword
        })
      });
      const payload = await parseApiPayload<UserMutationResponse>(response);

      if (!response.ok || !payload?.success || !payload.user) {
        setFieldErrors(payload?.fieldErrors || {});
        setBanner({
          tone: 'warning',
          title: 'Unable to create account',
          body: payload?.message || 'The server rejected this account.'
        });
        return;
      }

      setUsers((current) => [payload.user as ManagedUser, ...current]);
      setBanner({
        tone: 'success',
        title: 'Account created',
        body: payload.message || `${payload.user.name} can now sign in.`
      });
      closeCreateModal();
    } catch (error) {
      setBanner({
        tone: 'warning',
        title: 'Unable to create account',
        body: error instanceof Error && error.message ? error.message : 'The account could not be created.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSuspensionToggle = async (user: ManagedUser, suspended: boolean, duration?: SuspensionDuration) => {
    setActiveSuspensionUserId(user.id);
    setOpenSuspensionUserId(null);

    try {
      const response = await fetch(`/api/users/${user.id}/suspension`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({ suspended, durationKey: duration?.key, durationLabel: duration?.label })
      });
      const payload = await parseApiPayload<UserMutationResponse>(response);

      if (!response.ok || !payload?.success || !payload.user) {
        setBanner({
          tone: 'warning',
          title: suspended ? 'Unable to suspend account' : 'Unable to restore account',
          body: payload?.message || 'The server rejected this request.'
        });
        return;
      }

      setUsers((current) => current.map((item) => (item.id === payload.user?.id ? payload.user : item)));
      setBanner({
        tone: 'success',
        title: suspended ? 'Account suspended' : 'Account restored',
        body: payload.message || `${user.name} has been updated.`
      });
    } catch (error) {
      setBanner({
        tone: 'warning',
        title: suspended ? 'Unable to suspend account' : 'Unable to restore account',
        body: error instanceof Error && error.message ? error.message : 'The request could not be completed.'
      });
    } finally {
      setActiveSuspensionUserId(null);
    }
  };

  return (
    <>
      <SystemAdminShell
        activeNav="users"
        title="User Management"
        description="Manage accounts and roles, and review new account requests."
      >
        <div className={`admin-page-stack ${usersStyles.page}`}>
          <UserManagementTabs view={view} onChange={changeView} pendingCount={pendingCount} />

          {view === 'requests' ? (
            <AccountReviewQueue
              scopeDescription="Program Head, Research Head and Library Personnel registrations. Department roles (students, advisers, panel members) are reviewed by each department's Program Head."
              onChange={() => {
                void refreshPendingCount();
                void loadUsers('refresh');
              }}
            />
          ) : null}

          {view === 'accounts' && banner ? (
            <section className={`admin-result-banner ${banner.tone === 'success' ? 'is-success' : 'is-warning'}`}>
              <div>
                <strong>{banner.title}</strong>
                <p>{banner.body}</p>
              </div>
              <button className="btn btn-outline small" type="button" onClick={() => setBanner(null)}>
                Dismiss
              </button>
            </section>
          ) : null}

          {view === 'accounts' ? (
          <section className="admin-section-card system-directory-card">
            <div className="admin-section-head">
              <div>
                <h3>Accounts</h3>
                <p>Create staff accounts, manage their roles, and suspend or restore access. New registrations wait under Account requests.</p>
              </div>
              <button className="btn btn-primary" type="button" onClick={openCreateModal}>
                <i className="fas fa-user-plus"></i>
                Create Staff Account
              </button>
            </div>
            <div className="admin-section-body">
              <div className={usersStyles.toolbar}>
                <div className={usersStyles.statusTabs} role="group" aria-label="Filter by status">
                  {statusTabs.map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      aria-pressed={statusFilter === tab.value}
                      className={`${usersStyles.statusTab} ${statusFilter === tab.value ? usersStyles.statusTabActive : ''}`}
                      onClick={() => setStatusFilter(tab.value)}
                    >
                      {tab.label}
                      <span className={usersStyles.tabCount}>{isLoading ? '–' : tab.count}</span>
                    </button>
                  ))}
                </div>

                <div className={`system-input-shell ${usersStyles.search}`}>
                  <i className="fas fa-magnifying-glass" aria-hidden="true"></i>
                  <input
                    aria-label="Search accounts"
                    className="admin-toolbar-input"
                    placeholder="Search name, email, department, or ID"
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>

                <select
                  aria-label="Filter by role"
                  className={`admin-toolbar-select ${usersStyles.select}`}
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value as 'all' | ApiUserRole)}
                >
                  <option value="all">All roles</option>
                  {Object.entries(ROLE_LABELS)
                    .filter(([role]) => role !== 'admin')
                    .map(([role, label]) => (
                      <option key={role} value={role}>
                        {label}
                      </option>
                    ))}
                </select>

                <select
                  aria-label="Filter by department or office"
                  className={`admin-toolbar-select ${usersStyles.select}`}
                  value={departmentFilter}
                  onChange={(event) => setDepartmentFilter(event.target.value)}
                >
                  <option value="all">All departments</option>
                  {departments.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>

                <div className={usersStyles.toolbarActions}>
                  {hasActiveFilters ? (
                    <button className="btn btn-outline small" type="button" onClick={clearFilters}>
                      <i className="fas fa-xmark"></i>
                      Clear
                    </button>
                  ) : null}
                  <button
                    aria-label="Refresh accounts"
                    className="btn btn-outline small"
                    disabled={isRefreshing}
                    title="Refresh"
                    type="button"
                    onClick={() => void loadUsers('refresh')}
                  >
                    <i className={`fas ${isRefreshing ? 'fa-spinner fa-spin' : 'fa-rotate'}`}></i>
                  </button>
                </div>
              </div>

            <div className="table-scroll">
              <table className={usersStyles.table}>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Department / Office</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th className="system-actions-column">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="admin-empty-state">Loading accounts...</div>
                      </td>
                    </tr>
                  ) : filteredUsers.length ? (
                    <>
                    {pagedUsers.map((user) => {
                      const decoration = ROLE_DECORATION[user.role];

                      return (
                        <tr key={user.id} className={user.isSuspended ? 'is-suspended-user' : undefined}>
                          <td>
                            <div className="admin-users-user-cell system-user-cell">
                              <span className={`admin-users-row-avatar system-role-avatar is-${decoration.category}`} aria-hidden="true">
                                {getInitials(user)}
                              </span>
                              <div>
                                <span className="table-title">{user.name}</span>
                                <span className="table-subtitle">{user.email}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`system-role-pill is-${decoration.category}`}>
                              <i className={`fas ${decoration.icon}`}></i>
                              {ROLE_LABELS[user.role]}
                            </span>
                          </td>
                          <td>
                            <span className="table-title">{user.department || 'Unassigned'}</span>
                            {user.studentId ? <span className="table-subtitle">{user.studentId}</span> : null}
                          </td>
                          <td>
                            <span className={`status-badge ${user.isSuspended ? 'status-critical' : 'status-approved'}`}>
                              {user.isSuspended ? 'Suspended' : 'Active'}
                            </span>
                            {user.isSuspended && user.suspendedUntil ? (
                              <span className="table-subtitle">Until {formatDateTime(user.suspendedUntil)}</span>
                            ) : null}
                          </td>
                          <td>
                            <span className="table-title">{formatDate(user.createdAt)}</span>
                          </td>
                          <td>
                            <div className="system-user-actions">
                              <button
                                className="btn btn-outline small"
                                type="button"
                                onClick={() => setDetailsUser(user)}
                              >
                                <i className="fas fa-eye"></i>
                                View
                              </button>

                              <button className="btn btn-outline small" type="button" onClick={() => setRolesUserId(user.id)}>
                                <i className="fas fa-user-shield"></i>
                                Roles
                              </button>

                              {user.isSuspended ? (
                                <button
                                  className="btn btn-outline small"
                                  disabled={activeSuspensionUserId === user.id}
                                  type="button"
                                  onClick={() => void handleSuspensionToggle(user, false)}
                                >
                                  <i className={`fas ${activeSuspensionUserId === user.id ? 'fa-spinner fa-spin' : 'fa-rotate-left'}`}></i>
                                  Restore
                                </button>
                              ) : (
                                <div className="system-suspend-menu">
                                  <button
                                    aria-expanded={openSuspensionUserId === user.id ? 'true' : 'false'}
                                    className="btn btn-outline small"
                                    disabled={activeSuspensionUserId === user.id}
                                    type="button"
                                    onClick={() => setOpenSuspensionUserId((current) => (current === user.id ? null : user.id))}
                                  >
                                    <i className={`fas ${activeSuspensionUserId === user.id ? 'fa-spinner fa-spin' : 'fa-user-slash'}`}></i>
                                    Suspend
                                    <i className="fas fa-chevron-down"></i>
                                  </button>
                                  {openSuspensionUserId === user.id ? (
                                    <div className="system-suspend-dropdown">
                                      <span className="system-suspend-dropdown-title">Suspend for</span>
                                      {SUSPENSION_DURATIONS.map((duration) => (
                                        <button
                                          key={duration.key}
                                          type="button"
                                          onClick={() => void handleSuspensionToggle(user, true, duration)}
                                        >
                                          <strong>{duration.label}</strong>
                                          <small>{duration.helper}</small>
                                        </button>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {Array.from({ length: fillerRowCount }, (_, index) => (
                      <tr key={`filler-${index}`} className={usersStyles.fillerRow} aria-hidden="true">
                        <td colSpan={6}></td>
                      </tr>
                    ))}
                    </>
                  ) : (
                    <tr>
                      <td colSpan={6}>
                        <div className={`admin-empty-state ${usersStyles.empty}`}>
                          <span>
                            {users.length === 0
                              ? 'No accounts yet.'
                              : !matchingUsers.length
                                ? 'No accounts match your search or filters.'
                                : `No ${statusFilter} accounts${matchingUsers.length !== users.length ? ' match your filters' : ''}.`}
                          </span>
                          {hasActiveFilters ? (
                            <button className="btn btn-outline small" type="button" onClick={clearFilters}>
                              Show all accounts
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {!isLoading && filteredUsers.length ? (
              <nav className={usersStyles.pagination} aria-label="Accounts pages">
                <span className={usersStyles.pageSummary}>
                  Showing {pageStart + 1}–{pageStart + pagedUsers.length} of {filteredUsers.length}
                </span>
                {totalPages > 1 ? (
                  <div className={usersStyles.pageButtons}>
                    <button
                      aria-label="Previous page"
                      className={usersStyles.pageButton}
                      disabled={currentPage === 1}
                      type="button"
                      onClick={() => setPage(currentPage - 1)}
                    >
                      <i className="fas fa-chevron-left"></i>
                    </button>
                    {pageNumbers.map((value, index) =>
                      value === 'gap' ? (
                        <span key={`gap-${index}`} className={usersStyles.pageGap} aria-hidden="true">…</span>
                      ) : (
                        <button
                          key={value}
                          aria-current={value === currentPage ? 'page' : undefined}
                          aria-label={`Page ${value}`}
                          className={`${usersStyles.pageButton} ${value === currentPage ? usersStyles.pageButtonActive : ''}`}
                          type="button"
                          onClick={() => setPage(value)}
                        >
                          {value}
                        </button>
                      )
                    )}
                    <button
                      aria-label="Next page"
                      className={usersStyles.pageButton}
                      disabled={currentPage === totalPages}
                      type="button"
                      onClick={() => setPage(currentPage + 1)}
                    >
                      <i className="fas fa-chevron-right"></i>
                    </button>
                  </div>
                ) : null}
              </nav>
            ) : null}
            </div>
          </section>
          ) : null}
        </div>
      </SystemAdminShell>

      <AccountRolesPanel userId={rolesUserId} onClose={() => setRolesUserId(null)} onChanged={() => void loadUsers('refresh')} />

      {isCreateOpen ? (
        <div className="modal show" onClick={(event) => event.target === event.currentTarget && closeCreateModal()}>
          <div className="modal-content admin-users-modal system-staff-modal">
            <div className="modal-header">
              <div className="system-modal-title">
                <span className={`system-role-icon is-${selectedRoleOption.category}`} aria-hidden="true">
                  <i className={`fas ${selectedRoleOption.icon}`}></i>
                </span>
                <div>
                  <h3>Create Staff Account</h3>
                  <p>Choose a role, enter the person&apos;s details, and set a temporary password.</p>
                </div>
              </div>
              <button className="close-modal" type="button" onClick={closeCreateModal}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="system-staff-grid">
                  <section className="system-role-panel" aria-labelledby="staff-role-title">
                    <div className="system-panel-heading">
                      <div>
                        <span className="admin-kpi-label">Step 1</span>
                        <strong id="staff-role-title">Role</strong>
                      </div>
                    </div>
                    <div className="system-role-picker" role="radiogroup" aria-label="Staff role">
                      {STAFF_ROLE_OPTIONS.map((role) => (
                        <button
                          key={role.value}
                          aria-checked={form.role === role.value}
                          className={`system-role-option${form.role === role.value ? ' is-active' : ''}`}
                          role="radio"
                          type="button"
                          onClick={() => updateFormField('role', role.value)}
                        >
                          <span className={`system-role-icon is-${role.category}`}>
                            <i className={`fas ${role.icon}`}></i>
                          </span>
                          <span>
                            <strong>{role.label}</strong>
                            <small>{role.description}</small>
                            <em>{role.boundary}</em>
                          </span>
                        </button>
                      ))}
                    </div>
                    {fieldErrors.role ? <span className="admin-field-error">{fieldErrors.role}</span> : null}
                  </section>

                  <section className="system-staff-form-panel">
                    <div className="system-panel-heading is-inline">
                      <div>
                        <span className="admin-kpi-label">Step 2</span>
                        <strong>Account details</strong>
                      </div>
                    </div>

                    <div className="admin-form-grid">
                      <div className="form-field">
                        <label htmlFor="system-user-first-name">First Name</label>
                        <input
                          id="system-user-first-name"
                          aria-invalid={fieldErrors.firstName ? 'true' : 'false'}
                          value={form.firstName}
                          onChange={(event) => updateFormField('firstName', event.target.value)}
                        />
                        {fieldErrors.firstName ? <span className="admin-field-error">{fieldErrors.firstName}</span> : null}
                      </div>
                      <div className="form-field">
                        <label htmlFor="system-user-last-name">Last Name</label>
                        <input
                          id="system-user-last-name"
                          aria-invalid={fieldErrors.lastName ? 'true' : 'false'}
                          value={form.lastName}
                          onChange={(event) => updateFormField('lastName', event.target.value)}
                        />
                        {fieldErrors.lastName ? <span className="admin-field-error">{fieldErrors.lastName}</span> : null}
                      </div>
                      <div className="form-field">
                        <label htmlFor="system-user-email">Email</label>
                        <input
                          id="system-user-email"
                          aria-invalid={fieldErrors.email ? 'true' : 'false'}
                          type="email"
                          value={form.email}
                          onChange={(event) => updateFormField('email', event.target.value)}
                        />
                        {fieldErrors.email ? <span className="admin-field-error">{fieldErrors.email}</span> : null}
                      </div>
                      <div className="form-field">
                        <label htmlFor="system-user-department">Department / Office</label>
                        <input
                          id="system-user-department"
                          aria-invalid={fieldErrors.department ? 'true' : 'false'}
                          placeholder="Research Office, BSIT, Library, IT Office"
                          value={form.department}
                          onChange={(event) => updateFormField('department', event.target.value)}
                        />
                        {fieldErrors.department ? <span className="admin-field-error">{fieldErrors.department}</span> : null}
                      </div>
                    </div>

                    <div className="system-security-panel">
                      <div className="system-security-head">
                        <div>
                          <span className="admin-kpi-label">Step 3</span>
                          <strong>Temporary password · {passwordStrengthLabel}</strong>
                          <p>The user changes it after their first sign-in.</p>
                        </div>
                        <button className="btn btn-outline small" type="button" onClick={handleGeneratePassword}>
                          <i className="fas fa-wand-magic-sparkles"></i>
                          Generate
                        </button>
                      </div>
                      <div className="admin-form-grid">
                        <div className="form-field">
                          <label htmlFor="system-user-password">Temporary Password</label>
                          <div className="system-password-field">
                            <input
                              id="system-user-password"
                              aria-invalid={fieldErrors.password ? 'true' : 'false'}
                              type={showTemporaryPassword ? 'text' : 'password'}
                              value={form.password}
                              onChange={(event) => updateFormField('password', event.target.value)}
                            />
                            <button
                              aria-label={showTemporaryPassword ? 'Hide temporary password' : 'Show temporary password'}
                              className="system-password-toggle"
                              type="button"
                              onClick={() => setShowTemporaryPassword((current) => !current)}
                            >
                              <i className={`fas ${showTemporaryPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                            </button>
                          </div>
                          {fieldErrors.password ? <span className="admin-field-error">{fieldErrors.password}</span> : null}
                        </div>
                        <div className="form-field">
                          <label htmlFor="system-user-confirm-password">Confirm Password</label>
                          <div className="system-password-field">
                            <input
                              id="system-user-confirm-password"
                              aria-invalid={fieldErrors.confirmPassword || passwordMismatch ? 'true' : 'false'}
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={form.confirmPassword}
                              onChange={(event) => updateFormField('confirmPassword', event.target.value)}
                            />
                            <button
                              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                              className="system-password-toggle"
                              type="button"
                              onClick={() => setShowConfirmPassword((current) => !current)}
                            >
                              <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                            </button>
                          </div>
                          {passwordMismatch ? <span className="admin-field-error">Passwords do not match.</span> : null}
                          {fieldErrors.confirmPassword ? <span className="admin-field-error">{fieldErrors.confirmPassword}</span> : null}
                        </div>
                      </div>
                      <div className="system-password-meter" aria-hidden="true">
                        <span className={`level-${passwordScore}`} style={{ width: `${Math.max(passwordScore, 1) * 20}%` }}></span>
                      </div>
                      <div className="system-password-hints">
                        <span className={form.password.length >= 8 ? 'is-met' : ''}>8+ characters</span>
                        <span className={/[A-Z]/.test(form.password) && /[a-z]/.test(form.password) ? 'is-met' : ''}>Mixed case</span>
                        <span className={/\d/.test(form.password) ? 'is-met' : ''}>Number</span>
                        <span className={/[^A-Za-z0-9]/.test(form.password) ? 'is-met' : ''}>Symbol</span>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline" disabled={isSaving} type="button" onClick={closeCreateModal}>
                  Cancel
                </button>
                <button className="btn btn-primary" disabled={isSaving} type="submit">
                  <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-user-plus'}`}></i>
                  {isSaving ? 'Creating...' : `Create ${selectedRoleOption.label} Account`}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {detailsUser ? (
        <div className="modal show" onClick={(event) => event.target === event.currentTarget && setDetailsUser(null)}>
          <div className="modal-content admin-users-modal system-user-details-modal">
            <div className="modal-header">
              <div>
                <h3>User Details</h3>
                <p>Account profile and access.</p>
              </div>
              <button className="close-modal" type="button" onClick={() => setDetailsUser(null)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              {(() => {
                const decoration = ROLE_DECORATION[detailsUser.role];

                return (
                  <div className="system-user-details">
                    <section className="system-user-details-hero">
                      <span className={`admin-users-row-avatar system-role-avatar is-${decoration.category}`} aria-hidden="true">
                        {getInitials(detailsUser)}
                      </span>
                      <div>
                        <span className="admin-kpi-label">Account identity</span>
                        <h4>{detailsUser.name}</h4>
                        <p>{detailsUser.email}</p>
                      </div>
                      <span className={`status-badge ${detailsUser.isSuspended ? 'status-critical' : 'status-approved'}`}>
                        {detailsUser.isSuspended ? 'Suspended' : 'Active'}
                      </span>
                    </section>

                    <section className="system-user-details-grid">
                      <div>
                        <span>Role</span>
                        <strong>{ROLE_LABELS[detailsUser.role]}</strong>
                      </div>
                      <div>
                        <span>Department / Office</span>
                        <strong>{detailsUser.department || 'Unassigned'}</strong>
                      </div>
                      {detailsUser.studentId ? (
                        <div>
                          <span>Student ID</span>
                          <strong>{detailsUser.studentId}</strong>
                        </div>
                      ) : null}
                      <div>
                        <span>Created</span>
                        <strong>{formatDate(detailsUser.createdAt)}</strong>
                      </div>
                      <div>
                        <span>Last Updated</span>
                        <strong>{formatDate(detailsUser.updatedAt)}</strong>
                      </div>
                      {detailsUser.isSuspended ? (
                        <>
                          <div>
                            <span>Suspended At</span>
                            <strong>{formatDate(detailsUser.suspendedAt)}</strong>
                          </div>
                          <div>
                            <span>Suspended Until</span>
                            <strong>{detailsUser.suspendedUntil ? formatDateTime(detailsUser.suspendedUntil) : 'Manual restore'}</strong>
                          </div>
                        </>
                      ) : null}
                      <div>
                        <span>User ID</span>
                        <strong>{detailsUser.id}</strong>
                      </div>
                    </section>
                  </div>
                );
              })()}
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" type="button" onClick={() => setDetailsUser(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function SystemAdminBranding() {
  return (
    <SystemAdminShell
      activeNav="branding"
      title="Theme and Branding"
      description="Technical branding controls for logo, colors, and system name."
    >
      <div className="admin-page-stack">
        <section className="admin-grid-2">
          <section className="admin-section-card">
            <div className="admin-section-head">
              <div>
                <h3>Brand Settings</h3>
                <p>These controls belong to System Admin, not Research Head.</p>
              </div>
            </div>
            <div className="admin-section-body">
              <div className="admin-form-grid">
                <div className="form-field">
                  <label>System Name</label>
                  <input defaultValue="Thesis Track" />
                </div>
                <div className="form-field">
                  <label>Primary Color</label>
                  <input defaultValue="#003A8F" />
                </div>
                <div className="form-field">
                  <label>Accent Color</label>
                  <input defaultValue="#F6BE00" />
                </div>
                <div className="form-field">
                  <label>Logo Asset</label>
                  <input defaultValue="/logo.png" />
                </div>
              </div>
              <div className="admin-action-row" style={{ marginTop: '1rem' }}>
                <button className="btn btn-primary" type="button">
                  <i className="fas fa-floppy-disk"></i>
                  Save Branding
                </button>
                <button className="btn btn-outline" type="button">
                  <i className="fas fa-rotate-left"></i>
                  Restore Defaults
                </button>
              </div>
            </div>
          </section>

          <section className="admin-section-card">
            <div className="admin-section-head">
              <div>
                <h3>Preview</h3>
                <p>Portal identity shown to all roles.</p>
              </div>
            </div>
            <div className="admin-section-body">
              <div className="admin-profile-summary">
                <span className="admin-profile-avatar" aria-hidden="true">
                  <i className="fas fa-graduation-cap"></i>
                </span>
                <h2>Thesis Track</h2>
                <p>Higher Education Institutions</p>
                <div className="admin-action-row">
                  <span className="admin-inline-badge">#003A8F</span>
                  <span className="admin-inline-badge">#F6BE00</span>
                </div>
              </div>
            </div>
          </section>
        </section>
      </div>
    </SystemAdminShell>
  );
}

const SYSTEM_SETTINGS_ROUTES: Record<string, Array<{ label: string; icon: string }>> = {
  standard: [
    { label: 'Student', icon: 'fa-user-graduate' },
    { label: 'Adviser', icon: 'fa-chalkboard-user' },
    { label: 'Program Head', icon: 'fa-user-tie' },
    { label: 'Research Head', icon: 'fa-user-shield' }
  ],
  accelerated: [
    { label: 'Student', icon: 'fa-user-graduate' },
    { label: 'Adviser', icon: 'fa-chalkboard-user' },
    { label: 'Research Head', icon: 'fa-user-shield' }
  ]
};

export function SystemAdminSettings() {
  const departments = ['BSIT', 'BSMET', 'BSTCM', 'BSESM', 'BSNAME'];
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [registration, setRegistration] = useState('open');
  const [workflow, setWorkflow] = useState('standard');
  const routeSteps = SYSTEM_SETTINGS_ROUTES[workflow] ?? SYSTEM_SETTINGS_ROUTES.standard;

  return (
    <SystemAdminShell
      activeNav="settings"
      title="System Settings"
      description="Technical configuration for departments, academic year, workflows, and account policies."
    >
      <div className="admin-page-stack sys-settings-page">
        {/* Live summary of the current configuration; updates as the fields below change. */}
        <section className="sys-settings-hero" aria-live="polite">
          <div className="sys-settings-hero-main">
            <span className="sys-settings-hero-icon" aria-hidden="true">
              <i className="fas fa-gears"></i>
            </span>
            <div>
              <span className="sys-settings-hero-kicker">Active academic year</span>
              <h2>{academicYear}</h2>
              <p>Platform-wide defaults for departments, registration, and review routing.</p>
            </div>
          </div>
          <div className="sys-settings-hero-chips">
            <span className={registration === 'open' ? 'is-good' : 'is-muted'}>
              <i className={`fas ${registration === 'open' ? 'fa-lock-open' : 'fa-lock'}`}></i>
              {registration === 'open' ? 'Registration open' : 'Invite only'}
            </span>
            <span>
              <i className="fas fa-route"></i>
              {workflow === 'standard' ? 'Standard' : 'Accelerated'} · {routeSteps.length - 1} reviews
            </span>
            <span>
              <i className="fas fa-building-columns"></i>
              {departments.length} departments
            </span>
          </div>
        </section>

        <section className="sys-settings-panel">
          <div className="sys-settings-sections">
            <section className="sys-settings-section">
              <header>
                <span className="sys-settings-icon" aria-hidden="true">
                  <i className="fas fa-sliders"></i>
                </span>
                <div>
                  <h3>Core Configuration</h3>
                  <p>Global parameters that set the system's operational scope.</p>
                </div>
              </header>
              <div className="sys-settings-fields">
                <div className="form-field">
                  <label htmlFor="sys-settings-year">Active Academic Year</label>
                  <select id="sys-settings-year" value={academicYear} onChange={(event) => setAcademicYear(event.target.value)}>
                    <option value="2025-2026">2025-2026</option>
                    <option value="2026-2027">2026-2027</option>
                  </select>
                  <small className="sys-settings-hint">Reporting period used across dashboards and archives.</small>
                </div>
                <div className="form-field">
                  <label htmlFor="sys-settings-dept-status">Default Department Status</label>
                  <select id="sys-settings-dept-status" defaultValue="active">
                    <option value="active">Active (Onboarding allowed)</option>
                    <option value="inactive">Inactive (Locked)</option>
                  </select>
                  <small className="sys-settings-hint">Applied to newly created departments.</small>
                </div>
                <div className="sys-settings-block">
                  <div className="sys-settings-block-head">
                    <span>Managed Departments</span>
                    <b>{departments.length}</b>
                  </div>
                  <div className="sys-settings-chips">
                    {departments.map((department) => (
                      <span key={department}>
                        <i className="fas fa-building-columns"></i>
                        {department}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="sys-settings-section is-amber">
              <header>
                <span className="sys-settings-icon" aria-hidden="true">
                  <i className="fas fa-route"></i>
                </span>
                <div>
                  <h3>Workflow & Identity Policies</h3>
                  <p>How users register and how documents are routed.</p>
                </div>
              </header>
              <div className="sys-settings-fields">
                <div className="form-field">
                  <label htmlFor="sys-settings-registration">Student Registration</label>
                  <select id="sys-settings-registration" value={registration} onChange={(event) => setRegistration(event.target.value)}>
                    <option value="open">Self-register enabled (Open)</option>
                    <option value="invite">Closed (Invite only)</option>
                  </select>
                  <small className={`sys-settings-status ${registration === 'open' ? 'is-open' : 'is-closed'}`}>
                    <i className={`fas ${registration === 'open' ? 'fa-lock-open' : 'fa-lock'}`}></i>
                    {registration === 'open' ? 'Students can create their own accounts' : 'Accounts are created by invitation only'}
                  </small>
                </div>
                <div className="form-field">
                  <label htmlFor="sys-settings-workflow">Workflow Routing Template</label>
                  <select id="sys-settings-workflow" value={workflow} onChange={(event) => setWorkflow(event.target.value)}>
                    <option value="standard">Standard (Adviser → Prog Head → Res Head)</option>
                    <option value="accelerated">Accelerated (Adviser → Res Head)</option>
                  </select>
                  <small className="sys-settings-hint">Order in which submissions are reviewed.</small>
                </div>
                <div className="sys-settings-block">
                  <div className="sys-settings-block-head">
                    <span>Approval Route</span>
                    <b>{routeSteps.length - 1} reviews</b>
                  </div>
                  <ol className="sys-settings-route">
                    {routeSteps.map((step) => (
                      <li key={step.label}>
                        <span><i className={`fas ${step.icon}`}></i></span>
                        {step.label}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </section>
          </div>

          <footer className="sys-settings-footer">
            <p>
              <span aria-hidden="true"><i className="fas fa-shield-halved"></i></span>
              Saving applies immediately to system routing, identity provisioning, and access policies.
            </p>
            <button className="btn btn-primary" type="button">
              <i className="fas fa-floppy-disk"></i>
              Apply Configuration
            </button>
          </footer>
        </section>
      </div>
    </SystemAdminShell>
  );
}

type LogTone = 'approved' | 'warning' | 'info';

const LOG_TONE_LABELS: Record<LogTone, string> = {
  approved: 'Allowed',
  warning: 'Warning',
  info: 'Info'
};

const SECURITY_LOGS: Array<{
  event: string;
  actor: string;
  detail: string;
  time: string;
  tone: LogTone;
  icon: string;
}> = [
  { event: 'RBAC policy checked', actor: 'System Admin', detail: 'Route /system-admin/users allowed', time: 'Today 10:12 AM', tone: 'approved', icon: 'fa-shield-halved' },
  { event: 'Research Head denied technical route', actor: 'Proxy', detail: 'Redirected to /research-head/dashboard', time: 'Today 9:44 AM', tone: 'warning', icon: 'fa-triangle-exclamation' },
  { event: 'Backup completed', actor: 'Scheduler', detail: 'Database snapshot created', time: 'Today 2:10 AM', tone: 'approved', icon: 'fa-database' },
  { event: 'Public registration completed', actor: 'Student', detail: 'New student account created through self-register', time: 'Yesterday 4:18 PM', tone: 'info', icon: 'fa-user-plus' }
];

const SECURITY_KPIS = [
  { label: 'Audit Events', value: '1,248', meta: 'Last 30 days', icon: 'fa-file-shield', accent: '#F6BE00' },
  { label: 'Denied Access', value: '12', meta: 'Blocked by route policy', icon: 'fa-ban', accent: '#F87171' },
  { label: 'Privileged Users', value: '3', meta: 'System Admin accounts', icon: 'fa-user-shield', accent: '#F6BE00' },
  { label: 'Password Resets', value: '7', meta: 'Last 30 days', icon: 'fa-key', accent: '#34D399' }
];

function downloadCsv(filename: string, rows: string[][]) {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const blob = new Blob([rows.map((row) => row.map(escape).join(',')).join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function SystemAdminLogs() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [logQuery, setLogQuery] = useState('');
  const [toneFilter, setToneFilter] = useState<'all' | LogTone>('all');
  const [actorFilter, setActorFilter] = useState('all');

  const actors = Array.from(new Set(SECURITY_LOGS.map((log) => log.actor))).sort();
  const normalizedQuery = logQuery.trim().toLowerCase();
  const visibleLogs = SECURITY_LOGS.filter((log) => {
    const matchesTone = toneFilter === 'all' || log.tone === toneFilter;
    const matchesActor = actorFilter === 'all' || log.actor === actorFilter;
    const matchesQuery =
      !normalizedQuery ||
      log.event.toLowerCase().includes(normalizedQuery) ||
      log.detail.toLowerCase().includes(normalizedQuery) ||
      log.actor.toLowerCase().includes(normalizedQuery);

    return matchesTone && matchesActor && matchesQuery;
  });
  const activeFilterCount = [Boolean(normalizedQuery), toneFilter !== 'all', actorFilter !== 'all'].filter(Boolean).length;

  const clearLogFilters = () => {
    setLogQuery('');
    setToneFilter('all');
    setActorFilter('all');
  };

  const exportLogs = () => {
    downloadCsv('security-activity-log.csv', [
      ['Time', 'Event', 'Actor', 'Detail', 'Type'],
      ...visibleLogs.map((log) => [log.time, log.event, log.actor, log.detail, LOG_TONE_LABELS[log.tone]])
    ]);
  };

  return (
    <SystemAdminShell
      activeNav="logs"
      title="Logs and Security"
      description="Audit and security activity for authentication, RBAC, backups, and configuration."
    >
      <div className="admin-page-stack sys-ops-page">
        <section className="admin-grid-4">
          {SECURITY_KPIS.map((kpi) => (
            <article key={kpi.label} className="admin-kpi-card sys-ops-kpi">
              <span className="admin-kpi-label">
                <i className={`fas ${kpi.icon}`} style={{ color: kpi.accent }}></i> {kpi.label}
              </span>
              <strong className="admin-kpi-value">{kpi.value}</strong>
              <span className="admin-kpi-meta">{kpi.meta}</span>
            </article>
          ))}
        </section>

        <section className="admin-section-card sys-ops-card is-amber">
          <div className="admin-section-head">
            <div>
              <h3>Security Activity Log</h3>
              <p>System logs are technical records and remain outside Research Head access.</p>
            </div>
            <div className="sys-ops-head-actions">
              <button
                aria-controls="sys-logs-filters"
                aria-expanded={isFilterOpen}
                className={`btn btn-outline small${isFilterOpen || activeFilterCount ? ' is-active' : ''}`}
                type="button"
                onClick={() => setIsFilterOpen((current) => !current)}
              >
                <i className="fas fa-filter"></i> Filter
                {activeFilterCount ? <b className="sys-ops-count">{activeFilterCount}</b> : null}
              </button>
              <button className="btn btn-outline small" disabled={!visibleLogs.length} type="button" onClick={exportLogs}>
                <i className="fas fa-file-export"></i> Export Logs
              </button>
            </div>
          </div>

          {isFilterOpen ? (
            <div id="sys-logs-filters" className="sys-ops-filters">
              <div className="system-input-shell sys-ops-search">
                <i className="fas fa-magnifying-glass" aria-hidden="true"></i>
                <input
                  aria-label="Search logs"
                  className="admin-toolbar-input"
                  placeholder="Search event, actor, or route"
                  type="search"
                  value={logQuery}
                  onChange={(event) => setLogQuery(event.target.value)}
                />
              </div>
              <select
                aria-label="Filter by type"
                className="admin-toolbar-select"
                value={toneFilter}
                onChange={(event) => setToneFilter(event.target.value as 'all' | LogTone)}
              >
                <option value="all">All types</option>
                <option value="approved">Allowed</option>
                <option value="warning">Warnings</option>
                <option value="info">Info</option>
              </select>
              <select
                aria-label="Filter by actor"
                className="admin-toolbar-select"
                value={actorFilter}
                onChange={(event) => setActorFilter(event.target.value)}
              >
                <option value="all">All actors</option>
                {actors.map((actor) => (
                  <option key={actor} value={actor}>{actor}</option>
                ))}
              </select>
              {activeFilterCount ? (
                <button className="btn btn-outline small" type="button" onClick={clearLogFilters}>
                  <i className="fas fa-xmark"></i> Clear
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="admin-section-body sys-logs-body">
            {visibleLogs.length ? (
              <ol className="sys-logs-list">
                {visibleLogs.map((log) => (
                  <li key={`${log.time}-${log.event}`} className={`sys-logs-item is-${log.tone}`}>
                    <span className="sys-logs-icon" aria-hidden="true">
                      <i className={`fas ${log.icon}`}></i>
                    </span>
                    <div className="sys-logs-content">
                      <div className="sys-logs-title">
                        <strong>{log.event}</strong>
                        <span className={`sys-logs-tone is-${log.tone}`}>{LOG_TONE_LABELS[log.tone]}</span>
                      </div>
                      <div className="sys-logs-meta">
                        <span className="admin-inline-badge sys-logs-actor">
                          <i className="fas fa-user"></i>
                          {log.actor}
                        </span>
                        <span className="sys-logs-detail">
                          {log.detail.split(' ').map((word, index) =>
                            word.startsWith('/') ? <code key={index}>{word}</code> : `${word} `
                          )}
                        </span>
                      </div>
                    </div>
                    <time>{log.time}</time>
                  </li>
                ))}
              </ol>
            ) : (
              <div className={`admin-empty-state ${usersStyles.empty}`}>
                <span>No log entries match these filters.</span>
                <button className="btn btn-outline small" type="button" onClick={clearLogFilters}>
                  Show all entries
                </button>
              </div>
            )}
          </div>

          <div className="sys-ops-foot">
            <span>
              Showing {visibleLogs.length} of {SECURITY_LOGS.length} entries
            </span>
            <span className="sys-ops-legend" aria-label="Legend">
              {(Object.keys(LOG_TONE_LABELS) as LogTone[]).map((tone) => (
                <span key={tone} className={`is-${tone}`}><i></i>{LOG_TONE_LABELS[tone]}</span>
              ))}
            </span>
          </div>
        </section>
      </div>
    </SystemAdminShell>
  );
}

const BACKUP_SNAPSHOTS = [
  { file: 'backup-2026-05-01-0210.sql', status: 'Completed', size: '2.4 GB', created: 'Today 2:10 AM' },
  { file: 'backup-2026-04-30-0210.sql', status: 'Completed', size: '2.3 GB', created: 'Apr 30, 2026' },
  { file: 'backup-2026-04-29-0210.sql', status: 'Completed', size: '2.3 GB', created: 'Apr 29, 2026' },
  { file: 'backup-2026-04-28-0210.sql', status: 'Verified', size: '2.3 GB', created: 'Apr 28, 2026' }
];

const BACKUP_STORAGE_USED = 71;

export function SystemAdminBackups() {
  const storageTone = BACKUP_STORAGE_USED >= 90 ? 'is-danger' : BACKUP_STORAGE_USED >= 75 ? 'is-warning' : '';
  const totalSize = BACKUP_SNAPSHOTS.reduce((sum, backup) => sum + (Number.parseFloat(backup.size) || 0), 0);

  return (
    <SystemAdminShell
      activeNav="backups"
      title="Backup and Restore"
      description="Technical database backup and restore controls owned by System Admin."
    >
      <div className="admin-page-stack sys-ops-page">
        <section className="admin-grid-4">
          <article className="admin-kpi-card sys-ops-kpi">
            <span className="admin-kpi-label">
              <i className="fas fa-database" style={{ color: '#F6BE00' }}></i> Backup Policy
            </span>
            <strong className="admin-kpi-value">Daily</strong>
            <span className="admin-kpi-meta">Automated at 2:10 AM · next run tomorrow</span>
          </article>
          <article className="admin-kpi-card sys-ops-kpi">
            <span className="admin-kpi-label">
              <i className="fas fa-clock-rotate-left" style={{ color: '#38BDF8' }}></i> Retention
            </span>
            <strong className="admin-kpi-value">30 Days</strong>
            <span className="admin-kpi-meta">Rolling backup window</span>
          </article>
          <article className={`admin-kpi-card sys-ops-kpi ${storageTone}`}>
            <span className="admin-kpi-label">
              <i className="fas fa-hard-drive" style={{ color: '#F87171' }}></i> Storage Used
            </span>
            <strong className="admin-kpi-value">{BACKUP_STORAGE_USED}%</strong>
            <div
              className="sys-ops-meter"
              role="meter"
              aria-label="Backup storage used"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={BACKUP_STORAGE_USED}
            >
              <i style={{ width: `${BACKUP_STORAGE_USED}%` }}></i>
            </div>
            <span className="admin-kpi-meta">Backup storage pool</span>
          </article>
          <article className="admin-kpi-card sys-ops-kpi">
            <span className="admin-kpi-label">
              <i className="fas fa-shield-halved" style={{ color: '#34D399' }}></i> Restore Test
            </span>
            <strong className="admin-kpi-value">Passed</strong>
            <span className="admin-kpi-meta">Latest restore verification</span>
          </article>
        </section>

        <section className="admin-section-card sys-ops-card">
          <div className="admin-section-head">
            <div>
              <h3>Backup Catalog</h3>
              <p>Restore actions require System Administrator access.</p>
            </div>
            <div className="sys-ops-head-actions">
              <button className="btn btn-primary" type="button">
                <i className="fas fa-plus"></i>
                Run Manual Backup
              </button>
              <button className="btn btn-outline" type="button">
                <i className="fas fa-upload"></i>
                Restore Custom
              </button>
            </div>
          </div>

          <div className="table-scroll sys-backups-table">
            <table>
              <thead>
                <tr>
                  <th>Snapshot File</th>
                  <th>Status</th>
                  <th>Size</th>
                  <th>Created</th>
                  <th className="sys-backups-actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {BACKUP_SNAPSHOTS.map((backup, index) => (
                  <tr key={backup.file}>
                    <td>
                      <div className="sys-backups-file">
                        <i className="fas fa-file-zipper" aria-hidden="true"></i>
                        <span>{backup.file}</span>
                        {index === 0 ? <em>Latest</em> : null}
                      </div>
                    </td>
                    <td>
                      <span className={`sys-backups-status${backup.status === 'Verified' ? ' is-verified' : ''}`}>
                        <i className={`fas ${backup.status === 'Verified' ? 'fa-circle-check' : 'fa-check'}`}></i>
                        {backup.status}
                      </span>
                    </td>
                    <td className="sys-backups-muted">{backup.size}</td>
                    <td className="sys-backups-muted">{backup.created}</td>
                    <td className="sys-backups-actions-col">
                      <div className="sys-backups-row-actions">
                        <button aria-label={`Restore ${backup.file}`} className="sys-backups-icon-btn" title="Restore this snapshot" type="button">
                          <i className="fas fa-rotate-left"></i>
                        </button>
                        <button aria-label={`Download ${backup.file}`} className="sys-backups-icon-btn" title="Download" type="button">
                          <i className="fas fa-download"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sys-ops-foot">
            <span>
              {BACKUP_SNAPSHOTS.length} snapshots · {totalSize.toFixed(1)} GB total
            </span>
            <span>
              <i className="fas fa-lock"></i> Snapshots older than 30 days are removed automatically
            </span>
          </div>
        </section>
      </div>
    </SystemAdminShell>
  );
}

const MAINTENANCE_MESSAGE_LIMIT = 200;

const MAINTENANCE_EXCEPTIONS: Array<{ key: string; name: string; icon: string; locked?: boolean }> = [
  { key: 'admin-login', name: 'System Administrator Login', icon: 'fa-user-shield', locked: true },
  { key: 'backups', name: 'Backup and Restore Console', icon: 'fa-database' },
  { key: 'logs', name: 'Security & Audit Logs', icon: 'fa-file-shield' },
  { key: 'settings', name: 'System Settings', icon: 'fa-sliders' }
];

// Every user role except System Administrator (same order and icons as Roles & Permissions).
// Tech Transfer is a workflow, not a user role, so it isn't listed.
const MAINTENANCE_BLOCKED = [
  { name: 'Library Personnel', icon: 'fa-book-open-reader' },
  { name: 'Research Head', icon: 'fa-building-columns' },
  { name: 'Research Focal Person', icon: 'fa-user-check' },
  { name: 'Program Head', icon: 'fa-user-tie' },
  { name: 'Panelist', icon: 'fa-clipboard-check' },
  { name: 'Adviser', icon: 'fa-chalkboard-user' },
  { name: 'Student', icon: 'fa-user-graduate' },
  { name: 'Industry Partner', icon: 'fa-handshake' }
];

// datetime-local values are local wall-clock time ("2026-10-03T22:00").
function toDateTimeLocalValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatWindowTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest}m`;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function SystemAdminMaintenance() {
  const [enabled, setEnabled] = useState(false);
  const [start, setStart] = useState('2026-10-03T22:00');
  const [end, setEnd] = useState('2026-10-04T01:00');
  const [message, setMessage] = useState('Thesis Track is temporarily unavailable for scheduled maintenance.');
  const [notice, setNotice] = useState('24h');
  const [scheduled, setScheduled] = useState<{ start: string; end: string } | null>({ start: '2026-10-03T22:00', end: '2026-10-04T01:00' });
  const [exceptions, setExceptions] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(MAINTENANCE_EXCEPTIONS.map((item) => [item.key, true]))
  );

  const durationMinutes = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  const windowError = !start || !end
    ? 'Choose a start and end time.'
    : Number.isNaN(durationMinutes) || durationMinutes <= 0
      ? 'End time must be after the start time.'
      : '';
  const isScheduleDirty = !scheduled || scheduled.start !== start || scheduled.end !== end;
  const allowedCount = Object.values(exceptions).filter(Boolean).length;

  const toggleLockdown = () => {
    const prompt = enabled
      ? 'Restore access for all role portals?'
      : 'Initiate lockdown now? Every role portal will go offline immediately and users will see the maintenance message.';

    if (window.confirm(prompt)) {
      setEnabled((current) => !current);
    }
  };

  const applyDurationPreset = (hours: number) => {
    const base = new Date(start);
    if (Number.isNaN(base.getTime())) return;
    setEnd(toDateTimeLocalValue(new Date(base.getTime() + hours * 3_600_000)));
  };

  return (
    <SystemAdminShell
      activeNav="maintenance"
      title="Maintenance Mode"
      description="Control planned technical downtime and platform availability."
    >
      <div className="admin-page-stack sys-maint-page">
        {/* Status card */}
        <section className={`admin-impact-card sys-maint-hero${enabled ? ' is-offline' : ''}`} aria-live="polite">
          <div className="sys-maint-hero-main">
            <span className="sys-maint-hero-icon" aria-hidden="true">
              <i className={`fas ${enabled ? 'fa-lock' : 'fa-satellite-dish'}`}></i>
            </span>
            <div>
              <span className="sys-maint-hero-state">
                <i aria-hidden="true"></i>
                {enabled ? 'Lockdown active' : 'All systems operational'}
              </span>
              <h2>{enabled ? 'System Offline' : 'System Online'}</h2>
              <p>
                {enabled
                  ? `Role portals are blocked. ${allowedCount} admin function${allowedCount === 1 ? '' : 's'} remain available.`
                  : 'All role portals are available under the current RBAC rules.'}
              </p>
            </div>
          </div>

          <div className="sys-maint-hero-side">
            {scheduled && !enabled ? (
              <div className="sys-maint-hero-next">
                <span>Next window</span>
                <strong>{formatWindowTime(scheduled.start)} – {formatWindowTime(scheduled.end)}</strong>
              </div>
            ) : null}
            <button className="sys-maint-hero-button" type="button" onClick={toggleLockdown}>
              <i className={`fas ${enabled ? 'fa-unlock' : 'fa-power-off'}`}></i>
              {enabled ? 'Restore Access' : 'Initiate Lockdown'}
            </button>
          </div>
        </section>

        <section className="sys-maint-grid">
          {/* Scheduling */}
          <section className="sys-maint-card">
            <header className="sys-maint-card-head">
              <span className="sys-maint-card-icon is-amber" aria-hidden="true"><i className="fas fa-calendar-days"></i></span>
              <div>
                <h3>Maintenance Window</h3>
                <p>Schedule downtime and the message users see.</p>
              </div>
              {scheduled ? (
                <span className="sys-maint-pill is-scheduled">
                  <i className="fas fa-clock"></i>
                  Scheduled
                </span>
              ) : null}
            </header>

            <div className="sys-maint-card-body">
              <div className="sys-maint-fields">
                <div className="form-field">
                  <label htmlFor="sys-maint-start">Start time</label>
                  <input id="sys-maint-start" type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} />
                </div>
                <div className="form-field">
                  <label htmlFor="sys-maint-end">End time</label>
                  <input
                    id="sys-maint-end"
                    aria-invalid={Boolean(windowError)}
                    type="datetime-local"
                    value={end}
                    onChange={(event) => setEnd(event.target.value)}
                  />
                </div>
              </div>

              <div className="sys-maint-duration">
                {windowError ? (
                  <span className="sys-maint-error">
                    <i className="fas fa-circle-exclamation"></i>
                    {windowError}
                  </span>
                ) : (
                  <span>
                    <i className="fas fa-hourglass-half"></i>
                    Duration <strong>{formatDuration(durationMinutes)}</strong>
                  </span>
                )}
                <div className="sys-maint-presets" role="group" aria-label="Set duration">
                  {[1, 2, 4, 8].map((hours) => (
                    <button key={hours} type="button" onClick={() => applyDurationPreset(hours)}>
                      {hours}h
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="sys-maint-notice">Advance notice to users</label>
                <select id="sys-maint-notice" value={notice} onChange={(event) => setNotice(event.target.value)}>
                  <option value="none">No advance notice</option>
                  <option value="1h">Show a banner 1 hour before</option>
                  <option value="24h">Show a banner 24 hours before</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="sys-maint-message">
                  Public interruption message
                  <span className={`sys-maint-counter${message.length > MAINTENANCE_MESSAGE_LIMIT - 20 ? ' is-near' : ''}`}>
                    {message.length}/{MAINTENANCE_MESSAGE_LIMIT}
                  </span>
                </label>
                <textarea
                  id="sys-maint-message"
                  maxLength={MAINTENANCE_MESSAGE_LIMIT}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
              </div>

              <div className="sys-maint-preview" aria-label="Message preview">
                <span className="sys-maint-preview-label">Preview</span>
                <div className="sys-maint-preview-banner">
                  <i className="fas fa-screwdriver-wrench" aria-hidden="true"></i>
                  <div>
                    <strong>{message.trim() || 'Your maintenance message will appear here.'}</strong>
                    {!windowError ? (
                      <small>Expected back by {formatWindowTime(end)}</small>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <footer className="sys-maint-card-foot">
              {scheduled ? (
                <button className="btn btn-outline" type="button" onClick={() => setScheduled(null)}>
                  <i className="fas fa-calendar-xmark"></i>
                  Cancel Window
                </button>
              ) : <span></span>}
              <button
                className="btn btn-primary"
                disabled={Boolean(windowError) || !isScheduleDirty}
                type="button"
                onClick={() => setScheduled({ start, end })}
              >
                <i className="fas fa-calendar-check"></i>
                {scheduled ? 'Update Schedule' : 'Save Schedule'}
              </button>
            </footer>
          </section>

          {/* Access during lockdown */}
          <section className="sys-maint-card">
            <header className="sys-maint-card-head">
              <span className="sys-maint-card-icon" aria-hidden="true"><i className="fas fa-key"></i></span>
              <div>
                <h3>Access During Lockdown</h3>
                <p>What stays available and what goes offline.</p>
              </div>
            </header>

            <div className="sys-maint-card-body">
              <div className="sys-maint-list-head">
                <span>Stays available</span>
                <b>{allowedCount}/{MAINTENANCE_EXCEPTIONS.length}</b>
              </div>
              <ul className="sys-maint-list">
                {MAINTENANCE_EXCEPTIONS.map((item) => {
                  const isOn = exceptions[item.key];

                  return (
                    <li key={item.key} className={isOn ? '' : 'is-off'}>
                      <span className="sys-maint-list-icon" aria-hidden="true"><i className={`fas ${item.icon}`}></i></span>
                      <div>
                        <strong>{item.name}</strong>
                        {item.locked ? <small>Always on so you can restore access</small> : null}
                      </div>
                      <label className="sys-maint-switch">
                        <input
                          aria-label={`${item.name} available during lockdown`}
                          checked={isOn}
                          disabled={item.locked}
                          type="checkbox"
                          onChange={(event) => setExceptions((current) => ({ ...current, [item.key]: event.target.checked }))}
                        />
                        <span aria-hidden="true"></span>
                      </label>
                    </li>
                  );
                })}
              </ul>

              <div className="sys-maint-list-head">
                <span>Goes offline</span>
                <b className="is-blocked">{MAINTENANCE_BLOCKED.length}</b>
              </div>
              <div className="sys-maint-blocked">
                {MAINTENANCE_BLOCKED.map((item) => (
                  <span key={item.name}>
                    <i className={`fas ${item.icon}`}></i>
                    {item.name}
                  </span>
                ))}
              </div>
            </div>

            <footer className="sys-maint-card-foot">
              <p className="sys-maint-foot-note">
                <i className="fas fa-circle-info"></i>
                These rules apply whenever a lockdown or scheduled window is active.
              </p>
            </footer>
          </section>
        </section>
      </div>
    </SystemAdminShell>
  );
}
