import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { type NextResponse } from 'next/server';
import { cache } from 'react';
import { AccountStatus, RoleAssignmentStatus, UserRole, type User } from '@/generated/prisma/client';
import { canLinkIdentityByEmail, isAuthCookieSecure, verifyHs256Jwt } from '@/lib/auth-security';
import { createClient } from '@/lib/supabase/server';
import { sendAccountRestoreEmail } from '@/lib/mailer';
import { prisma } from '@/lib/prisma';
import { ROLE_CATALOG, toApiEnum } from '@/lib/rbac/catalog';
import { toDepartmentId } from '@/lib/rbac/departments';
import {
  canUseAssignment,
  resolveWorkspace,
  type AssignmentRecord,
  type Workspace
} from '@/lib/rbac/policy';
import {
  HttpError,
  PASSWORD_MIN_LENGTH,
  getRequiredEnv,
  normalizeText
} from '@/lib/utils';

export const AUTH_COOKIE_NAME = 'thesistrack_session';
/** Signed pointer to the role assignment the user is working as; re-validated on every request. */
export const WORKSPACE_COOKIE_NAME = 'thesistrack_workspace';
/** Where accounts that can't use the app yet (pending, rejected, no usable role) are sent. */
export const ACCOUNT_STATUS_PATH = '/account/status';
export const ACCOUNT_NOT_ACTIVE_CODE = 'ACCOUNT_NOT_ACTIVE';
const ACCOUNT_NOT_ACTIVE_MESSAGE = 'Your account is not active yet. Check your application status.';
const AUTH_TOKEN_EXPIRES_IN = '7d';
const PASSWORD_RESET_TOKEN_BYTES = 32;
const PASSWORD_RESET_TOKEN_TTL_MINUTES = 60;
const PASSWORD_RESET_CODE_DIGITS = 6;
export const PASSWORD_RESET_CODE_TTL_MINUTES = 3;
export const PASSWORD_RESET_MAX_ATTEMPTS = 5;
export const PASSWORD_RESET_SESSION_COOKIE_NAME = 'thesistrack_password_reset';
export const PASSWORD_RESET_SESSION_TTL_SECONDS = PASSWORD_RESET_CODE_TTL_MINUTES * 60;

export type AuthRole =
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

export type PublicUser = Pick<
  User,
  | 'id'
  | 'email'
  | 'name'
  | 'firstName'
  | 'lastName'
  | 'studentId'
  | 'department'
  | 'yearLevel'
  | 'role'
  | 'contactNumber'
  | 'address'
  | 'birthDate'
  | 'profileImage'
  | 'section'
  | 'accountSummary'
  | 'office'
  | 'displayName'
  | 'isSuspended'
  | 'suspendedAt'
  | 'suspendedUntil'
  | 'accountStatus'
  | 'createdAt'
  | 'updatedAt'
>;

type AuthTokenPayload = JwtPayload & {
  sub: string;
  role: UserRole;
};

export const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  firstName: true,
  lastName: true,
  studentId: true,
  department: true,
  yearLevel: true,
  role: true,
  contactNumber: true,
  address: true,
  birthDate: true,
  profileImage: true,
  section: true,
  accountSummary: true,
  office: true,
  displayName: true,
  isSuspended: true,
  suspendedAt: true,
  suspendedUntil: true,
  accountStatus: true,
  createdAt: true,
  updatedAt: true
} as const;

const apiRoleByDbRole: Record<UserRole, AuthRole> = {
  [UserRole.ADMIN]: 'admin',
  [UserRole.SYSTEM_ADMIN]: 'system_admin',
  [UserRole.RESEARCH_HEAD]: 'research_head',
  [UserRole.STUDENT]: 'student',
  [UserRole.ADVISER]: 'adviser',
  [UserRole.PANEL]: 'panel',
  [UserRole.PROGRAM_HEAD]: 'program_head',
  [UserRole.PARTNER]: 'partner',
  [UserRole.TECH_TRANSFER]: 'tech_transfer',
  [UserRole.LIBRARY]: 'library',
  [UserRole.FOCAL_PERSON]: 'focal_person',
  [UserRole.SECRETARY]: 'secretary'
};

export function toApiRole(role: UserRole): AuthRole {
  return apiRoleByDbRole[role];
}

