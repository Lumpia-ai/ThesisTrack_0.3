import { NextResponse } from 'next/server';
import {
  ACCOUNT_NOT_ACTIVE_CODE,
  ACCOUNT_STATUS_PATH,
  getAccountAccess,
  toAccountSummary,
  toAuthenticatedUser,
  toPublicUser
} from '@/lib/auth';
import { HttpError, handleApiError, successResponse } from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

async function handleGET(request: Request) {
  try {
    const access = await getAccountAccess(request);

    if (!access) {
      throw new HttpError('Authentication is required.', 401);
    }

    const user = toAuthenticatedUser(access);

    // Signed in, but pending, rejected or without a usable role: the client sends them to the status page.
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          code: ACCOUNT_NOT_ACTIVE_CODE,
          message: 'Your account is not active yet.',
          redirectTo: ACCOUNT_STATUS_PATH,
          account: toAccountSummary(access)
        },
        { status: 403 }
      );
    }

    return successResponse({
      user: toPublicUser(user),
      account: toAccountSummary(access)
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = withApiLogging('GET', '/api/auth/me', handleGET);
