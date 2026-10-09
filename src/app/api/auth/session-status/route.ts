import { NextResponse } from 'next/server';
import { getAuthTokenFromRequest, verifyAuthToken } from '@/lib/auth';
import { sendAccountRestoreEmail } from '@/lib/mailer';
import { prisma } from '@/lib/prisma';
import { successResponse, handleApiError } from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

async function handleGET(request: Request) {
  try {
    const token = getAuthTokenFromRequest(request);
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload?.sub) {
      return successResponse({
        authenticated: false,
        suspended: false
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        isSuspended: true,
        suspendedAt: true,
        suspendedUntil: true
      }
    });

    if (!user) {
      return successResponse({
        authenticated: false,
        suspended: false
      });
    }

    if (user.isSuspended && user.suspendedUntil && user.suspendedUntil <= new Date()) {
      const restoredUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          isSuspended: false,
          suspendedAt: null,
          suspendedUntil: null
        },
        select: {
          email: true,
          name: true
        }
      });

      try {
        await sendAccountRestoreEmail({
          to: restoredUser.email,
          name: restoredUser.name
        });
      } catch (emailError) {
        console.error('Failed to send automatic account restore email', emailError);
      }

      return successResponse({
        authenticated: true,
        suspended: false
      });
    }

    return successResponse({
      authenticated: true,
      suspended: user.isSuspended,
      suspendedAt: user.suspendedAt,
      suspendedUntil: user.suspendedUntil
    });
  } catch (error) {
    console.error('Error in session-status:', error);
    return handleApiError(error);
  }
}

async function handlePOST() {
  const response = NextResponse.json({
    success: true
  });

  response.cookies.set('thesistrack_session', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0
  });

  return response;
}

export const GET = withApiLogging('GET', '/api/auth/session-status', handleGET);
export const POST = withApiLogging('POST', '/api/auth/session-status', handlePOST);
