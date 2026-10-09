import { UserRole } from '@/generated/prisma/client';
import { publicUserSelect, requireAuthenticatedUser, toPublicUser } from '@/lib/auth';
import { sendAccountRestoreEmail, sendAccountSuspensionEmail } from '@/lib/mailer';
import { prisma } from '@/lib/prisma';
import { recordAccountAudit } from '@/lib/rbac/audit';
import {
  HttpError,
  handleApiError,
  normalizeText,
  parseJsonBody,
  successResponse
} from '@/lib/utils';
import { withApiLogging } from '@/lib/api-logging';

export const runtime = 'nodejs';

const SUSPENSION_MANAGER_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.SYSTEM_ADMIN, UserRole.PROGRAM_HEAD];

type SuspensionBody = {
  suspended?: unknown;
  durationKey?: unknown;
  durationLabel?: unknown;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function parseSuspendedValue(value: unknown) {
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = normalizeText(value).toLowerCase();

  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  throw new HttpError('Suspension state must be a boolean value.', 400, {
    suspended: 'Choose whether the account should be active or suspended.'
  });
}

const SUSPENSION_DURATION_MS: Record<string, number | null> = {
  '1m': 60 * 1000,
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  indefinite: null
};

function getSuspensionExpiry(durationKey: string, suspended: boolean) {
  if (!suspended || !durationKey) {
    return null;
  }

  const durationMs = SUSPENSION_DURATION_MS[durationKey];

  if (!durationMs) {
    return null;
  }

  return new Date(Date.now() + durationMs);
}

async function handlePATCH(request: Request, context: RouteContext) {
  try {
    const actor = await requireAuthenticatedUser(request, SUSPENSION_MANAGER_ROLES);
    const { id } = await context.params;
    const userId = normalizeText(id);

    if (!userId) {
      throw new HttpError('User ID is required.', 400);
    }

    const body = await parseJsonBody<SuspensionBody>(request);
    const suspended = parseSuspendedValue(body.suspended);
    const durationKey = normalizeText(body.durationKey);
    const durationLabel = normalizeText(body.durationLabel);
    const suspendedUntil = getSuspensionExpiry(durationKey, suspended);

    if (actor.id === userId && suspended) {
      throw new HttpError('You cannot suspend the account you are currently using.', 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isSuspended: true,
        department: true
      }
    });

    if (!existingUser) {
      throw new HttpError('The selected user no longer exists.', 404);
    }

    if (actor.role === UserRole.PROGRAM_HEAD && existingUser.role !== UserRole.ADVISER) {
      throw new HttpError('Program Heads can only suspend or restore Adviser accounts.', 403);
    }

    if (actor.role === UserRole.PROGRAM_HEAD && actor.department) {
      if (existingUser.department !== actor.department) {
        throw new HttpError('You do not have permission to modify users outside your department.', 403);
      }
    }

    const user = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          isSuspended: suspended,
          suspendedAt: suspended ? new Date() : null,
          suspendedUntil
        },
        select: publicUserSelect
      });

      await recordAccountAudit(tx, {
        actorId: actor.id,
        action: suspended ? 'user.suspended' : 'user.restored',
        userId,
        metadata: { durationLabel: durationLabel || null, suspendedUntil, actorRole: actor.role },
        request
      });

      return updatedUser;
    });

    let emailNotice = '';

    try {
      if (suspended) {
        await sendAccountSuspensionEmail({
          to: existingUser.email,
          name: existingUser.name,
          durationLabel
        });
      } else {
        await sendAccountRestoreEmail({
          to: existingUser.email,
          name: existingUser.name
        });
      }
    } catch (emailError) {
      console.error('Failed to send account suspension notification email', emailError);
      emailNotice = ' The account was updated, but the notification email could not be sent.';
    }

    return successResponse({
      message: suspended
        ? `${existingUser.name} has been suspended${durationLabel ? ` for ${durationLabel}` : ''}.${emailNotice}`
        : `${existingUser.name} has been restored.${emailNotice}`,
      user: toPublicUser(user)
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export const PATCH = withApiLogging('PATCH', '/api/users/[id]/suspension', handlePATCH);
