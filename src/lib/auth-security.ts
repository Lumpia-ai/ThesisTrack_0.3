import jwt, { type Algorithm, type JwtPayload } from 'jsonwebtoken';

// Security rules shared by the session code (src/lib/auth.ts), the Google registration cookie
// (src/lib/google-oauth.ts) and the Google OAuth callback. Kept free of framework imports so they can be
// tested directly (tests/auth-security.test.mjs).

/** The app only issues HS256 tokens, so verification refuses any other algorithm a forged token claims. */
export const AUTH_JWT_ALGORITHMS: Algorithm[] = ['HS256'];

export function verifyHs256Jwt(token: string, secret: string): JwtPayload | string {
  return jwt.verify(token, secret, { algorithms: AUTH_JWT_ALGORITHMS });
}

/**
 * The session cookie is Secure in production so it never travels over plain HTTP (browsers still accept
 * Secure cookies on http://localhost). A production build that is only reachable over plain HTTP from
 * another host, e.g. a LAN demo, can opt out with AUTH_COOKIE_SECURE=false.
 */
export function isAuthCookieSecure(env: Record<string, string | undefined> = process.env) {
  return env.NODE_ENV === 'production' && env.AUTH_COOKIE_SECURE !== 'false';
}

type VerifiableIdentity = {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  identities?: { provider: string; id: string; identity_data?: { sub?: unknown } }[] | null;
};

type BindableAccount = {
  supabaseId: string | null;
  googleSub: string | null;
};

/**
 * Every ID this identity is known by: its Supabase user ID, plus the Google account ID of any linked Google
 * identity. Accounts registered through the earlier direct Google sign-in stored that Google ID in googleSub.
 */
function getOwnIdentityIds(identity: VerifiableIdentity) {
  const googleIds = (identity.identities ?? [])
    .filter((linked) => linked.provider === 'google')
    .flatMap((linked) => [linked.id, linked.identity_data?.sub]);

  return new Set([identity.id, ...googleIds].filter((id): id is string => typeof id === 'string' && id !== ''));
}

/**
 * May an identity that matched an account only by email be linked to it? Only when the provider verified
 * the email, and the account is not already bound to a different identity. Otherwise anyone able to create
 * an identity with someone else's email could take over, or re-point, that person's account.
 */
export function canLinkIdentityByEmail(identity: VerifiableIdentity, account: BindableAccount) {
  if (!identity.email || !identity.email_confirmed_at) {
    return false;
  }

  const ownIds = getOwnIdentityIds(identity);
  return [account.supabaseId, account.googleSub].every((boundId) => !boundId || ownIds.has(boundId));
}
