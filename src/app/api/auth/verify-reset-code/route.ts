import {
  PASSWORD_RESET_MAX_ATTEMPTS,
  PASSWORD_RESET_SESSION_COOKIE_NAME,
  PASSWORD_RESET_SESSION_TTL_SECONDS,
  createPasswordResetSessionToken,
  hashResetToken,
  verifyPasswordResetCode
} from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  HttpError,
  handleApiError,
  isValidEmail,
  normalizeEmail,
  normalizeText,
  parseJsonBody,
  successResponse
} from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

type VerifyResetCodeBody = {
  email?: unknown;
  code?: unknown;
};

function invalidCodeError() {
  return new HttpError('Invalid or expired reset code.', 400, {
    code: 'Invalid or expired reset code.'
  });
}

async function handlePOST(request: Request) {
  try {
    const body = await parseJsonBody<VerifyResetCodeBody>(request);
    const email = normalizeEmail(body.email);
    const code = normalizeText(body.code);
    const fieldErrors: Record<string, string> = {};

    if (!email || !isValidEmail(email)) {
      fieldErrors.email = 'Enter a valid email address.';
    }

    if (!/^\d{6}$/.test(code)) {
      fieldErrors.code = 'Enter the 6-digit reset code.';
    }

    if (Object.keys(fieldErrors).length) {
      throw new HttpError('Please correct the highlighted fields and try again.', 400, fieldErrors);
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true
      }
    });

    if (!user) {
      throw invalidCodeError();
    }

    const resetCode = await prisma.passwordResetCode.findFirst({
      where: {
        userId: user.id,
        usedAt: null
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        codeHash: true,
        expiresAt: true,
        attempts: true
      }
    });

    if (!resetCode || resetCode.expiresAt.getTime() <= Date.now()) {
      throw invalidCodeError();
    }

    if (resetCode.attempts >= PASSWORD_RESET_MAX_ATTEMPTS) {
      throw new HttpError('Too many reset code attempts. Request a new code.', 429, {
        code: 'Request a new reset code.'
      });
    }

    const isValidCode = await verifyPasswordResetCode(code, resetCode.codeHash);

    if (!isValidCode) {
      await prisma.passwordResetCode.update({
        where: {
          id: resetCode.id
        },
        data: {
          attempts: {
            increment: 1
          }
        }
      });

      throw invalidCodeError();
    }

    const sessionToken = createPasswordResetSessionToken();
    const resetTokenHash = hashResetToken(sessionToken);

    await prisma.passwordResetCode.update({
      where: {
        id: resetCode.id
      },
      data: {
        resetTokenHash,
        verifiedAt: new Date()
      }
    });

    const response = successResponse({
      message: 'Reset code verified.'
    });

    response.cookies.set(PASSWORD_RESET_SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: PASSWORD_RESET_SESSION_TTL_SECONDS
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withApiLogging('POST', '/api/auth/verify-reset-code', handlePOST);