export function parseUserRole(value: unknown, fallback: UserRole = UserRole.STUDENT): UserRole {
  const normalized = normalizeText(value).toLowerCase();

  if (!normalized) {
    return fallback;
  }

  switch (normalized) {
    case 'system_admin':
    case 'system administrator':
    case 'system-administrator':
    case 'super_admin':
    case 'super admin':
      return UserRole.SYSTEM_ADMIN;
    case 'research_head':
    case 'research head':
    case 'research-head':
      return UserRole.RESEARCH_HEAD;
    case 'admin':
      return UserRole.ADMIN;
    case 'student':
      return UserRole.STUDENT;
    case 'adviser':
      return UserRole.ADVISER;
    case 'panel':
      return UserRole.PANEL;
    case 'program_head':
      return UserRole.PROGRAM_HEAD;
    case 'partner':
      return UserRole.PARTNER;
    case 'tech_transfer':
      return UserRole.TECH_TRANSFER;
    case 'library':
      return UserRole.LIBRARY;
    case 'focal_person':
    case 'focal person':
    case 'research focal person':
    case 'research-focal-person':
      return UserRole.FOCAL_PERSON;
    case 'secretary':
      return UserRole.SECRETARY;
    default:
      throw new HttpError('Selected role is not supported.', 400, {
        role: 'Choose a valid user role.'
      });
  }
}

