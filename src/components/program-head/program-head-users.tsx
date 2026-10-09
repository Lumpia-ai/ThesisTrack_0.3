'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ProgramHeadShell } from '@/components/program-head/program-head-shell';
import { AccountReviewQueue } from '@/components/rbac/account-review-queue';
import { AccountRolesPanel } from '@/components/rbac/account-roles-panel';
import { UserManagementTabs, useUserManagementView } from '@/components/rbac/user-management-tabs';
import { ProgramHeadAccountsDirectory } from '@/components/program-head/program-head-accounts-directory';
import { ProgramHeadDrawer } from '@/components/program-head/program-head-primitives';

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
  | 'focal_person'
  | 'secretary';

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: ApiUserRole;
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

type BannerState = {
  tone: 'success' | 'warning';
  title: string;
  body: string;
};

type UserFormState = {
  firstName: string;
  lastName: string;
  email: string;
  role: ApiUserRole;
  department: string;
  studentId: string;
  yearLevel: string;
  password: string;
  confirmPassword: string;
};

const ROLE_OPTIONS: Array<{
  value: ApiUserRole;
  label: string;
  description: string;
}> = [
  { value: 'student', label: 'Student', description: 'Student portal access and thesis submission workspace.' },
  { value: 'adviser', label: 'Adviser', description: 'Faculty adviser review and guidance tools.' },
  { value: 'panel', label: 'Panelist', description: 'Panel review access for evaluations and defense workflows.' },
  { value: 'program_head', label: 'Program Head', description: 'Program-level approval and oversight access.' },
  { value: 'library', label: 'Library', description: 'Repository release and archival access.' },
  { value: 'partner', label: 'Partner', description: 'Industry partner view for collaborations and feedback.' },
  { value: 'tech_transfer', label: 'Tech Transfer', description: 'Deployment and commercialization workflow access.' },
  { value: 'research_head', label: 'Research Head', description: 'Research oversight and analytics access.' },
  { value: 'system_admin', label: 'System Administrator', description: 'Technical system configuration and maintenance access.' },
  { value: 'admin', label: 'Legacy Admin', description: 'Legacy research administrator role retained for compatibility.' }
];


const YEAR_LEVEL_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Graduate'];

const EMPTY_FORM: UserFormState = {
  firstName: '',
  lastName: '',
  email: '',
  role: 'adviser',
  department: '',
  studentId: '',
  yearLevel: '',
  password: '',
  confirmPassword: ''
};

function roleDescription(role: ApiUserRole) {
  return ROLE_OPTIONS.find((option) => option.value === role)?.description ?? 'Account access is managed through the assigned role.';
}

async function parseApiPayload<T>(response: Response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return null;
}

