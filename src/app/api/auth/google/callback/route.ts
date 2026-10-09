import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  ACCOUNT_STATUS_PATH,
  clearWorkspaceCookie,
  getAccountAccessForUser,
  isAccountSuspended,
  publicUserSelect,
  restoreExpiredSuspension,
  setAuthCookie,
  setWorkspaceCookie,
  signAuthToken,
  toAuthenticatedUser,
  toPublicUser
} from '@/lib/auth';
import { canLinkIdentityByEmail } from '@/lib/auth-security';
import {
  setGoogleRegistrationCookie,
} from '@/lib/google-oauth';
import { prisma } from '@/lib/prisma';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getLoginRedirect(request: NextRequest, reason?: string) {
  const url = new URL('/login', request.url);

  if (reason) {
    url.searchParams.set('google', reason);
  }

  return url;
}

function getRegisterRedirect(request: NextRequest, profile: {
  email: string;
  name: string;
  firstName: string;
  lastName: string;
}) {
  const url = new URL('/register', request.url);

  url.searchParams.set('provider', 'google');
  url.searchParams.set('email', profile.email);
  url.searchParams.set('name', profile.name);

  if (profile.firstName) {
    url.searchParams.set('firstName', profile.firstName);
  }

  if (profile.lastName) {
    url.searchParams.set('lastName', profile.lastName);
  }

  return url;
}

function getRoleRedirectPath(role: ReturnType<typeof toPublicUser>['role']) {
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

function getSyncRedirect(request: NextRequest, role: ReturnType<typeof toPublicUser>['role']) {
  const url = new URL('/auth/sync', request.url);
  url.searchParams.set('redirect', getRoleRedirectPath(role));
  return url;
}

async function handleGET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(getLoginRedirect(request, 'cancelled'));
  }

  if (!code) {
    return NextResponse.redirect(getLoginRedirect(request, 'invalid_request'));
  }

  try {
    const supabase = await createClient();
    
    // Exchange code for Supabase Session
    const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (authError || !authData.user) {
      console.error('Supabase code exchange failed', authError);
      return NextResponse.redirect(getLoginRedirect(request, 'invalid_request'));
    }

    const supabaseUser = authData.user;

    // Existing accounts are matched (and linked) by email below, so only trust a verified address.
    if (!supabaseUser.email || !supabaseUser.email_confirmed_at) {
      return NextResponse.redirect(getLoginRedirect(request, 'invalid_request'));
    }

    const email = supabaseUser.email;
    const name = supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || email;
    const firstName = supabaseUser.user_metadata?.first_name || '';
    const lastName = supabaseUser.user_metadata?.last_name || '';

    const profile = {
      email,
      name,
      firstName,
      lastName,
      sub: supabaseUser.id // Passing the Supabase ID to the register route!
    };

    const accountSelect = {
      ...publicUserSelect,
      googleSub: true,
      supabaseId: true
    } as const;

    // Prefer the account already bound to this exact identity; fall back to the email only when none is,
    // so an email match can never shadow (or be confused with) a different account's binding.
    const identityMatch = await prisma.user.findFirst({
      where: {
        OR: [
          { googleSub: supabaseUser.id },
          { supabaseId: supabaseUser.id }
        ]
      },
      select: accountSelect
    });
    const user = identityMatch ?? await prisma.user.findUnique({
      where: { email },
      select: accountSelect
    });

    if (!user) {
      // User doesn't exist locally. Redirect to register page
      const response = NextResponse.redirect(getRegisterRedirect(request, profile));
      setGoogleRegistrationCookie(response, profile);
      return response;
    }

    const authUser = await restoreExpiredSuspension(user);

    if (isAccountSuspended(authUser)) {
      return NextResponse.redirect(getLoginRedirect(request, 'suspended'));
    }

    // An account found only by email must not already be bound to a different identity.
    if (!identityMatch && !canLinkIdentityByEmail(supabaseUser, user)) {
      return NextResponse.redirect(getLoginRedirect(request, 'account_mismatch'));
    }

    // Auto-migrate: fill in whichever identity link is missing, but never overwrite an existing one.
    const missingLinks = {
      ...(user.googleSub ? {} : { googleSub: supabaseUser.id }),
      ...(user.supabaseId ? {} : { supabaseId: supabaseUser.id })
    };
    const linkedUser = Object.keys(missingLinks).length === 0
      ? authUser
      : await prisma.user.update({
          where: {
            id: user.id
          },
          data: missingLinks,
          select: accountSelect
        });
        
    // Same approval rules as password sign-in: accounts without full access only reach their status page.
    const access = await getAccountAccessForUser(linkedUser.id, request);
    const sessionUser = access ? toAuthenticatedUser(access) : null;

    if (!access || !sessionUser) {
      const response = NextResponse.redirect(new URL(ACCOUNT_STATUS_PATH, request.url));

      setAuthCookie(response, signAuthToken(linkedUser));
      clearWorkspaceCookie(response);

      return response;
    }

    const publicUser = toPublicUser(sessionUser);
    const response = NextResponse.redirect(getSyncRedirect(request, publicUser.role));

    setAuthCookie(response, signAuthToken(sessionUser));
    setWorkspaceCookie(response, sessionUser.id, sessionUser.workspace.assignmentId);

    return response;
  } catch (callbackError) {
    console.error('Google OAuth callback failed.', callbackError);
    return NextResponse.redirect(getLoginRedirect(request, 'error'));
  }
}

export const GET = withApiLogging('GET', '/api/auth/google/callback', handleGET);
