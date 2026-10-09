// Client-side shapes of the account review and role management APIs (src/app/api/applications,
// src/app/api/users/[id]/roles, .../history), plus the one fetch helper the review screens share.

export type ApplicationStatus = 'pending' | 'verified' | 'rejected';
export type AccountStatus = 'pending_verification' | 'pending_role_assignment' | 'active' | 'rejected';

export type ApplicationSummary = {
  id: string;
  status: ApplicationStatus;
  requestedRole: string;
  requestedRoleLabel: string;
  department: { id: string; name: string } | null;
  documentType: string;
  documentLabel: string;
  document: { fileName: string; fileType: string | null; size: number | null } | null;
  /** Back of an ID card; null for single-page documents. */
  documentBack: { fileName: string; fileType: string | null; size: number | null } | null;
  decisionNote: string | null;
  reviewedAt: string | null;
  reviewedBy: { id: string; name: string } | null;
  submittedAt: string;
  applicant: {
    id: string;
    name: string;
    email: string;
    studentId: string | null;
    yearLevel: string | null;
    department: string | null;
    accountStatus: AccountStatus;
    isSuspended: boolean;
  };
};

export type RoleAssignment = {
  id: string;
  role: string;
  label: string;
  /** 'INSTITUTION', 'NONE' (department role without a department: own records only) or a department id. */
  scope: string;
  departmentId: string | null;
  status: 'active' | 'revoked';
  grantedAt: string;
  grantedBy: { id: string; name: string } | null;
  revokedAt: string | null;
  revokedBy: { id: string; name: string } | null;
  revokeReason: string | null;
  canRevoke: boolean;
};

export type RolesSummary = {
  user: {
    id: string;
    name: string;
    email: string;
    department: string | null;
    departmentId: string | null;
    defaultRole: string;
    accountStatus: AccountStatus;
    isSuspended: boolean;
  };
  assignments: RoleAssignment[];
  grantableRoles: { role: string; label: string }[];
};

export type HistoryEntry = {
  id: string;
  action: string;
  label: string;
  actor: { id: string | null; name: string } | null;
  role: string | null;
  note: string | null;
  from: string | null;
  to: string | null;
  createdAt: string;
};

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  pending_verification: 'Waiting for verification',
  pending_role_assignment: 'Verified, needs a role',
  active: 'Active',
  rejected: 'Rejected'
};

/** Shared status-badge classes (admin-dashboard.css), loaded by both the System Admin and Program Head portals. */
export const ACCOUNT_STATUS_BADGE: Record<AccountStatus, string> = {
  pending_verification: 'status-pending',
  pending_role_assignment: 'status-review',
  active: 'status-approved',
  rejected: 'status-critical'
};

export class ApiRequestError extends Error {
  fieldErrors: Record<string, string>;

  constructor(message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.fieldErrors = fieldErrors;
  }
}

/** Calls a same-origin JSON API and returns its payload, throwing ApiRequestError with the server's message on failure. */
export async function requestJson<T>(url: string, init?: { method?: 'GET' | 'POST'; body?: unknown }): Promise<T> {
  const response = await fetch(url, {
    method: init?.method ?? 'GET',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: init?.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined
  });
  const payload = (response.headers.get('content-type') || '').includes('application/json')
    ? ((await response.json()) as { success?: boolean; message?: string; fieldErrors?: Record<string, string> } & T)
    : null;

  if (!response.ok || !payload?.success) {
    throw new ApiRequestError(payload?.message || 'The request could not be completed. Please try again.', payload?.fieldErrors);
  }

  return payload;
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/**
 * Opens the applicant's identity document. The tab is opened before the request (a tab opened after an
 * await is blocked as a pop-up), then pointed at the short-lived signed link once it arrives.
 */
export async function openApplicationDocument(applicationId: string, side: 'front' | 'back' = 'front') {
  const tab = window.open('about:blank', '_blank');

  try {
    const { url } = await requestJson<{ url: string }>(`/api/applications/${encodeURIComponent(applicationId)}/document?side=${side}`);

    if (tab) {
      tab.opener = null;
      tab.location.href = url;
    } else {
      window.location.assign(url);
    }
  } catch (error) {
    tab?.close();
    throw error;
  }
}