export function toPublicUser(user: PublicUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    studentId: user.studentId,
    department: user.department,
    yearLevel: user.yearLevel,
    role: toApiRole(user.role),
    contactNumber: user.contactNumber,
    address: user.address,
    birthDate: user.birthDate,
    profileImage: user.profileImage,
    section: user.section,
    accountSummary: user.accountSummary,
    office: user.office,
    displayName: user.displayName,
    isSuspended: user.isSuspended,
    suspendedAt: user.suspendedAt,
    suspendedUntil: user.suspendedUntil,
    accountStatus: toApiEnum(user.accountStatus),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export function validatePassword(value: string) {
  if (value.length < PASSWORD_MIN_LENGTH) {
    throw new HttpError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`, 400, {
      password: `Use at least ${PASSWORD_MIN_LENGTH} characters.`
    });
  }
}

export function buildDisplayName({
  name,
  firstName,
  lastName,
  email,
  displayName
}: {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email: string | null;
  displayName?: string | null;
}) {
  return normalizeText(displayName || '') || normalizeText(name || '') || normalizeText(`${firstName || ''} ${lastName || ''}`) || (email || '');
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function isAccountSuspended(user: Pick<PublicUser, 'isSuspended' | 'suspendedUntil'> | null | undefined) {
  return Boolean(user?.isSuspended);
}

export async function restoreExpiredSuspension(user: PublicUser) {
  if (!user.isSuspended || !user.suspendedUntil || user.suspendedUntil > new Date()) {
    return user;
  }

  const restoredUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      isSuspended: false,
      suspendedAt: null,
      suspendedUntil: null
    },
    select: publicUserSelect
  });

  try {
    await sendAccountRestoreEmail({
      to: restoredUser.email,
      name: restoredUser.name
    });
  } catch (emailError) {
    console.error('Failed to send automatic account restore email', emailError);
  }

  return restoredUser;
}

function getJwtSecret() {
  return getRequiredEnv('JWT_SECRET');
}

export function ensureAuthConfig() {
  try {
    getJwtSecret();
  } catch {
    throw new HttpError('Authentication is not configured on the server.', 500);
  }
}

export function signAuthToken(user: Pick<PublicUser, 'id' | 'role'>) {
  return jwt.sign(
    {
      role: user.role
    },
    getJwtSecret(),
    {
      subject: user.id,
      expiresIn: AUTH_TOKEN_EXPIRES_IN
    }
  );
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    // signAuthToken uses HS256; refuse any other algorithm a forged token might claim.
    const decoded = verifyHs256Jwt(token, getJwtSecret());

    if (typeof decoded === 'string' || !decoded.sub) {
      return null;
    }

    return decoded as AuthTokenPayload;
  } catch {
    return null;
  }
}

export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isAuthCookieSecure(),
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  });
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isAuthCookieSecure(),
    path: '/',
    maxAge: 0
  });
}

function getCookieFromHeader(cookieHeader: string, name: string) {
  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export function getAuthTokenFromRequest(request: Request) {
  const authorizationHeader = request.headers.get('authorization');

  if (authorizationHeader?.toLowerCase().startsWith('bearer ')) {
    return authorizationHeader.slice(7).trim();
  }

  const cookieHeader = request.headers.get('cookie') || '';
  const token = getCookieFromHeader(cookieHeader, AUTH_COOKIE_NAME);
  return token ? decodeURIComponent(token) : null;
}

async function getAuthTokenFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE_NAME)?.value || null;
}

// The account behind a session, with its active role assignments (revoked ones are never loaded).
const accountSelect = {
  ...publicUserSelect,
  roleAssignments: {
    where: { status: RoleAssignmentStatus.ACTIVE },
    select: { id: true, role: true, scope: true, departmentId: true, status: true },
    orderBy: { grantedAt: 'asc' }
  }
} as const;

type AccountRecord = PublicUser & { roleAssignments: AssignmentRecord[] };

/** Restores an expired suspension; a still-suspended account has no session at all. */
async function withRestoredSuspension(account: AccountRecord): Promise<AccountRecord | null> {
  const restoredUser = await restoreExpiredSuspension(account);

  return isAccountSuspended(restoredUser) ? null : { ...restoredUser, roleAssignments: account.roleAssignments };
}

async function findLegacySessionAccount(request?: Request) {
  const token = request ? getAuthTokenFromRequest(request) : await getAuthTokenFromCookies();

  if (!token) {
    return null;
  }

  const payload = verifyAuthToken(token);

  if (!payload?.sub) {
    return null;
  }

  const account = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: accountSelect
  });

  return account ? withRestoredSuspension(account) : null;
}

/** Who is signed in (Supabase session first, then the app's own token), whatever their account status. */
async function findSessionAccount(request?: Request) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (authUser) {
    let account: AccountRecord | null = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      select: accountSelect
    });

    // Link by email only when Supabase has verified that the session owner controls the address,
    // and never re-point an account that is already bound to a different Supabase or Google identity —
    // otherwise anyone who could sign up in Supabase with a victim's email would inherit their account.
    if (!account && authUser.email && authUser.email_confirmed_at) {
      const emailMatch = await prisma.user.findUnique({
        where: { email: authUser.email },
        select: { ...accountSelect, supabaseId: true, googleSub: true }
      });

      if (emailMatch && canLinkIdentityByEmail(authUser, emailMatch)) {
        const { supabaseId: _linkedSupabaseId, googleSub: _linkedGoogleSub, ...unlinkedAccount } = emailMatch;

        await prisma.user.update({
          where: { id: unlinkedAccount.id },
          data: { supabaseId: authUser.id }
        });
        account = unlinkedAccount;
      }
    }

    if (account) {
      return withRestoredSuspension(account);
    }
  }

  // Fallback to legacy JWT auth
  return findLegacySessionAccount(request);
}

export type AccountAccess = {
  /** The account as stored; `role` here is the default role, not necessarily the active one. */
  user: PublicUser;
  accountStatus: AccountStatus;
  /** The role this request runs as; null unless the account is active and holds a usable role. */
  workspace: Workspace | null;
  workspaces: Workspace[];
  hasFullAccess: boolean;
  /** Why an active account still has no access (e.g. its only role needs a department). */
  blockedReason: string | null;
};

/** The signed-in user as the rest of the app sees them: `role` is the active workspace's role. */
export type AuthenticatedUser = PublicUser & { workspace: Workspace };

function getWorkspaceTokenFromRequest(request: Request) {
  const token = getCookieFromHeader(request.headers.get('cookie') || '', WORKSPACE_COOKIE_NAME);
  return token ? decodeURIComponent(token) : null;
}

async function getWorkspaceTokenFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get(WORKSPACE_COOKIE_NAME)?.value || null;
}

/** The assignment id the user last switched to, if the cookie is genuine and theirs. */
async function readPreferredAssignmentId(userId: string, request?: Request) {
  const token = request ? getWorkspaceTokenFromRequest(request) : await getWorkspaceTokenFromCookies();

  if (!token) {
    return null;
  }

  try {
    const decoded = verifyHs256Jwt(token, getJwtSecret());

    if (typeof decoded === 'string' || decoded.sub !== userId || typeof decoded.aid !== 'string') {
      return null;
    }

    return decoded.aid;
  } catch {
    return null;
  }
}

async function buildAccountAccess(account: AccountRecord, request?: Request): Promise<AccountAccess> {
  const { roleAssignments, ...user } = account;
  const userDepartmentId = toDepartmentId(user.department);
  const { active, available } = resolveWorkspace(roleAssignments, {
    preferredAssignmentId: await readPreferredAssignmentId(user.id, request),
    defaultRole: user.role,
    userDepartmentId
  });
  const isActive = user.accountStatus === AccountStatus.ACTIVE;
  let blockedReason: string | null = null;

  if (isActive && !active) {
    const firstDecision = roleAssignments[0] ? canUseAssignment(roleAssignments[0], userDepartmentId) : null;
    blockedReason = firstDecision && !firstDecision.allowed
      ? firstDecision.reason
      : 'No role has been assigned to your account yet.';
  }

  return {
    user,
    accountStatus: user.accountStatus,
    workspace: isActive ? active : null,
    workspaces: isActive ? available : [],
    hasFullAccess: isActive && Boolean(active),
    blockedReason
  };
}

/** The signed-in account and what it may do, including accounts that may only see their status page. */
export async function getAccountAccess(request?: Request) {
  const account = await findSessionAccount(request);
  return account ? buildAccountAccess(account, request) : null;
}

/** Same as getAccountAccess, for a user the caller has just authenticated itself (login, Google callback). */
export async function getAccountAccessForUser(userId: string, request?: Request) {
  const account = await prisma.user.findUnique({
    where: { id: userId },
    select: accountSelect
  });

  return account ? buildAccountAccess(account, request) : null;
}

export function toAuthenticatedUser(access: AccountAccess): AuthenticatedUser | null {
  if (!access.hasFullAccess || !access.workspace) {
    return null;
  }

  return { ...access.user, role: access.workspace.role, workspace: access.workspace };
}

/** The signed-in user with full access, or null (no session, suspended, pending, rejected, or no usable role). */
export async function getAuthenticatedUser(request?: Request) {
  const access = await getAccountAccess(request);
  return access ? toAuthenticatedUser(access) : null;
}

// Without a request (server components), reuse the per-request cached lookup so a page that
// checks auth and then loads data doesn't repeat the Supabase round trip and user query.
const getServerAccountAccess = cache(async () => getAccountAccess());

export const getServerAuthenticatedUser = cache(async () => {
  const access = await getServerAccountAccess();
  return access ? toAuthenticatedUser(access) : null;
});

export async function requireAuthenticatedUser(request?: Request, allowedRoles?: UserRole[]) {
  const access = request ? await getAccountAccess(request) : await getServerAccountAccess();

  if (!access) {
    throw new HttpError('Authentication is required.', 401);
  }

  const user = toAuthenticatedUser(access);

  if (!user) {
    throw new HttpError(ACCOUNT_NOT_ACTIVE_MESSAGE, 403);
  }

  if (allowedRoles?.length && !allowedRoles.includes(user.role)) {
    throw new HttpError('You do not have permission to access this resource.', 403);
  }

  return user;
}

/** Any signed-in, non-suspended account, including pending and rejected ones (status-only endpoints). */
export async function requireAccountHolder(request: Request) {
  const access = await getAccountAccess(request);

  if (!access) {
    throw new HttpError('Authentication is required.', 401);
  }

  return access;
}

function toWorkspaceSummary(workspace: Workspace) {
  return {
    id: workspace.assignmentId,
    role: toApiRole(workspace.role),
    label: ROLE_CATALOG[workspace.role].label,
    departmentId: workspace.departmentId
  };
}

/** What the client may know about the account's status and roles (never anything it could use to grant itself access). */
export function toAccountSummary(access: AccountAccess) {
  return {
    status: toApiEnum(access.accountStatus),
    hasAccess: access.hasFullAccess,
    blockedReason: access.blockedReason,
    workspace: access.workspace ? toWorkspaceSummary(access.workspace) : null,
    workspaces: access.workspaces.map(toWorkspaceSummary)
  };
}

export function signWorkspaceToken(userId: string, assignmentId: string) {
  return jwt.sign({ aid: assignmentId }, getJwtSecret(), {
    subject: userId,
    expiresIn: AUTH_TOKEN_EXPIRES_IN
  });
}

export function setWorkspaceCookie(response: NextResponse, userId: string, assignmentId: string) {
  response.cookies.set(WORKSPACE_COOKIE_NAME, signWorkspaceToken(userId, assignmentId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: isAuthCookieSecure(),
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  });
}

export function clearWorkspaceCookie(response: NextResponse) {
  response.cookies.set(WORKSPACE_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isAuthCookieSecure(),
    path: '/',
    maxAge: 0
  });
}

export function createPasswordResetToken() {
  const token = crypto.randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString('hex');
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  return {
    token,
    tokenHash,
    expiresAt
  };
}

export function hashResetToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function createPasswordResetCode() {
  return crypto.randomInt(0, 10 ** PASSWORD_RESET_CODE_DIGITS).toString().padStart(
    PASSWORD_RESET_CODE_DIGITS,
    '0'
  );
}

export async function hashPasswordResetCode(code: string) {
  return bcrypt.hash(code, 12);
}

export async function verifyPasswordResetCode(code: string, codeHash: string) {
  return bcrypt.compare(code, codeHash);
}

export function createPasswordResetSessionToken() {
  return crypto.randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString('hex');
}
