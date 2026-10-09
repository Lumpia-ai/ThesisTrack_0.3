import crypto from 'node:crypto';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { type NextRequest, NextResponse } from 'next/server';
import { verifyHs256Jwt } from '@/lib/auth-security';
import { getRequiredEnv, normalizeEmail, normalizeText } from '@/lib/utils';

export const GOOGLE_OAUTH_STATE_COOKIE_NAME = 'thesistrack_google_oauth_state';
export const GOOGLE_REGISTRATION_COOKIE_NAME = 'thesistrack_google_registration';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_TOKEN_INFO_URL = 'https://oauth2.googleapis.com/tokeninfo';
const GOOGLE_REGISTRATION_TOKEN_EXPIRES_IN = '15m';
const GOOGLE_REGISTRATION_COOKIE_MAX_AGE_SECONDS = 15 * 60;

export type GoogleRegistrationContext = {
  sub: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
};

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  id_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type GoogleTokenInfoResponse = {
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  error?: string;
  error_description?: string;
};

type GoogleRegistrationJwtPayload = JwtPayload & GoogleRegistrationContext & {
  provider: 'google';
};

export class GoogleOAuthConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoogleOAuthConfigError';
  }
}

export function isGoogleOAuthConfigError(error: unknown): error is GoogleOAuthConfigError {
  return error instanceof GoogleOAuthConfigError;
}

function getRequiredGoogleEnv(name: string) {
  try {
    return getRequiredEnv(name);
  } catch {
    throw new GoogleOAuthConfigError(`${name} is not configured.`);
  }
}

function parseAbsoluteUrl(value: string, envName: string) {
  try {
    return new URL(value);
  } catch {
    throw new GoogleOAuthConfigError(`${envName} must be a valid absolute URL.`);
  }
}

function isLocalhostUrl(url: URL) {
  return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
}

function getGoogleClientId() {
  return getRequiredGoogleEnv('GOOGLE_CLIENT_ID');
}

function getGoogleClientSecret() {
  return getRequiredGoogleEnv('GOOGLE_CLIENT_SECRET');
}

function getJwtSecret() {
  return getRequiredEnv('JWT_SECRET');
}

function getSecureCookieSetting() {
  return process.env.NODE_ENV === 'production';
}

function getConfiguredGoogleRedirectUri() {
  const redirectUri = getRequiredGoogleEnv('GOOGLE_REDIRECT_URI');
  const url = parseAbsoluteUrl(redirectUri, 'GOOGLE_REDIRECT_URI');

  // Removed strict production checks to allow local testing of production builds using 'npm start'

  return url.toString();
}

function getGoogleAuthUri() {
  const authUri = normalizeText(process.env.GOOGLE_AUTH_URI) || GOOGLE_AUTH_URL;
  return parseAbsoluteUrl(authUri, 'GOOGLE_AUTH_URI').toString();
}

function getHeaderFirstValue(value: string | null) {
  return normalizeText(value).split(',')[0]?.trim() || '';
}

function getRequestOrigin(request: NextRequest | Request) {
  const forwardedHost = getHeaderFirstValue(request.headers.get('x-forwarded-host'));
  const host = forwardedHost || getHeaderFirstValue(request.headers.get('host'));

  if (!host) {
    return new URL(request.url).origin;
  }

  const forwardedProtocol = getHeaderFirstValue(request.headers.get('x-forwarded-proto'));
  const protocol = forwardedProtocol || new URL(request.url).protocol.replace(':', '');

  return `${protocol}://${host}`;
}

export function createGoogleOAuthState() {
  return crypto.randomBytes(32).toString('hex');
}

export function getGoogleRedirectUri(request: NextRequest | Request) {
  return getConfiguredGoogleRedirectUri();
}

export function getCanonicalGoogleOAuthStartUrl(request: NextRequest) {
  const configuredRedirectUri = getConfiguredGoogleRedirectUri();

  const configuredOrigin = new URL(configuredRedirectUri).origin;

  if (configuredOrigin === getRequestOrigin(request)) {
    return null;
  }

  return new URL('/api/auth/google', configuredOrigin);
}

export function buildGoogleAuthorizationUrl(request: NextRequest, state: string) {
  const url = new URL(getGoogleAuthUri());

  url.searchParams.set('client_id', getGoogleClientId());
  url.searchParams.set('redirect_uri', getGoogleRedirectUri(request));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'select_account');

  return url;
}

