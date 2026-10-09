import {
  ACCOUNT_STATUS_PATH,
  clearWorkspaceCookie,
  ensureAuthConfig,
  getAccountAccessForUser,
  isAccountSuspended,
  publicUserSelect,
  restoreExpiredSuspension,
  setAuthCookie,
  setWorkspaceCookie,
  signAuthToken,
  toAccountSummary,
  toAuthenticatedUser,
  toPublicUser,
  verifyPassword
} from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import {
  HttpError,
  handleApiError,
  normalizeText,
  parseJsonBody,
  successResponse
} from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

type LoginBody = {
  identifier?: unknown;
  password?: unknown;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function handlePOST(request: Request) {
  try {
    ensureAuthConfig();

    const body = await parseJsonBody<LoginBody>(request);
    const identifier = normalizeText(body.identifier);
    const password = normalizeText(body.password);
    const fieldErrors: Record<string, string> = {};

    if (!identifier) {
      fieldErrors.identifier = 'Please enter your Student ID or email address.';
    }

    if (!password) {
      fieldErrors.password = 'Please enter your password.';
    }

    if (Object.keys(fieldErrors).length) {
      throw new HttpError('Please correct the highlighted fields and try again.', 400, fieldErrors);
    }

    // Auto-detect: if it looks like an email, search by email; otherwise by studentId
    const isEmail = emailPattern.test(identifier);

    const user = await prisma.user.findUnique({
      where: isEmail
        ? { email: identifier.toLowerCase() }
        : { studentId: identifier },
      select: {
        ...publicUserSelect,
        passwordHash: true,
        supabaseId: true
      }
    });

    if (!user) {
      throw new HttpError('Invalid credentials.', 401, {
        password: 'The Student ID/email or password is incorrect.'
      });
    }

    let isLegacyLoginSuccessful = false;
    if (user.passwordHash) {
      isLegacyLoginSuccessful = await verifyPassword(password, user.passwordHash);
    }

    const supabase = await createClient();
    let authError = null;

    if (user.supabaseId) {
      const result = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });
      authError = result.error;
    } else {
      // User doesn't have a Supabase ID. Wait for legacy login to succeed to migrate them.
      authError = new Error('No Supabase account linked.');
    }

    if (authError && !isLegacyLoginSuccessful) {
      throw new HttpError('Invalid credentials.', 401, {
        password: 'The Student ID/email or password is incorrect.'
      });
    }

    // Auto-migrate legacy user to Supabase Auth if legacy login was successful but Supabase was not linked
    if (isLegacyLoginSuccessful && !user.supabaseId) {
      const supabaseAdmin = createServiceClient();
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: password,
        email_confirm: true,
      });

      if (createError) {
        if (createError.code === 'email_exists' || createError.message.includes('already been registered')) {
          // The user already exists in Supabase (likely from a partial Google Auth flow)
          // We need to find them, link the accounts, and sync the password
          const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = listData?.users?.find(u => u.email === user.email);
          
          if (existingUser) {
            await prisma.user.update({
              where: { id: user.id },
              data: { supabaseId: existingUser.id }
            });
            
            // Sync password so they can log in via email/password in the future
            await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password });
            
            // Sign in
            await supabase.auth.signInWithPassword({
              email: user.email,
              password,
            });
            
            isLegacyLoginSuccessful = false; // Bypass the throw later
          } else {
            console.error('Failed to auto-migrate: email exists but user not found in list', createError);
            throw new HttpError('System error during account migration.', 500);
          }
        } else {
          console.error('Failed to auto-migrate user to Supabase Auth', createError);
          throw new HttpError('System error during account migration.', 500);
        }
      } else if (newUser.user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { supabaseId: newUser.user.id }
        });
        
        // Sign in using the newly created Supabase account
        await supabase.auth.signInWithPassword({
          email: user.email,
          password,
        });
      }
    }

    const authUser = await restoreExpiredSuspension(user);

    if (isAccountSuspended(authUser)) {
      throw new HttpError('This account has been suspended. Contact your administrator for assistance.', 403);
    }

    // Pending, rejected and role-less accounts still sign in, but only to see their application status.
    const access = await getAccountAccessForUser(authUser.id, request);

    if (!access) {
      throw new HttpError('Invalid credentials.', 401);
    }

    const sessionUser = toAuthenticatedUser(access) ?? authUser;
    const token = signAuthToken(sessionUser);
    const response = successResponse({
      user: toPublicUser(sessionUser),
      account: toAccountSummary(access),
      ...(access.hasFullAccess ? {} : { redirectTo: ACCOUNT_STATUS_PATH })
    });
    setAuthCookie(response, token);

    if (access.workspace) {
      setWorkspaceCookie(response, authUser.id, access.workspace.assignmentId);
    } else {
      clearWorkspaceCookie(response);
    }

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withApiLogging('POST', '/api/auth/login', handlePOST);
