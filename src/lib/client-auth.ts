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

type ApiUser = {
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

type AuthApiSuccess = {
  success: true;
  user: ApiUser;
  /** Set when the account may only see its application status (pending, rejected, or no usable role). */
  redirectTo?: string;
};

type AuthApiFailure = {
  success: false;
  message?: string;
  fieldErrors?: Record<string, string>;
};

type AuthApiResponse = AuthApiSuccess | AuthApiFailure;

type AuthRequestPayload = Record<string, unknown>;
type ParsedAuthResponse = {
  success?: boolean;
  user?: ApiUser;
  redirectTo?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

const SESSION_STORAGE_KEY = 'capstoneAuthUser';
const SERVER_SESSION_COOKIE_KEY = 'capstoneMockAuthUser';
const LEGACY_SESSION_STORAGE_KEY = 'capstonePortalSession';
const PROFILE_DRAFT_STORAGE_KEY = 'capstoneStudentProfileDraft';

function buildLegacyPortalSession(user: ApiUser) {
  const timestamp = new Date().toISOString();

  return {
    id: user.id,
    user_id: user.id,
    role: user.role,
    email: user.email,
    authenticatedAt: timestamp,
    created_at: user.createdAt || timestamp,
    updated_at: user.updatedAt || timestamp,
    fullName: user.name,
    source: 'api'
  };
}

export function persistAuthenticatedUser(user: ApiUser) {
  if (typeof window === 'undefined') {
    return;
  }

  const publicUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
  const legacySession = buildLegacyPortalSession(user);

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(publicUser));
  window.localStorage.setItem(LEGACY_SESSION_STORAGE_KEY, JSON.stringify(legacySession));
  window.sessionStorage.setItem(LEGACY_SESSION_STORAGE_KEY, JSON.stringify(legacySession));

  document.cookie = `${SERVER_SESSION_COOKIE_KEY}=${encodeURIComponent(
    JSON.stringify({
      ...publicUser,
      firstName: user.firstName,
      lastName: user.lastName,
      studentId: user.studentId,
      department: user.department,
      yearLevel: user.yearLevel
    })
  )}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;

  if (user.role === 'student') {
    window.localStorage.setItem(
      PROFILE_DRAFT_STORAGE_KEY,
      JSON.stringify({
        firstName: user.firstName || user.name.split(' ')[0] || 'Student',
        lastName: user.lastName || user.name.split(' ').slice(1).join(' '),
        studentId: user.studentId || '',
        email: user.email,
        department: user.department || '',
        yearLevel: user.yearLevel || ''
      })
    );
  }
}

export function getRoleRedirectPath(role: ApiUserRole) {
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
    case 'secretary':
      return '/secretary/dashboard';
    case 'student':
    default:
      return '/students/dashboard';
  }
}

function readTextBetweenTags(value: string, openTag: string, closeTag: string) {
  const start = value.indexOf(openTag);

  if (start === -1) {
    return '';
  }

  const end = value.indexOf(closeTag, start + openTag.length);

  if (end === -1) {
    return '';
  }

  return value.slice(start + openTag.length, end).replace(/\s+/g, ' ').trim();
}

function getHtmlErrorMessage(value: string) {
  const heading = readTextBetweenTags(value, '<h2', '</h2>');

  if (heading) {
    const contentStart = heading.indexOf('>');
    return contentStart === -1 ? heading : heading.slice(contentStart + 1).trim();
  }

  const title = readTextBetweenTags(value, '<title>', '</title>');
  return title && !title.toLowerCase().includes('<!doctype') ? title : '';
}

async function parseAuthResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return {
      data: (await response.json()) as ParsedAuthResponse,
      rawText: ''
    };
  }

  const rawText = await response.text();
  return {
    data: undefined,
    rawText
  };
}

function getFallbackErrorMessage(url: string, status: number, rawText: string) {
  if (status === 404) {
    return `The route ${url} is not available. Restart the Next.js server and try again.`;
  }

  const htmlMessage = getHtmlErrorMessage(rawText);

  if (htmlMessage) {
    return htmlMessage;
  }

  if (status >= 500) {
    return 'The server returned an error. Please check the server logs and try again.';
  }

  return `Request failed with status ${status}.`;
}

async function postAuthRequest(
  url: '/api/auth/login' | '/api/auth/register',
  payload: AuthRequestPayload | FormData
): Promise<AuthApiResponse> {
  try {
    // FormData (registration with an identity document) sets its own multipart Content-Type.
    const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;
    const response = await fetch(url, {
      method: 'POST',
      headers: isFormData ? undefined : { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: isFormData ? payload : JSON.stringify(payload)
    });

    const { data: result, rawText } = await parseAuthResponse(response);

    if (!response.ok || !result?.success || !result.user) {
      const isExpectedAuthFailure = [400, 401, 403, 409].includes(response.status);

      if (process.env.NODE_ENV !== 'production' && !isExpectedAuthFailure) {
        console.warn(`Auth request to ${url} failed`, {
          status: response.status,
          body: result || rawText
        });
      }

      return {
        success: false,
        message:
          result?.message || getFallbackErrorMessage(url, response.status, rawText),
        fieldErrors: result?.fieldErrors
      };
    }

    return {
      success: true,
      user: result.user,
      ...(result.redirectTo ? { redirectTo: result.redirectTo } : {})
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error && error.message
          ? error.message
          : 'Unable to reach the server. Please try again.'
    };
  }
}

export async function loginWithApi(payload: { identifier: string; password: string }) {
  return postAuthRequest('/api/auth/login', payload);
}

/**
 * Submits a registration: personal details, the requested account type, and the identity document
 * (multipart). The server decides the outcome; a new account always starts pending verification.
 */
export async function registerWithApi(form: FormData) {
  return postAuthRequest('/api/auth/register', form);
}

export async function logoutWithApi() {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_SESSION_STORAGE_KEY);
      window.localStorage.removeItem(PROFILE_DRAFT_STORAGE_KEY);
      window.sessionStorage.removeItem(LEGACY_SESSION_STORAGE_KEY);
    }
    
    if (typeof document !== 'undefined') {
      document.cookie = `${SERVER_SESSION_COOKIE_KEY}=; path=/; max-age=0; samesite=lax`;
    }

    await fetch('/api/auth/logout', { method: 'POST' });
    return { success: true };
  } catch (error) {
    console.error('Failed to log out properly', error);
    return { success: false };
  }
}

export async function sendResetCode(email: string) {
  return postAuthRequest('/api/auth/forgot-password' as any, { email });
}

export async function verifyResetCode(email: string, code: string) {
  return postAuthRequest('/api/auth/verify-reset-code' as any, { email, code });
}

export async function resetPasswordWithApi(password: string, confirmPassword: string) {
  return postAuthRequest('/api/auth/reset-password' as any, { password, confirmPassword });
}
