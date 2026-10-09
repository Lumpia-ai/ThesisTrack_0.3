import { logoutWithApi } from '@/lib/client-auth';

export type UserRole =
  | 'admin'
  | 'system_admin'
  | 'research_head'
  | 'student'
  | 'adviser'
  | 'panel'
  | 'library'
  | 'partner'
  | 'program_head'
  | 'tech_transfer'
  | 'focal_person'
  | 'secretary';

export type LoginPayload = {
  email: string;
  password: string;
  role?: string;
};

export type PasswordResetPayload = {
  email: string;
  password: string;
  confirm_password: string;
};

export type RegisterPayload = {
  name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  password: string;
  confirm_password?: string;
  role?: UserRole;
  student_id?: string;
  department?: string;
  year_level?: string;
};

export type User = {
  id: number;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  first_name?: string;
  last_name?: string;
  student_id?: string;
  department?: string;
  year_level?: string;
  memberId?: string;
  auth_provider?: 'credentials';
  created_at: string;
  updated_at: string;
};

export type AuthResponse = {
  success: boolean;
  data?: {
    id: number;
    name: string;
    email: string;
    role: UserRole;
  };
  message?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

type LegacyPortalSession = {
  id: number;
  user_id: number;
  role: UserRole;
  email: string;
  authenticatedAt: string;
  created_at: string;
  updated_at: string;
  memberId?: string;
  fullName?: string;
  source: 'mock-api';
};

const USERS_STORAGE_KEY = 'capstoneMockUsers';
const SESSION_STORAGE_KEY = 'capstoneAuthUser';
const SERVER_SESSION_COOKIE_KEY = 'capstoneMockAuthUser';
const LEGACY_SESSION_STORAGE_KEY = 'capstonePortalSession';
const PROFILE_DRAFT_STORAGE_KEY = 'capstoneStudentProfileDraft';
const AUTH_DELAY_MS = 650;

const DEFAULT_USERS: User[] = [
  {
    id: 1,
    name: 'School Research Head',
    email: 'research.head@university.edu.ph',
    password: 'admin123',
    role: 'research_head',
    auth_provider: 'credentials',
    created_at: '2026-01-01T08:00:00.000Z',
    updated_at: '2026-01-01T08:00:00.000Z'
  },
  {
    id: 3,
    name: 'Dr. Ricardo Cruz',
    email: 'ricardo.cruz@university.edu.ph',
    password: 'adviser123',
    role: 'adviser',
    auth_provider: 'credentials',
    created_at: '2026-01-01T08:00:00.000Z',
    updated_at: '2026-01-01T08:00:00.000Z'
  },
  {
    id: 4,
    name: 'Library Repository Officer',
    email: 'library@university.edu.ph',
    password: 'library123',
    role: 'library',
    auth_provider: 'credentials',
    created_at: '2026-01-01T08:00:00.000Z',
    updated_at: '2026-01-01T08:00:00.000Z'
  },
  {
    id: 5,
    name: 'TechCorp Partner Liaison',
    email: 'partner@techcorp.inc',
    password: 'partner123',
    role: 'partner',
    auth_provider: 'credentials',
    created_at: '2026-01-01T08:00:00.000Z',
    updated_at: '2026-01-01T08:00:00.000Z'
  },
  {
    id: 6,
    name: 'Prof. Elena Martinez',
    email: 'program.head@university.edu.ph',
    password: 'programhead123',
    role: 'program_head',
    auth_provider: 'credentials',
    created_at: '2026-01-01T08:00:00.000Z',
    updated_at: '2026-01-01T08:00:00.000Z'
  },
  {
    id: 7,
    name: 'Mark Rivera',
    email: 'mark.rivera@university.edu.ph',
    password: 'techtransfer123',
    role: 'tech_transfer',
    auth_provider: 'credentials',
    created_at: '2026-01-01T08:00:00.000Z',
    updated_at: '2026-01-01T08:00:00.000Z'
  },
  {
    id: 12,
    name: 'System Administrator',
    email: 'system.admin@university.edu.ph',
    password: 'admin123',
    role: 'system_admin',
    auth_provider: 'credentials',
    created_at: '2026-01-01T08:00:00.000Z',
    updated_at: '2026-01-01T08:00:00.000Z'
  }
];

let memoryUsers = DEFAULT_USERS.map((user) => ({ ...user }));
let memoryStoredUser: AuthResponse['data'] | null = null;

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function wait(ms = AUTH_DELAY_MS) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeEmail(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function normalizeRole(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function buildFailureResponse(
  message: string,
  fieldErrors?: Partial<Record<string, string>>
): AuthResponse {
  return {
    success: false,
    message,
    ...(fieldErrors && Object.keys(fieldErrors).length ? { fieldErrors } : {})
  };
}

function isSupportedRole(role: string): role is UserRole {
  return (
    role === 'admin' ||
    role === 'system_admin' ||
    role === 'research_head' ||
    role === 'student' ||
    role === 'adviser' ||
    role === 'panel' ||
    role === 'library' ||
    role === 'partner' ||
    role === 'program_head' ||
    role === 'tech_transfer' ||
    role === 'focal_person'
  );
}

function sanitizeUser(user: User): NonNullable<AuthResponse['data']> {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

function parseStoredValue<T>(key: string, fallback: T) {
  if (!canUseStorage()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStoredValue(key: string, value: unknown) {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write failures in the mock layer.
  }
}

function writeSessionValue(key: string, value: unknown) {
  if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write failures in the mock layer.
  }
}

function writeCookieValue(key: string, value: unknown, maxAgeSeconds = 60 * 60 * 24 * 7) {
  if (typeof document === 'undefined') {
    return;
  }

  try {
    document.cookie = `${key}=${encodeURIComponent(JSON.stringify(value))}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
  } catch {
    // Ignore cookie write failures in the mock layer.
  }
}

function removeStoredValue(key: string) {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage write failures in the mock layer.
  }
}

function removeSessionValue(key: string) {
  if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Ignore storage write failures in the mock layer.
  }
}

function removeCookieValue(key: string) {
  if (typeof document === 'undefined') {
    return;
  }

  try {
    document.cookie = `${key}=; path=/; max-age=0; samesite=lax`;
  } catch {
    // Ignore cookie cleanup failures in the mock layer.
  }
}

function readUsersFromStorage() {
  if (!canUseStorage()) {
    return memoryUsers.map((user) => ({ ...user }));
  }

  const storedUsers = parseStoredValue<User[]>(USERS_STORAGE_KEY, []);
  const mergedUsers = new Map<string, User>();

  for (const user of DEFAULT_USERS) {
    mergedUsers.set(normalizeEmail(user.email), { ...user });
  }

  for (const user of storedUsers) {
    if (!user || !normalizeEmail(user.email)) {
      continue;
    }

    if (user.role === 'student') {
      continue;
    }

    const authProvider = normalizeText(
      (user as User & { auth_provider?: unknown }).auth_provider
    ).toLowerCase();

    if (authProvider === 'google') {
      continue;
    }

    mergedUsers.set(normalizeEmail(user.email), {
      ...user,
      email: normalizeEmail(user.email)
    });
  }

  const resolvedUsers = Array.from(mergedUsers.values()).sort((left, right) => left.id - right.id);
  memoryUsers = resolvedUsers.map((user) => ({ ...user }));
  writeStoredValue(USERS_STORAGE_KEY, resolvedUsers);

  return resolvedUsers;
}

function saveUsers(users: User[]) {
  memoryUsers = users.map((user) => ({ ...user }));
  writeStoredValue(USERS_STORAGE_KEY, users);
}

function buildLegacyPortalSession(user: User): LegacyPortalSession {
  const timestamp = new Date().toISOString();

  return {
    id: user.id,
    user_id: user.id,
    role: user.role,
    email: user.email,
    authenticatedAt: timestamp,
    created_at: user.created_at,
    updated_at: timestamp,
    memberId: user.memberId,
    fullName: user.name,
    source: 'mock-api'
  };
}

function persistAuthenticatedUser(user: User) {
  const publicUser = sanitizeUser(user);
  const legacySession = buildLegacyPortalSession(user);

  memoryStoredUser = publicUser;
  writeStoredValue(SESSION_STORAGE_KEY, publicUser);
  writeStoredValue(LEGACY_SESSION_STORAGE_KEY, legacySession);
  writeSessionValue(LEGACY_SESSION_STORAGE_KEY, legacySession);
  writeCookieValue(SERVER_SESSION_COOKIE_KEY, {
    ...publicUser,
    firstName: user.first_name,
    lastName: user.last_name,
    studentId: user.student_id,
    department: user.department,
    yearLevel: user.year_level
  });

  if (user.role === 'student') {
    writeStoredValue(PROFILE_DRAFT_STORAGE_KEY, {
      firstName: user.first_name || user.name.split(' ')[0] || 'Student',
      lastName: user.last_name || user.name.split(' ').slice(1).join(' '),
      studentId: user.student_id || '',
      email: user.email,
      department: user.department || '',
      yearLevel: user.year_level || ''
    });
  }
}

function getNextUserId(users: User[]) {
  return users.reduce((maxId, user) => Math.max(maxId, user.id), 0) + 1;
}

function isLegacyMockStoredUser(user: AuthResponse['data'] | null | undefined) {
  return Boolean(user && typeof user.id === 'number');
}

function buildDisplayName(payload: RegisterPayload) {
  const explicitName = normalizeText(payload.name);
  if (explicitName) {
    return explicitName;
  }

  return normalizeText(`${payload.first_name || ''} ${payload.last_name || ''}`);
}

export function getRoleRedirectPath(role: UserRole) {
  switch (role) {
    case 'system_admin':
      return '/system-admin/dashboard';
    case 'research_head':
    case 'admin':
      return '/research-head/dashboard';
    case 'adviser':
      return '/adviser/adviser-mode/dashboard';
    case 'panel':
      return '/adviser/panel-mode/dashboard';
    case 'library':
      return '/library/dashboard';
    case 'partner':
      return '/partner/dashboard';
    case 'program_head':
      return '/program-head/dashboard';
    case 'tech_transfer':
      return '/tech-transfer/dashboard';
    case 'focal_person':
      return '/focal-person/dashboard';
    case 'student':
    default:
      return '/students/dashboard';
  }
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  await wait();

  const email = normalizeEmail(payload.email);
  const password = normalizeText(payload.password);
  const requestedRole = normalizeRole(payload.role);
  const fieldErrors: Partial<Record<string, string>> = {};

  if (!email) {
    fieldErrors.email = 'Please enter your email address.';
  } else if (!isValidEmail(email)) {
    fieldErrors.email = 'Enter a valid email address.';
  }

  if (!password) {
    fieldErrors.password = 'Please enter your password.';
  }

  if (requestedRole && !isSupportedRole(requestedRole)) {
    fieldErrors.role = 'Selected role is not available in the mock authentication flow.';
  }

  if (Object.keys(fieldErrors).length) {
    return buildFailureResponse('Please correct the highlighted fields and try again.', fieldErrors);
  }

  const users = readUsersFromStorage();
  const matchedUser = users.find((user) => normalizeEmail(user.email) === email);

  if (!matchedUser) {
    return buildFailureResponse('No account was found for that email address.', {
      email: 'No account was found for that email address.'
    });
  }

  if (matchedUser.password !== password) {
    return buildFailureResponse('Invalid email or password.', {
      password: 'The password you entered is incorrect.'
    });
  }

  if (normalizeText((matchedUser as User & { account_status?: string }).account_status).toLowerCase() === 'suspended') {
    return buildFailureResponse('This account is suspended. Contact your administrator for assistance.');
  }

  if (requestedRole && matchedUser.role !== requestedRole) {
    return buildFailureResponse('Selected role does not match this account.', {
      role: 'Choose the role assigned to this account.'
    });
  }

  persistAuthenticatedUser(matchedUser);

  return {
    success: true,
    data: sanitizeUser(matchedUser)
  };
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  await wait();

  const firstName = normalizeText(payload.first_name);
  const lastName = normalizeText(payload.last_name);
  const studentId = normalizeText(payload.student_id);
  const department = normalizeText(payload.department);
  const yearLevel = normalizeText(payload.year_level);
  const name = buildDisplayName(payload);
  const email = normalizeEmail(payload.email);
  const password = normalizeText(payload.password);
  const confirmPassword = normalizeText(payload.confirm_password);
  const role: UserRole = 'student';
  const fieldErrors: Partial<Record<string, string>> = {};

  if (!firstName) {
    fieldErrors.firstName = 'Please enter your first name.';
  } else if (firstName.length < 2) {
    fieldErrors.firstName = 'First name must be at least 2 characters.';
  }

  if (!lastName) {
    fieldErrors.lastName = 'Please enter your last name.';
  } else if (lastName.length < 2) {
    fieldErrors.lastName = 'Last name must be at least 2 characters.';
  }

  if (!studentId) {
    fieldErrors.studentId = 'Please enter your student ID.';
  }

  if (!email) {
    fieldErrors.email = 'Please enter your email address.';
  } else if (!isValidEmail(email)) {
    fieldErrors.email = 'Enter a valid email address.';
  }

  if (!department) {
    fieldErrors.department = 'Please select your department.';
  }

  if (!yearLevel) {
    fieldErrors.yearLevel = 'Please select your year level.';
  }

  if (!password) {
    fieldErrors.password = 'Please enter a password.';
  } else if (password.length < 6) {
    fieldErrors.password = 'Password must be at least 6 characters.';
  }

  if (!confirmPassword) {
    fieldErrors.confirmPassword = 'Please confirm your password.';
  } else if (password !== confirmPassword) {
    fieldErrors.confirmPassword = 'Passwords do not match.';
  }

  if (!name) {
    return buildFailureResponse('Please enter your full name.', {
      firstName: fieldErrors.firstName || 'Please enter your first name.',
      lastName: fieldErrors.lastName || 'Please enter your last name.'
    });
  }

  const users = readUsersFromStorage();
  const emailExists = users.some((user) => normalizeEmail(user.email) === email);
  const studentIdExists = users.some(
    (user) => user.role === 'student' && normalizeText(user.student_id) && normalizeText(user.student_id) === studentId
  );

  if (emailExists) {
    fieldErrors.email = 'An account with this email already exists.';
  }

  if (studentId && studentIdExists) {
    fieldErrors.studentId = 'A student account with this ID already exists.';
  }

  if (Object.keys(fieldErrors).length) {
    return buildFailureResponse('Please correct the highlighted fields and try again.', fieldErrors);
  }

  const timestamp = new Date().toISOString();
  const nextUserId = getNextUserId(users);
  const nextUser: User = {
    id: nextUserId,
    name,
    email,
    password,
    role,
    first_name: firstName || name.split(' ')[0] || '',
    last_name: lastName || name.split(' ').slice(1).join(' '),
    student_id: studentId,
    department,
    year_level: yearLevel,
    memberId: `member-${String(nextUserId).padStart(3, '0')}`,
    auth_provider: 'credentials',
    created_at: timestamp,
    updated_at: timestamp
  };

  const nextUsers = [...users, nextUser];
  saveUsers(nextUsers);
  persistAuthenticatedUser(nextUser);

  return {
    success: true,
    data: sanitizeUser(nextUser)
  };
}

export async function resetPassword(payload: PasswordResetPayload): Promise<AuthResponse> {
  await wait();

  const email = normalizeEmail(payload.email);
  const password = normalizeText(payload.password);
  const confirmPassword = normalizeText(payload.confirm_password);
  const fieldErrors: Partial<Record<string, string>> = {};

  if (!email) {
    fieldErrors.email = 'Please enter your email address.';
  } else if (!isValidEmail(email)) {
    fieldErrors.email = 'Enter a valid email address.';
  }

  if (!password) {
    fieldErrors.password = 'Please enter a new password.';
  } else if (password.length < 6) {
    fieldErrors.password = 'Password must be at least 6 characters.';
  }

  if (!confirmPassword) {
    fieldErrors.confirmPassword = 'Please confirm your new password.';
  } else if (password !== confirmPassword) {
    fieldErrors.confirmPassword = 'Passwords do not match.';
  }

  if (Object.keys(fieldErrors).length) {
    return buildFailureResponse('Please correct the highlighted fields and try again.', fieldErrors);
  }

  const users = readUsersFromStorage();
  const matchedUser = users.find((user) => normalizeEmail(user.email) === email);

  if (!matchedUser) {
    return buildFailureResponse('No account was found for that email address.', {
      email: 'No account was found for that email address.'
    });
  }

  const timestamp = new Date().toISOString();
  const nextUsers = users.map((user) =>
    user.id === matchedUser.id
      ? {
          ...user,
          password,
          updated_at: timestamp
        }
      : user
  );

  saveUsers(nextUsers);

  return {
    success: true,
    message: 'Password updated successfully. You can now sign in with your new password.'
  };
}

export function getStoredUser() {
  if (!canUseStorage()) {
    return memoryStoredUser ? { ...memoryStoredUser } : null;
  }

  const storedUser = parseStoredValue<AuthResponse['data'] | null>(SESSION_STORAGE_KEY, null);

  if (storedUser) {
    if (isLegacyMockStoredUser(storedUser)) {
      logout();
      return null;
    }

    memoryStoredUser = storedUser;
    return { ...storedUser };
  }

  const legacySession = parseStoredValue<LegacyPortalSession | null>(LEGACY_SESSION_STORAGE_KEY, null);

  if (!legacySession || !isSupportedRole(legacySession.role)) {
    memoryStoredUser = null;
    return null;
  }

  const matchedUser = readUsersFromStorage().find((user) => user.id === legacySession.user_id);
  const normalizedUser =
    matchedUser ||
    ({
      id: legacySession.user_id,
      name: legacySession.fullName || legacySession.email,
      email: legacySession.email,
      role: legacySession.role
    } as AuthResponse['data']);

  const publicUser = matchedUser ? sanitizeUser(matchedUser) : normalizedUser;

  memoryStoredUser = publicUser;
  writeStoredValue(SESSION_STORAGE_KEY, publicUser);

  return { ...publicUser };
}

export async function logout() {
  memoryStoredUser = null;
  removeStoredValue(SESSION_STORAGE_KEY);
  removeStoredValue(LEGACY_SESSION_STORAGE_KEY);
  removeStoredValue(PROFILE_DRAFT_STORAGE_KEY);
  removeSessionValue(LEGACY_SESSION_STORAGE_KEY);
  removeSessionValue('capstoneAuthRememberMe');
  removeCookieValue(SERVER_SESSION_COOKIE_KEY);
  
  await logoutWithApi();
}

export async function loginWithMockApi(payload: LoginPayload) {
  const response = await login(payload);

  if (!response.success || !response.data) {
    return {
      ok: false as const,
      message: response.message || 'Unable to login.'
    };
  }

  return {
    ok: true as const,
    session: buildLegacyPortalSession({
      ...DEFAULT_USERS[0],
      ...readUsersFromStorage().find((user) => user.id === response.data?.id),
      id: response.data.id,
      name: response.data.name,
      email: response.data.email,
      role: response.data.role
    } as User),
    redirectPath: getRoleRedirectPath(response.data.role)
  };
}

export async function registerStudentWithMockApi(payload: RegisterPayload) {
  const response = await register({
    ...payload,
    role: 'student'
  });

  if (!response.success || !response.data) {
    return {
      ok: false as const,
      message: response.message || 'Unable to register.'
    };
  }

  return {
    ok: true as const,
    account: {
      id: response.data.id,
      user_id: response.data.id,
      project_id: 'project-it-001',
      status: 'registered',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      first_name: normalizeText(payload.first_name),
      last_name: normalizeText(payload.last_name),
      student_id: normalizeText(payload.student_id),
      email: response.data.email,
      department: normalizeText(payload.department),
      year_level: normalizeText(payload.year_level)
    }
  };
}