export function ProgramHeadUsers() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [modalState, setModalState] = useState<{ mode: 'create' } | { mode: 'edit'; userId: string } | null>(null);
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSuspensionUserId, setActiveSuspensionUserId] = useState<string | null>(null);
  const [rolesUserId, setRolesUserId] = useState<string | null>(null);
  // ?tab=requests opens the account requests view; the old /program-head/applications redirects here.
  const { view, changeView, pendingCount, refreshPendingCount } = useUserManagementView('/program-head/users');

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
        throw new Error(payload?.message || 'Unable to load the user directory right now.');
      }

      setUsers(payload.users);
      setBanner(null);
    } catch (error) {
      setBanner({
        tone: 'warning',
        title: 'Unable to load the user directory',
        body:
          error instanceof Error && error.message
            ? error.message
            : 'The page could not load user records from the server.'
      });
    } finally {
      if (mode === 'initial') {
        setIsLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);



  const isStudentRole = form.role === 'student';

  const openCreateModal = () => {
    setModalState({ mode: 'create' });
    setForm(EMPTY_FORM);
    setFieldErrors({});
  };

  const openEditModal = (user: ManagedUser) => {
    setModalState({ mode: 'edit', userId: user.id });
    setForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email,
      role: user.role,
      department: user.department || '',
      studentId: user.studentId || '',
      yearLevel: user.yearLevel || '',
      password: '',
      confirmPassword: ''
    });
    setFieldErrors({});
  };

  const closeModal = () => {
    setModalState(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
  };

  const updateFormField = (field: keyof UserFormState, value: string) => {
    setForm((current) => {
      const next = {
        ...current,
        [field]: value
      };

      if (field === 'role' && value !== 'student') {
        next.studentId = '';
        next.yearLevel = '';
      }

      return next;
    });

    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const endpoint = modalState?.mode === 'edit' ? `/api/users/${modalState.userId}` : '/api/users';
      const method = modalState?.mode === 'edit' ? 'PATCH' : 'POST';
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        role: form.role,
        department: form.department.trim(),
        studentId: form.studentId.trim(),
        yearLevel: form.yearLevel.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword
      };

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify(payload)
      });

      const result = await parseApiPayload<UserMutationResponse>(response);

      if (!response.ok || !result?.success || !result.user) {
        setFieldErrors(result?.fieldErrors || {});
        setBanner({
          tone: 'warning',
          title: modalState?.mode === 'edit' ? 'Unable to update the account' : 'Unable to create the account',
          body: result?.message || 'The server rejected this request.'
        });
        return;
      }

      const savedUser = result.user;

      setUsers((current) => {
        if (modalState?.mode === 'edit') {
          return current.map((user) => (user.id === savedUser.id ? savedUser : user));
        }

        return [savedUser, ...current];
      });
      setBanner({
        tone: 'success',
        title: modalState?.mode === 'edit' ? 'Account updated' : 'Account created',
        body: result.message || `${savedUser.name} is now available in the directory.`
      });
      closeModal();
    } catch (error) {
      setBanner({
        tone: 'warning',
        title: modalState?.mode === 'edit' ? 'Unable to update the account' : 'Unable to create the account',
        body:
          error instanceof Error && error.message
            ? error.message
            : 'The request could not be completed.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSuspensionToggle = async (user: ManagedUser, suspended: boolean): Promise<boolean> => {
    setActiveSuspensionUserId(user.id);

    try {
      const response = await fetch(`/api/users/${user.id}/suspension`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({ suspended })
      });
      const result = await parseApiPayload<UserMutationResponse>(response);

      if (!response.ok || !result?.success || !result.user) {
        setBanner({
          tone: 'warning',
          title: suspended ? 'Unable to suspend the account' : 'Unable to restore the account',
          body: result?.message || 'The server rejected this request.'
        });
        return false;
      }

      const updatedUser = result.user;

      setUsers((current) =>
        current.map((currentUser) => (currentUser.id === updatedUser.id ? updatedUser : currentUser))
      );
      setBanner({
        tone: 'success',
        title: suspended ? 'Account suspended' : 'Account restored',
        body: result.message || `${user.name} has been updated.`
      });
      return true;
    } catch (error) {
      setBanner({
        tone: 'warning',
        title: suspended ? 'Unable to suspend the account' : 'Unable to restore the account',
        body:
          error instanceof Error && error.message
            ? error.message
            : 'The request could not be completed.'
      });
      return false;
    } finally {
      setActiveSuspensionUserId(null);
    }
  };

  return (
    <>
      <ProgramHeadShell
        activeNav="users"
        title="User Management"
        description="Manage your department's accounts and review new account requests."
      >
        <div className="ph-page-content">
          <UserManagementTabs view={view} onChange={changeView} pendingCount={pendingCount} />

          {view === 'requests' ? (
            <AccountReviewQueue
              scopeDescription="Student, Adviser and Panel Member registrations for your department, and for departments that don't have a Program Head yet."
              onChange={() => {
                void refreshPendingCount();
                void loadUsers('refresh');
              }}
            />
          ) : (
          <>
          <ProgramHeadAccountsDirectory
            users={users}
            isLoading={isLoading}
            isRefreshing={isRefreshing}
            banner={banner}
            onDismissBanner={() => setBanner(null)}
            onRefresh={() => void loadUsers('refresh')}
            onAddAdviser={openCreateModal}
            onEdit={(user) => openEditModal(user as ManagedUser)}
            onManageRoles={(user) => setRolesUserId(user.id)}
            onSetSuspended={(user, suspended) => handleSuspensionToggle(user as ManagedUser, suspended)}
            busyUserId={activeSuspensionUserId}
          />
          </>
          )}
        </div>
      </ProgramHeadShell>

      <AccountRolesPanel userId={rolesUserId} onClose={() => setRolesUserId(null)} onChanged={() => void loadUsers('refresh')} />

      <ProgramHeadDrawer open={!!modalState} title={modalState?.mode === 'edit' ? 'Edit Adviser Account' : 'Add Adviser Account'} onClose={closeModal} maxWidth={650}>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* --- Section: Identity --- */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-900/5 transition-all hover:shadow-md">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100/50">
                <i className="fas fa-user text-xl" aria-hidden="true" />
              </div>
              <div>
                <h4 className="m-0 text-base font-bold text-slate-800">Personal Information</h4>
                <p className="m-0 mt-1 text-sm text-slate-500">Full name and institutional email address.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="ph-form-field">
                <label htmlFor="user-first-name">First Name</label>
                <input
                  id="user-first-name"
                  className="ph-input"
                  placeholder="e.g. Juan"
                  aria-invalid={fieldErrors.firstName ? 'true' : 'false'}
                  value={form.firstName}
                  onChange={(event) => updateFormField('firstName', event.target.value)}
                />
                {fieldErrors.firstName ? <span className="ph-field-error"><i className="fas fa-circle-exclamation" aria-hidden="true" /> {fieldErrors.firstName}</span> : null}
              </div>
              <div className="ph-form-field">
                <label htmlFor="user-last-name">Last Name</label>
                <input
                  id="user-last-name"
                  className="ph-input"
                  placeholder="e.g. Dela Cruz"
                  aria-invalid={fieldErrors.lastName ? 'true' : 'false'}
                  value={form.lastName}
                  onChange={(event) => updateFormField('lastName', event.target.value)}
                />
                {fieldErrors.lastName ? <span className="ph-field-error"><i className="fas fa-circle-exclamation" aria-hidden="true" /> {fieldErrors.lastName}</span> : null}
              </div>
              <div className="ph-form-field" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="user-email">Email Address</label>
                <div className="ph-input-icon-wrap">
                  <i className="fas fa-envelope" aria-hidden="true" />
                  <input
                    id="user-email"
                    className="ph-input"
                    type="email"
                    placeholder="juan.delacruz@university.edu.ph"
                    aria-invalid={fieldErrors.email ? 'true' : 'false'}
                    value={form.email}
                    onChange={(event) => updateFormField('email', event.target.value)}
                  />
                </div>
                {fieldErrors.email ? <span className="ph-field-error"><i className="fas fa-circle-exclamation" aria-hidden="true" /> {fieldErrors.email}</span> : null}
              </div>
            </div>
          </div>

          {/* --- Section: Access --- */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-900/5 transition-all hover:shadow-md">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 ring-1 ring-purple-100/50">
                <i className="fas fa-shield-halved text-xl" aria-hidden="true" />
              </div>
              <div>
                <h4 className="m-0 text-base font-bold text-slate-800">Portal Role</h4>
                <p className="m-0 mt-1 text-sm text-slate-500">Portal access level.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5">
              <div className="ph-form-field">
                <label htmlFor="user-role">Portal Role</label>
                <select
                  id="user-role"
                  className="ph-select"
                  value={form.role}
                  onChange={(event) => updateFormField('role', event.target.value)}
                >
                  {ROLE_OPTIONS.filter((roleOption) =>
                    roleOption.value === 'adviser' ||
                    (modalState?.mode === 'edit' && roleOption.value === form.role)
                  ).map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <span className="ph-role-hint">
                  <i className="fas fa-info-circle" aria-hidden="true" /> {roleDescription(form.role)}
                </span>
              </div>
            </div>
          </div>

          {/* --- Section: Student Details (conditional) --- */}
          {isStudentRole ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-900/5 transition-all hover:shadow-md">
              <div className="mb-6 flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100/50">
                  <i className="fas fa-id-card text-xl" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="m-0 text-base font-bold text-slate-800">Student Profile</h4>
                  <p className="m-0 mt-1 text-sm text-slate-500">Academic record identifiers for the student portal.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="ph-form-field">
                  <label htmlFor="user-student-id">Student ID</label>
                  <input
                    id="user-student-id"
                    className="ph-input"
                    placeholder="e.g. 2024-00123"
                    aria-invalid={fieldErrors.studentId ? 'true' : 'false'}
                    value={form.studentId}
                    onChange={(event) => updateFormField('studentId', event.target.value)}
                  />
                  {fieldErrors.studentId ? <span className="ph-field-error"><i className="fas fa-circle-exclamation" aria-hidden="true" /> {fieldErrors.studentId}</span> : null}
                </div>
                <div className="ph-form-field">
                  <label htmlFor="user-year-level">Year Level</label>
                  <select
                    id="user-year-level"
                    className="ph-select"
                    aria-invalid={fieldErrors.yearLevel ? 'true' : 'false'}
                    value={form.yearLevel}
                    onChange={(event) => updateFormField('yearLevel', event.target.value)}
                  >
                    <option value="">Select year level</option>
                    {YEAR_LEVEL_OPTIONS.map((yearLevel) => (
                      <option key={yearLevel} value={yearLevel}>
                        {yearLevel}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.yearLevel ? <span className="ph-field-error"><i className="fas fa-circle-exclamation" aria-hidden="true" /> {fieldErrors.yearLevel}</span> : null}
                </div>
              </div>
            </div>
          ) : null}

          {/* --- Section: Credentials --- */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-900/5 transition-all hover:shadow-md">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100/50">
                <i className="fas fa-lock text-xl" aria-hidden="true" />
              </div>
              <div>
                <h4 className="m-0 text-base font-bold text-slate-800">{modalState?.mode === 'edit' ? 'Change Password' : 'Account Credentials'}</h4>
                <p className="m-0 mt-1 text-sm text-slate-500">
                  {modalState?.mode === 'edit' ? 'Leave blank to keep the current password.' : 'Set a temporary password for the first login.'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="ph-form-field">
                <label htmlFor="user-password">
                  {modalState?.mode === 'edit' ? 'New Password' : 'Temporary Password'}
                </label>
                <div className="ph-input-icon-wrap">
                  <i className="fas fa-key" aria-hidden="true" />
                  <input
                    id="user-password"
                    className="ph-input"
                    type="password"
                    placeholder="Min. 6 characters"
                    aria-invalid={fieldErrors.password ? 'true' : 'false'}
                    value={form.password}
                    onChange={(event) => updateFormField('password', event.target.value)}
                  />
                </div>
                {fieldErrors.password ? <span className="ph-field-error"><i className="fas fa-circle-exclamation" aria-hidden="true" /> {fieldErrors.password}</span> : null}
              </div>
              <div className="ph-form-field">
                <label htmlFor="user-confirm-password">Confirm Password</label>
                <div className="ph-input-icon-wrap">
                  <i className="fas fa-key" aria-hidden="true" />
                  <input
                    id="user-confirm-password"
                    className="ph-input"
                    type="password"
                    placeholder="Re-enter password"
                    aria-invalid={fieldErrors.confirmPassword ? 'true' : 'false'}
                    value={form.confirmPassword}
                    onChange={(event) => updateFormField('confirmPassword', event.target.value)}
                  />
                </div>
                {fieldErrors.confirmPassword ? <span className="ph-field-error"><i className="fas fa-circle-exclamation" aria-hidden="true" /> {fieldErrors.confirmPassword}</span> : null}
              </div>
            </div>
          </div>

          {/* --- Footer Actions --- */}
          <div className="sticky bottom-0 -mx-8 -mb-8 mt-8 flex items-center justify-end gap-3 border-t border-slate-100 bg-white/80 px-8 py-5 backdrop-blur-md">
            <button className="flex h-11 items-center justify-center rounded-xl px-5 font-bold text-slate-600 transition-colors hover:bg-slate-100" type="button" onClick={closeModal}>
              Cancel
            </button>
            <button className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#003A8F] px-6 font-bold text-white shadow-md shadow-blue-900/20 transition-all hover:-translate-y-0.5 hover:bg-blue-800 hover:shadow-lg focus:ring-4 focus:ring-blue-500/30" type="submit" disabled={isSaving}>
              <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : modalState?.mode === 'edit' ? 'fa-save' : 'fa-user-plus'}`} aria-hidden="true" />
              {isSaving
                ? modalState?.mode === 'edit'
                  ? 'Saving...'
                  : 'Creating...'
                : modalState?.mode === 'edit'
                  ? 'Save Changes'
                  : 'Create User'}
            </button>
          </div>
        </form>
      </ProgramHeadDrawer>
    </>
  );
}
