// Focused tests for the Stage 1 authentication hardening.
// Run with: node --test tests/auth-security.test.mjs   (Node 22.18+/24 strips the TypeScript types itself)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import jwt from 'jsonwebtoken';
import {
  AUTH_JWT_ALGORITHMS,
  canLinkIdentityByEmail,
  isAuthCookieSecure,
  verifyHs256Jwt
} from '../src/lib/auth-security.ts';

const SECRET = 'test-secret-that-is-long-enough-for-hs256';
const b64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

// ---------------------------------------------------------------------------------------------
// 2. JWT verification is pinned to HS256
// ---------------------------------------------------------------------------------------------
test('only HS256 is allowed', () => {
  assert.deepEqual(AUTH_JWT_ALGORITHMS, ['HS256']);
});

test('accepts a valid HS256 token (the format the app issues)', () => {
  const token = jwt.sign({ role: 'student' }, SECRET, { subject: 'user-1', expiresIn: '7d' });
  const decoded = verifyHs256Jwt(token, SECRET);
  assert.equal(typeof decoded, 'object');
  assert.equal(decoded.sub, 'user-1');
});

test('rejects an unsigned alg=none token', () => {
  const token = `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({ sub: 'user-1', role: 'system_admin' })}.`;
  assert.throws(() => verifyHs256Jwt(token, SECRET));
});

test('rejects a token signed with the right secret but another HMAC algorithm', () => {
  for (const algorithm of ['HS384', 'HS512']) {
    const token = jwt.sign({ role: 'system_admin' }, SECRET, { subject: 'user-1', algorithm });
    assert.throws(() => verifyHs256Jwt(token, SECRET), /invalid algorithm/);
  }
});

test('rejects a token whose header claims RS256 (algorithm confusion)', () => {
  const header = b64url({ alg: 'RS256', typ: 'JWT' });
  const payload = b64url({ sub: 'user-1' });
  const signature = Buffer.from('forged').toString('base64url');
  assert.throws(() => verifyHs256Jwt(`${header}.${payload}.${signature}`, SECRET));
});

test('rejects a token signed with a different secret, and an expired token', () => {
  assert.throws(() => verifyHs256Jwt(jwt.sign({}, 'another-secret', { subject: 'user-1' }), SECRET));
  const expired = jwt.sign({ exp: Math.floor(Date.now() / 1000) - 60 }, SECRET, { subject: 'user-1' });
  assert.throws(() => verifyHs256Jwt(expired, SECRET), /jwt expired/);
});

// ---------------------------------------------------------------------------------------------
// 1. Session cookie is Secure in production
// ---------------------------------------------------------------------------------------------
test('session cookie is Secure in production', () => {
  assert.equal(isAuthCookieSecure({ NODE_ENV: 'production' }), true);
});

test('session cookie is not Secure in development or test (plain http://localhost dev server)', () => {
  assert.equal(isAuthCookieSecure({ NODE_ENV: 'development' }), false);
  assert.equal(isAuthCookieSecure({ NODE_ENV: 'test' }), false);
  assert.equal(isAuthCookieSecure({}), false);
});

test('only an explicit AUTH_COOKIE_SECURE=false opts a production build out', () => {
  assert.equal(isAuthCookieSecure({ NODE_ENV: 'production', AUTH_COOKIE_SECURE: 'false' }), false);
  assert.equal(isAuthCookieSecure({ NODE_ENV: 'production', AUTH_COOKIE_SECURE: 'true' }), true);
  assert.equal(isAuthCookieSecure({ NODE_ENV: 'production', AUTH_COOKIE_SECURE: '0' }), true);
});

// ---------------------------------------------------------------------------------------------
// 3. Linking by email requires a verified email and an unbound (or same-identity) account
// ---------------------------------------------------------------------------------------------
const verified = { id: 'identity-A', email: 'student@example.edu', email_confirmed_at: '2026-09-01T00:00:00Z' };
const unbound = { supabaseId: null, googleSub: null };

test('links a verified email to an account with no bound identity (existing behaviour)', () => {
  assert.equal(canLinkIdentityByEmail(verified, unbound), true);
});

test('refuses an unverified email', () => {
  assert.equal(canLinkIdentityByEmail({ ...verified, email_confirmed_at: null }, unbound), false);
  assert.equal(canLinkIdentityByEmail({ ...verified, email_confirmed_at: undefined }, unbound), false);
});

test('refuses an identity with no email', () => {
  assert.equal(canLinkIdentityByEmail({ ...verified, email: null }, unbound), false);
});