export function setGoogleOAuthStateCookie(response: NextResponse, state: string) {
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: getSecureCookieSetting(),
    path: '/',
    maxAge: 10 * 60
  });
}

export function clearGoogleOAuthStateCookie(response: NextResponse) {
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: getSecureCookieSetting(),
    path: '/',
    maxAge: 0
  });
}

export function validateGoogleOAuthState(request: NextRequest, state: string) {
  const expectedState = request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE_NAME)?.value
    || request.headers
      .get('cookie')
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${GOOGLE_OAUTH_STATE_COOKIE_NAME}=`))
      ?.slice(GOOGLE_OAUTH_STATE_COOKIE_NAME.length + 1);

  return Boolean(expectedState && state && expectedState === state);
}

export async function exchangeGoogleCodeForTokens(
  request: NextRequest,
  code: string
): Promise<GoogleTokenResponse & { id_token: string }> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      code,
      client_id: getGoogleClientId(),
      client_secret: getGoogleClientSecret(),
      redirect_uri: getGoogleRedirectUri(request),
      grant_type: 'authorization_code'
    })
  });
  const payload = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || !payload.id_token) {
    throw new Error(payload.error_description || payload.error || 'Google token exchange failed.');
  }

  return {
    ...payload,
    id_token: payload.id_token
  };
}

export async function getVerifiedGoogleProfile(idToken: string): Promise<GoogleRegistrationContext> {
  const url = new URL(GOOGLE_TOKEN_INFO_URL);
  url.searchParams.set('id_token', idToken);

  const response = await fetch(url, {
    cache: 'no-store'
  });
  const payload = (await response.json()) as GoogleTokenInfoResponse;

  if (!response.ok || payload.error) {
    throw new Error(payload.error_description || payload.error || 'Unable to verify Google account.');
  }

  const email = normalizeEmail(payload.email);
  const sub = normalizeText(payload.sub);
  const name = normalizeText(payload.name);
  const firstName = normalizeText(payload.given_name);
  const lastName = normalizeText(payload.family_name);
  const isEmailVerified = payload.email_verified === true || payload.email_verified === 'true';

  if (payload.aud !== getGoogleClientId() || !sub || !email || !isEmailVerified) {
    throw new Error('Google account verification failed.');
  }

  return {
    sub,
    email,
    name: name || email,
    firstName,
    lastName
  };
}

export function createGoogleRegistrationToken(profile: GoogleRegistrationContext) {
  return jwt.sign(
    {
      provider: 'google',
      email: profile.email,
      name: profile.name,
      firstName: profile.firstName,
      lastName: profile.lastName
    },
    getJwtSecret(),
    {
      subject: profile.sub,
      expiresIn: GOOGLE_REGISTRATION_TOKEN_EXPIRES_IN
    }
  );
}

export function setGoogleRegistrationCookie(
  response: NextResponse,
  profile: GoogleRegistrationContext
) {
  response.cookies.set(GOOGLE_REGISTRATION_COOKIE_NAME, createGoogleRegistrationToken(profile), {
    httpOnly: true,
    sameSite: 'lax',
    secure: getSecureCookieSetting(),
    path: '/',
    maxAge: GOOGLE_REGISTRATION_COOKIE_MAX_AGE_SECONDS
  });
}

export function clearGoogleRegistrationCookie(response: NextResponse) {
  response.cookies.set(GOOGLE_REGISTRATION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: getSecureCookieSetting(),
    path: '/',
    maxAge: 0
  });
}

export function getGoogleRegistrationContext(request: Request): GoogleRegistrationContext | null {
  const cookieHeader = request.headers.get('cookie') || '';
  const token = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${GOOGLE_REGISTRATION_COOKIE_NAME}=`))
    ?.slice(GOOGLE_REGISTRATION_COOKIE_NAME.length + 1);

  if (!token) {
    return null;
  }

  try {
    const decoded = verifyHs256Jwt(decodeURIComponent(token), getJwtSecret());

    if (typeof decoded === 'string' || !decoded.sub) {
      return null;
    }

    const payload = decoded as GoogleRegistrationJwtPayload;

    if (payload.provider !== 'google') {
      return null;
    }

    return {
      sub: payload.sub,
      email: normalizeEmail(payload.email),
      name: normalizeText(payload.name),
      firstName: normalizeText(payload.firstName),
      lastName: normalizeText(payload.lastName)
    };
  } catch {
    return null;
  }
}
