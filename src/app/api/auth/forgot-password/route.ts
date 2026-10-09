import {
  PASSWORD_RESET_CODE_TTL_MINUTES,
  createPasswordResetCode,
  hashPasswordResetCode
} from '@/lib/auth';
import { assertMailerConfig, sendPasswordResetCodeEmail } from '@/lib/mailer';
import { prisma } from '@/lib/prisma';
import {
  HttpError,
  handleApiError,
  isValidEmail,
  normalizeEmail,
  parseJsonBody,
  successResponse
} from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

const PASSWORD_RESET_MESSAGE = 'If an account exists for this email, a reset code has been sent.';

type ForgotPasswordBody = {
  email?: unknown;
};

async function handlePOST(request: Request) {
  try {
    const body = await parseJsonBody<ForgotPasswordBody>(request);
    const email = normalizeEmail(body.email);

    if (!email || !isValidEmail(email)) {
      throw new HttpError('Enter a valid email address.', 400, {
        email: 'Enter a valid email address.'
      });
    }

    assertMailerConfig();

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true
      }
    });

    if (!user) {
      throw new HttpError('Account does not exist. Cannot proceed.', 404, {
        email: 'Account does not exist.'
      });
    }

    const code = createPasswordResetCode();
    const codeHash = await hashPasswordResetCode(code);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + PASSWORD_RESET_CODE_TTL_MINUTES * 60 * 1000);

    await prisma.$transaction([
      prisma.passwordResetCode.updateMany({
        where: {
          userId: user.id,
          usedAt: null
        },
        data: {
          usedAt: now
        }
      }),
      prisma.passwordResetCode.create({
        data: {
          userId: user.id,
          codeHash,
          expiresAt
        }
      })
    ]);

    try {
      await sendPasswordResetCodeEmail({
        to: user.email,
        code
      });
    } catch (error) {
      console.error('Unable to send password reset code email.', error);
    }

    return successResponse({
      message: PASSWORD_RESET_MESSAGE
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withApiLogging('POST', '/api/auth/forgot-password', handlePOST);