test('refuses to re-point an account bound to a different Supabase identity', () => {
  assert.equal(canLinkIdentityByEmail(verified, { supabaseId: 'identity-B', googleSub: null }), false);
});

test('refuses to re-point an account bound to a different Google identity', () => {
  assert.equal(canLinkIdentityByEmail(verified, { supabaseId: null, googleSub: 'identity-B' }), false);
});

test('allows an account already bound to this same identity', () => {
  assert.equal(canLinkIdentityByEmail(verified, { supabaseId: 'identity-A', googleSub: null }), true);
  assert.equal(canLinkIdentityByEmail(verified, { supabaseId: null, googleSub: 'identity-A' }), true);
  assert.equal(canLinkIdentityByEmail(verified, { supabaseId: 'identity-A', googleSub: 'identity-A' }), true);
});

// Accounts from the earlier direct Google sign-in hold Google's own account ID in googleSub.
const legacyGoogleAccount = { supabaseId: null, googleSub: '104857600000000000001' };
const viaGoogle = (googleId, where = 'id') => ({
  ...verified,
  identities: [{ provider: 'google', id: where === 'id' ? googleId : 'other', identity_data: { sub: googleId } }]
});

test('still lets an earlier Google account sign in with that same Google account', () => {
  assert.equal(canLinkIdentityByEmail(viaGoogle('104857600000000000001'), legacyGoogleAccount), true);
  assert.equal(canLinkIdentityByEmail(viaGoogle('104857600000000000001', 'identity_data'), legacyGoogleAccount), true);
});

test('refuses an earlier Google account for a different Google account or a non-Google identity', () => {
  assert.equal(canLinkIdentityByEmail(viaGoogle('999999999999999999999'), legacyGoogleAccount), false);
  assert.equal(canLinkIdentityByEmail({ ...verified, identities: [{ provider: 'email', id: '104857600000000000001' }] }, legacyGoogleAccount), false);
  assert.equal(canLinkIdentityByEmail(verified, legacyGoogleAccount), false);
});

test('a Google identity ID never excuses a different Supabase binding', () => {
  assert.equal(canLinkIdentityByEmail(viaGoogle('104857600000000000001'), { supabaseId: 'identity-B', googleSub: '104857600000000000001' }), false);
});

// ---------------------------------------------------------------------------------------------
// Wiring: the real auth code uses these rules (guards against a silent revert)
// ---------------------------------------------------------------------------------------------
test('src/lib/auth.ts verifies sessions with HS256 only and sets the cookie flag from the rule', () => {
  const auth = source('src/lib/auth.ts');
  assert.doesNotMatch(auth, /jwt\.verify\(/, 'no direct jwt.verify left');
  assert.match(auth, /verifyHs256Jwt\(token, getJwtSecret\(\)\)/);
  assert.doesNotMatch(auth, /secure:\s*false/);
  assert.doesNotMatch(auth, /function isAuthCookieSecure/, 'uses the shared, tested rule');
  assert.equal((auth.match(/secure: isAuthCookieSecure\(\)/g) || []).length, 2, 'set and clear use the same rule');
});

test('src/lib/auth.ts only links a Supabase session by email through canLinkIdentityByEmail', () => {
  const auth = source('src/lib/auth.ts');
  assert.match(auth, /select: \{ \.\.\.publicUserSelect, supabaseId: true, googleSub: true \}/);
  assert.match(auth, /emailMatch && canLinkIdentityByEmail\(authUser, emailMatch\)/);
});

test('src/lib/google-oauth.ts verifies the registration cookie with HS256 only', () => {
  const google = source('src/lib/google-oauth.ts');
  assert.doesNotMatch(google, /jwt\.verify\(/);
  assert.match(google, /verifyHs256Jwt\(decodeURIComponent\(token\), getJwtSecret\(\)\)/);
});

test('Google callback requires a verified email, prefers identity matches and never overwrites a binding', () => {
  const callback = source('src/app/api/auth/google/callback/route.ts');
  assert.match(callback, /!supabaseUser\.email \|\| !supabaseUser\.email_confirmed_at/);
  assert.doesNotMatch(callback, /\{ email: email \}/, 'email is no longer OR-ed into the identity lookup');
  assert.match(callback, /identityMatch \?\? await prisma\.user\.findUnique/);
  assert.match(callback, /!identityMatch && !canLinkIdentityByEmail\(supabaseUser, user\)/);
  assert.match(callback, /data: missingLinks/);
});
